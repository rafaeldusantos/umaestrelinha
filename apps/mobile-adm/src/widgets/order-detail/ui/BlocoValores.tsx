import type { ReactNode } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'
import {
  ORDER_PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, manualPaymentMethodLabel, paymentMethodLabel, shippingMethodLabel, type OrderSummary,
} from '@estrelinha/core/orders'
import { formatStoreDate, formatStoreHour } from '@estrelinha/core/time'
import type { PedidoDoDetalhe, RegistroManual } from '@/entities/order'
import Selo from '@/shared/ui/Selo'

/** "− R$ 40,00": o sinal de menos tipográfico, para o desconto não se ler como hífen. */
const menos = (valor: number) => `− ${formatPrice(valor)}`

/** O rótulo do desconto combinado — a mesma frase do painel no pedido montado. */
const DESCONTO_COMBINADO = 'Desconto combinado'

const Linha = ({
  rotulo,
  valor,
  forte = false,
  parte,
  desconto,
}: {
  rotulo: ReactNode
  valor: ReactNode
  forte?: boolean
  parte: string
  /** A chave do desconto (`OrderDiscountKey`), só nas linhas de desconto. */
  desconto?: string
}) => (
  <div data-parte={parte} data-desconto={desconto} className={`flex flex-wrap items-baseline justify-between gap-x-3 py-1 text-sm ${forte ? 'font-medium' : ''}`}>
    <dt className={`min-w-0 [overflow-wrap:anywhere] ${forte ? '' : 'text-estrelinha-ink-soft'}`}>{rotulo}</dt>
    <dd className={`ml-auto min-w-0 max-w-full text-right [overflow-wrap:anywhere] ${forte ? 'font-display text-lg font-bold text-estrelinha-primary' : ''}`}>
      {valor}
    </dd>
  </div>
)

/**
 * O pagamento registrado à mão no painel: o meio pelo nome (a voz do painel, nunca o valor técnico), a
 * data e a hora de Brasília e a observação. Os comprovantes ficam só no painel, e o app não registra
 * nem desfaz — só mostra.
 */
const RegistroManualDoPagamento = ({ registro }: { registro: RegistroManual }) => {
  const nota = registro.note?.trim()
  return (
    <div data-parte="registro-manual" className="mt-2 border-t border-estrelinha-line pt-2 text-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-estrelinha-ink-soft">Registrado à mão</p>
      <dl className="mt-1">
        <div data-registro="meio" className="flex flex-wrap items-baseline justify-between gap-x-3 py-0.5">
          <dt className="text-estrelinha-ink-soft">Meio</dt>
          <dd className="ml-auto min-w-0 max-w-full text-right [overflow-wrap:anywhere]">{manualPaymentMethodLabel(registro.method, 'admin')}</dd>
        </div>
        <div data-registro="pago-em" className="flex flex-wrap items-baseline justify-between gap-x-3 py-0.5">
          <dt className="text-estrelinha-ink-soft">Pago em</dt>
          <dd className="ml-auto text-right">{`${formatStoreDate(registro.paid_at)} às ${formatStoreHour(registro.paid_at)}`}</dd>
        </div>
      </dl>
      {nota && (
        <p data-registro="observacao" className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">
          {nota}
        </p>
      )}
    </div>
  )
}

/**
 * O resumo de valores (feature `74`, `MAP-25`, A15, A30) — com a composição de `orderSummary`
 * (`core/orders`), a MESMA da loja, do e-mail e do painel.
 *
 * - **Subtotal é o dos preços cheios, e cada desconto tem a sua linha** (o do Compre Junto, o
 *   progressivo, o da oferta, o cupom, o PIX), só os que houve: uma linha de desconto abaixo de um
 *   subtotal já líquido contaria o mesmo dinheiro duas vezes. O pedido de antes das colunas de preço
 *   cheio fica no formato de sempre — quem decide é a regra, não esta tela.
 * - **O Total é `orders.total`, e NUNCA é recalculado** a partir das linhas acima: o banco é o dono do
 *   que a cliente pagou (`packages/core/src/payment/**` é o dono do cálculo, e ele não é refeito aqui).
 * - **A ordem é a do painel**: Subtotal, os descontos (o desconto combinado do pedido montado antes
 *   do PIX), o PIX, o Frete e o Total — conferir o mesmo pedido nas duas pontas lê as mesmas linhas
 *   na mesma ordem, e "Subtotal − descontos" fica junto.
 * - **O desconto combinado** (`orders.manual_discount`, só no pedido montado pelo painel) tem a sua
 *   linha: sem ela as linhas não fecham com o Total. Sai sem o motivo — ele mora em `order_proposals`,
 *   que o navegador não lê.
 * - O frete diz o serviço (de `shippingMethodLabel`, que também diz a retirada) e "grátis" com custo zero.
 * - O meio de pagamento (`paymentMethodLabel`, que nunca devolve o valor cru — B01) e o selo do `payment_status` — rótulo de
 *   `ORDER_PAYMENT_STATUS_LABELS`, tom de `PAYMENT_STATUS_TONES` (A15), desenhado pelo MESMO `Selo`
 *   da situação: nenhum mapa tom → classe novo.
 * - O pagamento registrado à mão (`registro`, o vivo), abaixo do selo — sem comprovante.
 */
const BlocoValores = ({
  pedido,
  resumo,
  registro = null,
}: {
  pedido: PedidoDoDetalhe
  resumo: OrderSummary
  registro?: RegistroManual | null
}) => {
  const servico = shippingMethodLabel(pedido)
  const meio = paymentMethodLabel(pedido.payment_method)
  const descontosAntesDoPix = resumo.discounts.filter((d) => d.key !== 'pix')
  const descontoPix = resumo.discounts.find((d) => d.key === 'pix')
  const combinado = Number(pedido.manual_discount) || 0
  return (
    // Sem cartão próprio desde 2026-10-26: no protótipo os valores fecham o cartão das joias, abaixo de
    // um fio. É um GRUPO com nome ("Valores"), para o leitor de tela ainda o anunciar como bloco.
    <div role="group" aria-label="Valores" data-bloco="valores" className="mt-3.5 border-t border-estrelinha-line pt-3">
      <dl>
        <Linha parte="subtotal" rotulo="Subtotal" valor={formatPrice(resumo.subtotal)} />
        {descontosAntesDoPix.map((d) => (
          <Linha key={d.key} parte="desconto" desconto={d.key} rotulo={d.label} valor={menos(d.amount)} />
        ))}
        {combinado > 0 && <Linha parte="desconto" desconto="manual" rotulo={DESCONTO_COMBINADO} valor={menos(combinado)} />}
        {descontoPix && <Linha parte="desconto" desconto={descontoPix.key} rotulo={descontoPix.label} valor={menos(descontoPix.amount)} />}
        <Linha parte="frete" rotulo={servico ? `Frete · ${servico}` : 'Frete'} valor={resumo.shipping > 0 ? formatPrice(resumo.shipping) : 'grátis'} />
        <div className="mt-1 border-t border-estrelinha-line pt-1">
          <Linha parte="total" rotulo="Total" valor={formatPrice(resumo.total)} forte />
        </div>
      </dl>
      <div data-parte="pagamento" className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-estrelinha-ink-soft [overflow-wrap:anywhere]">{meio}</span>
        <Selo tom={PAYMENT_STATUS_TONES[pedido.payment_status] ?? 'neutral'} dados={{ 'data-pagamento': pedido.payment_status }}>
          {ORDER_PAYMENT_STATUS_LABELS[pedido.payment_status] ?? pedido.payment_status}
        </Selo>
      </div>
      {registro && <RegistroManualDoPagamento registro={registro} />}
    </div>
  )
}

export default BlocoValores
