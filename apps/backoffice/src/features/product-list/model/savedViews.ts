// PLS-02 AC 4 (A22) — visões salvas por navegador.
//
// As visões padrão (`Todos`…`Agendados`) são fixas em código; as do usuário são um `ProductFilters`
// nomeado em `localStorage`. Tabela + RLS para uma preferência de tela num backoffice de poucos
// operadores é schema sem demanda — e a decisão está registrada na spec, não improvisada aqui.

import { useCallback, useState } from 'react'
import type { ProductFilters } from '@/entities/product/api/productQuery'

const STORAGE_KEY = 'nanapin.admin.product-views'

export interface SavedView {
  id: string
  name: string
  filters: ProductFilters
}

/** Nunca lança: `localStorage` corrompido perde as visões salvas, não a tela. */
export const readSavedViews = (storage: Storage): SavedView[] => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (v): v is SavedView =>
        !!v && typeof v.id === 'string' && typeof v.name === 'string' && !!v.filters,
    )
  } catch {
    return []
  }
}

const writeSavedViews = (storage: Storage, views: SavedView[]) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // Modo privado / cota estourada: a visão vale para a sessão e não é persistida. Falhar aqui
    // não pode derrubar a listagem.
  }
}

/** Nome repetido substitui a visão anterior — salvar duas `Promoção` deixaria a lista ambígua. */
export const upsertView = (views: SavedView[], view: SavedView): SavedView[] => {
  const index = views.findIndex(v => v.name.trim().toLowerCase() === view.name.trim().toLowerCase())
  if (index < 0) return [...views, view]
  return views.map((v, i) => (i === index ? { ...view, id: v.id } : v))
}

export const useSavedViews = (storage: Storage = window.localStorage) => {
  const [views, setViews] = useState<SavedView[]>(() => readSavedViews(storage))

  const save = useCallback(
    (name: string, filters: ProductFilters) => {
      if (!name.trim()) return
      setViews(current => {
        const next = upsertView(current, {
          id: `${name.trim().toLowerCase()}`,
          name: name.trim(),
          filters,
        })
        writeSavedViews(storage, next)
        return next
      })
    },
    [storage],
  )

  const remove = useCallback(
    (id: string) => {
      setViews(current => {
        const next = current.filter(v => v.id !== id)
        writeSavedViews(storage, next)
        return next
      })
    },
    [storage],
  )

  return { views, save, remove }
}
