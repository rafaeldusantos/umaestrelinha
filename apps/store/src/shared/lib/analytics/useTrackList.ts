import { useEffect, useRef } from 'react'
import { viewItemListEvent } from '@estrelinha/core/analytics'
import type { Product } from '@estrelinha/supabase/types'
import { track } from '@/shared/lib/analytics'
import { productItem, type AnalyticsList } from './items'

export type { AnalyticsList }

/**
 * Feature 61 · EVT-02 — um `view_item_list` por conjunto CARREGADO de uma listagem.
 *
 * - Rerender com os mesmos produtos não repete: a chave é a lista de ids, não a identidade do array
 *   (a mesma lição da janela da `CategoryPage`, onde um literal novo a cada render virou laço).
 * - A página seguinte da rolagem infinita emite **só os itens novos**, com o `index` que eles têm na
 *   listagem inteira — a terceira leva começa no 48, não no 0.
 * - Trocar de lista (outra categoria, outra busca) zera a memória.
 * - Lista vazia ou ainda carregando não emite nada.
 */
export function useTrackList(
  list: AnalyticsList | null | undefined,
  products: readonly Product[] | null | undefined,
): void {
  const emitidos = useRef<{ listId: string | null; ids: Set<string> }>({ listId: null, ids: new Set() })
  const listId = list?.id ?? null
  const listName = list?.name ?? ''
  const chave = (products ?? []).map(p => p.id).join('|')

  useEffect(() => {
    if (!listId || !products || products.length === 0) return
    if (emitidos.current.listId !== listId) emitidos.current = { listId, ids: new Set() }
    const novos = products
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => !emitidos.current.ids.has(p.id))
    if (novos.length === 0) return
    for (const { p } of novos) emitidos.current.ids.add(p.id)
    track(
      viewItemListEvent({
        listId,
        listName,
        items: novos.map(({ p, index }) => productItem(p, { index })),
      }),
    )
    // `products` entra pela chave: a identidade do array não é sinal de conjunto novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, listName, chave])
}
