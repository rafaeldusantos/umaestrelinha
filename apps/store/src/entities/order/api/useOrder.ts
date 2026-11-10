import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { accessFor, forgetAccess } from '../model/orderAccess'
import { fetchGuestOrder } from './guestOrder'
import type { StatusEvent } from '@estrelinha/core/orders'
import type { ManualPaymentForCustomer } from '../lib/paymentDelivery'
import type { Order } from './useOrders'

/**
 * O pedido lido por id, com os campos que a confirmação precisa além da lista (`paid_at`).
 *
 * `apply_payment_approval` grava `paid_at` + `payment_status = 'approved'` e **não** move
 * `orders.status` — por isso `paid_at` é a fonte da etapa "Pagamento aprovado" da `OrderJourney`.
 */
export interface OrderDetail extends Order {
  paid_at: string | null
  /** Feature 22 — o estado do material, **independente** do de pagamento (`MAT-08 AC 5`). */
  material_status?: string | null
  /** A remessa DE ENTRADA (cliente → ateliê). **Não** é `tracking_code`, que é a de saída. */
  material_tracking_code?: string | null
  material_received_at?: string | null
  /**
   * Feature 59 (`LIN-01`, `LIN-04`) — o histórico do pedido, só `status` + data, em ordem. É dele
   * que a linha do tempo tira "Em produção", "A caminho" e "Entregue" (`orderJourney`). Os DOIS
   * caminhos de leitura entregam o mesmo formato: a RPC `customer_order_events` para quem tem
   * sessão, e o `get-order` para a convidada.
   */
  status_events: StatusEvent[]
  /** A remessa DE SAÍDA (ateliê → cliente) — o cartão "Rastreio do pacote" (`DET-03`). */
  tracking_code?: string | null
  shipping_carrier?: string | null
  /** O endereço é SNAPSHOT do pedido (`DET-11`): editar o da conta não muda pedido feito. */
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  coupon_code?: string | null
  promotion_discount?: number | null
  pix_discount?: number | null
  /**
   * O pagamento registrado à mão pela loja, quando o pedido foi pago por fora: só o MEIO.
   * Vem pelo `get-order` (convidada) e pela RPC `customer_manual_payment` (sessão); `null` sem
   * registro vivo. A observação e o comprovante nunca saem do painel.
   */
  manual_payment?: ManualPaymentForCustomer | null
}

/**
 * Os eventos do histórico de um pedido da própria cliente (`LIN-01`).
 *
 * **Falha não derruba a página**: sem os eventos a linha do tempo perde as datas do histórico, e
 * só isso — o pedido continua inteiro na tela. Por isso erro, corpo inesperado e até o client sem
 * `rpc` viram `[]`, nunca uma rejeição.
 */
async function lerEventos(orderId: string): Promise<StatusEvent[]> {
  try {
    const { data, error } = await supabase.rpc('customer_order_events', { p_order_id: orderId })
    if (error || !Array.isArray(data)) return []
    return (data as { status: string; created_at: string }[]).map((e) => ({
      status: e.status,
      at: e.created_at,
    }))
  } catch {
    return []
  }
}

/**
 * O meio do pagamento registrado à mão pela loja, de um pedido da própria cliente. Só o
 * MEIO: a RPC `customer_manual_payment` devolve uma coluna, do registro vivo. Zero linhas é "sem
 * registro"; uma linha com `method` nulo é o registro sem meio informado ("Combinado com a loja").
 *
 * Falha vira `null`, como os eventos: sem ela, "Pagamento e entrega" mostra o meio do pedido, e só.
 */
async function lerMeioInformado(orderId: string): Promise<ManualPaymentForCustomer | null> {
  try {
    const { data, error } = await supabase.rpc('customer_manual_payment', { p_order_id: orderId })
    if (error || !Array.isArray(data) || data.length === 0) return null
    const method = (data[0] as { method?: unknown } | null)?.method
    return { method: typeof method === 'string' ? method : null }
  } catch {
    return null
  }
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
        // `LIN-04`: os eventos vêm na própria resposta, no mesmo formato da RPC.
        if (pedido) return { ...pedido, status_events: pedido.status_events ?? [] }
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
      if (!data) return null
      const pedido = data as unknown as OrderDetail
      // Só um pedido pago pode ter registro manual (o registro grava `paid_at`): o não pago não
      // pergunta, e a leitura dele continua com uma RPC só.
      const [status_events, manual_payment] = await Promise.all([
        lerEventos(id!),
        pedido.paid_at ? lerMeioInformado(id!) : Promise.resolve(undefined),
      ])
      return manual_payment === undefined
        ? { ...pedido, status_events }
        : { ...pedido, status_events, manual_payment }
    },
    enabled: !!id,
  })

