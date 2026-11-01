// A prévia do frete (feature 89, `MON-10`). Só leitura: as opções do Melhor Envio e a retirada
// (quando ela vale para o CEP — `pickupAvailable`, o mesmo dono da loja e da function `checkout`).
// A frase "A cliente escolhe a entrega no link" está em todos os estados: nada aqui é escolha da Adri.

import { Loader2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { PICKUP_METHOD_NAME, pickupAvailable, pickupLocation } from '@estrelinha/core/shipping'
import { useMaterialSettings, useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { DEFAULT_SHIPPING } from '@estrelinha/supabase/types/settings'
import { AVISO_AMBAR } from './estilos'
import { useShippingPreview } from '../api/shippingPreview'
import type { DraftLine } from '../model/draft'

export const CLIENT_CHOOSES = 'A cliente escolhe a entrega e o pagamento no link.'
export const QUOTE_FAILED = 'Não consegui cotar agora. Pode criar o link assim mesmo — a cliente cota na loja.'
export const QUOTE_WAITING = 'Acrescente uma peça e o CEP para cotar.'
export const QUOTE_NEEDS_ZIP = 'Informe o CEP para ver as opções.'

interface Props {
  zip: string
  lines: readonly DraftLine[]
  /** O cupom aplicado é de frete grátis: o preço aparece riscado, com "Grátis" ao lado. */
  freeShipping?: boolean
}

const prazo = (q: { delivery_time: number; delivery_range?: { min: number; max: number } }) => {
  const min = q.delivery_range?.min ?? q.delivery_time
  const max = q.delivery_range?.max ?? q.delivery_time
  return min === max ? `${max} dias úteis` : `${min} a ${max} dias úteis`
}

const Preco = ({ valor, gratis }: { valor: number; gratis: boolean }) =>
  valor === 0 ? (
    <span>Grátis</span>
  ) : gratis ? (
    <span>
      <s className="text-muted-foreground">{formatPrice(valor)}</s> Grátis
    </span>
  ) : (
    <span className="tabular-nums">{formatPrice(valor)}</span>
  )

const ShippingPreview = ({ zip, lines, freeShipping = false }: Props) => {
  const { pronto, opcoes, cotando, falhou } = useShippingPreview(zip, lines)
  const shipping = useShippingSettings()
  const material = useMaterialSettings()
  const retirada = pickupAvailable({
    enabled: shipping.pickup_enabled ?? DEFAULT_SHIPPING.pickup_enabled,
    material,
    cep: zip,
  })
  const temPeca = lines.length > 0

  return (
    <div className="space-y-1.5 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entrega — prévia</span>
        {pronto && cotando && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Cotando…
          </span>
        )}
      </div>
      <div data-testid="previa-do-frete" aria-live="polite" className="space-y-1.5 text-sm">
        {!pronto ? (
          <p className="text-xs text-muted-foreground">{temPeca ? QUOTE_NEEDS_ZIP : QUOTE_WAITING}</p>
        ) : cotando ? null : falhou ? (
          <p data-testid="cotacao-falhou" className={AVISO_AMBAR}>
            {QUOTE_FAILED}
          </p>
        ) : opcoes.length === 0 && !retirada ? (
          <p className="text-xs text-muted-foreground">Nenhuma entrega disponível para este CEP.</p>
        ) : null}

        {pronto && !cotando && (opcoes.length > 0 || retirada) && (
          <ul aria-label="Opções de entrega" className="space-y-1.5">
            {opcoes.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted px-2.5 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-foreground">
                    {q.name} · {q.company}
                  </span>
                  <span className="block text-xs text-muted-foreground">{prazo(q)}</span>
                </span>
                <span className="shrink-0">
                  <Preco valor={Number.parseFloat(q.price)} gratis={freeShipping} />
                </span>
              </li>
            ))}
            {retirada && (
              <li className="flex items-start justify-between gap-3 rounded-lg bg-muted px-2.5 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{PICKUP_METHOD_NAME}</span>
                  <span className="block break-words text-xs text-muted-foreground">{pickupLocation(material)}</span>
                </span>
                <span className="shrink-0">Grátis</span>
              </li>
            )}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{CLIENT_CHOOSES}</p>
    </div>
  )
}

export default ShippingPreview
