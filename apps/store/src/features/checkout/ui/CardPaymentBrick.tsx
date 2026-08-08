import { useMemo, useEffect } from 'react'
import { CardPayment } from '@mercadopago/sdk-react'
import { documentLabel, stripDocument } from '@nanapin/core/validators'
import { usePaymentSettings } from '@nanapin/core/hooks/useStoreSettings'

interface Props {
  amount: number
  /**
   * PGM-05: "Brick will hide email field if this value is correctly filled" (doc do SDK). É este
   * o mecanismo — não há customização de "esconder e-mail". O valor vem do bloco Contato, onde a
   * cliente já digitou o e-mail uma vez.
   */
  payerEmail: string
  /** Prefill do documento do Brick, quando já conhecido de `customers.cpf`. Não o esconde. */
  payerDocument?: string
  /** PGM-06: erro da última tentativa. Quem tenta é o CTA da página — este componente só desenha. */
  errorMessage: string | null
}

/**
 * Superfície do CardPayment Brick do Mercado Pago (PAY-01: tokenização no browser, zero inputs
 * próprios de PAN/CVV/validade). Parcelas limitadas pelas settings (PAY-15).
 *
 * Ele **não orquestra mais o pagamento**: com `hidePaymentButton` o `onSubmit` fica desabilitado
 * e a submissão inteira passa pelo CTA único da página, via `getCardFormData()` (PGM-05, PGM-06).
 * Recusa mantém a cliente aqui, com mensagem amigável vinda por prop (PAY-02).
 */
const CardPaymentBrick = ({ amount, payerEmail, payerDocument, errorMessage }: Props) => {
  const settings = usePaymentSettings()

  useEffect(
    () => () => {
      // PGM-09: trocar de método (ou sair do bloco) libera o container do Brick.
      window.cardPaymentBrickController?.unmount()
    },
    [],
  )

  // PAY-15: max_installments limitado também pelo valor mínimo de parcela.
  const byMinValue =
    settings.min_installment_value > 0
      ? Math.floor(amount / settings.min_installment_value)
      : settings.max_installments
  const maxInstallments = Math.max(1, Math.min(settings.max_installments, byMinValue))

  // Objeto novo a cada render remontaria o Brick e apagaria o cartão já digitado.
  const initialization = useMemo(() => {
    const digits = stripDocument(payerDocument ?? '')
    return {
      amount,
      payer: {
        email: payerEmail,
        ...(digits
          ? { identification: { type: documentLabel(digits), number: digits } }
          : {}),
      },
    }
  }, [amount, payerEmail, payerDocument])

  return (
    <div className="space-y-3">
      <CardPayment
        initialization={initialization}
        customization={{
          paymentMethods: { maxInstallments },
          visual: {
            // PGM-05: sem botão próprio (o CTA da página é o único) e sem o título duplicado —
            // o bloco 3 já se chama "Pagamento".
            hidePaymentButton: true,
            hideFormTitle: true,
            // Geleia — o Brick do Mercado Pago não lê nossos tokens CSS.
            style: { customVariables: { baseColor: '#B0176B' } },
          },
        }}
        // Desabilitado por `hidePaymentButton`; a tipagem do SDK ainda o exige.
        onSubmit={async () => {}}
      />
      {/* CNF-06: recusa se distingue por superfície + geleia, não por vermelho fora da paleta. */}
      {errorMessage && (
        <p
          role="alert"
          className="text-sm text-nanita-jam bg-nanita-sugar border border-nanita-jam/30 rounded-xl p-3"
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default CardPaymentBrick
