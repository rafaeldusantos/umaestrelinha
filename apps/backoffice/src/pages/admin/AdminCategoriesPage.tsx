// RFN-09 / T58 — a tela de Categorias, conforme o artboard aceito.
//
// Master–detail numa tela só: a árvore à esquerda, o inspetor docado à direita. Categoria é
// entidade pequena e não merece página de edição própria — clicar na linha edita sem sair da lista,
// que é a mesma filosofia da edição inline de preço da listagem v2.
//
// O `CategoryFormDialog` continua vivo para a CRIAÇÃO (é o mesmo componente que o formulário de
// produto usa no "criar categoria" inline). A EDIÇÃO passou para o inspetor.

import { useMemo, useState } from 'react'
import { ArrowUpDown, Plus, Search } from 'lucide-react'
import { useAdminCategories, type AdminCategory } from '@/entities/category/api/useAdminCategories'
import CategoryFormDialog from '@/features/category-form/ui/CategoryFormDialog'
import {
  buildCategoryTree, cascadeSelection, deletionImpact, filterCategoryRows, moveDestinations,
  moveSelection, planMove, reorderWithinParent,
  CategoryBulkBar, CategoryDeleteDialog, CategoryInspector, CategoryMoveDialog, CategoryTable,
  type CategoryView,
} from '@/features/category-list'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { toast } from '@nanapin/ui/hooks/use-toast'
import { cn } from '@nanapin/ui/lib/utils'
import type { DbCategory } from '@nanapin/supabase/types'

const VIEWS: { id: CategoryView; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'vitrine', label: 'Na vitrine' },
  { id: 'ocultas', label: 'Ocultas' },
  { id: 'sem-produto', label: 'Sem produto' },
]

const AdminCategoriesPage = () => {
  const {
    categories, loading, createCategory, updateCategory,
    updateCategoriesBatch, deleteCategoriesBatch, moveCategories, updateSortOrders,
  } = useAdminCategories()

  const [search, setSearch] = useState('')
  const [view, setView] = useState<CategoryView>('todas')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [collapsedIds, setCollapsedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [choosingDestination, setChoosingDestination] = useState(false)

  const allRows = useMemo(() => buildCategoryTree(categories), [categories])
  const rows = useMemo(() => filterCategoryRows(allRows, { search, view }), [allRows, search, view])

  const active = activeId ? categories.find(c => c.id === activeId) ?? null : null
  const activeRow = activeId ? allRows.find(r => r.category.id === activeId) ?? null : null

  // A seleção que VAI PARA O UPDATE é sempre a cascateada — é o que a barra promete em texto.
  const effectiveSelection = useMemo(
    () => cascadeSelection(selectedIds, allRows),
    [selectedIds, allRows],
  )
  const cascadedCount = effectiveSelection.length - selectedIds.length

  // Mover é a única ação de massa que NÃO age sobre a seleção inteira: quem está dentro de uma que
  // se move é carregada pelo movimento e não pode receber `parent_id` novo, sob pena de virar irmã
  // da própria mãe.
  const { moving, carried } = useMemo(
    () => moveSelection(allRows, effectiveSelection),
    [allRows, effectiveSelection],
  )
  const destinations = useMemo(
    () => moveDestinations(allRows, moving.map(row => row.category.id)),
    [allRows, moving],
  )

  const semProduto = allRows.filter(r => r.totalCount === 0).length

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    const error = await action()
    setBusy(false)
    if (error) toast({ title: 'Não deu certo', description: String((error as { message?: string })?.message ?? ''), variant: 'destructive' })
    else toast({ title: ok })
    return !error
  }

  const handleToggleSelect = (id: string) =>
    setSelectedIds(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]))

  const handleToggleAll = () =>
    setSelectedIds(current => (current.length === rows.length ? [] : rows.map(r => r.category.id)))

  const handleToggleCollapse = (id: string) =>
    setCollapsedIds(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]))

  const handleToggleActive = (id: string, value: boolean) =>
    run(() => updateCategory(id, { active: value }), value ? 'Categoria na vitrine' : 'Categoria oculta')

  const handleSaveInspector = async (id: string, updates: Partial<DbCategory>) =>
    run(() => updateCategory(id, updates), 'Categoria salva')

  const handleBulkVisibility = (value: boolean) =>
    run(
      () => updateCategoriesBatch(effectiveSelection, { active: value }),
      value ? `${effectiveSelection.length} na vitrine` : `${effectiveSelection.length} ocultas`,
    ).then(() => setSelectedIds([]))

  const handleMove = async (destinationId: string | null) => {
    const plan = planMove(categories, allRows, effectiveSelection, destinationId)

    // Plano vazio é escolher o pai que já era: nada para gravar, e um toast de sucesso mentiria
    // sobre uma escrita que não houve.
    if (plan.length === 0) {
      setChoosingDestination(false)
      toast({
        title: 'Nada mudou de lugar',
        description: 'As categorias selecionadas já estavam nesse destino.',
      })
      return
    }

    const ok = await run(() => moveCategories(plan), `${plan.length} categoria${plan.length === 1 ? '' : 's'} movida${plan.length === 1 ? '' : 's'}`)
    if (ok) {
      setChoosingDestination(false)
      setSelectedIds([])
    }
  }

  const handleDelete = async () => {
    const ok = await run(() => deleteCategoriesBatch(effectiveSelection), 'Categorias excluídas')
    if (ok) {
      setConfirmingDelete(false)
      setSelectedIds([])
      if (activeId && effectiveSelection.includes(activeId)) setActiveId(null)
    }
  }

  /**
   * O arraste. `reorderWithinParent` é quem decide: devolve `null` quando origem e destino têm pais
   * diferentes, e a tela **avisa em vez de gravar** — mudar de pai é o campo do inspetor, não um
   * efeito colateral de soltar a linha no lugar errado.
   */
  const handleDrop = (draggedId: string, targetId: string) => {
    const changes = reorderWithinParent(categories, draggedId, targetId)
    if (changes === null) {
      toast({
        title: 'Só dá para reordenar entre irmãs',
        description: 'Para mudar de pai, use o campo "Categoria pai" no inspetor — ou marque as categorias e use "Mover para…".',
      })
      return
    }
    if (changes.length === 0) return
    run(() => updateSortOrders(changes), 'Ordem atualizada')
  }

  const handleCreate = async (data: Partial<DbCategory>) => {
    const { error } = await createCategory(data)
    if (error) toast({ title: 'Erro ao criar', variant: 'destructive' })
    else toast({ title: 'Categoria criada!' })
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold text-foreground">Categorias</h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
              {categories.length} categoria{categories.length === 1 ? '' : 's'} · {semProduto} sem produto
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Clique numa linha para editar ao lado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={reordering ? 'default' : 'outline'}
            size="sm"
            aria-pressed={reordering}
            onClick={() => setReordering(v => !v)}
          >
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            {reordering ? 'Concluir ordenação' : 'Reordenar'}
          </Button>
          <Button size="sm" className="gradient-cta text-white" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova categoria
          </Button>
        </div>
      </header>

      <nav className="flex items-center gap-4 border-b border-border" aria-label="Visões">
        {VIEWS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'border-b-2 px-0.5 pb-2 pt-2.5 text-[13px]',
              view === item.id
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.id === 'sem-produto' && semProduto > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-px text-[10.5px] font-bold text-amber-700">
                {semProduto}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3.5 py-4">
        <div className="flex items-center gap-2">
          <div className="relative w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar categoria ou slug…"
              aria-label="Buscar categoria ou slug"
              className="pl-9"
            />
          </div>
          {(search || view !== 'todas') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setView('todas') }}
            >
              Limpar
            </Button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <CategoryBulkBar
            count={effectiveSelection.length}
            cascadedCount={cascadedCount}
            busy={busy}
            onMove={() => setChoosingDestination(true)}
            onShow={() => handleBulkVisibility(true)}
            onHide={() => handleBulkVisibility(false)}
            onDelete={() => setConfirmingDelete(true)}
            onClear={() => setSelectedIds([])}
          />
        )}

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="flex items-start gap-3.5">
            <CategoryTable
              rows={rows}
              selectedIds={effectiveSelection}
              activeId={activeId}
              collapsedIds={collapsedIds}
              reordering={reordering}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
              onToggleCollapse={handleToggleCollapse}
              onToggleActive={handleToggleActive}
              onOpen={setActiveId}
              onDrop={handleDrop}
            />

            {active && (
              <CategoryInspector
                category={active}
                allCategories={categories as AdminCategory[]}
                productCount={activeRow?.totalCount ?? 0}
                saving={busy}
                onSave={handleSaveInspector}
                onClose={() => setActiveId(null)}
              />
            )}
          </div>
        )}
      </div>

      <CategoryFormDialog
        open={creating}
        onOpenChange={setCreating}
        category={null}
        onSave={handleCreate}
        allCategories={categories}
      />

      <CategoryMoveDialog
        open={choosingDestination}
        onOpenChange={setChoosingDestination}
        moving={moving}
        carried={carried}
        destinations={destinations}
        saving={busy}
        onConfirm={handleMove}
      />

      <CategoryDeleteDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        impact={deletionImpact(allRows, effectiveSelection)}
        deleting={busy}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default AdminCategoriesPage
