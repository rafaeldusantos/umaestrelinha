// Listagem v2 (PLS-01…PLS-04, PLS-09).
//
// A mudança de fundo não é visual: a página deixou de trazer o catálogo inteiro e filtrar em
// `useMemo`. Página, busca, filtro, ordenação e `count` são do servidor (`useAdminProductList`), e
// por isso o rodapé pode dizer `1–25 de 160` sem ter 160 linhas na memória.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, Copy, Upload, Package, Table2, ChevronDown, Grid3x3, SlidersHorizontal,
} from 'lucide-react'
import { useAdminProductList, useProductViewCounts } from '@/entities/product/api/useAdminProducts'
import BulkEditPanel from '@/features/bulk-edit/ui/BulkEditPanel'
import BulkBar from '@/features/bulk-edit/ui/BulkBar'
import BulkDeleteDialog from '@/features/bulk-edit/ui/BulkDeleteDialog'
import { buildBulkPatch, snapshotFor, type BulkResult } from '@/features/bulk-edit/model/buildBulkPatch'
import { buildDuplicates } from '@/features/bulk-edit/model/buildDuplicates'
import { csvFileName, downloadCsv, toCsv, type ExportDetail } from '@/features/bulk-edit/model/exportCsv'
import { isEmptyWrite, planCategoryWrites, splitCategoryPatches } from '@/features/bulk-edit/model/applyCategories'
import { useUndoBuffer } from '@/features/bulk-edit/model/useUndoBuffer'
import { Checkbox } from '@estrelinha/ui/checkbox'
import {
  activeFilterCount,
  defaultQuery,
  emptyFilters,
  PRODUCT_VIEWS,
  rangeLabel,
  type AdminListRow,
  type ProductFilters,
  type ProductQuery,
  type ProductSortKey,
} from '@/entities/product/api/productQuery'
import { useAdminCategories } from '@/entities/category/api/useAdminCategories'
import CsvImportDialog from '@/features/csv-import/ui/CsvImportDialog'
import FilterChips from '@/features/product-list/ui/FilterChips'
import InlineEditCell from '@/features/product-list/ui/InlineEditCell'
import { priceCell, rowBadges, statusCell, stockCell } from '@/features/product-list/model/rowSummary'
import { LIST_COLUMNS, isVisible, useColumnPrefs } from '@/features/product-list/model/columns'
import { useSavedViews } from '@/features/product-list/model/savedViews'
import { PageHeader, AdminTable, Pagination, type AdminColumn } from '@/shared/ui'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@estrelinha/ui/dropdown-menu'
import { formatPrice } from '@estrelinha/core/formatters'
import { primaryImage } from '@estrelinha/core/media'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { ToastAction } from '@estrelinha/ui/toast'
import type { DbProduct } from '@estrelinha/supabase/types'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import { supabase } from '@estrelinha/supabase/client'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const AdminProductsPage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState<ProductQuery>(defaultQuery)
  const {
    rows, total, loading, error, refetch, fetchAllFiltered,
    createProductsBatch, updateProductsBatch, deleteProductsBatch, applyCategoryWrites,
  } = useAdminProductList(query)
  const viewCounts = useProductViewCounts()
  const { categories } = useAdminCategories()
  const { views: savedViews, save: saveView } = useSavedViews()
  const { prefs, toggle, setDensity } = useColumnPrefs()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  /**
   * PLS-06, edge case da spec: a seleção guarda a LINHA, não o id.
   *
   * Reavaliar o filtro na hora de aplicar mudaria o alvo debaixo do admin — e sem os valores
   * atuais não há prévia de impacto nem snapshot para o desfazer.
   */
  const [selected, setSelected] = useState<Map<string, AdminListRow>>(new Map())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const undo = useUndoBuffer()

  const selectedRows = [...selected.values()]

  const toggleRow = (row: AdminListRow) =>
    setSelected(current => {
      const next = new Map(current)
      if (next.has(row.id)) next.delete(row.id)
      else next.set(row.id, row)
      return next
    })

  const togglePage = () =>
    setSelected(current => {
      const allSelected = rows.every(r => current.has(r.id))
      const next = new Map(current)
      for (const row of rows) {
        if (allSelected) next.delete(row.id)
        else next.set(row.id, row)
      }
      return next
    })

  /** PLS-05 AC 2: os N do filtro, não só os da página. */
  const selectAllFiltered = async () => {
    const all = await fetchAllFiltered()
    setSelected(new Map(all.map(row => [row.id, row])))
  }

  /**
   * PLS-06 AC 9-11. A ordem importa: captura o snapshot **antes** da escrita, aplica, e só oferece
   * desfazer para o que de fato mudou.
   */
  const applyPatches = async (result: BulkResult, rowsForSnapshot: AdminListRow[]) => {
    setApplying(true)
    const before = snapshotFor(rowsForSnapshot, result.patches)
    // `category_ids` não é coluna de `products`: sai do update e vira diff de `product_categories`.
    const { productPatches, categoryTargets } = splitCategoryPatches(result.patches)
    const { changed, failed } = await updateProductsBatch(productPatches)

    if (categoryTargets.length > 0) {
      const write = planCategoryWrites(rowsForSnapshot, categoryTargets)
      if (!isEmptyWrite(write)) {
        const { error: categoryError } = await applyCategoryWrites(write)
        if (categoryError) {
          toast({
            title: 'Os produtos mudaram, mas as categorias não',
            description: (categoryError as { message?: string }).message,
            variant: 'destructive',
          })
        }
      }
    }

    setApplying(false)
    setBulkOpen(false)

    const alteradas = before.filter(patch => !failed.includes(patch.id))
    undo.capture({ snapshot: alteradas, label: `${changed} produto(s) alterado(s)` })

    toast({
      title: failed.length > 0
        ? `${changed} alterados · ${failed.length} falharam`
        : `${changed} produto(s) alterados`,
      action: alteradas.length > 0 ? (
        <ToastAction
          altText="Desfazer"
          onClick={async () => {
            const snapshot = undo.take()
            if (!snapshot) return
            await updateProductsBatch(snapshot)
          }}
        >
          Desfazer
        </ToastAction>
      ) : undefined,
    })
  }

  const applyBulk = (result: BulkResult) => applyPatches(result, selectedRows)

  /** RFN-01: `Ativar` / `Pausar` são o mesmo patch do painel, sem abrir o painel. */
  const applyStatus = (mode: 'activate' | 'pause') =>
    applyPatches(buildBulkPatch(selectedRows, { status: { mode } }), selectedRows)

  /** RFN-01: cópias como rascunho, num insert só. */
  const handleDuplicate = async () => {
    setApplying(true)
    // Relê os slugs ocupados: o UNIQUE não pode ser a primeira linha de defesa de um lote.
    const { data } = await supabase.from('products').select('slug')
    const taken = new Set(((data ?? []) as { slug: string }[]).map(p => p.slug))
    const copies = buildDuplicates(selectedRows, taken)
    const { error: copyError, ids } = await createProductsBatch(copies as unknown as Record<string, unknown>[])
    setApplying(false)
    if (copyError) {
      toast({
        title: 'Não foi possível duplicar',
        description: (copyError as { message?: string }).message,
        variant: 'destructive',
      })
      return
    }
    setSelected(new Map())
    toast({ title: `${ids.length} cópia(s) criada(s) como rascunho` })
  }

  /** RFN-03: CSV com as colunas do importador. `description` e `cost_price` não estão na listagem. */
  const handleExport = async () => {
    setApplying(true)
    const ids = selectedRows.map(row => row.id)
    const { data } = await supabase.from('products').select('id, description, cost_price').in('id', ids)
    const details: Record<string, ExportDetail> = {}
    for (const row of (data ?? []) as { id: string; description: string | null; cost_price: number | null }[]) {
      details[row.id] = { description: row.description, cost_price: row.cost_price }
    }
    downloadCsv(toCsv(selectedRows, details), csvFileName(new Date()))
    setApplying(false)
    toast({ title: `${selectedRows.length} produto(s) exportados` })
  }

  /** RFN-02: só aqui alguma coisa é apagada — depois da lista e da palavra digitada. */
  const handleBulkDelete = async () => {
    setApplying(true)
    const { deleted, failed, message } = await deleteProductsBatch(selectedRows.map(row => row.id))
    setApplying(false)
    setDeleteOpen(false)
    if (failed > 0) {
      toast({ title: `${deleted} excluídos · ${failed} falharam`, description: message, variant: 'destructive' })
      return
    }
    setSelected(new Map())
    toast({ title: `${deleted} produto(s) excluídos` })
  }

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c.name])) as Record<string, string>,
    [categories],
  )

  /** Qualquer mudança de filtro volta para a página 1 — senão a página 4 de um filtro novo é vazia. */
  const patchQuery = (patch: Partial<ProductQuery>) =>
    setQuery(current => ({ ...current, ...patch, page: patch.page ?? 1 }))

  const setFilters = (filters: ProductFilters) => patchQuery({ filters })

  const toggleSort = (key: string) => {
    const sortKey = key as ProductSortKey
    setQuery(current => ({
      ...current,
      page: 1,
      sort:
        current.sort.key === sortKey
          ? { key: sortKey, dir: current.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: sortKey, dir: 'asc' },
    }))
  }

  /**
   * PLS-03 AC 8: grava e oferece o caminho de volta.
   *
   * O desfazer é um segundo `update` com o valor anterior — não há undo transacional depois do
   * commit (A23). Por isso ele vive no toast, que é efêmero por natureza, e não promete durar.
   */
  const commitInline = async (row: AdminListRow, field: 'base_price' | 'stock_total', next: number) => {
    const previous = field === 'base_price' ? row.price : row.stock_total
    const { error: writeError } = await supabase.from('products').update({ [field]: next }).eq('id', row.id)
    if (writeError) {
      toast({ title: `Não foi possível salvar ${row.name}`, description: writeError.message, variant: 'destructive' })
      return
    }
    await refetch()
    toast({
      title: `${row.name} atualizado`,
      description: field === 'base_price'
        ? `Preço: ${formatPrice(previous)} → ${formatPrice(next)}`
        : `Estoque: ${previous} → ${next}`,
      action: (
        <ToastAction
          altText="Desfazer"
          onClick={async () => {
            await supabase.from('products').update({ [field]: previous }).eq('id', row.id)
            await refetch()
          }}
        >
          Desfazer
        </ToastAction>
      ),
    })
  }

  const handleDelete = async () => {
    if (!deleting) return
    const { error: deleteError } = await supabase.from('products').delete().eq('id', deleting)
    if (deleteError) toast({ title: 'Erro ao excluir', variant: 'destructive' })
    else {
      toast({ title: 'Produto excluído!' })
      await refetch()
    }
    setDeleting(null)
  }

  /** PLS-08: o importador deixou de chamar `createProduct` num laço — é um insert e um refetch. */
  const handleBatchImport = async (items: Partial<DbProduct>[]) => {
    const { error: importError } = await createProductsBatch(items as Record<string, unknown>[])
    if (importError) toast({ title: 'Erro ao importar', variant: 'destructive' })
  }

  const columns: AdminColumn<AdminListRow>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          aria-label="Selecionar a página"
          checked={rows.length > 0 && rows.every(r => selected.has(r.id))}
          onCheckedChange={togglePage}
        />
      ),
      cell: row => (
        <Checkbox
          aria-label={`Selecionar ${row.name}`}
          checked={selected.has(row.id)}
          onCheckedChange={() => toggleRow(row)}
        />
      ),
    },
    {
      key: 'name', header: 'Produto', sortable: true,
      cell: row => {
        const thumb = primaryImage(row.images)
        const badges = rowBadges(row)
        return (
          <div className="flex items-center gap-3">
            {thumb ? (
              <img src={thumb.url} alt={thumb.alt ?? row.name} className="h-10 w-10 rounded-lg bg-muted object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Package className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{row.name}</span>
                {row.variants.length > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.variants.length} variaç{row.variants.length === 1 ? 'ão' : 'ões'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs text-muted-foreground">/{row.slug}</span>
                {badges.map(badge => (
                  <span key={badge} className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'categorias', header: 'Categorias',
      cell: row => (
        <span className="text-muted-foreground">
          {row.category_ids.map(id => categoryNames[id]).filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'price', header: 'Preço', align: 'right', sortable: true,
      cell: row => {
        const cell = priceCell(row)
        if (cell.kind === 'range') {
          return (
            <InlineEditCell
              value={cell.min}
              kind="money"
              label={`Preço de ${row.name}`}
              disabled
              lockedReason={cell.reason}
              lockedLabel={
                <span className="flex flex-col items-end">
                  <span className="font-semibold text-foreground">
                    {formatPrice(cell.min)} – {formatPrice(cell.max)}
                  </span>
                  <span className="text-[10px]">{cell.count} preços</span>
                </span>
              }
              onCommit={() => {}}
            />
          )
        }
        return (
          <InlineEditCell
            value={cell.price}
            kind="money"
            label={`Preço de ${row.name}`}
            lockedLabel={<span className="font-semibold">{formatPrice(cell.price)}</span>}
            onCommit={next => commitInline(row, 'base_price', next)}
          />
        )
      },
    },
    {
      key: 'stock', header: 'Estoque', align: 'center', sortable: true,
      cell: row => {
        const cell = stockCell(row)
        if (cell.kind === 'always') {
          return (
            <InlineEditCell
              value={0} kind="integer" label={`Estoque de ${row.name}`} disabled
              lockedReason="Este produto não controla estoque (política: não controlar)."
              lockedLabel={<span className="text-xs">{cell.label}</span>}
              onCommit={() => {}}
            />
          )
        }
        if (cell.kind === 'grid') {
          return (
            <InlineEditCell
              value={cell.total} kind="integer" label={`Estoque de ${row.name}`} disabled
              lockedReason={cell.reason}
              lockedLabel={<span>{cell.total}</span>}
              onCommit={() => {}}
            />
          )
        }
        return (
          <InlineEditCell
            value={cell.total}
            kind="integer"
            label={`Estoque de ${row.name}`}
            lockedLabel={<span className={cell.low ? 'font-semibold text-amber-700' : ''}>{cell.total}</span>}
            onCommit={next => commitInline(row, 'stock_total', next)}
          />
        )
      },
    },
    {
      key: 'status', header: 'Status', align: 'center',
      cell: row => {
        const status = statusCell(row)
        const tone =
          status.kind === 'esgotado' ? 'bg-destructive/10 text-destructive border-destructive/20'
            : status.kind === 'rascunho' ? 'bg-muted text-muted-foreground border-border'
            : status.kind === 'agendado' ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-green-50 text-green-800 border-green-200'
        return (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
            {status.label}
          </span>
        )
      },
    },
    {
      key: 'atualizado', header: 'Atualizado', align: 'center',
      cell: row => (
        <span className="text-xs text-muted-foreground">
          {row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Ações', align: 'center',
      cell: row => (
        <div className="flex justify-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/produtos/${row.id}/editar`)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/produtos/novo?from=${row.id}`)} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(row.id)} title="Excluir">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const columnIdFor: Record<string, string> = {
    name: 'produto', categorias: 'categorias', price: 'preco',
    stock: 'estoque', status: 'status', atualizado: 'atualizado',
  }
  const visibleColumns = columns.filter(c => {
    const id = columnIdFor[c.key]
    return !id || isVisible(prefs, id as never)
  })

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))

  const footer = (
    <>
      <div className="flex items-center gap-2">
        {/* PLS-01 AC 2: o total é o `count` do servidor, não `rows.length`. */}
        <span>{rangeLabel(query.page, query.pageSize, total)}</span>
        <span className="text-border">|</span>
        <Select value={String(query.pageSize)} onValueChange={v => patchQuery({ pageSize: Number(v) })}>
          <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}/pág</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Pagination page={query.page} totalPages={totalPages} onPageChange={page => setQuery(c => ({ ...c, page }))} />
    </>
  )

  return (
    <div>
      <PageHeader
        title="Produtos"
        actions={
          /* PLS-09 AC 14 */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gradient-cta text-white">
                <Plus className="mr-1 h-4 w-4" /> Novo produto <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/admin/produtos/novo')}>
                <Plus className="mr-2 h-4 w-4" /> Novo produto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/produtos/grade-rapida')}>
                <Grid3x3 className="mr-2 h-4 w-4" /> Grade rápida
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Importar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Visões (PLS-02 AC 3-4) */}
      <div className="mb-3 flex flex-wrap items-center gap-1" role="tablist" aria-label="Visões">
        {PRODUCT_VIEWS.map(view => (
          <button
            key={view.id}
            role="tab"
            aria-selected={query.filters.view === view.id}
            onClick={() => setFilters({ ...query.filters, view: view.id })}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              query.filters.view === view.id ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {view.label}
            {viewCounts[view.id] !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">{viewCounts[view.id]}</span>
            )}
          </button>
        ))}
        {savedViews.map(view => (
          <button
            key={view.id}
            role="tab"
            aria-selected={false}
            onClick={() => setFilters(view.filters)}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {view.name}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou tag..."
            value={query.search}
            onChange={e => patchQuery({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={query.filters.categoryIds[0] ?? 'all'}
          onValueChange={v => setFilters({ ...query.filters, categoryIds: v === 'all' ? [] : [v] })}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* PLS-09 AC 13 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Table2 className="mr-1 h-4 w-4" /> Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Colunas</DropdownMenuLabel>
            {LIST_COLUMNS.map(col => (
              <DropdownMenuItem
                key={col.id}
                disabled={col.fixed}
                onSelect={event => { event.preventDefault(); toggle(col.id) }}
              >
                <span className="mr-2 w-4">{isVisible(prefs, col.id) ? '✓' : ''}</span>
                {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Densidade</DropdownMenuLabel>
            <DropdownMenuItem onSelect={e => { e.preventDefault(); setDensity('confortavel') }}>
              <span className="mr-2 w-4">{prefs.density === 'confortavel' ? '✓' : ''}</span> Confortável
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={e => { e.preventDefault(); setDensity('compacta') }}>
              <span className="mr-2 w-4">{prefs.density === 'compacta' ? '✓' : ''}</span> Compacta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilterCount(query.filters) > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ ...emptyFilters(), view: query.filters.view })}>
            <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Limpar filtros ({activeFilterCount(query.filters)})
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const name = window.prompt('Nome da visão')
            if (name) saveView(name, query.filters)
          }}
        >
          Salvar visão atual
        </Button>
      </div>

      <div className="mb-3">
        <FilterChips filters={query.filters} categoryNames={categoryNames} onChange={setFilters} />
      </div>

      {/* PLS-05 AC 1 / RFN-01: a barra de massa, com as seis ações. */}
      {selectedRows.length > 0 && (
        <BulkBar
          count={selectedRows.length}
          total={total}
          busy={applying}
          onEdit={() => setBulkOpen(true)}
          onActivate={() => applyStatus('activate')}
          onPause={() => applyStatus('pause')}
          onDuplicate={handleDuplicate}
          onExport={handleExport}
          onDelete={() => setDeleteOpen(true)}
          onSelectAll={selectAllFiltered}
          onClear={() => setSelected(new Map())}
        />
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <div className={prefs.density === 'compacta' ? '[&_td]:py-1 [&_th]:py-1' : ''}>
          <AdminTable
            columns={visibleColumns}
            data={rows}
            rowKey={row => row.id}
            sortKey={query.sort.key === 'created' ? null : query.sort.key === 'price' ? 'price' : query.sort.key === 'stock' ? 'stock' : 'name'}
            sortDir={query.sort.dir}
            onSort={toggleSort}
            empty={{ icon: Package, message: 'Nenhum produto encontrado' }}
            footer={footer}
          />
        </div>
      )}

      <BulkEditPanel
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selection={selectedRows}
        categories={categories}
        onApply={applyBulk}
        applying={applying}
      />

      <BulkDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        rows={selectedRows}
        onConfirm={handleBulkDelete}
        deleting={applying}
      />

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleBatchImport} />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminProductsPage
