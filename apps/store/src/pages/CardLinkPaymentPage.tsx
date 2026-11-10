// `/pagar-com-cartao#<token>` — o link de pagamento por cartão que a Adri gera no painel para um
// pedido de cartão que não foi pago (pendente, recusado ou vencido).
//
// A cliente abre sem login, vê o número, as peças e o valor — o travado na primeira cobrança —, e paga
// pelo Brick do checkout. É a SEGUNDA superfície de pagamento declarada (ao lado de
// `/pedido/:id/pagamento`, a do PIX): só cartão, e só pelo link. A espera e a aprovação são as mesmas
// `PaymentProgress`/`PaymentApproved` do checkout, por cima da página, com o Brick montado embaixo
// para a retentativa de recusa. Aprovado, a página leva ao pedido, como o checkout.
//
// Aberto com o pedido pago ou cancelado, mostra a situação e nada para pagar. Token inválido ou
// substituído por um link novo: o aviso, sem dado do pedido.
//
// O token vem do fragmento e sai da barra na primeira renderização (`takeCardLinkToken`). Fora do
// `StoreLayout` pela mesma razão de `/checkout`: header próprio, sem navegação.
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { friendlyMessage } from '@estrelinha/core/payment/status'
import { CARD_LINK_PATH } from '@estrelinha/core/routes'
import { staticPageMeta } from '@estrelinha/core/seo'
import { isValidDocument } from '@estrelinha/core/validators'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import type { CardPaymentResponse } from '@estrelinha/supabase/types'
import {
  type CardLinkOrder,
  CARD_LINK_READ_FAILED_MESSAGE,
  takeCardLinkToken,
  useCardLink,
} from '@/features/card-link'
import {
  CheckoutStoreProvider,
  useCardLinkCheckoutStore,
} from '@/features/checkout/model/checkoutStore'
import { useCardInstallmentOptions } from '@/features/checkout/model/useCardInstallmentOptions'
import { getCardFormData } from '@/features/checkout/lib/cardBrick'
import { declinedNotice, unansweredNotice, type CardNotice } from '@/features/checkout/lib/cardNotice'
import { PAYMENT_UNAVAILABLE_MESSAGE, useCreatePayment } from '@/features/checkout/api/useCreatePayment'
import CardPaymentBrick from '@/features/checkout/ui/CardPaymentBrick'
import { BATIDA_MS, PIX_SLOW_MS, PaymentApproved, PaymentProgress } from '@/features/order-payment'
import { CheckoutHeader } from '@/widgets/checkout-header'
import { whatsappHref } from '@/shared/lib/whatsapp'
import { usePageMeta } from '@/shared/lib/usePageMeta'

export const CARD_LINK_TITLE = 'Pagamento com cartão'
export const CARD_LINK_UNAVAILABLE_MESSAGE =
  'Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'
export const MISSING_DOCUMENT_MESSAGE =
  'Informe o CPF ou CNPJ do titular no formulário do cartão para continuar.'

// No celular com a fonte do sistema a 200 %, "Pagamento" em `text-3xl` passa sozinha da largura
// útil de 320 px: a escala menor fica abaixo de `sm`, e a palavra pode quebrar com hífen (o `lang`
// pt-BR vem do documento).
const TITULO =
  'font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink break-words hyphens-auto'

const WHATSAPP_MESSAGE = 'Olá! Preciso de ajuda com o pagamento do meu pedido.'

const Moldura = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-white">
    <CheckoutHeader />
    {children}
  </div>
)

const Aviso = ({ children, ajuda }: { children: ReactNode; ajuda?: string | null }) => (
  <section className="mx-auto flex max-w-[560px] flex-col items-center gap-5 px-5 py-16 text-center">
    <h1 className={TITULO}>
      {CARD_LINK_TITLE}
    </h1>
    <div className="text-[17px] leading-7 text-estrelinha-ink-soft">{children}</div>
    {ajuda && (
      <a
        href={ajuda}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-estrelinha-primary px-6 font-heading text-[16px] font-semibold text-white"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        Falar no WhatsApp
      </a>
    )}
  </section>
)

const CardLinkPaymentPage = () => {
  usePageMeta(staticPageMeta(CARD_LINK_PATH))
  const [token, setToken] = useState(() => takeCardLinkToken())
  // Um link novo aberto na MESMA aba só muda o fragmento: o navegador não recarrega.
  useEffect(() => {
    const aoMudarFragmento = () => {
      if (!window.location.hash) return
      const novo = takeCardLinkToken()
      if (novo) setToken(novo)
    }
    window.addEventListener('hashchange', aoMudarFragmento)
    return () => window.removeEventListener('hashchange', aoMudarFragmento)
  }, [])
  const query = useCardLink(token)
  const { whatsapp } = useGeneralSettings()
  const ajuda = whatsappHref(whatsapp, WHATSAPP_MESSAGE)

  if (!token) {
    return <Moldura><Aviso ajuda={ajuda}><p>{CARD_LINK_UNAVAILABLE_MESSAGE}</p></Aviso></Moldura>
  }

  if (query.isLoading) {
    return (
      <Moldura>
        <p role="status" className="container py-20 text-center text-estrelinha-ink-soft">
          Carregando o pagamento...
        </p>
      </Moldura>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Moldura>
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <p role="alert" className="text-estrelinha-ink-soft">{CARD_LINK_READ_FAILED_MESSAGE}</p>
          <Button
            type="button"
            onClick={() => void query.refetch()}
            className="min-h-11 rounded-sm border-2 border-estrelinha-ink bg-transparent px-7 font-heading text-[15px] font-semibold text-estrelinha-ink hover:bg-estrelinha-ground-deep"
          >
            Tentar de novo
          </Button>
        </div>
      </Moldura>
    )
  }

  const leitura = query.data
  if (leitura.kind === 'unavailable') {
    return <Moldura><Aviso ajuda={ajuda}><p>{CARD_LINK_UNAVAILABLE_MESSAGE}</p></Aviso></Moldura>
  }
  if (leitura.kind === 'paid' || leitura.kind === 'cancelled') {
    const numero = leitura.orderNumber ? formatOrderNumber(leitura.orderNumber) : 'deste link'
    return (
      <Moldura>
        <Aviso ajuda={leitura.kind === 'cancelled' ? ajuda : null}>
          <p>
            {leitura.kind === 'paid'
              ? `O pedido ${numero} já foi pago. Não há nada a pagar por este link.`
              : `O pedido ${numero} foi cancelado. Não há nada a pagar por este link.`}
          </p>
        </Aviso>
      </Moldura>
    )
  }

  return (
    <CheckoutStoreProvider store={useCardLinkCheckoutStore}>
      <CardLinkPay token={token} order={leitura.order} />
    </CheckoutStoreProvider>
  )
}

const CardLinkPay = ({ token, order }: { token: string; order: CardLinkOrder }) => {
  const navigate = useNavigate()
  const cardNumberRecognized = useCardLinkCheckoutStore((s) => s.cardNumberRecognized)
  const installments = useCardInstallmentOptions(order.amount)
  const createPayment = useCreatePayment()
  const numero = order.order_number ? formatOrderNumber(order.order_number) : ''

  const [busy, setBusy] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const [cardNotice, setCardNotice] = useState<CardNotice | null>(null)
  const [stage, setStage] = useState<'code' | 'approved' | null>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (stage !== 'code') {
      setSlow(false)
      return
    }
    const id = setTimeout(() => setSlow(true), PIX_SLOW_MS)
    return () => clearTimeout(id)
  }, [stage])

  const escolha = installments.selected
  const ctaLabel =
    escolha && escolha.count > 1
      ? `Pagar ${escolha.count}x de ${formatPrice(escolha.value)}`
      : `Pagar ${formatPrice(order.amount)} no cartão`
  const parcelasPendentes = cardNumberRecognized && escolha === null

  const pagar = async () => {
    setBusy(true)
    setCardError(null)
    setCardNotice(null)
    let aprovado = false
    try {
      const form = await getCardFormData()
      if (!form) return
      if (!isValidDocument(form.payer?.identification?.number ?? '')) {
        setCardError(MISSING_DOCUMENT_MESSAGE)
        return
      }
      setStage('code')
      try {
        const response = (await createPayment.mutateAsync({
          order_id: order.id,
          method: 'card',
          card: { ...form, installments: escolha?.count ?? 1 },
          card_link_token: token,
        })) as CardPaymentResponse
        if (response.status === 'approved') {
          aprovado = true
          setStage('approved')
          await new Promise((resolve) => setTimeout(resolve, BATIDA_MS))
          navigate(`/pedido/${order.id}`)
          return
        }
        setCardError(friendlyMessage(response.status_detail))
        setCardNotice(declinedNotice(response.status_detail, numero || null))
      } catch (err) {
        const message = err instanceof Error ? err.message : PAYMENT_UNAVAILABLE_MESSAGE
        setCardError(message)
        setCardNotice(unansweredNotice(message, numero || null))
      }
    } finally {
      setBusy(false)
      if (!aprovado) setStage(null)
    }
  }

  const camada = stage ? (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-white">
      <CheckoutHeader />
      {stage === 'approved' ? (
        <PaymentApproved
          method="card"
          amount={order.amount}
          orderNumber={order.order_number ?? ''}
          orderHref={`/pedido/${order.id}`}
          installments={escolha}
        />
      ) : (
        <PaymentProgress
          method="card"
          step="code"
          amount={order.amount}
          orderNumber={order.order_number ?? undefined}
          slow={slow}
          installments={escolha?.count}
        />
      )}
    </div>
  ) : null

  return (
    <>
      <div className="min-h-screen bg-white pb-10" aria-hidden={stage ? true : undefined}>
        <CheckoutHeader />
        <div className="container max-w-[640px] py-6 lg:py-10">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className={TITULO}>
                {CARD_LINK_TITLE}
              </h1>
              {numero && (
                <p className="text-[15px] leading-6 text-estrelinha-ink-soft">Pedido {numero}</p>
              )}
            </div>

            <section className="rounded-md border border-estrelinha-line p-4">
              <ul className="flex flex-col gap-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex min-w-0 items-start justify-between gap-3 text-[15px] text-estrelinha-ink">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      <span>{item.name}</span>
                      {item.variant && (
                        <span className="block text-sm text-estrelinha-ink-soft">{item.variant}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm text-estrelinha-ink-soft">× {item.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t border-estrelinha-line pt-3">
                <span className="text-[15px] text-estrelinha-ink-soft">Total no cartão</span>
                <span className="font-heading text-xl font-semibold text-estrelinha-ink">
                  {formatPrice(order.amount)}
                </span>
              </div>
            </section>

            <CardPaymentBrick
              amount={order.amount}
              payerEmail=""
              errorMessage={cardError}
              notice={cardNotice}
            />

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                onClick={() => void pagar()}
                disabled={busy || parcelasPendentes}
                className="h-auto w-full gap-[11px] rounded-sm border-0 bg-estrelinha-primary py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:bg-estrelinha-primary hover:opacity-95 disabled:opacity-50 motion-reduce:transition-none lg:text-[19px]"
              >
                <Lock className="h-5 w-5" aria-hidden />
                {ctaLabel}
              </Button>
              <span className="flex items-center gap-[7px] text-xs font-medium text-estrelinha-ink-soft">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                Pagamento processado por Mercado Pago
              </span>
            </div>
          </div>
        </div>
      </div>
      {camada}
    </>
  )
}

export default CardLinkPaymentPage
