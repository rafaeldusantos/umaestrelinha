// O recorte da lista de pedidos mora na URL — filtro, busca, ordem, página e tamanho de página.
//
// Antes ele vivia num `useState` da página: recarregar, ou abrir um pedido e voltar, devolvia a
// lista à primeira página de "Precisa de ação" e a Adri refazia o filtro a cada pedido conferido.
// Na URL ele sobrevive ao F5, ao voltar do navegador e ao link colado em outra aba — o mesmo motivo
// pelo qual o pedido virou rota na feature `34`.
//
// Só o que DIFERE do padrão é escrito, para o endereço da lista sem filtro continuar sendo
// `/admin/pedidos`. A leitura nunca lança: valor desconhecido (link velho, mão no endereço) cai no
// padrão daquele eixo, e os outros eixos continuam valendo.

import { ORDER_VIEWS, type OrderViewId } from '@estrelinha/core/orders'
import {
  ORDER_SORT_COLUMN,
  defaultOrderQuery,
  type OrderQuery,
  type OrderSortKey,
} from '@/entities/order/api/orderQuery'

/** Os tamanhos que o seletor de página oferece. Outro valor na URL cai no padrão. */
export const ORDER_PAGE_SIZES: readonly number[] = [10, 25, 50]

const P = {
  visao: 'visao',
  status: 'status',
  material: 'material',
  pagamento: 'pagamento',
  meio: 'meio',
  de: 'de',
  ate: 'ate',
  semRastreio: 'sem-rastreio',
  busca: 'busca',
  pagina: 'pagina',
  porPagina: 'por-pagina',
  ordem: 'ordem',
} as const

const DIA = /^\d{4}-\d{2}-\d{2}$/
const VIEW_IDS = new Set<string>(ORDER_VIEWS.map(v => v.id))

const lista = (valor: string | null): string[] =>
  valor ? valor.split(',').map(s => s.trim()).filter(Boolean) : []

const inteiroPositivo = (valor: string | null): number | null => {
  if (!valor || !/^\d+$/.test(valor)) return null
  const n = Number(valor)
  return n >= 1 ? n : null
}

const dia = (valor: string | null): string | null => (valor && DIA.test(valor) ? valor : null)

/** A consulta escrita como parâmetros de URL — só os eixos fora do padrão. */
export const orderQueryToParams = (query: OrderQuery): URLSearchParams => {
  const padrao = defaultOrderQuery()
  const p = new URLSearchParams()
  const f = query.filters

  if (f.view !== padrao.filters.view) p.set(P.visao, f.view)
  if (f.statuses.length) p.set(P.status, f.statuses.join(','))
  if (f.materialStatuses.length) p.set(P.material, f.materialStatuses.join(','))
  if (f.paymentStatuses.length) p.set(P.pagamento, f.paymentStatuses.join(','))
  if (f.paymentMethods.length) p.set(P.meio, f.paymentMethods.join(','))
  if (f.dateFrom) p.set(P.de, f.dateFrom)
  if (f.dateTo) p.set(P.ate, f.dateTo)
  if (f.semRastreio) p.set(P.semRastreio, '1')
  if (query.search.trim()) p.set(P.busca, query.search)
  if (query.sort.key !== padrao.sort.key || query.sort.dir !== padrao.sort.dir) {
    p.set(P.ordem, `${query.sort.key}-${query.sort.dir}`)
  }
  if (query.pageSize !== padrao.pageSize) p.set(P.porPagina, String(query.pageSize))
  if (query.page > 1) p.set(P.pagina, String(query.page))

  return p
}

/** A consulta lida da URL. Nunca lança: o que não se entende vira o padrão daquele eixo. */
export const orderQueryFromParams = (params: URLSearchParams): OrderQuery => {
  const padrao = defaultOrderQuery()

  const visao = params.get(P.visao)
  const view: OrderViewId = visao && VIEW_IDS.has(visao) ? (visao as OrderViewId) : padrao.filters.view

  let sort = padrao.sort
  const ordem = params.get(P.ordem)
  const casou = ordem?.match(/^(.+)-(asc|desc)$/)
  if (casou && casou[1] in ORDER_SORT_COLUMN) {
    sort = { key: casou[1] as OrderSortKey, dir: casou[2] as 'asc' | 'desc' }
  }

  const porPagina = inteiroPositivo(params.get(P.porPagina))

  return {
    page: inteiroPositivo(params.get(P.pagina)) ?? 1,
    pageSize: porPagina !== null && ORDER_PAGE_SIZES.includes(porPagina) ? porPagina : padrao.pageSize,
    search: params.get(P.busca) ?? '',
    sort,
    filters: {
      view,
      statuses: lista(params.get(P.status)),
      materialStatuses: lista(params.get(P.material)),
      paymentStatuses: lista(params.get(P.pagamento)),
      paymentMethods: lista(params.get(P.meio)),
      dateFrom: dia(params.get(P.de)),
      dateTo: dia(params.get(P.ate)),
      semRastreio: params.get(P.semRastreio) === '1',
    },
  }
}

/** O endereço da lista neste recorte — o "voltar" do pedido leva para cá. */
export const orderListHref = (query: OrderQuery): string => {
  const qs = orderQueryToParams(query).toString()
  return qs ? `/admin/pedidos?${qs}` : '/admin/pedidos'
}
