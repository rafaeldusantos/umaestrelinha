// Feature 30 — wiring do feed do Google Shopping.
//
// Só env, client e `Deno.serve`. A lógica está em `handlers.ts`, com dependências injetadas, e é lá
// que ela é testada (`AD-004`).
//
// `verify_jwt = false` no `config.toml`: quem busca é o rastreador do Google, que não manda JWT
// nenhum. Não há o que autenticar — o conteúdo servido é o mesmo catálogo que a vitrine publica.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleFeed, type FeedDeps, type FeedRow } from './handlers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// A origem PÚBLICA da loja, não a do Supabase. Alimenta o `<g:link>` de toda oferta.
const storeUrl = Deno.env.get('STORE_PUBLIC_URL') ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

/** As colunas que o feed lê. Enumeradas em vez de `*` para o payload não crescer sem decisão. */
const COLUNAS =
  'id,nuvemshop_id,price,compare_price,stock,image_url,is_active,' +
  'products(id,nuvemshop_id,name,slug,description,images,is_active,stock_policy,' +
  'brand,mpn,age_group,gender,google_product_category,identifier_exists,' +
  // `GSH-23`: a taxonomia herdada. Vem embutida no join para não abrir uma segunda leitura
  // paginada de `product_categories` — 3.475 vínculos, e o `readAllRows` já confere o total de
  // uma coisa só.
  'product_categories(categories(name,sort_order,google_product_category)))'

const lerConfiguracoes = async () => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('key,value')
    .in('key', ['google_shopping', 'general'])
  if (error) throw error
  const mapa = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]))
  return {
    google: mapa.get('google_shopping') as FeedDeps extends never ? never : any,
    general: mapa.get('general') as any,
  }
}

Deno.serve(async () => {
  let config: { google: any; general: any }
  try {
    config = await lerConfiguracoes()
  } catch {
    config = { google: null, general: null }
  }

  const deps: FeedDeps = {
    // Já lida acima: o handler decide o 404 a partir daqui, e uma segunda ida ao banco só
    // acrescentaria uma chance de divergir entre a leitura da flag e a do catálogo.
    readConfig: async () => config.google ?? null,

    countRows: async () => {
      const { count, error } = await supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },

    // `order('id')` é o que torna a paginação estável: sem ordem explícita o PostgREST não garante
    // a mesma sequência entre páginas, e linhas repetiriam ou sumiriam entre uma e outra.
    readPage: async (from, to) => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(COLUNAS)
        .order('id', { ascending: true })
        .range(from, to)
      if (error) throw error
      return (data ?? []).map((row: any): FeedRow => {
        const { products, ...variant } = row
        const { product_categories, ...product } = products ?? {}
        return {
          variant,
          product,
          categories: (product_categories ?? [])
            .map((pc: any) => pc.categories)
            .filter(Boolean),
        }
      })
    },

    markFetched: async () => {
      const { error } = await supabase
        .from('store_settings')
        .update({ value: { ...(config.google ?? {}), last_fetched_at: new Date().toISOString() } })
        .eq('key', 'google_shopping')
      if (error) throw error
    },

    origin: storeUrl,

    channel: {
      title: config.general?.store_name ?? 'Uma Estrelinha',
      link: storeUrl,
      description: 'Joias afetivas artesanais em resina, feitas à mão com o material que você envia.',
    },
  }

  return await handleFeed(deps)
})
