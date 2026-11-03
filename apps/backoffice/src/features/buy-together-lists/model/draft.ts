// O rascunho de uma lista do Compre Junto — as contas puras do editor.
//
// A ordem do array É a ordem da lista (a posição gravada sai dela ao salvar), e `variantIds` vazio
// quer dizer "vale todas as ativas". Nenhuma frase de regra nasce aqui: o teto de peças e o nome
// vêm de `@estrelinha/core/buy-together`, a mesma regra que o banco espelha.

import { listItemCountRefusal } from '@estrelinha/core/buy-together'

export interface DraftItem {
  /** Chave estável da linha na tela (o produto não se repete numa lista, então é ele mesmo). */
  productId: string
  /** Variações liberadas. Vazio = todas as ativas. */
  variantIds: string[]
}

/** Acrescenta a peça no fim. Devolve o motivo da recusa (a 13ª peça) em vez de acrescentar. */
export const addItem = (
  items: readonly DraftItem[],
  productId: string,
): { items: DraftItem[]; refusal: string | null } => {
  if (items.some(i => i.productId === productId)) return { items: [...items], refusal: null }
  const refusal = listItemCountRefusal(items.length + 1)
  if (refusal) return { items: [...items], refusal }
  return { items: [...items, { productId, variantIds: [] }], refusal: null }
}

export const removeItem = (items: readonly DraftItem[], productId: string): DraftItem[] =>
  items.filter(i => i.productId !== productId)

/** Move a peça da posição `from` para `to`. Fora do intervalo, devolve a lista como estava. */
export const moveItem = (items: readonly DraftItem[], from: number, to: number): DraftItem[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const proximo = [...items]
  const [movido] = proximo.splice(from, 1)
  proximo.splice(to, 0, movido)
  return proximo
}

/** Arrastar: coloca a peça `de` no lugar da peça `para`. */
export const dropItem = (items: readonly DraftItem[], de: string, para: string): DraftItem[] =>
  moveItem(
    items,
    items.findIndex(i => i.productId === de),
    items.findIndex(i => i.productId === para),
  )

/** Marca ou desmarca uma variação liberada da peça. */
export const toggleVariant = (
  items: readonly DraftItem[],
  productId: string,
  variantId: string,
): DraftItem[] =>
  items.map(i =>
    i.productId !== productId
      ? i
      : {
          ...i,
          variantIds: i.variantIds.includes(variantId)
            ? i.variantIds.filter(v => v !== variantId)
            : [...i.variantIds, variantId],
        },
  )

/** "Oferecer todas": zera a liberação da peça. */
export const releaseAll = (items: readonly DraftItem[], productId: string): DraftItem[] =>
  items.map(i => (i.productId === productId ? { ...i, variantIds: [] } : i))

/** As linhas de `buy_together_list_items` para gravar: a posição sai da ordem do array. */
export const toRows = (listId: string, items: readonly DraftItem[]) =>
  items.map((i, position) => ({
    list_id: listId,
    product_id: i.productId,
    position,
    variant_ids: i.variantIds,
  }))

export const sameDraft = (
  a: { name: string; items: readonly DraftItem[] },
  b: { name: string; items: readonly DraftItem[] },
): boolean =>
  a.name === b.name &&
  a.items.length === b.items.length &&
  a.items.every(
    (item, i) =>
      item.productId === b.items[i].productId &&
      item.variantIds.length === b.items[i].variantIds.length &&
      item.variantIds.every((v, j) => v === b.items[i].variantIds[j]),
  )
