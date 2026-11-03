// Compre Junto — o que a página do produto pode oferecer, dados o produto principal, a configuração
// dos adicionais e o que a leitura devolveu das peças.
//
// Folha: sem import de pacote, alcançável pelo Deno por caminho relativo. Por isso a disponibilidade
// da variação é escrita aqui (`core/pricing` importa tipos de `@estrelinha/supabase`), e o teste a
// compara com `isVariantAvailable` em toda combinação — uma cópia deliberada com guarda que lê os dois.
//
// A peça "saiu do ar" quando a leitura não a devolveu: quem decide é a RLS de `products`, a mesma da
// vitrine. Aqui só se pula o que faltou.

import type { BuyTogetherAddonKind, BuyTogetherListItem } from './types.ts'

type StockPolicyLike = 'track' | 'none' | 'backorder'

/** O que a regra lê de uma variação. Estrutural: `ProductVariant` da loja satisfaz. */
export interface PieceVariant {
  id: string
  /** `null` = sem preço: não é vendável. */
  price: number | null
  stock: number
  is_active: boolean
  position?: number
  option_values?: Record<string, string> | null
}

/** O que a regra lê de uma peça. Estrutural: `Product` da loja satisfaz. */
export interface PieceProduct {
  id: string
  stock_policy: StockPolicyLike
  stock_total: number
  options: readonly { name: string; values: readonly string[] }[]
  variants: readonly PieceVariant[]
}

/** Um adicional como a joia o configurou (`product_buy_together`). */
export interface AddonConfig {
  id: string
  position: number
  kind: BuyTogetherAddonKind
  targetProductId: string | null
  listId: string | null
  /** Vazio = vale todas as ativas; com ids = só essas. */
  targetVariantIds: readonly string[]
  /** O adicional some quando a variação escolhida do principal está aqui. */
  hiddenOnVariantIds: readonly string[]
  /**
   * O desconto ao levar junto, em percentual inteiro de 1 a 50 (`discount_percent`). `null` ou
   * ausente = sem desconto. O preço com desconto é `buyTogetherDiscountedPrice` (`discount.ts`).
   */
  discountPercent?: number | null
}

export interface AddonList {
  id: string
  name: string
  items: readonly BuyTogetherListItem[]
}

/** Uma peça que a cliente pode escolher dentro de um adicional. */
export interface ResolvedPiece {
  productId: string
  /** Peça sem grade vendável: não há variação a escolher. */
  simple: boolean
  /** Os ids das variações vendáveis e liberadas, na ordem de `position`. Vazio quando `simple`. */
  variantIds: readonly string[]
  /** O que a dona liberou para esta peça. Vazio = todas. A tela mostra a esgotada desabilitada. */
  liberated: readonly string[]
}

export interface ResolvedAddon {
  id: string
  position: number
  kind: BuyTogetherAddonKind
  listId: string | null
  listName: string | null
  pieces: readonly ResolvedPiece[]
}

/** Mesma regra de `isVariantAvailable` de `core/pricing`, mais o preço: sem preço não se vende. */
export const variantSellable = (v: PieceVariant, policy: StockPolicyLike): boolean => {
  if (!v.is_active) return false
  if (v.price === null || v.price === undefined) return false
  if (policy === 'none' || policy === 'backorder') return true
  return v.stock > 0
}

const hasGrid = (p: PieceProduct): boolean =>
  p.options.some(o => o.values.length > 0) &&
  p.variants.some(v => v.is_active && v.price !== null && v.price !== undefined)

/**
 * A peça pode ser oferecida? Devolve as variações vendáveis dentro do que foi liberado, ou `null`.
 *
 * **`liberated` não vazio nunca vira "todas"**: se as variações liberadas sumiram ou esgotaram, a
 * peça some — o contrário ofereceria justamente o que a dona não liberou.
 */
const pieceOf = (p: PieceProduct, liberated: readonly string[]): ResolvedPiece | null => {
  if (!hasGrid(p)) {
    if (liberated.length > 0) return null
    const ok = p.stock_policy !== 'track' || p.stock_total > 0
    return ok ? { productId: p.id, simple: true, variantIds: [], liberated: [] } : null
  }
  const ids = [...p.variants]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .filter(v => liberated.length === 0 || liberated.includes(v.id))
    .filter(v => variantSellable(v, p.stock_policy))
    .map(v => v.id)
  return ids.length > 0
    ? { productId: p.id, simple: false, variantIds: ids, liberated: [...liberated] }
    : null
}

/**
 * A precedência entre os adicionais de UMA joia: cada peça fica com um adicional só. A peça avulsa
 * vem antes da lista (é a escolha explícita da dona), e entre listas vale a ordem em que chegam —
 * o chamador as passa já na ordem de `position`.
 *
 * Sem estoque nem disponibilidade: é só a regra de quem fica com a peça. `resolveAddons` a chama com
 * as peças oferecíveis, e o desconto da compra casada (`cartDiscount.ts`) com todas — a mesma regra,
 * um dono só, para o percentual da sacola ser o do adicional que a página mostra.
 *
 * Devolve, por id de adicional, as peças que ficaram com ele (na ordem em que vieram).
 */
export function claimPieces<P extends { productId: string }>(
  candidates: readonly { addon: { id: string; kind: BuyTogetherAddonKind }; pieces: readonly P[] }[],
): Map<string, P[]> {
  const claimed = new Set<string>()
  const kept = new Map<string, P[]>()
  for (const kind of ['product', 'list'] as const) {
    for (const c of candidates.filter(x => x.addon.kind === kind)) {
      const pieces = c.pieces.filter(p => !claimed.has(p.productId))
      for (const p of pieces) claimed.add(p.productId)
      kept.set(c.addon.id, pieces)
    }
  }
  return kept
}

export interface ResolveAddonsInput {
  mainProductId: string
  /** A variação escolhida do principal, ou `null` em produto simples. */
  mainVariantId: string | null
  addons: readonly AddonConfig[]
  lists: readonly AddonList[]
  products: readonly PieceProduct[]
}

/**
 * Os adicionais que a página mostra agora, na ordem da dona.
 *
 * Pula, **só neste produto**: o próprio principal e a peça que já aparece em outro adicional dele. A
 * peça avulsa tem precedência sobre a lista (é a escolha explícita), e entre listas vale a ordem. Um
 * adicional sem peça sobrando some inteiro.
 */
export function resolveAddons(input: ResolveAddonsInput): ResolvedAddon[] {
  const byId = new Map(input.products.map(p => [p.id, p]))
  const listById = new Map(input.lists.map(l => [l.id, l]))
  const ordered = [...input.addons].sort((a, b) => a.position - b.position)

  const visible = ordered.filter(
    a => input.mainVariantId === null || !a.hiddenOnVariantIds.includes(input.mainVariantId),
  )

  const candidates = visible.map(addon => {
    const pieces: ResolvedPiece[] = []
    let listName: string | null = null
    if (addon.kind === 'product') {
      const target = addon.targetProductId ? byId.get(addon.targetProductId) : undefined
      const piece = target ? pieceOf(target, addon.targetVariantIds) : null
      if (piece) pieces.push(piece)
    } else {
      const list = addon.listId ? listById.get(addon.listId) : undefined
      listName = list?.name ?? null
      for (const item of [...(list?.items ?? [])].sort((a, b) => a.position - b.position)) {
        const target = byId.get(item.productId)
        const piece = target ? pieceOf(target, item.variantIds) : null
        if (piece) pieces.push(piece)
      }
    }
    return { addon, listName, pieces: pieces.filter(p => p.productId !== input.mainProductId) }
  })

  const kept = claimPieces(candidates)

  return candidates
    .filter(c => (kept.get(c.addon.id) ?? []).length > 0)
    .map(c => ({
      id: c.addon.id,
      position: c.addon.position,
      kind: c.addon.kind,
      listId: c.addon.listId,
      listName: c.listName,
      pieces: kept.get(c.addon.id) ?? [],
    }))
}
