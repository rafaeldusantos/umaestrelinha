// `/pedido-montado#<token>` — o pedido que a Adri montou no painel (feature 89, `AD-070`).
//
// A cliente confere as peças (só leitura), ajusta nome, telefone, CPF e endereço, escolhe a entrega e
// o pagamento e conclui. Os blocos são os de `/checkout` (`CON-01`), sobre uma INSTÂNCIA PRÓPRIA do
// rascunho (`useProposalCheckoutStore`, outra chave de `sessionStorage`): concluir ou pagar este
// pedido nunca toca o rascunho de `/checkout` — e por isso `OrderPaymentPage`, que só esvazia a sacola
// quando o pedido pago é o do rascunho de `/checkout`, nunca esvazia a sacola por causa daqui.
//
// O token vem do fragmento e sai da barra na primeira renderização (`takeProposalToken`, `SEG-02`).
// O total é `proposalPricing` — a mesma conta que `create-order` e `create-payment` fazem (`PRC-06`).
//
// Fora do `StoreLayout` pela mesma razão de `/checkout` (`CHK-10`): header próprio, sem navegação.
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'
import { useAuthContext } from '@estrelinha/auth'
import { formatPrice } from '@estrelinha/core/formatters'
import { friendlyMessage } from '@estrelinha/core/payment/status'
import { resolveCheckoutIdentity, resolveFlow, type BlockId } from '@estrelinha/core/checkout'
import { isValidDocument, maskCep, maskDocument, maskPhone, stripCep, stripPhone } from '@estrelinha/core/validators'
import { PICKUP_SERVICE_ID } from '@estrelinha/core/shipping'
import { proposalPricing, type PublicProposal } from '@estrelinha/core/proposals'
import { staticPageMeta } from '@estrelinha/core/seo'
import {
  useGeneralSettings,
  usePaymentSettings,
  useShippingSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import type { CardPaymentFormData, CardPaymentResponse } from '@estrelinha/supabase/types'
import {
  CheckoutStoreProvider,
  useProposalCheckoutStore,
} from '@/features/checkout/model/checkoutStore'
import { useCardInstallmentOptions } from '@/features/checkout/model/useCardInstallmentOptions'
import { getCardFormData } from '@/features/checkout/lib/cardBrick'
import { analyticsFields } from '@/features/checkout/lib/buildOrderPayload'
import { declinedNotice, unansweredNotice, type CardNotice } from '@/features/checkout/lib/cardNotice'
import { PAYMENT_UNAVAILABLE_MESSAGE, useCreatePayment } from '@/features/checkout/api/useCreatePayment'
import ContactBlock from '@/features/checkout/ui/ContactBlock'
import DeliveryBlock from '@/features/checkout/ui/DeliveryBlock'
import PaymentBlock from '@/features/checkout/ui/PaymentBlock'
import { BATIDA_MS, PIX_SLOW_MS, PaymentApproved, PaymentProgress } from '@/features/order-payment'
import {
  PROPOSAL_ORDER_FAILED_MESSAGE,
  PROPOSAL_CHANGED_MESSAGE,
  PROPOSAL_READ_FAILED_MESSAGE,
  PickupUnavailableError,
  ProposalChangedError,
  ProposalItemUnavailableError,
  ProposalItems,
  ProposalSummary,
  ProposalUnavailable,
  ProposalUnavailableError,
  proposalValidUntil,
  takeProposalToken,
  useCreateProposalOrder,
  useProposal,
  useProposalQuoteItems,
} from '@/features/proposal-checkout'
import { CheckoutHeader } from '@/widgets/checkout-header'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { orderPaymentPath } from '@/entities/order/lib/podePagarComPix'
import { rememberAccess } from '@/entities/order/model/orderAccess'
import { gaIds } from '@/shared/lib/analytics'
import { whatsappHref } from '@/shared/lib/whatsapp'
import { usePageMeta } from '@/shared/lib/usePageMeta'

/** CON-02, palavra por palavra. */
export const PROPOSAL_TITLE = 'Seu pedido'
export const PROPOSAL_INTRO =
  'Montado pela Adri para você. Confira seus dados, escolha a entrega e o pagamento.'
/** CON-09: a conclusão fica bloqueada enquanto uma peça estiver fora do ar. */
export const ITEMS_BLOCKED_MESSAGE =
  'Uma peça do seu pedido está indisponível no momento. Fale comigo pelo WhatsApp.'
export const PICKUP_UNAVAILABLE_MESSAGE =
  'A retirada no escritório não está disponível para este pedido. Escolha uma opção de envio.'
export const MISSING_DOCUMENT_MESSAGE =
  'Informe o CPF ou CNPJ do titular no formulário do cartão para continuar.'

const WHATSAPP_MESSAGE = 'Olá! Preciso de ajuda com o pedido que você montou para mim.'

const ProposalCheckoutPage = () => {
  usePageMeta(staticPageMeta('/pedido-montado'))
  // SEG-02: lido ao abrir — e, nessa leitura, apagado da barra de endereço.
  const [token, setToken] = useState(() => takeProposalToken())
  // Um link novo aberto na MESMA aba (colado na barra, ou um navegador que reaproveita a aba) só
  // muda o fragmento: o navegador não recarrega, e a página continuaria com o token de antes — e
  // com o novo à vista na barra (QA da 89, `BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo`).
  useEffect(() => {
    const aoMudarFragmento = () => {
      if (!window.location.hash) return
      const novo = takeProposalToken()
      if (novo) setToken(novo)
    }
    window.addEventListener('hashchange', aoMudarFragmento)
    return () => window.removeEventListener('hashchange', aoMudarFragmento)
  }, [])
  const query = useProposal(token)
  const { whatsapp } = useGeneralSettings()
  const ajuda = whatsappHref(whatsapp, WHATSAPP_MESSAGE)

  if (!token) return <Moldura><ProposalUnavailable whatsappHref={ajuda} /></Moldura>

  if (query.isLoading) {
    return (
      <Moldura>
        <p role="status" className="container py-20 text-center text-estrelinha-ink-soft">
          Carregando seu pedido...
        </p>
      </Moldura>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Moldura>
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <p role="alert" className="text-estrelinha-ink-soft">{PROPOSAL_READ_FAILED_MESSAGE}</p>
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
    return <Moldura><ProposalUnavailable whatsappHref={ajuda} /></Moldura>
  }
  if (leitura.kind === 'completed') {
    return <PedidoJaConcluido orderId={leitura.orderId} accessToken={leitura.accessToken} />
  }

  return (
    <CheckoutStoreProvider store={useProposalCheckoutStore}>
      <ProposalCheckout
        key={token}
        token={token}
        proposal={leitura.proposal}
        ajuda={ajuda}
        reler={async () => {
          await query.refetch()
        }}
      />
    </CheckoutStoreProvider>
  )
}

const Moldura = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-white">
    <CheckoutHeader />
    {children}
  </div>
)

/** CON-07: o link de um pedido já concluído leva ao pedido, com o acesso de convidada reemitido. */
const PedidoJaConcluido = ({ orderId, accessToken }: { orderId: string; accessToken: string | null }) => {
  // O acesso é guardado ANTES de navegar: a confirmação o lê no primeiro render dela. O efeito de
  // layout roda antes do efeito do `Navigate`.
  const [pronto, setPronto] = useState(false)
  useLayoutEffect(() => {
    if (accessToken) rememberAccess(orderId, accessToken)
    setPronto(true)
  }, [orderId, accessToken])
  return pronto ? <Navigate to={`/pedido/${orderId}`} replace /> : null
}

/** O rascunho semeado da proposta: o que a Adri já sabia da cliente (`CON-01`). */
function semear(proposal: PublicProposal) {
  const store = useProposalCheckoutStore.getState()
  const endereco = proposal.address
  store.reset()
  store.setContact({
    name: proposal.customer_name ?? '',
    email: proposal.customer_email,
    whatsapp: proposal.customer_phone ? maskPhone(proposal.customer_phone) : '',
  })
  if (endereco?.address_zip) {
    store.setAddress({
      cep: maskCep(endereco.address_zip),
      street: endereco.address_street ?? '',
      number: endereco.address_number ?? '',
      complement: endereco.address_complement ?? '',
      neighborhood: endereco.address_neighborhood ?? '',
      city: endereco.address_city ?? '',
      state: endereco.address_state ?? '',
      manual: false,
    })
  }
  if (proposal.customer_document) store.setPayment({ cpf: maskDocument(proposal.customer_document) })
}

interface ProposalCheckoutProps {
  token: string
  proposal: PublicProposal
  ajuda: string | null
  reler: () => Promise<void>
}

const ProposalCheckout = ({ token, proposal, ajuda, reler }: ProposalCheckoutProps) => {
  const navigate = useNavigate()
  const { user, customer } = useAuthContext()
  const useStore = useProposalCheckoutStore
  const contact = useStore((s) => s.contact)
  const address = useStore((s) => s.address)
  const shipping = useStore((s) => s.shipping)
  const payment = useStore((s) => s.payment)
  const bumpChecked = useStore((s) => s.bumpChecked)
  const dirty = useStore((s) => s.dirty)
  const cardNumberRecognized = useStore((s) => s.cardNumberRecognized)

  // Semeia uma vez por proposta, num efeito de LAYOUT: ele roda antes dos efeitos dos blocos (que
  // semeiam da conta logada só o que estiver vazio) e antes da primeira pintura. Um rascunho que já é
  // desta proposta (recarregar a aba) fica como a cliente deixou; o de outra é trocado inteiro —
  // inclusive o pedido em curso e a chave de idempotência. "Desta proposta" é o `scope` do rascunho,
  // e não o e-mail: duas propostas da mesma cliente têm o mesmo e-mail, e comparar só ele fazia o
  // "Pagar" da segunda levar ao PIX do pedido da primeira (QA da 89).
  const [semeadaPara, setSemeadaPara] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (useStore.getState().scope !== proposal.id) {
      semear(proposal)
      useStore.getState().setScope(proposal.id)
    }
    setSemeadaPara(proposal.id)
  }, [useStore, proposal])

  const { pix_discount_percent } = usePaymentSettings()
  // O frete grátis tem um dono só (`freeShippingState`, feature 37): a página não lê a faixa — passa
  // a configuração inteira a `proposalPricing`, que a entrega ao dono.
  const shippingSettings = useShippingSettings()
  const quoteItems = useProposalQuoteItems(proposal.lines)

  const locked = useMemo(
    () => ({
      lines: proposal.lines.map((l) => ({ unit_price: Number(l.unit_price), quantity: Number(l.quantity) })),
      couponDiscount: Number(proposal.coupon_discount) || 0,
      couponFreeShipping: proposal.coupon_free_shipping === true,
      manualDiscount: Number(proposal.manual_discount) || 0,
    }),
    [proposal],
  )
  const precificar = (method: 'pix' | 'card') =>
    proposalPricing(locked, {
      shipping: shipping?.cost ?? 0,
      method,
      pixDiscountPercent: Number(pix_discount_percent) || 0,
      freeShipping: shippingSettings,
    })
  const totals = precificar(payment.method === 'card' ? 'card' : 'pix')
  const cardTotal = precificar('card').total
  /** A-11: a base do frete grátis — o que os itens somam depois dos descontos. */
  const baseDoFreteGratis = Math.max(0, totals.subtotal - totals.couponDiscount - (totals.manualDiscount ?? 0))

  const cardInstallments = useCardInstallmentOptions(cardTotal)
  const createOrder = useCreateProposalOrder()
  const createPayment = useCreatePayment()

  const [editing, setEditing] = useState<BlockId | null>(null)
  const [confirmed, setConfirmed] = useState<BlockId[]>([])
  const [busy, setBusy] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [cardNotice, setCardNotice] = useState<CardNotice | null>(null)
  const [cardStage, setCardStage] = useState<'order' | 'code' | 'approved' | null>(null)
  const [cardSlow, setCardSlow] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  // A-08: o link é a prova de posse — nunca há desafio de código aqui.
  const identity = resolveCheckoutIdentity({ hasSession: !!user, emailHasAccount: false })

  useEffect(() => {
    setCardSlow(false)
    if (cardStage !== 'code') return
    const id = setTimeout(() => setCardSlow(true), PIX_SLOW_MS)
    return () => clearTimeout(id)
  }, [cardStage])

  const flow = useMemo(
    () =>
      resolveFlow(
        { contact, address, shipping, payment, bumpChecked },
        { dirty, confirmed, editing },
        identity,
        { cardNumberRecognized },
      ),
    [contact, address, shipping, payment, bumpChecked, dirty, confirmed, editing, identity, cardNumberRecognized],
  )
  const isComplete = (id: BlockId) => flow.complete.includes(id)
  const confirmBlock = (id: BlockId) => {
    setConfirmed((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setEditing(null)
  }

  const indisponivel = proposal.lines.some((l) => !l.available)

  if (semeadaPara !== proposal.id) return null

  if (busy && payment.method !== 'card') {
    return (
      <div className="min-h-screen bg-white">
        <CheckoutHeader />
        <PaymentProgress step="order" amount={totals.total} />
      </div>
    )
  }

  const cardChoice = cardInstallments.selected
  const ctaLabel =
    payment.method === 'card' && cardChoice && cardChoice.count > 1
      ? `Pagar ${cardChoice.count}x de ${formatPrice(cardChoice.value)}`
      : `Pagar ${formatPrice(totals.total)} ${payment.method === 'card' ? 'no cartão' : 'com PIX'}`
  const cardInstallmentsPending =
    payment.method === 'card' && cardNumberRecognized && cardInstallments.selected === null

  const shippingLabel = shipping
    ? shipping.serviceId === PICKUP_SERVICE_ID
      ? shipping.serviceName
      : `Frete · ${shipping.carrier} ${shipping.serviceName}`
    : null

  /**
   * CON-05, CON-06: o pedido nasce pela function `checkout` com o token; a partir daí é o caminho da
   * loja — PIX na rota do pagamento, cartão pelo Brick. A sacola NUNCA é tocada: nem o carrinho, nem
   * o cupom, nem o rascunho de `/checkout`.
   */
  const handleConfirm = async () => {
    const store = useStore.getState()
    if (store.orderId && store.isStale()) store.invalidateOrder()
    const isCard = payment.method === 'card'
    setBusy(true)
    setAviso(null)
    setCardError(null)
    setCardNotice(null)
    let aprovado = false
    let numero = orderNumber
    try {
      let cardForm: CardPaymentFormData | null = null
      let payerDocument = payment.cpf
      if (isCard) {
        cardForm = await getCardFormData()
        if (!cardForm) return
        payerDocument = cardForm.payer?.identification?.number || customer?.cpf || payment.cpf || ''
        if (!isValidDocument(payerDocument)) {
          setCardError(MISSING_DOCUMENT_MESSAGE)
          return
        }
        setCardStage(useStore.getState().orderId ? 'code' : 'order')
      }

      let orderId = useStore.getState().orderId
      if (!orderId) {
        try {
          const criado = await createOrder.mutateAsync({
            proposal_token: token,
            proposal_version: proposal.version,
            client_request_id: useStore.getState().ensureRequestId(),
            payment_method: isCard ? 'card' : 'pix',
            customer_name: contact.name.trim(),
            customer_phone: stripPhone(contact.whatsapp),
            customer_document: payerDocument.replace(/\D/g, ''),
            address_zip: stripCep(address.cep),
            address_street: address.street,
            address_number: address.number,
            address_complement: address.complement,
            address_neighborhood: address.neighborhood,
            address_city: address.city,
            address_state: address.state,
            shipping_service_id: shipping?.serviceId ?? '',
            shipping_carrier: shipping?.carrier ?? '',
            shipping_method: shipping?.serviceName ?? '',
            shipping_cost: shipping?.cost ?? 0,
            delivery_estimate_min: shipping?.estimateMin ?? '',
            delivery_estimate_max: shipping?.estimateMax ?? '',
            ...analyticsFields({
              ...gaIds(),
              declined: !useCookieConsentStore.getState().statistics,
            }),
          })
          if (criado.access_token) rememberAccess(criado.id, criado.access_token)
          useStore.getState().setOrder(criado.id, useStore.getState().draft(), user?.id ?? null)
          if (criado.order_number) {
            numero = criado.order_number
            setOrderNumber(criado.order_number)
          }
          orderId = criado.id
        } catch (err) {
          if (err instanceof ProposalChangedError) {
            // CON-10: nunca concluir com a versão velha — reler e pedir conferência.
            // E a entrega volta a "não escolhida": o preço cotado era o do pacote antigo, e a
            // Adri pode ter mudado as peças. A cliente escolhe de novo sobre a cotação do pacote
            // atual — nenhum frete fica na tela sem ter sido cotado para ele (decisão do usuário,
            // 2026-10-31, `BUG-20261031-frete-antigo-depois-que-a-adri-atualiza`, opção a).
            // Sem entrega o bloco deixa de estar completo e o fluxo o reabre sozinho
            // (`resolveFlow`); nenhuma outra trava é preciso.
            useStore.getState().setShipping(null)
            setAviso(PROPOSAL_CHANGED_MESSAGE)
            await reler()
            return
          }
          if (err instanceof ProposalItemUnavailableError) {
            // CON-09: a página relê e marca a peça; a conclusão fica bloqueada.
            await reler()
            return
          }
          if (err instanceof ProposalUnavailableError) {
            await reler()
            return
          }
          if (err instanceof PickupUnavailableError) {
            useStore.getState().setShipping(null)
            setEditing('delivery')
            toast.error(PICKUP_UNAVAILABLE_MESSAGE)
            return
          }
          toast.error(PROPOSAL_ORDER_FAILED_MESSAGE)
          return
        }
      }

      if (!isCard) {
        navigate(orderPaymentPath(orderId))
        return
      }
      if (!cardForm) return
      setCardStage('code')
      try {
        const response = (await createPayment.mutateAsync({
          order_id: orderId,
          method: 'card',
          card: { ...cardForm, installments: cardInstallments.selected?.count ?? 1 },
        })) as CardPaymentResponse
        if (response.status === 'approved') {
          aprovado = true
          setCardStage('approved')
          await new Promise((resolve) => setTimeout(resolve, BATIDA_MS))
          navigate(`/pedido/${orderId}`)
          // Só o rascunho DESTA instância; a sacola, o cupom e o rascunho de `/checkout` ficam.
          useStore.getState().reset()
          return
        }
        setCardError(friendlyMessage(response.status_detail))
        setCardNotice(declinedNotice(response.status_detail, numero))
      } catch (err) {
        const message = err instanceof Error ? err.message : PAYMENT_UNAVAILABLE_MESSAGE
        setCardError(message)
        setCardNotice(unansweredNotice(message, numero))
      }
    } finally {
      setBusy(false)
      if (!aprovado) setCardStage(null)
    }
  }

  const cardLayer = cardStage ? (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-white">
      <CheckoutHeader />
      {cardStage === 'approved' ? (
        <PaymentApproved
          method="card"
          amount={totals.total}
          orderNumber={orderNumber ?? ''}
          orderHref={`/pedido/${useStore.getState().orderId}`}
          customerEmail={contact.email || undefined}
          installments={cardInstallments.selected}
        />
      ) : (
        <PaymentProgress
          method="card"
          step={cardStage}
          amount={totals.total}
          orderNumber={cardStage === 'code' ? orderNumber ?? undefined : undefined}
          slow={cardStage === 'code' && cardSlow}
          installments={cardInstallments.selected?.count}
        />
      )}
    </div>
  ) : null

  return (
    <>
      <div className="min-h-screen bg-white pb-10 lg:pb-0" aria-hidden={cardStage ? true : undefined}>
        <CheckoutHeader />
        <div className="container py-6 lg:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink">
                  {PROPOSAL_TITLE}
                </h1>
                <p className="text-[15px] leading-6 text-estrelinha-ink-soft">{PROPOSAL_INTRO}</p>
                <p className="text-[13px] font-semibold text-estrelinha-ink">
                  {proposalValidUntil(proposal.expires_at)}
                </p>
              </div>

              {aviso && (
                <p role="alert" className="rounded-md border border-estrelinha-line bg-estrelinha-ground-deep p-3 text-sm text-estrelinha-ink">
                  {aviso}
                </p>
              )}

              <ProposalItems lines={proposal.lines} whatsappHref={ajuda} />
              <div className="lg:hidden">
                <ProposalSummary
                  proposal={proposal}
                  totals={totals}
                  shippingLabel={shippingLabel}
                  pixDiscountPercent={Number(pix_discount_percent) || 0}
                />
              </div>

              <ContactBlock
                open={flow.open === 'contact'}
                complete={isComplete('contact')}
                onEdit={() => setEditing('contact')}
                onContinue={() => confirmBlock('contact')}
                canContinue={isComplete('contact')}
                challenging={false}
                onChallenge={() => {}}
                emailReadOnly
              />
              <DeliveryBlock
                open={flow.open === 'delivery'}
                complete={isComplete('delivery')}
                onEdit={() => setEditing('delivery')}
                onContinue={() => confirmBlock('delivery')}
                canContinue={isComplete('delivery')}
                quoteItems={quoteItems}
                subtotal={baseDoFreteGratis}
                couponFreeShipping={proposal.coupon_free_shipping === true}
              />
              <PaymentBlock
                open={flow.open === 'payment'}
                complete={isComplete('payment')}
                onEdit={() => setEditing('payment')}
                amount={totals.total}
                cardAmount={cardTotal}
                cardError={cardError}
                cardNotice={cardNotice}
              />

              <div className="flex flex-col items-center gap-3 pt-2">
                {indisponivel && (
                  <p role="alert" className="text-center text-sm font-semibold text-estrelinha-alert">
                    {ITEMS_BLOCKED_MESSAGE}
                  </p>
                )}
                <Button
                  onClick={() => void handleConfirm()}
                  disabled={indisponivel || flow.complete.length !== 3 || busy || cardInstallmentsPending}
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

            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <ProposalSummary
                  proposal={proposal}
                  totals={totals}
                  shippingLabel={shippingLabel}
                  pixDiscountPercent={Number(pix_discount_percent) || 0}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
      {cardLayer}
    </>
  )
}

export default ProposalCheckoutPage
