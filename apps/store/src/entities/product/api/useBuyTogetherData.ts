import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { AddonConfig, AddonList } from '@estrelinha/core/buy-together'
import type { Product } from '@estrelinha/supabase/types'
import { mapDbToProduct, PRODUCT_CARD_SELECT } from '../lib/mapProduct'

/**
 * A leitura do Compre Junto de uma joia: a configuração dos adicionais, a lista e as peças dela, e os
 * produtos de todos eles — **numa ida ao banco só**, filtrada pelo SLUG da joia.
 *
 * **Pelo slug, e não pelo id, para sair junto com a consulta do produto.** Com o id, a leitura só
 * começava depois de o produto chegar, e os produtos dos adicionais só depois dela: numa rede lenta a
 * página pintava sem o bloco, depois ganhava o esqueleto e depois o bloco maior, e o botão de compra
 * andava duas vezes. O filtro é o embed `!inner` da FK do principal (`main.slug`), que recorta as
 * linhas pela joia sem precisar do id dela.
 *
 * **Consulta própria, e não um embed no `PRODUCT_SELECT`.** Aquele `select` é compartilhado pela
 * página, pela listagem e pela recuperação de carrinho; embutir os adicionais ali faria cada
 * listagem de categoria baixar uma configuração que desenha zero vezes (molde de `useProductFaqs`).
 * As FKs são nomeadas porque `product_buy_together` tem várias colunas que apontam para `products`, e
 * sem o nome o PostgREST se recusa a adivinhar (`PGRST201`). Os produtos embutidos usam o
 * `PRODUCT_CARD_SELECT` da vitrine — a constante, nunca uma cópia.
 *
 * **Peça fora do ar não volta**: a RLS de `products` esconde, e o embed chega nulo. Quem decide o
 * que sobra é `resolveAddons`, em `core`.
 *
 * **A falha SOBE.** Quem desenha o bloco trata o erro como "não mostre", e a página segue de pé;
 * devolver lista vazia aqui esconderia o motivo.
 *
 * `status`: `loading` (a primeira resposta ainda não chegou — a página espera por ela para pintar a
 * coluna já com o bloco no tamanho real), `off` (sem adicional, ou sem slug), `ready` e `error`. A
 * PRIMEIRA falha já é `error`: as novas tentativas do React Query continuam por trás, mas a página não
 * fica presa esperando por elas.
 */

type ProductRow = Parameters<typeof mapDbToProduct>[0]

interface ConfigRow {
  id: string
  position: number
  kind: 'product' | 'list'
  product_id: string
  target_product_id: string | null
  list_id: string | null
  target_variant_ids: string[] | null
  hidden_on_variant_ids: string[] | null
  target: ProductRow | null
  list: {
    id: string
    name: string
    items:
      | { product_id: string; position: number; variant_ids: string[] | null; product: ProductRow | null }[]
      | null
  } | null
}

export interface BuyTogetherConfig {
  addons: AddonConfig[]
  lists: AddonList[]
  products: Product[]
}

export const BUY_TOGETHER_SELECT =
  'id, position, kind, product_id, target_product_id, list_id, target_variant_ids, hidden_on_variant_ids, ' +
  'main:products!product_buy_together_product_id_fkey!inner(slug), ' +
  `target:products!product_buy_together_target_product_id_fkey(${PRODUCT_CARD_SELECT}), ` +
  'list:buy_together_lists!product_buy_together_list_id_fkey(id, name, ' +
  `items:buy_together_list_items(product_id, position, variant_ids, product:products(${PRODUCT_CARD_SELECT})))`

export class BuyTogetherQueryError extends Error {}

const toConfig = (rows: ConfigRow[]): BuyTogetherConfig => {
  const lists = new Map<string, AddonList>()
  const products = new Map<string, Product>()
  const mainIds = new Set(rows.map(r => r.product_id))
  const keep = (row: ProductRow | null | undefined) => {
    if (!row) return
    const product = mapDbToProduct(row)
    if (mainIds.has(product.id) || products.has(product.id)) return
    products.set(product.id, product)
  }
  for (const r of rows) {
    keep(r.target)
    for (const i of r.list?.items ?? []) keep(i.product)
    if (r.kind !== 'list' || !r.list || lists.has(r.list.id)) continue
    lists.set(r.list.id, {
      id: r.list.id,
      name: r.list.name,
      items: (r.list.items ?? []).map(i => ({
        productId: i.product_id,
        position: i.position,
        variantIds: i.variant_ids ?? [],
      })),
    })
  }
  return {
    addons: rows.map(r => ({
      id: r.id,
      position: r.position,
      kind: r.kind,
      targetProductId: r.target_product_id,
      listId: r.list_id,
      targetVariantIds: r.target_variant_ids ?? [],
      hiddenOnVariantIds: r.hidden_on_variant_ids ?? [],
    })),
    lists: [...lists.values()],
    products: [...products.values()],
  }
}

export const useBuyTogetherData = (mainSlug: string | null | undefined) => {
  const config = useQuery({
    queryKey: ['buy-together', mainSlug],
    queryFn: async (): Promise<BuyTogetherConfig> => {
      const { data, error } = await supabase
        .from('product_buy_together')
        .select(BUY_TOGETHER_SELECT)
        .eq('main.slug', mainSlug)
        .order('position', { ascending: true })
      if (error) {
        throw new BuyTogetherQueryError(`carregar o Compre Junto: ${error.message ?? 'erro desconhecido'}`)
      }
      return toConfig((data ?? []) as unknown as ConfigRow[])
    },
    enabled: !!mainSlug,
  })

  /*
   * `isLoading`, e nunca `isPending`: com a consulta desligada (sem slug) `isPending` fica verdadeiro
   * para sempre, e a página esperaria uma resposta que não vem. `failureCount > 0` é a primeira falha
   * com as novas tentativas ainda por vir — para o bloco, já é erro.
   */
  const hasAddons = (config.data?.addons.length ?? 0) > 0
  const status: 'off' | 'loading' | 'ready' | 'error' =
    config.isError || (config.failureCount > 0 && !config.data)
      ? 'error'
      : config.isLoading
        ? 'loading'
        : hasAddons
          ? 'ready'
          : 'off'

  return {
    status,
    addons: config.data?.addons ?? [],
    lists: config.data?.lists ?? [],
    products: config.data?.products ?? [],
  }
}
