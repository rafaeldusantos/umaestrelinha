import { useMutation } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type { CardPaymentFormData, CreatePaymentResponse } from '@nanapin/supabase/types'

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
 * erro de `PixPayment` estava correto; ele simplesmente nunca era alcançado.
 *
 * 15s é folgado para o ida-e-volta ao Mercado Pago e curto o bastante para não parecer travado.
 * `AbortController` + `setTimeout` explícitos em vez de `AbortSignal.timeout()` porque os fake
 * timers do teste controlam o primeiro e não o segundo.
 */
export const PAYMENT_TIMEOUT_MS = 15_000
export const PAYMENT_TIMEOUT_MESSAGE =
  'O pagamento demorou demais para responder. Seu pedido está guardado — tente de novo.'

// Erros da edge function chegam como FunctionsHttpError com `context: Response`.
async function extractErrorMessage(error: unknown): Promise<string> {
  try {
    const context = (error as { context?: Response })?.context
    const body = await context?.json()
    if (typeof body?.error === 'string' && body.error) return body.error
  } catch {
    // body ilegível → fallback
  }
  return PAYMENT_UNAVAILABLE_MESSAGE
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
            },
            signal: controller.signal,
          },
        )
        if (error || !data) throw new Error(await extractErrorMessage(error))
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
