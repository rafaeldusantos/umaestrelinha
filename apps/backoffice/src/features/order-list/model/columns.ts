// `PED-19` — colunas configuráveis e densidade na listagem de pedidos.
//
// Molde de `features/product-list/model/columns.ts`. A preferência é de tela, então mora no
// `localStorage` sob `estrelinha.admin.*`, junto das visões salvas — tabela + RLS para uma
// preferência de leitura num backoffice de poucas operadoras é schema sem demanda.
//
// Coluna escondida **não muda a consulta**: o `select` da listagem é fixo (`ORDER_LIST_SELECT`),
// porque esconder coluna é decisão de leitura e não de tráfego. Um `select` variável tornaria o
// cache e o teste do hook imprevisíveis.

import { useCallback, useState } from 'react'

export type OrderColumnId =
  | 'pedido'
  | 'cliente'
  | 'valor'
  | 'status'
  | 'pagamento'
  | 'material'
  | 'rastreio'

export const ORDER_LIST_COLUMNS: { id: OrderColumnId; label: string; fixed?: boolean }[] = [
  // A coluna do pedido carrega número E idade, e não se esconde: sem ela a linha não identifica
  // nada, e a idade é a informação que a feature 34 existe para pôr na frente de quem olha.
  { id: 'pedido', label: 'Pedido', fixed: true },
  { id: 'cliente', label: 'Cliente' },
  { id: 'valor', label: 'Valor' },
  { id: 'status', label: 'Status' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'material', label: 'Material' },
  { id: 'rastreio', label: 'Rastreio' },
]

export type Density = 'confortavel' | 'compacta'

export interface OrderColumnPrefs {
  hidden: OrderColumnId[]
  density: Density
}

const STORAGE_KEY = 'estrelinha.admin.order-columns'

export const defaultOrderPrefs = (): OrderColumnPrefs => ({ hidden: [], density: 'confortavel' })

/** Nunca lança: `localStorage` corrompido perde a preferência, não a tela. */
export const readOrderPrefs = (storage: Storage): OrderColumnPrefs => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultOrderPrefs()
    const parsed = JSON.parse(raw)
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [],
      density: parsed?.density === 'compacta' ? 'compacta' : 'confortavel',
    }
  } catch {
    return defaultOrderPrefs()
  }
}

export const toggleOrderColumn = (
  prefs: OrderColumnPrefs,
  id: OrderColumnId,
): OrderColumnPrefs => {
  if (ORDER_LIST_COLUMNS.find(c => c.id === id)?.fixed) return prefs
  return {
    ...prefs,
    hidden: prefs.hidden.includes(id)
      ? prefs.hidden.filter(c => c !== id)
      : [...prefs.hidden, id],
  }
}

export const isOrderColumnVisible = (prefs: OrderColumnPrefs, id: OrderColumnId): boolean =>
  !prefs.hidden.includes(id)

export const useOrderColumnPrefs = (storage: Storage = window.localStorage) => {
  const [prefs, setPrefs] = useState<OrderColumnPrefs>(() => readOrderPrefs(storage))

  const persist = useCallback(
    (next: OrderColumnPrefs) => {
      setPrefs(next)
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Modo privado / cota estourada: a preferência vale para a sessão. Não pode derrubar a lista.
      }
    },
    [storage],
  )

  return {
    prefs,
    toggle: (id: OrderColumnId) => persist(toggleOrderColumn(prefs, id)),
    setDensity: (density: Density) => persist({ ...prefs, density }),
  }
}
