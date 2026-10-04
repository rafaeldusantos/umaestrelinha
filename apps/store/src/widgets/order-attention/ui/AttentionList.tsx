// "Precisa da sua atenção" — o topo da conta (feature 59, `PEN-01..04`, `PEN-07`).
//
// Cada cartão leva ao lugar onde a pendência se resolve, em um toque: a rota do pagamento, o campo
// do código no detalhe do pedido (`/pedido/:id#material`) ou o guia de material. Quais pendências e
// em que ordem é `accountAttention` (`entities/order`); aqui mora o desenho.
//
// Sem pendência, o bloco inteiro — título incluído — não existe (`PEN-07`).
import { AlertCircle, Clock, MessageCircle, PackageOpen, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { MATERIAL_GUIDE_PATH } from '@estrelinha/core/routes'
import {
  accountAttention,
  deadlineLabel,
  orderPaymentPath,
  type AttentionItem,
  type Order,
} from '@/entities/order'
import { whatsappHref } from '@/shared/lib/whatsapp'

export interface AttentionListProps {
  orders: readonly Order[] | null | undefined
  /** O relógio da janela de 7 dias. Parâmetro para o teste; a tela usa o do aparelho. */
  now?: Date
}

const BOTAO_CHEIO =
  'flex min-h-11 items-center justify-center rounded-sm bg-estrelinha-primary px-4 py-2 text-[15px] font-semibold text-white transition-opacity hover:opacity-95 motion-reduce:transition-none'
const BOTAO_CONTORNO =
  'flex min-h-11 items-center justify-center gap-2 rounded-sm border border-estrelinha-field px-4 py-2 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none'

/** O cartão: borda esquerda de 3px no tom, disco de 40px com o ícone, título, texto e ações. */
const Cartao = ({
  tom,
  icone,
  titulo,
  texto,
  children,
}: {
  tom: 'wait' | 'alert'
  icone: React.ReactNode
  titulo: string
  texto: string
  children: React.ReactNode
}) => (
  <li
    className={`flex gap-3 rounded-md border border-l-[3px] border-estrelinha-line bg-estrelinha-surface p-4 ${
      tom === 'alert' ? 'border-l-[#A6534F]' : 'border-l-estrelinha-accent'
    }`}
  >
    <span
      aria-hidden
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        tom === 'alert'
          ? 'bg-estrelinha-alert-soft text-estrelinha-alert'
          : 'bg-estrelinha-wait-soft text-estrelinha-wait'
      }`}
    >
      {icone}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold leading-5 text-estrelinha-ink">{titulo}</h3>
        <p className="break-words text-sm leading-5 text-estrelinha-ink-soft">{texto}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  </li>
)

/** "Conversar no WhatsApp" do pagamento perdido — some sem número da loja configurado. */
const ConversarNoWhatsApp = ({ orderNumber }: { orderNumber: string }) => {
  const { whatsapp } = useGeneralSettings()
  const href = whatsappHref(whatsapp, `Olá! Quero retomar o pedido ${formatOrderNumber(orderNumber)}.`)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={BOTAO_CONTORNO}>
      <MessageCircle className="h-4 w-4" aria-hidden />
      Conversar no WhatsApp
    </a>
  )
}

const Pendencia = ({ item }: { item: AttentionItem }) => {
  const { order } = item
  const pedidoEValor = `Pedido ${formatOrderNumber(order.order_number)} · ${formatPrice(order.total)}`

  switch (item.kind) {
    case 'pay_pending':
      return (
        <Cartao tom="wait" icone={<Clock className="h-5 w-5" />} titulo="Pagamento pendente" texto={pedidoEValor}>
          <Link to={orderPaymentPath(order.id)} className={BOTAO_CHEIO}>
            Pagar com PIX
          </Link>
        </Cartao>
      )

    case 'repix': {
      const ate = deadlineLabel(item.deadline)
      return (
        <Cartao
          tom="alert"
          icone={<RefreshCw className="h-5 w-5" />}
          titulo={order.payment_status === 'rejected' ? 'O PIX foi recusado' : 'O código PIX expirou'}
          texto={ate ? `${pedidoEValor}. Dá para gerar um código novo até ${ate}.` : pedidoEValor}
        >
          <Link to={orderPaymentPath(order.id)} className={BOTAO_CHEIO}>
            Gerar novo PIX
          </Link>
        </Cartao>
      )
    }

    case 'payment_lost':
      return (
        <Cartao
          tom="alert"
          icone={<AlertCircle className="h-5 w-5" />}
          titulo="O pagamento não foi concluído"
          texto={`${pedidoEValor}. Fale com a Adri para retomar este pedido.`}
        >
          <ConversarNoWhatsApp orderNumber={order.order_number} />
        </Cartao>
      )

    case 'material':
      return (
        <Cartao
          tom="wait"
          icone={<PackageOpen className="h-5 w-5" />}
          titulo="Aguardamos o seu material"
          texto={[`Pedido ${formatOrderNumber(order.order_number)}`, item.pieceName]
            .filter(Boolean)
            .join(' · ')}
        >
          <Link to={`/pedido/${order.id}#material`} className={BOTAO_CHEIO}>
            Informar código de envio
          </Link>
          <Link to={MATERIAL_GUIDE_PATH} className={BOTAO_CONTORNO}>
            Como enviar
          </Link>
        </Cartao>
      )

    default:
      return null
  }
}

const AttentionList = ({ orders, now }: AttentionListProps) => {
  const itens = accountAttention(orders, now ?? new Date())
  if (itens.length === 0) return null

  return (
    <section aria-labelledby="atencao-heading" className="flex flex-col gap-3">
      <h2
        id="atencao-heading"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-estrelinha-ink-soft"
      >
        Precisa da sua atenção
      </h2>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {itens.map((item) => (
          <Pendencia key={`${item.kind}-${item.order.id}`} item={item} />
        ))}
      </ul>
    </section>
  )
}

export default AttentionList
