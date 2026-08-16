// Feature 30 — wiring da página do produto servida com JSON-LD.
//
// Só env, client e `Deno.serve`. A lógica está em `handlers.ts`, com dependências injetadas
// (`AD-004`).
//
// `verify_jwt = false`: quem chega aqui é a cliente, ou o rastreador do Google. Não há sessão a
// exigir — o conteúdo é a mesma página pública que a loja já serve.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  createShellCache,
  handleProductPage,
  type ProductPageData,
  type ProductPageDeps,
} from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const storeUrl = (Deno.env.get('STORE_PUBLIC_URL') ?? '').replace(/\/+$/, '')

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * O shell vem do deploy VIVO da loja, nunca de uma cópia embutida aqui.
 *
 * Não há laço: o `rewrite` da Vercel intercepta `/produtos/:slug`, e `/index.html` é arquivo real,
 * servido pelo filesystem antes de qualquer rewrite.
 */
const lerShell = createShellCache(async () => {
  const res = await fetch(`${storeUrl}/index.html`, { headers: { Accept: 'text/html' } })
  if (!res.ok) throw new Error(`shell respondeu ${res.status}`)
  return await res.text()
})

const COLUNAS_PRODUTO =
  'id,nuvemshop_id,name,slug,description,images,is_active,stock_policy,' +
  'brand,mpn,age_group,gender,google_product_category,identifier_exists'

const COLUNAS_VARIACAO = 'id,nuvemshop_id,price,compare_price,stock,image_url,is_active,position'

Deno.serve(async req => {
  const deps: ProductPageDeps = {
    fetchShell: lerShell,

    readProduct: async (slug): Promise<ProductPageData | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(`${COLUNAS_PRODUTO},product_variants(${COLUNAS_VARIACAO})`)
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const { product_variants, ...product } = data as any
      return { product, variants: product_variants ?? [] }
    },

    origin: storeUrl,

    defaultProductCategory: await categoriaPadrao(),
  }

  return await handleProductPage(deps, new URL(req.url))
})

/** Lida por requisição de propósito: mudar a categoria padrão no painel não pode exigir redeploy. */
async function categoriaPadrao(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'google_shopping')
      .maybeSingle()
    return (data?.value as { default_product_category?: string })?.default_product_category ?? null
  } catch {
    return null
  }
}
