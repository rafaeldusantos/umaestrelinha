import { useState } from 'react'
import { AlertCircle, ImageOff, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Switch } from '@estrelinha/ui/switch'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { formatPrice } from '@estrelinha/core/formatters'
import { priceRange, variantLabel } from '@estrelinha/core/pricing'
import { MoneyInput, WeightInput } from '@/shared/ui'
import GridToolbar from './GridToolbar'
import RegenerateGridDialog from './RegenerateGridDialog'
import { applyRegenerate, buildRegeneratePlan } from '../model/gridActions'
import type { ProductOption, ProductVariant, StockPolicy } from '@estrelinha/supabase/types'

// A grade de variações (PFM-08, PFM-15). Reescrita da tabela que editava o JSONB legado
// `products.variants` — sem coluna de preço, que é exatamente o problema que este programa existe
// para resolver. Agora a fonte é `product_variants`, com **preço absoluto por linha** (D2).

/**
 * O que o chamador responde quando o admin pede exclusão.
 * `orders > 0` ⇒ a exclusão é recusada e o admin recebe **Pausar** no lugar (PFM-08 AC 9a).
 */
export interface DeleteCheck {
  orders: number
  /**
   * `false` quando a consulta a `order_items` **falhou**. A exclusão é recusada do mesmo jeito, mas
   * com outra mensagem: inventar "vendida em 1 pedido" seria mentir, e excluir às cegas devolveria
   * o erro de FK cru que a AC 9a existe para evitar.
   */
  verified?: boolean
}

interface Props {
  variants: ProductVariant[]
  options: ProductOption[]
  stockPolicy: StockPolicy
  onChange: (variants: ProductVariant[]) => void
  /**
   * Consulta `order_items` antes de excluir. A FK `order_items.variant_id → product_variants(id)`
   * é `NO ACTION`: sem esta pergunta, o admin levaria um erro de FK cru na cara.
   */
  onRequestDelete: (variant: ProductVariant) => Promise<DeleteCheck>
  /** Linhas selecionadas, para as ações em massa da T29. */
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  /** Slug do produto — prefixo do SKU automático (AC 14). */
  slug?: string
  /** Id do produto, para as linhas novas de **Regerar**. */
  productId?: string
}

interface Group {
  key: string
  label: string
  rows: { variant: ProductVariant; index: number }[]
}

/**
 * Agrupa pelo **1º eixo** (PFM-08 AC 8). Com 3 eixos e 60 linhas, uma tabela plana é ilegível; o
 * agrupamento é o que a torna utilizável sem trazer virtualização por antecipação (A18).
 */
const groupByFirstAxis = (
  variants: readonly ProductVariant[],
  options: readonly ProductOption[],
): Group[] => {
  const first = [...options].sort((a, b) => a.position - b.position)[0]
  if (!first) {
    return [{ key: '', label: '', rows: variants.map((variant, index) => ({ variant, index })) }]
  }
  const groups = new Map<string, Group>()
  variants.forEach((variant, index) => {
    const value = variant.option_values?.[first.name] ?? '—'
    const existing = groups.get(value)
    if (existing) existing.rows.push({ variant, index })
    else groups.set(value, { key: value, label: `${first.name}: ${value}`, rows: [{ variant, index }] })
  })
  return [...groups.values()]
}

const VariantsTable = ({
  variants,
  options,
  stockPolicy,
  onChange,
  onRequestDelete,
  selectedIds = [],
  onSelectionChange,
  slug = '',
  productId = '',
}: Props) => {
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [blockedByOrders, setBlockedByOrders] = useState<string[]>([])
  const [refusal, setRefusal] = useState<{
    variant: ProductVariant
    orders: number
    unverified?: boolean
  } | null>(null)

  // `none` = produto sob demanda ou personalizado: não há saldo para controlar, então a coluna
  // inteira fica desabilitada (PFM-09 AC 8 / P1.6 AC 8).
  const stockDisabled = stockPolicy === 'none'
  const range = priceRange(variants)
  const totalStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
  const groups = groupByFirstAxis(variants, options)

  const update = (index: number, patch: Partial<ProductVariant>) =>
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)))

  const remove = (index: number) => onChange(variants.filter((_, i) => i !== index))

  const requestDelete = async (variant: ProductVariant, index: number) => {
    const check = await onRequestDelete(variant)
    if (check.verified === false) {
      setRefusal({ variant, orders: 0, unverified: true })
      return
    }
    if (check.orders > 0) {
      setRefusal({ variant, orders: check.orders })
      return
    }
    remove(index)
  }

  const toggleSelected = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    onSelectionChange(checked ? [...selectedIds, id] : selectedIds.filter(x => x !== id))
  }

  /**
   * Exclusão em massa que respeita a AC 9a: cada linha passa pela mesma consulta a `order_items`.
   * As que têm pedido ficam, nomeadas; as outras saem. Excluir o lote inteiro sem checar é o erro
   * de FK cru que a AC existe para impedir — e em massa ele seria pior, não melhor.
   */
  const bulkDelete = async (ids: readonly string[]) => {
    const removable: string[] = []
    const blocked: string[] = []
    for (const id of ids) {
      const variant = variants.find(v => v.id === id)
      if (!variant) continue
      const check = await onRequestDelete(variant)
      if (check.verified === false || check.orders > 0) {
        blocked.push(variantLabel(options, variant.option_values) || variant.id)
      } else {
        removable.push(id)
      }
    }
    if (removable.length > 0) {
      const set = new Set(removable)
      onChange(variants.filter(v => !set.has(v.id)))
    }
    setBlockedByOrders(blocked)
    onSelectionChange?.([])
  }

  const toolbar = (
    <>
      <GridToolbar
        variants={variants}
        options={options}
        selectedIds={selectedIds}
        slug={slug}
        onChange={onChange}
        onClearSelection={() => onSelectionChange?.([])}
        onRegenerate={() => setRegenerateOpen(true)}
        onRequestBulkDelete={bulkDelete}
      />
      <RegenerateGridDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        plan={buildRegeneratePlan(variants, options)}
        options={options}
        onConfirm={() => {
          onChange(applyRegenerate(variants, options, productId))
          setRegenerateOpen(false)
        }}
      />
      {blockedByOrders.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Estas variações não foram excluídas porque já foram vendidas:{' '}
          <strong>{blockedByOrders.join(', ')}</strong>. Pause-as para tirar da loja.
        </div>
      )}
    </>
  )

  if (variants.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar}
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhuma variação. Declare os eixos acima e use <strong>Regerar do cruzamento</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {toolbar}
      {refusal && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <span className="flex-1">
            <strong>{variantLabel(options, refusal.variant.option_values) || 'Esta variação'}</strong>{' '}
            {refusal.unverified
              ? 'não pôde ser excluída: não conseguimos verificar se ela já foi vendida. Tente de novo, ou pause para tirar da loja.'
              : `já foi vendida em ${refusal.orders} pedido(s) e não pode ser excluída — o histórico aponta para ela. Pause para tirar da loja.`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const index = variants.findIndex(v => v.id === refusal.variant.id)
              if (index >= 0) update(index, { is_active: false })
              setRefusal(null)
            }}
          >
            Pausar variação
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRefusal(null)}>
            Fechar
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <th className="w-8 p-2" />
              <th className="w-10 p-2" />
              <th className="p-2 text-left">Variação</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Preço</th>
              <th className="p-2 text-left">Preço &quot;de&quot;</th>
              <th className="p-2 text-left">Estoque</th>
              <th className="p-2 text-left">Peso</th>
              <th className="p-2 text-left">Ativa</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          {groups.map(group => (
            <tbody key={group.key}>
              {group.label && (
                <tr className="border-b border-border bg-muted/30">
                  <td colSpan={10} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                    {' · '}
                    {group.rows.length} variaç{group.rows.length === 1 ? 'ão' : 'ões'}
                    {' · '}
                    {group.rows.reduce((sum, r) => sum + (r.variant.stock ?? 0), 0)} un.
                  </td>
                </tr>
              )}
              {group.rows.map(({ variant, index }) => {
                // PFM-08 AC 11: linha ativa sem preço não entra na loja — o servidor recusaria o
                // pagamento dela com 422. O erro é na LINHA, não num toast genérico.
                const missingPrice =
                  variant.is_active && (variant.price === null || variant.price === undefined)
                const label = variantLabel(options, variant.option_values) || variant.name || '—'
                return (
                  <tr
                    key={variant.id}
                    data-testid={`variant-row-${variant.id}`}
                    data-invalid={missingPrice ? 'sem-preco' : undefined}
                    className={`border-b border-border last:border-0 ${
                      missingPrice
                        ? 'bg-destructive/5 outline outline-1 -outline-offset-1 outline-destructive/50'
                        : ''
                    }`}
                  >
                    <td className="p-2">
                      <Checkbox
                        aria-label={`Selecionar ${label}`}
                        checked={selectedIds.includes(variant.id)}
                        onCheckedChange={checked => toggleSelected(variant.id, checked === true)}
                      />
                    </td>
                    <td className="p-2">
                      {variant.image_url ? (
                        <img src={variant.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </td>
                    <td className="p-2">
                      <span className="font-medium text-foreground">{label}</span>
                      {missingPrice && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          sem preço a variação não entra na loja
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        aria-label={`SKU de ${label}`}
                        value={variant.sku ?? ''}
                        onChange={event => update(index, { sku: event.target.value || null })}
                        className="h-8 w-28"
                        placeholder="Opcional"
                      />
                    </td>
                    <td className="p-2">
                      <MoneyInput
                        aria-label={`Preço de ${label}`}
                        value={variant.price}
                        onChange={value => update(index, { price: value })}
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="p-2">
                      <MoneyInput
                        aria-label={`Preço "de" de ${label}`}
                        value={variant.compare_price}
                        onChange={value => update(index, { compare_price: value })}
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        aria-label={`Estoque de ${label}`}
                        type="number"
                        value={variant.stock}
                        disabled={stockDisabled}
                        onChange={event => update(index, { stock: Number(event.target.value) })}
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="p-2">
                      <WeightInput
                        aria-label={`Peso de ${label}`}
                        value={variant.weight_kg}
                        onChange={value => update(index, { weight_kg: value })}
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="p-2">
                      <Switch
                        aria-label={`Ativa: ${label}`}
                        checked={variant.is_active}
                        onCheckedChange={checked => update(index, { is_active: checked })}
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${label}`}
                        className="h-8 w-8 text-destructive"
                        onClick={() => requestDelete(variant, index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>

      {/* PFM-08 AC 13: a faixa conta **só** linha ativa com preço — é o que a vitrine pratica. */}
      <p className="text-sm text-muted-foreground" data-testid="variants-footer">
        {variants.length} variaç{variants.length === 1 ? 'ão' : 'ões'}
        {range && (
          <>
            {' · '}
            faixa {formatPrice(range.min)}
            {range.min !== range.max && ` – ${formatPrice(range.max)}`}
          </>
        )}
        {!stockDisabled && ` · ${totalStock} un. somadas`}
      </p>
    </div>
  )
}

export default VariantsTable
