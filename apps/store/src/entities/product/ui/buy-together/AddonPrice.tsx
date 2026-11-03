import { buyTogetherDiscountedPrice } from '@estrelinha/core/buy-together'
import { formatPrice } from '@estrelinha/core/formatters'

interface Props {
  /** O preço de hoje da variação escolhida (nunca o `compare_price`). */
  price: number
  /** O desconto ao levar junto, ou `null`: sem ele, só o preço. */
  discountPercent: number | null
  /** A linha do bloco usa o preço grande; o cartão de uma lista, o pequeno. */
  size?: 'row' | 'card'
}

const POR = {
  row: 'font-display text-[15px] font-bold text-estrelinha-primary',
  card: 'text-[13px] font-semibold leading-4 text-estrelinha-primary',
} as const

const DE = {
  row: 'text-[13px] leading-[18px] text-estrelinha-ink-soft line-through',
  card: 'text-[12px] leading-4 text-estrelinha-ink-soft line-through',
} as const

/**
 * O preço de uma peça do Compre Junto: sem desconto, o preço; com desconto, o "de/por" — o de hoje
 * riscado e o levando junto, pela função de `core` (a mesma da sacola e do servidor).
 *
 * O par visível sai da leitura e o leitor de tela ouve "de … por …" numa frase só. O `sr-only` é
 * `absolute`: o `relative` daqui o prende dentro do preço, para ele não alargar a faixa que rola.
 */
const AddonPrice = ({ price, discountPercent, size = 'row' }: Props) => {
  if (discountPercent === null || discountPercent === undefined) {
    return <span className={POR[size]}>{formatPrice(price)}</span>
  }
  const junto = buyTogetherDiscountedPrice(price, discountPercent)
  return (
    <span className="relative flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      <span className="sr-only">{`de ${formatPrice(price)} por ${formatPrice(junto)}`}</span>
      <span aria-hidden="true" className={DE[size]}>
        {formatPrice(price)}
      </span>
      <span aria-hidden="true" className={POR[size]}>
        {formatPrice(junto)}
      </span>
    </span>
  )
}

export default AddonPrice
