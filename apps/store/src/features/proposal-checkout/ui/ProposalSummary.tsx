// O resumo do pedido montado (feature 89, `CON-01`, `CON-03`, `PRC-06`).
//
// Só desenha. O total chega pronto de `proposalPricing` (`@estrelinha/core/proposals`) — a MESMA
// conta que `create-order` e `create-payment` fazem do lado do servidor, com a entrega e o meio que a
// cliente escolheu aqui. O desconto avulso aparece como "Desconto combinado", SEM o motivo: o motivo
// é da Adri, e o servidor nem o manda (`SEG-04`).
import type { OrderTotals } from '@estrelinha/core/payment/pricing'
import type { PublicProposal } from '@estrelinha/core/proposals'
import { formatPrice } from '@estrelinha/core/formatters'

/** CON-03, palavra por palavra. */
export const MANUAL_DISCOUNT_LABEL = 'Desconto combinado'

interface Props {
  proposal: PublicProposal
  totals: OrderTotals
  /** A linha do frete: "Frete · Correios PAC", "Retirada no escritório", ou `null` antes de escolher. */
  shippingLabel: string | null
  pixDiscountPercent: number
}

const Linha = ({ rotulo, valor, testId }: { rotulo: string; valor: string; testId?: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="min-w-0 text-[15px] leading-[18px] text-estrelinha-ink-soft">{rotulo}</span>
    <span data-testid={testId} className="shrink-0 text-[15px] font-medium leading-[18px] text-estrelinha-ink">
      {valor}
    </span>
  </div>
)

const ProposalSummary = ({ proposal, totals, shippingLabel, pixDiscountPercent }: Props) => {
  // O subtotal CHEIO, com a promoção na linha dela — a mesma forma do resumo de `/checkout` (PRM-15).
  const promocao = Number(proposal.promotion_discount) || 0
  const subtotalCheio = totals.subtotal + promocao
  const avulso = totals.manualDiscount ?? 0

  return (
    <section
      aria-label="Resumo do pedido"
      className="flex flex-col gap-[11px] rounded-lg border border-estrelinha-line bg-white p-5"
    >
      <h2 className="font-heading text-[20px] font-semibold leading-6 tracking-[-0.02em] text-estrelinha-ink">
        Resumo
      </h2>
      <Linha rotulo="Subtotal" valor={formatPrice(subtotalCheio)} testId="proposta-subtotal" />
      {promocao > 0 && <Linha rotulo="Desconto progressivo" valor={`−${formatPrice(promocao)}`} />}
      {totals.couponDiscount > 0 && (
        <Linha
          rotulo={proposal.coupon_code ? `Cupom ${proposal.coupon_code}` : 'Cupom'}
          valor={`−${formatPrice(totals.couponDiscount)}`}
        />
      )}
      {avulso > 0 && (
        <Linha rotulo={MANUAL_DISCOUNT_LABEL} valor={`−${formatPrice(avulso)}`} testId="proposta-avulso" />
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-[15px] leading-[18px] text-estrelinha-ink-soft">
          {shippingLabel ?? 'Frete'}
        </span>
        {shippingLabel && totals.shipping === 0 ? (
          <span className="shrink-0 text-[15px] font-semibold leading-[18px] text-estrelinha-primary">Grátis</span>
        ) : (
          <span className="shrink-0 text-[15px] font-medium leading-[18px] text-estrelinha-ink">
            {shippingLabel ? formatPrice(totals.shipping) : 'a calcular'}
          </span>
        )}
      </div>
      {totals.pixDiscount > 0 && (
        <Linha rotulo={`Desconto PIX (${pixDiscountPercent}%)`} valor={`−${formatPrice(totals.pixDiscount)}`} />
      )}
      <div className="mt-2 flex items-end justify-between border-t-2 border-estrelinha-ink pt-4">
        <span className="font-heading text-[20px] font-semibold leading-6 tracking-[-0.02em] text-estrelinha-ink">
          Total
        </span>
        <span
          data-testid="proposta-total"
          className="font-heading text-[28px] font-semibold leading-[32px] tracking-[-0.03em] text-estrelinha-ink"
        >
          {formatPrice(totals.total)}
        </span>
      </div>
    </section>
  )
}

export default ProposalSummary
