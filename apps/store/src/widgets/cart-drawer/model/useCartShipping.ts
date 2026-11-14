// O frete na gaveta da sacola: o CEP, as opções reais e a escolha.
//
// A gaveta não tem regra de frete própria. A cotação é `useShippingQuote` (a mesma chave do bloco
// Entrega, então seguir para o checkout com o mesmo CEP e a mesma sacola não chama o Melhor Envio de
// novo), a lista é `deliveryOptions` e o cartão é `ShippingOptionCard` — os três de
// `features/checkout`. O CEP e a escolha moram no rascunho padrão do checkout (`useCheckoutStore`),
// lido pelo import direto e nunca pelo provider: o rascunho do pedido montado (`/pedido-montado`)
// é outra instância, e a gaveta não pode ler nem escrever nele.
//
// Diferente do checkout, aqui não existe o "Frete padrão" (SHP-05) quando a cotação falha: na gaveta
// ele seria um número que a cliente leria como o frete dela. E a escolha não emite
// `add_shipping_info` — a cliente ainda não está no caixa.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { maskCep, stripCep } from '@estrelinha/core/validators'
import {
  PICKUP_CARRIER,
  PICKUP_METHOD_NAME,
  PICKUP_SERVICE_ID,
  isRsCep,
} from '@estrelinha/core/shipping'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useFreeShipping } from '@estrelinha/core/hooks/useFreeShipping'
import type { ShippingDraft } from '@estrelinha/core/checkout'
import { useCepLookup } from '@/entities/address'
import type { PickupOption } from '@/entities/pickup'
import {
  DEFAULT_SHIPPING_SERVICE_ID,
  deliveryOptions,
  toShippingDraft,
  useCheckoutStore,
  useShippingQuote,
  type DeliveryOption,
} from '@/features/checkout'

export const DRAWER_QUOTE_FAILED_MESSAGE =
  'Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout, onde ele é calculado outra vez.'
export const DRAWER_NO_OPTION_MESSAGE =
  'Nenhuma opção de frete disponível para este CEP. No checkout, você pode tentar outro endereço.'

/** O rascunho da retirada — o mesmo que o bloco Entrega grava (RET-07): frete zero, sem datas. */
const PICKUP_DRAFT: ShippingDraft = {
  serviceId: PICKUP_SERVICE_ID,
  serviceName: PICKUP_METHOD_NAME,
  carrier: PICKUP_CARRIER,
  cost: 0,
  estimateMin: '',
  estimateMax: '',
}

const sameDraft = (a: ShippingDraft, b: ShippingDraft) =>
  a.serviceId === b.serviceId &&
  a.cost === b.cost &&
  a.estimateMin === b.estimateMin &&
  a.estimateMax === b.estimateMax &&
  a.serviceName === b.serviceName &&
  a.carrier === b.carrier

/** O frete que entra no Total da gaveta, e como a linha do resumo o nomeia. */
export interface DrawerCharge {
  label: string
  cost: number
}

export interface PickupRead {
  option: PickupOption | null
  settled: boolean
}

/**
 * O estado do frete da gaveta. Chamado só com a gaveta aberta e com peças: as consultas (cotação,
 * busca do CEP) não podem rodar em toda rota da loja, onde a gaveta vive montada.
 */
export function useCartShipping({
  subtotal,
  couponFreeShipping,
}: {
  subtotal: number
  couponFreeShipping: boolean
}) {
  const address = useCheckoutStore((s) => s.address)
  const shipping = useCheckoutStore((s) => s.shipping)
  const setAddress = useCheckoutStore((s) => s.setAddress)
  const setShipping = useCheckoutStore((s) => s.setShipping)
  const setCepOrigin = useCheckoutStore((s) => s.setCepOrigin)
  const { handling_days } = useShippingSettings()

  const savedCep = stripCep(address.cep)
  // Com o CEP já no rascunho, a gaveta abre no resultado dele; sem, no campo.
  const [phase, setPhase] = useState<'input' | 'result'>(
    savedCep.length === 8 ? 'result' : 'input',
  )
  const [typed, setTyped] = useState(() => maskCep(address.cep ?? ''))
  const [error, setError] = useState(false)
  // A lista nasce aberta sem escolha e recolhida com ela.
  const [expanded, setExpanded] = useState(() => !shipping)

  const cep = phase === 'result' && savedCep.length === 8 ? savedCep : null
  const freeShipping = useFreeShipping(subtotal, cep)
  const quote = useShippingQuote(cep)
  const lookup = useCepLookup(cep)
  const place =
    lookup.data && !lookup.data.manual && lookup.data.city && lookup.data.state
      ? { city: lookup.data.city, state: lookup.data.state }
      : null

  const rsCep = cep !== null && isRsCep(cep)
  const [pickupRead, setPickupRead] = useState<PickupRead | null>(null)
  const onPickup = useCallback((read: PickupRead | null) => setPickupRead(read), [])
  const pickup = rsCep ? (pickupRead?.option ?? null) : null
  const pickupSettled = rsCep ? !!pickupRead?.settled : true

  const today = useMemo(() => new Date(), [])
  const quotes = useMemo(() => quote.data ?? [], [quote.data])
  const loading = cep !== null && quote.isLoading
  const failed = cep !== null && quote.isError
  const empty = cep !== null && quote.isSuccess && quotes.length === 0

  const { options, cheapestId } = useMemo(
    () =>
      cep !== null && quote.isSuccess
        ? deliveryOptions({
            quotes,
            granted: freeShipping.granted,
            couponFreeShipping,
            handlingDays: handling_days,
            today,
          })
        : { options: [] as DeliveryOption[], cheapestId: null as string | null },
    [cep, quote.isSuccess, quotes, freeShipping.granted, couponFreeShipping, handling_days, today],
  )

  // A escolha acompanha cada cotação e o veredito do frete grátis: o custo de AGORA.
  //
  // Marcar a mais barata (sem escolha, ou quando a escolha sumiu da cotação) e desfazer a escolha
  // numa cotação que falhou são decisões só do CEP que a GAVETA calculou (`cepOrigin === 'sacola'`).
  // A gaveta também abre dentro de `/checkout`: com um CEP digitado no bloco Entrega, a cliente está
  // escolhendo ali (2+ opções não pré-selecionam), e o "Frete padrão" que o bloco grava na falha da
  // cotação é a saída dele (SHP-05) — abrir a sacola não pode escolher por ela nem apagar isso.
  // A retirada nunca vem marcada.
  useEffect(() => {
    if (cep === null) return
    const { shipping: atual, cepOrigin } = useCheckoutStore.getState()
    const daGaveta = cepOrigin === 'sacola'
    if (atual?.serviceId === PICKUP_SERVICE_ID) {
      if (!pickupSettled || pickup) return
    }
    if (failed || empty) {
      if (
        daGaveta &&
        atual &&
        atual.serviceId !== PICKUP_SERVICE_ID &&
        atual.serviceId !== DEFAULT_SHIPPING_SERVICE_ID
      ) {
        setShipping(null)
      }
      return
    }
    if (!options.length) return
    const escolhida = atual ? options.find((o) => o.serviceId === atual.serviceId) : undefined
    if (!escolhida && !daGaveta) return
    const alvo = escolhida ?? options.find((o) => o.serviceId === cheapestId) ?? options[0]
    const draft = toShippingDraft(alvo)
    if (atual && sameDraft(atual, draft)) return
    setShipping(draft)
  }, [cep, options, cheapestId, failed, empty, pickup, pickupSettled, setShipping])

  const calculate = () => {
    const digitos = stripCep(typed)
    if (digitos.length !== 8) {
      setError(true)
      return
    }
    setError(false)
    if (digitos !== savedCep) {
      // Outro CEP é outra cotação: a escolha anterior não vale para ele.
      setShipping(null)
      setAddress({ cep: maskCep(digitos) })
    }
    // Depois do `setAddress`, que zera a origem quando o CEP muda.
    setCepOrigin('sacola')
    setPhase('result')
    setExpanded(true)
  }

  const changeCep = () => {
    setShipping(null)
    setTyped(maskCep(address.cep ?? ''))
    setError(false)
    setPhase('input')
  }

  const select = (option: DeliveryOption) => {
    setShipping(toShippingDraft(option))
    setExpanded(false)
  }

  const selectPickup = () => {
    setShipping(PICKUP_DRAFT)
    setExpanded(false)
  }

  const isPickup = shipping?.serviceId === PICKUP_SERVICE_ID
  const charge: DrawerCharge | null =
    cep !== null && shipping && (isPickup || !failed)
      ? {
          label: isPickup ? PICKUP_METHOD_NAME : `Frete · ${shipping.serviceName}`,
          cost: shipping.cost,
        }
      : null

  return {
    phase,
    typed,
    setTyped: (value: string) => {
      setTyped(maskCep(value))
      setError(false)
    },
    error,
    cep,
    place,
    freeShipping,
    loading,
    failed,
    empty,
    options,
    pickup,
    /** O CEP do RS cuja retirada a tela deve ler (`PickupSource`), ou `null`. */
    pickupCep: rsCep ? cep : null,
    onPickup,
    shipping,
    expanded,
    expand: () => setExpanded(true),
    calculate,
    changeCep,
    select,
    selectPickup,
    retry: () => void quote.refetch(),
    charge,
  }
}

export type CartShippingState = ReturnType<typeof useCartShipping>

