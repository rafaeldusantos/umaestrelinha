import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@estrelinha/ui/context-menu'
import EmptyState from './EmptyState'

export interface AdminColumn<T> {
  key: string
  header: React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  cell: (row: T, index: number) => React.ReactNode
  className?: string
}

interface Props<T> {
  columns: AdminColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  empty?: { icon?: LucideIcon; message: string; hint?: string }
  footer?: React.ReactNode
  zebra?: boolean
  /**
   * Itens do menu do botão direito da linha (toque longo no celular). Sem ele, a linha é um `<tr>`
   * comum e o botão direito abre o menu do navegador, como sempre.
   */
  rowMenu?: (row: T) => React.ReactNode
  /** Dica nativa ao passar o mouse sobre a linha (ex.: o nome inteiro que a célula corta). */
  rowTitle?: (row: T) => string
}

const alignClass = (align?: 'left' | 'center' | 'right') =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

function AdminTable<T>({
  columns,
  data,
  rowKey,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  empty,
  footer,
  zebra = true,
  rowMenu,
  rowTitle,
}: Props<T>) {
  if (data.length === 0 && empty) {
    return <EmptyState icon={empty.icon} message={empty.message} hint={empty.hint} />
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'p-4 text-xs font-semibold uppercase text-muted-foreground',
                    alignClass(col.align),
                    col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                  )}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  <span
                    className={cn(
                      'inline-flex items-center',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center',
                    )}
                  >
                    {col.header}
                    {col.sortable && <SortIcon col={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                  {empty?.message ?? 'Nenhum registro encontrado'}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const tr = (
                  <tr
                    key={rowKey(row)}
                    title={rowTitle?.(row)}
                    className={cn(
                      'border-b border-border last:border-0',
                      zebra && (i % 2 === 0 ? 'bg-card' : 'bg-muted/30'),
                      rowMenu && 'data-[state=open]:bg-muted',
                    )}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={cn('p-4', alignClass(col.align), col.className)}>
                        {col.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                )
                if (!rowMenu) return tr
                // O `Root` não desenha nó e o `Content` vai para um portal: dentro do `<tbody>` só
                // fica o `<tr>`, que recebe o gatilho por `asChild`.
                return (
                  <ContextMenu key={rowKey(row)}>
                    <ContextMenuTrigger asChild>{tr}</ContextMenuTrigger>
                    <ContextMenuContent className="w-56">{rowMenu(row)}</ContextMenuContent>
                  </ContextMenu>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
}

export default AdminTable
