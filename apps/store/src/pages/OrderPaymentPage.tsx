// `/pedido/:id/pagamento` — a casa do PIX (feature `58`).
//
// Antes disto o pagamento não tinha endereço: o QR nascia dentro do bloco 3 do acordeão do
// checkout, abaixo da dobra no celular, e a tela **não sobrevivia a fechar a aba, não voltava pelo
// histórico e não abria em outro aparelho**. Uma rota resolve as três de uma vez, e é o mesmo
// movimento que `CNF-03` já tinha feito com a confirmação, pelo mesmo motivo.
//
// A página é orquestração: ela lê o pedido, decide se este pedido pode receber um PIX, e escolhe
// entre as duas superfícies — a espera (`PaymentProgress`) e as quatro telas do código
// (`PixSurface`). **Nenhuma regra do PIX mora aqui**: ela vive em `usePixPayment`.
//
// **Fora do `StoreLayout`**, como o checkout: header próprio, sem navegação de categorias, e sem o
// `MobileNav` fixo disputando o rodapé com o QR.
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useOrder } from '@/entities/order'
import {
  clearGuestEmail,
  markCartRecovered,
} from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { AuthOverlay } from '@/features/auth'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { PaymentProgress, PixSurface, usePixPayment } from '@/features/order-payment'
import { CheckoutHeader } from '@/widgets/checkout-header'
import { OrderAccessRefusal } from '@/widgets/order-access-refusal'

/**
 * A batida entre a confirmação e a navegação (`PIX-P2-04`).
 *
 * Quem está olhando para o QR precisa **ver a causa** do que vai acontecer: sem a pausa, a tela
 * troca sozinha e a pessoa não sabe se o pagamento caiu ou se ela clicou em algo. E a tela de
 * sucesso mantém o link manual à vista justamente para a pessoa não ficar presa se esta navegação
 * falhar.
 */
export const BATIDA_MS = 1200

/**
 * O casco da rota — e o `AuthOverlay` mora aqui pelo mesmo motivo que ele mora no `CheckoutPage`.
 *
 * Quem **liga** o overlay é uma store (`useAuthUiStore.open`); quem o **renderiza** são as páginas
 * que vivem fora do `StoreLayout`, porque lá o `StoreLayout` já o monta para a loja inteira. Esta
 * rota está fora dele por decisão (header próprio, sem `MobileNav` disputando o rodapé com o QR), e
 * sem esta linha o único botão que a convidada tem na recusa — "Entrar com código" — liga uma flag
 * que ninguém lê: um CTA que não faz nada, que é exatamente o defeito que abre a `spec.md` desta
 * feature.
 */
const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-white">
    <CheckoutHeader />
    {children}
    <AuthOverlay />
  </div>
)

/**
 * O pagamento em curso, com a máquina montada.
 *
 * Componente separado **por causa da ordem dos hooks**: `usePixPayment` pede um código ao banco no
 * instante em que monta, e a página precisa poder recusar antes disso — pedido cancelado, pago ou
 * de cartão não pode gerar cobrança nenhuma. Chamar o hook lá em cima e "ignorar o resultado"
 * deixaria a requisição sair do mesmo jeito.
 */
const PagamentoEmCurso = ({
  orderId,
  amount,
  orderNumber,
  customerEmail,
}: {
  orderId: string
  amount: number
  orderNumber: string
  customerEmail?: string
}) => {
  const navigate = useNavigate()
  const { state, generate, copy, copied } = usePixPayment(orderId)
  const orderHref = `/pedido/${orderId}`
  const clearCart = useCartStore((s) => s.clearCart)
  const clearCoupon = useCouponStore((s) => s.clearCoupon)

  /**
   * `PIX-P1-08` — **a limpeza do carrinho mudou de casa, e ganhou um recorte que antes não
   * precisava existir.**
   *
   * Até a feature `58` quem limpava carrinho, cupom e rascunho era o checkout, no `onApproved` do
   * PIX: ele continuava montado atrás do QR, então o pedido aprovado era necessariamente o que
   * aquele rascunho tinha acabado de criar. Com o pagamento em rota própria isso deixa de ser
   * verdade: esta rota é alcançável por link, por `/conta` e por `/pedido/:id` — e quem chega por
   * ali pode estar pagando um pedido **antigo** com uma sacola **nova** montada.
   *
   * O recorte é a comparação com o `orderId` do rascunho em curso. Sem ele, pagar um pedido de
   * ontem esvaziaria o carrinho de hoje, em silêncio, no instante em que a cliente mais confia na
   * loja. `markCartRecovered` fica **fora** do recorte de propósito: ele responde "este pedido
   * recuperou um carrinho abandonado?", e a resposta é do pedido — que traz o próprio e-mail —, não
   * do rascunho, que pode nem existir quando a rota abre em outro aparelho.
   */
  const jaConcluiu = useRef(false)
  useEffect(() => {
    if (state.kind !== 'approved' || jaConcluiu.current) return
    jaConcluiu.current = true

    if (customerEmail) void markCartRecovered(customerEmail, orderId)
    if (useCheckoutStore.getState().orderId !== orderId) return

    clearGuestEmail()
    clearCart()
    clearCoupon()
    useCheckoutStore.getState().reset()
  }, [state.kind, orderId, customerEmail, clearCart, clearCoupon])

  useEffect(() => {
    if (state.kind !== 'approved') return
    const timer = setTimeout(() => navigate(orderHref), BATIDA_MS)
    return () => clearTimeout(timer)
  }, [state.kind, navigate, orderHref])

  if (state.kind === 'generating') {
    return (
      <PaymentProgress
        step="code"
        amount={amount}
        orderNumber={orderNumber}
        slow={state.slow}
      />
    )
  }

  return (
    <PixSurface
      state={state}
      amount={amount}
      orderNumber={orderNumber}
      orderHref={orderHref}
      customerEmail={customerEmail}
      onGenerate={generate}
      onCopy={copy}
      copied={copied}
    />
  )
}

const OrderPaymentPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) {
    return (
      <Shell>
        <p className="py-20 text-center text-estrelinha-ink-soft">Carregando seu pedido...</p>
      </Shell>
    )
  }

  // A mesma recusa de `/pedido/:id`, pelo mesmo componente: as duas rotas leem o mesmo pedido pela
  // mesma porta e falham do mesmo jeito. Nunca um QR vazio.
  if (isError || !order) {
    return (
      <Shell>
        <div className="container mx-auto max-w-3xl py-14 md:py-20">
          <OrderAccessRefusal isError={isError} returnTo={`/pedido/${id}`} />
        </div>
      </Shell>
    )
  }

  /**
   * `PIX-P1-06` — esta rota é a superfície do **PIX de um pedido em aberto**, e mais nada.
   *
   * Os três casos têm o mesmo destino e motivos diferentes:
   *
   * - **já pago**: oferecer um QR aqui abriria caminho para uma SEGUNDA cobrança do mesmo pedido;
   * - **cancelado**: o pedido não existe mais como compra, e cobrar por ele seria cobrar por nada;
   * - **cartão**: o Brick precisa continuar montado no checkout para a retentativa de recusa
   *   funcionar (`PGM-08`), então o cartão nunca passa por aqui.
   *
   * `replace` para o botão "voltar" não cair de novo no redirect.
   */
  if (order.paid_at || order.status === 'cancelled' || order.payment_method !== 'pix') {
    return <Navigate to={`/pedido/${order.id}`} replace />
  }

  return (
    <Shell>
      <PagamentoEmCurso
        orderId={order.id}
        amount={order.total}
        orderNumber={order.order_number}
        customerEmail={order.customer_email}
      />
    </Shell>
  )
}

export default OrderPaymentPage
