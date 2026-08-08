// Grade rápida (PLS-07, PLS-08) — os 20 itens de um drop, colados do Excel.
//
// A planilha é só a superfície: interpretar preço colado, herdar padrão do lote e cruzar eixos são
// funções puras em `features/quick-grid/model/quickGrid.ts`, testadas sem montar a tela. Aqui mora
// o teclado (`Tab`, `⌥↓`), a colagem e a chamada de escrita — um insert de produtos, um de
// variações e um refetch.

import { Fragment, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { PageHeader, FormCard, MoneyInput, WeightInput } from '@/shared/ui'
import OptionsEditor from '@/features/product-form/ui/OptionsEditor'
import { useAdminProductList } from '@/entities/product/api/useAdminProducts'
import { defaultQuery } from '@/entities/product/api/productQuery'
import {
  buildInsertBatch,
  emptyDefaults,
  emptyRow,
  footerSummary,
  GRID_COLUMNS,
  isEmptyRow,
  isRowReady,
  MAX_ROWS,
  parseClipboardGrid,
  slugify,
  validateRows,
  type GridDefaults,
  type GridRow,
} from '@/features/quick-grid/model/quickGrid'
import { supabase } from '@estrelinha/supabase/client'
import {
  uploadFailureMessage,
  uploadProductImages,
} from '@/features/product-form/lib/uploadProductImage'

const STARTING_ROWS = 5

const AdminQuickGridPage = () => {
  const navigate = useNavigate()
  const { createProductsBatch } = useAdminProductList(defaultQuery())
  const [defaults, setDefaults] = useState<GridDefaults>(emptyDefaults)
  const [rows, setRows] = useState<GridRow[]>(() => Array.from({ length: STARTING_ROWS }, emptyRow))
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  /** Linhas com envio em curso — a célula mostra o estado sem travar a planilha inteira. */
  const [uploading, setUploading] = useState<number[]>([])
  const gridRef = useRef<HTMLDivElement>(null)

  const statuses = useMemo(
    () => validateRows(rows, defaults, existingSlugs),
    [rows, defaults, existingSlugs],
  )
  const prontas = statuses.filter(s => !isEmptyRow(s.row) && isRowReady(s.errors)).length

  const patchRow = (index: number, patch: Partial<GridRow>) =>
    setRows(current => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const addRow = () => setRows(current => [...current, emptyRow()])
  const removeRow = (index: number) => setRows(current => current.filter((_, i) => i !== index))

  /** `⌥↓` duplica a linha atual — o atalho do artboard para repetir o que se repete. */
  const duplicateRow = (index: number) =>
    setRows(current => [...current.slice(0, index + 1), { ...current[index] }, ...current.slice(index + 1)])

  /**
   * RFN-05 AC 2: o MESMO caminho da aba Mídia — validação de tipo/tamanho e WebP de 1600 px.
   *
   * Um segundo uploader aqui teria a própria validação e divergiria no primeiro ajuste; foi o
   * argumento que manteve a coluna fora da `13`, e ele cai reusando a lib.
   */
  const handleRowImage = async (index: number, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploading(current => [...current, index])
    const { uploaded, failed } = await uploadProductImages([file])
    setUploading(current => current.filter(i => i !== index))

    if (uploaded[0]) {
      patchRow(index, { imageUrl: uploaded[0] })
      return
    }
    // AC 5: a linha segue criável sem imagem — o que não pode é a falha ficar muda.
    if (failed[0]) {
      toast({ title: uploadFailureMessage(failed[0]), variant: 'destructive' })
    }
  }

  const handlePaste = (event: React.ClipboardEvent, startIndex: number) => {
    const text = event.clipboardData?.getData('text/plain') ?? ''
    // Uma célula só continua sendo digitação normal: o parse é para colagem de PLANILHA.
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()

    const { rows: parsed, truncated } = parseClipboardGrid(text)
    setRows(current => {
      const next = [...current]
      parsed.forEach((row, offset) => {
        next[startIndex + offset] = row
      })
      return next
    })

    if (truncated > 0) {
      toast({
        title: `Coladas ${MAX_ROWS} linhas`,
        description: `${truncated} linha(s) ficaram de fora: o lote é limitado a ${MAX_ROWS}.`,
        variant: 'destructive',
      })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    // `⌥↓` (Alt+Seta para baixo)
    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault()
      duplicateRow(index)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    // Relê os slugs ocupados imediatamente antes de gravar: entre carregar a tela e clicar, alguém
    // pode ter cadastrado o mesmo produto. O UNIQUE do banco continua sendo a rede.
    const { data } = await supabase.from('products').select('slug')
    const slugs = new Set(((data ?? []) as { slug: string }[]).map(p => p.slug))
    setExistingSlugs(slugs)

    const { products, variants } = buildInsertBatch(rows, defaults, slugs)
    if (products.length === 0) {
      setSaving(false)
      toast({ title: 'Nenhuma linha válida para criar', variant: 'destructive' })
      return
    }

    const { error, ids } = await createProductsBatch(
      products as unknown as Record<string, unknown>[],
      createdIds =>
        variants.map(variant => ({
          product_id: createdIds[variant.rowIndex],
          option_values: variant.option_values,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          is_active: variant.is_active,
          position: variant.position,
        })),
    )
    setSaving(false)

    if (error) {
      toast({
        title: 'Não foi possível criar os produtos',
        description: (error as { message?: string }).message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: `${ids.length} produto(s) criados como rascunho` })

    // AC 8: as linhas com erro FICAM na tela para correção — por isso a página não navega embora.
    // Sair levaria junto o trabalho que ainda precisa de conserto.
    const criados = new Set(products.map(p => p.slug))
    setRows(current => {
      const restantes = current.filter(row => !isEmptyRow(row) && !criados.has(slugify(row.name)))
      return restantes.length > 0 ? restantes : Array.from({ length: STARTING_ROWS }, emptyRow)
    })
  }

  return (
    <div>
      <PageHeader
        title="Grade rápida"
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/produtos')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        }
      />

      <FormCard title="Padrões de todas as linhas" description="O que se repete no lote é preenchido aqui uma vez só.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Eixos de opção</Label>
            <OptionsEditor
              options={defaults.options}
              onChange={options => setDefaults(current => ({ ...current, options }))}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Peso (preset)</Label>
              <WeightInput
                aria-label="Peso do lote"
                value={defaults.weightKg}
                onChange={weightKg => setDefaults(current => ({ ...current, weightKg }))}
                className="w-32"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch
                aria-label="Salvar como rascunho"
                checked={defaults.asDraft}
                onCheckedChange={asDraft => setDefaults(current => ({ ...current, asDraft }))}
              />
              Salvar como rascunho
            </label>
          </div>
        </div>
      </FormCard>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card" ref={gridRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-10 p-2">#</th>
              {GRID_COLUMNS.map(column => (
                <th key={column.id} className="p-2">
                  {column.label}{column.required ? '*' : ''}
                </th>
              ))}
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {statuses.map((status, index) => (
              <Fragment key={index}>
                <tr className="border-b border-border/60">
                  <td className="p-2 text-xs text-muted-foreground">{index + 1}</td>
                  {/* RFN-05: a célula de imagem. Arquivo, não texto — por isso fora do colar. */}
                  <td className="p-1">
                    {status.row.imageUrl ? (
                      <div className="relative h-10 w-10">
                        <img
                          src={status.row.imageUrl}
                          alt={`Imagem da linha ${index + 1}`}
                          className="h-10 w-10 rounded-lg border border-border object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remover imagem da linha ${index + 1}`}
                          onClick={() => patchRow(index, { imageUrl: null })}
                          className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50">
                        {uploading.includes(index) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          aria-label={`Imagem da linha ${index + 1}`}
                          onChange={event => handleRowImage(index, event.target.files)}
                        />
                      </label>
                    )}
                  </td>
                  <td className="p-1">
                    <Input
                      aria-label={`Nome da linha ${index + 1}`}
                      value={status.row.name}
                      onChange={e => patchRow(index, { name: e.target.value })}
                      onPaste={e => handlePaste(e, index)}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      aria-label={`Categorias da linha ${index + 1}`}
                      value={status.row.categories.join(', ')}
                      onChange={e => patchRow(index, { categories: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-1">
                    <MoneyInput
                      aria-label={`Preço da linha ${index + 1}`}
                      value={status.row.price}
                      onChange={price => patchRow(index, { price })}
                      className="h-8 w-28"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      aria-label={`Estoque da linha ${index + 1}`}
                      type="number"
                      value={status.row.stock ?? ''}
                      onChange={e => patchRow(index, { stock: e.target.value === '' ? null : Number(e.target.value) })}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      aria-label={`Tags da linha ${index + 1}`}
                      value={status.row.tags.join(', ')}
                      onChange={e => patchRow(index, { tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="h-8"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      aria-label={`SKU base da linha ${index + 1}`}
                      value={status.row.skuBase}
                      onChange={e => patchRow(index, { skuBase: e.target.value })}
                      onKeyDown={e => handleKeyDown(e, index)}
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remover linha ${index + 1}`}
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                {/* AC 6: o erro aparece IMEDIATAMENTE embaixo da linha, sem esperar o submit. */}
                {status.errors.length > 0 && !isEmptyRow(status.row) && (
                  <tr className="border-b border-border/60">
                    <td />
                    <td colSpan={GRID_COLUMNS.length + 1} className="px-2 pb-2">
                      <span className="text-xs font-medium text-destructive">
                        {status.errors.map(e => e.message).join(' · ')}
                      </span>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar linha
            </Button>
            <span className="text-xs text-muted-foreground">
              Cole do Excel com ⌘V · ⌥↓ duplica a linha
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* AC 7 */}
            <span className="text-sm text-muted-foreground" aria-label="Resumo do lote">
              {footerSummary(statuses)}
            </span>
            <Button
              className="gradient-cta text-white"
              disabled={prontas === 0 || saving}
              onClick={handleCreate}
            >
              Criar {prontas} produto{prontas === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminQuickGridPage
