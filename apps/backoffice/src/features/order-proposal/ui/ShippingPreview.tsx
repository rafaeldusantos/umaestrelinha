// A prévia do frete (feature 89, `MON-10`). Só leitura: as opções do Melhor Envio e a retirada
// (quando ela vale para o CEP — `pickupAvailable`, o mesmo dono da loja e da function `checkout`).
// A frase "A cliente escolhe a entrega no link" está em todos os estados: nada aqui é escolha da Adri.

import { Truck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { PICKUP_METHOD_NAME, pickupAvailable, pickupLocation } from '@estrelinha/core/shipping'
import { useMaterialSettings, useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { DEFAULT_SHIPPING } from '@estrelinha/supabase/types/settings'
import { FormCard } from '@/shared/ui'
import { useShippingPreview } from '../api/shippingPreview'
import type { DraftLine } from '../model/draft'

export const CLIENT_CHOOSES = 'A cliente escolhe a entrega no link.'
export const QUOTE_FAILED = 'Não consegui cotar o frete agora.'
export const QUOTE_WAITING = 'Preencha o CEP e acrescente uma peça para ver a prévia do frete.'

interface Props {
  zip: string
  lines: readonly DraftLine[]
}

const prazo = (q: { delivery_time: number; delivery_range?: { min: number; max: number } }) => {
  const min = q.delivery_range?.min ?? q.delivery_time
  const max = q.delivery_range?.max ?? q.delivery_time
  return min === max ? `${max} dias úteis` : `${min} a ${max} dias úteis`
}

const ShippingPreview = ({ zip, lines }: Props) => {
  const { pronto, opcoes, cotando, falhou } = useShippingPreview(zip, lines)
  const shipping = useShippingSettings()
  const material = useMaterialSettings()
  const retirada = pickupAvailable({
    enabled: shipping.pickup_enabled ?? DEFAULT_SHIPPING.pickup_enabled,
    material,
    cep: zip,
  })

  return (
    <FormCard title="Prévia do frete" description={CLIENT_CHOOSES}>
      <div data-testid="previa-do-frete" aria-live="polite" className="space-y-2 text-sm">
        {!pronto ? (
          <p className="text-muted-foreground">{QUOTE_WAITING}</p>
        ) : cotando ? (
          <p className="text-muted-foreground">Cotando o frete…</p>
        ) : falhou ? (
          <p data-testid="cotacao-falhou" className="text-foreground">
            {QUOTE_FAILED} O link pode ser criado mesmo assim.
          </p>
        ) : opcoes.length === 0 && !retirada ? (
          <p className="text-muted-foreground">Nenhuma entrega disponível para este CEP.</p>
        ) : null}

        {pronto && !cotando && (opcoes.length > 0 || retirada) && (
          <ul aria-label="Opções de entrega" className="space-y-1.5">
            {opcoes.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 rounded-lg border border-input px-3 py-2">
                <span className="flex min-w-0 items-start gap-2">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block break-words font-medium text-foreground">
                      {q.company} {q.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">{prazo(q)}</span>
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatPrice(Number.parseFloat(q.price))}</span>
              </li>
            ))}
            {retirada && (
              <li className="flex items-start justify-between gap-3 rounded-lg border border-input px-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{PICKUP_METHOD_NAME}</span>
                  <span className="block break-words text-xs text-muted-foreground">{pickupLocation(material)}</span>
                </span>
                <span className="shrink-0">Grátis</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </FormCard>
  )
}

export default ShippingPreview
