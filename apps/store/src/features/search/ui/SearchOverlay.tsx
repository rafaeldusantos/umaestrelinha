import { useEffect, useMemo, useRef, useState } from 'react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Search, X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { formatPrice } from '@estrelinha/core/formatters'
import { productPath } from '@estrelinha/core/routes'
import { renditionUrl } from '@estrelinha/core/media'
import { useAllProducts } from '@/entities/product/api/useProducts'
import { displayCategory } from '@/entities/product/lib/displayCategory'
import { isProductOutOfStock } from '@/entities/product/lib/availability'
import { useCategories } from '@/entities/category/api/useCategories'
import { categoryHref } from '@estrelinha/core/menu'
import { categoryTrailLabel } from '@/entities/category/lib/categoryTrail'
import { MIN_QUERY_LENGTH, searchProducts } from '../lib/searchProducts'
import { pickTrendingCategories } from '@estrelinha/core/home'
import { useSearchUiStore } from '../model/searchUiStore'
import { clearRecentSearches, pushRecentSearch, readRecentSearches } from '../model/recentSearches'

/** Quantas linhas cabem antes de virar rolagem cega no celular. O resto vai em "Ver todos". */
const PREVIEW_LIMIT = 6
/** Pílulas de "Em alta agora" — 8 preenche duas linhas de 390px sem estourar a terceira. */
const TRENDING_LIMIT = 8

const SECTION_LABEL = 'text-[11px] font-bold uppercase tracking-[0.08em] text-estrelinha-ink-soft'
const LINK_ACTION = 'text-[11px] font-semibold text-estrelinha-primary'

/**
 * Busca em tela cheia — board "Mobile Search Open - v3".
 *
 * É a superfície de busca do celular, no lugar do painel que descia de dentro do header: ali a
 * lista tinha ~200px de altura útil acima do teclado, sem espaço para preço nem categoria, e o
 * campo dividia a faixa com quatro ícones. Em tela cheia, o resultado cabe com a informação que
 * decide a compra (imagem, categoria, preço) e o teclado não disputa espaço com nada.
 *
 * Montada uma vez pelo `StoreLayout` e comandada pelo `searchUiStore`; não tem gatilho embutido.
 * O desktop segue no `SearchDropdown`, que é o desenho certo para uma faixa de header larga.
 */
const SearchOverlay = () => {
  const navigate = useNavigate()
  const open = useSearchUiStore((s) => s.open)
  const setSearchOpen = useSearchUiStore((s) => s.setSearchOpen)
  const closeSearch = useSearchUiStore((s) => s.closeSearch)

  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Mesmo `enabled` da gaveta do carrinho: a busca vive montada em toda rota, e buscar o catálogo
  // inteiro na montagem seria trabalho que ninguém pediu. A chave é a de `useAllProducts`, então
  // quem já tem cache não dispara requisição nova.
  const { data: products } = useAllProducts({ enabled: open })
  const { data: categories } = useCategories()

  // Cada abertura começa limpa e relê o histórico — se a cliente buscou pelo dropdown do desktop na
  // mesma sessão, o termo tem de aparecer aqui.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setRecent(readRecentSearches())
    // O `Sheet` move o foco para o painel na montagem; o campo só recebe foco depois disso, senão o
    // Radix o rouba de volta e o teclado do celular não sobe.
    const id = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [open])

  // Uma varredura só: `hits` é a prévia e `totalCount` alimenta o "Ver todos (N)". Buscar duas vezes
  // para contar percorreria o catálogo inteiro a cada tecla digitada.
  const matches = useMemo(
    () => searchProducts(products, query, { categories }),
    [products, query, categories],
  )
  const hits = matches.slice(0, PREVIEW_LIMIT)
  const totalCount = matches.length

  const trending = useMemo(() => pickTrendingCategories(categories, TRENDING_LIMIT), [categories])

  const searching = query.trim().length >= MIN_QUERY_LENGTH

  /** Abrir um resultado também guarda o termo: foi uma busca que deu certo, a que mais vale repetir. */
  const remember = (term: string) => {
    const clean = term.trim()
    if (clean.length >= MIN_QUERY_LENGTH) setRecent(pushRecentSearch(clean))
    closeSearch()
  }

  const submit = (term: string) => {
    const clean = term.trim()
    if (clean.length < MIN_QUERY_LENGTH) return
    remember(clean)
    navigate(`/busca?q=${encodeURIComponent(clean)}`)
  }

  return (
    <Sheet open={open} onOpenChange={setSearchOpen}>
      <SheetContent
        side="top"
        hideClose
        /* Tela cheia: `100dvh` e não `100vh` porque no Safari do iPhone a barra de endereço come
           ~60px de `100vh` e a última linha da lista fica atrás dela. */
        className="flex h-[100dvh] w-full flex-col gap-0 border-0 bg-white p-0"
      >
        {/* Título distinto do `aria-label` do campo de propósito: o Radix aponta o
            `aria-labelledby` do diálogo para cá, e dois nós com o mesmo nome acessível deixam
            "buscar" ambíguo para quem navega por leitor de tela. */}
        <SheetTitle className="sr-only">Busca da loja</SheetTitle>
        <SheetDescription className="sr-only">
          Digite para ver produtos, ou escolha uma busca recente ou coleção em alta.
        </SheetDescription>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(query)
          }}
          className="flex shrink-0 items-center gap-3 border-b border-estrelinha-line px-5 py-3.5"
        >
          <div className="flex flex-1 items-center gap-2.5 rounded-md border-2 border-estrelinha-primary bg-estrelinha-ground-deep px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-estrelinha-primary" strokeWidth={2.5} aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar joias, coleções..."
              aria-label="Buscar joias"
              /* `inputMode` + `enterKeyHint` põem a lupa no lugar do "enter" no teclado do celular;
                 sem `type="search"` para não herdar o "x" nativo do WebKit, que ficaria ao lado do
                 nosso. Corretor e capitalização desligados: nome de franquia não é palavra do
                 dicionário, e "One piece" virava "One Piece" corrigido para outra coisa. */
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-estrelinha-ink outline-none placeholder:font-normal placeholder:text-estrelinha-ink-soft"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Limpar busca"
                className={`${TAP_44} -mr-1 flex h-8 w-8 shrink-0 items-center justify-center`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-estrelinha-line">
                  <X className="h-3 w-3 text-estrelinha-primary" strokeWidth={3} aria-hidden />
                </span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={closeSearch}
            className="-mr-1 flex h-11 shrink-0 items-center px-1 text-sm font-semibold text-estrelinha-primary"
          >
            Cancelar
          </button>
        </form>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {searching && (
            <section className="flex flex-col border-b border-estrelinha-line py-2">
              <div className="flex items-center gap-2 px-5 py-2">
                <h2 className={SECTION_LABEL}>Resultados para "{query.trim()}"</h2>
                <div className="flex-1" />
                {totalCount > hits.length && (
                  <button type="button" onClick={() => submit(query)} className={LINK_ACTION}>
                    Ver todos ({totalCount})
                  </button>
                )}
              </div>

              {hits.length === 0 ? (
                <div className="px-5 pb-4 pt-1">
                  <p className="text-sm font-medium text-estrelinha-ink">
                    Nada encontrado para "{query.trim()}".
                  </p>
                  <p className="mt-1 text-[13px] text-estrelinha-ink-soft">
                    Tenta o nome do anime, do grupo ou do personagem — ou olha as coleções em alta
                    aqui embaixo.
                  </p>
                </div>
              ) : (
                <ul>
                  {hits.map(({ product }) => {
                    const trail = categoryTrailLabel(displayCategory(product, categories), categories)
                    const soldOut = isProductOutOfStock(product)
                    return (
                      <li key={product.id}>
                        <Link
                          to={productPath(product.slug)}
                          onClick={() => remember(query)}
                          className="flex items-center gap-3 px-5 py-2.5 active:bg-estrelinha-ground-deep"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-estrelinha-ground-deep">
                            {product.image_url ? (
                              /* Vaga de 48px: 160 cobre DPR 3. */
                              <img
                                src={renditionUrl(product.image_url, 160)}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-display text-lg font-bold text-estrelinha-primary/25">N</span>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold text-estrelinha-ink">
                              {product.name}
                            </span>
                            <span className="truncate text-xs font-medium text-estrelinha-ink-soft">
                              {soldOut ? 'Esgotado' : trail || 'Uma Estrelinha'}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-bold text-estrelinha-primary">
                            {formatPrice(product.price)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {!searching && recent.length > 0 && (
            <section className="flex flex-col border-b border-estrelinha-line px-5 py-3">
              <div className="flex items-center justify-between pb-3">
                <h2 className={SECTION_LABEL}>Buscas recentes</h2>
                <button
                  type="button"
                  onClick={() => setRecent(clearRecentSearches())}
                  className={LINK_ACTION}
                >
                  Limpar
                </button>
              </div>
              <ul className="flex flex-col">
                {recent.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => submit(term)}
                      className="flex w-full items-center gap-2.5 py-2.5 text-left"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-estrelinha-ink-soft" strokeWidth={2} aria-hidden />
                      <span className="truncate text-sm font-medium text-estrelinha-ink">{term}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {trending.length > 0 && (
            <section className="flex flex-col gap-3 px-5 py-3">
              <h2 className={SECTION_LABEL}>Em alta agora</h2>
              <ul className="flex flex-wrap gap-2">
                {trending.map((cat, index) => (
                  <li key={cat.id}>
                    <Link
                      to={categoryHref(categories ?? [], cat.id)}
                      onClick={closeSearch}
                      /* Duas tonalidades alternadas dão ritmo à nuvem sem inventar uma terceira cor:
                         o board usava um lilás que não existe mais na paleta Uma Estrelinha. */
                      className={`flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[13px] font-semibold text-estrelinha-primary ${
                        index % 2 === 0 ? 'bg-estrelinha-ground-deep' : 'bg-estrelinha-line'
                      }`}
                    >
                      {/* O emoji que ficava aqui era campo FANTASMA: `CategoryRow` o declarava,
                          o mapper fazia `row.emoji ?? ''` e **nenhuma migration criava a coluna** —
                          o `&&` nunca era verdadeiro e nada nunca foi desenhado. Saiu na feature 39,
                          junto do campo (terceira ocorrência do `AD-012`). */}
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SearchOverlay
