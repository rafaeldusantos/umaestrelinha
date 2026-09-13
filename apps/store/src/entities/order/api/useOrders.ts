import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { PaymentStatus } from '@estrelinha/supabase/types'

export interface OrderItem {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  finish: string | null
  quantity: number
  unit_price: number
  /** Feature 22 — snapshot do que a linha exigiu e do que vai gravado (`MAT-05`). */
  requires_material?: boolean | null
  material_kinds?: string[] | null
  engraving_text?: string | null
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_id?: string | null
  status: string
  payment_method: string
  payment_status: PaymentStatus
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  /** Snapshot do envio escolhido (SHP-07/SHP-08) — não recotar depois de criado. */
  shipping_service_id?: string | null
  delivery_estimate_min?: string | null
  delivery_estimate_max?: string | null
  created_at: string
  order_items: OrderItem[]
}

export const useOrdersByEmail = (email: string) =>
  useQuery({
    queryKey: ['orders', 'email', email],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data as unknown as Order[]
    },
    enabled: !!email,
  })

export const useOrdersByCustomerId = (customerId: string | undefined) =>
  useQuery({
    queryKey: ['orders', 'customer', customerId],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data as unknown as Order[]
    },
    enabled: !!customerId,
  })

export interface CreateOrderInput {
  customer_name: string
  customer_email: string
  customer_id?: string | null
  /**
   * `CSC-04` (feature `49`). As colunas existem desde a `35`, e **até aqui só o importador da
   * Nuvemshop as preenchia** — pedido feito na loja nascia sem telefone e sem documento.
   *
   * As duas passam a ser gravadas para convidada **e** para quem tem sessão. `customer_document`
   * não é decoração: é dele que `create-payment` tira o pagador quando o pedido ficou **órfão**
   * (`CSC-08`), e sem ele um pedido pagável seria recusado por falta de CPF que a cliente já deu.
   */
  customer_phone?: string
  customer_document?: string
  payment_method: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  /** ADR-05: sem isto `orders.address_zip` fica nulo e o backoffice estoura em `MelhorEnvioTab`. */
  address_zip?: string
  address_complement?: string
  /** SHP-07: snapshot da opção de envio escolhida — recotação posterior não o altera. */
  shipping_service_id?: string
  shipping_carrier?: string
  shipping_method?: string
  /** SHP-08: janela de entrega estimada, em `date` (`YYYY-MM-DD`). */
  delivery_estimate_min?: string
  delivery_estimate_max?: string
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  coupon_code?: string
  coupon_id?: string
  /**
   * PRM-12: a campanha que a loja EXIBIU, quando foi exatamente uma. `null`/ausente quando nenhuma
   * aplicou ou quando duas aplicaram — `orders.promotion_id` é FK única e não sabe dizer "duas".
   * Mesma regra do `create-payment`, de propósito: dois lados discordando sobre qual campanha foi
   * fariam o relatório do admin mentir.
   */
  promotion_id?: string | null
  /**
   * PRM-12: o desconto das faixas que a loja exibiu. É o **teto** da guarda do `create-payment`:
   * sem gravá-lo, `pricing.promotionDiscount < order.promotion_discount` nunca é verdade e a guarda
   * existe morta. Nunca é o valor cobrado — esse é sempre o recálculo do servidor (`PAY-03`).
   */
  promotion_discount?: number
  items: {
    product_id: string
    product_name: string
    product_image: string | null
    /** @deprecated Eixo fixo do modelo antigo. Pedidos novos preenchem `variant_label`. */
    size: string | null
    /** @deprecated Eixo fixo do modelo antigo. Pedidos novos preenchem `variant_label`. */
    finish: string | null
    quantity: number
    unit_price: number
    /** `null` = produto sem grade, precificado por `base_price` (07/T16, PST-03). */
    variant_id?: string | null
    /** Congela o caminho de preço NO PEDIDO — o servidor obedece, não reavalia (A8). */
    price_source?: 'base' | 'variant'
    /** Snapshot legível: `4,5 cm · Fosco`. O histórico não depende de join. */
    variant_label?: string | null
    variant_options?: Record<string, string> | null
    /**
     * Feature 22 — o que esta linha exigiu e o que vai gravado, **congelados no pedido**.
     *
     * Redundante em relação a `products` de propósito: mudar a exigência no cadastro **não** pode
     * alterar pedido já criado (`MAT-05`), e ler do produto na hora da consulta faria o pedido de
     * ontem mudar de conteúdo hoje. Mesma regra de `variant_label`.
     */
    requires_material?: boolean
    material_kinds?: string[]
    engraving_text?: string | null
  }[]
  /**
   * `MAT-07`: o pedido nasce na fila ou fora dela, derivado dos itens por `initialMaterialStatus`.
   *
   * Daqui em diante o estado **só muda por RPC guardada** (`set_material_status`,
   * `set_material_tracking`) — `orders` não tem policy de `UPDATE` para cliente (PAY-10).
   */
  material_status?: string
}

/** O 409 que o servidor devolve quando o e-mail já tem conta e não há sessão (`IDN-08`). */
export const NEEDS_OTP = 'needs_otp'

export interface CreateOrderResult {
  id: string
  /** `PED-05`: a prova de posse da convidada. `null` para quem tem sessão — o JWT já é a prova. */
  access_token: string | null
}

/**
 * O erro que a tela precisa distinguir dos demais: e-mail com conta, sem sessão.
 *
 * Uma `Error` comum viraria o toast genérico de "não conseguimos criar seu pedido", e a cliente
 * ficaria sem saber que basta digitar o código que já está na caixa de entrada dela.
 */
export class NeedsOtpError extends Error {
  readonly reason = NEEDS_OTP
}

/**
 * Cria o pedido — **pela edge function `checkout`, nunca pelo PostgREST** (feature `49`, `PED-01`).
 *
 * O caminho antigo montava a linha de `orders` aqui e inseria direto, escopado por RLS. Ele não
 * servia à convidada (não há `auth.uid()` para escopar) e, mantido ao lado do novo, seria um
 * segundo dono de "como nasce um pedido" — duas cópias divergindo no caminho do dinheiro, sem que
 * build, `tsc` ou teste de componente acusassem. `pedidoComDonoUnico.test.ts` recusa a volta.
 *
 * O `Authorization` **não é montado à mão**: `functions.invoke` já anexa o token da sessão quando
 * existe. Montá-lo aqui abriria a possibilidade de a loja mandar um e o client outro.
 */
export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: CreateOrderInput & { client_request_id: string },
    ): Promise<CreateOrderResult> => {
      const { data, error } = await supabase.functions.invoke('checkout?action=create-order', {
        body: input,
      })

      // `functions.invoke` não lança em 4xx: ele devolve `error` com o corpo dentro do contexto.
      // Ler só `error.message` perderia o `reason`, e a tela não saberia abrir o desafio.
      const corpo = (data ?? (await lerCorpoDoErro(error))) as {
        order_id?: string
        access_token?: string | null
        reason?: string
        error?: string
      } | null

      if (corpo?.reason === NEEDS_OTP) throw new NeedsOtpError(corpo.error ?? '')
      if (error || !corpo?.order_id) {
        throw new Error(corpo?.error || error?.message || 'Erro ao criar pedido')
      }

      return { id: corpo.order_id, access_token: corpo.access_token ?? null }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/**
 * O corpo de um erro do `functions.invoke`.
 *
 * O SDK embrulha a resposta num `FunctionsHttpError` cujo `context` é a `Response` original — é o
 * único lugar onde o `reason: 'needs_otp'` sobrevive. Sem isto, um 409 chegaria à tela como
 * "Edge Function returned a non-2xx status code" e o desafio nunca abriria.
 */
async function lerCorpoDoErro(error: unknown): Promise<unknown> {
  const contexto = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (!contexto?.json) return null
  try {
    return await contexto.json()
  } catch {
    return null
  }
}
