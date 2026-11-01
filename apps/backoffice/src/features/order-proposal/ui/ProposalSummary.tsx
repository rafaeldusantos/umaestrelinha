// O resumo da montagem (feature 89, `MON-09`). TODO número daqui sai de `core`: o resumo de
// `priceProposalDraft` (via `priceDraft`) e o "no PIX" de `proposalPricing` sobre o travado — a MESMA
// conta que a página do link e o `create-payment` farão (`PRC-06`). Nenhuma soma de DESCONTO é
// escrita na tela. A única conta daqui é de apresentação: a linha "N peças" mostra o preço CHEIO
// (`subtotal + promotionDiscount`, os dois de `core`), para a promoção aparecer abaixo dela como um
// desconto — como no protótipo e no caixa da loja. O total continua sendo `itemsTotal`.

import { formatPrice } from '@estrelinha/core/formatters'
import { PROPOSAL_ZERO_REFUSAL, lockProposal, proposalPricing } from '@estrelinha/core/proposals'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import type { ReactNode } from 'react'
import type { DraftPricing } from '../model/draft'

interface Props {
  pricing: DraftPricing
  /** O código do cupom aplicado, para a linha "Cupom CÓDIGO". */
  couponCode?: string | null
  /** O motivo do desconto combinado — interno, mostrado só aqui, embaixo do rótulo. */
  manualReason?: string | null
  /** Quantas peças (somando as quantidades) a montagem tem. */
  pieces?: number
  /** O que vem depois da conta, no mesmo cartão: a prévia da entrega e o botão. */
  children?: ReactNode
}

const Linha = ({
  rotulo,
  detalhe,
  valor,
  desconto = false,
  testId,
}: {
  rotulo: string
  detalhe?: string | null
  valor: number
  desconto?: boolean
  testId?: string
}) => (
  <div data-testid={testId} className="flex items-baseline justify-between gap-3 text-[13.5px]">
    <dt className="min-w-0 text-muted-foreground">
      {rotulo}
      {detalhe && <span className="block break-words text-xs text-muted-foreground/80">{detalhe}</span>}
    </dt>
    <dd className={`shrink-0 tabular-nums ${desconto ? 'text-estrelinha-admin-emerald' : 'text-foreground'}`}>
      {desconto ? `− ${formatPrice(valor)}` : formatPrice(valor)}
    </dd>
  </div>
)

const ProposalSummary = ({ pricing, couponCode = null, manualReason = null, pieces: pecasDadas, children }: Props) => {
  const { price } = pricing
  const pieces = pecasDadas ?? price.lockedLines.reduce((n, l) => n + l.line.quantity, 0)
  const payment = usePaymentSettings()
  const temPeca = price.lockedLines.length > 0
  const pctPix = Number(payment.pix_discount_percent) || 0
  const pix =
    temPeca && payment.pix_enabled && pricing.refusal === null
      ? proposalPricing(lockProposal(price), {
          shipping: 0,
          method: 'pix',
          pixDiscountPercent: pctPix,
          freeShipping: null,
        }).total
      : null

  return (
    <section
      aria-labelledby="resumo-da-proposta"
      className="space-y-3 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm lg:sticky lg:top-5"
    >
      <h2 id="resumo-da-proposta" className="font-heading text-lg font-semibold">
        Resumo
      </h2>
      <dl className="space-y-2" aria-label="Resumo da proposta">
        <Linha rotulo={`${pieces} ${pieces === 1 ? 'peça' : 'peças'}`} valor={price.subtotal + price.promotionDiscount} testId="resumo-subtotal" />
        {price.promotionDiscount > 0 && (
          <Linha rotulo="Promoção" valor={price.promotionDiscount} desconto testId="resumo-promocao" />
        )}
        {price.couponDiscount > 0 && (
          <Linha rotulo={couponCode ? `Cupom ${couponCode}` : 'Cupom'} valor={price.couponDiscount} desconto testId="resumo-cupom" />
        )}
        {price.manualDiscount > 0 && (
          <Linha rotulo="Desconto combinado" detalhe={manualReason?.trim() || null} valor={price.manualDiscount} desconto testId="resumo-combinado" />
        )}
        <div data-testid="resumo-total" className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5 text-base font-bold text-foreground">
          <dt>Total das peças</dt>
          <dd className="shrink-0 font-heading tabular-nums">{formatPrice(Math.max(price.itemsTotal, 0))}</dd>
        </div>
        {pix !== null && (
          <div data-testid="resumo-pix" className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted-foreground">
            <dt>No PIX{pctPix > 0 ? ` (${String(pctPix).replace('.', ',')}% off)` : ''}</dt>
            <dd className="shrink-0 tabular-nums">{formatPrice(pix)}</dd>
          </div>
        )}
      </dl>
      {pricing.refusal === PROPOSAL_ZERO_REFUSAL && (
        <p role="alert" data-testid="resumo-recusa" className="text-sm text-destructive">
          {PROPOSAL_ZERO_REFUSAL}
        </p>
      )}
      {children}
    </section>
  )
}

export default ProposalSummary
