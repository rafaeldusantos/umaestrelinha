// O desconto da peça em cada campanha de desconto — um cartão por campanha agendada ou em vigência,
// na ordem do início, logo abaixo do cartão de preço.
//
// O cartão só ESCOLHE: o percentual vai para o estado do formulário e grava com o Salvar, pela
// porta de `entities/campaign`. O preço mostrado é o de `@estrelinha/core/campaigns`
// (`campaignUnitPrice`), o mesmo que a loja e o servidor cobram — nunca uma conta à parte.

import { formatPrice } from '@estrelinha/core/formatters'
import { variantLabel } from '@estrelinha/core/pricing'
import {
  campaignDayMonth,
  campaignHour,
  campaignPeriodLabel,
  campaignStatus,
  campaignUnitPrice,
  lastMinuteOf,
  pieceComparePrice,
} from '@estrelinha/core/campaigns'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  CampaignBadgeInline,
  CampaignStatusPill,
  useCampaignsOpenForMarking,
  type AdminCampaign,
} from '@/entities/campaign'
import { FormCard } from '@/shared/ui'
import { markedPercent, type CampaignMark } from '../model/campaignMarks'

const NOTA_DO_PRECO = 'O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha.'
export const NOTA_SEM_DESCONTO = 'Sem desconto: a peça fica fora da vitrine /ofertas e sem selo.'

/** A nota do cartão com percentual: até quando (em vigência) ou a partir de quando (agendada). */
const notaDoPercentual = (campaign: AdminCampaign, now: number): string => {
  if (campaignStatus(campaign, now) === 'em-vigencia') {
    const ultimo = lastMinuteOf(campaign.ends_at)
    return `A loja mostra este preço até ${campaignDayMonth(ultimo)} às ${campaignHour(ultimo)}. ${NOTA_DO_PRECO}`
  }
  return `A loja mostra este preço a partir de ${campaignDayMonth(campaign.starts_at)}. ${NOTA_DO_PRECO}`
}

interface PriceSource {
  price: number
  compare_price: number
  options: ProductOption[]
  variants: ProductVariant[]
}

interface Props extends PriceSource {
  marks: CampaignMark[]
  onChange: (campaignId: string, percent: number | null) => void
}

interface CardProps extends PriceSource {
  campaign: AdminCampaign
  percent: number | null
  now: number
  onChange: (percent: number | null) => void
}

const CampaignPriceCard = ({ campaign, percent, now, onChange, price, compare_price, options, variants }: CardProps) => {
  const escolhas: (number | null)[] = [null, ...campaign.percents]
  // O "de" da peça sem grade mora na variação única: o mesmo `pieceComparePrice` da loja e das
  // functions, senão o topo descontaria sobre o "por" e discordaria da tabela logo abaixo.
  const base = campaignUnitPrice(price, pieceComparePrice(price, compare_price, variants), percent)
  // As variações que a loja vende: ativas e com preço. Cada uma sobre o próprio preço.
  const vendaveis = variants.filter(v => v.is_active && v.price !== null && v.price !== undefined)

  return (
    <div data-testid="cartao-da-campanha">
      <FormCard
        title={campaign.name}
        description={campaignPeriodLabel(campaign)}
        action={<CampaignStatusPill status={campaignStatus(campaign, now)} />}
      >
        <p className="text-sm text-muted-foreground">Desconto desta peça na campanha. Vale para todas as variações.</p>

        <div role="radiogroup" aria-label={`Desconto na ${campaign.name}`} className="flex flex-wrap gap-2">
          {escolhas.map(opcao => {
            const ativa = opcao === percent
            return (
              <button
                key={opcao ?? 'nenhum'}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => onChange(opcao)}
                className={cn(
                  'h-11 min-w-16 rounded-xl border px-3 text-sm transition-colors motion-reduce:transition-none',
                  opcao === null ? 'font-medium' : 'font-bold',
                  ativa
                    ? 'border-estrelinha-admin-violet bg-estrelinha-admin-violet/5 ring-1 ring-estrelinha-admin-violet'
                    : 'border-border hover:border-estrelinha-admin-violet/40',
                )}
              >
                {opcao === null ? 'Nenhum' : `${opcao}%`}
              </button>
            )
          })}
        </div>

        {percent === null ? (
          <p className="text-xs text-muted-foreground">{NOTA_SEM_DESCONTO}</p>
        ) : (
          <>
            <div data-testid="previa-da-campanha" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <s className="text-muted-foreground">{formatPrice(base.full)}</s>
              <span aria-hidden="true">→</span>
              <strong className="text-base text-foreground">{formatPrice(base.charged)}</strong>
              <CampaignBadgeInline
                text={campaign.badge_text}
                band={campaign.band_color}
                accent={campaign.accent_color}
                percent={percent}
              />
            </div>

            {vendaveis.length > 0 && (
              <table className="w-full text-sm" aria-label={`Preço de cada variação na ${campaign.name}`}>
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Variação</th>
                    <th scope="col" className="hidden py-1.5 pr-3 font-medium lg:table-cell">Preço</th>
                    <th scope="col" className="py-1.5 font-medium">Na campanha</th>
                  </tr>
                </thead>
                <tbody>
                  {vendaveis.map((variant, i) => {
                    const linha = campaignUnitPrice(variant.price as number, variant.compare_price, percent)
                    const rotulo = variantLabel(options, variant.option_values) || variant.name || `Variação ${i + 1}`
                    return (
                      <tr key={variant.id} className="border-t border-border">
                        <td className="py-1.5 pr-3 [overflow-wrap:anywhere]">{rotulo}</td>
                        <td className="hidden py-1.5 pr-3 lg:table-cell">{formatPrice(linha.full)}</td>
                        <td className="py-1.5 font-semibold">{formatPrice(linha.charged)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <p className="text-xs text-muted-foreground">{notaDoPercentual(campaign, now)}</p>
          </>
        )}
      </FormCard>
    </div>
  )
}

/**
 * Os cartões das campanhas agendadas e em vigência. Sem nenhuma, nada aparece. A marcação de uma
 * campanha encerrada ou desligada continua no formulário, intocada — só não se edita aqui.
 */
const CampaignPriceCards = ({ marks, onChange, ...fonte }: Props) => {
  const { campaigns, error } = useCampaignsOpenForMarking()
  const now = Date.now()

  if (error) {
    return <p className="text-sm text-destructive">Não foi possível carregar as campanhas de desconto: {error}</p>
  }
  return (
    <>
      {campaigns.map(campaign => (
        <CampaignPriceCard
          key={campaign.id}
          campaign={campaign}
          percent={markedPercent(marks, campaign.id)}
          now={now}
          onChange={percent => onChange(campaign.id, percent)}
          {...fonte}
        />
      ))}
    </>
  )
}

export default CampaignPriceCards
