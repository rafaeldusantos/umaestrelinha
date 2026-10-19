import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react'
import { writeFilterParams } from '@estrelinha/core/filters'
import { useAllProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { useFilterCatalog } from '@/entities/filter'
import ProductCard from '@/entities/product/ui/ProductCard'
import { MIN_QUERY_LENGTH, pushRecentSearch, searchProducts, trackSearch } from '@/features/search'
import {
  CategoryFiltersPanel,
  CategoryFiltersSheet,
  SORT_LABELS,
  SORT_OPTIONS,
  activeFilterChips,
  clearFilterChip,
  clearFilters,
  filterBlocks,
  filterMatches,
  hasActiveFilters,
  priceBounds,
  sortMatches,
  useFilterUrlState,
  type SortOption,
} from '@/features/category-filters'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@estrelinha/ui/select'
import { useTrackList, type AnalyticsList } from '@/shared/lib/analytics/useTrackList'
import { searchPageMeta } from '@estrelinha/core/seo'
import { usePageMeta } from '@/shared/lib/usePageMeta'

/**
 * A lista completa de resultados — o destino do "Ver todos" da busca em tela cheia e do dropdown do
 * desktop.
 *
 * **O termo vem da URL.** Antes a página guardava a busca só em `useState`, então `/busca?q=naruto`
 * abria com o campo vazio e zero resultados: todo "Ver todos os resultados" caía num beco sem saída,
 * e link de busca compartilhado por WhatsApp — que é como se manda produto para uma amiga — não
 * mostrava nada.
 *
 * **Feature 66 — os mesmos filtros da categoria** (`FLT-39..41`): sidebar a partir de `md`, bottom
 * sheet no celular, o estado na URL ao lado do `q`. A BASE é o resultado da busca — é ele que decide
 * quais valores existem e a faixa de preço —, e o "esconder por categoria" não se aplica: a busca
 * atravessa categorias, e esconder é decisão sobre uma categoria.
 */
/** Feature 61 · EVT-02. */
const LISTA_DA_BUSCA: AnalyticsList = { id: 'busca', name: 'Resultados da busca' }

const SearchPage = () => {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  // Feature 62: o termo vai no título da aba. Trocar de termo não é página nova — nenhum
  // `page_view` a mais sai, porque o `PageViewTracker` olha só o `pathname`.
  usePageMeta(searchPageMeta(urlQuery))
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

  // A base dos filtros é o resultado da busca, na ordem de relevância que a busca devolveu.
  const base = useMemo(() => results.map(r => r.product), [results])
  const bounds = useMemo(() => priceBounds(base), [base])
  // O catálogo inteiro: na busca nenhum grupo é escondido (`FLT-41`).
  const catalog = useFilterCatalog()
  const [filters, setFilters] = useFilterUrlState(catalog, bounds)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Feature 67: pares peça × variação, pela mesma regra da categoria (VFL-17).
  const visible = useMemo(
    () => sortMatches(filterMatches(base, filters, catalog), filters.sort),
    [base, filters, catalog],
  )
  const pecasVisiveis = useMemo(() => visible.map(m => m.product), [visible])
  const blocks = useMemo(() => filterBlocks(base, filters, catalog), [base, filters, catalog])
  const chips = activeFilterChips(filters, catalog)
  const filtrando = searching && base.length > 0

  /*
   * Feature 61 · EVT-02 — a lista de resultados é UMA listagem por termo. O termo não entra no id
   * (seria dado da cliente no relatório de listas); ele já vai no `search` (`EVT-09`). Trocar de
   * termo zera a memória pela chave dos ids — os resultados novos são outro conjunto.
   */
  const listaDaBusca = searching ? LISTA_DA_BUSCA : null
  // O que está NA TELA (`EVT-02`): com filtro, a lista filtrada.
  useTrackList(listaDaBusca, pecasVisiveis)

  const commit = (value: string) => {
    setQuery(value)
    /*
     * Termo novo é base nova: os filtros voltam ao padrão (a ordem fica, porque não é filtro) e o que
     * não é filtro — `utm_*`, `gclid` — continua na URL. Manter a faixa de preço do termo anterior
     * filtraria o resultado novo sem nenhum chip na tela dizendo isso.
     *
     * `replace` para não empilhar uma entrada de histórico por tecla digitada — o botão "voltar"
     * tem de sair da busca, não desfazer letra por letra.
     */
    const next = writeFilterParams(params, clearFilters(filters, bounds), catalog, bounds)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const sortSelect = (
    <Select value={filters.sort} onValueChange={v => setFilters({ ...filters, sort: v as SortOption })}>
      <SelectTrigger
        aria-label="Ordenar por"
        className={`${TAP_ROW} h-9 w-auto gap-1.5 rounded-[10px] border-0 bg-estrelinha-ground-deep px-3.5 text-[13px] font-medium text-estrelinha-ink focus:ring-0`}
      >
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-estrelinha-ink-soft" strokeWidth={2} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map(key => (
          <SelectItem key={key} value={key}>
            {SORT_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-3xl">
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
          // Feature 61 · EVT-09: o Enter é o envio desta página; digitar não é.
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length >= MIN_QUERY_LENGTH) trackSearch(query)
          }}
          placeholder="Buscar joias, coleções..."
          aria-label="Buscar joias"
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
          {visible.length} resultado{visible.length !== 1 ? 's' : ''} para "{query.trim()}"
        </p>
      )}
      </div>

      {/* Barra de filtros — só celular. No computador tudo isto vive na sidebar. */}
      {filtrando && (
        <div className="flex items-center justify-between gap-2 pb-4 md:hidden">
          {sortSelect}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`${TAP_ROW} gap-1.5 rounded-[10px] bg-estrelinha-primary px-3.5 py-2 text-[13px] font-semibold text-white`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            Filtros
            {chips.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-pill bg-white px-1 text-[10px] font-bold text-estrelinha-primary">
                {chips.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {filtrando && (
          <aside className="hidden w-[260px] shrink-0 md:block" aria-label="Filtros da busca">
            <div className="flex items-center justify-between pb-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-estrelinha-ink" strokeWidth={2} />
                <h2 className="font-body text-[16px] font-bold leading-5 text-estrelinha-ink">Filtros</h2>
              </div>
              {hasActiveFilters(filters, bounds) && (
                <button
                  type="button"
                  onClick={() => setFilters(clearFilters(filters, bounds))}
                  className="text-[12px] font-semibold text-estrelinha-primary"
                >
                  Limpar
                </button>
              )}
            </div>
            <CategoryFiltersPanel
              surface="sidebar"
              filters={filters}
              onChange={setFilters}
              bounds={bounds}
              blocks={blocks}
            />
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {filtrando && (
            <div className="hidden items-center justify-between gap-4 pb-6 md:flex">
              <div className="flex flex-wrap items-center gap-2">
                {chips.map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilters(clearFilterChip(filters, chip.key))}
                    className="flex items-center gap-1.5 rounded-pill bg-estrelinha-ground-deep px-3 py-1.5 text-[12px] font-medium text-estrelinha-primary transition-colors hover:bg-estrelinha-line"
                  >
                    {chip.label}
                    <span aria-hidden>✕</span>
                    <span className="sr-only">Remover filtro</span>
                  </button>
                ))}
              </div>
              {sortSelect}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {visible.map((m, i) => (
              <ProductCard
                key={m.product.id}
                product={m.product}
                matchedVariant={m.variant}
                list={{ ...LISTA_DA_BUSCA, index: i }}
              />
            ))}
          </div>

          {filtrando && visible.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-[18px] font-medium text-estrelinha-ink">
                Nenhuma joia com esses filtros.
              </p>
              <p className="text-[14px] text-estrelinha-ink-soft">
                Tente afrouxar a faixa de preço ou tirar um filtro.
              </p>
              <button
                type="button"
                onClick={() => setFilters(clearFilters(filters, bounds))}
                className="mt-1 rounded-sm bg-estrelinha-primary px-5 py-2.5 text-[14px] font-semibold text-white"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {searching && results.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-medium text-estrelinha-ink">Nada encontrado.</p>
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

      {filtrando && (
        <CategoryFiltersSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          filters={filters}
          onChange={setFilters}
          bounds={bounds}
          blocks={blocks}
          resultCount={visible.length}
        />
      )}
    </div>
  )
}

export default SearchPage
