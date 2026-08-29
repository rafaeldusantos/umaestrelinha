// Feature 33 — o sitemap que o rastreador busca.
//
// `index.ts` é só wiring (env, client, `Deno.serve`); toda a lógica está aqui, com dependências
// injetadas, para rodar em vitest fora do Deno (`AD-004`). Mesmo molde da `google-feed`.
//
// ---------------------------------------------------------------------------------------------
// A REGRA QUE NÃO PODE SER AFROUXADA: SITEMAP PARCIAL NÃO PARECE PARCIAL
// ---------------------------------------------------------------------------------------------
// Um sitemap com 400 das 680 URLs é XML válido. Ele não erra — ele **descreve uma loja menor**, e
// o rastreador acredita. Diferente do feed do Merchant Center, a ausência aqui não remove nada; ela
// simplesmente adia descoberta, em silêncio e por tempo indeterminado.
//
// Por isso todo caminho degradado responde **5xx sem corpo de sitemap**:
//
//   • leitura truncada (o teto de 1.000 do PostgREST)  ⇒ 503
//   • zero produtos                                     ⇒ 503  (credencial/RLS, não fato)
//   • origem ausente ou malformada                      ⇒ 503  (719 <loc> erradas de uma vez)
//
// O corpo de erro é `text/plain` de propósito: é o único tipo que já se **mediu** atravessar o
// gateway `*.supabase.co` intacto (`BUG-20260829`), e um erro que chegasse como XML poderia ser
// lido como sitemap vazio.

import {
  originRefusal,
  renderSitemapXml,
  sitemapUrls,
  type SitemapCategory,
  type SitemapProduct,
} from '../../../packages/core/src/sitemap/index.ts'
import {
  POSTGREST_PAGE_SIZE,
  readAllPages,
} from '../../../packages/core/src/paging/index.ts'

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
}

const texto = (corpo: string, status: number): Response =>
  new Response(corpo, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

const log = (entry: Record<string, unknown>): void => console.log(JSON.stringify(entry))

/**
 * O catálogo inteiro, ou **falha**.
 *
 * Usa `readAllPages` (`@estrelinha/core/paging`), o mesmo mecanismo da `google-feed` — o teto de
 * 1.000 linhas do PostgREST é um só, e uma segunda implementação dele divergiria só no volume real,
 * que é onde ninguém está olhando.
 */
export const readCatalog = async (
  deps: SitemapDeps,
): Promise<{ products: SitemapProduct[]; categories: SitemapCategory[] }> => {
  const [totalProdutos, totalCategorias] = await Promise.all([
    deps.countProducts(),
    deps.countCategories(),
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

  return { products, categories }
}

export const handleSitemap = async (deps: SitemapDeps): Promise<Response> => {
  const recusa = originRefusal(deps.origin)
  if (recusa) {
    log({ fn: 'sitemap', erro: 'origem', detalhe: recusa })
    return texto('origem da loja não configurada', 503)
  }

  let catalogo: { products: SitemapProduct[]; categories: SitemapCategory[] }
  try {
    catalogo = await readCatalog(deps)
  } catch (e) {
    log({ fn: 'sitemap', erro: 'leitura', detalhe: String(e) })
    return texto('catálogo indisponível', 503)
  }

  // Zero produto público não é um catálogo vazio — é quase sempre credencial errada ou RLS fechada.
  // Servir 4 URLs institucionais no lugar de 680 seria a resposta mais enganosa possível: XML
  // válido, status 200, e o rastreador concluindo que a loja perdeu o catálogo inteiro.
  if (catalogo.products.length === 0) {
    log({ fn: 'sitemap', erro: 'catalogo_vazio' })
    return texto('catálogo indisponível', 503)
  }

  let xml: string
  try {
    xml = renderSitemapXml(
      sitemapUrls({
        origin: deps.origin,
        products: catalogo.products,
        categories: catalogo.categories,
      }),
    )
  } catch (e) {
    // `<loc>` duplicada e teto de 50.000 chegam aqui. Recusar é o desfecho certo nos dois.
    log({ fn: 'sitemap', erro: 'geracao', detalhe: String(e) })
    return texto('sitemap indisponível', 503)
  }

  log({
    fn: 'sitemap',
    ok: true,
    produtos: catalogo.products.length,
    categorias: catalogo.categories.length,
  })

  return new Response(xml, {
    status: 200,
    headers: {
      // A Supabase reescreve `text/html` no domínio compartilhado (`BUG-20260829`); `application/xml`
      // nunca foi medido atravessando. Por isso o `vercel.json` reimpõe este MESMO valor na borda —
      // o tipo entregue é o que prova a rota (`AD-021`), e aqui ele é declarado, não presumido.
      'Content-Type': 'application/xml; charset=utf-8',
      // A Vercel **não cacheia** `rewrite` para host externo (medido: 4 batidas, 4 MISS). O header
      // fica para intermediários que respeitem, e para o dia em que o transporte mudar (`BL-017`).
      'Cache-Control': 'public, max-age=600',
    },
  })
}
