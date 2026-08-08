// As faixas por quantidade (feature 17 / T17, PRM-03/PRM-04).
//
// A coluna "Cliente paga" é o coração desta tela: é ela que responde "o que a cliente vai pagar por
// 5 bottons?" antes de a promoção existir. E ela vem de `tierPreview`, que chama `tierUnitPrice` — a
// **mesma** função pura do carrinho e do `create-payment`. Uma conta reescrita aqui poderia mostrar
// R$ 23,00 e a loja cobrar outro número, que é o defeito que esta feature inteira existe para matar.

import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { Label } from '@nanapin/ui/label'
import { cn } from '@nanapin/ui/lib/utils'
import { formatPrice } from '@nanapin/core/formatters'
import type { PromotionDiscountKind } from '@nanapin/supabase/types/promotion'
import { tierPreview } from '../model/tierPreview'
import type { PromotionFormValues } from '../model/schema'

interface Props {
  form: UseFormReturn<PromotionFormValues>
  kind: PromotionDiscountKind
  onKindChange: (kind: PromotionDiscountKind) => void
  /** A mediana do `base_price` dos elegíveis; `null` enquanto não há escopo. */
  referencePrice: number | null
}

const segmentClass = (selected: boolean) =>
  cn(
    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
    selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )

const TierRepeater = ({ form, kind, onKindChange, referencePrice }: Props) => {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'tiers' })
  const tiers = form.watch('tiers') ?? []
  const errors = form.formState.errors.tiers

  return (
    // Mesmo card branco do `ScopePicker` (feature 18): as faixas são a decisão central da tela.
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>Faixas por quantidade</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Conta os itens elegíveis na sacola e aplica a maior faixa alcançada.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
          <button
            type="button"
            className={segmentClass(kind === 'unit_price')}
            onClick={() => onKindChange('unit_price')}
          >
            Preço por unidade
          </button>
          <button
            type="button"
            className={segmentClass(kind === 'percent')}
            onClick={() => onKindChange('percent')}
          >
            % off
          </button>
        </div>
      </div>

      <div className="mt-3 hidden gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[140px_180px_1fr_40px]">
        <span>A partir de</span>
        <span>{kind === 'percent' ? '% de desconto' : 'Preço por unidade'}</span>
        <span>Cliente paga</span>
        <span />
      </div>

      <div className="mt-1 flex flex-col gap-2">
        {fields.map((field, index) => {
          const preview = tierPreview(
            {
              min_qty: (tiers[index]?.min_qty ?? '') as number,
              value: (tiers[index]?.value ?? '') as number,
            },
            kind,
            referencePrice,
          )
          const rowErrors = Array.isArray(errors) ? errors[index] : undefined

          return (
            <div key={field.id} data-testid={`faixa-${index}`}>
              <div className="grid items-center gap-3 sm:grid-cols-[140px_180px_1fr_40px]">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    aria-label={`Quantidade da faixa ${index + 1}`}
                    {...form.register(`tiers.${index}.min_qty` as const)}
                  />
                  <span className="text-xs text-muted-foreground">un</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {kind === 'unit_price' && (
                    <span className="text-xs text-muted-foreground">R$</span>
                  )}
                  <Input
                    type="number"
                    step={kind === 'percent' ? '1' : '0.01'}
                    aria-label={`Valor da faixa ${index + 1}`}
                    {...form.register(`tiers.${index}.value` as const)}
                  />
                  {kind === 'percent' && <span className="text-xs text-muted-foreground">%</span>}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    data-testid={`paga-${index}`}
                    className="font-heading text-base font-bold text-foreground"
                  >
                    {preview.total === null ? '—' : formatPrice(preview.total)}
                  </span>
                  {preview.percentOff !== null && (
                    <span className="text-xs text-muted-foreground">−{preview.percentOff}%</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remover faixa ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              {(rowErrors?.min_qty || rowErrors?.value) && (
                <p className="mt-1 text-xs text-destructive">
                  {rowErrors?.min_qty?.message ?? rowErrors?.value?.message}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {!Array.isArray(errors) && errors?.message && (
        <p className="mt-1 text-xs text-destructive">{errors.message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full border-dashed text-primary"
        onClick={() => append({ min_qty: '', value: '' })}
      >
        <Plus className="mr-2 h-4 w-4" /> Adicionar faixa
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">
        {referencePrice === null
          ? 'Escolha o escopo para ver quanto a cliente paga.'
          : `Prévia sobre ${formatPrice(referencePrice)} — o preço mediano dos produtos elegíveis.`}
      </p>
    </div>
  )
}

export default TierRepeater
