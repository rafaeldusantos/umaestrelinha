// A lista de opções de envio — uma regra só para o bloco Entrega e para a gaveta.
//
// As duas superfícies mostram as MESMAS opções, com os mesmos nomes, prazos e preços. Escrita em
// cada uma, a de uma tela divergiria da outra sem nada quebrar — foi o que a página do produto já
// teve com o prazo. Aqui entra a cotação e o veredito do frete grátis já decidido
// (`freeShippingState().granted`); a faixa não é lida, e a regra do frete grátis não é refeita.
//
// SHP-05: sem cotação, uma única opção "Frete padrão" — só quando quem chama permite (o checkout
// permite; a gaveta não). SHP-06: com o frete grátis concedido, só a opção **mais barata** vai a
// zero. O cupom de frete grátis zera todas.
import { cheapestQuoteId, formatEstimate, quoteToEstimate } from '@estrelinha/core/shipping'
import type { ShippingDraft } from '@estrelinha/core/checkout'
import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'

export const DEFAULT_SHIPPING_SERVICE_ID = 'default'

export interface DeliveryOption extends ShippingDraft {
  /** Preço cotado antes do frete grátis — é o valor riscado ao lado de "Grátis". */
  price: number
  free: boolean
  /** `null` no fallback: sem cotação não há data honesta a exibir. */
  estimateLabel: string | null
}

export interface DeliveryOptionsInput {
  /** A cotação, já sem as opções de preço zero (`useShippingQuote`). */
  quotes: ShippingQuote[]
  /** O frete grátis por valor foi concedido para este destino? (`useFreeShipping(...).granted`) */
  granted: boolean
  /** O cupom aplicado é de frete grátis. */
  couponFreeShipping?: boolean
  /** O `serviceId` da opção escolhida no rascunho, se houver. */
  selectedId?: string | null
  /**
   * O custo do "Frete padrão" quando ele é permitido e a cotação não trouxe opção (falhou ou veio
   * vazia). `null`/ausente: sem fallback — a lista fica vazia.
   */
  fallbackCost?: number | null
  handlingDays: number
  /** Fixo por montagem: a data exibida não pode pular enquanto a cliente preenche. */
  today: Date
}

export interface DeliveryOptionsResult {
  options: DeliveryOption[]
  /** O id da opção mais barata da cotação, como texto (o `serviceId`); `null` sem cotação. */
  cheapestId: string | null
  /**
   * A opção escolhida, com o custo de AGORA: acompanha a cotação nova e o veredito do frete grátis.
   * `null` quando não há escolha ou a escolha não está na lista.
   */
  selected: DeliveryOption | null
}

/** `YYYY-MM-DD` a partir das partes locais — `toISOString` deslocaria o dia por fuso. */
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Descarta o que é só apresentação: `ShippingDraft` é o que entra no pedido (SHP-07). */
export const toShippingDraft = ({
  price: _price,
  free: _free,
  estimateLabel: _label,
  ...draft
}: DeliveryOption): ShippingDraft => draft

export function deliveryOptions({
  quotes,
  granted,
  couponFreeShipping = false,
  selectedId = null,
  fallbackCost = null,
  handlingDays,
  today,
}: DeliveryOptionsInput): DeliveryOptionsResult {
  const lista = quotes ?? []
  let options: DeliveryOption[]

  if (lista.length === 0) {
    options =
      fallbackCost === null || fallbackCost === undefined
        ? []
        : [
            {
              serviceId: DEFAULT_SHIPPING_SERVICE_ID,
              serviceName: 'Frete padrão',
              carrier: 'Correios',
              cost: couponFreeShipping ? 0 : fallbackCost,
              estimateMin: '',
              estimateMax: '',
              price: fallbackCost,
              free: couponFreeShipping,
              estimateLabel: null,
            },
          ]
  } else {
    const cheapest = cheapestQuoteId(lista)
    options = lista.map((q) => {
      const { min, max } = quoteToEstimate(q, handlingDays, today)
      const price = Number.parseFloat(q.price)
      // Cupom de frete grátis zera todas; o frete grátis concedido zera só a mais barata (SHP-06).
      const free = couponFreeShipping || (granted && q.id === cheapest)
      return {
        serviceId: String(q.id),
        serviceName: q.name,
        carrier: q.company,
        cost: free ? 0 : price,
        estimateMin: toIsoDate(min),
        estimateMax: toIsoDate(max),
        price,
        free,
        estimateLabel: formatEstimate(min, max),
      }
    })
  }

  const cheapestRaw = lista.length ? cheapestQuoteId(lista) : null
  return {
    options,
    cheapestId: cheapestRaw === null ? null : String(cheapestRaw),
    selected: selectedId ? (options.find((o) => o.serviceId === selectedId) ?? null) : null,
  }
}
