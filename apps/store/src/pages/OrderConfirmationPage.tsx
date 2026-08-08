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
import { NanaMascot } from '@estrelinha/ui/nana-mascot'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatEstimate } from '@estrelinha/core/shipping'
import { OrderTimeline, useOrder } from '@/entities/order'

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

  // Erro de rede e pedido inexistente dizem coisas diferentes — o hook os mantém distintos.
  if (isError || !order) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <NanaMascot size={110} expression="sad" />
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink">
            {isError ? 'Não conseguimos abrir este pedido' : 'Pedido não encontrado'}
          </h1>
          <p className="max-w-md text-estrelinha-ink-soft">
            {isError
              ? 'Tente novamente em alguns instantes. Seus pedidos ficam guardados em Minha conta.'
              : 'Confira o link ou veja a lista completa em Minha conta.'}
          </p>
          <Link
            to="/conta"
            className="rounded-sm border-2 border-estrelinha-ink px-7 py-4 font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]"
          >
            Ir para Minha conta
          </Link>
        </div>
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
          {/* CNF-04: a mascote pisca na confirmação — é a voz do estado (DESIGN.md §5). */}
          <div className="flex items-center justify-center rounded-full bg-estrelinha-ground-deep p-[22px]">
            <NanaMascot size={130} expression="wink" />
          </div>

          <div className="flex flex-col items-center gap-[10px]">
            <p className="estrelinha-eyebrow text-estrelinha-ink-soft">
              PEDIDO {order.order_number} · {paidStamp(order.paid_at)}
            </p>
            <h1 className="font-heading text-[38px] font-semibold leading-[1.1] tracking-[-0.035em] text-estrelinha-ink md:text-[50px]">
              {paid ? 'É nosso!' : 'Pedido registrado'}
            </h1>
            {/* STO-01: a promessa de e-mail agora É verdadeira (feature 10), e é diferenciada por
                `paid_at` — a variante pendente NÃO pode alegar comprovante enviado, porque o e-mail
                de aprovação só sai quando o pagamento cai. */}
            <p className="max-w-[480px] text-lg leading-[28px] text-estrelinha-ink-soft">
              {paid
                ? 'Pagamento confirmado — já estamos separando seus pins. Enviamos o comprovante para '
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

        {/* CNF-05: uma única pílula geleia — "Acompanhar pedido". A outra é contorno tinta. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/conta"
            className="flex flex-1 items-center justify-center gap-[10px] rounded-sm bg-estrelinha-primary px-[30px] py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:opacity-95"
          >
            <PackageCheck className="h-[19px] w-[19px]" aria-hidden />
            Acompanhar pedido
          </Link>
          <Link
            to="/"
            className="flex flex-1 items-center justify-center rounded-sm border-2 border-estrelinha-ink px-7 py-[17px] font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02]"
          >
            Ver mais pins
          </Link>
        </div>
      </div>
    </Shell>
  )
}

export default OrderConfirmationPage
