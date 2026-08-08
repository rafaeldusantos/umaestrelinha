import type { ComponentType } from 'react'
import { RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import {
  usePaymentSettings,
  useShippingSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import PixIcon from '@/shared/ui/PixIcon'

/**
 * A faixa de quatro garantias da página do produto (boards de Produto, desktop e mobile).
 *
 * Os números **saem das settings**, não do desenho: `free_shipping_threshold` e
 * `pix_discount_percent` são os mesmos valores que o checkout aplica. Cravar "R$150" e "5%" no JSX
 * faria a página prometer uma regra que o caixa já não pratica — e ninguém perceberia, porque
 * nenhum teste compara texto de vitrine com conta de checkout.
 *
 * Cada item é uma coluna de largura igual com divisória entre elas: no mobile de 390px isso dá
 * ~86px por coluna, o que só cabe com o rótulo em duas linhas — daí o `<br />` explícito em vez de
 * deixar a quebra ao acaso da largura.
 */
/** `150` → "R$ 150"; `149.9` → "R$ 149,90". Só o valor quebrado paga o preço dos centavos. */
const shortPrice = (value: number) =>
  Number.isInteger(value) ? `R$ ${value}` : formatPrice(value)

const ProductTrustBadges = () => {
  const { free_shipping_threshold } = useShippingSettings()
  const { pix_enabled, pix_discount_percent } = usePaymentSettings()

  const items = [
    free_shipping_threshold > 0 && {
      key: 'frete',
      icon: Truck,
      top: 'Frete grátis',
      // "+R$ 150" e não "acima de R$ 150,00": medido em 390px, a coluna tem ~78px e o texto longo
      // quebrava em três linhas, deixando as quatro colunas com alturas diferentes. É a mesma
      // abreviação do board mobile.
      bottom: `+${shortPrice(free_shipping_threshold)}`,
    },
    { key: 'segura', icon: ShieldCheck, top: 'Compra', bottom: 'segura' },
    { key: 'troca', icon: RotateCcw, top: 'Troca em', bottom: '7 dias' },
    pix_enabled &&
      pix_discount_percent > 0 && {
        // O board desenha um envelope aqui, que é ícone de e-mail — a marca do PIX já existe no
        // checkout (PGM-02) e é o que a cliente reconhece.
        key: 'pix',
        icon: PixIcon,
        top: 'Pix com',
        bottom: `${pix_discount_percent}% OFF`,
      },
  ].filter(Boolean) as {
    key: string
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
    top: string
    bottom: string
  }[]

  if (items.length === 0) return null

  return (
    <ul className="flex rounded-md bg-nanita-sugar p-3">
      {items.map((item, i) => (
        <li key={item.key} className="flex flex-1 items-stretch">
          {i > 0 && <span aria-hidden className="w-px shrink-0 bg-nanita-border" />}
          <span className="flex flex-1 flex-col items-center gap-1.5 px-1">
            <item.icon className="h-5 w-5 shrink-0 text-nanita-jam" aria-hidden />
            <span className="text-center text-[11px] font-semibold leading-[14px] text-nanita-ink">
              {item.top}
              <br />
              {item.bottom}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default ProductTrustBadges
