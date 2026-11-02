import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { AddonConfig, AddonList } from '@estrelinha/core/buy-together'
import type { Product } from '@estrelinha/supabase/types'
import { useProductsByIds } from './useProductsByIds'

/**
 * A leitura do Compre Junto de uma joia: a configuração dos adicionais (com a lista e as peças dela,
 * num `select` só) e, depois, os produtos de todos eles numa consulta só (`useProductsByIds`).
 *
 * **Consulta própria, e não um embed no `PRODUCT_SELECT`.** Aquele `select` é compartilhado pela
 * página, pela listagem e pela recuperação de carrinho; embutir os adicionais ali faria cada
 * listagem de categoria baixar uma configuração que desenha zero vezes (molde de `useProductFaqs`).
 * A FK é nomeada porque `product_buy_together` tem duas colunas que apontam para outras tabelas, e
 * sem o nome o PostgREST se recusa a adivinhar (`PGRST201`).
 *
 * **A falha SOBE.** Quem desenha o bloco trata o erro como "não mostre", e a página segue de pé;
 * devolver lista vazia aqui esconderia o motivo.
 *
 * `status`: `off` (nada a mostrar — carregando a configuração, sem adicional, ou sem produtos),
 * `loading` (há adicionais e os produtos ainda chegam — é aí, e só aí, que o espaço é reservado),
 * `ready` e `error`.
 */

interface ConfigRow {
  id: string
  position: number
  kind: 'product' | 'list'
  target_product_id: string | null
  list_id: string | null
  target_variant_ids: string[] | null
  hidden_on_variant_ids: string[] | null
  list: {
    id: string
    name: string
    items: { product_id: string; position: number; variant_ids: string[] | null }[] | null
  } | null
}

export interface BuyTogetherConfig {
  addons: AddonConfig[]
  lists: AddonList[]
}

export const BUY_TOGETHER_SELECT =
  'id, position, kind, target_product_id, list_id, target_variant_ids, hidden_on_variant_ids, ' +
  'list:buy_together_lists!product_buy_together_list_id_fkey(id, name, items:buy_together_list_items(product_id, position, variant_ids))'

export class BuyTogetherQueryError extends Error {}

export const useBuyTogetherData = (mainProductId: string | null | undefined) => {
  const config = useQuery({
    queryKey: ['buy-together', mainProductId],
    queryFn: async (): Promise<BuyTogetherConfig> => {
      const { data, error } = await supabase
        .from('product_buy_together')
        .select(BUY_TOGETHER_SELECT)
        .eq('product_id', mainProductId)
        .order('position', { ascending: true })
      if (error) {
        throw new BuyTogetherQueryError(`carregar o Compre Junto: ${error.message ?? 'erro desconhecido'}`)
      }
      const rows = (data ?? []) as unknown as ConfigRow[]
      const lists = new Map<string, AddonList>()
      for (const r of rows) {
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
      }
    },
    enabled: !!mainProductId,
  })

  const ids = new Set<string>()
  for (const a of config.data?.addons ?? []) if (a.targetProductId) ids.add(a.targetProductId)
  for (const l of config.data?.lists ?? []) for (const i of l.items) ids.add(i.productId)
  if (mainProductId) ids.delete(mainProductId)
  const products = useProductsByIds([...ids])

  const hasAddons = (config.data?.addons.length ?? 0) > 0
  const status: 'off' | 'loading' | 'ready' | 'error' =
    config.isError || (hasAddons && products.isError)
      ? 'error'
      : !hasAddons
        ? 'off'
        : products.isLoading || (ids.size > 0 && !products.data)
          ? 'loading'
          : 'ready'

  return {
    status,
    addons: config.data?.addons ?? [],
    lists: config.data?.lists ?? [],
    products: (products.data ?? []) as Product[],
  }
}
