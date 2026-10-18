import { describe, expect, it } from 'vitest'
import type { Product } from '@estrelinha/supabase/types'
import type { FilterCatalog } from '@estrelinha/core/filters'
import {
  activeFilterChips,
  catalogWithout,
  clearFilterChip,
  clearFilters,
  defaultFilters,
  filterBlocks,
  filterProducts,
  hasActiveFilters,
  priceBounds,
  sortProducts,
  toggleFilterValue,
} from '../filters'

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton',
  slug: 'botton',
  price: 8.9,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  filter_value_ids: [],
  ...overrides,
})

/**
 * O catálogo das provas (feature 66). Dois grupos ativos cujos valores DIVERGEM entre os produtos
 * (`L-013`) — com um grupo só, "OU dentro" e "E entre" dariam a mesma lista e nenhuma asserção
 * distinguiria as duas regras. Mais um grupo inativo e um terceiro grupo com um valor de MESMO NOME
 * ("Ouro") que outro, para o chip provar que nomeia o valor e não confunde os dois.
 */
const CATALOGO: FilterCatalog = {
  groups: [
    { id: 'g-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 1 },
    { id: 'g-tipo', name: 'Tipo de joia', slug: 'tipo', is_active: true, sort_order: 0 },
    { id: 'g-pedra', name: 'Cor da pedra', slug: 'cor-da-pedra', is_active: true, sort_order: 2 },
    { id: 'g-off', name: 'Desligado', slug: 'desligado', is_active: false, sort_order: 3 },
  ],
  values: [
    { id: 'v-pingente', group_id: 'g-tipo', name: 'Pingente', slug: 'pingente', sort_order: 1 },
    { id: 'v-anel', group_id: 'g-tipo', name: 'Anel', slug: 'anel', sort_order: 0 },
    { id: 'v-colar', group_id: 'g-tipo', name: 'Colar', slug: 'colar', sort_order: 2 },
    { id: 'v-prata', group_id: 'g-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
    { id: 'v-ouro', group_id: 'g-acab', name: 'Ouro', slug: 'ouro', sort_order: 1 },
    { id: 'v-pedra-ouro', group_id: 'g-pedra', name: 'Ouro', slug: 'ouro', sort_order: 0 },
    { id: 'v-off', group_id: 'g-off', name: 'Algo', slug: 'algo', sort_order: 0 },
  ],
}

// Ninguém tem `v-colar`: o valor existe no catálogo e não na base, então não pode aparecer.
const ANEL_PRATA = product({ id: 'a', price: 10, filter_value_ids: ['v-anel', 'v-prata', 'v-off'] })
const PINGENTE_OURO = product({ id: 'b', price: 15, filter_value_ids: ['v-pingente', 'v-ouro'] })
const PINGENTE_PRATA = product({ id: 'c', price: 18, filter_value_ids: ['v-pingente', 'v-prata', 'v-pedra-ouro'] })
const ANEL_OURO = product({ id: 'd', price: 12, filter_value_ids: ['v-anel', 'v-ouro'] })
const SEM_MARCA = product({ id: 'e', price: 11 })
const BASE = [ANEL_PRATA, PINGENTE_OURO, PINGENTE_PRATA, ANEL_OURO, SEM_MARCA]
const ids = (ps: readonly Product[]) => ps.map(p => p.id)

describe('priceBounds', () => {
  it('arredonda para fora, para o slider nunca cortar o produto mais caro', () => {
    expect(priceBounds([product({ price: 7.5 }), product({ price: 12.9 })])).toEqual([7, 13])
  })

  it('coleção vazia cai numa faixa neutra em vez de [Infinity, -Infinity]', () => {
    expect(priceBounds([])).toEqual([0, 20])
  })
})

describe('filterProducts', () => {
  const bounds: [number, number] = [0, 20]
  const base = defaultFilters(bounds)

  it('"com desconto" exige compare_price MAIOR que o preço, não só preenchido', () => {
    const riscado = product({ id: 'a', price: 8.9, compare_price: 12.9 })
    const igual = product({ id: 'b', price: 8.9, compare_price: 8.9 })
    const semNada = product({ id: 'c', price: 8.9, compare_price: null })

    const out = filterProducts([riscado, igual, semNada], { ...base, onSaleOnly: true }, CATALOGO)
    expect(out.map(p => p.id)).toEqual(['a'])
  })

  it('"em estoque" respeita a stock_policy: none nunca esgota (PST-08 AC 6)', () => {
    const semSaldoTrack = product({ id: 'a', stock_total: 0, stock_policy: 'track' })
    const semSaldoNone = product({ id: 'b', stock_total: 0, stock_policy: 'none' })

    const out = filterProducts([semSaldoTrack, semSaldoNone], { ...base, inStockOnly: true }, CATALOGO)
    expect(out.map(p => p.id)).toEqual(['b'])
  })

  it('"novidades" deixa só os is_new', () => {
    const out = filterProducts(
      [product({ id: 'a', is_new: true }), product({ id: 'b', is_new: false })],
      { ...base, newOnly: true },
      CATALOGO,
    )
    expect(ids(out)).toEqual(['a'])
  })

  it('a faixa de preço corta pelas duas pontas, inclusiva', () => {
    const items = [product({ id: 'a', price: 5 }), product({ id: 'b', price: 10 }), product({ id: 'c', price: 15 })]
    const out = filterProducts(items, { ...base, priceRange: [5, 10] }, CATALOGO)
    expect(out.map(p => p.id)).toEqual(['a', 'b'])
  })
})

describe('filterProducts — os grupos curados (feature 66, FLT-23)', () => {
  const bounds: [number, number] = [0, 20]
  const base = defaultFilters(bounds)

  it('sem seleção, todos passam — inclusive o produto sem marcação nenhuma', () => {
    expect(ids(filterProducts(BASE, base, CATALOGO))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('dois valores do MESMO grupo são OU: anel ou pingente', () => {
    const f = { ...base, selection: { tipo: ['anel', 'pingente'] } }
    expect(ids(filterProducts(BASE, f, CATALOGO))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('valores de grupos DIFERENTES são E: pingente e prata 925', () => {
    const f = { ...base, selection: { tipo: ['pingente'], acabamento: ['prata-925'] } }
    expect(ids(filterProducts(BASE, f, CATALOGO))).toEqual(['c'])
  })

  it('sensor: a regra ingênua ("E dentro do grupo") daria vazio — a fixture distingue as duas', () => {
    const f = { ...base, selection: { tipo: ['anel', 'pingente'] } }
    const ingenua = BASE.filter(p =>
      ['v-anel', 'v-pingente'].every(id => (p.filter_value_ids ?? []).includes(id)),
    )
    expect(ids(ingenua)).toEqual([])
    expect(filterProducts(BASE, f, CATALOGO)).toHaveLength(4)
  })

  it('os grupos andam JUNTO com os filtros de sistema: prata 925 até R$ 12', () => {
    const f = { ...base, priceRange: [0, 12] as [number, number], selection: { acabamento: ['prata-925'] } }
    expect(ids(filterProducts(BASE, f, CATALOGO))).toEqual(['a'])
  })

  it('slug que o catálogo não conhece é ignorado — link velho não esvazia a coleção', () => {
    const f = { ...base, selection: { tipo: ['nao-existe'], fantasma: ['x'] } }
    expect(ids(filterProducts(BASE, f, CATALOGO))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('grupo inativo na seleção é ignorado', () => {
    const f = { ...base, selection: { desligado: ['algo'] } }
    expect(filterProducts(BASE, f, CATALOGO)).toHaveLength(5)
  })
})

describe('catalogWithout — o grupo escondido na categoria (feature 66, P2)', () => {
  const base = defaultFilters([0, 20])

  it('sai do catálogo junto com os valores dele', () => {
    const c = catalogWithout(CATALOGO, ['g-acab'])
    expect(c.groups.map(g => g.id)).toEqual(['g-tipo', 'g-pedra', 'g-off'])
    expect(c.values.some(v => v.group_id === 'g-acab')).toBe(false)
  })

  it('a seleção de um grupo escondido que chegue pela URL NÃO filtra — sem bloco, sem chip', () => {
    const c = catalogWithout(CATALOGO, ['g-acab'])
    const f = { ...base, selection: { acabamento: ['prata-925'] } }
    expect(filterProducts(BASE, f, c)).toHaveLength(5)
    expect(activeFilterChips(f, c)).toEqual([])
    expect(filterBlocks(BASE, f, c).map(b => b.group.slug)).not.toContain('acabamento')
  })

  it('sensor: com o catálogo inteiro, a mesma seleção filtra — o recorte é quem desliga', () => {
    const f = { ...base, selection: { acabamento: ['prata-925'] } }
    expect(ids(filterProducts(BASE, f, CATALOGO))).toEqual(['a', 'c'])
  })

  it('sem nada escondido, devolve o mesmo catálogo', () => {
    expect(catalogWithout(CATALOGO, [])).toBe(CATALOGO)
  })
})

describe('filterBlocks — os blocos do painel (FLT-21, FLT-22, FLT-24)', () => {
  const base = defaultFilters([0, 20])
  const bloco = (f: ReturnType<typeof defaultFilters>, slug: string) =>
    filterBlocks(BASE, f, CATALOGO).find(b => b.group.slug === slug)!
  const resumo = (f: ReturnType<typeof defaultFilters>, slug: string) =>
    bloco(f, slug).values.map(v => [v.value.slug, v.count, v.selected, v.disabled])

  it('um bloco por grupo ATIVO com valor presente, na ordem do painel — o inativo não aparece', () => {
    expect(filterBlocks(BASE, base, CATALOGO).map(b => b.group.slug)).toEqual([
      'tipo',
      'acabamento',
      'cor-da-pedra',
    ])
  })

  it('o valor sem produto na base não aparece (Colar), e os outros saem na ordem do painel', () => {
    expect(bloco(base, 'tipo').values.map(v => v.value.name)).toEqual(['Anel', 'Pingente'])
  })

  it('a contagem de cada valor, sem seleção', () => {
    expect(resumo(base, 'tipo')).toEqual([
      ['anel', 2, false, false],
      ['pingente', 2, false, false],
    ])
    expect(resumo(base, 'acabamento')).toEqual([
      ['prata-925', 2, false, false],
      ['ouro', 2, false, false],
    ])
  })

  it('faceta disjuntiva: a seleção do PRÓPRIO grupo não entra na conta do valor vizinho', () => {
    const f = { ...base, selection: { tipo: ['anel'] } }
    // Pingente continua dizendo 2: tocar nele acrescenta, não interseciona.
    expect(resumo(f, 'tipo')).toEqual([
      ['anel', 2, true, false],
      ['pingente', 2, false, false],
    ])
    // E o OUTRO grupo conta já com "anel" aplicado.
    expect(resumo(f, 'acabamento')).toEqual([
      ['prata-925', 1, false, false],
      ['ouro', 1, false, false],
    ])
  })

  it('valor zerado pela seleção aparece DESABILITADO com 0 — e o marcado nunca é desabilitado', () => {
    const f = { ...base, selection: { tipo: ['anel'], 'cor-da-pedra': ['ouro'] } }
    // Nenhum anel tem a pedra Ouro: o valor da pedra zera, mas está marcado — fica tocável.
    expect(resumo(f, 'cor-da-pedra')).toEqual([['ouro', 0, true, false]])
    // E com a pedra marcada, "Anel" zera, mas está marcado; "Pingente" tem 1.
    expect(resumo(f, 'tipo')).toEqual([
      ['anel', 0, true, false],
      ['pingente', 1, false, false],
    ])
    const g = { ...base, selection: { tipo: ['anel'] } }
    expect(resumo(g, 'cor-da-pedra')).toEqual([['ouro', 0, false, true]])
  })

  it('os filtros de sistema entram na contagem: até R$ 12', () => {
    const f = { ...base, priceRange: [0, 12] as [number, number] }
    expect(resumo(f, 'tipo')).toEqual([
      ['anel', 2, false, false],
      ['pingente', 0, false, true],
    ])
  })

  it('catálogo vazio (falha ou carregando) não produz bloco nenhum — FLT-26', () => {
    expect(filterBlocks(BASE, base, { groups: [], values: [] })).toEqual([])
  })

  it('base sem marcação nenhuma não produz bloco', () => {
    expect(filterBlocks([SEM_MARCA], base, CATALOGO)).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  const bounds: [number, number] = [5, 15]

  it('faixa inteira selecionada não conta como filtro ativo', () => {
    expect(hasActiveFilters(defaultFilters(bounds), bounds)).toBe(false)
  })

  it('encolher a faixa conta', () => {
    expect(hasActiveFilters({ ...defaultFilters(bounds), priceRange: [6, 15] }, bounds)).toBe(true)
  })

  it('um valor marcado conta', () => {
    expect(hasActiveFilters({ ...defaultFilters(bounds), selection: { tipo: ['anel'] } }, bounds)).toBe(true)
  })

  it('grupo com lista vazia não conta', () => {
    expect(hasActiveFilters({ ...defaultFilters(bounds), selection: { tipo: [] } }, bounds)).toBe(false)
  })

  it('a ordem não é filtro', () => {
    expect(hasActiveFilters({ ...defaultFilters(bounds), sort: 'menor-preco' }, bounds)).toBe(false)
  })
})

describe('chips (FLT-25)', () => {
  const bounds: [number, number] = [0, 20]

  it('um chip por valor marcado, com o NOME do valor, na ordem do painel; depois os interruptores', () => {
    const f = {
      ...defaultFilters(bounds),
      selection: { acabamento: ['ouro', 'prata-925'], tipo: ['pingente'] },
      inStockOnly: true,
      priceRange: [3, 9] as [number, number],
    }
    expect(activeFilterChips(f, CATALOGO)).toEqual([
      { key: 'valor:tipo:pingente', label: 'Pingente' },
      { key: 'valor:acabamento:prata-925', label: 'Prata 925' },
      { key: 'valor:acabamento:ouro', label: 'Ouro' },
      { key: 'inStockOnly', label: 'Em estoque' },
    ])
  })

  it('cada interruptor tem o seu chip', () => {
    const f = { ...defaultFilters(bounds), inStockOnly: true, onSaleOnly: true, newOnly: true }
    expect(activeFilterChips(f, CATALOGO).map(c => c.label)).toEqual([
      'Em estoque',
      'Com desconto',
      'Novidades',
    ])
  })

  it('"Ouro" em dois grupos são dois chips com chaves diferentes, cada um nomeando só o valor', () => {
    const f = { ...defaultFilters(bounds), selection: { acabamento: ['ouro'], 'cor-da-pedra': ['ouro'] } }
    expect(activeFilterChips(f, CATALOGO)).toEqual([
      { key: 'valor:acabamento:ouro', label: 'Ouro' },
      { key: 'valor:cor-da-pedra:ouro', label: 'Ouro' },
    ])
  })

  it('fechar o chip de um valor tira só aquele valor — e do grupo certo', () => {
    const f = { ...defaultFilters(bounds), selection: { acabamento: ['ouro', 'prata-925'], 'cor-da-pedra': ['ouro'] } }
    expect(clearFilterChip(f, 'valor:acabamento:ouro').selection).toEqual({
      acabamento: ['prata-925'],
      'cor-da-pedra': ['ouro'],
    })
  })

  it('fechar o último valor de um grupo tira o grupo da seleção', () => {
    const f = { ...defaultFilters(bounds), selection: { tipo: ['anel'] } }
    expect(clearFilterChip(f, 'valor:tipo:anel').selection).toEqual({})
  })

  it('slug desconhecido não vira chip', () => {
    const f = { ...defaultFilters(bounds), selection: { tipo: ['sumiu'] } }
    expect(activeFilterChips(f, CATALOGO)).toEqual([])
  })

  it('fechar o chip de um interruptor o desliga', () => {
    const f = { ...defaultFilters(bounds), inStockOnly: true }
    expect(clearFilterChip(f, 'inStockOnly').inStockOnly).toBe(false)
  })

  it('valor com o slug de um interruptor não desliga o interruptor', () => {
    const f = { ...defaultFilters(bounds), selection: { tipo: ['inStockOnly'] }, inStockOnly: true }
    const out = clearFilterChip(f, 'valor:tipo:inStockOnly')
    expect(out.selection).toEqual({})
    expect(out.inStockOnly).toBe(true)
  })
})

describe('toggleFilterValue / clearFilters', () => {
  it('alterna o valor sem mexer no resto do estado', () => {
    const f = { ...defaultFilters([0, 20]), inStockOnly: true }
    const on = toggleFilterValue(f, 'tipo', 'anel')
    expect(on.selection).toEqual({ tipo: ['anel'] })
    expect(on.inStockOnly).toBe(true)
    expect(toggleFilterValue(toggleFilterValue(on, 'tipo', 'pingente'), 'tipo', 'anel').selection).toEqual({
      tipo: ['pingente'],
    })
    expect(toggleFilterValue(on, 'tipo', 'anel').selection).toEqual({})
  })

  it('"Limpar" zera seleção, preço e interruptores — e mantém a ordem, que não é filtro', () => {
    const f = {
      ...defaultFilters([0, 20]),
      selection: { tipo: ['anel'] },
      priceRange: [3, 9] as [number, number],
      inStockOnly: true,
      onSaleOnly: true,
      newOnly: true,
      sort: 'maior-preco' as const,
    }
    expect(clearFilters(f, [0, 20])).toEqual({ ...defaultFilters([0, 20]), sort: 'maior-preco' })
  })
})

describe('sortProducts', () => {
  const items = [
    product({ id: 'a', price: 12, is_new: false }),
    product({ id: 'b', price: 7, is_new: true }),
    product({ id: 'c', price: 9, is_new: false }),
  ]

  it('relevância preserva a ordem que veio do banco', () => {
    expect(sortProducts(items, 'relevancia').map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('menor e maior preço', () => {
    expect(sortProducts(items, 'menor-preco').map(p => p.id)).toEqual(['b', 'c', 'a'])
    expect(sortProducts(items, 'maior-preco').map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('novidades sobe os is_new e não muta a lista original', () => {
    expect(sortProducts(items, 'novidades')[0].id).toBe('b')
    expect(items.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })
})
