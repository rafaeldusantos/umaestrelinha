// PLS-02 AC 5 — a lista de chips, como função pura.
//
// Separada do componente porque é regra (qual filtro vira chip, e o que o `x` remove), não
// apresentação — e porque exportar função + componente do mesmo arquivo quebra o fast refresh.

import { formatPrice } from '@nanapin/core/formatters'
import type { ProductFilters } from '@/entities/product/api/productQuery'

export interface FilterChip {
  key: string
  label: string
  clear: (filters: ProductFilters) => ProductFilters
}

export const buildChips = (
  filters: ProductFilters,
  categoryNames: Record<string, string>,
): FilterChip[] => {
  const chips: FilterChip[] = []

  for (const id of filters.categoryIds) {
    chips.push({
      key: `cat-${id}`,
      label: `Categoria: ${categoryNames[id] ?? id}`,
      clear: f => ({ ...f, categoryIds: f.categoryIds.filter(c => c !== id) }),
    })
  }

  for (const tag of filters.tags) {
    chips.push({
      key: `tag-${tag}`,
      label: `Tag: ${tag}`,
      clear: f => ({ ...f, tags: f.tags.filter(t => t !== tag) }),
    })
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const min = filters.priceMin !== null ? formatPrice(filters.priceMin) : '—'
    const max = filters.priceMax !== null ? formatPrice(filters.priceMax) : '—'
    chips.push({
      key: 'price',
      label: `Preço: ${min} a ${max}`,
      clear: f => ({ ...f, priceMin: null, priceMax: null }),
    })
  }

  return chips
}
