import type { ReactNode } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'
import { ORDER_PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, paymentMethodLabel } from '@estrelinha/core/orders'
import { PICKUP_METHOD_NAME, isPickupOrder } from '@estrelinha/core/shipping'
import type { PedidoDoDetalhe } from '@/entities/order'
import Selo from '@/shared/ui/Selo'

/** "− R$ 40,00": o sinal de menos tipográfico, para o desconto não se ler como hífen. */
const menos = (valor: number) => `− ${formatPrice(valor)}`

const Linha = ({ rotulo, valor, forte = false, parte }: { rotulo: ReactNode; valor: ReactNode; forte?: boolean; parte: string }) => (
  <div data-parte={parte} className={`flex flex-wrap items-baseline justify-between gap-x-3 py-1 text-sm ${forte ? 'font-medium' : ''}`}>
    <dt className={`min-w-0 [overflow-wrap:anywhere] ${forte ? '' : 'text-estrelinha-ink-soft'}`}>{rotulo}</dt>
    <dd className={`ml-auto min-w-0 max-w-full text-right [overflow-wrap:anywhere] ${forte ? 'font-display text-lg font-bold text-estrelinha-primary' : ''}`}>
      {valor}
    </dd>
  </div>
)

/**
 * O resumo de valores (feature `74`, `MAP-25`, A15, A30).
 *
 * - **O Total é `orders.total`, e NUNCA é recalculado** a partir das linhas acima: o banco é o dono do
 *   que a cliente pagou, e uma soma no app seria uma segunda escrita do dinheiro (`packages/core/
 *   src/payment/**` é o dono do cálculo, e ele não é refeito aqui).
 * - O frete diz o serviço (ou "Retirada no escritório") e "grátis" com custo zero.
 * - Cupom, desconto do Pix e promoção só aparecem quando > 0 (A30).
 * - O meio de pagamento (`paymentMethodLabel`, que nunca devolve o valor cru — B01) e o selo do `payment_status` — rótulo de
 *   `ORDER_PAYMENT_STATUS_LABELS`, tom de `PAYMENT_STATUS_TONES` (A15), desenhado pelo MESMO `Selo`
 *   da situação: nenhum mapa tom → classe novo.
 */
const BlocoValores = ({ pedido }: { pedido: PedidoDoDetalhe }) => {
  const servico = isPickupOrder(pedido) ? PICKUP_METHOD_NAME : pedido.shipping_method
  const frete = pedido.shipping_cost ?? 0
  const desconto = pedido.discount ?? 0
  const meio = paymentMethodLabel(pedido.payment_method)
  return (
    // Sem cartão próprio desde 2026-10-26: no protótipo os valores fecham o cartão das joias, abaixo de
    // um fio. É um GRUPO com nome ("Valores"), para o leitor de tela ainda o anunciar como bloco.
    <div role="group" aria-label="Valores" data-bloco="valores" className="mt-3.5 border-t border-estrelinha-line pt-3">
      <dl>
        <Linha parte="subtotal" rotulo="Subtotal" valor={formatPrice(pedido.subtotal)} />
        <Linha parte="frete" rotulo={servico ? `Frete · ${servico}` : 'Frete'} valor={frete > 0 ? formatPrice(frete) : 'grátis'} />
        {desconto > 0 && (
          <Linha parte="cupom" rotulo={pedido.coupon_code ? `Cupom ${pedido.coupon_code}` : 'Cupom'} valor={menos(desconto)} />
        )}
        {pedido.pix_discount > 0 && <Linha parte="pix" rotulo="Desconto do Pix" valor={menos(pedido.pix_discount)} />}
        {pedido.promotion_discount > 0 && <Linha parte="promocao" rotulo="Promoção" valor={menos(pedido.promotion_discount)} />}
        <div className="mt-1 border-t border-estrelinha-line pt-1">
          <Linha parte="total" rotulo="Total" valor={formatPrice(pedido.total)} forte />
        </div>
      </dl>
      <div data-parte="pagamento" className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-estrelinha-ink-soft [overflow-wrap:anywhere]">{meio}</span>
        <Selo tom={PAYMENT_STATUS_TONES[pedido.payment_status] ?? 'neutral'} dados={{ 'data-pagamento': pedido.payment_status }}>
          {ORDER_PAYMENT_STATUS_LABELS[pedido.payment_status] ?? pedido.payment_status}
        </Selo>
      </div>
    </div>
  )
}

export default BlocoValores
