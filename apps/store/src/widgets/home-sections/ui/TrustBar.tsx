import type { ComponentType } from 'react'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useFreeShipping } from '@estrelinha/core/hooks/useFreeShipping'
import { AtendimentoIcon, EnvioIcon, ParcelasIcon, PixIcon } from '@estrelinha/ui/icons'

/**
 * A faixa de vantagens logo abaixo do hero — board `7CF-0`.
 *
 * Substituiu a `MarqueeBar`, que passava rolando com quatro frases **cravadas no JSX**: "Frete
 * grátis acima de R$150", "Pix com 5% OFF", "Parcele em 12×". Três delas já não batiam com as
 * settings (o teto de parcelas é `max_installments`, hoje 6), e a faixa era o primeiro lugar da
 * home onde a loja prometia número — o pior lugar possível para um número congelado. Aqui todo
 * valor sai da MESMA fonte que o caixa cobra, como já fazia a `ProductTrustBadges` da página do
 * produto.
 *
 * Quatro colunas com divisória no desktop, duas no celular: a 390px, quatro colunas dariam ~86px e
 * o rótulo quebraria em três linhas.
 */
interface Vantagem {
  key: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  top: string
  bottom: string
}

const TrustBar = () => {
  const { pix_enabled, pix_discount_percent, max_installments } = usePaymentSettings()
  const freteGratis = useFreeShipping()

  const items = [
    max_installments > 1 && {
      key: 'parcelas',
      icon: ParcelasIcon,
      top: `Pague em até ${max_installments}x sem juros`,
      bottom: 'nos cartões de crédito',
    },
    {
      key: 'atendimento',
      icon: AtendimentoIcon,
      top: 'Atendimento no WhatsApp',
      bottom: 'humano, do começo ao fim',
    },
    {
      key: 'envio',
      icon: EnvioIcon,
      top: 'Envio garantido',
      // O interruptor decide a segunda linha em vez de sumir com o item: envio para todo o Brasil é
      // verdade com ou sem frete grátis, e é a promessa que a cliente precisa ler.
      bottom: freteGratis.active
        ? `grátis acima de R$ ${freteGratis.threshold}`
        : 'para todo o Brasil',
    },
    pix_enabled &&
      pix_discount_percent > 0 && {
        key: 'pix',
        icon: PixIcon,
        top: `${pix_discount_percent}% de desconto no Pix`,
        bottom: 'aplicado no checkout',
      },
  ].filter(Boolean) as Vantagem[]

  if (items.length === 0) return null

  return (
    <section className="border-b border-estrelinha-line bg-estrelinha-surface">
      <ul className="container grid grid-cols-2 gap-x-6 gap-y-7 py-7 md:flex md:items-stretch md:gap-0 md:py-8">
        {items.map((item, i) => (
          <li
            key={item.key}
            className={`flex items-center gap-4 md:flex-1 ${
              i > 0 ? 'md:border-l md:border-estrelinha-line md:pl-6' : ''
            } ${i < items.length - 1 ? 'md:pr-6' : ''}`}
          >
            <item.icon className="h-7 w-7 shrink-0 text-estrelinha-primary" aria-hidden />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[14px] font-semibold leading-[19px] text-estrelinha-ink md:text-[15px]">
                {item.top}
              </p>
              <p className="text-[12px] leading-[17px] text-estrelinha-ink-soft md:text-[13px]">
                {item.bottom}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default TrustBar
