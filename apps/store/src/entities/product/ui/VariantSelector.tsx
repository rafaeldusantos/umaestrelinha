import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nanapin/ui/select'
import { availableValuesFor, visibleOptions, type GridProduct } from '../lib/variantSelection'
import type { OptionValues } from '@nanapin/supabase/types'

interface Props {
  product: GridProduct
  /** Quantos eixos esta superfície mostra: `CARD_MAX_AXES` no card, `PAGE_MAX_AXES` na página. */
  max: number
  selected: OptionValues
  onChange: (values: OptionValues) => void
}

/**
 * Um seletor por eixo de `products.options` (PST-05 AC 1), na ordem de `position`.
 *
 * Substitui os selects fixos de `sizes`/`finishes`: com eixos genéricos, "Tamanho" e "Acabamento"
 * são só dois cadastros possíveis entre outros (Cor, Estampa, Pack).
 *
 * Valor que não leva a nenhuma variação disponível aparece **desabilitado**, não escondido
 * (PST-08): esconder faria a grade parecer menor do que é, e o cliente não saberia que o 5,5 cm
 * existe e voltou.
 */
const VariantSelector = ({ product, max, selected, onChange }: Props) => {
  const axes = visibleOptions(product.options, max)
  if (axes.length === 0) return null

  return (
    <>
      {axes.map(axis => {
        const available = availableValuesFor(product, axis.name, selected)
        return (
          <Select
            key={axis.name}
            value={selected[axis.name] ?? ''}
            onValueChange={value => onChange({ ...selected, [axis.name]: value })}
          >
            <SelectTrigger className="h-9 text-xs" aria-label={axis.name}>
              <SelectValue placeholder={axis.name} />
            </SelectTrigger>
            <SelectContent>
              {axis.values.map(value => {
                const unavailable = !available.has(value)
                return (
                  <SelectItem key={value} value={value} disabled={unavailable}>
                    {unavailable ? `${value} — indisponível` : value}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )
      })}
    </>
  )
}

export default VariantSelector
