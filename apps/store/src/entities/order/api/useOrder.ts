import { useQuery } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type { Order } from './useOrders'

/**
 * O pedido lido por id, com os campos que a confirmação precisa além da lista (`paid_at`).
 *
 * `apply_payment_approval` grava `paid_at` + `payment_status = 'approved'` e **não** move
 * `orders.status` — por isso `paid_at` é a fonte do estágio "Pago" na `OrderTimeline`.
 */
export interface OrderDetail extends Order {
  paid_at: string | null
}

/**
 * Busca um pedido por id (CNF-03): a confirmação é rota, não estado do checkout, então ela
 * recompõe tudo do banco e sobrevive ao reload.
 *
 * Erro e "não encontrado" são estados **distintos**: erro rejeita (`isError`), pedido inexistente
 * resolve com `null`. Quem renderiza precisa dizer coisas diferentes nos dois casos.
 */
export const useOrder = (id: string | undefined) =>
  useQuery({
    queryKey: ['orders', 'id', id],
    queryFn: async (): Promise<OrderDetail | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id!)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return (data as unknown as OrderDetail) ?? null
    },
    enabled: !!id,
  })
