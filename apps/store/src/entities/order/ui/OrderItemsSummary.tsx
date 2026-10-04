// As peças do pedido e o resumo que SOMA (feature 59, `DET-10`, `ACB-01`).
//
// Tudo vem do SNAPSHOT do pedido — `order_items` congelou nome, foto, opções e preço na compra
// (`MAT-05`). Mudar o produto no catálogo não muda o que esta tela mostra.
//
// **O resumo soma, e é por construção** (`L-014`): `total = subtotal − cupom − desconto PIX +
// frete`, a conta de `resolveOrderPricing` (`core/payment`). O desconto de promoção por faixa NÃO
// aparece como linha: ele já está embutido no subtotal, e uma linha de desconto ao lado de um
// subtotal líquido contaria o mesmo dinheiro duas vezes para quem lê.
import { formatPrice } from '@estrelinha/core/formatters'
import { itemDetailLine, type OrderSummaryItem } from '../lib/itemDetailLine'

export type { OrderSummaryItem } from '../lib/itemDetailLine'

export interface OrderItemsSummaryProps {
  order: {
    order_items: OrderSummaryItem[]
    subtotal: number
    shipping_cost: number
    /** O desconto do CUPOM (`resolveOrderPricing.couponDiscount`). */
    discount: number
    pix_discount?: number | null
    coupon_code?: string | null
    total: number
  }
}

const Linha = ({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) => (
  <div
    className={`flex items-baseline justify-between gap-4 ${
      forte ? 'text-base font-semibold text-estrelinha-ink' : 'text-sm text-estrelinha-ink-soft'
    }`}
  >
    <dt>{rotulo}</dt>
    <dd className="whitespace-nowrap">{valor}</dd>
  </div>
)

const OrderItemsSummary = ({ order }: OrderItemsSummaryProps) => {
  const itens = order.order_items ?? []
  const cupom = order.coupon_code?.trim()
  const pix = Number(order.pix_discount ?? 0)

  return (
    <section
      aria-label="Peças do pedido"
      className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4"
    >
      <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Peças do pedido</h2>

      <ul className="flex flex-col gap-4">
        {itens.map((item) => (
          <li key={item.id} className="flex gap-3">
            {item.product_image ? (
              <img
                src={item.product_image}
                alt=""
                className="h-14 w-14 shrink-0 rounded-sm border border-estrelinha-line object-cover"
              />
            ) : (
              // Sem foto, o quadrado neutro — nunca um ícone de imagem quebrada (edge case da spec).
              <span
                aria-hidden
                data-testid="item-sem-foto"
                className="h-14 w-14 shrink-0 rounded-sm bg-estrelinha-ground-deep"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="line-clamp-2 text-[15px] font-medium leading-5 text-estrelinha-ink">
                {item.product_name}
              </p>
              <p className="text-[13px] text-estrelinha-ink-soft">{itemDetailLine(item)}</p>
              {item.engraving_text?.trim() && (
                <p className="text-[13px] text-estrelinha-ink-soft">
                  Gravação: “{item.engraving_text.trim()}”
                </p>
              )}
            </div>
            <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold text-estrelinha-ink">
              {formatPrice(item.unit_price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1.5 border-t border-estrelinha-line pt-3">
        <Linha rotulo="Subtotal" valor={formatPrice(order.subtotal)} />
        <Linha
          rotulo="Frete"
          valor={Number(order.shipping_cost) === 0 ? 'Grátis' : formatPrice(order.shipping_cost)}
        />
        {Number(order.discount) > 0 && (
          <Linha
            rotulo={cupom ? `Cupom ${cupom}` : 'Desconto'}
            valor={`−${formatPrice(order.discount)}`}
          />
        )}
        {pix > 0 && <Linha rotulo="Desconto PIX" valor={`−${formatPrice(pix)}`} />}
        <Linha rotulo="Total" valor={formatPrice(order.total)} forte />
      </dl>
    </section>
  )
}

export default OrderItemsSummary
