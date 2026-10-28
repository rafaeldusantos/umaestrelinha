import { describe, expect, it } from 'vitest'
import { defaultQuery, type ProductQuery } from '@/entities/product/api/productQuery'
import { productListHref, productListReturn, productQueryFromParams, productQueryToParams } from '../queryUrl'

const ida = (q: ProductQuery) => productQueryFromParams(new URLSearchParams(productQueryToParams(q).toString()))

describe('o recorte da lista de produtos na URL', () => {
  it('o padrão não escreve nada — a lista sem filtro continua em /admin/produtos', () => {
    expect(productQueryToParams(defaultQuery()).toString()).toBe('')
    expect(productListHref(defaultQuery())).toBe('/admin/produtos')
  })

  it('URL vazia é o padrão', () => {
    expect(productQueryFromParams(new URLSearchParams())).toEqual(defaultQuery())
  })

  it('cada eixo vai e volta sem perda', () => {
    const q: ProductQuery = {
      page: 4,
      pageSize: 50,
      search: 'anel coração',
      sort: { key: 'price', dir: 'asc' },
      filters: {
        view: 'sem-estoque',
        categoryIds: ['cat-1', 'cat-2'],
        supplierIds: ['forn-1'],
        tags: ['prata', 'dia das mães'],
        priceMin: 49.9,
        priceMax: 300,
      },
    }
    expect(ida(q)).toEqual(q)
  })

  it('tag com vírgula sobrevive — por isso as listas vão como parâmetro repetido', () => {
    const q = { ...defaultQuery(), filters: { ...defaultQuery().filters, tags: ['ouro, prata', 'resina'] } }
    expect(ida(q).filters.tags).toEqual(['ouro, prata', 'resina'])
  })

  it('preço zero é filtro, e não some', () => {
    const q = { ...defaultQuery(), filters: { ...defaultQuery().filters, priceMin: 0 } }
    expect(ida(q).filters.priceMin).toBe(0)
  })

  it('a busca é guardada como foi digitada, com o espaço do fim — o campo é controlado pela URL', () => {
    const q = { ...defaultQuery(), search: 'anel ' }
    expect(ida(q).search).toBe('anel ')
  })

  it('busca só de espaço não é escrita', () => {
    expect(productQueryToParams({ ...defaultQuery(), search: '   ' }).has('busca')).toBe(false)
  })

  it('a página 1 não é escrita; a 2 é', () => {
    expect(productQueryToParams({ ...defaultQuery(), page: 1 }).has('pagina')).toBe(false)
    expect(productQueryToParams({ ...defaultQuery(), page: 2 }).get('pagina')).toBe('2')
  })

  it.each([
    ['visao=nao-existe', { filters: expect.objectContaining({ view: 'todos' }) }],
    ['pagina=0', { page: 1 }],
    ['pagina=abc', { page: 1 }],
    ['por-pagina=7', { pageSize: 25 }],
    ['ordem=custo-asc', { sort: { key: 'created', dir: 'desc' } }],
    ['ordem=name-lado', { sort: { key: 'created', dir: 'desc' } }],
    ['preco-min=-5', { filters: expect.objectContaining({ priceMin: null }) }],
    ['preco-max=dez', { filters: expect.objectContaining({ priceMax: null }) }],
  ])('valor que não se entende (%s) cai no padrão daquele eixo, sem lançar', (qs, esperado) => {
    expect(productQueryFromParams(new URLSearchParams(qs))).toMatchObject(esperado)
  })

  it('um eixo inválido não derruba os outros', () => {
    const q = productQueryFromParams(new URLSearchParams('visao=xyz&categoria=cat-1&pagina=2'))
    expect(q.filters.view).toBe('todos')
    expect(q.filters.categoryIds).toEqual(['cat-1'])
    expect(q.page).toBe(2)
  })
})

describe('o endereço de volta que o cadastro aceita', () => {
  it('aceita a lista, com ou sem recorte', () => {
    expect(productListReturn({ voltarPara: '/admin/produtos?pagina=3' })).toBe('/admin/produtos?pagina=3')
    expect(productListReturn({ voltarPara: '/admin/produtos' })).toBe('/admin/produtos')
  })

  it.each([null, undefined, {}, { voltarPara: 3 }, { voltarPara: '/admin/pedidos' },
    { voltarPara: '//exemplo.invalid/admin/produtos' }, { voltarPara: '/admin/produtos/p1/editar' }])(
    'recusa %j e volta para a lista sem recorte',
    state => {
      expect(productListReturn(state)).toBe('/admin/produtos')
    },
  )
})
