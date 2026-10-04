// "Seus pedidos" — a lista da conta (feature 59, `LST-02`, `LST-03`, `LST-06..08`, `LST-10`).
//
// Cada linha é um LINK inteiro para o detalhe (`/pedido/:id`) — o detalhe tem um dono só, e a
// lista não abre nada no lugar. A mesma árvore serve os dois tamanhos: no celular a linha é
// miniatura · (número e total na mesma linha; data · peças; selo) · seta; a partir de `lg` as mesmas
// células viram as colunas Pedido · Data · Situação · Total, por `grid-template-areas`. Duas árvores
// (uma escondida por CSS) dariam dois links por pedido e duas leituras para o leitor de tela.
//
// O número passa por `formatOrderNumber` e corta com reticências numa linha só (`LST-03`): foi o
// número antigo em Libre Baskerville, quebrando em duas linhas, que empurrou o total para fora do
// cartão no celular.
//
// Carregando, vazio e erro são três estados distintos: falha nunca é "você não tem pedidos"
// (`LST-08`), e o esqueleto não escreve "Carregando…" (`LST-07`).
import { ChevronRight, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import {
  OrderSituationBadge,
  orderDateLabel,
  piecesLabel,
  type Order,
} from '@/entities/order'

export interface OrderListProps {
  orders: readonly Order[] | null | undefined
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

/**
 * As áreas da linha. Celular: três linhas ao lado da miniatura. A partir de `lg`: Pedido (com a data
 * embaixo do número) · Situação · Total.
 * `minmax(0, …)` na coluna do número é o que deixa o `truncate` cortar em vez de a trilha crescer até o
 * min-content do texto (`CLAUDE.md`, "Mobile").
 *
 * **As larguras são FIXAS e COMPARTILHADAS com o cabeçalho, e as duas coisas foram medidas em
 * navegador** (feature `59`, 2026-10-04). As fixas do Paper (120 · 230 · 110) deixavam o título com
 * 38px na loja real — o Paper desenha uma coluna de 880px, o cartão da loja tem ~620 em 1024 — e todo
 * pedido virava "Pe…". A segunda tentativa usou `auto`, e cada linha, sendo uma grade própria,
 * passou a medir as colunas pelo próprio conteúdo: Data e Situação em zigue-zague, fora do
 * cabeçalho. Fixas e iguais em todas as linhas: 196px cabe o selo mais longo ("A caminho · chega até
 * 8 out") numa linha só; 104px cabe "R$ 1.289,90". Sobram ~214px para o título.
 *
 * SPEC_DEVIATION: `LST-10` lista as colunas "Pedido · Data · Situação · Total"; aqui a data mora
 * dentro da coluna Pedido, embaixo do número.
 * Reason: o cartão da loja NÃO cresce depois de 1024 — o contêiner tem teto e o miolo mede 618px em
 * 1024, 1280 e 1440 (medido em navegador). Com a coluna Data própria o título caía para 102px e até
 * "Pedido #NS-1043" era cortado. A data continua visível em toda linha.
 */
const COLUNAS_LG = 'lg:grid-cols-[56px_minmax(0,1fr)_196px_104px_20px]'

const GRADE =
  "grid grid-cols-[56px_minmax(0,1fr)_auto_20px] [grid-template-areas:'thumb_num_price_chev'_'thumb_date_date_chev'_'thumb_badge_badge_chev'] items-center gap-x-3 gap-y-1 " +
  `${COLUNAS_LG} lg:[grid-template-areas:'thumb_num_badge_price_chev'_'thumb_date_badge_price_chev'] lg:gap-x-4`

const CABECALHO = `${COLUNAS_LG} gap-x-4`

const Miniatura = ({ order }: { order: Order }) => {
  const foto = order.order_items?.[0]?.product_image
  return foto ? (
    <img
      src={foto}
      alt=""
      className="h-14 w-14 rounded-sm border border-estrelinha-line object-cover [grid-area:thumb]"
    />
  ) : (
    // Sem foto, o quadrado neutro — nunca um ícone de imagem quebrada (edge case da spec).
    <span
      aria-hidden
      data-testid="order-row-sem-foto"
      className="h-14 w-14 rounded-sm bg-estrelinha-ground-deep [grid-area:thumb]"
    />
  )
}

const Linha = ({ order }: { order: Order }) => {
  const data = orderDateLabel(order.created_at)
  return (
    <li>
      <Link
        to={`/pedido/${order.id}`}
        className={`${GRADE} min-h-[88px] px-4 py-3 transition-colors hover:bg-estrelinha-ground-deep/60 motion-reduce:transition-none lg:min-h-[72px]`}
      >
        <Miniatura order={order} />
        <span className="min-w-0 [grid-area:num]">
          <span className="block truncate font-body text-base font-semibold text-estrelinha-ink">
            Pedido {formatOrderNumber(order.order_number)}
          </span>
        </span>
        <span className="text-[13px] leading-5 text-estrelinha-ink-soft [grid-area:date]">
          {data}
          {data ? ' · ' : ''}
          {piecesLabel(order.order_items)}
        </span>
        <span className="min-w-0 [grid-area:badge]">
          <OrderSituationBadge order={order} />
        </span>
        <span className="whitespace-nowrap text-right font-body text-base font-semibold text-estrelinha-ink [grid-area:price]">
          {formatPrice(order.total)}
        </span>
        <ChevronRight className="h-5 w-5 text-estrelinha-ink-soft [grid-area:chev]" aria-hidden />
      </Link>
    </li>
  )
}

const Esqueleto = () => (
  <ul
    aria-hidden
    data-testid="order-list-skeleton"
    className="divide-y divide-estrelinha-line overflow-hidden rounded-md border border-estrelinha-line bg-estrelinha-surface"
  >
    {[0, 1, 2].map((i) => (
      <li key={i} className="flex min-h-[88px] items-center gap-3 px-4 py-3">
        <span className="h-14 w-14 shrink-0 animate-pulse rounded-sm bg-estrelinha-ground-deep motion-reduce:animate-none" />
        <span className="flex flex-1 flex-col gap-2">
          <span className="h-4 w-2/3 animate-pulse rounded-sm bg-estrelinha-ground-deep motion-reduce:animate-none" />
          <span className="h-3 w-1/2 animate-pulse rounded-sm bg-estrelinha-ground-deep motion-reduce:animate-none" />
        </span>
      </li>
    ))}
  </ul>
)

const OrderList = ({ orders, isLoading = false, isError = false, onRetry }: OrderListProps) => {
  const titulo = (
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-estrelinha-ink-soft">
      Seus pedidos
    </h2>
  )

  let corpo: React.ReactNode
  if (isLoading) {
    corpo = <Esqueleto />
  } else if (isError) {
    corpo = (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-estrelinha-line bg-estrelinha-surface p-6 text-center">
        <p className="text-[15px] text-estrelinha-ink">Não conseguimos carregar seus pedidos.</p>
        <button
          type="button"
          onClick={() => onRetry?.()}
          className="flex min-h-11 items-center justify-center rounded-sm border border-estrelinha-field px-5 py-2.5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none"
        >
          Tentar de novo
        </button>
      </div>
    )
  } else if (!orders || orders.length === 0) {
    corpo = (
      <div className="flex flex-col items-center gap-3 rounded-md border border-estrelinha-line bg-estrelinha-surface p-6 text-center">
        <Package className="h-10 w-10 text-estrelinha-ink-soft" aria-hidden />
        <p className="text-[15px] text-estrelinha-ink-soft">Você ainda não fez nenhum pedido.</p>
        <Link
          to="/"
          className="flex min-h-11 items-center justify-center rounded-sm border border-estrelinha-field px-5 py-2.5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none"
        >
          Conhecer as joias
        </Link>
      </div>
    )
  } else {
    corpo = (
      <div className="overflow-hidden rounded-md border border-estrelinha-line bg-estrelinha-surface">
        {/* O cabeçalho das colunas só existe no computador; no celular cada linha se explica. */}
        <div
          aria-hidden
          data-testid="order-list-header"
          className={`hidden ${CABECALHO} border-b border-estrelinha-line px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-estrelinha-ink-soft lg:grid`}
        >
          <span className="col-span-2">Pedido</span>
          <span>Situação</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        <ul className="divide-y divide-estrelinha-line">
          {orders.map((order) => (
            <Linha key={order.id} order={order} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section aria-label="Seus pedidos" className="flex flex-col gap-3">
      {titulo}
      {corpo}
    </section>
  )
}

export default OrderList
