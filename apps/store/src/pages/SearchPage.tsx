import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, X } from 'lucide-react'
import { useAllProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import ProductCard from '@/entities/product/ui/ProductCard'
import { MIN_QUERY_LENGTH, pushRecentSearch, searchProducts } from '@/features/search'

/**
 * A lista completa de resultados — o destino do "Ver todos" da busca em tela cheia e do dropdown do
 * desktop.
 *
 * **O termo vem da URL.** Antes a página guardava a busca só em `useState`, então `/busca?q=naruto`
 * abria com o campo vazio e zero resultados: todo "Ver todos os resultados" caía num beco sem saída,
 * e link de busca compartilhado por WhatsApp — que é como se manda produto para uma amiga — não
 * mostrava nada.
 */
const SearchPage = () => {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)

  const { data: products } = useAllProducts()
  const { data: categories } = useCategories()

  // Navegação externa (voltar do navegador, novo "Ver todos") manda na página; digitar manda na URL.
  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (urlQuery.trim().length >= MIN_QUERY_LENGTH) pushRecentSearch(urlQuery.trim())
  }, [urlQuery])

  const results = useMemo(
    () => searchProducts(products, query, { categories }),
    [products, query, categories],
  )

  const searching = query.trim().length >= MIN_QUERY_LENGTH

  const commit = (value: string) => {
    setQuery(value)
    // `replace` para não empilhar uma entrada de histórico por tecla digitada — o botão "voltar"
    // tem de sair da busca, não desfazer letra por letra.
    setParams(value.trim() ? { q: value.trim() } : {}, { replace: true })
  }

  return (
    <div className="container max-w-3xl py-6 md:py-8">
      <h1 className="mb-4 font-heading text-2xl font-semibold text-estrelinha-ink md:mb-6 md:text-3xl">
        Busca
      </h1>

      <div className="relative mb-6 md:mb-8">
        <SearchIcon
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-estrelinha-primary"
          strokeWidth={2.2}
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => commit(e.target.value)}
          placeholder="Buscar bottons, coleções..."
          aria-label="Buscar bottons"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          /* Papelão, não Dobra — borda de campo precisa dos 3:1 da WCAG 1.4.11.
             O campo é branco: sobre o chão Papel, o branco é que vira superfície. */
          className="h-12 w-full rounded-pill border-2 border-estrelinha-field bg-white pl-12 pr-12 text-base font-medium text-estrelinha-ink outline-none transition-colors placeholder:font-normal placeholder:text-estrelinha-ink-soft focus:border-estrelinha-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => commit('')}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-estrelinha-line">
              <X className="h-3.5 w-3.5 text-estrelinha-primary" strokeWidth={3} aria-hidden />
            </span>
          </button>
        )}
      </div>

      {searching && (
        <p className="mb-4 text-sm text-estrelinha-ink-soft" aria-live="polite">
          {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query.trim()}"
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {results.map(({ product }) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {searching && results.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-medium text-estrelinha-ink">Nenhum botton encontrado 😢</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-estrelinha-ink-soft">
            Tenta o nome do anime, do grupo ou do personagem.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-semibold text-estrelinha-primary hover:underline"
          >
            Explorar coleções
          </Link>
        </div>
      )}
    </div>
  )
}

export default SearchPage
