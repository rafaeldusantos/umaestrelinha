// PLS-09 — colunas configuráveis e densidade.
//
// A preferência é de tela, então mora no `localStorage` junto das visões (A22). Coluna escondida
// não muda a consulta: o `select` da listagem é fixo, porque esconder coluna é decisão de leitura,
// não de tráfego — e um `select` variável tornaria o cache e o teste do hook imprevisíveis.

import { useCallback, useState } from 'react'

export type ColumnId = 'produto' | 'categorias' | 'preco' | 'estoque' | 'status' | 'atualizado'

export const LIST_COLUMNS: { id: ColumnId; label: string; fixed?: boolean }[] = [
  { id: 'produto', label: 'Produto', fixed: true },
  { id: 'categorias', label: 'Categorias' },
  { id: 'preco', label: 'Preço' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'status', label: 'Status' },
  { id: 'atualizado', label: 'Atualizado' },
]

export type Density = 'confortavel' | 'compacta'

export interface ColumnPrefs {
  hidden: ColumnId[]
  density: Density
}

const STORAGE_KEY = 'estrelinha.admin.product-columns'

export const defaultPrefs = (): ColumnPrefs => ({ hidden: [], density: 'confortavel' })

export const readPrefs = (storage: Storage): ColumnPrefs => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs()
    const parsed = JSON.parse(raw)
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [],
      density: parsed?.density === 'compacta' ? 'compacta' : 'confortavel',
    }
  } catch {
    return defaultPrefs()
  }
}

/** A coluna Produto não se esconde: sem ela a linha não identifica nada. */
export const toggleColumn = (prefs: ColumnPrefs, id: ColumnId): ColumnPrefs => {
  if (LIST_COLUMNS.find(c => c.id === id)?.fixed) return prefs
  return {
    ...prefs,
    hidden: prefs.hidden.includes(id)
      ? prefs.hidden.filter(c => c !== id)
      : [...prefs.hidden, id],
  }
}

export const isVisible = (prefs: ColumnPrefs, id: ColumnId): boolean => !prefs.hidden.includes(id)

export const useColumnPrefs = (storage: Storage = window.localStorage) => {
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => readPrefs(storage))

  const persist = useCallback(
    (next: ColumnPrefs) => {
      setPrefs(next)
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Preferência de tela não pode derrubar a listagem por cota de storage.
      }
    },
    [storage],
  )

  return {
    prefs,
    toggle: (id: ColumnId) => persist(toggleColumn(prefs, id)),
    setDensity: (density: Density) => persist({ ...prefs, density }),
  }
}
