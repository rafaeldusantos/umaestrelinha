import { useMemo, useState } from 'react'
import { TAP_44, TAP_ROW } from '@/shared/lib/touchTarget'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { ArrowUpDown, LayoutGrid, Rows2, SlidersHorizontal } from 'lucide-react'
import { legacyRedirectTo } from '@estrelinha/core/routes'
import { useProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { useCategoryRedirect } from '@/entities/category/api/useCategoryRedirect'
import { resolveCategoryRoute } from '@/entities/category/lib/resolveCategoryRoute'
import { useCanonical } from '@/shared/lib/useCanonical'
import { PRODUCTS_PER_PAGE, useInfiniteWindow } from '@/shared/lib/useInfiniteWindow'
import NotFound from '@/pages/NotFound'
import ProductCard from '@/entities/product/ui/ProductCard'
import ProductCardSkeleton from '@/entities/product/ui/ProductCardSkeleton'
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
import { Skeleton } from '@estrelinha/ui/skeleton'

/**
 * Listagem de uma coleção — boards "Desktop Category Page - v3" e "Mobile Category Page - v3".
 *
 * As duas telas são o mesmo estado com duas embalagens: no desktop os filtros são uma sidebar
 * permanente de 260px; no mobile viram um bottom sheet e uma faixa rolável de universos. O grid é
 * o mesmo `ProductCard` da home — é lá, e não aqui, que mora o quick add de variações.
 */
interface Props {
  /**
   * Rota legada (`/colecao/:slug`, `/categoria/:slug`): navega para o destino de
   * `LEGACY_REDIRECTS` em vez de renderizar.
   *
   * É o **espelho do edge** para `pnpm dev` e para o vitest, que não têm Vercel nenhuma na frente —
   * sem ele a rota legada só quebraria no dia do cutover.
   *
   * SPEC_DEVIATION: o `design.md` condiciona a navegação a "quando a resolução é `ok`".
   * Reason: o edge redireciona **sem conhecer a árvore** — `/colecao/qualquer-coisa` vira
   * `/qualquer-coisa` mesmo quando não é categoria. Condicionar aqui faria dev e produção
   * divergirem justamente no caso errado (a 404 apareceria sob a URL legada em dev e sob a nova em
   * produção) e obrigaria a esperar a consulta de categorias antes de um salto que não depende
   * dela. Quem decide 200 ou 404 é a página de destino.
   */
  legacy?: boolean
}

const CategoryPage = ({ legacy = false }: Props) => {
  const { slug, parentSlug } = useParams<{ slug: string; parentSlug: string }>()
  const { pathname } = useLocation()
  // A árvore inteira, e não `useCategoryBySlug`: o header já a carrega em toda rota, e é dela que o
  // resolver tira o pai para montar a canônica. Uma consulta por slug seria uma segunda ida ao banco
  // para responder o que o cache já tem.
  const { data: categories, isFetching: carregandoCategorias } = useCategories()

  // Primeira passada, só com a árvore. É ela que decide se vale perguntar por redirect: enquanto o
  // slug for categoria viva, `category_redirects` não é consultada (`SEO-02`).
  const semRedirect = useMemo(
    () =>
      resolveCategoryRoute({
        slug: slug ?? '',
        parentSlug,
        categories: categories ?? [],
      }),
    [slug, parentSlug, categories],
  )

  // `!carregandoCategorias` importa: com a árvore ainda vindo, a primeira passada responde
  // `notfound` para TUDO — perguntar aí dispararia a leitura em toda abertura de categoria, que é
  // exatamente o que o `enabled` existe para evitar.
  const { data: redirectTo, isFetching: carregandoRedirect } = useCategoryRedirect(slug ?? '', {
    enabled: !carregandoCategorias && semRedirect.kind === 'notfound',
  })

  // Segunda passada, agora com o destino do redirect. Quem decide se ele vira navegação ou 404 é o
  // resolver — destino apagado ou escondido pela RLS cai em `notfound`, nunca em salto para lugar
  // nenhum. Depois de navegar, o slug casa com categoria viva e não há laço.
  const route = useMemo(
    () =>
      redirectTo
        ? resolveCategoryRoute({
            slug: slug ?? '',
            parentSlug,
            categories: categories ?? [],
            redirectTo,
          })
        : semRedirect,
    [slug, parentSlug, categories, redirectTo, semRedirect],
  )
  const category = route.kind === 'ok' ? route.category : null

  // `URL-04`: com a categoria na raiz do domínio, toda URL errada da loja passa por aqui. Sem o
  // interruptor, mostrar a 404 custaria o download do catálogo inteiro.
  /*
   * `isLoading` (React Query v5) é `isPending && isFetching` — ou seja, **primeira** busca em curso.
   * Não é `isPending` sozinho: com o interruptor de `URL-04` desligado a consulta fica pendente para
   * sempre, e o esqueleto pulsaria embaixo da 404 até a cliente sair da página.
   */
  const {
    data: allProducts,
    isError: falhouAoCarregar,
    isLoading: carregandoProdutos,
  } = useProducts(category?.slug, {
    enabled: route.kind === 'ok',
  })
  useCanonical(route.kind === 'ok' ? route.canonical : null)

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

  /*
   * A janela da rolagem infinita.
   *
   * A chave é o que DEFINE a lista — coleção, ordenação e filtros —, não a identidade do array de
   * `visible`. Passar o array parecia mais direto e é uma armadilha: ele só é estável enquanto o
   * `data` do React Query também for, e um dublê que devolve `[]` literal a cada render (é o caso de
   * `routing.test.tsx`) faz a reancoragem disparar para sempre. Chave de valor não tem esse modo de
   * falhar.
   */
  const listKey = `${category?.slug ?? ''}|${sort}|${JSON.stringify(filters)}`
  const { visibleCount, hasMore, loadMore, sentinelRef } = useInfiniteWindow(visible.length, listKey)

  if (legacy) return <Navigate to={legacyRedirectTo(pathname) ?? '/'} replace />

  // Pai errado na URL: a barra se corrige sozinha e o conteúdo continua com um endereço só.
  if (route.kind === 'redirect') return <Navigate to={route.to} replace />

  if (!category) {
    // A guarda de carregamento vem ANTES do 404 — mesmo tratamento de `ProductPage`. Enquanto a
    // consulta corre, `categories` é `undefined` e o resolver responde `notfound`: sem esta linha a
    // 404 piscaria em TODA abertura de categoria, porque agora elas moram na raiz do domínio.
    // A do redirect entra pelo mesmo motivo: o slug antigo ainda pode virar navegação.
    if (carregandoCategorias || carregandoRedirect) {
      return <div className="container py-20" aria-busy="true" />
    }
    return <NotFound />
  }

  const countLabel = `${visible.length} ${visible.length === 1 ? 'produto' : 'produtos'}`

  /*
   * A grade tem UM dono, porque duas superfícies a desenham: os cards e o esqueleto. Repetir a
   * string faria o esqueleto anunciar uma grade que o conteúdo não usa — o "defeito 01" no tamanho
   * de uma classe, e sem nada quebrar.
   *
   * **`lg:grid-cols-4`, não `md:`.** A sidebar de filtros come 260px + 32 de gap, então em `md`
   * (container de 768) sobram 444px para a listagem: quatro colunas dariam cards de 96px. Em `lg` a
   * conta fecha em 160px e em `xl`, em 224px — que é onde a maioria dos desktops está.
   */
  const gridClass = `grid gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 ${
    dense ? 'grid-cols-2' : 'grid-cols-1'
  }`

  const sortSelect = (
    <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
      <SelectTrigger
        aria-label="Ordenar por"
        className={`${TAP_ROW} h-9 w-auto gap-1.5 rounded-[10px] border-0 bg-estrelinha-ground-deep px-3.5 text-[13px] font-medium text-estrelinha-ink focus:ring-0`}
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
            <Link to="/" className={`${TAP_ROW} text-estrelinha-ink-soft transition-colors hover:text-estrelinha-ink`}>
              Início
            </Link>
            <span className="text-estrelinha-ink-soft">/</span>
            <span className="font-medium text-estrelinha-ink">{category.name}</span>
          </nav>

          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <h1 className="font-display text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-estrelinha-ink md:text-[48px] md:leading-[56px]">
              {category.name}
            </h1>
            {/*
              Com a consulta correndo a contagem diria "0 produtos encontrados" — que é a frase do
              vazio, não a do carregando. Uma barra no lugar dela não afirma nada.
            */}
            {carregandoProdutos ? (
              <Skeleton className="h-[13px] w-36 rounded-pill bg-estrelinha-line" />
            ) : (
              <p className="text-[13px] leading-[18px] text-estrelinha-ink-soft">
                {countLabel}{' '}
                {visible.length === products.length ? 'encontrados' : `de ${products.length}`}
              </p>
            )}
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

        {tags.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, tags: [] })}
              className={`${TAP_ROW} shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] leading-3 transition-colors ${
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
                className={`${TAP_ROW} shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] leading-3 transition-colors ${
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

          {carregandoProdutos ? (
            /*
             * Uma leva inteira de esqueletos, na MESMA grade dos cards. Menos que isso deixaria a
             * dobra vazia; e como o esqueleto tem a altura do card, a chegada dos produtos não
             * empurra nada.
             */
            <div className={gridClass} aria-busy="true" aria-label="Carregando as joias da coleção">
              {Array.from({ length: PRODUCTS_PER_PAGE }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <>
              <div className={gridClass}>
                {/* O índice é o que faz `PRF-03` valer: os seis primeiros cards nascem ansiosos
                    e sem opacidade zero, e o primeiro leva `fetchpriority="high"`. Sem passá-lo
                    daqui, a decisão existiria no `ProductCard` e nunca seria tomada — esta é a
                    listagem que media LCP de 15,6 s. */}
                {visible.slice(0, visibleCount).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>

              {/*
                Quem carrega a próxima leva é a sentinela — mas o BOTÃO é real e recebe foco.
                Rolagem infinita sem controle manual é armadilha de teclado (não há como "rolar até"
                sem ponteiro) e morre silenciosamente onde não há `IntersectionObserver`. Na prática a
                cliente quase nunca chega a clicá-lo: o observer abre a leva 600px antes.
              */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center pt-10">
                  {/*
                    `py-3` e **nenhum auxiliar de toque**: com a borda a caixa PINTADA mede 47px, e
                    `TAP_44`/`TAP_ROW` existem para desenho menor que 44 — pendurar um pseudo de 44
                    num controle que já é maior não acrescenta alvo nenhum. Foi o que a primeira
                    versão fez, e ela saiu com 23px de altura visível: o alvo estava certo e o botão
                    parecia um fio.
                  */}
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-sm border border-estrelinha-field px-6 py-3 text-[14px] font-semibold text-estrelinha-primary transition-colors hover:bg-estrelinha-ground-deep"
                  >
                    Carregar mais joias
                  </button>
                </div>
              )}

              {/*
                A leva nova não muda o foco nem a URL: sem isto, quem usa leitor de tela não tem como
                saber que a lista cresceu. Invisível — a contagem visível já está no cabeçalho.
              */}
              <p aria-live="polite" className="sr-only">
                Mostrando {visibleCount} de {visible.length} produtos
              </p>
            </>
          ) : falhouAoCarregar ? (
            /*
             * `BUG-20260809`: a consulta falhava e a página dizia "Nenhuma joia com esses filtros",
             * mandando quem chegasse mexer em filtro que não tinha nada a ver. Vazio e falha são
             * estados diferentes, e a tela precisa saber dizer qual é qual.
             */
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-[18px] font-medium text-estrelinha-ink">
                Não conseguimos carregar as joias desta coleção.
              </p>
              <p className="text-[14px] text-estrelinha-ink-soft">
                A falha é nossa, não sua — os filtros estão como você deixou.
              </p>
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
