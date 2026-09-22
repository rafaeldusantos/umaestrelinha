// Confirmação do pedido como **rota** (`/pedido/:id`) — CNF-03, CNF-04, CNF-05.
//
// A superfície é a rota, não um estado interno do `CheckoutPage`: a página lê o pedido do banco
// por `useOrder(id)`, então recarregar depois da aprovação continua mostrando a confirmação.
// Ela não toca no carrinho nem no cupom — a limpeza acontece **só** na aprovação, dentro do
// checkout (CNF-05).
//
// Escopo: o board `06` também desenha um bloco de upsell pós-compra. Ele está explicitamente
// fora de escopo (tabela Out of Scope da spec) — exige cobrar de novo sem novo checkout.
import { Link, useParams } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { formatEstimate } from '@estrelinha/core/shipping'
import { PixIcon } from '@estrelinha/ui/icons'
import { OrderTimeline, orderPaymentPath, podePagarComPix, useOrder } from '@/entities/order'
import { OrderAccessRefusal } from '@/widgets/order-access-refusal'
import { OrderMaterialBlock } from '@/widgets/order-material'

/**
 * Os materiais do pedido, do **snapshot dos itens** — nunca de uma releitura do catálogo.
 *
 * Mudar a exigência no cadastro não pode alterar pedido já criado (`MAT-05`), e um pedido que exige
 * dois materiais lista os dois, sem repetir quando duas linhas pedem o mesmo.
 */
const materiaisDoPedido = (items: { material_kinds?: string[] | null }[] = []): string[] => {
  const vistos: string[] = []
  for (const item of items ?? []) {
    for (const kind of item.material_kinds ?? []) {
      if (!vistos.includes(kind)) vistos.push(kind)
    }
  }
  return vistos
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="container mx-auto max-w-3xl py-14 md:py-20">{children}</div>
)

/** `formatEstimate(d, d)` é a formatação pt-BR de data única: `"em 27 de julho"`. */
const paidStamp = (paidAt: string | null): string => {
  if (!paidAt) return 'AGUARDANDO PAGAMENTO'
  const date = new Date(paidAt)
  if (Number.isNaN(date.getTime())) return 'PAGAMENTO CONFIRMADO'
  return `PAGO ${formatEstimate(date, date).toUpperCase()}`
}

const OrderConfirmationPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) {
    return (
      <Shell>
        <p className="text-center text-estrelinha-ink-soft">Carregando seu pedido...</p>
      </Shell>
    )
  }

  // Erro de rede e pedido inexistente dizem coisas diferentes — o hook os mantém distintos, e a
  // recusa em si mora num lugar só desde a feature `58`: `/pedido/:id/pagamento` falha igual.
  if (isError || !order) {
    return (
      <Shell>
        <OrderAccessRefusal isError={isError} returnTo={`/pedido/${id}`} />
      </Shell>
    )
  }

  const paid = !!order.paid_at
  const estimate =
    order.delivery_estimate_min && order.delivery_estimate_max
      ? { min: order.delivery_estimate_min, max: order.delivery_estimate_max }
      : null

  return (
    <Shell>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col items-center gap-[10px]">
            <p className="estrelinha-eyebrow text-estrelinha-ink-soft">
              PEDIDO {formatOrderNumber(order.order_number)} · {paidStamp(order.paid_at)}
            </p>
            <h1 className="font-heading text-[38px] font-semibold leading-[1.1] tracking-[-0.035em] text-estrelinha-ink md:text-[50px]">
              {paid ? 'É nosso!' : 'Pedido registrado'}
            </h1>
            {/* STO-01: a promessa de e-mail agora É verdadeira (feature 10), e é diferenciada por
                `paid_at` — a variante pendente NÃO pode alegar comprovante enviado, porque o e-mail
                de aprovação só sai quando o pagamento cai. */}
            <p className="max-w-[480px] text-lg leading-[28px] text-estrelinha-ink-soft">
              {paid
                ? 'Pagamento confirmado — já estamos preparando sua joia. Enviamos o comprovante para '
                : 'Estamos aguardando a confirmação do pagamento. Avisamos por e-mail assim que ele cair, em '}
              <strong className="font-semibold text-estrelinha-ink">{order.customer_email}</strong>. Este
              pedido também fica guardado em Minha conta → Pedidos.
            </p>
          </div>

          <p className="flex flex-wrap items-baseline justify-center gap-2 text-[15px] text-estrelinha-ink-soft">
            {paid ? 'Valor pago' : 'Valor do pedido'}
            <span className="font-heading text-xl font-semibold text-estrelinha-primary">
              {formatPrice(order.total)}
            </span>
          </p>
        </div>

        <OrderTimeline status={order.status} paidAt={order.paid_at} estimate={estimate} />

        {/* MAT-11. Fica DEPOIS da linha do tempo e antes dos CTAs: a linha do tempo é sobre o
            pagamento e a entrega — duas máquinas de estado independentes desta. O bloco some sozinho
            quando o pedido não espera material. */}
        <OrderMaterialBlock
          orderId={order.id}
          materialStatus={order.material_status}
          trackingCode={order.material_tracking_code}
          kinds={materiaisDoPedido(order.order_items)}
          cancelled={order.status === 'cancelled'}
        />

        {/*
          `PIX-P3-01`/`PIX-P3-02` (feature `58`): o pedido pendente de PIX ganhou **caminho de volta
          para pagar**. Até aqui esta tela oferecia "Acompanhar pedido" e "Ver mais joias", e nenhum
          caminho para pagar — quem saía do PIX sem pagar só voltava pelo diálogo de `/conta`, que a
          convidada não alcança sem entrar por código.

          `CNF-05` continua valendo, e é por isso que "Acompanhar pedido" **desce para contorno**
          quando o botão de pagar existe: duas pílulas cheias na mesma tela deixam de dizer qual é a
          ação da vez, justamente onde a ação da vez é pagar.
        */}
        <div className="flex flex-col gap-3">
          {podePagarComPix(order) ? (
            <Link
              to={orderPaymentPath(order.id)}
              className="flex items-center justify-center gap-[10px] rounded-sm bg-estrelinha-primary px-[30px] py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:opacity-95"
            >
              <PixIcon className="h-[18px] w-[18px]" aria-hidden />
              Pagar com PIX
            </Link>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/conta"
              className={
                podePagarComPix(order)
                  ? 'flex flex-1 items-center justify-center gap-[10px] rounded-sm border-2 border-estrelinha-ink px-7 py-[17px] font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]'
                  : 'flex flex-1 items-center justify-center gap-[10px] rounded-sm bg-estrelinha-primary px-[30px] py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:opacity-95'
              }
            >
              <PackageCheck className="h-[19px] w-[19px]" aria-hidden />
              Acompanhar pedido
            </Link>
            <Link
              to="/"
              className="flex flex-1 items-center justify-center rounded-sm border-2 border-estrelinha-ink px-7 py-[17px] font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]"
            >
              Ver mais joias
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default OrderConfirmationPage
