// O desconto do Compre Junto na sacola e no checkout: a MESMA entrada para `resolveOrderPricing` nas
// duas superfícies, e o que cada linha diz sobre ele.
//
// Nenhuma conta de dinheiro mora aqui. Que linha leva o desconto casado e de que joia vem de
// `resolveOrderPricing` (`buyTogetherLines`); o preço que a linha mostra é o COBRADO, das linhas de
// `resolveOrderLines` — o caminho que venceu, com a promoção ou a oferta do checkout quando elas
// dão menos que o casado (`AD-015`). O percentual que volta com a joia vem de
// `buyTogetherOfferPercent`. Este arquivo só monta a entrada, soma as linhas e escreve as frases.
import type {
  BuyTogetherPricingInput,
  BuyTogetherLinePricing,
  ChargedLine,
  PricingItem,
} from '@estrelinha/core/payment/pricing'
import {
  buyTogetherOfferPercent,
  companionPhrase,
  type BuyTogetherDiscountConfig,
} from '@estrelinha/core/buy-together'
import { companionsOf, type CartItem } from '../model/cartStore'

/** Os ids que a leitura da configuração pede: as linhas da sacola e as joias que as marcas citam. */
export const cartBuyTogetherIds = (items: readonly CartItem[]): string[] => {
  const ids = new Set<string>()
  for (const item of items) {
    ids.add(item.product.id)
    for (const mark of item.accompanies ?? []) ids.add(mark.mainProductId)
  }
  return [...ids]
}

/**
 * A linha da sacola como `resolveOrderPricing` a lê: preço CHEIO da linha (`unitPrice`, nunca
 * `product.price`) e, só quando há desconto casado a calcular, a variação — que ele precisa (a do
 * principal pode esconder o adicional; a da peça pode não ter sido liberada). Sem ele a linha sai
 * na forma de sempre, e é ela que vai ao pedido.
 */
export const cartPricingItem = (
  item: CartItem,
  buyTogether: BuyTogetherPricingInput | undefined,
): PricingItem => ({
  product_id: item.product.id,
  unit_price: item.unitPrice,
  quantity: item.quantity,
  ...(buyTogether && item.variantId ? { variant_id: item.variantId } : {}),
})

/**
 * A entrada `buyTogether` de `resolveOrderPricing`, com as marcas da sacola alinhadas às linhas.
 * `undefined` sem configuração com desconto: o cálculo é exatamente o de antes.
 */
export const cartBuyTogetherInput = (
  items: readonly CartItem[],
  config: BuyTogetherDiscountConfig | null,
): BuyTogetherPricingInput | undefined =>
  config
    ? { ...config, marks: items.map(i => (i.accompanies ?? []).map(m => m.mainProductId)) }
    : undefined

/** O que a linha de uma peça diz sobre o desconto casado. */
export interface BuyTogetherLineFacts {
  /** O total cheio da linha (riscado) e o cobrado. Só quando o cobrado é menor que o cheio. */
  fullTotal: number | null
  total: number | null
  /** "Acompanha o X · 10% a menos" — o percentual só quando o casado é o desconto que valeu. */
  phrase: string | null
  /** "1 com desconto, 1 a preço cheio" — só quando alguma unidade é COBRADA a preço cheio. */
  mixed: string | null
  /** "O desconto de 10% volta com o X na sacola." — a peça entrou pelo bloco e a joia saiu. */
  returns: string | null
}

const NO_FACTS: BuyTogetherLineFacts = {
  fullTotal: null,
  total: null,
  phrase: null,
  mixed: null,
  returns: null,
}

const round2 = (value: number) => Math.round(value * 100) / 100
const samePrice = (a: number, b: number) => Math.abs(a - b) < 0.005

/**
 * As frases da linha `index` da sacola. `lines` é a saída `buyTogetherLines` de
 * `resolveOrderPricing`; `charged` são as linhas de `resolveOrderLines` para a MESMA entrada (o
 * preço cobrado de cada unidade); `mainNames` vem da leitura da configuração (a joia que saiu da
 * sacola só é nomeada por ela).
 */
export function buyTogetherLineFacts(
  index: number,
  items: readonly CartItem[],
  lines: readonly BuyTogetherLinePricing[] | undefined,
  charged: readonly ChargedLine[] | undefined,
  config: BuyTogetherDiscountConfig | null,
  mainNames: ReadonlyMap<string, string>,
): BuyTogetherLineFacts {
  const item = items[index]
  if (!item) return NO_FACTS
  const nameOf = (id: string) =>
    items.find(i => i.product.id === id)?.product.name ?? mainNames.get(id) ?? null

  const line = (lines ?? []).find(l => l.index === index)
  if (line && line.segments.length > 0) {
    const names: string[] = companionsOf(item, items as CartItem[]).map(p => p.name)
    for (const seg of line.segments) {
      const name = nameOf(seg.mainProductId)
      if (name && !names.includes(name)) names.push(name)
    }
    const companions = companionPhrase(names)

    // O preço da linha é o cobrado: a soma das partes que o pedido grava para ela.
    const parts = (charged ?? []).filter(c => c.index === index)
    const fullTotal = parts.length
      ? round2(parts.reduce((sum, c) => sum + c.fullUnitPrice * c.quantity, 0))
      : line.fullTotal
    const total = parts.length
      ? round2(parts.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0))
      : line.total
    const fullUnits = parts.length
      ? parts.filter(c => c.unitPrice >= c.fullUnitPrice).reduce((n, c) => n + c.quantity, 0)
      : item.quantity - line.discountedUnits
    const discountedUnits = item.quantity - fullUnits

    // O percentual do casado só é anunciado quando alguma unidade sai mesmo pelo preço dele: com a
    // promoção ou a oferta vencendo, "10% a menos" descreveria um desconto que não foi o cobrado.
    const casado = line.segments.find(seg =>
      parts.length
        ? parts.some(c => c.unitPrice < c.fullUnitPrice && samePrice(c.unitPrice, seg.unitPrice))
        : line.discount > 0,
    )
    const percent = casado ? casado.percent : null

    if (total >= fullTotal && !companions) return NO_FACTS
    return {
      fullTotal: total < fullTotal ? fullTotal : null,
      total: total < fullTotal ? total : null,
      phrase:
        percent !== null
          ? companions
            ? `${companions} · ${percent}% a menos`
            : `${percent}% a menos`
          : companions || null,
      mixed:
        fullUnits > 0 && discountedUnits > 0
          ? `${discountedUnits} com desconto, ${fullUnits} a preço cheio`
          : null,
      returns: null,
    }
  }

  // A peça entrou pelo Compre Junto e a joia saiu: o desconto volta com ela.
  if (config) {
    for (const mark of item.accompanies ?? []) {
      if (items.some(i => i.product.id === mark.mainProductId)) continue
      const percent = buyTogetherOfferPercent(item.product.id, item.variantId, mark.mainProductId, config)
      const name = nameOf(mark.mainProductId)
      if (percent !== null && name) {
        return { ...NO_FACTS, returns: `O desconto de ${percent}% volta com o ${name} na sacola.` }
      }
    }
  }
  return NO_FACTS
}
