// O desconto do Compre Junto na sacola e no checkout: a MESMA entrada para `resolveOrderPricing` nas
// duas superfícies, e o que cada linha diz sobre ele.
//
// Nenhuma conta de dinheiro mora aqui. O que é desconto, quantas unidades e quanto custam vem de
// `resolveOrderPricing` (`buyTogetherLines`); o percentual que volta com a joia vem de
// `buyTogetherOfferPercent`. Este arquivo só monta a entrada e escreve as frases.
import type { BuyTogetherPricingInput, BuyTogetherLinePricing, PricingItem } from '@estrelinha/core/payment/pricing'
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
  /** O total cheio da linha (riscado) e o cobrado. Só com desconto. */
  fullTotal: number | null
  total: number | null
  /** "Acompanha o X · 10% a menos". */
  phrase: string | null
  /** "1 com desconto, 1 a preço cheio" — só quando nem todas as unidades saem com desconto. */
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

/**
 * As frases da linha `index` da sacola. `lines` é a saída `buyTogetherLines` de
 * `resolveOrderPricing`; `mainNames` vem da leitura da configuração (a joia que saiu da sacola só é
 * nomeada por ela).
 */
export function buyTogetherLineFacts(
  index: number,
  items: readonly CartItem[],
  lines: readonly BuyTogetherLinePricing[] | undefined,
  config: BuyTogetherDiscountConfig | null,
  mainNames: ReadonlyMap<string, string>,
): BuyTogetherLineFacts {
  const item = items[index]
  if (!item) return NO_FACTS
  const nameOf = (id: string) =>
    items.find(i => i.product.id === id)?.product.name ?? mainNames.get(id) ?? null

  const line = (lines ?? []).find(l => l.index === index)
  if (line && line.discount > 0) {
    const names: string[] = companionsOf(item, items as CartItem[]).map(p => p.name)
    for (const seg of line.segments) {
      const name = nameOf(seg.mainProductId)
      if (name && !names.includes(name)) names.push(name)
    }
    const percent = line.segments[0].percent
    const companions = companionPhrase(names)
    const rest = item.quantity - line.discountedUnits
    return {
      fullTotal: line.fullTotal,
      total: line.total,
      phrase: companions ? `${companions} · ${percent}% a menos` : `${percent}% a menos`,
      mixed: rest > 0 ? `${line.discountedUnits} com desconto, ${rest} a preço cheio` : null,
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
