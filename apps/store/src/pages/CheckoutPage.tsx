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
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'
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
import { PaymentProgress } from '@/features/order-payment'
import { CartDrawer } from '@/widgets/cart-drawer'
import { CheckoutHeader } from '@/widgets/checkout-header'
import { useCouponStore } from '@/entities/coupon'
import { NeedsOtpError, useCreateOrder } from '@/entities/order/api/useOrders'
import { orderPaymentPath } from '@/entities/order/lib/podePagarComPix'
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

/**
 * CHK-12: só o que a loja realmente garante sob o CTA.
 *
 * A troca em 7 dias e a embalagem protegida saíram daqui em 2026-10-04, por decisão do usuário: a
 * faixa sob o botão de pagar ficou com uma afirmação só, a de quem processa o pagamento.
 */
const TRUST_ITEMS = [{ icon: ShieldCheck, label: 'Pagamento processado por Mercado Pago' }]

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
  // `orderId` deixou de ser LIDO por esta tela na feature `58`: ele existia para o `PaymentBlock`
  // trocar o bloco 3 pelo QR. Quem o lê agora é `handleConfirm`, por `getState()`, no instante em
  // que decide criar ou reusar o pedido — assinar a mudança aqui faria a página renderizar de novo
  // sem nada para mostrar de diferente.
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
  //
  // **A comparação é contra a identidade GRAVADA COM O PEDIDO, não contra um `useRef`.**
  //
  // Um ref nasce cego a cada montagem: para ele a primeira passada nunca é troca. Enquanto o
  // checkout ficava montado atrás do QR isso não tinha consequência — a pessoa não tinha como
  // entrar na conta sem sair daqui. Desde a feature `58` sair daqui é o fluxo normal: o PIX
  // entrega o bastão para `/pedido/:id/pagamento` e `PIX-P1-08` preserva `orderId` de propósito. O
  // percurso que o ref deixava passar termina em 403 — convidada cria o pedido, não paga, entra na
  // conta pelo header (que só existe fora desta rota), volta ao `/checkout`, e o CTA REUSA o pedido
  // de convidada (`PGM-08`), que `create-payment` recusa por não ser dela.
  //
  // `orderIdentity` vive no `checkoutStore`, ao lado do `orderId` que ele descreve, e sobrevive à
  // remontagem e ao reload. Sem pedido em curso não há o que invalidar, então não existe mais o
  // problema da "primeira leitura": a pergunta só é feita quando ela tem sujeito.
  useEffect(() => {
    // Enquanto a sessão está sendo resolvida, `user` é `null` por ausência de resposta — não por
    // ausência de sessão. Agir aqui descartaria o pedido de quem ESTÁ logada, a cada reload.
    if (loading) return
    const { orderId, orderIdentity } = useCheckoutStore.getState()
    if (!orderId || orderIdentity === (user?.id ?? null)) return
    useCheckoutStore.getState().invalidateOrder()
  }, [user?.id, loading])

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

  /**
   * `PIX-P1-01` — **o CTA acionado troca a tela, não o estado do botão.**
   *
   * Até a feature `58` o clique deixava o mesmo botão no lugar, com 50% de opacidade e o mesmo
   * rótulo, enquanto duas chamadas de rede aconteciam em sequência. Quem está comprando não tinha
   * como distinguir "a loja está trabalhando" de "meu toque não pegou" — e a tela ficava assim por
   * até 30 segundos, num momento em que recarregar a página é a reação natural.
   *
   * **Só o PIX passa por aqui.** No cartão o Brick precisa continuar montado depois da criação do
   * pedido, senão o formulário preenchido e o token se perdem e a retentativa de uma recusa morre
   * (`PGM-08`) — então o caminho do cartão segue exatamente como era, com o CTA desabilitado.
   *
   * O header é o MESMO das duas telas seguintes (`PIX-P1-02`): é ele que faz a espera ler como um
   * caminho só, e não como três telas empilhadas.
   */
  if (busy && payment.method !== 'card') {
    return (
      <div className="min-h-screen bg-white">
        <CheckoutHeader />
        <PaymentProgress step="order" amount={totals.total} />
      </div>
    )
  }

  const ctaLabel = `Pagar ${formatPrice(totals.total)} ${
    payment.method === 'card' ? 'no cartão' : 'com PIX'
  }`

  /**
   * Aprovação **do cartão** — o carrinho e o cupom são limpos aqui (CNF-05).
   *
   * Até a feature `58` esta função também respondia pelo PIX, porque o QR nascia dentro do bloco 3
   * e o checkout continuava montado esperando o Realtime. Com o pagamento em rota própria o
   * checkout já está desmontado quando o PIX cai: **a limpeza do caminho PIX mudou de casa** para
   * `OrderPaymentPage`, e lá ela ganhou o recorte de `PIX-P1-08` — que aqui não precisa existir,
   * porque o pedido que o cartão acabou de aprovar é, por construção, o que este rascunho criou.
   */
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
          // `IDN-07`: e a identidade de quem o criou vai junto — é contra ela que a volta ao
          // checkout compara, e por isso ela precisa nascer no mesmo instante que o pedido.
          useCheckoutStore
            .getState()
            .setOrder(newOrderId, useCheckoutStore.getState().draft(), user?.id ?? null)
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

      /**
       * `PIX-P1-02` — no PIX o checkout acaba aqui, entregando o bastão para a ROTA do pedido.
       *
       * Era `PGM-07`: "o pedido passou a existir e o bloco troca sozinho para o QR". O bloco não
       * troca mais nada — a superfície do PIX tem endereço próprio, e é isso que a faz sobreviver
       * a fechar a aba, voltar pelo histórico e abrir em outro aparelho.
       *
       * **A navegação vem antes de qualquer pedido de código**, e a ordem é o requisito: quem pede
       * o código é a rota, no instante em que ela monta. Pedi-lo aqui e navegar depois devolveria a
       * espera para uma tela que a pessoa está prestes a deixar — e, se a navegação falhasse, o
       * código nasceria numa tela sem QR.
       *
       * A limpeza do carrinho **não acontece aqui** (`PIX-P1-08`): o pedido ainda não foi pago.
       *
       * O endereço vem de `orderPaymentPath`, que é o dono declarado dele — montá-lo à mão aqui
       * seria a terceira grafia da mesma rota (`/conta` e `/pedido/:id` já chamam o dono), e a
       * divergência não quebra nada: renomear a rota nas outras pontas deixaria **este** literal
       * para trás, com a suíte verde e o checkout navegando para um 404.
       */
      if (!isCard) {
        navigate(orderPaymentPath(payingOrderId))
        return
      }
      if (!cardForm) return

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
              próprio min-content**. Os blocos colapsados usavam `truncate` (= `white-space:
              nowrap`), então o min-content deles era o texto INTEIRO — um endereço longo media
              436px dentro de uma viewport de 390 e punha scroll horizontal no body, que a premissa
              mobile do projeto proíbe. Desde 2026-10-04 a prévia quebra linha (`break-words`), mas
              o `min-w-0` continua sendo carga: `break-word` não reduz o min-content, e um e-mail
              sem espaço é uma palavra só. Medido em 390×844: 452px → 390px. */}
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
                Voltar à sacola
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
            {/* `PIX-P1-05`: o bloco deixou de receber `orderId` e `onApproved` na feature `58` —
                ele não troca mais de conteúdo quando o pedido passa a existir, porque a superfície
                do pagamento saiu daqui para a rota dele. */}
            <PaymentBlock
              open={openBlock === 'payment'}
              complete={isComplete('payment')}
              onEdit={() => setEditing('payment')}
              amount={totals.total}
              cardError={cardError}
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
