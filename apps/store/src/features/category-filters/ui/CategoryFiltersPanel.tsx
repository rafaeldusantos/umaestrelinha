import { useState } from 'react'
import { Slider } from '@estrelinha/ui/slider'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import {
  clearFilterChip,
  toggleFilterValue,
  type CategoryFilters,
  type FilterBlock,
} from '../model/filters'

/**
 * O corpo dos filtros — sidebar de 260px no desktop (board "Desktop Category Page") e miolo do
 * bottom sheet no mobile (board "Mobile Filters - Bottom Sheet").
 *
 * Um componente só porque é o mesmo estado e as mesmas seções nas duas telas; o que muda é
 * densidade (alvo de 44px no sheet, 22px na sidebar) e o formato dos chips.
 *
 * **Feature 66 — um bloco por grupo curado, entre "Faixa de preço" e "Disponibilidade"**, no lugar
 * onde o "Universo" por tag morava (`878ef19`), com os mesmos chips e as mesmas densidades. Quem
 * decide quais blocos existem, quais valores entram e quanto cada um conta é `filterBlocks` (a regra
 * de `core`); este componente só desenha.
 */
type Surface = 'sidebar' | 'sheet'

interface Props {
  surface: Surface
  filters: CategoryFilters
  onChange: (filters: CategoryFilters) => void
  bounds: [number, number]
  /** Os blocos dos grupos curados, já resolvidos pela página. Vazio = nenhum bloco (FLT-26). */
  blocks?: readonly FilterBlock[]
}

/**
 * Quantos valores o bloco mostra no celular antes de "Ver todos (N)" (`FLT-27`). Só no sheet: na
 * sidebar o espaço vertical não é o problema, e esconder valor lá seria esconder sem motivo.
 */
export const SHEET_VALUES_PREVIEW = 8

const S = {
  sidebar: {
    section: 'gap-3 py-5 first:pt-0 last:pb-0',
    legend: 'text-[13px] leading-4',
    input: 'h-[38px] rounded-sm px-3 text-[12px]',
    row: 'text-[13px] leading-4',
    track: 'w-[38px] h-[22px]',
    knob: 'h-[18px] w-[18px]',
    knobOn: 'translate-x-4',
    chip: 'rounded-md px-3 py-[5px] text-[11px] leading-[14px]',
    chipGap: 'gap-1.5',
  },
  sheet: {
    section: 'gap-3 py-5 first:pt-0 last:pb-0',
    legend: 'text-[14px] leading-[18px]',
    input: 'h-11 rounded-[10px] px-3.5 text-[13px]',
    row: 'text-[14px] leading-[18px]',
    track: 'w-11 h-6',
    knob: 'h-5 w-5',
    knobOn: 'translate-x-5',
    // Altura PRÓPRIA de 44px (`FLT-28`), e não `TAP_44`/`TAP_ROW`: com chips embrulhando a 8px de
    // distância, um pseudo de 44 sobre um chip de 26 invadiria a fileira de cima e a de baixo — o
    // toque na beirada cairia no vizinho.
    chip: 'h-11 rounded-pill px-3.5 text-[13px] leading-4',
    chipGap: 'gap-2',
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

/**
 * Um bloco de grupo curado. O chip leva o nome do valor e a contagem entre parênteses (`FLT-22`),
 * e **nunca quebra linha** (`whitespace-nowrap`, `FLT-28`). Zerado pela seleção e não marcado, ele
 * continua no lugar, desabilitado com `(0)` (`FLT-24`) — sumir faria o painel pular a cada toque.
 */
const FilterGroupSection = ({
  surface,
  block,
  filters,
  onChange,
  className,
  legend,
}: {
  surface: Surface
  block: FilterBlock
  filters: CategoryFilters
  onChange: (filters: CategoryFilters) => void
  className: string
  legend: string
}) => {
  const s = S[surface]
  const [aberto, setAberto] = useState(false)
  const total = block.values.length
  // Valor marcado além dos 8 primeiros abre o bloco: esconder o que a cliente marcou seria esconder
  // o controle que desfaz o filtro.
  const recolhivel = surface === 'sheet' && total > SHEET_VALUES_PREVIEW
  const marcadoEscondido = block.values.slice(SHEET_VALUES_PREVIEW).some(v => v.selected)
  const mostrarTodos = !recolhivel || aberto || marcadoEscondido
  const valores = mostrarTodos ? block.values : block.values.slice(0, SHEET_VALUES_PREVIEW)
  const titleId = `filtro-${surface}-${block.group.slug}`

  return (
    <section aria-labelledby={titleId} className={className}>
      <h4 id={titleId} className={legend}>
        {block.group.name}
      </h4>
      <div className={`flex flex-wrap ${s.chipGap}`}>
        {valores.map(({ value, count, selected, disabled }) => (
          <button
            key={value.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(toggleFilterValue(filters, block.group.slug, value.slug))}
            className={`inline-flex items-center whitespace-nowrap font-body font-medium transition-colors motion-reduce:transition-none ${s.chip} ${
              selected
                ? 'bg-estrelinha-primary font-semibold text-white'
                : disabled
                  ? 'cursor-not-allowed border border-dashed border-estrelinha-line bg-white text-estrelinha-ink-soft'
                  : `bg-estrelinha-ground-deep ${surface === 'sheet' ? 'text-estrelinha-primary' : 'text-estrelinha-ink'} hover:bg-estrelinha-line`
            }`}
          >
            {value.name} ({count})
            {selected && (
              <span aria-hidden className="ml-1">
                ✕
              </span>
            )}
          </button>
        ))}
      </div>
      {recolhivel && !mostrarTodos && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={`${TAP_ROW} self-start text-[13px] font-semibold text-estrelinha-primary`}
        >
          Ver todos ({total})
        </button>
      )}
    </section>
  )
}

const CategoryFiltersPanel = ({ surface, filters, onChange, bounds, blocks = [] }: Props) => {
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

      {blocks.map(block => (
        <FilterGroupSection
          key={block.group.id}
          surface={surface}
          block={block}
          filters={filters}
          onChange={onChange}
          className={`flex flex-col ${s.section} ${divider}`}
          legend={legend}
        />
      ))}

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
