// API de Orders do Mercado Pago — domínio puro (roda em Node, Deno e browser; sem imports de I/O).
// 09-checkout-orders-api: montagem do corpo de POST /v1/orders e leitura da resposta.
// Import com extensão .ts porque a edge function Deno importa este módulo por caminho relativo
// (mesmo motivo documentado em payer.ts:4).
import type { Payer } from './payer.ts'
import { mapMpStatus, type PaymentStatus } from './status.ts'

/**
 * Fonte única da janela de expiração. O número mora aqui e a duração ISO-8601 é derivada dele, para
 * que `expiration_time` (o que vai no corpo) e `pixExpiresAt` (o que a tela conta) nunca divirjam.
 */
const ORDER_EXPIRATION_MINUTES = 30

/** ORD-01: duração ISO-8601, não timestamp. Substitui o antigo `pixExpirationISO`. */
export const ORDER_EXPIRATION = `PT${ORDER_EXPIRATION_MINUTES}M`

/** Texto que aparece na fatura do cartão. Constante da loja — por isso mora no domínio. */
export const STATEMENT_DESCRIPTOR = 'UMA ESTRELINHA'

export interface OrderCardMethod {
  id: string
  type: 'credit_card'
  token: string
  installments: number
  statement_descriptor: string
}

export interface OrderPixMethod {
  id: 'pix'
  type: 'bank_transfer'
}

export interface OrderPayload {
  type: 'online'
  processing_mode: 'automatic'
  external_reference: string
  total_amount: string
  expiration_time: string
  payer: Record<string, unknown>
  transactions: {
    payments: Array<{
      amount: string
      payment_method: OrderCardMethod | OrderPixMethod
    }>
  }
}

interface BaseInput {
  orderId: string
  total: number
  payer: Payer | Record<string, unknown>
}

/**
 * União discriminada de propósito: `card` só existe quando `method === 'card'`, então a função não
 * precisa de guard em runtime para um cenário que o tipo já impede.
 */
export type BuildOrderPayloadInput =
  | (BaseInput & { method: 'pix' })
  | (BaseInput & {
      method: 'card'
      card: { token: string; payment_method_id: string; installments: number }
    })

/**
 * ORD-02: o MP recusa número neste campo — `total_amount` e `amount` são string com 2 casas.
 * Só serializa: quem arredonda é `calculateOrderTotals` (`pricing.ts`), dono único da regra.
 */
export function formatAmount(value: number): string {
  return value.toFixed(2)
}

/** Resposta do MP — só o que a loja consome. Campos desconhecidos são ignorados de propósito. */
export interface MpOrder {
  id?: string
  status?: string
  status_detail?: string | null
  transactions?: {
    payments?: Array<{
      id?: string
      status?: string
      status_detail?: string | null
      payment_method?: {
        qr_code?: string
        qr_code_base64?: string
        ticket_url?: string
      }
    }>
  }
}

const firstPayment = (order: MpOrder) => order.transactions?.payments?.[0]

export interface PixData {
  qr_code: string
  qr_code_base64: string | null
}

/**
 * ORD-06: contrato de resposta da loja preservado. Ausência de QR devolve o mesmo shape vazio que
 * a tela já sabe tratar — nunca lança, porque um throw aqui viraria 500 no lugar do estado de erro.
 *
 * `expires_at` NÃO sai daqui: o MP ecoa a duração enviada em vez de resolvê-la (D5), então quem
 * responde por esse campo é `pixExpiresAt`.
 */
export function extractPixData(order: MpOrder): PixData {
  const method = firstPayment(order)?.payment_method
  return {
    qr_code: method?.qr_code ?? '',
    qr_code_base64: method?.qr_code_base64 ?? null,
  }
}

/**
 * D5 — `expires_at` do PIX é CALCULADO, não lido da resposta do MP.
 *
 * Medido no T16: o MP **ecoa** `expiration_time: "PT30M"` na order em vez de resolver a duração.
 * `new Date("PT30M")` é `Invalid Date`, então o cronômetro do PIX na tela recebia `NaN`.
 *
 * O relógio entra por parâmetro para o módulo seguir puro (sem `Date.now()` escondido) e testável.
 *
 * ⚠️ Metade que fica ABERTA (registrada em validation.md): a expiração real do lado do MP saiu em
 * **+24h** (`transactions.payments[0].date_of_expiration`) — o `expiration_time: "PT30M"` da raiz
 * não foi aplicado —, então ONDE o campo realmente vale para PIX segue indefinido, pendente de
 * consulta à doc. Consequência aceita: a tela conta 30 min enquanto o código segue pagável por mais
 * tempo. É a direção segura — ninguém paga um código que a tela dizia válido.
 */
export function pixExpiresAt(now: Date): string {
  return new Date(now.getTime() + ORDER_EXPIRATION_MINUTES * 60_000).toISOString()
}

/** PER-02: id do payment interno (`PAY01K…`), que é o que vai para `orders.mp_payment_id`. */
export function extractPaymentId(order: MpOrder): string | null {
  return firstPayment(order)?.id ?? null
}

/** `status_detail` do PIX aguardando transferência — o único `action_required` esperado (STA-02). */
export const WAITING_TRANSFER = 'waiting_transfer'

export interface CardOutcome {
  status: PaymentStatus | null
  statusDetail: string | null
}

/**
 * STA-03: desfecho de uma order de **cartão**.
 *
 * `action_required` significa "falta uma ação do pagador". No PIX isso é o esperado (aguardando a
 * transferência). No cartão significa desafio — 3DS —, e a loja não tem tela para apresentá-lo:
 * mapear para `pending` deixaria a cliente presa num pedido que só resolve quando o expirador de
 * 24h passa. Recusar é mais honesto, e a transição `rejected → pending|approved` mantém a
 * retentativa aberta, inclusive por PIX (AD-003).
 *
 * `statusDetail` é devolvido cru: se o vocabulário do MP mudar, `friendlyMessage` cai no fallback
 * genérico em vez de quebrar.
 *
 * D6: o detalhe preferido é o do **payment**, não o da raiz. Medido no T16: numa recusa a raiz traz
 * o genérico `"failed"` e o acionável (`rejected_by_issuer`) só existe em
 * `transactions.payments[0].status_detail`. A raiz continua sendo o fallback.
 */
export function resolveCardOutcome(order: MpOrder): CardOutcome {
  const statusDetail = firstPayment(order)?.status_detail ?? order.status_detail ?? null

  if (order.status === 'action_required' && statusDetail !== WAITING_TRANSFER) {
    return { status: 'rejected', statusDetail }
  }

  return { status: mapMpStatus(order.status ?? ''), statusDetail }
}

/** Monta o corpo de `POST /v1/orders` (ORD-01…ORD-04). `payer` vai na raiz da order (PGD-04). */
export function buildOrderPayload(input: BuildOrderPayloadInput): OrderPayload {
  const amount = formatAmount(input.total)

  const payment_method: OrderCardMethod | OrderPixMethod =
    input.method === 'card'
      ? {
          id: input.card.payment_method_id,
          type: 'credit_card',
          token: input.card.token,
          installments: input.card.installments,
          // Vive DENTRO de payment_method no Orders — na Payments API ficava na raiz do payload.
          // Só no cartão: é o texto da fatura, sem sentido para bank_transfer (PIX).
          statement_descriptor: STATEMENT_DESCRIPTOR,
        }
      : { id: 'pix', type: 'bank_transfer' }

  return {
    type: 'online',
    processing_mode: 'automatic',
    external_reference: input.orderId,
    total_amount: amount,
    expiration_time: ORDER_EXPIRATION,
    payer: input.payer as Record<string, unknown>,
    transactions: { payments: [{ amount, payment_method }] },
  }
}
