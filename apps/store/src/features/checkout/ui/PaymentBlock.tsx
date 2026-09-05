// Bloco 3 do acordeão one-page: método, documento do pagador e a superfície de pagamento.
//
// PGD-01: campo "CPF ou CNPJ do pagador" obrigatório, com máscara e a justificativa ao lado.
// PGD-02/DOC-02: documento fora de 11 (CPF) ou 14 (CNPJ) dígitos válidos exibe erro e mantém o
//                bloco incompleto.
// PGD-06: documento pré-preenchido de `customers.cpf`.
//
// PGM-03/PGM-04: **cada método abre só o que ele precisa** — PIX pede o documento aqui; cartão
// monta o Brick na hora, antes de existir pedido, e não repete o campo (o documento do cartão sai
// do próprio Brick, DOC-05).
//
// CHK-03 (metade que o domínio puro não conhece — ver carry-forward #5): o método guardado no
// rascunho é sempre um método **habilitado nas settings**. Este bloco é o dono desse invariante:
// cai para o outro método quando o ativo é desabilitado (comportamento herdado de
// `PaymentStep.tsx:31-35`) e zera para `null` quando nenhum está habilitado — aí
// `isPaymentComplete` fica falso e o CTA não habilita.
//
// Nenhum `bg-estrelinha-primary`: a única pílula geleia da tela é o CTA (CHK-04).
import { useEffect, useRef, useMemo } from 'react'
import { Check, CreditCard, Info } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { documentLabel, isValidDocument, maskDocument } from '@estrelinha/core/validators'
import { formatPrice } from '@estrelinha/core/formatters'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useAuthContext } from '@estrelinha/auth'
import { PixIcon } from '@estrelinha/ui/icons'
import { useCheckoutStore } from '../model/checkoutStore'
import { resolveInstallments } from '@estrelinha/core/payment/installments'
import CardPaymentBrick from './CardPaymentBrick'
import PixPayment from './PixPayment'

interface Props {
  open: boolean
  complete: boolean
  onEdit: () => void
  /**
   * Pedido `pending` em curso. **Só o PIX** troca o bloco pela superfície do pedido: no cartão o
   * Brick precisa continuar montado depois da criação, senão o formulário preenchido e o token se
   * perdem — e com eles a retentativa de recusa (PGM-08).
   */
  orderId: string | null
  /**
   * Total a pagar do método selecionado (o rótulo do CTA mostra o mesmo número). Só uma das
   * duas superfícies monta por vez, então serve tanto ao Brick de cartão quanto ao valor em
   * destaque do PIX (CNF-01).
   */
  amount: number
  onApproved: () => void
  /** PGM-06: erro da última tentativa de cartão. Quem tenta é o CTA da página, não este bloco. */
  cardError?: string | null
}

export const CPF_JUSTIFICATION =
  'Exigido pelo banco para emitir o pagamento. Fica salvo só na sua conta.'
/**
 * BUG-20260728-bloco-vazio-parece-preenchido: o que o bloco colapsado diz antes de haver método
 * e CPF. Antes montava `PIX · CPF`, exibindo o rótulo do campo no lugar do valor.
 */
export const PAYMENT_EMPTY_SUMMARY = 'Escolha como pagar'

/** DOC-02: um campo, dois documentos — a mensagem tem de nomear os dois, senão acusa o certo. */
export const DOC_ERROR_MESSAGE = 'CPF ou CNPJ inválido — confira os números.'
export const DOC_FIELD_LABEL = 'CPF ou CNPJ do pagador'
export const NO_METHOD_MESSAGE =
  'Nenhum método de pagamento disponível no momento. Fale com a gente pelo WhatsApp.'

const PaymentBlock = ({
  open,
  complete,
  onEdit,
  orderId,
  amount,
  onApproved,
  cardError = null,
}: Props) => {
  const { customer } = useAuthContext()
  const { pix_enabled, pix_discount_percent, card_enabled, max_installments, min_installment_value } =
    usePaymentSettings()
  const payment = useCheckoutStore((s) => s.payment)
  const setPayment = useCheckoutStore((s) => s.setPayment)
  /** PGM-05: é este e-mail que apaga o campo de e-mail do Brick — ele já foi pedido no bloco 1. */
  const contactEmail = useCheckoutStore((s) => s.contact.email)

  const installments = useMemo(
    () => resolveInstallments(amount, max_installments, min_installment_value),
    [amount, max_installments, min_installment_value],
  )

  // PGD-06: semeia o documento salvo uma única vez — o que a cliente digitar depois vence.
  // `maskDocument` e não `maskCpf`: `customers.cpf` guarda 11 **ou** 14 dígitos desde DOC-04.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !customer?.cpf) return
    seeded.current = true
    if (useCheckoutStore.getState().payment.cpf) return
    setPayment({ cpf: maskDocument(customer.cpf) })
  }, [customer?.cpf, setPayment])

  // CHK-03: o método guardado é sempre um habilitado (ou `null` quando não há nenhum).
  useEffect(() => {
    const method = useCheckoutStore.getState().payment.method
    if (!pix_enabled && !card_enabled) {
      if (method !== null) setPayment({ method: null })
      return
    }
    if (method === null) {
      setPayment({ method: pix_enabled ? 'pix' : 'card' })
      return
    }
    if (method === 'pix' && !pix_enabled) setPayment({ method: 'card' })
    else if (method === 'card' && !card_enabled) setPayment({ method: 'pix' })
  }, [payment.method, pix_enabled, card_enabled, setPayment])

  const documentInvalid = payment.cpf.length > 0 && !isValidDocument(payment.cpf)
  /**
   * BUG-20260728-bloco-vazio-parece-preenchido: só se escreve o que existe. O cartão não guarda
   * documento no rascunho (ele vem do Brick, DOC-05), então a linha dele não monta `· CPF …`.
   */
  const collapsedSummary = !complete
    ? PAYMENT_EMPTY_SUMMARY
    : payment.method === 'card'
      ? 'Cartão de crédito'
      : `PIX · ${documentLabel(payment.cpf)} ${payment.cpf}`

  const header = (
    <header className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-ink">
        {complete && !open ? (
          <Check className="h-4 w-4 text-white" aria-label="Pagamento preenchido" />
        ) : (
          <span className="font-heading text-base font-semibold text-white">3</span>
        )}
      </span>
      <div className="flex grow flex-col gap-[2px]">
        <h2 className="font-heading text-[21px] font-semibold tracking-[-0.02em] text-estrelinha-ink">
          Pagamento
        </h2>
        <p className="text-[13px] text-estrelinha-ink-soft">
          Processado pelo Mercado Pago — seus dados não passam pela loja
        </p>
      </div>
    </header>
  )

  // PGM-07: no PIX o pedido criado troca o bloco pelo QR, aberto ou colapsado — é o fluxo de
  // hoje. No cartão **não**: desmontar o Brick aqui apagaria o formulário já preenchido e o
  // token, e não haveria como retentar uma recusa (PGM-08).
  if (orderId && payment.method !== 'card') {
    return (
      <section
        aria-label="Pagamento"
        className="flex flex-col gap-5 rounded-lg border border-estrelinha-line bg-white p-4"
      >
        {header}
        <PixPayment orderId={orderId} amount={amount} onApproved={onApproved} />
      </section>
    )
  }

  if (!open) {
    return (
      <section
        aria-label="Pagamento"
        className="flex items-center gap-3 rounded-lg border border-estrelinha-line bg-white px-4 py-[22px]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-ink">
          {complete ? (
            <Check className="h-4 w-4 text-white" aria-label="Pagamento preenchido" />
          ) : (
            <span className="font-heading text-base font-semibold text-white">3</span>
          )}
        </span>
        <div className="flex min-w-0 grow flex-col gap-[3px]">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-estrelinha-ink-soft">
            Pagamento
          </span>
          <span
            className={`truncate text-[15px] font-semibold ${
              complete ? 'text-estrelinha-ink' : 'text-estrelinha-ink-soft'
            }`}
          >
            {collapsedSummary}
          </span>
        </div>
        {/* BUG-20260728-alterar-alvo-de-toque-28px: 44px de alvo, aparência de link mantida. */}
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-estrelinha-primary hover:underline"
        >
          {complete ? 'Alterar' : 'Preencher'}
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label="Pagamento"
      className="flex flex-col gap-5 rounded-lg border border-estrelinha-line bg-white p-4"
    >
      {header}

      {/* PGM-01: `basis-0 grow` (e não `grow` com basis automático) é o que dá aos dois cards a
          mesma largura — com basis `auto` o rótulo mais longo ("Cartão de crédito") empurrava o
          card dele e os dois deixavam de ler como "escolha um dos dois". Altura vem do `stretch`
          padrão do flex; empilhados no mobile, os dois ocupam 100%. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {pix_enabled && (
          <button
            type="button"
            aria-pressed={payment.method === 'pix'}
            onClick={() => setPayment({ method: 'pix' })}
            className={`flex basis-0 grow flex-col gap-2 rounded-md border-2 p-[18px] text-left transition-colors ${
              payment.method === 'pix'
                ? 'border-estrelinha-primary bg-estrelinha-ground-deep'
                : 'border-estrelinha-line bg-white'
            }`}
          >
            <span className="flex w-full items-center gap-[10px]">
              <PixIcon className="h-5 w-5 shrink-0 text-estrelinha-primary" aria-hidden />
              <span className="grow font-heading text-[17px] font-semibold text-estrelinha-ink">
                PIX
              </span>
              {pix_discount_percent > 0 && (
                <span className="shrink-0 rounded-pill border border-estrelinha-primary px-[11px] py-[5px] text-xs font-bold tracking-[0.04em] text-estrelinha-primary">
                  −{pix_discount_percent}%
                </span>
              )}
            </span>
            <span className="text-[13px] leading-[19px] text-estrelinha-ink-soft">
              Aprovação na hora, direto do app do seu banco
            </span>
          </button>
        )}

        {card_enabled && (
          <button
            type="button"
            aria-pressed={payment.method === 'card'}
            onClick={() => setPayment({ method: 'card' })}
            className={`flex basis-0 grow flex-col gap-2 rounded-md border-2 p-[18px] text-left transition-colors ${
              payment.method === 'card'
                ? 'border-estrelinha-primary bg-estrelinha-ground-deep'
                : 'border-estrelinha-line bg-white'
            }`}
          >
            <span className="flex w-full items-center gap-[10px]">
              <CreditCard className="h-5 w-5 shrink-0 text-estrelinha-ink-soft" aria-hidden />
              <span className="grow font-heading text-[17px] font-semibold text-estrelinha-ink">
                Cartão de crédito
              </span>
            </span>
            <span className="text-[13px] leading-[19px] text-estrelinha-ink-soft">
              {installments
                ? `Até ${installments.count}x de ${formatPrice(installments.value)} sem juros`
                : `Até ${max_installments}x sem juros`}
            </span>
          </button>
        )}
      </div>

      {!pix_enabled && !card_enabled && (
        <p role="alert" className="py-4 text-center text-sm text-estrelinha-ink-soft">
          {NO_METHOD_MESSAGE}
        </p>
      )}

      {/* PGM-03: o documento é do caminho PIX. No cartão ele viria do Brick (DOC-05) e pedi-lo
          aqui repetiria o campo — a mesma duplicação de e-mail que esta feature veio apagar. */}
      {payment.method === 'pix' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-[7px] sm:w-[230px] sm:shrink-0">
              <Label htmlFor="payment-cpf" className="text-[13px] font-semibold text-estrelinha-ink">
                {DOC_FIELD_LABEL}
              </Label>
              <Input
                id="payment-cpf"
                required
                inputMode="numeric"
                // 18 = comprimento de `00.000.000/0000-00`. Travar em 14 (o do CPF) impediria o
                // 12º dígito de entrar, e a máscara nunca chegaria a virar CNPJ (DOC-01).
                maxLength={18}
                aria-invalid={documentInvalid}
                value={payment.cpf}
                onChange={(e) => setPayment({ cpf: maskDocument(e.target.value) })}
                placeholder="000.000.000-00"
                className="border-estrelinha-field"
              />
            </div>
            <p className="flex items-center gap-2 pb-[2px] text-[13px] text-estrelinha-ink-soft sm:pb-[15px]">
              <Info className="h-4 w-4 shrink-0" aria-hidden />
              {CPF_JUSTIFICATION}
            </p>
          </div>

          {documentInvalid && (
            <p role="alert" className="text-[13px] font-medium text-estrelinha-primary">
              {DOC_ERROR_MESSAGE}
            </p>
          )}
        </>
      )}

      {/* PGM-04: o formulário de cartão aparece na hora em que o método é escolhido — antes de
          existir pedido. Era esperar o pedido que criava o "segundo checkout dentro do primeiro". */}
      {payment.method === 'card' && (
        <CardPaymentBrick
          amount={amount}
          payerEmail={contactEmail}
          payerDocument={customer?.cpf ?? undefined}
          errorMessage={cardError}
        />
      )}
    </section>
  )
}

export default PaymentBlock
