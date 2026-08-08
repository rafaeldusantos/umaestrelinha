import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@estrelinha/ui/select'
import { MoneyInput } from '@/shared/ui'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import {
  applyBulk,
  fillColumn,
  generateSkus,
  type FillMode,
  type NumericField,
} from '../model/gridActions'

interface Props {
  variants: ProductVariant[]
  options: ProductOption[]
  selectedIds: string[]
  /** Slug do produto — prefixo do SKU automático. */
  slug: string
  onChange: (variants: ProductVariant[]) => void
  onClearSelection: () => void
  onRegenerate: () => void
  /**
   * Exclusão em massa. **Delegada**, não feita aqui: cada linha precisa passar pela consulta a
   * `order_items` (AC 9a), e uma barra de ações não tem como fazer isso sem duplicar a regra.
   */
  onRequestBulkDelete: (ids: string[]) => void
}

const FILL_LABELS: Record<FillMode, string> = {
  all: 'Aplicar a todas',
  empty: 'Só às vazias',
  increase: 'Aumentar em %',
  copyGroup: 'Copiar de outro grupo',
}

/**
 * Ações em massa e **Preencher coluna** (PFM-08 AC 9, 10, 14).
 *
 * A barra aparece só com linhas selecionadas: uma barra de ações permanentes convida ao clique
 * errado, e "aplicar a nenhuma" e "aplicar a todas" são coisas perigosamente parecidas.
 * O **Preencher coluna** fica fora dela, porque é ação de coluna e não de seleção.
 */
const GridToolbar = ({
  variants,
  options,
  selectedIds,
  slug,
  onChange,
  onClearSelection,
  onRegenerate,
  onRequestBulkDelete,
}: Props) => {
  const [bulkPrice, setBulkPrice] = useState<number | null>(null)
  const [bulkStock, setBulkStock] = useState('')
  const [fillField, setFillField] = useState<NumericField>('price')
  const [fillMode, setFillMode] = useState<FillMode>('empty')
  const [fillValue, setFillValue] = useState<number | null>(null)
  const [fillGroup, setFillGroup] = useState('')

  const firstAxis = [...options].sort((a, b) => a.position - b.position)[0]
  const groups = firstAxis
    ? [...new Set(variants.map(v => v.option_values?.[firstAxis.name]).filter(Boolean))]
    : []

  const has = selectedIds.length > 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/30 p-2">
        {/* Preencher coluna — ação de COLUNA, disponível sempre. */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="fill-field">
            Preencher coluna
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fillField} onValueChange={value => setFillField(value as NumericField)}>
              <SelectTrigger className="h-8 w-36" id="fill-field" aria-label="Coluna">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Preço</SelectItem>
                <SelectItem value="compare_price">Preço &quot;de&quot;</SelectItem>
                <SelectItem value="stock">Estoque</SelectItem>
                <SelectItem value="weight_kg">Peso</SelectItem>
              </SelectContent>
            </Select>

            <Select value={fillMode} onValueChange={value => setFillMode(value as FillMode)}>
              <SelectTrigger className="h-8 w-44" aria-label="Modo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILL_LABELS) as FillMode[]).map(mode => (
                  <SelectItem key={mode} value={mode}>
                    {FILL_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {fillMode === 'copyGroup' ? (
              <Select value={fillGroup} onValueChange={setFillGroup}>
                <SelectTrigger className="h-8 w-36" aria-label="Grupo de origem">
                  <SelectValue placeholder="Grupo de origem" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group} value={group!}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <MoneyInput
                aria-label={fillMode === 'increase' ? 'Percentual' : 'Valor'}
                value={fillValue}
                onChange={setFillValue}
                className="h-8 w-24"
              />
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onChange(
                  fillColumn({
                    variants,
                    field: fillField,
                    mode: fillMode,
                    value: fillValue ?? undefined,
                    sourceGroup: fillMode === 'copyGroup' ? fillGroup : undefined,
                    options,
                    // Com seleção ativa, preencher coluna respeita a seleção.
                    selectedIds: has ? selectedIds : undefined,
                  }),
                )
              }
            >
              Preencher
            </Button>
          </div>
        </div>

        <div className="ml-auto">
          <Button type="button" size="sm" variant="outline" onClick={onRegenerate}>
            Regerar do cruzamento
          </Button>
        </div>
      </div>

      {has && (
        <div
          className="flex flex-wrap items-end gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2"
          data-testid="bulk-bar"
        >
          <span className="pb-1.5 text-sm font-medium text-foreground">
            {selectedIds.length} selecionada{selectedIds.length === 1 ? '' : 's'}
          </span>

          <div className="flex items-center gap-1">
            <MoneyInput
              aria-label="Preço em massa"
              value={bulkPrice}
              onChange={setBulkPrice}
              className="h-8 w-24"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(applyBulk(variants, selectedIds, { price: bulkPrice }))}
            >
              Definir preço
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Input
              aria-label="Estoque em massa"
              type="number"
              value={bulkStock}
              onChange={event => setBulkStock(event.target.value)}
              className="h-8 w-20"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkStock === ''}
              onClick={() => onChange(applyBulk(variants, selectedIds, { stock: Number(bulkStock) }))}
            >
              Definir estoque
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(generateSkus(variants, selectedIds, slug, options))}
          >
            Gerar SKU
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(applyBulk(variants, selectedIds, { is_active: false }))}
          >
            Pausar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRequestBulkDelete(selectedIds)}
          >
            Excluir
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClearSelection}>
            Limpar seleção
          </Button>
        </div>
      )}
    </div>
  )
}

export default GridToolbar
