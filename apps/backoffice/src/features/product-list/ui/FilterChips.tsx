// PLS-02 AC 5 — cada filtro ativo é um chip com o valor e um `×`.
//
// O ponto do chip não é decoração: com filtro escondido dentro de um `Select`, o admin vê uma lista
// curta e não sabe por quê. O chip diz o valor e oferece a saída.

import { X } from 'lucide-react'
import type { ProductFilters } from '@/entities/product/api/productQuery'
import { buildChips } from '../model/filterChips'

interface Props {
  filters: ProductFilters
  categoryNames: Record<string, string>
  onChange: (next: ProductFilters) => void
}

const FilterChips = ({ filters, categoryNames, onChange }: Props) => {
  const chips = buildChips(filters, categoryNames)
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={() => onChange(chip.clear(filters))}
            className="rounded-full p-0.5 hover:bg-background"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

export default FilterChips
