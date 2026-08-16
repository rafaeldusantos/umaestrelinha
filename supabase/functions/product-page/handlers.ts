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

  return html(injectIntoHead(shell, jsonLdScript(productJsonLd(oferta))))
}

const isElegivel = (dados: ProductPageData, v: OfferInputVariant): boolean =>
  representativeVariant(dados.product, [v]) !== null
