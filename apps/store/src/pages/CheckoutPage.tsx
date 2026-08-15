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
// Por isso o `AuthOverlay` é montado aqui: é ele que atende CHK-02.
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, MessageCircle, Package, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { formatPrice } from '@estrelinha/core/formatters'
import { isValidDocument, stripCep } from '@estrelinha/core/validators'
import { applyOrderBump } from '@estrelinha/core/payment/pricing'
import { friendlyMessage } from '@estrelinha/core/payment/status'
import { primaryImage } from '@estrelinha/core/media'
import { normalizeOptions } from '@estrelinha/core/product'
import {
  initialMaterialStatus,
  materialKindsOf,
  requiresMaterial,
} from '@estrelinha/core/material'
import { hasSellableGrid } from '@/entities/product/lib/variantSelection'
import { resolveFlow, type BlockId } from '@estrelinha/core/checkout'
import { useAuthContext } from '@estrelinha/auth'
import { supabase } from '@estrelinha/supabase/client'
import type { CardPaymentFormData, CardPaymentResponse } from '@estrelinha/supabase/types'
import {
  findItemsMissingVariant,
  missingVariantMessage,
} from '@/features/checkout/lib/requireVariantSelection'
import { getCardFormData } from '@/features/checkout/lib/cardBrick'
import {
  useCreatePayment,
  PAYMENT_UNAVAILABLE_MESSAGE,
} from '@/features/checkout/api/useCreatePayment'
import { useCartStore, useCartUiStore } from '@/entities/cart'
import { CartDrawer } from '@/widgets/cart-drawer'
import { useCouponStore } from '@/entities/coupon'
import { useCreateOrder } from '@/entities/order/api/useOrders'
import { useSaveCustomerCpf } from '@/entities/customer'
import { useSaveAddress } from '@/entities/address'
import { AuthOverlay, useAuthUiStore } from '@/features/auth'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { useCheckoutTotals } from '@/features/checkout/model/useCheckoutTotals'
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
export const NO_CUSTOMER_MESSAGE =
  'Não foi possível identificar sua conta. Saia e entre novamente para concluir a compra.'
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

/** CHK-12: só o que `pages/PoliciesPage.tsx` realmente promete. */
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
  const openAuth = useAuthUiStore((s) => s.open)

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
  const saveCpf = useSaveCustomerCpf()
  const saveAddress = useSaveAddress()

  const [editing, setEditing] = useState<BlockId | null>(null)
  /** FLW-03: blocos que a pessoa fechou clicando em `Continuar`. Não sobrevive ao reload. */
  const [confirmed, setConfirmed] = useState<BlockId[]>([])
  const [busy, setBusy] = useState(false)
  /** Erro da tentativa de cartão. Não vai para o store: é de uma tentativa, não do rascunho. */
  const [cardError, setCardError] = useState<string | null>(null)

  const flow = useMemo(
    () =>
      resolveFlow(
        { contact, address, shipping, payment, bumpChecked },
        { dirty, confirmed, editing },
      ),
    [contact, address, shipping, payment, bumpChecked, dirty, confirmed, editing],
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

  // CHK-02: sem sessão o overlay abre sozinho, com o retorno para o próprio checkout.
  useEffect(() => {
    if (!loading && !user) openAuth({ returnTo: '/checkout' })
  }, [loading, user, openAuth])

  if (loading) {
    return <div className="container py-20 text-center text-estrelinha-ink-soft">Carregando...</div>
  }

  if (!user) {
    return (
      <>
        <CheckoutHeader />
        <div className="container mx-auto max-w-md py-20 text-center">
          <h1 className="mb-3 font-heading text-2xl font-bold text-estrelinha-ink">
            Faça login para continuar
          </h1>
          <p className="mb-6 text-estrelinha-ink-soft">
            Você precisa estar logada para finalizar a compra.
          </p>
          <Button
            onClick={() => openAuth({ returnTo: '/checkout' })}
            className="rounded-sm border-0 bg-estrelinha-primary text-white transition-all hover:scale-[1.02] hover:bg-estrelinha-primary hover:opacity-95"
          >
            Entrar ou Criar Conta
          </Button>
        </div>
        <AuthOverlay />
      </>
    )
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

    if (!customer?.id) {
      toast.error(NO_CUSTOMER_MESSAGE)
      return
    }

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
        payerDocument = cardForm.payer?.identification?.number || customer.cpf || ''
        if (!isValidDocument(payerDocument)) {
          setCardError(MISSING_DOCUMENT_MESSAGE)
          return
        }
      }

      try {
        // PGD-03: sem documento no banco o servidor montaria o pagamento sem pagador — bloqueia.
        await saveCpf.mutateAsync({ customerId: customer.id, cpf: payerDocument })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : ORDER_FAILED_MESSAGE)
        return
      }

      // ADR-03: `addresses` é conveniência para a próxima compra — falhar aqui não bloqueia.
      await saveAddress
        .mutateAsync({
          customerId: customer.id,
          address: {
            cep: stripCep(address.cep),
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
          },
        })
        .catch(() => ({ saved: false }))

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

      // BMP-03: `order_items.unit_price` já sai descontado; o servidor recalcula pelo `product_id`
      // (BMP-04). ⚠️ A lista descontada serve só para persistir — `calculateOrderTotals` recebe
      // preço cheio + `bump` dentro de `useCheckoutTotals` (carry-forward #1).
      const priced = applyOrderBump(pricingItems, bump)
      const orderItems = [
        ...items.map((item, index) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: primaryImage(item.product.images)?.url ?? null,
          size: item.size || null,
          finish: item.finish || null,
          quantity: item.quantity,
          unit_price: priced[index].unit_price,
          // 07/T16 (PST-03): a variação escolhida vai para o pedido, e o caminho de preço é
          // CONGELADO aqui. O servidor obedece este `price_source` e não reavalia se o produto tem
          // grade — sem isso, criar ou pausar uma variação entre o pedido e o pagamento mudaria o
          // valor de um pedido já fechado (A8).
          variant_id: item.variantId,
          price_source: (item.variantId ? 'variant' : 'base') as 'base' | 'variant',
          // Snapshot: o histórico do pedido tem de ser legível sem join em `product_variants`, que
          // pode ter sido pausada ou reeditada depois da compra.
          variant_label: item.variantLabel || null,
          variant_options: Object.keys(item.optionValues ?? {}).length ? item.optionValues : null,
          // MAT-05: o material exigido e o texto gravado, congelados NO PEDIDO. Saem do snapshot do
          // produto que está no carrinho, não de uma releitura do catálogo — mudar a exigência no
          // cadastro depois não pode alterar pedido já criado.
          requires_material: requiresMaterial(item.product),
          material_kinds: materialKindsOf(item.product),
          engraving_text: item.engravingText ?? null,
        })),
        ...(bumpProduct
          ? [
              {
                product_id: bumpProduct.id,
                product_name: bumpProduct.name,
                product_image: primaryImage(bumpProduct.images)?.url ?? null,
                size: null,
                finish: null,
                quantity: 1,
                unit_price: priced[items.length].unit_price,
                // O bump é sempre o produto inteiro, nunca uma linha da grade — a oferta do lojista
                // aponta para um `product_id`, não para uma variação.
                variant_id: null,
                price_source: 'base' as const,
                variant_label: null,
                variant_options: null,
                // O bump nunca é peça de material: a oferta do lojista aponta para um `product_id`
                // avulso, fora do fluxo de curadoria. Se um dia apontar para uma joia afetiva, esta
                // linha precisa passar a ler o produto — está declarado aqui para não passar batido.
                requires_material: false,
                material_kinds: [],
                engraving_text: null,
              },
            ]
          : []),
      ]

      // PGM-08: pedido `pending` já existente é REUSADO — só cria quem ainda não tem. Criar um
      // segundo deixaria lixo `pending` e faria a retentativa cobrar um pedido diferente do que a
      // cliente conferiu no resumo.
      let payingOrderId = useCheckoutStore.getState().orderId
      if (!payingOrderId) {
        try {
          const order = await createOrder.mutateAsync({
            customer_name: contact.name,
            customer_email: contact.email,
            customer_id: customer.id,
            payment_method: payment.method ?? 'pix',
            address_street: address.street,
            address_number: address.number,
            address_neighborhood: address.neighborhood,
            address_city: address.city,
            address_state: address.state,
            // ADR-05: 8 dígitos sem máscara — é o que o backoffice consome em `MelhorEnvioTab`.
            address_zip: stripCep(address.cep),
            address_complement: address.complement,
            // SHP-07: snapshot do envio escolhido; recotação posterior não o altera.
            shipping_service_id: shipping?.serviceId,
            shipping_carrier: shipping?.carrier,
            shipping_method: shipping?.serviceName,
            delivery_estimate_min: shipping?.estimateMin || undefined,
            delivery_estimate_max: shipping?.estimateMax || undefined,
            subtotal: totals.subtotal,
            discount: totals.couponDiscount,
            shipping_cost: totals.shipping,
            total: totals.total,
            coupon_code: coupon?.code,
            coupon_id: coupon?.id,
            // PRM-12: registra o desconto de faixa que ESTA tela exibiu, para o `create-payment`
            // ter contra o que comparar o recálculo. A regra do `promotion_id` é copiada do
            // servidor (`handlers.ts`): uma promoção ⇒ o id; zero ou mais de uma ⇒ `null`, porque a
            // coluna é FK única e a verdade de "quanto" fica em `promotion_discount`.
            promotion_id: applied.length === 1 ? applied[0].promotion_id : null,
            promotion_discount: promotionDiscount,
            // MAT-07: um item que exige material põe o pedido inteiro na fila — inclusive quando
            // exige SEM dizer qual. A fila é sobre "algo está a caminho", não sobre saber o quê.
            material_status: initialMaterialStatus(orderItems),
            items: orderItems,
          })
          const newOrderId = (order as { id?: string } | null)?.id
          if (!newOrderId) throw new Error('Pedido sem id')
          // CHK-08: o snapshot é a base da comparação de "algum bloco mudou desde a criação".
          useCheckoutStore.getState().setOrder(newOrderId, useCheckoutStore.getState().draft())
          setEditing(null)
          payingOrderId = newOrderId
        } catch {
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

            <ContactBlock
              open={openBlock === 'contact'}
              complete={isComplete('contact')}
              onEdit={() => setEditing('contact')}
              onContinue={() => confirmBlock('contact')}
              canContinue={isComplete('contact')}
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
