// Feature 30 — a página do produto, servida com o JSON-LD já dentro.
//
// ---------------------------------------------------------------------------------------------
// POR QUE ISTO EXISTE
// ---------------------------------------------------------------------------------------------
// A loja é SPA sem SSR. O que um cliente HTTP que não executa JavaScript encontra hoje em
// `/produtos/<slug>` é `<div id="root"></div>` — nem preço, nem disponibilidade, nem canônica. O
// Merchant Center **rastreia a landing page** para conferir o que o feed anuncia, e 3.233 ofertas
// apontando para uma página sem preço não é "sem dado estruturado": é incompatibilidade em massa,
// descoberta um dia depois do cutover.
//
// ---------------------------------------------------------------------------------------------
// TODO CAMINHO DE ERRO DEVOLVE A PÁGINA
// ---------------------------------------------------------------------------------------------
// Esta function entra no caminho de **toda** visita a produto, não só a do rastreador. Slug
// desconhecido, `?variant=` inválido, leitura que falhou: em todos, a resposta é o shell **intacto**
// com 200, e a SPA resolve sozinha — `NotFound` para slug morto, seleção padrão para variação
// inválida. O único 5xx é o shell não carregar, porque aí não há página a devolver.
//
// ---------------------------------------------------------------------------------------------
// O SHELL É BUSCADO, NUNCA EMBUTIDO
// ---------------------------------------------------------------------------------------------
// O Vite emite nome de asset com hash a cada build, e o deploy da loja é independente do
// `supabase functions deploy`. Um shell embutido apontaria para um bundle que já não existe, e o
// modo de falhar é **quadro branco**: 200 na página, 404 no `<script>`, nada no servidor acusando.

import {
  productJsonLd,
  representativeVariant,
  resolveOffer,
  variantByPublicId,
  type OfferInputProduct,
  type OfferInputVariant,
} from '../../../packages/core/src/shopping/index.ts'
// Os dois abaixo entram por ARQUIVO, e não pelo barrel do módulo — e a distinção não é estilo.
//
// `core/media/index.ts` faz `import type { ProductImage } from '@estrelinha/supabase/types'`, e o
// Deno resolve o grafo de TIPOS: o worker morreria com `Failed resolving types` **antes da primeira
// linha rodar** (medido na feature `33`). `rendition.ts` e `escape.ts` são folhas, sem import
// nenhum, e por isso são alcançáveis daqui. A extensão `.ts` é obrigatória pela mesma regra.
import {
  GALLERY_STAGE_SIZES,
  RENDITION_WIDTHS,
  renditionSrcSet,
  renditionUrl,
} from '../../../packages/core/src/media/rendition.ts'
import { escapeXml } from '../../../packages/core/src/xml/escape.ts'

export interface ProductPageData {
  product: OfferInputProduct
  variants: OfferInputVariant[]
}

export interface ProductPageDeps {
  /** O `index.html` da loja, buscado do deploy vivo. Lançar aqui é o único 5xx desta function. */
  fetchShell: () => Promise<string>
  /** `null` = slug desconhecido. Lançar é tratado como desconhecido. */
  readProduct: (slug: string) => Promise<ProductPageData | null>
  origin: string
  defaultProductCategory?: string | null
}

const log = (entry: Record<string, unknown>): void => console.log(JSON.stringify(entry))

/** Quanto tempo o shell fica em memória. Curto de propósito — ver `createShellCache`. */
export const SHELL_TTL_MS = 60_000

/**
 * Memoriza o `index.html` por pouco tempo.
 *
 * O TTL é **curto e não é ajustável para cima sem decisão**: o shell referencia bundles com hash, e
 * um deploy da loja troca todos eles. Um shell velho responde 200 apontando para um `<script>` que
 * já não existe — quadro branco na loja, sem erro em lugar nenhum. Sessenta segundos trocam um
 * `fetch` por visita por, no pior caso, um minuto de páginas quebradas logo após um deploy; o cache
 * de borda é o que de fato tira a function do caminho quente.
 *
 * Falha de busca **não** envenena o cache: o valor anterior é preservado e o erro sobe, para o
 * chamador decidir (aqui, 502 só quando nunca houve shell).
 */
export const createShellCache = (
  buscar: () => Promise<string>,
  agora: () => number = () => Date.now(),
  ttlMs: number = SHELL_TTL_MS,
): (() => Promise<string>) => {
  let valor: string | null = null
  let expiraEm = 0
  return async () => {
    if (valor !== null && agora() < expiraEm) return valor
    const novo = await buscar()
    valor = novo
    expiraEm = agora() + ttlMs
    return novo
  }
}

/**
 * Serializa o JSON-LD para dentro de um `<script>`.
 *
 * `<` vira `\u003c` **sempre**. Uma descrição de produto contendo `</script>` fecharia a tag e o
 * resto do JSON viraria markup executável na página — a descrição vem da Nuvemshop e não é confiável
 * a esse ponto. Escapar o `<` é o que torna a injeção segura sem depender do conteúdo.
 */
export const jsonLdScript = (dados: Record<string, unknown>): string =>
  `<script type="application/ld+json">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>`

/**
 * O palco da galeria pede a MAIOR das rendições — derivada, nunca cravada.
 *
 * `ProductGallery` chama a mesma largura de `PALCO_PX`. O que precisa casar de verdade entre o
 * preload e a galeria é o par `srcset`/`sizes`, porque é dele que o navegador escolhe o candidato;
 * o `href` é o recuo de quem não entende `imagesrcset`.
 */
const PALCO_PX = RENDITION_WIDTHS[RENDITION_WIDTHS.length - 1]

/**
 * O `<link rel="preload" as="image">` da foto principal — `PRF-06`.
 *
 * A maior imagem da página do produto é a foto do palco, e até aqui o navegador só ficava sabendo
 * dela **depois** de baixar e interpretar o bundle, montar a árvore e chegar ao `<img>`. O preload
 * no `<head>` é o que a coloca na fila junto com o JavaScript, em vez de atrás dele.
 *
 * `imagesrcset`/`imagesizes` repetem EXATAMENTE o que a galeria declara. Divergir aqui é pior que
 * não ter preload: o navegador escolheria um candidato para o preload e outro para o `<img>`, e
 * baixaria as duas fotos. Por isso `GALLERY_STAGE_SIZES` mora em `core/media`, e não nas duas.
 *
 * Produto **sem** foto devolve `''` — nenhum `preload`, e a resposta segue idêntica à de hoje.
 * Foto em host de terceiro sai com `href` e sem `imagesrcset`: `renditionSrcSet` devolve `''`
 * porque não há rendição a pedir, e um `imagesrcset` vazio faria o navegador ignorar o preload.
 *
 * O escape é o `escapeXml` do projeto — a URL da rendição carrega `&quality=`, e `&` cru dentro de
 * atributo é o defeito silencioso clássico de quem monta HTML por concatenação.
 */
export const imagePreloadLink = (imageUrl: string): string => {
  const url = (imageUrl ?? '').trim()
  if (url === '') return ''

  const srcset = renditionSrcSet(url)
  const atributos = [
    'rel="preload"',
    'as="image"',
    `href="${escapeXml(renditionUrl(url, PALCO_PX))}"`,
    ...(srcset === ''
      ? []
      : [
          `imagesrcset="${escapeXml(srcset)}"`,
          `imagesizes="${escapeXml(GALLERY_STAGE_SIZES)}"`,
        ]),
    'fetchpriority="high"',
  ]
  return `<link ${atributos.join(' ')}>`
}

/** Insere o bloco imediatamente antes de `</head>`. Sem `</head>`, devolve o shell intacto. */
export const injectIntoHead = (shell: string, bloco: string): string => {
  const i = shell.toLowerCase().indexOf('</head>')
  if (i === -1) return shell
  return shell.slice(0, i) + bloco + shell.slice(i)
}

const html = (corpo: string, status = 200): Response =>
  new Response(corpo, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // A function entra no caminho de toda visita a produto. O cache de borda é o que a tira do
      // caminho quente e o que mantém a página de pé enquanto ela estiver indisponível.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })

export const handleProductPage = async (
  deps: ProductPageDeps,
  url: URL,
): Promise<Response> => {
  let shell: string
  try {
    shell = await deps.fetchShell()
  } catch (e) {
    log({ fn: 'product-page', erro: 'shell', detalhe: String(e) })
    return new Response('página indisponível', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const slug = (url.searchParams.get('slug') ?? '').trim()
  if (slug === '') return html(shell)

  let dados: ProductPageData | null
  try {
    dados = await deps.readProduct(slug)
  } catch (e) {
    log({ fn: 'product-page', erro: 'leitura', slug, detalhe: String(e) })
    return html(shell)
  }
  if (!dados) return html(shell)

  const pedida = variantByPublicId(dados.variants, url.searchParams.get('variant'))
  // Variação de outro produto não chega aqui: `dados.variants` só tem as deste. Variação inativa ou
  // sem preço cai no representativo, junto com o `?variant=` desconhecido — os três são a mesma
  // resposta para a cliente, que é "abra na seleção padrão".
  const elegivel = pedida && isElegivel(dados, pedida) ? pedida : null
  const variante = elegivel ?? representativeVariant(dados.product, dados.variants)
  if (!variante) return html(shell)

  const oferta = resolveOffer(dados.product, variante, {
    origin: deps.origin,
    defaultProductCategory: deps.defaultProductCategory,
  })

  // O preload vem ANTES do JSON-LD: o rastreador lê o documento inteiro de qualquer jeito, e a
  // cliente ganha os bytes da foto começando mais cedo.
  return html(
    injectIntoHead(shell, imagePreloadLink(oferta.imageLink) + jsonLdScript(productJsonLd(oferta))),
  )
}

const isElegivel = (dados: ProductPageData, v: OfferInputVariant): boolean =>
  representativeVariant(dados.product, [v]) !== null
