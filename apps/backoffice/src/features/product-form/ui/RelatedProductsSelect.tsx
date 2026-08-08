import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Badge } from '@estrelinha/ui/badge'
import type { AdminProduct } from '@/entities/product/api/useAdminProducts'

interface Props {
  label: string
  selected: string[]
  onChange: (ids: string[]) => void
  products: AdminProduct[]
  excludeId?: string
}

const RelatedProductsSelect = ({ label, selected, onChange, products, excludeId }: Props) => {
  const [search, setSearch] = useState('')

  const available = useMemo(() => {
    return products
      .filter(p => p.id !== excludeId && !selected.includes(p.id))
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10)
  }, [products, selected, search, excludeId])

  const selectedProducts = useMemo(() => {
    return selected.map(id => products.find(p => p.id === id)).filter(Boolean) as AdminProduct[]
  }, [selected, products])

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map(p => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.name}
              <button type="button" onClick={() => onChange(selected.filter(id => id !== p.id))} className="ml-0.5 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="pl-8 h-9"
        />
      </div>
      {search && available.length > 0 && (
        <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
          {available.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { onChange([...selected, p.id]); setSearch('') }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RelatedProductsSelect
