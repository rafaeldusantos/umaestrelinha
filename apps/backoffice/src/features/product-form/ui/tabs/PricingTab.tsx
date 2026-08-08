import { ArrowDown, Info } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { formatPrice } from '@estrelinha/core/formatters'
import { priceRange } from '@estrelinha/core/pricing'
import { FormCard, DimensionInput, MoneyInput, WeightInput } from '@/shared/ui'
import type { StockPolicy } from '@estrelinha/supabase/types'
import { computeMargin } from '../../model/checklist'
import type { ProductFormState } from '../../model/useProductForm'

/** Os 3 modos de P1.6 AC 7, com o que cada um significa para a loja. */
const POLICIES: { id: StockPolicy; label: string; hint: string }[] = [
  { id: 'track', label: 'Controlar estoque', hint: 'A loja esgota quando o saldo chega a zero.' },
  {
    id: 'backorder',
    label: 'Vender no negativo',
    hint: 'A loja continua vendendo com saldo zero ou negativo.',
  },
  {
    id: 'none',
    label: 'Não controlar',
    hint: 'Sob demanda: a loja nunca marca como esgotado e a coluna Estoque fica desabilitada.',
  },
]

interface Props {
  form: ProductFormState
  setField: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  /** Atalho do aviso de precedência: leva o admin até a grade (PFM-15 AC 15). */
  onGoToGrid: () => void
}

/**
 * Os cards de preço, estoque e dimensões da aba **Preços & variações** (PFM-09, PFM-15).
 *
 * O que mudou de estrutural: a política de estoque virou **um** controle de 3 modos mutuamente
 * exclusivos, e o card de preço padrão passa a dizer em voz alta quando **não é ele** quem manda no
 * valor cobrado.
 */
const PricingTab = ({ form, setField, onGoToGrid }: Props) => {
  const margin = computeMargin(form.price, form.cost_price)
  // A faixa que a vitrine anuncia. Conta só linha ativa com preço — a mesma regra do rodapé da grade.
  const range = priceRange(form.variants)
  // PFM-15 AC 15/16: o aviso aparece quando existe grade VENDÁVEL. Com eixo declarado mas nenhuma
  // linha ativa com preço, quem manda ainda é o `base_price`, e avisar o contrário seria mentir.
  const gridRules = form.options.length > 0 && range !== null

  return (
    <>
      <FormCard
        title="Preço padrão"
        description={
          gridRules
            ? 'Serve ao "a partir de" da vitrine. Quem manda no valor cobrado é a grade.'
            : 'É o valor cobrado por este produto.'
        }
      >
        {gridRules && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border border-estrelinha-admin-violet/40 bg-estrelinha-admin-violet/5 p-3 text-sm"
            data-testid="grid-precedence-notice"
          >
            <Info className="h-4 w-4 shrink-0 text-estrelinha-admin-violet" aria-hidden="true" />
            <span className="flex-1">
              Este produto tem {form.variants.length} variaç{form.variants.length === 1 ? 'ão' : 'ões'} —
              quem manda no preço cobrado é a grade abaixo. A vitrine mostra a partir de{' '}
              <strong>{formatPrice(range!.min)}</strong>.
            </span>
            <Button type="button" size="sm" variant="outline" onClick={onGoToGrid}>
              <ArrowDown className="mr-1 h-3.5 w-3.5" /> Ir para a grade
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço</Label>
            <MoneyInput
              id="price"
              data-field="price"
              value={form.price}
              onChange={value => setField('price', value ?? 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compare_price">Preço &quot;de&quot;</Label>
            <MoneyInput
              id="compare_price"
              data-field="compare_price"
              value={form.compare_price}
              onChange={value => setField('compare_price', value ?? 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost_price">Custo</Label>
            <MoneyInput
              id="cost_price"
              value={form.cost_price}
              onChange={value => setField('cost_price', value ?? 0)}
            />
          </div>
        </div>

        {/* PFM-12: só aparece com preço E custo > 0. Antes, preço 0 com custo produzia `-Infinity`. */}
        {margin !== null && (
          <div className="rounded-xl border border-border bg-muted/40 p-4" data-testid="margin-card">
            <p className="text-sm">
              Margem de lucro:{' '}
              <strong className={margin.percent > 0 ? 'text-green-600' : 'text-destructive'}>
                {margin.percent.toFixed(1)}%
              </strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Lucro por unidade: {formatPrice(margin.profit)}
            </p>
          </div>
        )}
      </FormCard>

      <FormCard title="Estoque" description="Como este produto se esgota na loja.">
        <div
          role="radiogroup"
          aria-label="Política de estoque"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {POLICIES.map(policy => {
            const active = form.stock_policy === policy.id
            return (
              <button
                key={policy.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setField('stock_policy', policy.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? 'border-estrelinha-admin-violet bg-estrelinha-admin-violet/5 ring-1 ring-estrelinha-admin-violet'
                    : 'border-border hover:border-estrelinha-admin-violet/40'
                }`}
              >
                <span className="block text-sm font-medium text-foreground">{policy.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{policy.hint}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="stock_total">Estoque total</Label>
            <Input
              id="stock_total"
              type="number"
              min={0}
              value={form.stock_total}
              disabled={form.stock_policy === 'none'}
              onChange={event => setField('stock_total', Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {form.variants.length > 0
                ? 'Produto com grade não usa este saldo — quem baixa é a linha vendida.'
                : 'Saldo do produto sem grade.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="low_stock_threshold">Alerta de estoque baixo</Label>
            <Input
              id="low_stock_threshold"
              type="number"
              min={0}
              value={form.low_stock_threshold}
              disabled={form.stock_policy === 'none'}
              onChange={event => setField('low_stock_threshold', Number(event.target.value))}
            />
            {/* P1.6 AC 10: o limite é avaliado POR VARIAÇÃO. A sinalização na listagem é `PLS-04`,
                na feature 13. */}
            <p className="text-xs text-muted-foreground">
              Avaliado por variação, não pelo total do produto.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="production_lead_days">Prazo de produção (dias úteis)</Label>
            <Input
              id="production_lead_days"
              type="number"
              min={0}
              value={form.production_lead_days ?? ''}
              onChange={event =>
                setField(
                  'production_lead_days',
                  event.target.value === '' ? null : Number(event.target.value),
                )
              }
            />
            {/* A6: só exibição. NÃO entra na cotação do Melhor Envio. */}
            <p className="text-xs text-muted-foreground">
              Aparece na página do produto. Não entra na cotação do frete.
            </p>
          </div>
        </div>
      </FormCard>

      <FormCard title="Dimensões e peso" description="Usado na cotação do Melhor Envio.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Peso</Label>
            <WeightInput
              id="weight_kg"
              data-field="weight_kg"
              value={form.weight_kg}
              onChange={value => setField('weight_kg', value ?? 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="width_cm">Largura</Label>
            <DimensionInput
              id="width_cm"
              value={form.width_cm}
              onChange={value => setField('width_cm', value ?? 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height_cm">Altura</Label>
            <DimensionInput
              id="height_cm"
              value={form.height_cm}
              onChange={value => setField('height_cm', value ?? 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="length_cm">Comprimento</Label>
            <DimensionInput
              id="length_cm"
              value={form.length_cm}
              onChange={value => setField('length_cm', value ?? 0)}
            />
          </div>
        </div>
      </FormCard>
    </>
  )
}

export default PricingTab
