import { describe, expect, it } from 'vitest'
import { defaultOrderQuery, type OrderQuery } from '@/entities/order/api/orderQuery'
import { orderListHref, orderQueryFromParams, orderQueryToParams } from '../queryUrl'

const ida = (q: OrderQuery) => orderQueryFromParams(new URLSearchParams(orderQueryToParams(q).toString()))

describe('o recorte da lista na URL', () => {
  it('o padrão não escreve nada — o endereço da lista sem filtro continua limpo', () => {
    expect(orderQueryToParams(defaultOrderQuery()).toString()).toBe('')
    expect(orderListHref(defaultOrderQuery())).toBe('/admin/pedidos')
  })

  it('URL vazia é o padrão', () => {
    expect(orderQueryFromParams(new URLSearchParams())).toEqual(defaultOrderQuery())
  })

  it('cada eixo vai e volta sem perda', () => {
    const q: OrderQuery = {
      page: 4,
      pageSize: 50,
      search: 'thais akemi',
      sort: { key: 'total', dir: 'asc' },
      filters: {
        view: 'fila-material',
        statuses: ['paid', 'separating'],
        materialStatuses: ['aguardando_material'],
        paymentStatuses: ['approved'],
        paymentMethods: ['pix', 'card'],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-27',
        semRastreio: true,
      },
    }
    expect(ida(q)).toEqual(q)
  })

  it('a busca com caractere especial sobrevive', () => {
    const q = { ...defaultOrderQuery(), search: 'a&b=c,#0183' }
    expect(ida(q).search).toBe('a&b=c,#0183')
  })

  it('busca só de espaço não é escrita', () => {
    expect(orderQueryToParams({ ...defaultOrderQuery(), search: '   ' }).has('busca')).toBe(false)
  })

  it('a página 1 não é escrita; a 2 é', () => {
    expect(orderQueryToParams({ ...defaultOrderQuery(), page: 1 }).has('pagina')).toBe(false)
    expect(orderQueryToParams({ ...defaultOrderQuery(), page: 2 }).get('pagina')).toBe('2')
  })

  it.each([
    ['visao=nao-existe', { filters: { ...defaultOrderQuery().filters, view: 'precisa-acao' } }],
    ['pagina=0', { page: 1 }],
    ['pagina=-3', { page: 1 }],
    ['pagina=abc', { page: 1 }],
    ['por-pagina=7', { pageSize: 25 }],
    ['ordem=preco-asc', { sort: { key: 'created', dir: 'desc' } }],
    ['ordem=total-lado', { sort: { key: 'created', dir: 'desc' } }],
  ])('valor que não se entende (%s) cai no padrão daquele eixo, sem lançar', (qs, esperado) => {
    expect(orderQueryFromParams(new URLSearchParams(qs))).toMatchObject(esperado)
  })

  it('data malformada é ignorada, e a outra ponta continua valendo', () => {
    const q = orderQueryFromParams(new URLSearchParams('de=27/10/2026&ate=2026-10-27'))
    expect(q.filters.dateFrom).toBeNull()
    expect(q.filters.dateTo).toBe('2026-10-27')
  })

  it('um eixo inválido não derruba os outros', () => {
    const q = orderQueryFromParams(new URLSearchParams('visao=xyz&material=aguardando_material&pagina=2'))
    expect(q.filters.view).toBe('precisa-acao')
    expect(q.filters.materialStatuses).toEqual(['aguardando_material'])
    expect(q.page).toBe(2)
  })

  it('o endereço de volta carrega o recorte', () => {
    expect(orderListHref({ ...defaultOrderQuery(), page: 3, filters: { ...defaultOrderQuery().filters, view: 'tudo' } }))
      .toBe('/admin/pedidos?visao=tudo&pagina=3')
  })
})
