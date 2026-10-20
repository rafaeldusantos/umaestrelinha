// Feature 69 — a resposta HTML de qualquer caminho da loja (`AD-053`).
//
// ---------------------------------------------------------------------------------------------
// UMA FUNÇÃO PARA TODO CAMINHO
// ---------------------------------------------------------------------------------------------
// A função `api/page` da Vercel recebe todo caminho que não é arquivo estático nem a Home, e a
// decisão inteira mora aqui, pura: `classifyPath` diz o que o caminho É, e esta função lê o que
// precisa (pelas `deps`, injetadas) e monta `{ status, headers, body }` — sem `Response`, para ser
// testável sem runtime nenhum. A função da Vercel é só env, leitura e o shell.
//
// O ramo de produto é o `handleProductPage` da edge function `product-page` (features 30, 38, 62 e
// 68), com o mesmo `<head>`, o mesmo JSON-LD e o mesmo preload — e com duas respostas que a function
// não podia dar, porque estava atrás de um `rewrite` que só servia 200: **404** para produto
// inexistente ou inativo (SSV-07) e **301** pelo `product_redirects` (SSV-31).
//
// ---------------------------------------------------------------------------------------------
// ERRO DE INFRAESTRUTURA NUNCA TIRA PÁGINA DO ÍNDICE
// ---------------------------------------------------------------------------------------------
// Toda leitura que falha devolve o shell intacto com **200** e `no-store` (SSV-06, SSV-13): a SPA
// resolve sozinha, e nada é cacheado. Um 404 por banco fora do ar tiraria do Google uma página que
// existe; um 5xx deixaria a cliente sem loja. Só o "não existe" COMPROVADO vira 404.
//
// Imports por ARQUIVO e com extensão explícita: a função empacota este módulo fora do Vite.

import { renditionUrl } from '../media/rendition.ts'
import { categoryPageMeta, notFoundPageMeta, staticPageMeta } from '../seo/pages.ts'
import {
  indexableOptions,
  optionPlainTitle,
  productHead,
  publicOptionMarks,
  type OptionMarkRow,
  type VariantSeoAxis,
  type VariantSeoInput,
} from '../seo/variant.ts'
import {
  productGroupJsonLd,
  productJsonLd,
  publicProductId,
  representativeVariant,
  resolveOffer,
  variantByPublicId,
  variesByFor,
  withPageUrl,
  type OfferInputProduct,
  type OfferInputVariant,
} from '../shopping/index.ts'
import { productPath } from '../routes/routes.ts'
import { resolveCategoryRoute, type CategoryRouteNode } from './categoryRoute.ts'
import { classifyPath } from './classify.ts'
import { applyHead, imagePreloadLink, jsonLdScript, shellDescription, type ServedHead } from './head.ts'
import { OG_IMAGE_WIDTH, productPageImages } from './images.ts'

/** O produto como a página o lê. A forma é a da `product-page` (features 62 e 68). */
export interface ProductPageData {
  product: OfferInputProduct & {
    seo_title?: string | null
    seo_description?: string | null
    options?: readonly VariantSeoAxis[] | null
  }
  variants: (OfferInputVariant & { option_values?: Readonly<Record<string, string>> | null })[]
}

/** O que a página lê de uma categoria da árvore ativa. */
export interface PageCategory extends CategoryRouteNode {
  name: string
  description?: string | null
  banner_url?: string | null
  image_url?: string | null
}

/** `store_settings` que a página do produto lê. Ausente ⇒ `null`, e a página sai assim mesmo. */
export interface PageSettings {
  /** `google_shopping.default_product_category`. */
  defaultProductCategory: string | null
  /** `seo.description` — o recuo da descrição do produto (A16). `null` ⇒ a do shell. */
  storeDescription: string | null
}

export interface PageDeps {
  /** O `dist/index.html` do MESMO build (SSV-04) — embutido no bundle, nunca buscado. */
  shell: string
  /** `STORE_PUBLIC_URL`. Não absoluta ⇒ nenhuma canônica, nunca relativa. */
  origin: string
  /** `null` = slug desconhecido (a RLS já esconde o inativo). Lançar = falha de leitura. */
  readProduct: (slug: string) => Promise<ProductPageData | null>
  /** As marcações por opção da peça (feature 68). Falha ⇒ o `<head>` da peça (SVR-21). */
  readOptionMarks: (productId: string) => Promise<OptionMarkRow[]>
  /** O slug ATUAL do produto que `product_redirects` guarda para este slug, ou `null`. */
  readProductRedirect: (slug: string) => Promise<string | null>
  /** A árvore ATIVA de categorias. */
  readCategories: () => Promise<readonly PageCategory[]>
  /** O `category_id` de `category_redirects` para este slug, ou `null`. */
  readCategoryRedirect: (slug: string) => Promise<string | null>
  /** A RPC `category_fallback(slug)`: `null`, `ROOT_FALLBACK` ou o id do ancestral ativo. */
  readInactiveFallback: (slug: string) => Promise<string | null>
  readSettings: () => Promise<PageSettings>
  log: (entry: Record<string, unknown>) => void
}

export interface ServedResponse {
  status: number
  headers: Record<string, string>
  body: string
}

/**
 * O `Cache-Control` de cada ramo — a tabela "Decisão por caminho" do `design.md` da 69.
 *
 * - **300 s** em produto e categoria: o teto de atraso entre editar no painel e a página mostrar
 *   (decisão do usuário, 2026-10-19).
 * - **60 s** em 404 (SSV-12): um produto recém-cadastrado não pode ficar 5 min invisível.
 * - **3600 s** em página fixa e rota de app: o conteúdo é do build, e o cache da Vercel é por deploy.
 * - **`no-store`** em erro: nada de falha cacheada.
 */
export const PAGE_CACHE = {
  page: 'public, s-maxage=300',
  notFound: 'public, s-maxage=60',
  fixed: 'public, s-maxage=3600',
  error: 'no-store',
} as const

const HTML = 'text/html; charset=utf-8'

const html = (body: string, status: number, cache: string): ServedResponse => ({
  status,
  headers: { 'Content-Type': HTML, 'Cache-Control': cache },
  body,
})

const redirect = (to: string, cache: string = PAGE_CACHE.page): ServedResponse => ({
  status: 301,
  headers: { Location: to, 'Cache-Control': cache },
  body: '',
})

/** A origem sem barra final, e se ela é absoluta. A canônica só existe com origem absoluta. */
const origemDe = (origin: string): { origem: string; absoluta: boolean } => {
  const origem = (origin ?? '').replace(/\/+$/, '')
  return { origem, absoluta: /^https?:\/\//.test(origem) }
}

/** A 404 da loja: o shell com o `<head>` de `notFoundPageMeta` e `noindex` no HTML servido (SSV-07). */
const naoEncontrada = (shell: string): ServedResponse => {
  const meta = notFoundPageMeta()
  return html(
    applyHead(shell, {
      title: meta.title,
      description: meta.description,
      canonical: null,
      image: null,
      ogType: 'website',
      noindex: true,
    }),
    404,
    PAGE_CACHE.notFound,
  )
}

/** Falha de leitura: o shell intacto, 200, nada cacheado, e o log nomeia o caminho. */
const falha = (deps: PageDeps, path: string, erro: string, e: unknown): ServedResponse => {
  deps.log({ fn: 'page', erro, path, detalhe: String(e) })
  return html(deps.shell, 200, PAGE_CACHE.error)
}

/**
 * A resposta de um caminho. Nunca lança: exceção inesperada vira o shell com 200 e `no-store`, com
 * log (spec, *Edge Cases*).
 */
export const servePage = async (deps: PageDeps, url: URL): Promise<ServedResponse> => {
  const path = url.pathname
  try {
    const tipo = classifyPath(path)
    switch (tipo.kind) {
      case 'product':
        return await servirProduto(deps, url, tipo.slug)
      case 'category':
        return await servirCategoria(deps, path, tipo.slug, tipo.parentSlug)
      case 'static':
        return servirFixa(deps, tipo.path)
      case 'app':
        return html(deps.shell, 200, PAGE_CACHE.fixed)
      default:
        return naoEncontrada(deps.shell)
    }
  } catch (e) {
    return falha(deps, path, 'inesperado', e)
  }
}

// ---------------------------------------------------------------------------------------------
// Página fixa (SSV-22)
// ---------------------------------------------------------------------------------------------

const servirFixa = (deps: PageDeps, path: string): ServedResponse => {
  const meta = staticPageMeta(path)
  const { origem, absoluta } = origemDe(deps.origin)
  return html(
    applyHead(deps.shell, {
      title: meta.title,
      description: meta.description,
      canonical: absoluta ? `${origem}${path}` : null,
      image: null,
      ogType: 'website',
    }),
    200,
    PAGE_CACHE.fixed,
  )
}

// ---------------------------------------------------------------------------------------------
// Categoria (SSV-08, SSV-13..21, SSV-32..34)
// ---------------------------------------------------------------------------------------------

const servirCategoria = async (
  deps: PageDeps,
  path: string,
  slug: string,
  parentSlug: string | null,
): Promise<ServedResponse> => {
  let categorias: readonly PageCategory[]
  try {
    categorias = await deps.readCategories()
  } catch (e) {
    return falha(deps, path, 'categorias', e)
  }

  // Primeira passada só com a árvore — o mesmo recorte da `CategoryPage`: enquanto o slug for
  // categoria ATIVA, nem `category_redirects` nem a RPC são consultados.
  const direta = resolveCategoryRoute({ slug, parentSlug, categories: categorias })
  if (direta.kind === 'ok') return servirCategoriaAtiva(deps, direta.category, direta.canonical)
  if (direta.kind === 'redirect') return redirect(direta.to)

  // Não é ativa: as duas leituras da precedência (SSV-34), em paralelo.
  const [redirecao, inativa] = await Promise.allSettled([
    deps.readCategoryRedirect(slug),
    deps.readInactiveFallback(slug),
  ])
  if (redirecao.status === 'rejected') {
    // Sem saber se havia redirect, nenhuma resposta abaixo dele na precedência é confiável — nem o
    // 301 ao ancestral, nem o 404 (SSV-13).
    return falha(deps, path, 'category_redirects', redirecao.reason)
  }
  // A RPC falhando é tratada como "sem inativa" (design, *Error Handling*), e o 404 que disso
  // resultaria vira shell 200: erro de infraestrutura não decide que a página não existe.
  const fallback = inativa.status === 'fulfilled' ? inativa.value : null

  const rota = resolveCategoryRoute({
    slug,
    parentSlug,
    categories: categorias,
    redirectTo: redirecao.value,
    inactiveFallback: fallback,
  })
  if (rota.kind === 'redirect') return redirect(rota.to)
  if (inativa.status === 'rejected') {
    return falha(deps, path, 'category_fallback', (inativa as PromiseRejectedResult).reason)
  }
  return naoEncontrada(deps.shell)
}

/**
 * O `<head>` de uma categoria ativa (SSV-18, SSV-19). A foto do card é a arte da categoria —
 * `banner_url`, senão `image_url` —, pedida pela rendição de 1200 pela mesma razão do produto: o
 * transformador do Storage entrega JPEG a quem não anuncia WebP, e nem todo mensageiro lê WebP.
 * Arte fora do Storage volta inalterada (`renditionUrl`).
 */
const servirCategoriaAtiva = (
  deps: PageDeps,
  categoria: PageCategory,
  canonica: string,
): ServedResponse => {
  const meta = categoryPageMeta(categoria)
  const { origem, absoluta } = origemDe(deps.origin)
  const arte = (categoria.banner_url ?? '').trim() || (categoria.image_url ?? '').trim()
  return html(
    applyHead(deps.shell, {
      title: meta.title,
      description: meta.description,
      canonical: absoluta ? `${origem}${canonica}` : null,
      image: arte ? renditionUrl(arte, OG_IMAGE_WIDTH) : null,
      ogType: 'website',
    }),
    200,
    PAGE_CACHE.page,
  )
}

// ---------------------------------------------------------------------------------------------
// Produto (SSV-01, SSV-05..07, SSV-31)
// ---------------------------------------------------------------------------------------------

const lerConfiguracoes = async (deps: PageDeps, path: string): Promise<PageSettings> => {
  try {
    const s = await deps.readSettings()
    return { defaultProductCategory: s?.defaultProductCategory ?? null, storeDescription: s?.storeDescription ?? null }
  } catch (e) {
    // A página sai assim mesmo: a descrição cai na do shell (A16).
    deps.log({ fn: 'page', erro: 'configuracoes', path, detalhe: String(e) })
    return { defaultProductCategory: null, storeDescription: null }
  }
}

const servirProduto = async (deps: PageDeps, url: URL, slug: string): Promise<ServedResponse> => {
  const path = url.pathname
  let dados: ProductPageData | null
  let config: PageSettings
  try {
    ;[dados, config] = await Promise.all([deps.readProduct(slug), lerConfiguracoes(deps, path)])
  } catch (e) {
    return falha(deps, path, 'leitura', e)
  }

  // Inexistente OU inativo (a RLS já esconde o inativo; a régua não depende só dela).
  if (!dados || dados.product?.is_active === false) {
    let atual: string | null
    try {
      atual = await deps.readProductRedirect(slug)
    } catch (e) {
      return falha(deps, path, 'product_redirects', e)
    }
    // SSV-31: o mesmo destino que `useProduct` navega — com a query junto, para o `?variant=` de um
    // link antigo continuar abrindo a opção (feature 68).
    if (atual && atual !== slug) return redirect(`${productPath(atual)}${url.search}`)
    return naoEncontrada(deps.shell)
  }

  const pedida = variantByPublicId(dados.variants, url.searchParams.get('variant'))
  // Variação de outro produto não chega aqui: `dados.variants` só tem as deste. Variação inativa ou
  // sem preço cai no representativo, junto com o `?variant=` desconhecido — as três são a mesma
  // resposta para a cliente, que é "abra na seleção padrão" (SSV-05).
  const elegivel = pedida && isElegivel(dados, pedida) ? pedida : null
  const variante = elegivel ?? representativeVariant(dados.product, dados.variants)
  // Peça ativa sem variação elegível: a página existe e a SPA a desenha — o shell intacto, como hoje.
  if (!variante) return html(deps.shell, 200, PAGE_CACHE.page)

  const contexto = { origin: deps.origin, defaultProductCategory: config.defaultProductCategory }
  const oferta = resolveOffer(dados.product, variante, contexto)

  // Feature 68 — as marcações por opção, restritas como a leitura pública (SVR-20). Falha ⇒ a peça,
  // com log (SVR-21): declarar página de opção com dado parcial é pior que não declarar.
  let marcas: ReturnType<typeof publicOptionMarks> = []
  if ((dados.product.options ?? []).length > 0) {
    try {
      marcas = publicOptionMarks(await deps.readOptionMarks(dados.product.id))
    } catch (e) {
      deps.log({ fn: 'page', erro: 'marcacoes', path, slug, detalhe: String(e) })
    }
  }
  const entrada = { product: { ...dados.product, option_marks: marcas }, variants: dados.variants }

  // Feature 62 e 68: o título, a descrição, a canônica e o card DESTA URL — a mesma régua do cliente.
  const head = productHead(
    entrada,
    url.searchParams.get('variant'),
    config.storeDescription ?? shellDescription(deps.shell),
  )
  const { origem, absoluta } = origemDe(deps.origin)
  const canonica = absoluta ? `${origem}${head.canonicalPath}` : null

  // SSV-26: a foto do card é `productPageImages(…)[0]` — o dono único de "a foto que a página
  // declara", que o sitemap também lê. Recebe a variação ABERTA: com `?variant=` é a foto dela
  // (como a `product-page` fazia, pela `oferta`); sem, é a representante — e aí é byte a byte o
  // `[0]` do sitemap, porque a representante de `[representante]` é ela mesma.
  const foto = productPageImages(dados.product, [variante])[0] ?? null

  const servido: ServedHead = {
    title: head.meta.title,
    description: head.meta.description,
    canonical: canonica,
    image: foto,
    ogType: 'product',
    // O preload vem ANTES do JSON-LD: o rastreador lê o documento inteiro de qualquer jeito, e a
    // cliente ganha os bytes da foto começando mais cedo.
    extra:
      imagePreloadLink(oferta.imageLink) +
      jsonLdScript(dadoEstruturado(dados, entrada, oferta, elegivel !== null, canonica, origem, contexto)),
  }
  return html(applyHead(deps.shell, servido), 200, PAGE_CACHE.page)
}

/**
 * O JSON-LD da página, UM `@type` de produto por documento (SVR-22, SVR-30..33), nesta precedência:
 *
 * 1. `?variant=` válido e elegível ⇒ o `Product` da variação aberta — a oferta de sempre, com a
 *    `url` da canônica e o `inProductGroupWithID`. O Merchant Center chega SEMPRE com `?variant=`,
 *    e a paridade com o feed mora neste `Product`.
 * 2. sem `?variant=` válido, com opções indexáveis num eixo da tabela de `variesBy` e origem
 *    absoluta ⇒ o `ProductGroup`, com a oferta da representante de cada opção.
 * 3. senão ⇒ o `Product` da representante da peça, com a `url` da canônica.
 */
const dadoEstruturado = (
  dados: ProductPageData,
  entrada: VariantSeoInput<ProductPageData['variants'][number]>,
  oferta: ReturnType<typeof resolveOffer>,
  abriuVariacao: boolean,
  canonica: string | null,
  origem: string,
  contexto: { origin: string; defaultProductCategory: string | null },
): Record<string, unknown> => {
  const grupo = publicProductId(dados.product)
  if (abriuVariacao) return withPageUrl(productJsonLd(oferta), { url: canonica, groupId: grupo })

  const opcoes = indexableOptions(entrada)
  const variesBy = variesByFor(opcoes[0]?.axis)
  if (opcoes.length === 0 || !variesBy || !canonica) return withPageUrl(productJsonLd(oferta), { url: canonica })

  return productGroupJsonLd({
    name: dados.product.name,
    groupId: grupo,
    variesBy,
    url: canonica,
    variants: opcoes.map(o => ({
      offer: resolveOffer(dados.product, o.variant, contexto),
      name: optionPlainTitle(dados.product.name, o.text),
      value: o.text,
      url: `${origem}${o.path}`,
    })),
  })
}

const isElegivel = (dados: ProductPageData, v: OfferInputVariant): boolean =>
  representativeVariant(dados.product, [v]) !== null
