import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type {
  AddonList,
  BuyTogetherDiscountAddon,
  BuyTogetherDiscountConfig,
} from '@estrelinha/core/buy-together'

/**
 * A configuração do Compre Junto das joias que podem dar desconto a esta sacola: os adicionais de cada
 * uma (com `discount_percent`) e as peças das listas que eles citam — **numa ida ao banco só**.
 *
 * Mora em `entities/cart` porque dois leitores a usam — a gaveta (`widgets/`) e o checkout
 * (`features/`) —, e os dois passam o MESMO objeto a `resolveOrderPricing`. Nenhum dos dois reparte
 * desconto: quem decide é `core`.
 *
 * Os ids pedidos são os das linhas da sacola **e** os das joias que as marcas "acompanha" citam: a
 * joia que saiu da sacola não dá desconto, mas a linha da peça diz quanto ele volta a ser com ela
 * ("O desconto de N% volta com o X na sacola"), e o nome da joia vem desta leitura.
 *
 * `staleTime: 0` de propósito: o percentual que a dona muda no painel tem de chegar à sacola na
 * próxima leitura (ao abrir o checkout, ao voltar à aba) — o servidor cobra o de agora, e uma sacola
 * com o valor velho seria um desconto exibido e não cobrado (ou o contrário).
 *
 * Erro, carregamento ou nenhum adicional com desconto devolvem `config: null`: a sacola fica a preço
 * cheio, e `resolveOrderPricing` sem a entrada nova é exatamente o cálculo de antes.
 */

interface ConfigRow {
  id: string
  position: number
  kind: 'product' | 'list'
  product_id: string
  target_product_id: string | null
  list_id: string | null
  target_variant_ids: string[] | null
  hidden_on_variant_ids: string[] | null
  discount_percent: number | null
  main: { id: string; name: string } | null
  list: {
    id: string
    name: string
    items: { product_id: string; position: number; variant_ids: string[] | null }[] | null
  } | null
}

export const CART_BUY_TOGETHER_SELECT =
  'id, position, kind, product_id, target_product_id, list_id, target_variant_ids, hidden_on_variant_ids, discount_percent, ' +
  'main:products!product_buy_together_product_id_fkey(id, name), ' +
  'list:buy_together_lists!product_buy_together_list_id_fkey(id, name, ' +
  'items:buy_together_list_items(product_id, position, variant_ids))'

export interface CartBuyTogether {
  /** A entrada de `resolveOrderPricing` (sem as marcas, que são da sacola). `null` = sem desconto. */
  config: BuyTogetherDiscountConfig | null
  /** O nome de cada joia lida, para as frases da linha. */
  mainNames: ReadonlyMap<string, string>
}

const NONE: CartBuyTogether = { config: null, mainNames: new Map() }

export class CartBuyTogetherQueryError extends Error {}

const toCartBuyTogether = (rows: ConfigRow[]): CartBuyTogether => {
  const lists = new Map<string, AddonList>()
  const mainNames = new Map<string, string>()
  const addons: BuyTogetherDiscountAddon[] = rows.map(r => {
    if (r.main) mainNames.set(r.main.id, r.main.name)
    if (r.kind === 'list' && r.list && !lists.has(r.list.id)) {
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
      id: r.id,
      mainProductId: r.product_id,
      position: r.position,
      kind: r.kind,
      targetProductId: r.target_product_id,
      listId: r.list_id,
      targetVariantIds: r.target_variant_ids ?? [],
      hiddenOnVariantIds: r.hidden_on_variant_ids ?? [],
      discountPercent: r.discount_percent,
    }
  })
  const anyDiscount = addons.some(a => typeof a.discountPercent === 'number' && a.discountPercent > 0)
  return { config: anyDiscount ? { addons, lists: [...lists.values()] } : null, mainNames }
}

export const useCartBuyTogether = (productIds: readonly string[]): CartBuyTogether => {
  const ids = [...new Set(productIds.filter(Boolean))].sort()
  const query = useQuery({
    queryKey: ['cart-buy-together', ids],
    queryFn: async (): Promise<CartBuyTogether> => {
      const { data, error } = await supabase
        .from('product_buy_together')
        .select(CART_BUY_TOGETHER_SELECT)
        .in('product_id', ids)
        .order('position', { ascending: true })
      if (error) {
        throw new CartBuyTogetherQueryError(
          `carregar o Compre Junto da sacola: ${error.message ?? 'erro desconhecido'}`,
        )
      }
      return toCartBuyTogether((data ?? []) as unknown as ConfigRow[])
    },
    enabled: ids.length > 0,
    staleTime: 0,
  })
  return query.data ?? NONE
}
