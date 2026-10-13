import { useMemo } from 'react'
import {
  addBusinessDays,
  formatPickupReady,
  pickupAvailable,
  pickupLocation,
} from '@estrelinha/core/shipping'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { DEFAULT_MATERIAL, DEFAULT_SHIPPING } from '@estrelinha/supabase/types/settings'

/**
 * A retirada no escritório como a loja a mostra (feature 63, RET-01).
 *
 * Mora em `entities` porque dois features do mesmo app a leem — a calculadora da página do produto
 * e o bloco Entrega do checkout (`AD-033`). A regra ("aparece para este CEP?") é de
 * `@estrelinha/core/shipping`; este hook só a alimenta com a configuração da loja.
 */
export interface PickupOption {
  /** `Escritório - Uma Estrelinha - {rua}, {bairro}, {cidade}/{UF}` — sem número nem complemento. */
  location: string
  /** `a partir de 14 de outubro`: hoje + `handling_days` em dias úteis. */
  readyLabel: string
}

export interface PickupOptionState {
  option: PickupOption | null
  /**
   * A configuração da loja já chegou. Enquanto não chega, `option` é `null` pelos defaults (o
   * Material nasce vazio) — e "ainda não sei" não pode desfazer uma retirada restaurada do rascunho.
   */
  settled: boolean
}

export function usePickupOptionState(cep: string | null | undefined): PickupOptionState {
  const { data, isFetched } = useStoreSettings()
  const shipping = data?.shipping ?? DEFAULT_SHIPPING
  const material = data?.material ?? DEFAULT_MATERIAL

  // Fixo por montagem: a data exibida não pode pular enquanto a cliente olha a tela.
  const today = useMemo(() => new Date(), [])

  const location = pickupAvailable({ enabled: shipping.pickup_enabled, material, cep })
    ? pickupLocation(material)
    : null
  const readyLabel = formatPickupReady(addBusinessDays(today, shipping.handling_days))

  // Referência estável: quem consome põe a opção em dependência de efeito.
  const option = useMemo(
    () => (location ? { location, readyLabel } : null),
    [location, readyLabel],
  )

  return { option, settled: isFetched }
}

/** A opção de retirada para este CEP, ou `null` quando ela não aparece (RET-02, RET-05). */
export function usePickupOption(cep: string | null | undefined): PickupOption | null {
  return usePickupOptionState(cep).option
}

/**
 * A linha do escritório para um pedido de retirada JÁ FEITO (RET-19) — confirmação, `/pedido/:id`.
 *
 * Sem o portão do CEP e do interruptor: o pedido já é de retirada, e desligar a retirada depois
 * não muda onde a cliente vai buscar a joia. `null` enquanto o endereço do escritório não está
 * completo (ou a configuração ainda não chegou) — quem desenha diz só "Retirada no escritório".
 */
export function usePickupLocation(): string | null {
  const { data } = useStoreSettings()
  return pickupLocation(data?.material ?? DEFAULT_MATERIAL)
}
