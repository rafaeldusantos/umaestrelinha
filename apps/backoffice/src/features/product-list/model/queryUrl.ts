// O recorte da lista de produtos mora na URL — visão, filtros, busca, ordem, página e tamanho.
//
// Molde de `features/order-list/model/queryUrl.ts`, e pelo mesmo motivo: num `useState` da página,
// recarregar ou abrir um produto e voltar devolvia a lista à primeira página de "Todos", e a Adri
// refazia o filtro a cada peça editada. Na URL ele sobrevive ao F5 e ao voltar.
//
// Só o que DIFERE do padrão é escrito. As listas vão como parâmetro REPETIDO (`tag=a&tag=b`), e não
// separadas por vírgula, porque uma tag pode conter vírgula. A leitura nunca lança: o que não se
// entende cai no padrão daquele eixo, e os outros continuam valendo.

import {
  PRODUCT_VIEWS,
  SORT_COLUMN,
  defaultQuery,
  type ProductQuery,
  type ProductSortKey,
  type ProductViewId,
} from '@/entities/product/api/productQuery'

/** Os tamanhos que o seletor de página oferece. Outro valor na URL cai no padrão. */
export const PRODUCT_PAGE_SIZES: readonly number[] = [10, 25, 50]

/** O endereço da lista de produtos sem recorte. */
export const PRODUCT_LIST_PATH = '/admin/produtos'

const P = {
  visao: 'visao',
  categoria: 'categoria',
  fornecedor: 'fornecedor',
  tag: 'tag',
  precoMin: 'preco-min',
  precoMax: 'preco-max',
  busca: 'busca',
  pagina: 'pagina',
  porPagina: 'por-pagina',
  ordem: 'ordem',
} as const

const VIEW_IDS = new Set<string>(PRODUCT_VIEWS.map(v => v.id))

const lista = (params: URLSearchParams, chave: string): string[] =>
  params.getAll(chave).map(s => s.trim()).filter(Boolean)

const inteiroPositivo = (valor: string | null): number | null => {
  if (!valor || !/^\d+$/.test(valor)) return null
  const n = Number(valor)
  return n >= 1 ? n : null
}

const preco = (valor: string | null): number | null => {
  if (!valor || !/^\d+(\.\d+)?$/.test(valor)) return null
  return Number(valor)
}

/** A consulta escrita como parâmetros de URL — só os eixos fora do padrão. */
export const productQueryToParams = (query: ProductQuery): URLSearchParams => {
  const padrao = defaultQuery()
  const p = new URLSearchParams()
  const f = query.filters

  if (f.view !== padrao.filters.view) p.set(P.visao, f.view)
  for (const id of f.categoryIds) p.append(P.categoria, id)
  for (const id of f.supplierIds ?? []) p.append(P.fornecedor, id)
  for (const tag of f.tags) p.append(P.tag, tag)
  if (f.priceMin !== null) p.set(P.precoMin, String(f.priceMin))
  if (f.priceMax !== null) p.set(P.precoMax, String(f.priceMax))
  if (query.search.trim()) p.set(P.busca, query.search)
  if (query.sort.key !== padrao.sort.key || query.sort.dir !== padrao.sort.dir) {
    p.set(P.ordem, `${query.sort.key}-${query.sort.dir}`)
  }
  if (query.pageSize !== padrao.pageSize) p.set(P.porPagina, String(query.pageSize))
  if (query.page > 1) p.set(P.pagina, String(query.page))

  return p
}

/** A consulta lida da URL. Nunca lança: o que não se entende vira o padrão daquele eixo. */
export const productQueryFromParams = (params: URLSearchParams): ProductQuery => {
  const padrao = defaultQuery()

  const visao = params.get(P.visao)
  const view: ProductViewId = visao && VIEW_IDS.has(visao) ? (visao as ProductViewId) : padrao.filters.view

  let sort = padrao.sort
  const casou = params.get(P.ordem)?.match(/^(.+)-(asc|desc)$/)
  if (casou && casou[1] in SORT_COLUMN) {
    sort = { key: casou[1] as ProductSortKey, dir: casou[2] as 'asc' | 'desc' }
  }

  const porPagina = inteiroPositivo(params.get(P.porPagina))

  return {
    page: inteiroPositivo(params.get(P.pagina)) ?? 1,
    pageSize: porPagina !== null && PRODUCT_PAGE_SIZES.includes(porPagina) ? porPagina : padrao.pageSize,
    // A busca não é aparada na leitura: o campo é controlado pela URL, e aparar comeria o espaço
    // que a Adri acabou de digitar entre duas palavras.
    search: params.get(P.busca) ?? '',
    sort,
    filters: {
      view,
      categoryIds: lista(params, P.categoria),
      supplierIds: lista(params, P.fornecedor),
      tags: lista(params, P.tag),
      priceMin: preco(params.get(P.precoMin)),
      priceMax: preco(params.get(P.precoMax)),
    },
  }
}

/** O endereço da lista neste recorte — o "voltar" do cadastro leva para cá. */
export const productListHref = (query: ProductQuery): string => {
  const qs = productQueryToParams(query).toString()
  return qs ? `${PRODUCT_LIST_PATH}?${qs}` : PRODUCT_LIST_PATH
}

/**
 * O endereço de volta que o cadastro recebeu da lista, por `location.state`. Só caminho da própria
 * lista é aceito; chegando de outro lugar (link colado, o pedido, a nova aba), volta sem recorte.
 */
export const productListReturn = (state: unknown): string => {
  const alvo = (state as { voltarPara?: unknown } | null)?.voltarPara
  return typeof alvo === 'string' && /^\/admin\/produtos(\?|$)/.test(alvo) ? alvo : PRODUCT_LIST_PATH
}
