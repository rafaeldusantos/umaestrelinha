// Checkout one-page: três blocos, resumo persistente e um único CTA (CHK-01 … CHK-12).
//
// O passo "Revisão" não existe — o resumo assumiu o papel dele (CHK-05). A página é só
// orquestração: as regras de completude/abertura vivem em `@estrelinha/core/checkout`
// (`resolveFlow`) e o rascunho no `checkoutStore`.
//
// FLW-01 … FLW-07: quem avança é a pessoa. `resolveFlow` separa completude de navegação; a página
// só guarda o que é dela — `confirmed` (cliques em `Continuar`) e `editing` (cliques em `Alterar`).
//
// A rota fica **fora** do `StoreLayout` (ver `app/App.tsx`) porque CHK-10 pede header próprio,
// sem navegação de categorias, e o CTA fixo do rodapé não pode disputar espaço com o `MobileNav`.
// Por isso o `AuthOverlay` é montado aqui — mas desde a feature `49` ele não abre mais sozinho:
// `CHK-02` foi **removida**, e quem convida a entrar é o `SignInInvite`, sem obrigar ninguém.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, MessageCircle, Package, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { formatPrice } from '@estrelinha/core/formatters'
import { isValidDocument, stripCep } from '@estrelinha/core/validators'
import { friendlyMessage } from '@estrelinha/core/payment/status'
import { normalizeOptions } from '@estrelinha/core/product'
import { initialMaterialStatus } from '@estrelinha/core/material'
import { hasSellableGrid } from '@/entities/product/lib/variantSelection'
import { resolveCheckoutIdentity, resolveFlow, type BlockId } from '@estrelinha/core/checkout'
import { useAuthContext } from '@estrelinha/auth'
import { supabase } from '@estrelinha/supabase/client'
import type { CardPaymentFormData, CardPaymentResponse } from '@estrelinha/supabase/types'
import {
  findItemsMissingVariant,
  missingVariantMessage,
} from '@/features/checkout/lib/requireVariantSelection'
import { getCardFormData } from '@/features/checkout/lib/cardBrick'
import {
  buildOrderItems,
  buildOrderPayload,
} from '@/features/checkout/lib/buildOrderPayload'
import {
  useCreatePayment,
  PAYMENT_UNAVAILABLE_MESSAGE,
} from '@/features/checkout/api/useCreatePayment'
import { useCartStore, useCartUiStore } from '@/entities/cart'
import { CartDrawer } from '@/widgets/cart-drawer'
import { useCouponStore } from '@/entities/coupon'
import { NeedsOtpError, useCreateOrder } from '@/entities/order/api/useOrders'
import { rememberAccess } from '@/entities/order/model/orderAccess'
import { AuthOverlay, useAuthUiStore } from '@/features/auth'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { useCheckoutTotals } from '@/features/checkout/model/useCheckoutTotals'
import SignInInvite from '@/features/checkout/ui/SignInInvite'
import ContactBlock from '@/features/checkout/ui/ContactBlock'
import DeliveryBlock from '@/features/checkout/ui/DeliveryBlock'
import PaymentBlock from '@/features/checkout/ui/PaymentBlock'
import OrderBump from '@/features/checkout/ui/OrderBump'
import OrderSummary from '@/features/checkout/ui/OrderSummary'
import {
  markCartRecovered,
  clearGuestEmail,
} from '@/features/abandoned-cart/model/useAbandonedCartTracker'

export const ORDER_FAILED_MESSAGE = 'Não conseguimos criar seu pedido. Tente novamente.'
/**
 * DOC-05: o documento do cartão sai do Brick; sem ele, do `customers.cpf` já salvo. Faltando os
 * dois, o servidor montaria o pagamento sem pagador — melhor pedir aqui do que gravar um pedido
 * que nunca poderá ser pago.
 */
export const MISSING_DOCUMENT_MESSAGE =
  'Informe o CPF ou CNPJ do titular no formulário do cartão para continuar.'

/** A linha mínima que a guarda de PST-03 AC 5 lê para decidir se o produto exige variação. */
interface DbGridRow {
  id: string
  options: unknown
  product_variants: { is_active: boolean; price: number | null }[] | null
}

/** CHK-12: só o que `pages/ReturnsPolicyPage.tsx` realmente promete. */
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Mercado Pago' },
  { icon: RefreshCw, label: 'Troca de produto com defeito em 7 dias' },
  { icon: Package, label: 'Embalagem protegida' },
]

const CheckoutHeader = () => (
  <header className="border-b border-estrelinha-line bg-white">
    <div className="container flex items-center justify-between py-5">
      <Link to="/" aria-label="Uma Estrelinha">
        <EstrelinhaSignature width={200} />
      </Link>
      <div className="flex items-center gap-5 text-sm font-medium">
        <span className="flex items-center gap-[7px] text-estrelinha-ink">
          <Lock className="h-[15px] w-[15px] text-estrelinha-primary" aria-hidden />
          Ambiente seguro
        </span>
        <span className="hidden h-[18px] w-px bg-estrelinha-line sm:block" />
        <span className="hidden items-center gap-[7px] text-estrelinha-ink-soft sm:flex">
          <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
          Ajuda no WhatsApp
        </span>
      </div>
    </div>
  </header>
)

const CheckoutPage = () => {
  const navigate = useNavigate()
  const { user, customer, loading } = useAuthContext()

  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const coupon = useCouponStore((s) => s.applied)
  const clearCoupon = useCouponStore((s) => s.clearCoupon)

  const contact = useCheckoutStore((s) => s.contact)
  const address = useCheckoutStore((s) => s.address)
  const shipping = useCheckoutStore((s) => s.shipping)
  const payment = useCheckoutStore((s) => s.payment)
  const bumpChecked = useCheckoutStore((s) => s.bumpChecked)
  const orderId = useCheckoutStore((s) => s.orderId)
  const dirty = useCheckoutStore((s) => s.dirty)

  const { pricingItems, bump, bumpProduct, totals, promotionDiscount, applied } =
    useCheckoutTotals()
  const createOrder = useCreateOrder()
  const createPayment = useCreatePayment()

  const [editing, setEditing] = useState<BlockId | null>(null)
  /** FLW-03: blocos que a pessoa fechou clicando em `Continuar`. Não sobrevive ao reload. */
  const [confirmed, setConfirmed] = useState<BlockId[]>([])
  const [busy, setBusy] = useState(false)
  /** Erro da tentativa de cartão. Não vai para o store: é de uma tentativa, não do rascunho. */
  const [cardError, setCardError] = useState<string | null>(null)

  /**
   * `IDN-02`: o e-mail que já tem conta e ainda não foi provado.
   *
   * Guardado pelo e-mail, e não por um booleano: se a pessoa trocar de e-mail depois de ser
   * desafiada, o desafio precisa sumir sozinho (`IDN-06`) — com um booleano ela ficaria presa
   * pedindo o código de um endereço que já não está no campo.
   */
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null)

  /**
   * `IDN-04`: quem está fechando este pedido. Entra em `resolveFlow` porque desafio de código
   * pendente impede o bloco Contato de completar — e, com ele, o CTA de pagar.
   */
  const identity = useMemo(
    () =>
      resolveCheckoutIdentity({
        hasSession: !!user,
        emailHasAccount:
          !!challengeEmail &&
          challengeEmail.trim().toLowerCase() === (contact.email ?? '').trim().toLowerCase(),
      }),
    [user, challengeEmail, contact.email],
  )

  /**
   * `IDN-07`: **trocar de identidade descarta o pedido em curso.**
   *
   * Entrar (ou sair) depois de o pedido já existir muda de quem ele é: um pedido criado como
   * convidada tem o token dela e nasceu órfão ou ligado à conta do e-mail digitado; depois do
   * login, quem paga apresenta um JWT que pode não ser o dono. `create-payment` responderia 403 —
   * a cliente veria "pedido não pertence ao usuário" depois de ter feito tudo certo.
   *
   * A mecânica é a de `CHK-08`, inteira: `invalidateOrder` também descarta a chave de idempotência,
   * então o próximo CTA cria um pedido novo em vez de reaproveitar o antigo.
   */
  // `undefined` é "ainda não observei", e é distinto de `null` ("não há sessão"). Sem os três
  // estados, a primeira renderização de quem JÁ está logada contaria como troca e descartaria um
  // pedido recém-criado — em silêncio, e logo antes do pagamento.
  const identidadeAnterior = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const atual = user?.id ?? null
    const anterior = identidadeAnterior.current
    identidadeAnterior.current = atual
    // A primeira passada registra sem invalidar: não houve TROCA, só a leitura inicial.
    if (anterior === undefined || anterior === atual) return
    if (useCheckoutStore.getState().orderId) useCheckoutStore.getState().invalidateOrder()
  }, [user?.id])

  const flow = useMemo(
    () =>
      resolveFlow(
        { contact, address, shipping, payment, bumpChecked },
        { dirty, confirmed, editing },
        identity,
      ),
    [contact, address, shipping, payment, bumpChecked, dirty, confirmed, editing, identity],
  )
  const openBlock = flow.open
  const isComplete = (id: BlockId) => flow.complete.includes(id)

  /**
   * FLW-03/FLW-06: confirmar fecha o bloco **e** zera `editing`. Sem zerar, o foco ficaria preso
   * no bloco que a pessoa abriu por `Alterar` — `editing` vence a ordem natural.
   */
  const confirmBlock = (id: BlockId) => {
    setConfirmed((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setEditing(null)
  }

  // `CSC-01`/`CSC-02`: **o portão caiu** (feature `49`).
  //
  // Até aqui `CHK-02` abria o `AuthOverlay` sozinho e, atrás dele, a página escrevia "Você precisa
  // estar logada para finalizar a compra". Era uma etapa a mais entre decidir comprar e pagar, em
  // ~90% de acessos de celular — e numa loja memorial ela cobra burocracia de quem acabou de
  // perder alguém. O convite para entrar continua existindo, **dentro** do checkout
  // (`SignInInvite`); o que saiu foi a obrigação.
  if (loading) {
    return <div className="container py-20 text-center text-estrelinha-ink-soft">Carregando...</div>
  }

  // Edge case da spec: carrinho vazio volta ao carrinho em vez de renderizar blocos.
  if (items.length === 0) {
    return <Navigate to="/carrinho" replace />
  }

  const ctaLabel = `Pagar ${formatPrice(totals.total)} ${
    payment.method === 'card' ? 'no cartão' : 'com PIX'
  }`

  // Aprovação: só aqui o carrinho e o cupom são limpos (CNF-05).
  const handlePaymentSuccess = async () => {
    const currentOrderId = useCheckoutStore.getState().orderId
    if (contact.email && currentOrderId) {
      await markCartRecovered(contact.email, currentOrderId)
    }
    // CNF-03: a confirmação é a rota `/pedido/:id`, não um estado interno desta página — assim
    // ela sobrevive ao reload. A navegação vem **antes** da limpeza: com o carrinho já vazio, a
    // guarda de carrinho vazio acima disputaria o redirecionamento com esta rota.
    if (currentOrderId) navigate(`/pedido/${currentOrderId}`)
    clearGuestEmail()
    clearCart()
    clearCoupon()
    // O rascunho e o `order_id` são da compra que acabou de fechar — não sobrevivem a ela.
    useCheckoutStore.getState().reset()
  }

  /**
   * CHK-07: cria o pedido `pending` uma única vez. CHK-08: se algum bloco mudou depois da
   * criação, o pedido em curso é descartado aqui — o store guarda o estado, mas não se
   * auto-invalida.
   *
   * PGM-06 … PGM-08: **um** CTA, dois caminhos, e a ORDEM é o requisito. No cartão, validar o
   * formulário vem antes de qualquer efeito: cartão inválido não pode deixar pedido `pending`
   * atrás de si. O antigo `if (orderId) return` saiu daqui — era ele que impedia retentar um
   * cartão recusado. Quem o substitui é "não recriar pedido que já existe" + "repagar".
   */
  const handleConfirm = async () => {
    const store = useCheckoutStore.getState()
    if (store.orderId && store.isStale()) store.invalidateOrder()

    // `CSC-03`: **sem guarda de `customer.id`**. Ele existia porque o pedido só podia nascer
    // ligado a uma ficha, e a convidada não tem nenhuma quando chega ao CTA — a dela nasce no
    // servidor, depois do pedido (`CSC-08`).
    const isCard = payment.method === 'card'
    setBusy(true)
    setCardError(null)
    try {
      // PGM-06: tokenizar primeiro. `null` = formulário inválido (o Brick já pintou os erros de
      // campo) ⇒ zero efeito: nenhum pedido, nenhuma cobrança.
      let cardForm: CardPaymentFormData | null = null
      let payerDocument = payment.cpf
      if (isCard) {
        cardForm = await getCardFormData()
        if (!cardForm) return

        // DOC-05: o documento do cartão é o que o Brick coletou; sem ele, o já salvo em
        // `customers`. Faltando os dois, erro no bloco — sem pedido.
        payerDocument = cardForm.payer?.identification?.number || customer?.cpf || ''
        if (!isValidDocument(payerDocument)) {
          setCardError(MISSING_DOCUMENT_MESSAGE)
          return
        }
      }

      // `PED-08`/`ADR-G1`: **o CPF e o endereço passaram a ser gravados pela edge function**, no
      // mesmo fluxo que grava o pedido — para convidada e para quem tem sessão.
      //
      // Eram duas mutations daqui, escopadas por RLS, e elas não serviam à convidada: sem
      // `auth.uid()` não há o que escopar. Mantê-las **ao lado** da gravação do servidor daria dois
      // donos de "onde mora o CPF do pagador", e `buildPayer` lê de um só. `AD-013` fala de quem
      // **coleta** o documento — isso não mudou, e continua acontecendo logo acima.

      // PST-03 AC 5: item que EXIGE variação e não traz uma não pode virar pedido. A rejeição do
      // `create-payment` é a última linha de defesa, não a primeira — um pedido gravado que nunca
      // poderá ser pago deixa a cliente com o carrinho consumido e um 422 sem explicação.
      try {
        const productIds = [...new Set(items.map((i) => i.product.id))]
        // A leitura é do produto, não só das variações: PST-10 exige as DUAS metades — eixo
        // cadastrado E linha vendável. Consultar só `product_variants`, como a T16 fazia, marcaria
        // como "exige variação" um produto de `options` vazio, para o qual a loja não mostra
        // seletor nenhum — a cliente ficaria presa num erro que não tem como obedecer.
        const { data: gridRows } = await supabase
          .from('products')
          .select('id, options, product_variants(is_active, price)')
          .in('id', productIds)

        const requiresVariant = new Set(
          (gridRows ?? [])
            .filter((row: DbGridRow) =>
              hasSellableGrid({
                options: normalizeOptions(row.options),
                variants: row.product_variants ?? [],
              }),
            )
            .map((row: DbGridRow) => row.id),
        )

        const missing = findItemsMissingVariant(
          items.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            variantId: i.variantId,
          })),
          requiresVariant,
        )
        if (missing.length) {
          toast.error(missingVariantMessage(missing))
          return
        }
      } catch {
        // A leitura falhar não pode bloquear a venda: o servidor ainda barra o item não resolvível
        // com 422 (PST-01 AC 9). Ficar preso aqui por indisponibilidade de rede seria pior.
      }

      // A montagem vive em `features/checkout/lib/buildOrderPayload` desde a feature `49`: ela
      // estava no meio desta função de sete passos, e é exatamente aqui que o caminho de gravação
      // muda. Regra nenhuma mudou de lugar — só saiu de dentro do CTA para onde pode ser exercida.
      const orderItems = buildOrderItems({ items, pricingItems, bump, bumpProduct })

      // PGM-08: pedido `pending` já existente é REUSADO — só cria quem ainda não tem. Criar um
      // segundo deixaria lixo `pending` e faria a retentativa cobrar um pedido diferente do que a
      // cliente conferiu no resumo.
      let payingOrderId = useCheckoutStore.getState().orderId
      if (!payingOrderId) {
        try {
          const order = await createOrder.mutateAsync({
            ...buildOrderPayload({
              items,
              pricingItems,
              bump,
              bumpProduct,
              contact,
              address,
              shipping,
              paymentMethod: payment.method,
              payerDocument,
              totals,
              coupon,
              applied,
              promotionDiscount,
              // MAT-07: um item que exige material põe o pedido inteiro na fila — inclusive quando
              // exige SEM dizer qual. A fila é sobre "algo está a caminho", não sobre saber o quê.
              materialStatus: initialMaterialStatus(orderItems),
            }),
            customer_id: customer?.id ?? null,
            // PED-04: a MESMA chave na retentativa faz o servidor devolver o mesmo pedido, em vez
            // de criar um segundo e uma segunda conta.
            client_request_id: useCheckoutStore.getState().ensureRequestId(),
          })
          const newOrderId = order?.id
          if (!newOrderId) throw new Error('Pedido sem id')
          // PED-05: a prova de posse da convidada. Sem sessão, é o único caminho para pagar e para
          // reabrir `/pedido/:id` — e ela chega UMA vez, nesta resposta.
          if (order.access_token) rememberAccess(newOrderId, order.access_token)
          // CHK-08: o snapshot é a base da comparação de "algum bloco mudou desde a criação".
          useCheckoutStore.getState().setOrder(newOrderId, useCheckoutStore.getState().draft())
          setEditing(null)
          payingOrderId = newOrderId
        } catch (err) {
          // IDN-08: o servidor recusou porque o e-mail já tem conta. É a ÚNICA falha de criação
          // que a cliente pode resolver sozinha — e o caminho é o desafio de código, não um toast
          // genérico dizendo que não deu.
          if (err instanceof NeedsOtpError) {
            setChallengeEmail(contact.email)
            setEditing('contact')
            return
          }
          // CHK-09: rascunho e carrinho intactos; o CTA continua acionável.
          toast.error(ORDER_FAILED_MESSAGE)
          return
        }
      }

      // PGM-07: no PIX acaba aqui — o pedido passou a existir e o bloco troca sozinho para o QR.
      if (!isCard || !cardForm) return

      // PAY-06: `useCreatePayment` gera `idempotency_key` nova a cada chamada, então retentar uma
      // recusa sobre o MESMO pedido não duplica cobrança (PGM-08).
      try {
        const response = (await createPayment.mutateAsync({
          order_id: payingOrderId,
          method: 'card',
          card: cardForm,
        })) as CardPaymentResponse
        if (response.status === 'approved') {
          await handlePaymentSuccess()
          return
        }
        // PAY-02 (e AD-003: `action_required` segue tratado como recusa): a cliente fica aqui, com
        // o Brick montado e o CTA acionável para tentar de novo.
        setCardError(friendlyMessage(response.status_detail))
      } catch (err) {
        setCardError(err instanceof Error ? err.message : PAYMENT_UNAVAILABLE_MESSAGE)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-40 lg:pb-0">
      <CheckoutHeader />

      <div className="container py-6 lg:py-10">
        <div className="mb-6 lg:hidden">
          <OrderSummary variant="bar" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* `min-w-0`: item de grid nasce com `min-width: auto`, ou seja **não encolhe abaixo do
              próprio min-content**. Os blocos colapsados usam `truncate` (= `white-space: nowrap`),
              então o min-content deles é o texto INTEIRO — um endereço longo media 436px dentro de
              uma viewport de 390 e punha scroll horizontal no body, que a premissa mobile do
              projeto proíbe. O `min-w-0` dos filhos não bastava: quem precisa poder encolher é o
              item de grid. Medido em 390×844: 452px → 390px. */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-1">
              {/* Abre a gaveta em vez de navegar: rever a sacola não deve custar a saída do
                  checkout, com o rascunho e o `order_id` em curso. */}
              <button
                type="button"
                onClick={() => useCartUiStore.getState().openCart()}
                aria-haspopup="dialog"
                className="flex items-center gap-[6px] self-start text-sm font-medium text-estrelinha-ink-soft hover:text-estrelinha-primary"
              >
                <ArrowLeft className="h-[14px] w-[14px]" aria-hidden />
                Voltar ao carrinho
              </button>
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink">
                Finalizar compra
              </h1>
            </div>

            {/* ENT-01: acima do bloco Contato, e só sem sessão. O componente decide isso sozinho. */}
            <SignInInvite />

            <ContactBlock
              open={openBlock === 'contact'}
              complete={isComplete('contact')}
              onEdit={() => setEditing('contact')}
              onContinue={() => confirmBlock('contact')}
              canContinue={isComplete('contact')}
              // `IDN-05`: o desafio some sozinho quando a sessão existe, porque `identity` põe a
              // sessão acima do e-mail — não há efeito nenhum limpando estado depois do login.
              challenging={identity === 'challenge'}
              onChallenge={setChallengeEmail}
            />
            <DeliveryBlock
              open={openBlock === 'delivery'}
              complete={isComplete('delivery')}
              onEdit={() => setEditing('delivery')}
              onContinue={() => confirmBlock('delivery')}
              canContinue={isComplete('delivery')}
            />
            <PaymentBlock
              open={openBlock === 'payment'}
              complete={isComplete('payment')}
              onEdit={() => setEditing('payment')}
              orderId={orderId}
              amount={totals.total}
              cardError={cardError}
              onApproved={() => {
                void handlePaymentSuccess()
              }}
            />

            <OrderBump />

            {/* CHK-10: no mobile o CTA fica fixo no rodapé; no desktop segue no fluxo. */}
            <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 border-t border-estrelinha-line bg-white px-4 pb-6 pt-4 lg:static lg:border-0 lg:px-0 lg:pb-0 lg:pt-2">
              {/* FLW-07: o gate é `complete`, não `open`. Com o Pagamento sempre aberto
                  (FLW-05), `open` nunca é `null` e olhar para ele travaria o CTA para sempre. */}
              <Button
                onClick={() => void handleConfirm()}
                disabled={flow.complete.length !== 3 || busy}
                className="h-auto w-full gap-[11px] rounded-sm border-0 bg-estrelinha-primary py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:bg-estrelinha-primary hover:opacity-95 disabled:opacity-50 lg:text-[19px]"
              >
                <Lock className="h-5 w-5" aria-hidden />
                {ctaLabel}
              </Button>
              <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-[7px] text-xs font-medium text-estrelinha-ink-soft"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <OrderSummary variant="sidebar" />
          </aside>
        </div>
      </div>

      {/* Fora do `StoreLayout`, a gaveta precisa ser montada aqui — mesmo motivo do `AuthOverlay`. */}
      <CartDrawer />
      <AuthOverlay />
    </div>
  )
}

export default CheckoutPage
