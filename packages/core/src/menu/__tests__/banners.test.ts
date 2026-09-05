import { describe, expect, it } from 'vitest'
import {
  MENU_BANNER_LIMIT,
  menuBannerRefusal,
  resolveMenuBanners,
  type MenuBanner,
} from '../banners'
import type { MenuProduct } from '../target'
import type { MenuCategory } from '../menu'

/**
 * Feature 39 — `NAV-28` a `NAV-35`.
 *
 * O que este arquivo guarda antes de tudo é a regra herdada do card da 16: **destino que não resolve
 * não renderiza**. O resto (herança de texto, arte por dispositivo, o limite de dois) é o que a
 * feature acrescenta em cima dela.
 */
const cat = (id: string, name: string, overrides: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...overrides,
})

const CATEGORIAS: MenuCategory[] = [
  cat('joias', 'Joias'),
  cat('afetivas', 'Coleção Afetivas', { description: 'Peças com o material que você envia.' }),
  cat('oculta', 'Oculta', { active: false }),
]

const PRODUTOS: MenuProduct[] = [
  { id: 'p1', name: 'Pingente Gota', slug: 'pingente-gota', description: 'Resina e prata.' },
]

const ctx = { categories: CATEGORIAS, products: PRODUTOS }

const paraCategoria = (id: string, extra: Partial<MenuBanner> = {}): MenuBanner => ({
  target: { kind: 'category', id },
  ...extra,
})

const jsonb = (desktop: unknown[], mobile: unknown[] = []) => ({ desktop, mobile })

// ---------------------------------------------------------------------------
// NAV-30 — destino validado na leitura
// ---------------------------------------------------------------------------
describe('destino validado na leitura (NAV-30)', () => {
  it('resolve o banner de categoria com a canônica do destino', () => {
    const [banner] = resolveMenuBanners(ctx, jsonb([paraCategoria('afetivas')]), 'desktop')
    expect(banner.href).toBe('/afetivas')
    expect(banner.external).toBe(false)
  })

  it('destino APAGADO some da lista, e o painel encolhe sem deixar buraco', () => {
    const raw = jsonb([paraCategoria('sumiu'), paraCategoria('afetivas')])
    const saida = resolveMenuBanners(ctx, raw, 'desktop')
    expect(saida).toHaveLength(1)
    expect(saida[0].title).toBe('Coleção Afetivas')
  })

  it('destino INATIVO some da lista', () => {
    expect(resolveMenuBanners(ctx, jsonb([paraCategoria('oculta')]), 'desktop')).toEqual([])
  })

  it('banner de produto resolve para a canônica do produto', () => {
    const raw = jsonb([{ target: { kind: 'product', id: 'p1' } }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      href: '/produtos/pingente-gota',
      title: 'Pingente Gota',
      subtitle: 'Resina e prata.',
    })
  })

  it('banner de produto sem a lista de produtos não renderiza — o destino não foi provado', () => {
    const raw = jsonb([{ target: { kind: 'product', id: 'p1' } }])
    expect(resolveMenuBanners({ categories: CATEGORIAS }, raw, 'desktop')).toEqual([])
  })

  it('banner externo sai marcado como externo — a tela põe noopener nele', () => {
    const raw = jsonb([
      { target: { kind: 'url', href: 'https://instagram.com/umaestrelinha' }, title: 'Instagram' },
    ])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      href: 'https://instagram.com/umaestrelinha',
      external: true,
    })
  })

  it('banner com endereço digitado que não é rota da loja não renderiza', () => {
    const raw = jsonb([{ target: { kind: 'url', href: '/pagina-que-nao-existe' }, title: 'X' }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toEqual([])
  })

  it('banner com http:// não renderiza — a mesma régua da gravação (NAV-31)', () => {
    const raw = jsonb([{ target: { kind: 'url', href: 'http://exemplo.com' }, title: 'X' }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// jsonb malformado — nada aqui pode lançar dentro da renderização do header
// ---------------------------------------------------------------------------
describe('jsonb malformado', () => {
  const invalidos: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['string', 'banner'],
    ['número', 42],
    ['array na raiz', [paraCategoria('afetivas')]],
    ['objeto sem a superfície', { mobile: [paraCategoria('afetivas')] }],
    ['superfície que não é lista', { desktop: paraCategoria('afetivas') }],
    ['superfície nula', { desktop: null }],
  ]

  it.each(invalidos)('%s devolve lista vazia, sem lançar', (_label, raw) => {
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toEqual([])
  })

  const itensInvalidos: [string, unknown][] = [
    ['item null', null],
    ['item string', 'afetivas'],
    ['item array', [{ target: { kind: 'category', id: 'afetivas' } }]],
    ['item sem target', { title: 'Sem destino' }],
    ['item com target nulo', { target: null, title: 'Sem destino' }],
    ['item com kind desconhecido', { target: { kind: 'pagina', id: 'afetivas' } }],
  ]

  it.each(itensInvalidos)('%s é descartado, e o banner bom ao lado continua', (_label, ruim) => {
    const saida = resolveMenuBanners(ctx, jsonb([ruim, paraCategoria('afetivas')]), 'desktop')
    expect(saida).toHaveLength(1)
    expect(saida[0].title).toBe('Coleção Afetivas')
  })
})

// ---------------------------------------------------------------------------
// NAV-32 — herança de título e texto
// ---------------------------------------------------------------------------
describe('herança do destino (NAV-32)', () => {
  it('sem título, usa o nome do destino', () => {
    expect(resolveMenuBanners(ctx, jsonb([paraCategoria('afetivas')]), 'desktop')[0].title).toBe(
      'Coleção Afetivas',
    )
  })

  it('sem texto, usa a descrição do destino', () => {
    expect(resolveMenuBanners(ctx, jsonb([paraCategoria('afetivas')]), 'desktop')[0].subtitle).toBe(
      'Peças com o material que você envia.',
    )
  })

  it('o que a dona escreveu vence a herança', () => {
    const raw = jsonb([
      paraCategoria('afetivas', { title: 'Para lembrar todo dia', subtitle: 'Feito à mão.' }),
    ])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      title: 'Para lembrar todo dia',
      subtitle: 'Feito à mão.',
    })
  })

  it('título e texto em branco caem na herança — espaço não é escolha', () => {
    const raw = jsonb([paraCategoria('afetivas', { title: '   ', subtitle: '  ' })])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      title: 'Coleção Afetivas',
      subtitle: 'Peças com o material que você envia.',
    })
  })

  it('destino sem descrição deixa o texto em null, sem inventar frase', () => {
    expect(resolveMenuBanners(ctx, jsonb([paraCategoria('joias')]), 'desktop')[0].subtitle).toBeNull()
  })

  it('o selo é opcional e sai null quando não há', () => {
    const semSelo = resolveMenuBanners(ctx, jsonb([paraCategoria('joias')]), 'desktop')[0]
    const comSelo = resolveMenuBanners(
      ctx,
      jsonb([paraCategoria('joias', { badge: 'Novidade' })]),
      'desktop',
    )[0]
    expect(semSelo.badge).toBeNull()
    expect(comSelo.badge).toBe('Novidade')
  })

  it('endereço digitado não empresta nome: sem título e sem arte, não há banner', () => {
    const raw = jsonb([{ target: { kind: 'url', href: '/sobre' } }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toEqual([])
  })

  it('endereço digitado com título renderiza normalmente', () => {
    const raw = jsonb([{ target: { kind: 'url', href: '/sobre' }, title: 'Quem faz' }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      title: 'Quem faz',
      href: '/sobre',
    })
  })

  it('endereço digitado só com arte renderiza — a foto é o anúncio', () => {
    const raw = jsonb([{ target: { kind: 'url', href: '/sobre' }, image_desktop: '/arte.jpg' }])
    expect(resolveMenuBanners(ctx, raw, 'desktop')[0]).toMatchObject({
      title: null,
      image: '/arte.jpg',
    })
  })
})

// ---------------------------------------------------------------------------
// NAV-33 / NAV-34 — a arte por dispositivo, e o reaproveitamento declarado
// ---------------------------------------------------------------------------
describe('a arte por dispositivo (NAV-33, NAV-34)', () => {
  const comDuasArtes = paraCategoria('afetivas', {
    image_desktop: '/desktop.jpg',
    image_mobile: '/celular.jpg',
  })

  it('cada superfície usa a própria arte, e nenhuma declara reaproveitamento', () => {
    const noDesktop = resolveMenuBanners(ctx, jsonb([comDuasArtes], [comDuasArtes]), 'desktop')[0]
    const noCelular = resolveMenuBanners(ctx, jsonb([comDuasArtes], [comDuasArtes]), 'mobile')[0]
    expect(noDesktop).toMatchObject({ image: '/desktop.jpg', imageReused: false })
    expect(noCelular).toMatchObject({ image: '/celular.jpg', imageReused: false })
  })

  it('sem a arte do celular, o celular usa a do computador e DECLARA que reaproveitou', () => {
    const banner = paraCategoria('afetivas', { image_desktop: '/desktop.jpg' })
    expect(resolveMenuBanners(ctx, jsonb([], [banner]), 'mobile')[0]).toMatchObject({
      image: '/desktop.jpg',
      imageReused: true,
    })
  })

  it('sem a arte do computador, o computador usa a do celular e declara', () => {
    const banner = paraCategoria('afetivas', { image_mobile: '/celular.jpg' })
    expect(resolveMenuBanners(ctx, jsonb([banner]), 'desktop')[0]).toMatchObject({
      image: '/celular.jpg',
      imageReused: true,
    })
  })

  it('sem arte nenhuma, o banner NÃO some — vira o bloco de cor com o texto', () => {
    const saida = resolveMenuBanners(ctx, jsonb([paraCategoria('afetivas')]), 'desktop')[0]
    expect(saida.image).toBeNull()
    expect(saida.imageReused).toBe(false)
    expect(saida.title).toBe('Coleção Afetivas')
  })

  it('arte em branco lê como arte ausente', () => {
    const banner = paraCategoria('afetivas', { image_desktop: '   ', image_mobile: '/celular.jpg' })
    expect(resolveMenuBanners(ctx, jsonb([banner]), 'desktop')).toMatchObject([
      { image: '/celular.jpg', imageReused: true },
    ])
  })
})

// ---------------------------------------------------------------------------
// NAV-28 / NAV-29 / NAV-35 — o limite de dois, e o painel sem banner
// ---------------------------------------------------------------------------
describe('o limite de dois (NAV-28, NAV-29)', () => {
  it('as duas superfícies são independentes — banner do desktop não vaza para o celular', () => {
    const raw = jsonb([paraCategoria('afetivas')], [paraCategoria('joias')])
    expect(resolveMenuBanners(ctx, raw, 'desktop').map(b => b.title)).toEqual(['Coleção Afetivas'])
    expect(resolveMenuBanners(ctx, raw, 'mobile').map(b => b.title)).toEqual(['Joias'])
  })

  it('dois banners passam inteiros', () => {
    const raw = jsonb([paraCategoria('afetivas'), paraCategoria('joias')])
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toHaveLength(2)
  })

  it('um terceiro gravado à mão não chega ao painel — a vaga é de layout', () => {
    const raw = jsonb([paraCategoria('afetivas'), paraCategoria('joias'), paraCategoria('afetivas')])
    expect(resolveMenuBanners(ctx, raw, 'desktop')).toHaveLength(MENU_BANNER_LIMIT)
  })

  it('o corte acontece DEPOIS de resolver: destino apagado não gasta vaga', () => {
    const raw = jsonb([paraCategoria('sumiu'), paraCategoria('afetivas'), paraCategoria('joias')])
    expect(resolveMenuBanners(ctx, raw, 'desktop').map(b => b.title)).toEqual([
      'Coleção Afetivas',
      'Joias',
    ])
  })

  it('menuBannerRefusal recusa o terceiro, com o motivo em texto', () => {
    const motivo = menuBannerRefusal([{}, {}, {}])
    expect(motivo).toBeTypeOf('string')
    expect(motivo).toContain('2')
    expect(motivo).toContain('3')
  })

  it('menuBannerRefusal aceita zero, um e dois', () => {
    expect(menuBannerRefusal([])).toBeNull()
    expect(menuBannerRefusal([{}])).toBeNull()
    expect(menuBannerRefusal([{}, {}])).toBeNull()
  })

  it('menuBannerRefusal devolve string | null, e não união por booleano', () => {
    expect(menuBannerRefusal(null as unknown as unknown[])).toBeNull()
    expect(typeof menuBannerRefusal([{}, {}, {}])).toBe('string')
  })

  it('o limite é dois — âncora do número que a AC cita', () => {
    expect(MENU_BANNER_LIMIT).toBe(2)
  })
})

describe('painel sem banner (NAV-35)', () => {
  it('lista vazia devolve lista vazia — nenhum nó reservado', () => {
    expect(resolveMenuBanners(ctx, jsonb([]), 'desktop')).toEqual([])
  })

  it('categoria sem menu_banners devolve lista vazia', () => {
    expect(resolveMenuBanners(ctx, undefined, 'desktop')).toEqual([])
  })
})
