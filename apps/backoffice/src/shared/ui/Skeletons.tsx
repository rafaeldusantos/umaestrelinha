import { Skeleton } from '@estrelinha/ui/skeleton'

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export const TableSkeleton = ({ rows = 6, cols = 5 }: TableSkeletonProps) => (
  <div className="bg-card rounded-2xl border border-border overflow-hidden">
    <div className="border-b border-border bg-muted/50 p-4 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} data-testid="skeleton-row" className="p-4 flex gap-4 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const CardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)

/**
 * Feature `88` (`CRG-06`) — a primeira carga do pedido. A grade é a MESMA de `AdminOrderPage`
 * (coluna principal + lateral de 330), para o conteúdo nascer no lugar do esqueleto em vez de
 * "Carregando..." no meio de uma página vazia. O brilho para com "menos movimento".
 */
const Bloco = ({ className }: { className: string }) => (
  <Skeleton className={`motion-reduce:animate-none ${className}`} />
)

export const OrderPageSkeleton = () => (
  <div data-testid="order-page-skeleton" aria-busy="true" aria-label="Carregando o pedido">
    <div className="mb-6 space-y-2">
      <Bloco className="h-4 w-40" />
      <Bloco className="h-8 w-64" />
      <Bloco className="h-4 w-72 max-w-full" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-4">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <Bloco className="h-5 w-1/3" />
          <Bloco className="h-10 w-full" />
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <Bloco className="h-5 w-1/4" />
          <Bloco className="h-16 w-full" />
          <Bloco className="h-16 w-full" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <Bloco className="h-5 w-1/2" />
          <Bloco className="h-4 w-3/4" />
          <Bloco className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  </div>
)
