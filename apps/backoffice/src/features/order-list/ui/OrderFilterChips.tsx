// `PED-15` — cada filtro ativo é um chip com o valor e um `×`.
//
// O ponto não é decoração: com o filtro escondido dentro de um `Select`, a Adri vê uma lista curta
// e não sabe por quê. Era o defeito literal desta tela — "Limpar filtros" nem aparecia quando só a
// fila de material estava ligada, e não havia caminho de volta visível.

import { X } from 'lucide-react'
import type { OrderFilters } from '@/entities/order/api/orderQuery'
import { buildOrderChips } from '../model/filterChips'

interface Props {
  filters: OrderFilters
  search: string
  onChange: (next: OrderFilters) => void
  /** A busca não mora em `filters` — quem a limpa é a tela, e o chip só avisa qual foi clicado. */
  onClearSearch: () => void
  onClearAll: () => void
  clearLabel: string
}

const OrderFilterChips = ({
  filters, search, onChange, onClearSearch, onClearAll, clearLabel,
}: Props) => {
  const chips = buildOrderChips(filters, search)
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      <span className="text-xs text-muted-foreground">Filtrando por</span>

      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={() => (chip.key === 'search' ? onClearSearch() : onChange(chip.clear(filters)))}
            className="rounded-full p-0.5 hover:bg-background"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        {clearLabel}
      </button>
    </div>
  )
}

export default OrderFilterChips
