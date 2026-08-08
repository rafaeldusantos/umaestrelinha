import { SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@estrelinha/ui/sheet'
import CategoryFiltersPanel from './CategoryFiltersPanel'
import { defaultFilters, type CategoryFilters } from '../model/filters'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: CategoryFilters
  onChange: (filters: CategoryFilters) => void
  bounds: [number, number]
  tags: string[]
  /** Quantos produtos a seleção atual devolve — é o rótulo do CTA. */
  resultCount: number
}

/**
 * Filtros em bottom sheet no mobile (board "Mobile Filters - Bottom Sheet v3").
 *
 * O painel escreve direto no estado da página: o grid atrás do véu já responde enquanto o cliente
 * mexe, e por isso o CTA fecha em vez de aplicar — ele só informa quantos produtos sobraram.
 * "Limpar" volta aos padrões sem fechar, para dar para recomeçar sem reabrir o sheet.
 */
const CategoryFiltersSheet = ({
  open,
  onOpenChange,
  filters,
  onChange,
  bounds,
  tags,
  resultCount,
}: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="bottom"
      hideClose
      className="max-h-[88vh] gap-0 overflow-y-auto rounded-t-lg border-0 bg-white p-0 px-4 pb-7 pt-3"
    >
      <span aria-hidden className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-pill bg-estrelinha-line" />

      <div className="flex items-center justify-between pb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-[18px] w-[18px] text-estrelinha-ink" strokeWidth={2} />
          <SheetTitle className="font-display text-[22px] font-semibold leading-7 text-estrelinha-ink">
            Filtros
          </SheetTitle>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaultFilters(bounds))}
          className="text-[13px] font-semibold text-estrelinha-primary"
        >
          Limpar tudo
        </button>
      </div>

      <CategoryFiltersPanel
        surface="sheet"
        filters={filters}
        onChange={onChange}
        bounds={bounds}
        tags={tags}
      />

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => onChange(defaultFilters(bounds))}
          className="flex h-[50px] flex-1 items-center justify-center rounded-[14px] bg-estrelinha-ground-deep text-[14px] font-semibold text-estrelinha-ink"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-[50px] flex-[2] items-center justify-center rounded-[14px] bg-estrelinha-primary text-[14px] font-bold text-white"
        >
          {resultCount === 1 ? 'Ver 1 produto' : `Ver ${resultCount} produtos`}
        </button>
      </div>
    </SheetContent>
  </Sheet>
)

export default CategoryFiltersSheet
