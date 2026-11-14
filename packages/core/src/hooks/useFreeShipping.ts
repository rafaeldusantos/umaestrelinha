// O binding React do frete grátis (`FRG-03`).
//
// É uma linha de cola, e o ganho não é ergonomia: é que **nenhuma superfície passa a ter motivo para
// importar `useShippingSettings` e ler `free_shipping_threshold`**. Sete delas liam, e as sete
// discordavam no caso de borda — ver o cabeçalho de `../shipping/freeShipping.ts`.
// `freeShippingSingleOwner.test.ts` derruba a suíte se alguma voltar a ler o campo cru.
import { useMemo } from 'react'
import {
  freeShippingConfigOf,
  freeShippingState,
  type FreeShippingState,
} from '../shipping/freeShipping.ts'
import { useShippingSettings } from './useStoreSettings'

/**
 * O estado do frete grátis para um subtotal e, havendo, o CEP do destino.
 *
 * `subtotal` tem default `0` porque quatro consumidores — `TrustBar`, `ProductTrustBadges`,
 * `PoliciesPage` e `AuthOverlay` — só precisam de `active` e `threshold`, que não dependem dele.
 * Sem `cep`, o destino é desconhecido: com as cinco regiões o estado é o de sempre, e com as
 * regiões limitadas `granted` nunca é verdadeiro.
 *
 * A configuração sai de `freeShippingConfigOf` — o leitor único do jsonb —, nunca copiada campo a
 * campo. Memoizado pelas **primitivas**, nunca pelo objeto de settings (as regiões entram pelo
 * `join`): sem isso o retorno muda de identidade a cada render e refaz os `useMemo` de quem
 * consome — `DeliveryBlock` tem um, com o cálculo das opções de entrega dentro.
 */
export function useFreeShipping(subtotal = 0, cep?: string | null): FreeShippingState {
  const config = freeShippingConfigOf(useShippingSettings())
  const enabled = config.free_shipping_enabled
  const threshold = config.free_shipping_threshold
  const regioes = (config.free_shipping_regions ?? []).join(',')

  return useMemo(
    () =>
      freeShippingState(
        {
          free_shipping_enabled: enabled,
          free_shipping_threshold: threshold,
          free_shipping_regions: regioes === '' ? [] : regioes.split(','),
        },
        subtotal,
        cep ?? null,
      ),
    [enabled, threshold, regioes, subtotal, cep],
  )
}

export type { FreeShippingState }
