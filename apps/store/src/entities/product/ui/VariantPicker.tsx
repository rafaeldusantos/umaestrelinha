import { availableValuesFor, visibleOptions, type GridProduct } from '../lib/variantSelection'
import type { OptionValues } from '@nanapin/supabase/types'

/**
 * Escolha de variação em **pílulas**, um grupo por eixo (boards "Quick add com variações" e
 * "Quick add: bottom sheet").
 *
 * Substitui os `<Select>` do card: no drawer/sheet o valor precisa estar visível sem abrir nada —
 * é uma escolha de 2 a 4 opções, não uma lista longa. A pílula também é o único formato em que
 * cabe o alvo de 40px (drawer) / 48px (sheet) que o board pede.
 *
 * **Por que pílula e não swatch de cor**: `products.options` guarda só o *nome* do valor ("Rosa"),
 * nunca um hex. Um mapa nome→cor no front acertaria os valores que alguém lembrou de cadastrar e
 * erraria em silêncio todos os outros. O board desenha swatches na linha COR; aqui o eixo Cor sai
 * em pílula com o nome, como os demais, até a grade ganhar cor de verdade.
 *
 * Valor sem nenhuma variação disponível aparece **desabilitado**, não escondido (PST-08) — mesma
 * regra dos selects que este componente substituiu.
 */

/**
 * Tamanhos do board: 40px no drawer do card (desktop), 48px no sheet (mobile), 44px na página.
 *
 * A página é a única superfície que **não** estica as pílulas: no drawer e no sheet o grupo ocupa a
 * largura toda porque são 2 a 4 valores num painel estreito; na coluna de 632px do board os chips
 * têm largura natural e quebram linha, senão "P / M / G" viraria três botões de 200px.
 */
type Surface = 'card' | 'sheet' | 'page'

interface Props {
  product: GridProduct
  /** Quantos eixos esta superfície mostra: `CARD_MAX_AXES` no card, `PAGE_MAX_AXES` na página. */
  max: number
  selected: OptionValues
  onChange: (values: OptionValues) => void
  surface?: Surface
}

const SURFACE = {
  card: {
    group: 'gap-1.5 pt-3 first:pt-0',
    label: 'font-bold uppercase tracking-[0.12em] text-nanita-jam text-[11px] leading-[13px]',
    row: 'gap-2',
    pill: 'h-10 flex-1 rounded-pill border text-[14px]',
  },
  sheet: {
    group: 'gap-2.5 pt-6 first:pt-0',
    label: 'font-bold uppercase tracking-[0.12em] text-nanita-jam text-[11px] leading-[14px]',
    row: 'gap-2.5',
    pill: 'h-12 flex-1 rounded-pill border text-[16px]',
  },
  page: {
    group: 'gap-2.5 pt-5 first:pt-0',
    label: 'font-semibold text-nanita-ink text-[13px] leading-4',
    // O board desenha 44×44 no chip de tamanho e um chip mais largo no de acabamento: é a mesma
    // caixa, com `px` e `min-w` de 44px — que é também o alvo de toque mínimo do mobile.
    row: 'flex-wrap gap-2',
    // `border-2` também no não-escolhido: com 1px aqui e 2px no escolhido, cada clique moveria a
    // linha inteira em 1px.
    pill: 'h-11 min-w-[44px] rounded-md border-2 px-3.5 text-[14px]',
  },
} as const satisfies Record<Surface, Record<string, string>>

/**
 * O valor escolhido.
 *
 * Cheio de geleia no drawer e no sheet — ali a pílula é a única marcação num painel de 2 a 4
 * opções. Na página é **contorno**, como o board: a coluna já tem o CTA em geleia logo abaixo, e
 * dois blocos chapados na mesma cor deixariam de existir uma ação primária (DESIGN.md §8).
 */
const PICKED: Record<Surface, string> = {
  card: 'border-nanita-jam bg-nanita-jam text-white',
  sheet: 'border-nanita-jam bg-nanita-jam text-white',
  page: 'border-nanita-jam bg-nanita-jam/[0.06] text-nanita-jam',
}

const VariantPicker = ({ product, max, selected, onChange, surface = 'card' }: Props) => {
  const axes = visibleOptions(product.options, max)
  if (axes.length === 0) return null

  const s = SURFACE[surface]

  return (
    <>
      {axes.map(axis => {
        const available = availableValuesFor(product, axis.name, selected)
        return (
          <div key={axis.name} className={`flex flex-col ${s.group}`}>
            <span className={`font-body ${s.label}`} id={`axis-${axis.name}`}>
              {axis.name}
            </span>
            <div role="radiogroup" aria-labelledby={`axis-${axis.name}`} className={`flex ${s.row}`}>
              {axis.values.map(value => {
                const unavailable = !available.has(value)
                const isSelected = selected[axis.name] === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={unavailable}
                    onClick={() => onChange({ ...selected, [axis.name]: value })}
                    className={`flex items-center justify-center font-display font-semibold transition-colors ${s.pill} ${
                      isSelected
                        ? PICKED[surface]
                        : unavailable
                          ? 'border-dashed border-nanita-border/70 font-medium text-nanita-plum/70'
                          : 'border-nanita-border bg-nanita-sugar text-nanita-ink hover:border-nanita-jam/40'
                    }`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default VariantPicker
