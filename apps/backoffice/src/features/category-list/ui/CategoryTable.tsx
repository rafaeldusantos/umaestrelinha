// RFN-09 / T55 — a tabela em árvore.
//
// Não usa `shared/ui/AdminTable`: aquele é uma grade genérica de colunas, e esta tela precisa de
// indentação por profundidade, conector `├`/`└`, linha clicável que abre o inspetor e alça de
// arraste que só existe no modo Reordenar. Forçar tudo isso em `AdminColumn` deformaria o
// componente compartilhado para o caso de uma tela só.

import { ChevronDown, ChevronRight, GripVertical, MoreVertical } from 'lucide-react'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import type { CategoryRow } from '../model/categoryTree'

interface Props {
  rows: CategoryRow[]
  selectedIds: string[]
  /** A categoria aberta no inspetor. */
  activeId: string | null
  /** Raízes colapsadas — as filhas delas não são desenhadas. */
  collapsedIds: string[]
  reordering?: boolean
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onToggleCollapse: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
  onOpen: (id: string) => void
  onDrop?: (draggedId: string, targetId: string) => void
}

const CategoryTable = ({
  rows, selectedIds, activeId, collapsedIds, reordering = false,
  onToggleSelect, onToggleAll, onToggleCollapse, onToggleActive, onOpen, onDrop,
}: Props) => {
  const selected = new Set(selectedIds)
  const collapsed = new Set(collapsedIds)

  // Uma filha de categoria colapsada não é desenhada — nem a neta dela, que não tem como aparecer
  // sob uma mãe que sumiu. As linhas vêm em pré-ordem, então marcar o ramo inteiro é uma passada.
  // O filtro acontece aqui, e não no domínio, porque colapsar é estado de tela — não muda o que a
  // busca encontrou nem o que a massa vai afetar.
  const hidden = new Set<string>()
  for (const row of rows) {
    const parent = row.depth > 0 ? row.category.parent_id : null
    if (parent && (collapsed.has(parent) || hidden.has(parent))) hidden.add(row.category.id)
  }
  const visible = rows.filter(row => !hidden.has(row.category.id))

  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.category.id))

  return (
    <div className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/50 px-3.5 py-2.5">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-primary"
          aria-label="Selecionar todas as categorias"
          checked={allSelected}
          onChange={onToggleAll}
        />
        <span className="w-3.5 shrink-0" />
        <span className="w-8 shrink-0" />
        <span className="flex-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</span>
        <span className="w-20 shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Produtos</span>
        <span className="w-24 shrink-0 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Na vitrine</span>
        <span className="w-6 shrink-0" />
      </div>

      {visible.map(row => {
        const { category, depth, totalCount, childCount, isLastChild } = row
        const isCollapsed = collapsed.has(category.id)

        return (
          <div
            key={category.id}
            data-testid={`categoria-${category.id}`}
            draggable={reordering}
            onDragStart={reordering ? e => e.dataTransfer.setData('text/plain', category.id) : undefined}
            onDragOver={reordering ? e => e.preventDefault() : undefined}
            onDrop={reordering
              ? e => {
                  e.preventDefault()
                  onDrop?.(e.dataTransfer.getData('text/plain'), category.id)
                }
              : undefined}
            className={cn(
              'flex items-center gap-2.5 border-b border-border/60 px-3.5 py-2.5 last:border-0',
              activeId === category.id ? 'bg-primary/5' : 'hover:bg-muted/30',
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-primary"
              aria-label={`Selecionar ${category.name}`}
              checked={selected.has(category.id)}
              onChange={() => onToggleSelect(category.id)}
            />

            {/* Recuo do nível. O conector abaixo distingue raiz de filha; da neta em diante é este
                espaço que diz de quem ela é filha. */}
            {depth > 1 && (
              <span className="shrink-0" style={{ width: (depth - 1) * 20 }} aria-hidden="true" />
            )}

            {/* Faixa fixa: alça no modo Reordenar, caret nas raízes com filha, vazio no resto.
                Largura fixa mesmo vazia — é o que mantém a coluna alinhada entre as linhas. */}
            <span className="flex w-3.5 shrink-0 justify-center">
              {reordering ? (
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              ) : childCount > 0 ? (
                <button
                  type="button"
                  aria-label={isCollapsed ? `Expandir ${category.name}` : `Colapsar ${category.name}`}
                  onClick={() => onToggleCollapse(category.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ) : null}
            </span>

            {/* O slot da capa vira conector na filha: é o que faz a árvore ser lida como árvore. */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              {depth > 0 ? (
                <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    d={isLastChild ? 'M8 0v16h13' : 'M8 0v32M8 16h13'}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-border"
                  />
                </svg>
              ) : category.banner_url || category.image_url ? (
                <img
                  src={category.banner_url ?? category.image_url ?? ''}
                  alt=""
                  className="h-8 w-8 rounded-[10px] object-cover"
                />
              ) : (
                <span
                  className="h-8 w-8 rounded-[10px] bg-primary/20"
                  style={category.color_accent ? { backgroundColor: category.color_accent } : undefined}
                />
              )}
            </span>

            <button
              type="button"
              onClick={() => onOpen(category.id)}
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
            >
              <span className="flex items-center gap-1.5">
                {depth > 0 && <span className="h-6 w-6 shrink-0 rounded-lg bg-primary/15" aria-hidden="true" />}
                <span className="truncate text-[13px] font-semibold text-foreground">{category.name}</span>
                {childCount > 0 && (
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-1.5 py-px text-[10px] font-bold text-primary">
                    {childCount} subcategoria{childCount === 1 ? '' : 's'}
                  </span>
                )}
              </span>
              <span className="truncate text-[10.5px] text-muted-foreground">/categoria/{category.slug}</span>
            </button>

            <span className="flex w-20 shrink-0 items-baseline gap-1.5">
              <span
                className={cn(
                  'text-[12.5px] font-semibold',
                  totalCount === 0 ? 'text-amber-600' : 'text-foreground',
                )}
              >
                {totalCount}
              </span>
              {childCount > 0 && <span className="text-[10px] text-muted-foreground">+ filhas</span>}
            </span>

            <span className="flex w-24 shrink-0 items-center gap-2">
              <Switch
                checked={category.active === true}
                onCheckedChange={value => onToggleActive(category.id, value)}
                aria-label={`Mostrar ${category.name} na vitrine`}
              />
              <span className="text-[11.5px] font-medium text-muted-foreground">
                {category.active ? 'Visível' : 'Oculta'}
              </span>
            </span>

            <span className="flex w-6 shrink-0 justify-center">
              <MoreVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default CategoryTable
