// O bloco do frete no rodapé da gaveta: o desenho de cada estado (campo, calculando, opções,
// recolhido, falha, sem opção). O estado e as gravações no rascunho são de `useCartShipping`.
import { useEffect, useId, type ReactNode } from 'react'
import { ChevronDown, Loader2, MapPin, Truck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { maskCep } from '@estrelinha/core/validators'
import { PICKUP_METHOD_NAME, PICKUP_SERVICE_ID, formatEstimate } from '@estrelinha/core/shipping'
import type { ShippingDraft } from '@estrelinha/core/checkout'
import { usePickupOptionState } from '@/entities/pickup'
import { DEFAULT_SHIPPING_SERVICE_ID, ShippingOptionCard } from '@/features/checkout'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import {
  DRAWER_NO_OPTION_MESSAGE,
  DRAWER_QUOTE_FAILED_MESSAGE,
  type CartShippingState,
  type PickupRead,
} from '../model/useCartShipping'

/**
 * Lê a configuração da retirada. Só é montado para CEP do RS — fora dele não há o que ler, e a
 * leitura da configuração da loja não acontece.
 */
const PickupSource = ({
  cep,
  onChange,
}: {
  cep: string
  onChange: (read: PickupRead | null) => void
}) => {
  const { option, settled } = usePickupOptionState(cep)
  useEffect(() => {
    onChange({ option, settled })
  }, [option, settled, onChange])
  useEffect(() => () => onChange(null), [onChange])
  return null
}

/** As datas do rascunho voltam ao texto de `formatEstimate`, no fuso local (`YYYY-MM-DD`). */
const draftEstimateLabel = ({ estimateMin, estimateMax }: ShippingDraft): string | null => {
  const parse = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
  }
  const min = parse(estimateMin)
  const max = parse(estimateMax)
  return min && max ? formatEstimate(min, max) : null
}

const Skeleton = () => (
  <div
    aria-hidden
    data-testid="drawer-shipping-skeleton"
    className="h-[52px] w-full animate-pulse rounded-md bg-estrelinha-ground-deep motion-reduce:animate-none"
  />
)

/** O bloco do frete no rodapé da gaveta: campo, calculando, opções, recolhido, falha, sem opção. */
const CartShipping = ({ state }: { state: CartShippingState }) => {
  const {
    phase,
    typed,
    setTyped,
    error,
    cep,
    place,
    loading,
    failed,
    empty,
    options,
    pickup,
    shipping,
    expanded,
  } = state
  const errorId = useId()
  const domicilioId = useId()

  let body: ReactNode
  if (phase === 'input' || cep === null || (loading && (expanded || !shipping))) {
    body = (
      <div className="flex flex-col gap-2 border-b border-estrelinha-line px-5 py-[10px]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            state.calculate()
          }}
        >
          <div className="relative min-w-0 grow">
            <Truck
              aria-hidden
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-estrelinha-primary"
            />
            {/* `min-w-0`: sem ele o campo não encolhe abaixo do min-content e empurra o botão para
                fora da gaveta em 360px. Borda `field` (3:1), nunca `line`. */}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="CEP para calcular o frete"
              aria-label="CEP para calcular o frete e o prazo"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              aria-invalid={error}
              aria-describedby={error ? errorId : undefined}
              className={`h-11 w-full min-w-0 rounded-sm border bg-white pl-10 pr-3 text-[14px] text-estrelinha-ink placeholder:text-estrelinha-ink-soft focus:border-estrelinha-primary focus:outline-none focus:ring-1 focus:ring-estrelinha-primary ${
                error ? 'border-estrelinha-alert' : 'border-estrelinha-field'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 shrink-0 items-center justify-center rounded-sm border-2 border-estrelinha-primary px-4 text-[13px] font-semibold text-estrelinha-primary transition-colors hover:bg-estrelinha-primary/[0.06] disabled:opacity-60 motion-reduce:transition-none"
          >
            {loading ? (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-label="Calculando"
              />
            ) : (
              'Calcular'
            )}
          </button>
        </form>
        {error && (
          <p id={errorId} role="alert" className="text-[12px] leading-4 text-estrelinha-alert">
            CEP inválido
          </p>
        )}
        {loading && (
          <div className="flex flex-col gap-2" aria-busy>
            <Skeleton />
            <Skeleton />
          </div>
        )}
      </div>
    )
  } else if (
    shipping &&
    !expanded &&
    !failed &&
    !empty &&
    shipping.serviceId !== DEFAULT_SHIPPING_SERVICE_ID
  ) {
    // O "Frete padrão" é do checkout (SHP-05); a gaveta nunca o desenha.
    const isPickup = shipping.serviceId === PICKUP_SERVICE_ID
    const titulo = isPickup ? PICKUP_METHOD_NAME : `${shipping.serviceName} · ${shipping.carrier}`
    const chegada = isPickup
      ? pickup
        ? `Pronta para retirada ${pickup.readyLabel}`
        : null
      : draftEstimateLabel(shipping)
    const prazo = isPickup ? chegada : chegada ? `Chega ${chegada}` : 'Prazo confirmado após a postagem'
    const cepTexto = maskCep(cep ?? '')
    const valor = shipping.cost === 0 ? 'Grátis' : formatPrice(shipping.cost)
    const nome = isPickup ? PICKUP_METHOD_NAME : shipping.serviceName
    const Icone = isPickup ? MapPin : Truck
    body = (
      <button
        type="button"
        aria-expanded={false}
        aria-label={`Frete: ${nome}, ${shipping.cost === 0 ? 'grátis' : valor}, para o CEP ${cepTexto}. Ver as opções`}
        onClick={state.expand}
        className="flex min-h-[52px] w-full items-center gap-[10px] border-b border-estrelinha-line px-5 py-[7px] text-left transition-colors hover:bg-estrelinha-ground-deep/50 motion-reduce:transition-none"
      >
        <Icone aria-hidden strokeWidth={1.8} className="h-5 w-5 shrink-0 text-estrelinha-primary" />
        <span className="flex min-w-0 grow flex-col">
          <span className="break-words text-[13.5px] font-semibold leading-[18px] text-estrelinha-ink">
            {titulo}
          </span>
          <span className="break-words text-[12px] leading-4 text-estrelinha-ink-soft">
            {[prazo, `CEP ${cepTexto}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 font-heading text-[14px] font-bold text-estrelinha-primary">
          {valor}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-estrelinha-ink-soft" />
      </button>
    )
  } else {
    const agrupado = !!pickup && options.length > 0
    body = (
      <div className="flex flex-col gap-2 border-b border-estrelinha-line px-5 py-[10px]">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <p className="min-w-0 break-words text-[12.5px] leading-[18px] text-estrelinha-ink-soft">
            Frete para <span className="font-semibold text-estrelinha-ink">{maskCep(cep ?? '')}</span>
            {place ? ` · ${place.city}/${place.state}` : ''}
          </p>
          <button
            type="button"
            onClick={state.changeCep}
            className={`${TAP_ROW} shrink-0 text-[13px] font-semibold text-estrelinha-primary underline`}
          >
            Trocar CEP
          </button>
        </div>

        {failed && (
          <div role="alert" className="flex flex-col items-start gap-1">
            <p className="text-[12.5px] leading-[18px] text-estrelinha-ink">
              {DRAWER_QUOTE_FAILED_MESSAGE}
            </p>
            <button
              type="button"
              onClick={state.retry}
              className="min-h-11 text-[13px] font-semibold text-estrelinha-primary underline"
            >
              Tentar de novo
            </button>
          </div>
        )}
        {empty && (
          <p role="status" className="text-[12.5px] leading-[18px] text-estrelinha-ink">
            {DRAWER_NO_OPTION_MESSAGE}
          </p>
        )}

        {(options.length > 0 || pickup) && (
          <div role="radiogroup" aria-label="Forma de envio" className="flex flex-col gap-2">
            {agrupado && (
              <span id={domicilioId} className="text-[12.5px] text-estrelinha-ink-soft">
                Envio a domicílio
              </span>
            )}
            {options.length > 0 && (
              <div
                role={agrupado ? 'group' : undefined}
                aria-labelledby={agrupado ? domicilioId : undefined}
                className="flex flex-col gap-2"
              >
                {options.map((option) => (
                  <ShippingOptionCard
                    key={option.serviceId}
                    variant="drawer"
                    option={option}
                    selected={shipping?.serviceId === option.serviceId}
                    onSelect={() => state.select(option)}
                  />
                ))}
              </div>
            )}
            {pickup && (
              <div role="group" aria-label="Retirar em" className="flex flex-col gap-2">
                <span className="text-[12.5px] text-estrelinha-ink-soft">Retirar em</span>
                <ShippingOptionCard
                  variant="drawer"
                  pickup={pickup}
                  selected={shipping?.serviceId === PICKUP_SERVICE_ID}
                  onSelect={state.selectPickup}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {state.pickupCep && <PickupSource cep={state.pickupCep} onChange={state.onPickup} />}
      {body}
    </>
  )
}

export default CartShipping
