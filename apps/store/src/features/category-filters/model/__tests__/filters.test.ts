import { describe, expect, it } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import type { FilterCatalog } from '@estrelinha/core/filters'
import {
  activeFilterChips,
  catalogWithout,
  clearFilterChip,
  clearFilters,
  defaultFilters,
  filterBlocks,
  filterMatches,
  filterProducts,
  hasActiveFilters,
  passesSystem,
  passesSystemVariant,
  priceBounds,
  sortMatches,
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

/**
 * Feature 67 — a peça passa pela VARIAÇÃO (VFL-09..11, VFL-13, VFL-15).
 *
 * A fixture DIVERGE de propósito (`L-013`): a peça custa R$ 50 e a prata, R$ 95. Com os dois preços
 * iguais, testar o preço da peça e o da variação daria o mesmo veredito e nenhuma asserção abaixo
 * distinguiria as duas regras. A prata tem duas linhas, a primeira SEM estoque, para a preferência
 * pelo estoque (VFL-11) ter o que escolher.
 */
describe('filterMatches — a peça que passa pela variação (feature 67)', () => {
  const bounds: [number, number] = [0, 200]
  const base = defaultFilters(bounds)
  const prata = { acabamento: ['prata-925'] }
  const ouro = { acabamento: ['ouro'] }

  const linha = (over: Partial<ProductVariant>): ProductVariant => ({
    id: 'v',
    product_id: 'colar',
    option_values: {},
    name: null,
    sku: null,
    price: null,
    compare_price: null,
    stock: 5,
    weight_kg: null,
    image_url: null,
    is_active: true,
    position: 0,
    nuvemshop_id: null,
    ...over,
  })

  const colar = (over: Partial<Product> = {}): Product =>
    product({
      id: 'colar',
      price: 50,
      options: [
        { name: 'Cor', values: ['Folheado a Ouro', 'Prata 925'], position: 0 },
        { name: 'Letra', values: ['A', 'B'], position: 1 },
      ],
      variants: [
        linha({ id: 'v-ouro-a', option_values: { Cor: 'Folheado a Ouro', Letra: 'A' }, price: 60, position: 0 }),
        linha({ id: 'v-prata-a', option_values: { Cor: 'Prata 925', Letra: 'A' }, price: 95, stock: 0, position: 1 }),
        linha({
          id: 'v-prata-b',
          option_values: { Cor: 'Prata 925', Letra: 'B' },
          price: 95,
          compare_price: 120,
          stock: 2,
          position: 2,
        }),
      ],
      filter_value_ids: ['v-pingente'],
      option_marks: [
        { option_name: 'Cor', option_value: 'Prata 925', value_id: 'v-prata' },
        { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'v-ouro' },
      ],
      ...over,
    })

  const um = (ps: Product[], f = base) => filterMatches(ps, f, CATALOGO)
  const variante = (ps: Product[], f = base) => um(ps, f).map(m => m.variant?.id ?? null)

  it('passa pela opção e abre na variação com estoque, mesmo com outra de posição menor (VFL-11)', () => {
    expect(variante([colar()], { ...base, selection: prata })).toEqual(['v-prata-b'])
  })

  it('sem estoque em jogo (stock_policy none), vence a de MENOR posição — a preferência só desempata', () => {
    expect(variante([colar({ stock_policy: 'none' })], { ...base, selection: prata })).toEqual(['v-prata-a'])
  })

  it('o preço testado é o DA VARIAÇÃO: prata a R$ 95 não passa em "até R$ 80", com a peça a R$ 50 (VFL-10)', () => {
    const f = { ...base, selection: prata, priceRange: [0, 80] as [number, number] }
    expect(um([colar()], f)).toEqual([])
    // Sensor: a regra antiga — o filtro de sistema só sobre a peça — deixaria passar.
    expect(passesSystem(colar(), f)).toBe(true)
  })

  it('e o contrário: a prata entra em "R$ 90 a R$ 100" com a peça a R$ 50 fora da faixa', () => {
    const f = { ...base, selection: prata, priceRange: [90, 100] as [number, number] }
    expect(variante([colar()], f)).toEqual(['v-prata-b'])
    // Sem seleção, a mesma faixa testa a peça, como na 66: o card de hoje mostra o preço dela.
    expect(um([colar()], { ...base, priceRange: [90, 100] })).toEqual([])
  })

  it('o ouro, a R$ 60, passa em "até R$ 80" e abre na linha dele', () => {
    const f = { ...base, selection: ouro, priceRange: [0, 80] as [number, number] }
    expect(variante([colar()], f)).toEqual(['v-ouro-a'])
  })

  it('variação sem preço cai no preço da peça (`price ?? preço base`)', () => {
    const p = colar({
      variants: [linha({ id: 'v-prata-sem', option_values: { Cor: 'Prata 925', Letra: 'A' }, price: null })],
    })
    expect(variante([p], { ...base, selection: prata, priceRange: [0, 80] })).toEqual(['v-prata-sem'])
    expect(um([p], { ...base, selection: prata, priceRange: [60, 80] })).toEqual([])
  })

  it('"em estoque" exige estoque DA VARIAÇÃO: sem a prata B, a A esgotada não abre o card (VFL-10)', () => {
    const f = { ...base, selection: prata, inStockOnly: true }
    expect(variante([colar()], f)).toEqual(['v-prata-b'])
    const semB = colar({ variants: colar().variants.map(v => (v.id === 'v-prata-b' ? { ...v, stock: 0 } : v)) })
    expect(um([semB], f)).toEqual([])
    // Sensor: a regra da peça diz "em estoque" — a grade tem linha ativa com preço.
    expect(passesSystem(semB, f)).toBe(true)
  })

  it('"com desconto" olha o "de" DA VARIAÇÃO: a prata B tem, o ouro não', () => {
    expect(variante([colar()], { ...base, selection: prata, onSaleOnly: true })).toEqual(['v-prata-b'])
    expect(um([colar()], { ...base, selection: ouro, onSaleOnly: true })).toEqual([])
  })

  it('"novidades" continua sendo da peça, também quando a variação decide', () => {
    expect(um([colar()], { ...base, selection: prata, newOnly: true })).toEqual([])
    expect(variante([colar({ is_new: true })], { ...base, selection: prata, newOnly: true })).toEqual(['v-prata-b'])
  })

  it('a marcação na PEÇA TODA vence a da opção: passa sem variação, o card de hoje (VFL-13)', () => {
    const p = colar({ filter_value_ids: ['v-pingente', 'v-prata'] })
    expect(variante([p], { ...base, selection: prata })).toEqual([null])
  })

  it('seleção só de grupo satisfeito pela peça toda (Pingente) não escolhe variação', () => {
    expect(variante([colar()], { ...base, selection: { tipo: ['pingente'] } })).toEqual([null])
  })

  it('sem seleção nenhuma, ninguém abre em variação — tirar o último filtro devolve o card de hoje', () => {
    expect(variante([colar(), ANEL_PRATA])).toEqual([null, null])
  })

  it('peça sem a marcação por opção se comporta exatamente como na 66', () => {
    const f = { ...base, selection: prata }
    expect(filterProducts(BASE, f, CATALOGO).map(p => p.id)).toEqual(['a', 'c'])
    expect(um(BASE, f).map(m => m.variant)).toEqual([null, null])
  })

  it('`filterProducts` é a projeção de `filterMatches` — as duas não divergem', () => {
    const f = { ...base, selection: prata, priceRange: [90, 100] as [number, number] }
    const lista = [colar(), PINGENTE_PRATA, ANEL_PRATA]
    expect(filterProducts(lista, f, CATALOGO)).toEqual(um(lista, f).map(m => m.product))
    expect(ids(filterProducts(lista, f, CATALOGO))).toEqual(['colar'])
  })

  it('o produto devolvido é o MESMO objeto que entrou, não a cópia que vai a `core`', () => {
    const p = colar()
    expect(um([p], { ...base, selection: prata })[0].product).toBe(p)
  })
})

describe('passesSystemVariant — os filtros de sistema sobre a linha (feature 67)', () => {
  const base = defaultFilters([0, 200])
  const p = product({ id: 'x', price: 50, compare_price: 70, stock_policy: 'track' })
  const v = (over: Partial<ProductVariant>): ProductVariant => ({
    id: 'v', product_id: 'x', option_values: {}, name: null, sku: null, price: 95, compare_price: null,
    stock: 1, weight_kg: null, image_url: null, is_active: true, position: 0, nuvemshop_id: null, ...over,
  })

  it('a faixa usa o preço da linha, inclusiva nas duas pontas', () => {
    expect(passesSystemVariant(p, v({}), { ...base, priceRange: [95, 95] })).toBe(true)
    expect(passesSystemVariant(p, v({}), { ...base, priceRange: [0, 94.99] })).toBe(false)
  })

  it('o "de" ausente na linha cai no da peça — e R$ 70 sobre R$ 95 não é desconto', () => {
    expect(passesSystemVariant(p, v({}), { ...base, onSaleOnly: true })).toBe(false)
    expect(passesSystemVariant(p, v({ price: null }), { ...base, onSaleOnly: true })).toBe(true)
  })

  it('estoque zero com `track` reprova, com `backorder` passa', () => {
    expect(passesSystemVariant(p, v({ stock: 0 }), { ...base, inStockOnly: true })).toBe(false)
    expect(passesSystemVariant({ ...p, stock_policy: 'backorder' }, v({ stock: 0 }), { ...base, inStockOnly: true })).toBe(true)
  })
})

describe('filterBlocks — as contagens com a variação (feature 67, VFL-15)', () => {
  const base = defaultFilters([0, 200])
  const linha = (id: string, cor: string, price: number, position: number): ProductVariant => ({
    id, product_id: 'colar', option_values: { Cor: cor }, name: null, sku: null, price, compare_price: null,
    stock: 3, weight_kg: null, image_url: null, is_active: true, position, nuvemshop_id: null,
  })
  // Três linhas de prata (letras diferentes, no mesmo texto de opção) e uma de ouro.
  const COLAR = product({
    id: 'colar',
    price: 50,
    options: [{ name: 'Cor', values: ['Prata 925', 'Folheado a Ouro'], position: 0 }],
    variants: [
      linha('p1', 'Prata 925', 95, 0),
      { ...linha('p2', 'Prata 925', 95, 1), option_values: { Cor: 'Prata 925', Letra: 'B' } },
      { ...linha('p3', 'Prata 925', 95, 2), option_values: { Cor: 'Prata 925', Letra: 'C' } },
      linha('o1', 'Folheado a Ouro', 60, 3),
    ],
    filter_value_ids: [],
    option_marks: [
      { option_name: 'Cor', option_value: 'Prata 925', value_id: 'v-prata' },
      { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'v-ouro' },
    ],
  })
  const contagem = (f = base) =>
    Object.fromEntries(
      filterBlocks([COLAR], f, CATALOGO).flatMap(b => b.values.map(v => [v.value.id, v.count])),
    )

  it('o valor marcado só por opção acende o bloco e conta a peça UMA vez, com três linhas casando', () => {
    expect(contagem()).toEqual({ 'v-prata': 1, 'v-ouro': 1 })
  })

  it('o preço da variação entra na conta: em "até R$ 80" a prata zera e o ouro segue', () => {
    expect(contagem({ ...base, priceRange: [0, 80] })).toEqual({ 'v-prata': 0, 'v-ouro': 1 })
  })
})

describe('sortMatches — sem variação casada, a ordem dos pares é a das peças', () => {
  const pares = [
    { product: product({ id: 'a', price: 12 }), variant: null },
    { product: product({ id: 'b', price: 7, is_new: true }), variant: null },
    { product: product({ id: 'c', price: 9 }), variant: null },
  ]

  it('mesma ordem que `sortProducts` nas quatro opções, carregando a variação junto', () => {
    for (const sort of ['relevancia', 'menor-preco', 'maior-preco', 'novidades'] as const) {
      expect(sortMatches(pares, sort).map(m => m.product.id), sort).toEqual(
        sortProducts(pares.map(m => m.product), sort).map(p => p.id),
      )
    }
    expect(sortMatches(pares, 'menor-preco').map(m => m.product.id)).toEqual(['b', 'c', 'a'])
  })
})

/**
 * Pós-verificação da 67 (decisão do usuário): "menor/maior preço" ordena pelo preço que o CARD
 * MOSTRA — o da variação casada, com recuo no da peça. As fixtures invertem a ordem de propósito
 * (`L-013`): pela peça, `a` (R$ 40) vem antes de `b` (R$ 60); pelo card, `a` mostra R$ 130 e `b`,
 * R$ 70. Uma ordenação que ainda olhasse a peça reprova as duas asserções de preço.
 */
describe('sortMatches — ordena pelo preço que o card mostra', () => {
  const varia = (over: Partial<ProductVariant>): ProductVariant => ({
    id: 'v', product_id: 'p', option_values: {}, name: null, sku: null, price: null,
    compare_price: null, stock: 3, weight_kg: null, image_url: null, is_active: true, position: 0,
    nuvemshop_id: null,
    ...over,
  })
  const pares = [
    { product: product({ id: 'a', price: 40 }), variant: varia({ id: 'va', price: 130 }) },
    { product: product({ id: 'b', price: 60, is_new: true }), variant: varia({ id: 'vb', price: 70 }) },
    // Sem variação casada: vale o preço da peça (R$ 100).
    { product: product({ id: 'c', price: 100 }), variant: null },
    // Variação sem preço: recua no da peça (R$ 80), como o card. Fica no MEIO da ordem de propósito:
    // um `null` tratado como zero a mandaria para a ponta.
    { product: product({ id: 'd', price: 80 }), variant: varia({ id: 'vd', price: null }) },
  ]
  const ids = (sort: Parameters<typeof sortMatches>[1]) => sortMatches(pares, sort).map(m => m.product.id)

  it('menor preço: 70 (b) · 80 (d, recuo) · 100 (c, peça) · 130 (a)', () => {
    expect(ids('menor-preco')).toEqual(['b', 'd', 'c', 'a'])
    // A ordem pela peça seria outra — a fixture discrimina.
    expect(sortProducts(pares.map(m => m.product), 'menor-preco').map(p => p.id)).toEqual(['a', 'b', 'd', 'c'])
  })

  it('maior preço: o inverso, pela mesma régua', () => {
    expect(ids('maior-preco')).toEqual(['a', 'c', 'd', 'b'])
  })

  it('a variação viaja com a peça na ordem nova', () => {
    expect(sortMatches(pares, 'menor-preco').map(m => m.variant?.id ?? null)).toEqual(['vb', 'vd', null, 'va'])
  })

  it('relevância e novidades não mudam, e a lista original não é mutada', () => {
    expect(ids('relevancia')).toEqual(['a', 'b', 'c', 'd'])
    expect(ids('novidades')[0]).toBe('b')
    expect(pares.map(m => m.product.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
