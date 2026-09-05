// `PED-14` — visões salvas da listagem de pedidos, por navegador.
//
// Molde de `features/product-list/model/savedViews.ts`. As seis visões fixas (`Precisa de ação`…
// `Concluídos`) vivem em código, em `ORDER_VIEWS`; as do usuário são um `OrderFilters` nomeado no
// `localStorage`. A decisão de não criar tabela está registrada na spec da listagem de produtos e
// vale igual aqui: preferência de tela num painel de poucas operadoras não é schema.

import { useCallback, useState } from 'react'
import type { OrderFilters } from '@/entities/order/api/orderQuery'

const STORAGE_KEY = 'estrelinha.admin.order-views'

export interface SavedOrderView {
  id: string
  name: string
  filters: OrderFilters
}

/** Nunca lança: `localStorage` corrompido perde as visões salvas, não a tela. */
export const readSavedOrderViews = (storage: Storage): SavedOrderView[] => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (v): v is SavedOrderView =>
        !!v && typeof v.id === 'string' && typeof v.name === 'string' && !!v.filters,
    )
  } catch {
    return []
  }
}

const write = (storage: Storage, views: SavedOrderView[]) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // Modo privado / cota estourada: a visão vale para a sessão. Falhar aqui não derruba a lista.
  }
}

/** Nome repetido substitui a visão anterior — salvar duas `Cinzas` deixaria a lista ambígua. */
export const upsertOrderView = (
  views: SavedOrderView[],
  view: SavedOrderView,
): SavedOrderView[] => {
  const i = views.findIndex(v => v.name.trim().toLowerCase() === view.name.trim().toLowerCase())
  if (i < 0) return [...views, view]
  return views.map((v, idx) => (idx === i ? { ...view, id: v.id } : v))
}

export const useSavedOrderViews = (storage: Storage = window.localStorage) => {
  const [views, setViews] = useState<SavedOrderView[]>(() => readSavedOrderViews(storage))

  const save = useCallback(
    (name: string, filters: OrderFilters) => {
      if (!name.trim()) return
      setViews(atuais => {
        const next = upsertOrderView(atuais, {
          id: name.trim().toLowerCase(),
          name: name.trim(),
          filters,
        })
        write(storage, next)
        return next
      })
    },
    [storage],
  )

  const remove = useCallback(
    (id: string) => {
      setViews(atuais => {
        const next = atuais.filter(v => v.id !== id)
        write(storage, next)
        return next
      })
    },
    [storage],
  )

  return { views, save, remove }
}
