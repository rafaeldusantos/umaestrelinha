// Submissão externa do CardPayment Brick (PGM-06).
//
// Por que existe: `customization.visual.hidePaymentButton: true` — na doc oficial do SDK —
// "hides the payment button **and disables the onSubmit callback**". Com o botão próprio do Brick
// escondido (PGM-05), `onSubmit` nunca dispara e o único caminho de submissão passa a ser o
// controller global: `window.cardPaymentBrickController.getFormData()`.
import type { CardPaymentFormData } from '@estrelinha/supabase/types'

declare global {
  interface Window {
    cardPaymentBrickController?: {
      unmount: () => void
      getFormData?: () => Promise<CardPaymentFormData | null>
    }
  }
}

/**
 * Tokeniza o cartão e devolve o `formData`, ou `null` quando o formulário não está válido.
 *
 * ⚠️ A doc **não define** o que `getFormData()` faz com formulário inválido. Por isso as duas
 * formas de falha são tratadas: promise rejeitada **e** retorno sem `token`. `null` significa
 * sempre a mesma coisa para quem chama — não crie pedido, não cobre; o Brick já pintou os erros
 * de campo dele (PGM-06).
 */
export async function getCardFormData(): Promise<CardPaymentFormData | null> {
  const controller = window.cardPaymentBrickController
  if (!controller?.getFormData) return null

  try {
    const data = await controller.getFormData()
    return data?.token ? (data as CardPaymentFormData) : null
  } catch {
    return null
  }
}

/**
 * Quantos dígitos o Brick precisa ter lido para o número contar como reconhecido. O BIN tem 6
 * (ou 8) dígitos; menos que isso não identifica bandeira nenhuma.
 */
const BIN_MIN_DIGITS = 6

/** O sinal que `isPaymentComplete` lê no cartão (`CardFormSignal`, em `core`). */
export const binRecognized = (bin: string | null | undefined): boolean =>
  (bin ?? '').replace(/\D/g, '').length >= BIN_MIN_DIGITS
