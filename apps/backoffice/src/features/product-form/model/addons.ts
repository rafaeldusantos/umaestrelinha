// Compre Junto no formulário do produto — o rascunho dos adicionais e as contas puras da aba.
//
// A ordem do array É a ordem dos adicionais (a posição gravada sai dela ao salvar). As recusas de
// regra (teto de 3, a joia como adicional de si mesma, a peça repetida) vêm de
// `@estrelinha/core/buy-together`; o que nasce aqui é só o que a tela diz sobre o rascunho
// incompleto, que a loja nunca vê.

import {
  addonCountRefusal,
  addonIsMainRefusal,
  addonRepeatedRefusal,
  type BuyTogetherAddonKind,
} from '@estrelinha/core/buy-together'

export interface AddonDraft {
  /** Chave estável da linha na tela. */
  key: string
  /** O id da linha no banco; `null` enquanto o adicional ainda não foi gravado. */
  id: string | null
  kind: BuyTogetherAddonKind
  /** Tipo produto: a peça escolhida. */
  targetProductId: string | null
  /** Tipo lista: a lista escolhida. */
  listId: string | null
  /** Tipo produto: variações liberadas. Vazio = vale todas as ativas. */
  targetVariantIds: string[]
  /** Variações do principal em que o adicional some. Vazio = aparece em todas. */
  hiddenOnVariantIds: string[]
  /** O desconto ao levar junto (1 a 50, inteiro). `null` = sem desconto. A recusa é de `core`. */
  discountPercent: number | null
}

let sequencia = 0
const novaChave = (): string => `adicional-${Date.now().toString(36)}-${(sequencia += 1)}`

/** Um adicional novo: o padrão ao acrescentar é "uma peça de uma lista". */
export const emptyAddon = (kind: BuyTogetherAddonKind = 'list'): AddonDraft => ({
  key: novaChave(),
  id: null,
  kind,
  targetProductId: null,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  discountPercent: null,
})

/** O adicional foi escolhido? Sem lista ou sem peça ele é incompleto e bloqueia o salvar. */
export const addonIsComplete = (a: AddonDraft): boolean =>
  a.kind === 'list' ? a.listId !== null : a.targetProductId !== null

export const incompleteCount = (addons: readonly AddonDraft[]): number =>
  addons.filter(a => !addonIsComplete(a)).length

/** "1 adicional está sem lista ou peça." — vazio quando todos estão completos. */
export const incompleteNote = (addons: readonly AddonDraft[]): string | null => {
  const n = incompleteCount(addons)
  if (n === 0) return null
  return n === 1 ? '1 adicional está sem lista ou peça.' : `${n} adicionais estão sem lista ou peça.`
}

/** Acrescenta no fim. A 4ª tentativa devolve o motivo (de `core`) em vez de acrescentar. */
export const addAddon = (
  addons: readonly AddonDraft[],
): { addons: AddonDraft[]; refusal: string | null } => {
  const refusal = addonCountRefusal(addons.length + 1)
  if (refusal) return { addons: [...addons], refusal }
  return { addons: [...addons, emptyAddon()], refusal: null }
}

export const removeAddon = (addons: readonly AddonDraft[], key: string): AddonDraft[] =>
  addons.filter(a => a.key !== key)

export const moveAddon = (addons: readonly AddonDraft[], from: number, to: number): AddonDraft[] => {
  if (from === to || from < 0 || to < 0 || from >= addons.length || to >= addons.length) return [...addons]
  const proximo = [...addons]
  const [movido] = proximo.splice(from, 1)
  proximo.splice(to, 0, movido)
  return proximo
}

/** Troca o tipo: zera o alvo e as variações liberadas (o que valia para um não vale para o outro). */
export const setKind = (addons: readonly AddonDraft[], key: string, kind: BuyTogetherAddonKind): AddonDraft[] =>
  addons.map(a =>
    a.key !== key || a.kind === kind
      ? a
      : { ...a, kind, targetProductId: null, listId: null, targetVariantIds: [] },
  )

export const chooseList = (addons: readonly AddonDraft[], key: string, listId: string): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, kind: 'list', listId, targetProductId: null, targetVariantIds: [] } : a))

/**
 * Escolhe a peça do adicional de tipo produto. Devolve o motivo da recusa (a própria joia, ou uma
 * peça que já é outro adicional) em vez de escolher.
 */
export const chooseProduct = (
  addons: readonly AddonDraft[],
  key: string,
  mainProductId: string | null,
  productId: string,
): { addons: AddonDraft[]; refusal: string | null } => {
  const refusal =
    (mainProductId ? addonIsMainRefusal(mainProductId, productId) : null) ??
    addonRepeatedRefusal(
      productId,
      addons.filter(a => a.key !== key && a.targetProductId !== null).map(a => a.targetProductId as string),
    )
  if (refusal) return { addons: [...addons], refusal }
  return {
    addons: addons.map(a =>
      a.key === key ? { ...a, kind: 'product', targetProductId: productId, listId: null, targetVariantIds: [] } : a,
    ),
    refusal: null,
  }
}

/** "Trocar": desfaz a escolha e zera as variações. */
export const clearTarget = (addons: readonly AddonDraft[], key: string): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, targetProductId: null, targetVariantIds: [] } : a))

const alternar = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]

export const toggleTargetVariant = (addons: readonly AddonDraft[], key: string, variantId: string): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, targetVariantIds: alternar(a.targetVariantIds, variantId) } : a))

export const releaseAllTargetVariants = (addons: readonly AddonDraft[], key: string): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, targetVariantIds: [] } : a))

export const toggleHiddenOn = (addons: readonly AddonDraft[], key: string, variantId: string): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, hiddenOnVariantIds: alternar(a.hiddenOnVariantIds, variantId) } : a))

/** O percentual digitado no adicional; `null` = sem desconto. Não recusa aqui: a recusa é de `core`. */
export const setDiscount = (addons: readonly AddonDraft[], key: string, percent: number | null): AddonDraft[] =>
  addons.map(a => (a.key === key ? { ...a, discountPercent: percent } : a))

/** Os ids de peça já escolhidos em outros adicionais — o que a busca mostra desabilitado. */
export const targetsOutside = (addons: readonly AddonDraft[], key: string): string[] =>
  addons.filter(a => a.key !== key && a.targetProductId !== null).map(a => a.targetProductId as string)

/** Os adicionais como o banco os guarda: completos, com a posição da ordem. */
export const addonsToSave = (addons: readonly AddonDraft[]): AddonDraft[] => addons.filter(addonIsComplete)

/** O que mudou desde a carga? Sem mudança o save não escreve. A ordem e a chave do banco contam. */
export const addonsChanged = (next: readonly AddonDraft[], saved: readonly AddonDraft[]): boolean => {
  const a = addonsToSave(next)
  const b = addonsToSave(saved)
  const mesmos = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v, i) => v === y[i])
  return (
    a.length !== b.length ||
    a.some(
      (r, i) =>
        r.id !== b[i].id ||
        r.kind !== b[i].kind ||
        r.targetProductId !== b[i].targetProductId ||
        r.listId !== b[i].listId ||
        !mesmos(r.targetVariantIds, b[i].targetVariantIds) ||
        !mesmos(r.hiddenOnVariantIds, b[i].hiddenOnVariantIds) ||
        (r.discountPercent ?? null) !== (b[i].discountPercent ?? null),
    )
  )
}

/** A linha do embed `product_buy_together` → rascunho. Ordena pela posição (o embed não garante). */
export const addonsFromRow = (row: unknown): AddonDraft[] => {
  const linhas = (row as { product_buy_together?: unknown })?.product_buy_together
  if (!Array.isArray(linhas)) return []
  const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return [...linhas]
    .sort((x, y) => (x?.position ?? 0) - (y?.position ?? 0))
    .map((l): AddonDraft => ({
      key: String(l.id),
      id: String(l.id),
      kind: l.kind === 'list' ? 'list' : 'product',
      targetProductId: l.target_product_id ?? null,
      listId: l.list_id ?? null,
      targetVariantIds: ids(l.target_variant_ids),
      hiddenOnVariantIds: ids(l.hidden_on_variant_ids),
      discountPercent: typeof l.discount_percent === 'number' ? l.discount_percent : null,
    }))
}
