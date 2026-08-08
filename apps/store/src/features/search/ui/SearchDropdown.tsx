import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useAllProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { formatPrice } from '@estrelinha/core/formatters'
import { motion, AnimatePresence } from 'framer-motion'
import { pushRecentSearch } from '../model/recentSearches'
import { MIN_QUERY_LENGTH, searchProducts } from '../lib/searchProducts'

/**
 * A busca do desktop — faixa do header, sugestões em dropdown.
 *
 * No celular quem manda é o `SearchOverlay`; a prop `mobile` sobrevive só para o caso de alguém
 * montar este componente numa largura pequena. O casamento é o **mesmo** `searchProducts` do overlay
 * e da página: com dois filtros diferentes, o dropdown mostrava um produto que a página de
 * resultados não achava.
 */
interface Props {
  onClose?: () => void
  mobile?: boolean
}

const SearchDropdown = ({ onClose, mobile }: Props) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: products } = useAllProducts()
  const { data: categories } = useCategories()

  const results = useMemo(
    () => searchProducts(products, query, { categories, limit: 5 }).map((hit) => hit.product),
    [products, query, categories],
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        onClose?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (mobile) inputRef.current?.focus()
  }, [mobile])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = query.trim()
    if (clean.length < MIN_QUERY_LENGTH) return
    pushRecentSearch(clean)
    navigate(`/busca?q=${encodeURIComponent(clean)}`)
    setOpen(false)
    onClose?.()
  }

  return (
    <div ref={ref} className={`relative ${mobile ? 'w-full' : ''}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nanita-plum" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar bottons..."
          /* Borda de campo é Papelão (`nanita-rule`), não Dobra: a WCAG 1.4.11
             pede 3:1 de contorno de controle, e Dobra dá 1,19 sobre Papel. */
          className="w-full pl-9 pr-8 py-2 text-sm rounded-full bg-white border border-nanita-rule focus:border-nanita-jam focus:outline-none focus:ring-2 focus:ring-nanita-jam/20 text-nanita-ink placeholder:text-nanita-plum transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-nanita-plum hover:text-nanita-ink" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white border border-nanita-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {results.map((p) => (
              <Link
                key={p.id}
                to={`/produto/${p.slug}`}
                onClick={() => { setOpen(false); onClose?.() }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-nanita-sugar transition-colors"
              >
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nanita-ink truncate">{p.name}</p>
                  <p className="text-xs text-nanita-plum">{formatPrice(p.price)}</p>
                </div>
              </Link>
            ))}
            <Link
              to={`/busca?q=${encodeURIComponent(query)}`}
              onClick={() => { setOpen(false); onClose?.() }}
              className="block text-center text-xs font-medium text-nanita-jam py-3 border-t border-nanita-border hover:bg-nanita-sugar transition-colors"
            >
              Ver todos os resultados
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchDropdown
