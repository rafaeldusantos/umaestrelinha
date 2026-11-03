// Compre Junto — o desconto da compra casada numa sacola (ou num pedido): quais linhas saem com o
// percentual que a dona deu ao adicional, e quantas unidades de cada uma.
//
// Folha alcançável pelo Deno: só importa outras folhas deste diretório, por caminho com `.ts`.
// `payment/pricing.ts` a chama dentro de `resolveOrderPricing`, que é o que a gaveta, o checkout e o
// servidor chamam — a tela nunca reparte desconto por conta própria.
//
// A regra:
//
// - Cada unidade de uma joia principal dá desconto a UMA unidade de cada adicional que ela oferece.
//   A unidade cuja variação esconde o adicional não dá (a página nem o mostra para ela). Principal
//   sem grade (`variant_id` nulo) nunca esconde.
// - Dentro da mesma joia, a peça fica com um adicional só (`claimPieces`: a avulsa antes da lista,
//   entre listas a ordem): o percentual é o do adicional que a página mostra.
// - Variação da peça que a dona não liberou no adicional não recebe.
// - Com mais de uma joia, as unidades somam, e o MAIOR percentual é distribuído primeiro; entre as
//   linhas que podem receber, a de maior preço primeiro, e no empate a que vem antes na sacola.
// - No par recíproco (A oferece B e B oferece A, os dois na sacola) só um lado recebe: o da peça
//   levada pelo bloco (a que tem a marca "acompanha" do outro); sem marca de um lado só, a de menor
//   preço cheio da unidade, e no empate a que vem antes.
//
// O preço com desconto é `buyTogetherDiscountedPrice` (`discount.ts`) — nenhuma conta própria aqui.

import { claimPieces, type AddonConfig, type AddonList } from './availability.ts'
import { buyTogetherDiscountedPrice } from './discount.ts'

/** Um adicional como a regra o lê: a configuração de `product_buy_together`, com a joia dona dele. */
export interface BuyTogetherDiscountAddon extends AddonConfig {
  /** A joia principal que oferece este adicional (`product_buy_together.product_id`). */
  mainProductId: string
}

/** Os adicionais das joias que podem estar na sacola, e as listas que eles citam. */
export interface BuyTogetherDiscountConfig {
  addons: readonly BuyTogetherDiscountAddon[]
  lists: readonly AddonList[]
}

/** Uma linha da sacola, como a regra a lê. Estrutural: `PricingItem` satisfaz. */
export interface BuyTogetherCartLine {
  product_id?: string
  variant_id?: string | null
  unit_price: number
  quantity: number
}

/** Unidades de uma linha que saem com um percentual, dado por uma joia. */
export interface BuyTogetherSegment {
  units: number
  percent: number
  /** O preço da unidade com o desconto (`buyTogetherDiscountedPrice`). */
  unitPrice: number
  /** A joia que deu o desconto. */
  mainProductId: string
}

/** O desconto casado de uma linha. Só sai para a linha que recebeu alguma unidade. */
export interface BuyTogetherLineAllocation {
  /** A posição da linha na lista recebida. */
  index: number
  /** O maior percentual primeiro; soma das unidades ≤ quantidade da linha. */
  segments: BuyTogetherSegment[]
  discountedUnits: number
}

interface OfferedPiece {
  productId: string
  variantIds: readonly string[]
}

interface Offer {
  addon: BuyTogetherDiscountAddon
  pieces: OfferedPiece[]
}

/**
 * Os adicionais de uma joia que a página mostra para a variação dada, cada um com as peças que
 * ficaram com ele pela precedência. Sem estoque: quem decide se a linha existe é a sacola.
 */
const offersOf = (
  mainProductId: string,
  mainVariantId: string | null,
  config: BuyTogetherDiscountConfig,
): Offer[] => {
  const listById = new Map(config.lists.map(l => [l.id, l]))
  const visible = config.addons
    .filter(a => a.mainProductId === mainProductId)
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter(a => mainVariantId === null || !a.hiddenOnVariantIds.includes(mainVariantId))
  const candidates = visible.map(addon => {
    const pieces: OfferedPiece[] = []
    if (addon.kind === 'product') {
      if (addon.targetProductId) {
        pieces.push({ productId: addon.targetProductId, variantIds: addon.targetVariantIds })
      }
    } else {
      const list = addon.listId ? listById.get(addon.listId) : undefined
      for (const item of [...(list?.items ?? [])].sort((a, b) => a.position - b.position)) {
        pieces.push({ productId: item.productId, variantIds: item.variantIds })
      }
    }
    return { addon, pieces: pieces.filter(p => p.productId !== mainProductId) }
  })
  const kept = claimPieces(candidates)
  return candidates.map(c => ({ addon: c.addon, pieces: kept.get(c.addon.id) ?? [] }))
}

/** A variação da linha está no que a dona liberou? Vazio = todas; peça sem grade só com vazio. */
const liberated = (piece: OfferedPiece, variantId: string | null | undefined): boolean =>
  piece.variantIds.length === 0 || (!!variantId && piece.variantIds.includes(variantId))

const hasPercent = (p: number | null | undefined): p is number =>
  typeof p === 'number' && Number.isFinite(p) && p > 0

interface Grant {
  mainIndex: number
  mainProductId: string
  position: number
  percent: number
  units: number
  pieces: OfferedPiece[]
}

/**
 * O percentual que a joia daria a esta peça, ignorando a variação do principal — a frase "o desconto
 * de N% volta com a joia na sacola". `null` quando a joia não oferece a peça com desconto (ou não
 * libera esta variação).
 */
export function buyTogetherOfferPercent(
  pieceProductId: string,
  pieceVariantId: string | null | undefined,
  mainProductId: string,
  config: BuyTogetherDiscountConfig,
): number | null {
  for (const offer of offersOf(mainProductId, null, config)) {
    const piece = offer.pieces.find(p => p.productId === pieceProductId)
    if (!piece) continue
    if (!liberated(piece, pieceVariantId)) return null
    return hasPercent(offer.addon.discountPercent) ? offer.addon.discountPercent : null
  }
  return null
}

/**
 * Quais linhas recebem o desconto casado, e quantas unidades. `marks[i]` são os principais que a
 * linha `i` acompanha (a marca "acompanha"): só decidem o par recíproco, nunca o preço.
 */
export function allocateBuyTogetherDiscount(
  lines: readonly BuyTogetherCartLine[],
  config: BuyTogetherDiscountConfig,
  marks: readonly (readonly string[] | null | undefined)[] = [],
): BuyTogetherLineAllocation[] {
  const present = new Set(lines.map(l => l.product_id).filter((id): id is string => !!id))

  const grants: Grant[] = []
  lines.forEach((line, mainIndex) => {
    if (!line.product_id || line.quantity <= 0) return
    for (const offer of offersOf(line.product_id, line.variant_id ?? null, config)) {
      const percent = offer.addon.discountPercent
      if (!hasPercent(percent) || offer.pieces.length === 0) continue
      grants.push({
        mainIndex,
        mainProductId: line.product_id,
        position: offer.addon.position,
        percent,
        units: line.quantity,
        pieces: offer.pieces,
      })
    }
  })

  // O par recíproco: só uma direção sobrevive. `blocked` guarda "a joia X não dá à peça Y".
  const offers = (from: string, to: string) =>
    grants.some(g => g.mainProductId === from && g.pieces.some(p => p.productId === to))
  const marked = (piece: string, main: string) =>
    lines.some((l, i) => l.product_id === piece && (marks[i] ?? []).includes(main))
  const cheapest = (productId: string) =>
    lines.reduce<{ price: number; index: number } | null>((best, l, i) => {
      if (l.product_id !== productId) return best
      if (!best || l.unit_price < best.price) return { price: l.unit_price, index: i }
      return best
    }, null)
  const blocked = new Set<string>()
  const ids = [...present]
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const p = ids[a]
      const q = ids[b]
      if (!offers(p, q) || !offers(q, p)) continue
      const qMarked = marked(q, p)
      const pMarked = marked(p, q)
      // `receiver` é a peça que fica com o desconto; a outra direção é bloqueada.
      let receiver: string
      if (qMarked !== pMarked) receiver = qMarked ? q : p
      else {
        const cp = cheapest(p)
        const cq = cheapest(q)
        receiver =
          cq.price < cp.price || (cq.price === cp.price && cq.index < cp.index) ? q : p
      }
      const giver = receiver === p ? q : p
      blocked.add(`${receiver}>${giver}`)
    }
  }

  grants.sort(
    (x, y) => y.percent - x.percent || x.mainIndex - y.mainIndex || x.position - y.position,
  )

  const remaining = lines.map(l => Math.max(0, l.quantity))
  const segments = lines.map<BuyTogetherSegment[]>(() => [])

  for (const grant of grants) {
    let units = grant.units
    const eligible = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line, index }) => {
        if (!line.product_id || remaining[index] <= 0) return false
        if (line.product_id === grant.mainProductId) return false
        if (blocked.has(`${grant.mainProductId}>${line.product_id}`)) return false
        const piece = grant.pieces.find(p => p.productId === line.product_id)
        return !!piece && liberated(piece, line.variant_id)
      })
      .sort((x, y) => y.line.unit_price - x.line.unit_price || x.index - y.index)

    for (const { line, index } of eligible) {
      if (units <= 0) break
      const take = Math.min(units, remaining[index])
      remaining[index] -= take
      units -= take
      const same = segments[index].find(
        s => s.percent === grant.percent && s.mainProductId === grant.mainProductId,
      )
      if (same) same.units += take
      else {
        segments[index].push({
          units: take,
          percent: grant.percent,
          unitPrice: buyTogetherDiscountedPrice(line.unit_price, grant.percent),
          mainProductId: grant.mainProductId,
        })
      }
    }
  }

  const out: BuyTogetherLineAllocation[] = []
  segments.forEach((segs, index) => {
    if (segs.length === 0) return
    out.push({ index, segments: segs, discountedUnits: segs.reduce((n, s) => n + s.units, 0) })
  })
  return out
}
