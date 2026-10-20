// Feature 69 — a função `api/page` da Vercel (`AD-053`, T10).
//
// Só env, client e leitura. A decisão inteira — que tipo de caminho é este, que `<head>` ele leva,
// que status e que `Cache-Control` — mora em `servePage` (`@estrelinha/core/page`), pura e testada
// em `core`. Aqui ficam as leituras de `PageDeps` e a tradução de `{ status, headers, body }` em
// `Response`.
//
// A leitura é pela chave PUBLICÁVEL, sem sessão: a mesma que o navegador já tem no bundle. A RLS
// faz o trabalho que a `product-page` replicava à mão — produto inativo some (⇒ 404), categoria
// desligada some da árvore, marcação de grupo desligado some do embed. A categoria inativa, que a
// RLS esconde, só é alcançada pela RPC `category_fallback`, que devolve um id e nada mais.
//
// O shell é o `dist/index.html` do MESMO build, embutido no bundle pelo `define` de
// `scripts/build-server.mjs` (SSV-04) — nunca buscado por HTTP em runtime.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  servePage,
  type PageCategory,
  type PageDeps,
  type PageSettings,
  type ProductPageData,
  type ServedResponse,
} from '@estrelinha/core/page'

/** A linha de marcação que `servePage` espera — tirada do contrato, sem import de `core/seo`. */
type OptionMarkRow = Awaited<ReturnType<PageDeps['readOptionMarks']>>[number]

/** Substituído pelo esbuild no build. Em teste não existe — por isso só é lido via `typeof`. */
declare const __SHELL__: string

/** O parâmetro pelo qual o `rewrite` do `vercel.json` entrega o caminho original. */
export const PATH_PARAM = '__path'

// As colunas são as da `product-page` (features 30, 38, 62 e 68): o mesmo `<head>`, o mesmo JSON-LD.
export const COLUNAS_PRODUTO =
  'id,nuvemshop_id,name,slug,description,images,is_active,stock_policy,' +
  'brand,mpn,age_group,gender,google_product_category,identifier_exists,' +
  'seo_title,seo_description,' +
  'options'

export const COLUNAS_VARIACAO =
  'id,nuvemshop_id,price,compare_price,stock,image_url,is_active,position,option_values'

// O grupo do valor vem no embed porque `publicOptionMarks` (em `servePage`) exige o grupo ativo.
// Com a RLS, um grupo desligado já chega `null` — e `null` também é recusado lá.
export const COLUNAS_MARCACAO = 'option_name,option_value,value_id,filter_values(filter_groups(is_active))'

/** O que a página lê de uma categoria. Só a árvore ATIVA, que é a pública. */
export const COLUNAS_CATEGORIA = 'id,slug,parent_id,name,description,banner_url,image_url'

/**
 * A URL que a cliente pediu, reconstruída do `rewrite`.
 *
 * O `vercel.json` manda `/:path*` para `/api/page?__path=/:path*`, e a Vercel junta a query
 * original à do destino — então `?variant=` chega ao lado de `__path`. O resto da query é
 * preservado (é dele que a página de opção depende, feature 68) e `__path` sai, para nenhuma regra
 * a enxergar. Barras iniciais repetidas são colapsadas: `//outro-host` não pode virar uma URL de
 * outra origem.
 */
export const originalUrl = (requestUrl: string): URL => {
  const recebida = new URL(requestUrl)
  const pedido = recebida.searchParams.get(PATH_PARAM)
  const caminho = pedido === null ? recebida.pathname : `/${pedido.replace(/^\/+/, '')}`
  const url = new URL(caminho, recebida.origin)
  const query = new URLSearchParams(recebida.searchParams)
  query.delete(PATH_PARAM)
  url.search = query.toString()
  return url
}

/** `{ status, headers, body }` em `Response`. 301 sai sem corpo. */
export const toResponse = (servida: ServedResponse): Response =>
  new Response(servida.status === 301 || servida.body === '' ? null : servida.body, {
    status: servida.status,
    headers: servida.headers,
  })

type Log = (entrada: Record<string, unknown>) => void

/** As leituras reais de `PageDeps`. Erro do PostgREST LANÇA — `servePage` decide o que ele vira. */
export const pageDeps = (
  supabase: SupabaseClient,
  ctx: { shell: string; origin: string; log: Log },
): PageDeps => ({
  shell: ctx.shell,
  origin: ctx.origin,
  log: ctx.log,

  readProduct: async (slug): Promise<ProductPageData | null> => {
    const { data, error } = await supabase
      .from('products')
      .select(`${COLUNAS_PRODUTO},product_variants(${COLUNAS_VARIACAO})`)
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const { product_variants, ...product } = data as Record<string, unknown>
    return {
      product: product as unknown as ProductPageData['product'],
      variants: (product_variants ?? []) as ProductPageData['variants'],
    }
  },

  readOptionMarks: async (productId): Promise<OptionMarkRow[]> => {
    const { data, error } = await supabase
      .from('product_option_filter_values')
      .select(COLUNAS_MARCACAO)
      .eq('product_id', productId)
    if (error) throw error
    return (data ?? []) as unknown as OptionMarkRow[]
  },

  // O slug ATUAL pelo embed da FK `product_id → products`. Produto de destino inativo chega `null`
  // pela RLS, e isso é o mesmo que não haver redirect: 404.
  readProductRedirect: async (slug): Promise<string | null> => {
    const { data, error } = await supabase
      .from('product_redirects')
      .select('product_id,products(slug)')
      .eq('from_slug', slug)
      .maybeSingle()
    if (error) throw error
    const alvo = (data as { products?: { slug?: string | null } | null } | null)?.products
    return alvo?.slug ?? null
  },

  // `active = true` explícito ao lado da RLS: a régua da árvore ativa fica escrita aqui, e não só
  // implícita na policy.
  readCategories: async (): Promise<readonly PageCategory[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select(COLUNAS_CATEGORIA)
      .eq('active', true)
      .order('sort_order')
    if (error) throw error
    return (data ?? []) as unknown as PageCategory[]
  },

  readCategoryRedirect: async (slug): Promise<string | null> => {
    const { data, error } = await supabase
      .from('category_redirects')
      .select('category_id')
      .eq('from_slug', slug)
      .maybeSingle()
    if (error) throw error
    return (data as { category_id?: string | null } | null)?.category_id ?? null
  },

  readInactiveFallback: async (slug): Promise<string | null> => {
    const { data, error } = await supabase.rpc('category_fallback', { p_slug: slug })
    if (error) throw error
    return typeof data === 'string' ? data : null
  },

  // Lidas por requisição (com o cache de borda por cima): mudar a categoria padrão ou a descrição
  // da loja no painel não exige deploy.
  readSettings: async (): Promise<PageSettings> => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('key,value')
      .in('key', ['google_shopping', 'seo'])
    if (error) throw error
    const valor = (chave: string) =>
      ((data ?? []) as { key: string; value: Record<string, unknown> | null }[]).find(l => l.key === chave)
        ?.value
    const categoria = valor('google_shopping')?.default_product_category
    const descricao = valor('seo')?.description
    return {
      defaultProductCategory: typeof categoria === 'string' && categoria.trim() !== '' ? categoria : null,
      storeDescription: typeof descricao === 'string' && descricao.trim() !== '' ? descricao : null,
    }
  },
})

export interface HandlerOptions {
  shell: string
  env: Record<string, string | undefined>
  log?: Log
  /** Injetável para teste; o padrão é o `createClient` do supabase-js. */
  makeClient?: (url: string, key: string) => SupabaseClient
}

const logPadrao: Log = entrada => console.log(JSON.stringify(entrada))

/**
 * O handler `fetch`. Sem as duas envs do Supabase não há leitura possível: o shell sai intacto,
 * 200 e `no-store`, com log — a SPA resolve sozinha, e nada é cacheado (design, *Error Handling*).
 */
export const createPageHandler = (opts: HandlerOptions) => {
  const log = opts.log ?? logPadrao
  const makeClient =
    opts.makeClient ??
    ((url: string, key: string) => createClient(url, key, { auth: { persistSession: false } }))
  let client: SupabaseClient | null = null

  return async (request: Request): Promise<Response> => {
    const url = originalUrl(request.url)
    const supabaseUrl = opts.env.VITE_SUPABASE_URL ?? ''
    const chave = opts.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
    if (supabaseUrl === '' || chave === '') {
      log({ fn: 'page', erro: 'env', path: url.pathname, faltando: { url: supabaseUrl === '', chave: chave === '' } })
      return toResponse({
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        body: opts.shell,
      })
    }
    client ??= makeClient(supabaseUrl, chave)
    const origin = (opts.env.STORE_PUBLIC_URL ?? '').replace(/\/+$/, '')
    const servida = await servePage(pageDeps(client, { shell: opts.shell, origin, log }), url)
    return toResponse(servida)
  }
}

let handler: ((request: Request) => Promise<Response>) | null = null

export default {
  fetch(request: Request): Promise<Response> {
    handler ??= createPageHandler({
      shell: typeof __SHELL__ === 'string' ? __SHELL__ : '',
      env: process.env,
    })
    return handler(request)
  },
}
