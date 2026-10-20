// Feature 70 — a resposta de `/sitemap.xml`, servida pela função `api/page` da Vercel.
//
// Era o `handlers.ts` da edge function `sitemap` (features 33, 46, 68 e 69), e mudou de casa sem
// mudar de regra: a leitura paginada, o 503 degradado e o documento são os mesmos. O que mudou é o
// transporte — o `rewrite` para `*.supabase.co` não era cacheado pela Vercel (TTFB de 4,7 a 9,3 s,
// sempre `MISS`), e a função da loja, no mesmo deploy, é (`s-maxage=3600`).
//
// Molde de `servePage` (`core/page/serve.ts`): pura, leituras injetadas, e a saída é
// `{ status, headers, body }` — sem `Response`, para ser testável sem runtime nenhum. A função da
// Vercel é só env, client e a tradução para `Response`.
//
// ---------------------------------------------------------------------------------------------
// A REGRA QUE NÃO PODE SER AFROUXADA: SITEMAP PARCIAL NÃO PARECE PARCIAL
// ---------------------------------------------------------------------------------------------
// Um sitemap com 400 das 680 URLs é XML válido. Ele não erra — ele **descreve uma loja menor**, e
// o rastreador acredita. Diferente do feed do Merchant Center, a ausência aqui não remove nada; ela
// simplesmente adia descoberta, em silêncio e por tempo indeterminado.
//
// Por isso todo caminho degradado responde **503 sem corpo de sitemap, e `no-store`** (SMV-03):
//
//   • leitura truncada (o teto de 1.000 do PostgREST)  ⇒ 503  (produtos, categorias, variações e
//     marcações por opção)
//   • zero produtos                                     ⇒ 503  (credencial/RLS, não fato)
//   • origem ausente ou malformada                      ⇒ 503  (todas as <loc> erradas de uma vez)
//
// O `no-store` é a metade nova e é carga: com o 200 cacheado por uma hora, um 503 cacheado do
// mesmo jeito prenderia a falha de um segundo por uma hora inteira na borda.
//
// O corpo de erro é `text/plain`: um erro que chegasse como XML poderia ser lido como sitemap vazio.
//
// Imports por ARQUIVO e com extensão explícita: a função empacota este módulo fora do Vite.

import { resolveFaqPage } from '../faq/page.ts'
import type { FaqPageLink } from '../faq/types.ts'
import { POSTGREST_PAGE_SIZE, readAllPages } from '../paging/readAll.ts'
import { renderSitemapXml } from './render.ts'
import type {
  SitemapCategory,
  SitemapFaqQuestion,
  SitemapOptionMark,
  SitemapProduct,
  SitemapVariant,
} from './types.ts'
import { originRefusal, sitemapUrls } from './urls.ts'

export interface SitemapDeps {
  /** A origem pública da loja (`STORE_PUBLIC_URL`). Sem ela não há `<loc>` possível. */
  origin: string
  /** Contagem EXATA de produtos visíveis. É a régua contra a qual a leitura é conferida. */
  countProducts: () => Promise<number>
  /** Contagem EXATA de categorias visíveis. */
  countCategories: () => Promise<number>
  /** Uma página de produtos, em ordem estável. `from`/`to` inclusivos. */
  readProducts: (from: number, to: number) => Promise<SitemapProduct[]>
  /** Uma página de categorias, em ordem estável. */
  readCategories: (from: number, to: number) => Promise<SitemapCategory[]>
  /**
   * As colocações da página de perguntas frequentes, com a entrada embutida — a MESMA leitura que a
   * página faz (`faq_page_items` + `faq:faqs(...)`). Quem decide quais aparecem é `resolveFaqPage`,
   * o mesmo da página: o sitemap não anuncia pergunta que a página esconde, nem esconde uma que ela
   * mostra.
   */
  readFaqLinks: () => Promise<FaqPageLink[]>
  /**
   * Feature 68 · SVR-26 — as variações e as marcações por opção, com a mesma régua de produtos:
   * contagem EXATA e páginas em ordem estável. São 3.380 variações, acima do teto de 1.000 do
   * PostgREST; uma leitura truncada deixaria opções indexáveis de fora em silêncio, ou pior, faria
   * uma opção perder a representante e anunciar outra. A RLS (chave publicável) já restringe as
   * duas à peça ativa e, nas marcações, ao grupo ativo.
   */
  countVariants: () => Promise<number>
  readVariants: (from: number, to: number) => Promise<SitemapVariant[]>
  countOptionMarks: () => Promise<number>
  readOptionMarks: (from: number, to: number) => Promise<SitemapOptionMark[]>
  log: (entry: Record<string, unknown>) => void
}

/** A mesma forma de `ServedResponse` (`core/page`) — a função traduz as duas pelo mesmo `toResponse`. */
export interface SitemapResponse {
  status: number
  headers: Record<string, string>
  body: string
}

/**
 * O `Cache-Control` dos dois desfechos (SMV-01, SMV-03). Uma hora no 200 é decisão do usuário
 * (2026-10-20): o teto de atraso entre cadastrar uma peça no painel e ela entrar no sitemap — que o
 * rastreador relê em dias, não em minutos.
 */
export const SITEMAP_CACHE = {
  ok: 'public, s-maxage=3600',
  error: 'no-store',
} as const

export const SITEMAP_CONTENT_TYPE = 'application/xml; charset=utf-8'

const indisponivel = (corpo: string): SitemapResponse => ({
  status: 503,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': SITEMAP_CACHE.error },
  body: corpo,
})

/**
 * O catálogo inteiro, ou **falha**.
 *
 * Usa `readAllPages` (`core/paging`), o mesmo mecanismo da `google-feed` — o teto de 1.000 linhas
 * do PostgREST é um só, e uma segunda implementação dele divergiria só no volume real, que é onde
 * ninguém está olhando.
 */
export const readCatalog = async (
  deps: SitemapDeps,
): Promise<{
  products: SitemapProduct[]
  categories: SitemapCategory[]
  faqQuestions: SitemapFaqQuestion[]
  variants: SitemapVariant[]
  optionMarks: SitemapOptionMark[]
}> => {
  const [totalProdutos, totalCategorias, totalVariacoes, totalMarcacoes] = await Promise.all([
    deps.countProducts(),
    deps.countCategories(),
    deps.countVariants(),
    deps.countOptionMarks(),
  ])

  const products = await readAllPages<SitemapProduct>({
    total: totalProdutos,
    readPage: deps.readProducts,
    pageSize: POSTGREST_PAGE_SIZE,
    label: 'produtos',
    consequence: 'sitemap parcial descreve um catálogo menor do que o que existe',
  })

  const categories = await readAllPages<SitemapCategory>({
    total: totalCategorias,
    readPage: deps.readCategories,
    pageSize: POSTGREST_PAGE_SIZE,
    label: 'categorias',
    consequence: 'sitemap parcial descreve um catálogo menor do que o que existe',
  })

  // Feature 68: as duas leituras das páginas de opção. Incompleta ⇒ lança ⇒ 503, como as outras —
  // um sitemap sem as opções apagaria as páginas delas num dia e as devolveria no seguinte.
  const variants = await readAllPages<SitemapVariant>({
    total: totalVariacoes,
    readPage: deps.readVariants,
    pageSize: POSTGREST_PAGE_SIZE,
    label: 'variações',
    consequence: 'sitemap sem as páginas de opção, ou com a representante errada',
  })

  const optionMarks = await readAllPages<SitemapOptionMark>({
    total: totalMarcacoes,
    readPage: deps.readOptionMarks,
    pageSize: POSTGREST_PAGE_SIZE,
    label: 'marcações por opção',
    consequence: 'sitemap sem as páginas de opção',
  })

  // Sem paginação: `faq_page_items` tem uma linha por pergunta (o `faq_id` é a chave), dezenas e
  // não milhares. Falhar aqui falha o sitemap inteiro, pela mesma régua do resto: um documento sem
  // as perguntas descreveria uma loja com menos páginas do que a que existe.
  const faqQuestions = resolveFaqPage(await deps.readFaqLinks()).flatMap(grupo =>
    grupo.items.map(item => ({ id: item.id, question: item.question })),
  )

  return { products, categories, faqQuestions, variants, optionMarks }
}

export const serveSitemap = async (deps: SitemapDeps): Promise<SitemapResponse> => {
  const recusa = originRefusal(deps.origin)
  if (recusa) {
    deps.log({ fn: 'sitemap', erro: 'origem', detalhe: recusa })
    return indisponivel('origem da loja não configurada')
  }

  let catalogo: Awaited<ReturnType<typeof readCatalog>>
  try {
    catalogo = await readCatalog(deps)
  } catch (e) {
    deps.log({ fn: 'sitemap', erro: 'leitura', detalhe: String(e) })
    return indisponivel('catálogo indisponível')
  }

  // Zero produto público não é um catálogo vazio — é quase sempre credencial errada ou RLS fechada.
  // Servir as URLs institucionais no lugar do catálogo seria a resposta mais enganosa possível: XML
  // válido, status 200, e o rastreador concluindo que a loja perdeu o catálogo inteiro.
  if (catalogo.products.length === 0) {
    deps.log({ fn: 'sitemap', erro: 'catalogo_vazio' })
    return indisponivel('catálogo indisponível')
  }

  let xml: string
  try {
    xml = renderSitemapXml(
      sitemapUrls({
        origin: deps.origin,
        products: catalogo.products,
        categories: catalogo.categories,
        faqQuestions: catalogo.faqQuestions,
        variants: catalogo.variants,
        optionMarks: catalogo.optionMarks,
      }),
    )
  } catch (e) {
    // `<loc>` duplicada e teto de 50.000 chegam aqui. Recusar é o desfecho certo nos dois.
    deps.log({ fn: 'sitemap', erro: 'geracao', detalhe: String(e) })
    return indisponivel('sitemap indisponível')
  }

  deps.log({
    fn: 'sitemap',
    ok: true,
    produtos: catalogo.products.length,
    categorias: catalogo.categories.length,
    perguntas: catalogo.faqQuestions.length,
    variacoes: catalogo.variants.length,
    marcacoes: catalogo.optionMarks.length,
  })

  return {
    status: 200,
    // O tipo é NOSSO desde a feature 70: a resposta sai da função da loja, sem o gateway
    // `*.supabase.co` no meio para reescrevê-lo (`BUG-20260829`), e o `vercel.json` deixou de
    // reimpô-lo (SMV-04). A prova da entrega continua sendo o tipo ENTREGUE (`AD-021`).
    headers: { 'Content-Type': SITEMAP_CONTENT_TYPE, 'Cache-Control': SITEMAP_CACHE.ok },
    body: xml,
  }
}
