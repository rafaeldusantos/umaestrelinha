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
import type { OptionMarkRow } from '../../../packages/core/src/seo/variant.ts'

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
  'brand,mpn,age_group,gender,google_product_category,identifier_exists,' +
  // Feature 62: a copy de busca curada — o título e a descrição do card da joia.
  'seo_title,seo_description,' +
  // Feature 68: os eixos, que decidem qual opção tem página própria.
  'options'

const COLUNAS_VARIACAO =
  'id,nuvemshop_id,price,compare_price,stock,image_url,is_active,position,option_values'

// Feature 68: a marcação e o grupo do valor — `publicOptionMarks` (em `handlers.ts`) restringe ao
// grupo ativo, porque a chave de serviço ignora a RLS que faria isso.
const COLUNAS_MARCACAO = 'option_name,option_value,value_id,filter_values(filter_groups(is_active))'

Deno.serve(async req => {
  const configuracoes = await lerConfiguracoes()
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

    readOptionMarks: async (productId): Promise<OptionMarkRow[]> => {
      const { data, error } = await supabase
        .from('product_option_filter_values')
        .select(COLUNAS_MARCACAO)
        .eq('product_id', productId)
      if (error) throw error
      return (data ?? []) as unknown as OptionMarkRow[]
    },

    origin: storeUrl,

    defaultProductCategory: configuracoes.categoriaPadrao,
    storeDescription: configuracoes.descricaoDaLoja,
  }

  return await handleProductPage(deps, new URL(req.url))
})

/**
 * Lidas por requisição de propósito: mudar a categoria padrão ou a descrição da loja no painel não
 * pode exigir redeploy. Uma consulta só para as duas chaves. Falha ⇒ `null` nas duas, e a página
 * sai assim mesmo: a descrição cai na do shell (A16).
 */
async function lerConfiguracoes(): Promise<{
  categoriaPadrao: string | null
  descricaoDaLoja: string | null
}> {
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('key,value')
      .in('key', ['google_shopping', 'seo'])
    const valor = (chave: string) =>
      ((data ?? []) as { key: string; value: Record<string, unknown> }[]).find(l => l.key === chave)
        ?.value
    const descricao = valor('seo')?.description
    return {
      categoriaPadrao:
        (valor('google_shopping')?.default_product_category as string | undefined) ?? null,
      descricaoDaLoja: typeof descricao === 'string' && descricao.trim() !== '' ? descricao : null,
    }
  } catch {
    return { categoriaPadrao: null, descricaoDaLoja: null }
  }
}
