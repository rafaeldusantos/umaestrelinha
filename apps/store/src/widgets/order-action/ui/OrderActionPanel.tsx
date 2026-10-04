// O estado do topo do detalhe do pedido — o que pede ação, um por vez (feature 59, `DET-02`).
//
// É o PRIMEIRO bloco depois do título em `/pedido/:id`, conforme o quadro "Estados do topo" do
// Paper. Quem decide qual estado é `orderActionState` (`../lib`), e a página passa a resposta para
// cá — a mesma resposta que ela usa para escolher a única pílula cheia da tela (`CNF-05`).
//
// Cada estado reusa o dono do assunto: o material é o `OrderMaterialBlock` no modo do topo; o
// cancelado é a `OrderJourney`, que já desenha "Pedido cancelado" com a data do histórico
// (`DET-08`) — escrito aqui também, o texto do cancelamento teria dois donos.
import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber, repixDeadline } from '@estrelinha/core/orders'
import { PixIcon } from '@estrelinha/ui/icons'
import { OrderJourney, deadlineLabel, type OrderDetail } from '@/entities/order'
import { whatsappHref } from '@/shared/lib/whatsapp'
import { OrderMaterialBlock } from '@/widgets/order-material'
import type { OrderActionState } from '../lib/orderActionState'

export interface OrderActionPanelProps {
  order: OrderDetail
  /** De `orderActionState(order, agora)`. `null` ⇒ nada pede ação, e o painel não existe. */
  state: OrderActionState | null
  /** O endereço da rota do pagamento (`orderPaymentPath`) — "Pagar com PIX" e "Gerar novo PIX". */
  paymentHref: string
  /** Os materiais do snapshot dos itens, para o bloco do material. */
  materialKinds: readonly string[]
}

/** O cartão com a borda esquerda de 3px — a cor da borda diz o tom do estado. */
const Cartao = ({
  borda,
  titulo,
  children,
}: {
  borda: string
  titulo: string
  children: React.ReactNode
}) => (
  <section
    aria-label={titulo}
    className={`flex flex-col gap-3 rounded-md border border-l-[3px] border-estrelinha-line bg-estrelinha-surface p-4 ${borda}`}
  >
    <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">{titulo}</h2>
    {children}
  </section>
)

/** "Valor  R$ 412,80" — a linha do valor dos estados de pagamento. */
const Valor = ({ total }: { total: number }) => (
  <p className="flex items-baseline justify-between gap-4 text-sm text-estrelinha-ink-soft">
    Valor
    <span className="whitespace-nowrap text-base font-semibold text-estrelinha-ink">
      {formatPrice(total)}
    </span>
  </p>
)

/** O botão cheio dos estados de pagamento. É a única pílula cheia da tela (`CNF-05`). */
const BotaoPagar = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    to={href}
    className="flex min-h-12 items-center justify-center gap-[10px] rounded-sm bg-estrelinha-primary px-6 py-3 font-heading text-[17px] font-semibold text-white transition-opacity hover:opacity-95 motion-reduce:transition-none"
  >
    <PixIcon className="h-[18px] w-[18px]" aria-hidden />
    {children}
  </Link>
)

/**
 * "Conversar no WhatsApp" do pagamento perdido. Componente próprio porque lê `store_settings` (um
 * `useQuery`) e só deve montar quando o estado aparece. Sem número configurado, some — fica o texto.
 */
const ConversarNoWhatsApp = ({ orderNumber }: { orderNumber: string }) => {
  const { whatsapp } = useGeneralSettings()
  const href = whatsappHref(
    whatsapp,
    `Olá! Quero retomar o pedido ${formatOrderNumber(orderNumber)}.`,
  )
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-estrelinha-field px-5 py-2.5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none sm:self-start"
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      Conversar no WhatsApp
    </a>
  )
}

const OrderActionPanel = ({ order, state, paymentHref, materialKinds }: OrderActionPanelProps) => {
  switch (state) {
    case 'cancelled':
      return <OrderJourney order={order} events={order.status_events} />

    case 'material':
      return (
        <OrderMaterialBlock
          variant="acao"
          orderId={order.id}
          orderNumber={order.order_number}
          materialStatus={order.material_status}
          trackingCode={order.material_tracking_code}
          kinds={materialKinds}
        />
      )

    case 'pix_pending':
      return (
        <Cartao borda="border-l-estrelinha-accent" titulo="Pagamento pendente">
          <p className="text-sm leading-[22px] text-estrelinha-ink-soft">
            O código PIX deste pedido ainda está valendo. Assim que o pagamento cair, a gente começa
            a preparar a sua joia.
          </p>
          <Valor total={order.total} />
          <BotaoPagar href={paymentHref}>Pagar com PIX</BotaoPagar>
        </Cartao>
      )

    case 'repix': {
      const ate = deadlineLabel(repixDeadline(order))
      return (
        <Cartao
          borda="border-l-[#A6534F]"
          titulo={order.payment_status === 'rejected' ? 'O PIX foi recusado' : 'O código PIX expirou'}
        >
          <p className="text-sm leading-[22px] text-estrelinha-ink-soft">
            O seu pedido continua guardado. Gere um código novo para concluir
            {ate ? ` — dá para fazer isso até ${ate}.` : '.'}
          </p>
          <Valor total={order.total} />
          <BotaoPagar href={paymentHref}>Gerar novo PIX</BotaoPagar>
        </Cartao>
      )
    }

    case 'payment_lost':
      return (
        <Cartao borda="border-l-[#A6534F]" titulo="O pagamento não foi concluído">
          <p className="text-sm leading-[22px] text-estrelinha-ink-soft">
            Fale com a Adri para retomar este pedido. Ela confere o valor e o prazo com você.
          </p>
          <ConversarNoWhatsApp orderNumber={order.order_number} />
        </Cartao>
      )

    default:
      return null
  }
}

export default OrderActionPanel
