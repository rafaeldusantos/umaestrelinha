import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { BUY_TOGETHER_DISCOUNT_SELECT } from '@estrelinha/core/buy-together/io/discountSelect'
import {
  buyTogetherDiscountConfig,
  type BuyTogetherDiscountConfig,
  type BuyTogetherDiscountRow,
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

/** A leitura e o mapeamento moram em `core` (`buyTogetherDiscountConfig`): o servidor faz a mesma. */
export const CART_BUY_TOGETHER_SELECT = BUY_TOGETHER_DISCOUNT_SELECT

export interface CartBuyTogether {
  /** A entrada de `resolveOrderPricing` (sem as marcas, que são da sacola). `null` = sem desconto. */
  config: BuyTogetherDiscountConfig | null
  /** O nome de cada joia lida, para as frases da linha. */
  mainNames: ReadonlyMap<string, string>
  /**
   * Relê a configuração agora: depois de o servidor recusar o pagamento porque o desconto
   * mudou, a tela tem de mostrar o de agora sem esperar a próxima montagem.
   */
  refresh?: () => void
}

const NONE: CartBuyTogether = { config: null, mainNames: new Map() }

export class CartBuyTogetherQueryError extends Error {}

const toCartBuyTogether = (rows: BuyTogetherDiscountRow[]): CartBuyTogether => {
  const mainNames = new Map<string, string>()
  for (const r of rows) if (r.main) mainNames.set(r.main.id, r.main.name)
  return { config: buyTogetherDiscountConfig(rows), mainNames }
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
      return toCartBuyTogether((data ?? []) as unknown as BuyTogetherDiscountRow[])
    },
    enabled: ids.length > 0,
    staleTime: 0,
  })
  const data = query.data ?? NONE
  const refetch = query.refetch
  return useMemo(() => ({ ...data, refresh: () => void refetch() }), [data, refetch])
}
