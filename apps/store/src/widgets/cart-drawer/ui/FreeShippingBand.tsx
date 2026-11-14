import { formatPrice } from '@estrelinha/core/formatters'
import {
  REGION_LABELS,
  freeShippingConfigOf,
  freeShippingRuleText,
  regionOfCep,
  regionsLabel,
} from '@estrelinha/core/shipping'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import type { FreeShippingState } from '@estrelinha/core/hooks/useFreeShipping'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

import InfoTip, { type InfoTipProps } from '@/shared/ui/InfoTip'

export interface FreeShippingBandProps {
  /** O estado de `useFreeShipping(subtotal, cep)`. A faixa nunca recalcula a regra. */
  state: FreeShippingState
  subtotal: number
  /** O CEP do destino, quando há. */
  cep?: string | null
  /** Cidade e UF da busca do CEP, quando ela respondeu. Só escrevem a frase; nunca decidem a região. */
  place?: { city: string; state: string } | null
  /** Há cupom de frete grátis aplicado? Com ele a faixa some: o frete já é zero em qualquer região. */
  freeShippingCoupon?: boolean
  /** A caixa que o balão do ⓘ não pode ultrapassar (o painel da gaveta). */
  collisionBoundary?: InfoTipProps['collisionBoundary']
}

const ROTULO_DO_INFO = 'Sobre o frete grátis'

/**
 * O destaque em ouro, para a faixa alcançada. Dentro da superfície `accent` o texto é `ink` SÓLIDO
 * (4,78:1): qualquer opacidade come a margem (`accentText.test.ts`). O ✓ é ouro sobre o disco `ink`,
 * pintado pelo TRAÇO — é objeto gráfico, não texto.
 */
const Destaque = ({ children }: { children: ReactNode }) => (
  <div
    data-testid="free-shipping-band"
    role="status"
    className="flex shrink-0 items-center gap-2 bg-estrelinha-accent px-5 py-2.5 text-estrelinha-ink"
  >
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-estrelinha-ink"
    >
      <Check className="h-3 w-3 stroke-estrelinha-accent" strokeWidth={3} />
    </span>
    <p className="flex min-w-0 items-center text-[13px] font-bold leading-[18px]">{children}</p>
  </div>
)

/** A faixa do frete grátis da gaveta: uma linha com ⓘ, nos desenhos de valor e de região. */
const FreeShippingBand = ({
  state,
  subtotal,
  cep = null,
  place = null,
  freeShippingCoupon = false,
  collisionBoundary,
}: FreeShippingBandProps) => {
  const regra = freeShippingRuleText(freeShippingConfigOf(useShippingSettings())) ?? ''

  if (!state.active || freeShippingCoupon) return null

  const regioes = regionsLabel(state.regions)
  const info = (texto: string) => (
    <InfoTip label={ROTULO_DO_INFO} collisionBoundary={collisionBoundary}>
      {texto}
    </InfoTip>
  )

  // A cidade e a UF só escrevem a frase: a região sai do CEP (a UF nunca decide).
  const regiaoDoCep = regionOfCep(cep)
  const lugar = place?.city && place?.state ? `${place.city}/${place.state}` : null

  // CEP fora das regiões: informação, não recusa — linha neutra, em qualquer valor de sacola.
  if (state.destination === 'outside') {
    const quem = lugar ? `Para ${lugar}` : 'Para este CEP'
    return (
      <div
        data-testid="free-shipping-band"
        role="status"
        className="flex shrink-0 items-center bg-estrelinha-ground-deep px-5 py-2.5"
      >
        <p className="flex min-w-0 items-center text-[12.5px] font-medium leading-[18px] text-estrelinha-ink-soft">
          <span>Frete grátis só para {regioes}</span>
          {info(`${quem}, o frete é o da cotação. ${regra}`)}
        </p>
      </div>
    )
  }

  if (state.granted) {
    const balao =
      regiaoDoCep === null
        ? regra
        : `Entrega ${lugar ? `em ${lugar}, região` : 'na região'} ${REGION_LABELS[regiaoDoCep]}. A forma de envio mais barata sai sem custo.`
    return (
      <Destaque>
        <span>Frete grátis liberado</span>
        {info(balao)}
      </Destaque>
    )
  }

  // Valor atingido, destino ainda desconhecido e regiões limitadas: nunca "liberado" sem saber
  // para onde vai.
  if (state.reached && !state.granted) {
    return (
      <Destaque>
        <span>Frete grátis para {regioes}</span>
        {info(`${regra} Informe o CEP abaixo para confirmar.`)}
      </Destaque>
    )
  }

  return (
    <div
      data-testid="free-shipping-band"
      className="flex shrink-0 flex-col gap-[7px] bg-estrelinha-ground-deep px-5 pb-[11px] pt-[9px]"
    >
      <div className="flex min-h-[22px] items-center justify-between gap-3">
        <p className="flex min-w-0 items-center text-[12.5px] font-semibold leading-[18px] text-estrelinha-primary">
          <span>Faltam {formatPrice(state.remaining)} para o frete grátis</span>
          <InfoTip label={ROTULO_DO_INFO} collisionBoundary={collisionBoundary}>
            {regra}
          </InfoTip>
        </p>
        <span className="shrink-0 text-[11px] font-medium text-estrelinha-ink-soft">
          {formatPrice(subtotal)} / {formatPrice(state.threshold)}
        </span>
      </div>
      <div
        className="h-[5px] w-full overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuenow={Math.round(state.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso para o frete grátis"
      >
        <div
          className="h-full rounded-full bg-estrelinha-primary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
          style={{ width: `${state.percent}%` }}
        />
      </div>
    </div>
  )
}

export default FreeShippingBand
