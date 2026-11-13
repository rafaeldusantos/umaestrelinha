import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, LayoutGrid, Rows2, SlidersHorizontal } from 'lucide-react'
import { campaignShowcaseLine } from '@estrelinha/core/campaigns'
import { CAMPAIGN_PERCENT_PARAM } from '@estrelinha/core/home'
import { OFFERS_PATH } from '@estrelinha/core/routes'
import { offersPageMeta } from '@estrelinha/core/seo'
import { useLiveCampaign } from '@/entities/campaign'
import { useFilterCatalog } from '@/entities/filter'
import { ProductCard, ProductCardSkeleton, useOfferProducts } from '@/entities/product'
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
import { useTrackList } from '@/shared/lib/analytics/useTrackList'
import { TAP_44, TAP_ROW } from '@/shared/lib/touchTarget'
import { useCanonical } from '@/shared/lib/useCanonical'
import { PRODUCTS_PER_PAGE, useInfiniteWindow } from '@/shared/lib/useInfiniteWindow'
import { usePageMeta } from '@/shared/lib/usePageMeta'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'

/**
 * A vitrine da campanha de desconto em vigência — `/ofertas`, o mesmo endereço para toda campanha.
 *
 * As peças são DERIVADAS das marcações da campanha (`useOfferProducts`), nunca uma linha em
 * `categories`: é a exceção declarada ao `AD-014`. O título é o nome da campanha, a linha diz os
 * percentuais e ATÉ QUANDO vale, por data — nada de contagem regressiva nem escassez. Os chips
 * "Todas · N" e "{p}% · n" recortam por percentual (`?percentual=<p>`), e por baixo deles valem os
 * filtros, a ordenação e a rolagem infinita da categoria — as mesmas peças de `features/category-filters`
 * e a mesma janela de `useInfiniteWindow`, chamadas daqui.
 *
 * Sem campanha em vigência a página diz que não há ofertas agora e leva às coleções; o `<head>`
 * (`offersPageMeta`) a tira do índice. Quem decide a vigência é o banco (a leitura pública de
 * `campaigns`), nunca o relógio do aparelho.
 */

/** O percentual do endereço — só vale um que a campanha oferece; o resto é "Todas". */
const percentualDaUrl = (valor: string | null, oferecidos: readonly number[]): number | null => {
  if (valor === null || !/^\d+$/.test(valor)) return null
  const p = Number(valor)
  return oferecidos.includes(p) ? p : null
}

/**
 * A grade tem UM dono nesta página, porque duas superfícies a desenham: os cards e o esqueleto. É a
 * mesma régua da categoria — duas colunas no celular, três no `md` e quatro no `lg`, onde a sidebar
 * de filtros já tirou os seus 292 px.
 */
const gridClass = (dense: boolean) =>
  `grid gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 ${dense ? 'grid-cols-2' : 'grid-cols-1'}`

/** A trilha "Início › {nome}" — com campanha, o nome dela; sem campanha, "Ofertas". */
const Trilha = ({ atual }: { atual: string }) => (
  <nav aria-label="Trilha" className="flex items-center gap-1.5 text-[12px] leading-3">
    <Link to="/" className={`${TAP_ROW} text-estrelinha-ink-soft hover:text-estrelinha-ink`}>
      Início
    </Link>
    <span aria-hidden className="text-estrelinha-ink-soft">
      ›
    </span>
    <span className="font-medium text-estrelinha-ink">{atual}</span>
  </nav>
)

/** O título da vitrine: 28 px no celular, 44 px a partir de 1024. */
const TITULO =
  'font-display text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-estrelinha-ink lg:text-[44px] lg:leading-[52px]'

const OffersPage = () => {
  const { data: campanha, isLoading: carregandoCampanha, isError: falhouCampanha } = useLiveCampaign()
  const {
    data: todas,
    isLoading: carregandoPecas,
    isError: falhouPecas,
  } = useOfferProducts(campanha?.id ?? null)

  usePageMeta(carregandoCampanha || falhouCampanha ? null : offersPageMeta(campanha ?? null))
  useCanonical(campanha ? OFFERS_PATH : null)

  const percents = useMemo(() => campanha?.percents ?? [], [campanha])
  const pecas = useMemo(() => todas ?? [], [todas])

  const [params, setParams] = useSearchParams()
  const percentual = percentualDaUrl(params.get(CAMPAIGN_PERCENT_PARAM), percents)

  /** A contagem de cada chip: as peças da campanha com aquele percentual, antes dos filtros. */
  const contagem = useMemo(() => {
    const porPercentual = new Map<number, number>()
    for (const p of pecas) {
      const pct = p.campaign?.percent
      if (typeof pct === 'number') porPercentual.set(pct, (porPercentual.get(pct) ?? 0) + 1)
    }
    return porPercentual
  }, [pecas])

  const products = useMemo(
    () => (percentual === null ? pecas : pecas.filter(p => p.campaign?.percent === percentual)),
    [pecas, percentual],
  )

  const escolherPercentual = (p: number | null) => {
    const proximo = new URLSearchParams(params)
    if (p === null) proximo.delete(CAMPAIGN_PERCENT_PARAM)
    else proximo.set(CAMPAIGN_PERCENT_PARAM, String(p))
    // `replace`: tocar num chip não é uma página nova — o "voltar" sai da vitrine (como os filtros).
    setParams(proximo, { replace: true })
  }

  const bounds = useMemo(() => priceBounds(products), [products])
  const catalog = useFilterCatalog()
  const [filters, setFilters] = useFilterUrlState(catalog, bounds)
  const sort = filters.sort
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dense, setDense] = useState(true)

  const visible = useMemo(
    () => sortMatches(filterMatches(products, filters, catalog), sort),
    [products, filters, catalog, sort],
  )
  const blocks = useMemo(() => filterBlocks(products, filters, catalog), [products, filters, catalog])
  const chips = activeFilterChips(filters, catalog)

  const listKey = `${campanha?.id ?? ''}|${percentual ?? ''}|${sort}|${JSON.stringify(filters)}`
  const { visibleCount, hasMore, loadMore, sentinelRef } = useInfiniteWindow(visible.length, listKey)

  const lista = campanha ? { id: `ofertas-${campanha.id}`, name: campanha.name } : null
  const naTela = useMemo(() => visible.slice(0, visibleCount), [visible, visibleCount])
  const pecasNaTela = useMemo(() => naTela.map(m => m.product), [naTela])
  useTrackList(lista, pecasNaTela)

  if (carregandoCampanha) return <div className="container py-20" aria-busy="true" />

  if (falhouCampanha) {
    return (
      <div className="container flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="font-display text-[24px] font-semibold text-estrelinha-ink">
          Não foi possível carregar as ofertas.
        </h1>
        <p className="text-[14px] text-estrelinha-ink-soft">A falha foi da loja, não sua.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 rounded-sm bg-estrelinha-primary px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  if (!campanha) {
    return (
      <div className="container flex flex-col gap-6 pb-16 pt-4">
        <Trilha atual="Ofertas" />
        <div className="flex flex-col items-center gap-3 rounded-sm bg-estrelinha-ground-deep px-5 py-12 text-center">
          <h1 className={TITULO}>Não há ofertas agora</h1>
          <p className="max-w-[420px] text-[14px] leading-[22px] text-estrelinha-ink-soft">
            Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções
            da loja continuam abertas.
          </p>
          <Link
            to="/"
            className="mt-2 rounded-sm bg-estrelinha-primary px-5 py-3 text-[14px] font-semibold text-white"
          >
            Ver as coleções
          </Link>
        </div>
      </div>
    )
  }

  const sortSelect = (
    <Select value={sort} onValueChange={v => setFilters({ ...filters, sort: v as SortOption })}>
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

  /*
   * Os chips de percentual. Rolam de lado DENTRO do próprio contêiner no celular (nunca o body), e
   * cada um tem 44 px de altura pintada — o alvo de toque é o próprio chip.
   */
  const chip = (rotulo: string, n: number, valor: number | null) => {
    const ativo = percentual === valor
    return (
      <button
        key={rotulo}
        type="button"
        aria-pressed={ativo}
        onClick={() => escolherPercentual(valor)}
        className={`flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill px-4 text-[14px] font-semibold motion-safe:transition-colors ${
          ativo
            ? 'bg-estrelinha-ink text-white'
            : 'bg-estrelinha-ground-deep text-estrelinha-ink hover:bg-estrelinha-line'
        }`}
      >
        {rotulo} · {n}
      </button>
    )
  }

  return (
    <div className="flex flex-col">
      <header className="border-b border-estrelinha-line bg-estrelinha-ground-deep">
        <div className="container flex flex-col gap-2 pb-5 pt-4 md:pb-7">
          <Trilha atual={campanha.name} />
          <h1 className={TITULO}>{campanha.name}</h1>
          <p className="max-w-[560px] text-[14px] leading-[22px] text-estrelinha-ink-soft">
            {campaignShowcaseLine(campanha.percents, campanha.ends_at)}
          </p>
        </div>
      </header>

      {/* A partir de 768 px, os chips e a ordenação numa linha só; no celular a ordenação desce para
          a barra de filtros. */}
      <div data-testid="linha-dos-chips" className="container flex items-center gap-4 pt-4">
        <div
          role="group"
          aria-label="Filtrar por desconto"
          className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {chip('Todas', pecas.length, null)}
          {percents.map(p => chip(`${p}%`, contagem.get(p) ?? 0, p))}
        </div>
        <div className="hidden shrink-0 md:block">{sortSelect}</div>
      </div>

      {/* Barra de filtros — só mobile. No desktop tudo isto vive na sidebar, como na categoria. */}
      <div className="container flex items-center justify-between gap-2 py-3 md:hidden">
        {sortSelect}
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Ver em duas colunas"
            aria-pressed={dense}
            onClick={() => setDense(true)}
            className={`${TAP_44} flex h-9 w-9 items-center justify-center rounded-[10px] ${
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
            className={`${TAP_44} flex h-9 w-9 items-center justify-center rounded-[10px] ${
              dense ? 'bg-estrelinha-ground-deep text-estrelinha-ink-soft' : 'bg-estrelinha-ink text-white'
            }`}
          >
            <Rows2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
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

      <div className="container flex gap-8 pb-16 md:pt-6">
        <aside className="hidden w-[260px] shrink-0 md:block">
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

        <div className="flex min-w-0 flex-1 flex-col">
          {chips.length > 0 && (
            <div className="hidden flex-wrap items-center gap-2 pb-6 md:flex">
              {chips.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilters(clearFilterChip(filters, c.key))}
                  className="flex items-center gap-1.5 rounded-sm bg-estrelinha-ground-deep px-3 py-1.5 text-[12px] font-medium text-estrelinha-primary hover:bg-estrelinha-line"
                >
                  {c.label}
                  <span aria-hidden>✕</span>
                  <span className="sr-only">Remover filtro</span>
                </button>
              ))}
            </div>
          )}

          {carregandoPecas ? (
            <div className={gridClass(dense)} aria-busy="true" aria-label="Carregando as peças em oferta">
              {Array.from({ length: PRODUCTS_PER_PAGE }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <>
              <div className={gridClass(dense)}>
                {naTela.map((m, i) => (
                  <ProductCard
                    key={m.product.id}
                    product={m.product}
                    matchedVariant={m.variant}
                    index={i}
                    list={lista ? { ...lista, index: i } : undefined}
                  />
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center pt-10">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-sm border border-estrelinha-field px-6 py-3 text-[14px] font-semibold text-estrelinha-primary hover:bg-estrelinha-ground-deep"
                  >
                    Carregar mais joias
                  </button>
                </div>
              )}
              <p aria-live="polite" className="sr-only">
                Mostrando {visibleCount} de {visible.length} peças
              </p>
            </>
          ) : falhouPecas ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-[18px] font-medium text-estrelinha-ink">
                Não foi possível carregar as peças em oferta.
              </p>
              <p className="text-[14px] text-estrelinha-ink-soft">A falha foi da loja, não sua.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-1 rounded-sm bg-estrelinha-primary px-5 py-2.5 text-[14px] font-semibold text-white"
              >
                Tentar de novo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-[18px] font-medium text-estrelinha-ink">
                Nenhuma joia com esses filtros.
              </p>
              <p className="text-[14px] text-estrelinha-ink-soft">
                Tente afrouxar a faixa de preço, tirar um filtro ou escolher outro desconto.
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

      <CategoryFiltersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onChange={setFilters}
        bounds={bounds}
        blocks={blocks}
        resultCount={visible.length}
      />
    </div>
  )
}

export default OffersPage
