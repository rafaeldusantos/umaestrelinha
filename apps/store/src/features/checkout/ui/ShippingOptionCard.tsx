// O cartão de uma opção de envio — o MESMO no bloco Entrega e na gaveta.
//
// Desenhado uma vez para as duas superfícies: escrito em cada uma, o nome, o prazo ou o "Grátis"
// riscado de uma divergiria da outra sem nada quebrar. A variante muda só a altura e o respiro
// (checkout 56px, padding 10px 12px; gaveta 52px, padding 8px 12px).
//
// A opção chega pronta de `deliveryOptions` (preço cheio, preço aplicado, `free`, prazo formatado);
// aqui não se decide frete grátis nenhum. A retirada no escritório tem o próprio desenho: o
// endereço do escritório no lugar do serviço, e "Grátis" sem riscado — ela nunca teve preço.
import { formatPrice } from '@estrelinha/core/formatters'
import type { PickupOption } from '@/entities/pickup'
import type { DeliveryOption } from '../lib/deliveryOptions'

type Variant = 'checkout' | 'drawer'

type Props = {
  selected: boolean
  onSelect: () => void
  variant?: Variant
} & ({ option: DeliveryOption; pickup?: undefined } | { pickup: PickupOption; option?: undefined })

const VARIANT_BOX: Record<Variant, string> = {
  checkout: 'min-h-[56px] px-3 py-[10px]',
  drawer: 'min-h-[52px] px-3 py-2',
}

const ShippingOptionCard = ({ selected, onSelect, variant = 'checkout', option, pickup }: Props) => {
  const titulo = pickup ? pickup.location : `${option.serviceName} · ${option.carrier}`
  const detalhe = pickup
    ? `Pronta para retirada ${pickup.readyLabel}`
    : option.estimateLabel
      ? `Chega ${option.estimateLabel}`
      : 'Prazo confirmado após a postagem'
  const gratis = pickup ? true : option.free

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md border-2 text-left transition-colors duration-150 motion-reduce:transition-none ${VARIANT_BOX[variant]} ${
        selected
          ? 'border-estrelinha-ink bg-estrelinha-ground'
          : 'border-estrelinha-line bg-white hover:border-estrelinha-field'
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 motion-reduce:transition-none ${
          selected ? 'border-estrelinha-ink' : 'border-estrelinha-field'
        }`}
      >
        {selected && <span className="h-[10px] w-[10px] rounded-full bg-estrelinha-ink" />}
      </span>
      <span className="flex min-w-0 grow flex-col gap-[2px]">
        {/* A linha do escritório é longa e tem de caber inteira em 390px: quebra em qualquer ponto,
            nunca corta. */}
        <span
          className={`text-[14px] font-semibold leading-[18px] text-estrelinha-ink ${
            pickup ? '[overflow-wrap:anywhere]' : 'break-words'
          }`}
        >
          {titulo}
        </span>
        <span className="text-[12.5px] leading-4 text-estrelinha-ink-soft">{detalhe}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[2px]">
        <span className="font-heading text-[15px] font-bold leading-5 text-estrelinha-primary">
          {gratis ? 'Grátis' : formatPrice(option.price)}
        </span>
        {!pickup && option.free && (
          <span className="text-xs text-estrelinha-ink-soft line-through">
            {formatPrice(option.price)}
          </span>
        )}
      </span>
    </button>
  )
}

export default ShippingOptionCard
