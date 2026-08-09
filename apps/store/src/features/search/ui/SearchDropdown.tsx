import { useState, useEffect, useRef, useMemo } from 'react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useAllProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { formatPrice } from '@estrelinha/core/formatters'
import { productPath } from '@estrelinha/core/routes'
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
      {/* A faixa de busca do board `5MN-0`: pílula branca de 48px, texto à
          esquerda e o disco de 38px em `accent` à direita.

          **Sem `border`, e isso não fura a WCAG 1.4.11.** O contorno do
          controle é o próprio recorte da pílula branca contra a faixa
          `primary-strong` do header — 12,4:1, muito acima dos 3:1 que a regra
          pede. Uma borda `field` aqui só desenharia uma segunda moldura dentro
          da primeira. */}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center gap-2.5 rounded-pill bg-estrelinha-surface pl-4 focus-within:ring-2 focus-within:ring-estrelinha-accent ${
          mobile ? 'h-11 pr-1.5' : 'h-12 pl-5 pr-1.5'
        }`}
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-estrelinha-ink-soft" strokeWidth={1.7} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="O que você está procurando?"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-light text-estrelinha-ink outline-none placeholder:text-estrelinha-ink-soft"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            aria-label="Limpar busca"
            className={`${TAP_44} flex h-9 w-9 shrink-0 items-center justify-center rounded-full`}
          >
            <X className="h-4 w-4 text-estrelinha-ink-soft hover:text-estrelinha-ink" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Buscar"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-estrelinha-accent transition-colors hover:bg-estrelinha-accent-strong"
        >
          <Search className="h-[18px] w-[18px] text-estrelinha-ink" strokeWidth={1.9} />
        </button>
      </form>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white border border-estrelinha-line rounded-xl shadow-lg overflow-hidden z-50"
          >
            {results.map((p) => (
              <Link
                key={p.id}
                to={productPath(p.slug)}
                onClick={() => { setOpen(false); onClose?.() }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-estrelinha-ground-deep transition-colors"
              >
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-estrelinha-ink truncate">{p.name}</p>
                  <p className="text-xs text-estrelinha-ink-soft">{formatPrice(p.price)}</p>
                </div>
              </Link>
            ))}
            <Link
              to={`/busca?q=${encodeURIComponent(query)}`}
              onClick={() => { setOpen(false); onClose?.() }}
              className="block text-center text-xs font-medium text-estrelinha-primary py-3 border-t border-estrelinha-line hover:bg-estrelinha-ground-deep transition-colors"
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
