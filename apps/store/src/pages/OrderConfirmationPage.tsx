// `/pedido/:id` — o DETALHE do pedido, e o único (feature 59, `DET-01..12`; antes: CNF-03..05).
//
// A mesma página é a confirmação logo depois da compra e a volta pela conta: duas superfícies
// desenhando o mesmo pedido divergiriam (é o raciocínio do `AD-042` para o PIX). A conta é lista +
// pendências e LINKA para cá.
//
// A superfície é a rota, não um estado interno do `CheckoutPage`: a página lê o pedido do banco por
// `useOrder(id)`, então recarregar continua mostrando o pedido. Ela não toca no carrinho nem no
// cupom — a limpeza acontece **só** na aprovação, dentro do fluxo de pagamento (CNF-05).
//
// Ordem dos blocos (`design.md`): cabeçalho · estado do topo · rastreio · linha do tempo · material ·
// peças · pagamento e entrega · ajuda · as duas ações do `CNF-05`.
//
// Escopo: o board `06` também desenha um bloco de upsell pós-compra. Ele está explicitamente
// fora de escopo (tabela Out of Scope da spec) — exige cobrar de novo sem novo checkout.
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, PackageCheck } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import {
  CONFIRMATION_HEADLINES,
  confirmationHeadline,
  OrderItemsSummary,
  OrderJourney,
  OrderPaymentDelivery,
  OrderSituationBadge,
  OrderTrackingCard,
  orderDateLabel,
  orderPaymentPath,
  piecesLabel,
  podePagarComPix,
  useOrder,
} from '@/entities/order'
import { OrderAccessRefusal } from '@/widgets/order-access-refusal'
import { ACAO_PRIMARIA, OrderActionPanel, orderActionState } from '@/widgets/order-action'
import { OrderHelp } from '@/widgets/order-help'
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
  <div className="container mx-auto max-w-2xl py-6 md:py-12">{children}</div>
)

const OrderConfirmationPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError } = useOrder(id)
  const { user } = useAuthContext()

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

  const headline = confirmationHeadline(order)
  const kinds = materiaisDoPedido(order.order_items)
  // `DET-02`: o estado que pede ação, um por vez. A janela de 7 dias do PIX novo é lida contra o
  // relógio do aparelho — limite conhecido e aceito na spec (regra de oferta, não de autorização).
  const acao = orderActionState(order, new Date())
  // `CNF-05`: uma pílula cheia só. Quando o topo traz a ação da vez — pagar o PIX em aberto
  // (`podePagarComPix`), gerar um PIX novo, enviar o código do material —, "Acompanhar pedido"
  // desce para contorno: duas pílulas cheias deixam de dizer qual é a ação.
  const acaoNoTopo = podePagarComPix(order) || (acao !== null && ACAO_PRIMARIA.includes(acao))
  const feitoEm = orderDateLabel(order.created_at)

  return (
    <Shell>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          {/* `DET-01`: "Meus pedidos" só com sessão — a convidada não tem conta em que voltar. */}
          {user && (
            <Link
              to="/conta"
              className="flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-estrelinha-primary hover:underline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Meus pedidos
            </Link>
          )}
          {/* `DET-01` (decisão do usuário, 2026-10-04): o título é o NÚMERO, que é o que a cliente
              cita no WhatsApp — e ele aparece uma vez só na página. A frase calorosa virou
              subtítulo e muda com a etapa (`confirmationHeadline`). Revoga a linha em caixa alta
              "PEDIDO #N · PAGO EM …" (`PIX-P4-03`) e o título "É nosso!" (`CNF-04`). */}
          <h1 className="font-heading text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-estrelinha-ink">
            Pedido {formatOrderNumber(order.order_number)}
          </h1>
          {headline && (
            <p className="font-heading text-lg text-estrelinha-ink">{CONFIRMATION_HEADLINES[headline]}</p>
          )}
          <p className="text-sm text-estrelinha-ink-soft">
            {feitoEm ? `Feito em ${feitoEm} · ` : ''}
            {piecesLabel(order.order_items)} · {formatPrice(order.total)}
          </p>
          {/* STO-01: a promessa de e-mail é verdadeira (feature 10), e é diferenciada por
              `paid_at` — a variante pendente NÃO pode alegar comprovante enviado, porque o e-mail
              de aprovação só sai quando o pagamento cai. Ela anda junto com o subtítulo: depois de
              enviado, "já estamos preparando sua joia" deixa de ser verdade. */}
          {headline && (
            <p className="text-[15px] leading-[22px] text-estrelinha-ink-soft">
              {headline === 'pago'
                ? 'Pagamento confirmado — já estamos preparando sua joia. Enviamos o comprovante para '
                : 'Estamos aguardando a confirmação do pagamento. Avisamos por e-mail assim que ele cair, em '}
              <strong className="font-semibold text-estrelinha-ink">{order.customer_email}</strong>. Este
              pedido também fica guardado em Minha conta → Pedidos.
            </p>
          )}
          <OrderSituationBadge order={order} events={order.status_events} className="self-start" />
        </header>

        <OrderActionPanel
          order={order}
          state={acao}
          paymentHref={orderPaymentPath(order.id)}
          materialKinds={kinds}
        />

        <OrderTrackingCard code={order.tracking_code} carrier={order.shipping_carrier} />

        {/* `DET-08`: cancelado, a linha do tempo dá lugar a "Pedido cancelado" — e quem o desenha é
            o estado do topo, então ela não se repete aqui. */}
        {acao !== 'cancelled' && <OrderJourney order={order} events={order.status_events} />}

        {/* MAT-11 / `DET-09`. Quando o material é a ação da vez ele já está no topo; aqui mora o
            bloco dos demais estados. O bloco some sozinho quando o pedido não espera material. */}
        {acao !== 'material' && (
          <OrderMaterialBlock
            orderId={order.id}
            orderNumber={order.order_number}
            materialStatus={order.material_status}
            trackingCode={order.material_tracking_code}
            kinds={kinds}
            cancelled={order.status === 'cancelled'}
          />
        )}

        <OrderItemsSummary order={order} />

        <OrderPaymentDelivery order={order} />

        <OrderHelp orderNumber={order.order_number} />

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            to="/conta"
            className={
              acaoNoTopo
                ? 'flex flex-1 items-center justify-center gap-[10px] rounded-sm border-2 border-estrelinha-ink px-7 py-[17px] font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02] motion-reduce:transition-none'
                : 'flex flex-1 items-center justify-center gap-[10px] rounded-sm bg-estrelinha-primary px-[30px] py-[19px] font-heading text-[17px] font-semibold text-white transition-all hover:opacity-95 motion-reduce:transition-none'
            }
          >
            <PackageCheck className="h-[19px] w-[19px]" aria-hidden />
            Acompanhar pedido
          </Link>
          <Link
            to="/"
            className="flex flex-1 items-center justify-center rounded-sm border-2 border-estrelinha-ink px-7 py-[17px] font-heading text-[17px] font-semibold text-estrelinha-ink transition-all hover:scale-[1.02] motion-reduce:transition-none"
          >
            Ver mais joias
          </Link>
        </div>
      </div>
    </Shell>
  )
}

export default OrderConfirmationPage
