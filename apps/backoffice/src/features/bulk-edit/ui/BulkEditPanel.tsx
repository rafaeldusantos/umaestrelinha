// PLS-06 — o painel de edição em massa.
//
// Cada campo tem interruptor próprio: o que está desligado nem entra no patch. É a diferença entre
// "reajustar o preço de 12 produtos" e "reescrever 12 produtos inteiros com o que estava na tela".

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Switch } from '@estrelinha/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { formatPrice } from '@estrelinha/core/formatters'
import { MoneyInput } from '@/shared/ui'
import type { AdminListRow } from '@/entities/product/api/productQuery'
import {
  buildBulkPatch,
  type BulkFields,
  type BulkResult,
  type ListMode,
  type PriceMode,
  type StatusMode,
  type StockMode,
} from '../model/buildBulkPatch'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selection: AdminListRow[]
  /** Para o campo Categorias. Vazio = o campo aparece explicando que não há categoria cadastrada. */
  categories?: { id: string; name: string }[]
  onApply: (result: BulkResult) => void
  applying?: boolean
}

const PRICE_MODES: { value: PriceMode; label: string }[] = [
  { value: 'set', label: 'Definir valor' },
  { value: 'increase', label: 'Aumentar %' },
  { value: 'decrease', label: 'Diminuir %' },
  { value: 'round', label: 'Arredondar' },
]

const STOCK_MODES: { value: StockMode; label: string }[] = [
  { value: 'set', label: 'Definir' },
  { value: 'add', label: 'Somar' },
  { value: 'subtract', label: 'Subtrair' },
]

const BulkEditPanel = ({
  open, onOpenChange, selection, categories = [], onApply, applying = false,
}: Props) => {
  const [priceOn, setPriceOn] = useState(false)
  const [priceMode, setPriceMode] = useState<PriceMode>('increase')
  const [priceValue, setPriceValue] = useState<number | null>(10)
  const [endingIn90, setEndingIn90] = useState(false)

  const [stockOn, setStockOn] = useState(false)
  const [stockMode, setStockMode] = useState<StockMode>('set')
  const [stockValue, setStockValue] = useState(0)

  const [statusOn, setStatusOn] = useState(false)
  const [statusMode, setStatusMode] = useState<StatusMode>('activate')
  const [scheduledAt, setScheduledAt] = useState('')

  const [categoriesOn, setCategoriesOn] = useState(false)
  const [categoriesMode, setCategoriesMode] = useState<ListMode>('add')
  const [categoryIds, setCategoryIds] = useState<string[]>([])

  const [tagsOn, setTagsOn] = useState(false)
  const [tagsMode, setTagsMode] = useState<'add' | 'remove'>('add')
  const [tagsText, setTagsText] = useState('')

  const fields: BulkFields = {
    ...(priceOn ? { price: { mode: priceMode, value: priceValue ?? 0, endingIn90 } } : {}),
    ...(stockOn ? { stock: { mode: stockMode, value: stockValue } } : {}),
    ...(statusOn ? { status: { mode: statusMode, scheduledAt: scheduledAt || null } } : {}),
    ...(categoriesOn && categoryIds.length > 0
      ? { categories: { mode: categoriesMode, values: categoryIds } }
      : {}),
    ...(tagsOn
      ? { tags: { mode: tagsMode, values: tagsText.split(',').map(t => t.trim()).filter(Boolean) } }
      : {}),
  }

  const result = buildBulkPatch(selection, fields)
  // `Agendar` sem data não é um agendamento — é tirar o produto da loja sem dizer até quando.
  const scheduleMissingDate = statusOn && statusMode === 'schedule' && scheduledAt === ''
  const nothingOn = result.patches.length === 0 || scheduleMissingDate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[720px] max-w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Editar {selection.length} produto{selection.length === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch aria-label="Editar preço" checked={priceOn} onCheckedChange={setPriceOn} /> Preço
            </label>
            {priceOn && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={priceMode} onValueChange={v => setPriceMode(v as PriceMode)}>
                  <SelectTrigger className="h-9 w-[160px]" aria-label="Modo do preço"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {priceMode === 'set' ? (
                  <MoneyInput aria-label="Valor do preço" value={priceValue} onChange={setPriceValue} className="h-9 w-32" />
                ) : priceMode !== 'round' ? (
                  <Input
                    aria-label="Percentual"
                    type="number"
                    className="h-9 w-24"
                    value={priceValue ?? 0}
                    onChange={e => setPriceValue(Number(e.target.value))}
                  />
                ) : null}
                <label className="flex items-center gap-2 text-xs">
                  <Switch aria-label="Terminar em ,90" checked={endingIn90} onCheckedChange={setEndingIn90} />
                  terminar em ,90
                </label>
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch aria-label="Editar estoque" checked={stockOn} onCheckedChange={setStockOn} /> Estoque
            </label>
            {stockOn && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={stockMode} onValueChange={v => setStockMode(v as StockMode)}>
                  <SelectTrigger className="h-9 w-[140px]" aria-label="Modo do estoque"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOCK_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  aria-label="Quantidade"
                  type="number"
                  className="h-9 w-24"
                  value={stockValue}
                  onChange={e => setStockValue(Number(e.target.value))}
                />
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch aria-label="Editar status" checked={statusOn} onCheckedChange={setStatusOn} /> Status
            </label>
            {statusOn && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusMode} onValueChange={v => setStatusMode(v as StatusMode)}>
                  <SelectTrigger className="h-9 w-[160px]" aria-label="Modo do status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Ativar</SelectItem>
                    <SelectItem value="pause">Pausar</SelectItem>
                    <SelectItem value="schedule">Agendar</SelectItem>
                  </SelectContent>
                </Select>
                {statusMode === 'schedule' && (
                  <Input
                    aria-label="Data do agendamento"
                    type="datetime-local"
                    className="h-9 w-[220px]"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                )}
              </div>
            )}
            {scheduleMissingDate && (
              <p className="text-xs font-medium text-amber-700">Escolha a data do agendamento.</p>
            )}
          </section>

          {/* PLS-06 AC 6 — o campo que a `13` deixou sem UI. */}
          <section className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch aria-label="Editar categorias" checked={categoriesOn} onCheckedChange={setCategoriesOn} />
              Categorias
            </label>
            {categoriesOn && (
              <div className="space-y-2">
                <Select value={categoriesMode} onValueChange={v => setCategoriesMode(v as ListMode)}>
                  <SelectTrigger className="h-9 w-[160px]" aria-label="Modo das categorias"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Adicionar</SelectItem>
                    <SelectItem value="remove">Remover</SelectItem>
                    <SelectItem value="replace">Substituir</SelectItem>
                  </SelectContent>
                </Select>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" aria-label="Categorias disponíveis">
                    {categories.map(category => {
                      const picked = categoryIds.includes(category.id)
                      return (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={picked}
                          onClick={() =>
                            setCategoryIds(current =>
                              picked ? current.filter(id => id !== category.id) : [...current, category.id],
                            )
                          }
                          className={`rounded-pill border px-2.5 py-1 text-xs transition-colors ${
                            picked ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                          }`}
                        >
                          {category.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch aria-label="Editar tags" checked={tagsOn} onCheckedChange={setTagsOn} /> Tags
            </label>
            {tagsOn && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={tagsMode} onValueChange={v => setTagsMode(v as 'add' | 'remove')}>
                  <SelectTrigger className="h-9 w-[140px]" aria-label="Modo das tags"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Adicionar</SelectItem>
                    <SelectItem value="remove">Remover</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  aria-label="Tags"
                  className="h-9 flex-1"
                  placeholder="anime, sailor moon"
                  value={tagsText}
                  onChange={e => setTagsText(e.target.value)}
                />
              </div>
            )}
          </section>

          {/* PLS-06 AC 8: antes → depois, ticket médio e avisos, ANTES de gravar. */}
          <section className="space-y-2 rounded-xl border border-border bg-muted/40 p-3" aria-label="Prévia do impacto">
            <p className="text-sm font-semibold">Prévia do impacto</p>
            {nothingOn ? (
              <p className="text-xs text-muted-foreground">Ligue ao menos um campo para ver o impacto.</p>
            ) : (
              <>
                {result.preview.rows.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {result.preview.rows.map(row => (
                      <li key={row.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{row.name}</span>
                        <span className="shrink-0 font-medium">
                          {formatPrice(row.before)} → {formatPrice(row.after)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {result.preview.avgBefore !== null && (
                  <p className="text-xs text-muted-foreground">
                    Ticket médio: {formatPrice(result.preview.avgBefore)} →{' '}
                    <span className="font-medium text-foreground">{formatPrice(result.preview.avgAfter ?? 0)}</span>
                  </p>
                )}
                {result.preview.warnings.map(warning => (
                  <p key={warning} className="text-xs font-medium text-amber-700">{warning}</p>
                ))}
                <p className="text-xs text-muted-foreground">
                  {result.patches.length} produto(s) serão alterados
                  {result.ignored.length > 0 && ` · ${result.ignored.length} ignorado(s)`}
                </p>
              </>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            className="gradient-cta text-white"
            disabled={nothingOn || applying}
            onClick={() => onApply(result)}
          >
            Aplicar a {result.patches.length} produto(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BulkEditPanel
