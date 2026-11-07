// As peças do pedido e o resumo que SOMA (feature 59, `DET-10`, `ACB-01`).
//
// Tudo vem do SNAPSHOT do pedido — `order_items` congelou nome, foto, opções e preço na compra
// (`MAT-05`). Mudar o produto no catálogo, ou o desconto do adicional, não muda o que esta tela mostra.
//
// **O resumo soma, e quem decide é `orderSummary` (`core/orders`)** — o mesmo dono do e-mail, do
// painel e do app do ateliê. Subtotal é a soma dos preços cheios e cada desconto tem a sua linha —
// uma linha de desconto abaixo de um subtotal já líquido contaria o mesmo dinheiro duas vezes. A
// peça com desconto mostra o cheio riscado e o cobrado. O pedido de antes das colunas de preço
// cheio fica no formato de sempre: o subtotal gravado, o cupom e o PIX.
import { formatPrice } from '@estrelinha/core/formatters'
import { companionPhrase, orderItemCompanionNames } from '@estrelinha/core/buy-together'
import { orderSummary } from '@estrelinha/core/orders'
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
    /** Os descontos por item, cada um na sua coluna. Zero (ou ausentes) nos pedidos de antes. */
    buy_together_discount?: number | null
    promotion_discount?: number | null
    order_bump_discount?: number | null
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
  const resumo = orderSummary(order)

  return (
    <section
      aria-label="Peças do pedido"
      className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4"
    >
      <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Peças do pedido</h2>

      <ul className="flex flex-col gap-4">
        {itens.map((item, index) => {
          // Compre Junto: a peça levada junto diz qual joia ela acompanha. O nome vem da linha do
          // principal no MESMO pedido (snapshot), nunca do catálogo de hoje. Da linha mista partida,
          // só a parte com o desconto casado é a que acompanha; a outra é a peça avulsa.
          const preco = resumo.rows[index]
          const frase = preco.showsCompanion
            ? companionPhrase(orderItemCompanionNames(item, itens))
            : ''
          const acompanha =
            frase && preco.buyTogetherPercent != null
              ? `${frase} · ${preco.buyTogetherPercent}% a menos`
              : frase
          return (
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
                {acompanha && <p className="text-[13px] text-estrelinha-ink-soft">{acompanha}</p>}
                <p className="text-[13px] text-estrelinha-ink-soft">{itemDetailLine(item, resumo.detailed)}</p>
                {item.engraving_text?.trim() && (
                  <p className="text-[13px] text-estrelinha-ink-soft">
                    Gravação: “{item.engraving_text.trim()}”
                  </p>
                )}
              </div>
              {preco.full != null ? (
                // "de … por …" numa frase só para o leitor de tela; o par visível fica fora da leitura.
                <span className="relative shrink-0">
                  <span className="sr-only">
                    {`de ${formatPrice(preco.full)} por ${formatPrice(preco.charged)}`}
                  </span>
                  <span aria-hidden="true" data-testid="item-de-por" className="flex flex-col items-end">
                    <s className="whitespace-nowrap text-[13px] text-estrelinha-ink-soft">
                      {formatPrice(preco.full)}
                    </s>
                    <span className="whitespace-nowrap text-[15px] font-semibold text-estrelinha-ink">
                      {formatPrice(preco.charged)}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold text-estrelinha-ink">
                  {formatPrice(preco.charged)}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <dl className="flex flex-col gap-1.5 border-t border-estrelinha-line pt-3">
        <Linha rotulo="Subtotal" valor={formatPrice(resumo.subtotal)} />
        {/* Os descontos e o PIX antes do Frete: a ordem do painel do pedido e do checkout. */}
        {resumo.discounts.map((d) => (
          <Linha key={d.key} rotulo={d.label} valor={`−${formatPrice(d.amount)}`} />
        ))}
        <Linha
          rotulo="Frete"
          valor={resumo.shipping === 0 ? 'Grátis' : formatPrice(resumo.shipping)}
        />
        <Linha rotulo="Total" valor={formatPrice(resumo.total)} forte />
      </dl>
    </section>
  )
}

export default OrderItemsSummary
