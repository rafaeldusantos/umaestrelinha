import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@nanapin/ui/lib/utils'
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
              data.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'border-b border-border last:border-0',
                    zebra && (i % 2 === 0 ? 'bg-card' : 'bg-muted/30'),
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('p-4', alignClass(col.align), col.className)}>
                      {col.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))
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
