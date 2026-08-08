import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { cn } from '@nanapin/ui/lib/utils'
import { getPageItems } from './paginationItems'

interface Props {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const Pagination = ({ page, totalPages, onPageChange, className }: Props) => {
  if (totalPages <= 1) return null
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {getPageItems(page, totalPages).map((item, i) =>
        item === 'ellipsis' ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <Button
            key={item}
            variant={item === page ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        aria-label="Próxima página"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default Pagination
