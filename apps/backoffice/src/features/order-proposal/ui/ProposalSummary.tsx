// O resumo da montagem (feature 89, `MON-09`). TODO número daqui sai de `core`: o resumo de
// `priceProposalDraft` (via `priceDraft`) e o "no PIX" de `proposalPricing` sobre o travado — a MESMA
// conta que a página do link e o `create-payment` farão (`PRC-06`). Nenhuma soma é escrita na tela.

import { formatPrice } from '@estrelinha/core/formatters'
import { PROPOSAL_ZERO_REFUSAL, lockProposal, proposalPricing } from '@estrelinha/core/proposals'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { FormCard } from '@/shared/ui'
import type { DraftPricing } from '../model/draft'

interface Props {
  pricing: DraftPricing
}

const Linha = ({ rotulo, valor, desconto = false, forte = false, testId }: { rotulo: string; valor: number; desconto?: boolean; forte?: boolean; testId?: string }) => (
  <div data-testid={testId} className={`flex items-baseline justify-between gap-3 ${forte ? 'text-base font-semibold text-foreground' : 'text-sm text-muted-foreground'}`}>
    <dt className="min-w-0">{rotulo}</dt>
    <dd className="shrink-0 tabular-nums">{desconto ? `− ${formatPrice(valor)}` : formatPrice(valor)}</dd>
  </div>
)

const ProposalSummary = ({ pricing }: Props) => {
  const { price } = pricing
  const payment = usePaymentSettings()
  const temPeca = price.lockedLines.length > 0
  const pix =
    temPeca && payment.pix_enabled && pricing.refusal === null
      ? proposalPricing(lockProposal(price), {
          shipping: 0,
          method: 'pix',
          pixDiscountPercent: Number(payment.pix_discount_percent) || 0,
          freeShipping: null,
        }).total
      : null

  return (
    <FormCard title="Resumo">
      <dl className="space-y-1.5" aria-label="Resumo da proposta">
        <Linha rotulo="Subtotal" valor={price.subtotal} testId="resumo-subtotal" />
        {price.promotionDiscount > 0 && (
          <Linha rotulo="Promoção (já nos preços)" valor={price.promotionDiscount} desconto testId="resumo-promocao" />
        )}
        {price.couponDiscount > 0 && <Linha rotulo="Cupom" valor={price.couponDiscount} desconto testId="resumo-cupom" />}
        {price.manualDiscount > 0 && (
          <Linha rotulo="Desconto combinado" valor={price.manualDiscount} desconto testId="resumo-combinado" />
        )}
        <div className="border-t border-border pt-1.5">
          <Linha rotulo="Total das peças" valor={price.itemsTotal} forte testId="resumo-total" />
        </div>
      </dl>
      {pix !== null && (
        <p data-testid="resumo-pix" className="text-sm text-muted-foreground">
          no PIX: {formatPrice(pix)}
        </p>
      )}
      <p className="text-xs text-muted-foreground">O frete entra quando a cliente escolher a entrega no link.</p>
      {pricing.refusal === PROPOSAL_ZERO_REFUSAL && (
        <p role="alert" data-testid="resumo-recusa" className="text-sm text-destructive">
          {PROPOSAL_ZERO_REFUSAL}
        </p>
      )}
    </FormCard>
  )
}

export default ProposalSummary
