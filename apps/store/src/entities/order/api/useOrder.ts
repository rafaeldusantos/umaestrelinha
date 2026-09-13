import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { accessFor, forgetAccess } from '../model/orderAccess'
import { fetchGuestOrder } from './guestOrder'
import type { Order } from './useOrders'

/**
 * O pedido lido por id, com os campos que a confirmação precisa além da lista (`paid_at`).
 *
 * `apply_payment_approval` grava `paid_at` + `payment_status = 'approved'` e **não** move
 * `orders.status` — por isso `paid_at` é a fonte do estágio "Pago" na `OrderTimeline`.
 */
export interface OrderDetail extends Order {
  paid_at: string | null
  /** Feature 22 — o estado do material, **independente** do de pagamento (`MAT-08 AC 5`). */
  material_status?: string | null
  /** A remessa DE ENTRADA (cliente → ateliê). **Não** é `tracking_code`, que é a de saída. */
  material_tracking_code?: string | null
  material_received_at?: string | null
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
      // `CSC-06`: quem comprou sem conta não tem sessão, e o PostgREST não tem como escopar o
      // pedido para ela — a RLS de `orders` é toda `TO authenticated`. A prova de posse é o token,
      // e quem o confere é a edge function.
      //
      // Este hook é o dono único de "como leio um pedido": o ramo mora aqui, e não em cada tela,
      // porque a confirmação e a conta fazem a mesma pergunta com credenciais diferentes.
      const token = accessFor(id!)
      if (token) {
        const pedido = await fetchGuestOrder<OrderDetail>(id!, token)
        if (pedido) return pedido
        // Token recusado — expirado, ou o pedido já é de uma conta. Esquecê-lo é o que permite o
        // caminho normal assumir: sem isso, quem entrou por código depois da compra continuaria
        // batendo num acesso morto para sempre.
        forgetAccess(id!)
      }

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

