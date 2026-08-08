import { useState } from 'react'
import { Slider } from '@estrelinha/ui/slider'
import {
  clearFilterChip,
  toggleTag,
  type CategoryFilters,
} from '../model/filters'

/**
 * O corpo dos filtros — sidebar de 260px no desktop (board "Desktop Category Page") e miolo do
 * bottom sheet no mobile (board "Mobile Filters - Bottom Sheet").
 *
 * Um componente só porque é o mesmo estado e as mesmas três seções nas duas telas; o que muda é
 * densidade (alvo de 44px no sheet, 22px na sidebar) e o formato dos chips.
 */
type Surface = 'sidebar' | 'sheet'

interface Props {
  surface: Surface
  filters: CategoryFilters
  onChange: (filters: CategoryFilters) => void
  bounds: [number, number]
  tags: string[]
}

const S = {
  sidebar: {
    section: 'gap-3 py-5 first:pt-0 last:pb-0',
    legend: 'text-[13px] leading-4',
    input: 'h-[38px] rounded-sm px-3 text-[12px]',
    chip: 'rounded-md px-3 py-[5px] text-[11px] leading-[14px]',
    chipGap: 'gap-1.5',
    row: 'text-[13px] leading-4',
    track: 'w-[38px] h-[22px]',
    knob: 'h-[18px] w-[18px]',
    knobOn: 'translate-x-4',
  },
  sheet: {
    section: 'gap-3 py-5 first:pt-0 last:pb-0',
    legend: 'text-[14px] leading-[18px]',
    input: 'h-11 rounded-[10px] px-3.5 text-[13px]',
    chip: 'rounded-pill px-3.5 py-[7px] text-[12px] leading-3',
    chipGap: 'gap-2',
    row: 'text-[14px] leading-[18px]',
    track: 'w-11 h-6',
    knob: 'h-5 w-5',
    knobOn: 'translate-x-5',
  },
} as const satisfies Record<Surface, Record<string, string>>

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/**
 * Campo de preço da faixa. O board desenha uma caixa com borda — então ela **é** editável: uma
 * caixa que parece campo e não aceita digitação é pior que um texto solto.
 *
 * Só confirma no blur/Enter: aplicar a cada tecla faria o grid esvaziar no meio de "12" (o "1"
 * intermediário derruba tudo) e o valor pular de volta enquanto o cliente ainda digita.
 */
const PriceField = ({
  className,
  label,
  value,
  onCommit,
}: {
  className: string
  label: string
  value: number
  onCommit: (value: number) => void
}) => {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null) {
      const parsed = Number(draft.replace(',', '.'))
      if (Number.isFinite(parsed)) onCommit(Math.round(parsed))
      setDraft(null)
    }
  }

  return (
    <label
      /* Papelão, não Dobra — borda de campo precisa dos 3:1 da WCAG 1.4.11. */
      className={`flex flex-1 items-center gap-1 border-[1.5px] border-estrelinha-field bg-white text-estrelinha-ink focus-within:border-estrelinha-primary ${className}`}
    >
      <span aria-hidden className="text-estrelinha-ink-soft">
        R$
      </span>
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="w-full min-w-0 bg-transparent outline-none"
      />
    </label>
  )
}

const AVAILABILITY = [
  { key: 'inStockOnly', sidebar: 'Em estoque', sheet: 'Apenas em estoque' },
  { key: 'onSaleOnly', sidebar: 'Com desconto', sheet: 'Apenas com desconto' },
  { key: 'newOnly', sidebar: 'Novidades', sheet: 'Novidades da semana' },
] as const

const CategoryFiltersPanel = ({ surface, filters, onChange, bounds, tags }: Props) => {
  const s = S[surface]
  const legend = `font-body font-bold text-estrelinha-ink ${s.legend}`
  const divider = 'border-b border-estrelinha-line last:border-b-0'

  return (
    <div className="flex flex-col">
      <section className={`flex flex-col ${s.section} ${divider}`}>
        <h4 className={legend}>Faixa de preço</h4>
        <div className="flex items-center gap-2.5">
          <PriceField
            className={s.input}
            label="Preço mínimo"
            value={filters.priceRange[0]}
            onCommit={v =>
              onChange({
                ...filters,
                priceRange: [clamp(v, bounds[0], filters.priceRange[1]), filters.priceRange[1]],
              })
            }
          />
          <span className="text-[13px] text-estrelinha-ink-soft">—</span>
          <PriceField
            className={s.input}
            label="Preço máximo"
            value={filters.priceRange[1]}
            onCommit={v =>
              onChange({
                ...filters,
                priceRange: [filters.priceRange[0], clamp(v, filters.priceRange[0], bounds[1])],
              })
            }
          />
        </div>
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={1}
          value={filters.priceRange}
          onValueChange={v => onChange({ ...filters, priceRange: v as [number, number] })}
          aria-label="Faixa de preço"
          className="[&>span:first-child]:h-1 [&>span:first-child]:bg-estrelinha-line [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-estrelinha-primary [&_[role=slider]]:bg-white"
        />
      </section>

      {tags.length > 0 && (
        <section className={`flex flex-col ${s.section} ${divider}`}>
          <h4 className={legend}>Universo</h4>
          <div className={`flex flex-wrap ${s.chipGap}`}>
            {tags.map(tag => {
              const on = filters.tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(toggleTag(filters, tag))}
                  className={`font-body font-medium transition-colors ${s.chip} ${
                    on
                      ? 'bg-estrelinha-primary font-semibold text-white'
                      : `bg-estrelinha-ground-deep ${surface === 'sheet' ? 'text-estrelinha-primary' : 'text-estrelinha-ink-soft'} hover:bg-estrelinha-line`
                  }`}
                >
                  {on ? `${tag} ✕` : tag}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className={`flex flex-col ${s.section} ${divider}`}>
        <h4 className={legend}>Disponibilidade</h4>
        <div className="flex flex-col gap-2.5">
          {AVAILABILITY.map(item => {
            const on = filters[item.key]
            return (
              <div key={item.key} className="flex items-center justify-between">
                <span className={`font-body font-medium text-estrelinha-ink ${s.row}`}>
                  {item[surface]}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={item[surface]}
                  onClick={() =>
                    onChange(
                      on
                        ? clearFilterChip(filters, item.key)
                        : { ...filters, [item.key]: true },
                    )
                  }
                  className={`flex shrink-0 items-center rounded-pill p-0.5 transition-colors ${s.track} ${
                    on ? 'bg-estrelinha-primary' : 'bg-estrelinha-line'
                  }`}
                >
                  <span
                    className={`rounded-full bg-white transition-transform ${s.knob} ${on ? s.knobOn : ''}`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default CategoryFiltersPanel
