import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpDown, LayoutGrid, Rows2, SlidersHorizontal } from 'lucide-react'
import { useProducts } from '@/entities/product/api/useProducts'
import { useCategoryBySlug } from '@/entities/category/api/useCategories'
import ProductCard from '@/entities/product/ui/ProductCard'
import {
  CategoryFiltersPanel,
  CategoryFiltersSheet,
  SORT_LABELS,
  activeFilterChips,
  clearFilterChip,
  collectTags,
  defaultFilters,
  filterProducts,
  hasActiveFilters,
  priceBounds,
  sortProducts,
  toggleTag,
  type CategoryFilters,
  type SortOption,
} from '@/features/category-filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@estrelinha/ui/select'

/**
 * Listagem de uma coleção — boards "Desktop Category Page - v3" e "Mobile Category Page - v3".
 *
 * As duas telas são o mesmo estado com duas embalagens: no desktop os filtros são uma sidebar
 * permanente de 260px; no mobile viram um bottom sheet e uma faixa rolável de universos. O grid é
 * o mesmo `ProductCard` da home — é lá, e não aqui, que mora o quick add de variações.
 */
const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const { data: category } = useCategoryBySlug(slug || '')
  const { data: allProducts } = useProducts(slug)

  const products = useMemo(() => allProducts ?? [], [allProducts])
  const bounds = useMemo(() => priceBounds(products), [products])
  const tags = useMemo(() => collectTags(products), [products])

  const [sort, setSort] = useState<SortOption>('relevancia')
  const [filters, setFilters] = useState<CategoryFilters>(() => defaultFilters(bounds))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dense, setDense] = useState(true)
  // A coleção mudou de rota: o preço filtrado ainda é o da coleção anterior. Reancorar pela
  // identidade da faixa (e não por `slug`) também cobre a primeira carga, quando `products` chega
  // depois da montagem e os limites saem do palpite [0, 20].
  const [anchor, setAnchor] = useState(bounds)
  if (anchor[0] !== bounds[0] || anchor[1] !== bounds[1]) {
    setAnchor(bounds)
    setFilters(defaultFilters(bounds))
  }

  const visible = useMemo(
    () => sortProducts(filterProducts(products, filters), sort),
    [products, filters, sort],
  )
  const chips = activeFilterChips(filters)

  if (!category) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-estrelinha-ink">Coleção não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-estrelinha-primary hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const countLabel = `${visible.length} ${visible.length === 1 ? 'produto' : 'produtos'}`

  const sortSelect = (
    <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
      <SelectTrigger
        aria-label="Ordenar por"
        className="h-9 w-auto gap-1.5 rounded-[10px] border-0 bg-estrelinha-ground-deep px-3.5 text-[13px] font-medium text-estrelinha-ink focus:ring-0"
      >
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-estrelinha-ink-soft" strokeWidth={2} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
          <SelectItem key={key} value={key}>
            {SORT_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-col">
      {/* Faixa da coleção — sangra a largura toda, o conteúdo respeita o container.

          **Ela era `accent` chapado, e isso era um defeito de leitura E de
          contraste** (`IDN-04`). O remap mecânico trouxe o rosa Carimbo para
          ouro e deixou aqui a segunda maior superfície chapada da loja; pior,
          todo o texto de apoio estava em `ink` com opacidade — e `ink` sobre
          `accent` já mede 4,78:1 CHEIO. A 78% cai para ~3,6:1 e a 45% para
          ~2,1:1: a trilha e a contagem reprovavam a AA sem nada acusar.

          `ground-deep` é o palco de seção da paleta, o texto volta a ser `ink`
          chapado (12,73:1) e o ouro fica onde ele funciona: nos dois discos de
          ornamento, que são objeto gráfico. */}
      <header className="relative overflow-hidden border-b border-estrelinha-line bg-estrelinha-ground-deep">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 top-5 h-20 w-20 rounded-full bg-estrelinha-accent/15 md:h-[120px] md:w-[120px]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-[70px] top-[50px] h-5 w-5 rounded-full bg-estrelinha-accent/10 md:h-[60px] md:w-[60px]"
        />
        <div className="container flex min-h-[130px] flex-col justify-end gap-2 pb-5 pt-4 md:min-h-40 md:pb-7">
          <nav className="flex items-center gap-1.5 text-[12px] leading-3">
            <Link to="/" className="text-estrelinha-ink-soft transition-colors hover:text-estrelinha-ink">
              Início
            </Link>
            <span className="text-estrelinha-ink-soft">/</span>
            <span className="font-medium text-estrelinha-ink">{category.name}</span>
          </nav>

          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <h1 className="font-display text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-estrelinha-ink md:text-[48px] md:leading-[56px]">
              {category.name}
            </h1>
            <p className="text-[13px] leading-[18px] text-estrelinha-ink-soft">
              {countLabel} {visible.length === products.length ? 'encontrados' : `de ${products.length}`}
            </p>
          </div>

          {category.description && (
            <p className="hidden max-w-[480px] text-[14px] leading-[22px] text-estrelinha-ink-soft md:block">
              {category.description}
            </p>
          )}
        </div>
      </header>

      {/* Barra de filtros — só mobile. No desktop tudo isto vive na sidebar. */}
      <div className="container flex flex-col gap-3 py-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          {sortSelect}

          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Ver em duas colunas"
              aria-pressed={dense}
              onClick={() => setDense(true)}
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
                dense ? 'bg-estrelinha-ink text-white' : 'bg-estrelinha-ground-deep text-estrelinha-ink-soft'
              }`}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Ver em uma coluna"
              aria-pressed={!dense}
              onClick={() => setDense(false)}
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
                dense ? 'bg-estrelinha-ground-deep text-estrelinha-ink-soft' : 'bg-estrelinha-ink text-white'
              }`}
            >
              <Rows2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-[10px] bg-estrelinha-primary px-3.5 py-2 text-[13px] font-semibold text-white"
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

        {tags.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, tags: [] })}
              className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] leading-3 transition-colors ${
                filters.tags.length === 0
                  ? 'bg-estrelinha-primary font-semibold text-white'
                  : 'bg-estrelinha-ground-deep font-medium text-estrelinha-ink-soft'
              }`}
            >
              Todos
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilters(toggleTag(filters, tag))}
                className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] leading-3 transition-colors ${
                  filters.tags.includes(tag)
                    ? 'bg-estrelinha-primary font-semibold text-white'
                    : 'bg-estrelinha-ground-deep font-medium text-estrelinha-ink-soft'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="container flex gap-8 pb-16 md:pt-8">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <div className="flex items-center justify-between pb-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-estrelinha-ink" strokeWidth={2} />
              <h2 className="font-body text-[16px] font-bold leading-5 text-estrelinha-ink">Filtros</h2>
            </div>
            {hasActiveFilters(filters, bounds) && (
              <button
                type="button"
                onClick={() => setFilters(defaultFilters(bounds))}
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
            tags={tags}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
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

          {visible.length > 0 ? (
            <div
              className={`grid gap-4 md:grid-cols-3 md:gap-5 ${dense ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              {visible.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-[18px] font-medium text-estrelinha-ink">
                Nenhum botton com esses filtros.
              </p>
              <p className="text-[14px] text-estrelinha-ink-soft">
                Tente afrouxar a faixa de preço ou tirar um universo.
              </p>
              <button
                type="button"
                onClick={() => setFilters(defaultFilters(bounds))}
                className="mt-1 rounded-pill bg-estrelinha-primary px-5 py-2.5 text-[14px] font-semibold text-white"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      <CategoryFiltersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onChange={setFilters}
        bounds={bounds}
        tags={tags}
        resultCount={visible.length}
      />
    </div>
  )
}

export default CategoryPage
