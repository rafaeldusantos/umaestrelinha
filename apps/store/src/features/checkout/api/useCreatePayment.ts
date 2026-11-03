import { useMutation } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { accessFor } from '@/entities/order/model/orderAccess'
import type { CardPaymentFormData, CreatePaymentResponse } from '@estrelinha/supabase/types'

export interface CreatePaymentInput {
  order_id: string
  method: 'pix' | 'card'
  card?: CardPaymentFormData
}

export const PAYMENT_UNAVAILABLE_MESSAGE =
  'Não foi possível iniciar o pagamento. Tente novamente.'

/**
 * BUG-20260728-edge-runtime-sem-dns: `fetch` não tem timeout por padrão. Com o worker da edge
 * function fora do ar, o Kong manteve a conexão aberta e `functions.invoke` **nunca resolveu** —
 * a tela ficou em "Gerando código PIX..." para sempre, com o pedido já `pending`. O tratamento de
 * erro da máquina do PIX estava correto; ele simplesmente nunca era alcançado.
 *
 * 15s é folgado para o ida-e-volta ao Mercado Pago e curto o bastante para não parecer travado.
 * `AbortController` + `setTimeout` explícitos em vez de `AbortSignal.timeout()` porque os fake
 * timers do teste controlam o primeiro e não o segundo.
 */
export const PAYMENT_TIMEOUT_MS = 15_000
export const PAYMENT_TIMEOUT_MESSAGE =
  'O pagamento demorou demais para responder. Seu pedido está guardado — tente de novo.'

/** O código do 422 de quando o desconto do Compre Junto mudou entre o pedido e o pagamento. */
export const PRICE_CHANGED_CODE = 'buy_together_price_changed'
/** O mesmo 422 quando quem caiu foi outro desconto por item (a promoção ou a oferta do checkout). */
export const DISCOUNT_CHANGED_CODE = 'promotion_no_longer_valid'

/** Qual desconto caiu: o do Compre Junto, ou outro (a frase não diz "Compre Junto" à toa). */
export type PriceChangedReason = 'buy_together' | 'discount'

/**
 * O pagamento foi recusado ANTES de cobrar, porque recalculado o pedido sairia mais
 * caro do que a tela mostrou — um desconto por item caiu (o do Compre Junto, a promoção ou a oferta
 * do checkout). Carrega o que as duas telas de "o valor mudou" mostram: o total de antes, o de agora
 * e a peça cujo preço subiu (`null` quando o servidor não soube dizer). Repagar o mesmo pedido daria o
 * mesmo 422: quem recebe este erro cria um pedido novo com o total novo.
 */
export class PriceChangedError extends Error {
  readonly displayedTotal: number
  readonly total: number
  readonly piece: string | null
  readonly reason: PriceChangedReason
  constructor(
    message: string,
    displayedTotal: number,
    total: number,
    piece: string | null,
    reason: PriceChangedReason,
  ) {
    super(message)
    this.name = 'PriceChangedError'
    this.displayedTotal = displayedTotal
    this.total = total
    this.piece = piece
    this.reason = reason
  }
}

// Erros da edge function chegam como FunctionsHttpError com `context: Response`. O corpo só se lê
// uma vez: a mensagem e o código saem da MESMA leitura.
async function extractError(error: unknown): Promise<Error> {
  try {
    const context = (error as { context?: Response })?.context
    const body = await context?.json()
    const message = typeof body?.error === 'string' && body.error ? body.error : PAYMENT_UNAVAILABLE_MESSAGE
    if (body?.code === PRICE_CHANGED_CODE || body?.code === DISCOUNT_CHANGED_CODE) {
      return new PriceChangedError(
        message,
        Number(body.displayed_total),
        Number(body.total),
        typeof body.piece === 'string' && body.piece ? body.piece : null,
        body.code === PRICE_CHANGED_CODE ? 'buy_together' : 'discount',
      )
    }
    return new Error(message)
  } catch {
    // body ilegível → fallback
  }
  return new Error(PAYMENT_UNAVAILABLE_MESSAGE)
}

/**
 * Cria um pagamento (PIX ou cartão) via edge function `mercado-pago`.
 * PAY-06: `idempotency_key` é um UUID NOVO por tentativa — retry de rede não
 * duplica cobrança; nova tentativa deliberada gera nova chave.
 */
export const useCreatePayment = () =>
  useMutation<CreatePaymentResponse, Error, CreatePaymentInput>({
    mutationFn: async (input) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT_MS)
      try {
        const { data, error } = await supabase.functions.invoke(
          'mercado-pago?action=create-payment',
          {
            body: {
              order_id: input.order_id,
              method: input.method,
              idempotency_key: crypto.randomUUID(),
              ...(input.card ? { card: input.card } : {}),
              // `PED-06` (feature `49`): a segunda prova de posse. Quem comprou sem conta não tem
              // JWT nenhum — sem isto o `create-payment` responde **403** e a convidada não paga.
              //
              // Lido de `orderAccess` na hora do envio, e não passado por prop: quem tem sessão
              // simplesmente não tem token guardado para aquele pedido, e a chave nem entra no
              // corpo. Um parâmetro obrigatório faria toda tela que cobra ter de saber disso.
              ...(accessFor(input.order_id)
                ? { access_token: accessFor(input.order_id) }
                : {}),
            },
            signal: controller.signal,
          },
        )
        if (error || !data) throw await extractError(error)
        return data as CreatePaymentResponse
      } catch (err) {
        // O abort vence: um erro genérico de rede causado pelo próprio abort não deve
        // se disfarçar de falha do Mercado Pago.
        if (controller.signal.aborted) throw new Error(PAYMENT_TIMEOUT_MESSAGE)
        throw err instanceof Error ? err : new Error(PAYMENT_UNAVAILABLE_MESSAGE)
      } finally {
        clearTimeout(timer)
      }
    },
  })
