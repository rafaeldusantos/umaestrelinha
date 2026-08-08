import { Skeleton } from '@nanapin/ui/skeleton'

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
