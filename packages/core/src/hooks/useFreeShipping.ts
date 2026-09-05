// O binding React do frete grátis (`FRG-03`).
//
// É uma linha de cola, e o ganho não é ergonomia: é que **nenhuma superfície passa a ter motivo para
// importar `useShippingSettings` e ler `free_shipping_threshold`**. Sete delas liam, e as sete
// discordavam no caso de borda — ver o cabeçalho de `../shipping/freeShipping.ts`.
// `freeShippingSingleOwner.test.ts` derruba a suíte se alguma voltar a ler o campo cru.
import { useMemo } from 'react'
import { freeShippingState, type FreeShippingState } from '../shipping/freeShipping.ts'
import { useShippingSettings } from './useStoreSettings'

/**
 * O estado do frete grátis para um subtotal.
 *
 * `subtotal` tem default `0` porque quatro consumidores — `TrustBar`, `ProductTrustBadges`,
 * `PoliciesPage` e `AuthOverlay` — só precisam de `active` e `threshold`, que não dependem dele.
 *
 * Memoizado pelas **primitivas**, nunca pelo objeto de settings: sem isso o retorno muda de
 * identidade a cada render e refaz os `useMemo` de quem consome — `DeliveryBlock` tem um, com o
 * cálculo das opções de entrega dentro.
 */
export function useFreeShipping(subtotal = 0): FreeShippingState {
  const { free_shipping_enabled, free_shipping_threshold } = useShippingSettings()

  return useMemo(
    () => freeShippingState({ free_shipping_enabled, free_shipping_threshold }, subtotal),
    [free_shipping_enabled, free_shipping_threshold, subtotal],
  )
}

export type { FreeShippingState }
