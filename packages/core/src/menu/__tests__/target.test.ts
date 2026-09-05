import { describe, expect, it } from 'vitest'
import { ROUTE_SLUGS } from '../../routes'
import { menuTargetRefusal, resolveMenuTarget, type MenuProduct } from '../target'
import type { MenuCategory } from '../menu'

/**
 * Feature 39 — `NAV-10`, `NAV-11`, `NAV-30` e `NAV-31`.
 *
 * O que este arquivo prova, além de cada regra: que a recusa da **gravação** e a resolução da
 * **leitura** julgam o endereço digitado pela mesma régua. Duas réguas foi o defeito que a AC
 * `NAV-31` nomeia.
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
  cat('correntes', 'Correntes', { parent_id: 'joias', description: 'Corrente de prata 925.' }),
  cat('oculta', 'Oculta', { active: false }),
]

const PRODUTOS: MenuProduct[] = [
  { id: 'p1', name: 'Pingente Gota', slug: 'pingente-gota', description: 'Resina e prata.' },
  { id: 'p2', name: 'Anel Memória', slug: 'anel-memoria', is_active: false },
]

const ctx = { categories: CATEGORIAS, products: PRODUTOS }

// ---------------------------------------------------------------------------
// NAV-30 — destino de categoria e de produto, validado na LEITURA
// ---------------------------------------------------------------------------
describe('destino de categoria (NAV-30)', () => {
  it('resolve para a canônica da categoria, com nome e descrição para herdar', () => {
    expect(resolveMenuTarget(ctx, { kind: 'category', id: 'correntes' })).toEqual({
      href: '/joias/correntes',
      external: false,
      name: 'Correntes',
      description: 'Corrente de prata 925.',
    })
  })

  it('categoria APAGADA devolve null — a referência mora em jsonb, onde não cabe FK', () => {
    expect(resolveMenuTarget(ctx, { kind: 'category', id: 'sumiu' })).toBeNull()
  })

  it('categoria INATIVA devolve null — a RLS já a esconderia da cliente', () => {
    expect(resolveMenuTarget(ctx, { kind: 'category', id: 'oculta' })).toBeNull()
  })

  it('o pai inativo não entra no href — a canônica servida é a de um segmento', () => {
    const categories = CATEGORIAS.map(c => (c.id === 'joias' ? { ...c, active: false } : c))
    expect(resolveMenuTarget({ categories }, { kind: 'category', id: 'correntes' })?.href).toBe(
      '/correntes',
    )
  })

  it('categoria raiz sai com um segmento só', () => {
    expect(resolveMenuTarget(ctx, { kind: 'category', id: 'joias' })?.href).toBe('/joias')
  })
})

describe('destino de produto (NAV-30)', () => {
  it('resolve para /produtos/:slug', () => {
    expect(resolveMenuTarget(ctx, { kind: 'product', id: 'p1' })).toEqual({
      href: '/produtos/pingente-gota',
      external: false,
      name: 'Pingente Gota',
      description: 'Resina e prata.',
    })
  })

  it('produto apagado devolve null', () => {
    expect(resolveMenuTarget(ctx, { kind: 'product', id: 'p9' })).toBeNull()
  })

  it('produto despublicado devolve null', () => {
    expect(resolveMenuTarget(ctx, { kind: 'product', id: 'p2' })).toBeNull()
  })

  it('sem a lista de produtos, o destino não é provado e não renderiza', () => {
    // Lista AUSENTE é "ainda não sei" — ela é montada tarde, quando o painel abre. Renderizar antes
    // da prova faria o banner piscar e, com o produto apagado, levar a 404.
    expect(resolveMenuTarget({ categories: CATEGORIAS }, { kind: 'product', id: 'p1' })).toBeNull()
  })

  it('lista vazia também não resolve — mas por não achar, não por não saber', () => {
    expect(resolveMenuTarget({ categories: CATEGORIAS, products: [] }, { kind: 'product', id: 'p1' })).toBeNull()
  })

  it('produto sem slug devolve null em vez de montar /produtos/', () => {
    const products = [{ id: 'p3', name: 'Sem slug', slug: '   ' }]
    expect(resolveMenuTarget({ categories: [], products }, { kind: 'product', id: 'p3' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// NAV-10 — endereço interno conferido contra as rotas declaradas
// ---------------------------------------------------------------------------
describe('endereço digitado, interno (NAV-10)', () => {
  it('/sobre resolve', () => {
    expect(menuTargetRefusal({ kind: 'url', href: '/sobre' })).toBeNull()
    expect(resolveMenuTarget(ctx, { kind: 'url', href: '/sobre' })).toEqual({
      href: '/sobre',
      external: false,
      name: null,
      description: null,
    })
  })

  it('a raiz da loja resolve', () => {
    expect(menuTargetRefusal({ kind: 'url', href: '/' })).toBeNull()
    expect(resolveMenuTarget(ctx, { kind: 'url', href: '/' })?.href).toBe('/')
  })

  it('/sobree é recusado, e o motivo cita as rotas válidas', () => {
    const motivo = menuTargetRefusal({ kind: 'url', href: '/sobree' })
    expect(motivo).toBeTypeOf('string')
    expect(motivo).toContain('/sobree')
    expect(motivo).toContain('/sobre')
    expect(motivo).toContain('/politicas')
  })

  it('toda rota declarada da loja é aceita — a régua é ROUTE_SLUGS, não uma segunda lista', () => {
    const recusadas = ROUTE_SLUGS.filter(
      slug => menuTargetRefusal({ kind: 'url', href: `/${slug}` }) !== null,
    )
    expect(recusadas).toEqual([])
    // Âncora: a varredura de fato passou por uma lista de rotas de verdade.
    expect(ROUTE_SLUGS.length).toBeGreaterThanOrEqual(10)
  })

  it('normaliza antes de julgar: “sobre”, “/sobre/” e “  /sobre  ” são o mesmo endereço', () => {
    for (const bruto of ['sobre', '/sobre/', '  /sobre  ']) {
      expect(menuTargetRefusal({ kind: 'url', href: bruto })).toBeNull()
      expect(resolveMenuTarget(ctx, { kind: 'url', href: bruto })?.href).toBe('/sobre')
    }
  })

  it('endereço protocol-relative não vira link para outro domínio', () => {
    // `//exemplo.com` atravessaria como "interno" e mandaria a cliente para fora da loja.
    expect(menuTargetRefusal({ kind: 'url', href: '//exemplo.com' })).toBeTypeOf('string')
    expect(resolveMenuTarget(ctx, { kind: 'url', href: '//exemplo.com' })).toBeNull()
  })

  it('esquema que não é http recai na régua de rota e é recusado', () => {
    expect(menuTargetRefusal({ kind: 'url', href: 'javascript:alert(1)' })).toBeTypeOf('string')
    expect(menuTargetRefusal({ kind: 'url', href: 'mailto:adri@exemplo.com' })).toBeTypeOf('string')
  })
})

// ---------------------------------------------------------------------------
// NAV-11 — externo exige https
// ---------------------------------------------------------------------------
describe('endereço digitado, externo (NAV-11)', () => {
  it('https:// passa, e sai marcado como externo', () => {
    expect(menuTargetRefusal({ kind: 'url', href: 'https://instagram.com/umaestrelinha' })).toBeNull()
    expect(resolveMenuTarget(ctx, { kind: 'url', href: 'https://instagram.com/umaestrelinha' })).toEqual({
      href: 'https://instagram.com/umaestrelinha',
      external: true,
      name: null,
      description: null,
    })
  })

  it('http:// é recusado, com o motivo dizendo o que fazer', () => {
    const motivo = menuTargetRefusal({ kind: 'url', href: 'http://instagram.com' })
    expect(motivo).toContain('https://')
    expect(resolveMenuTarget(ctx, { kind: 'url', href: 'http://instagram.com' })).toBeNull()
  })

  it('https:// sem domínio é recusado', () => {
    expect(menuTargetRefusal({ kind: 'url', href: 'https://' })).toBeTypeOf('string')
    expect(menuTargetRefusal({ kind: 'url', href: 'https:///caminho' })).toBeTypeOf('string')
  })
})

// ---------------------------------------------------------------------------
// A forma do veredito, e as bordas do jsonb
// ---------------------------------------------------------------------------
describe('menuTargetRefusal (formato e bordas)', () => {
  it('devolve string | null — nunca união discriminada por booleano', () => {
    const bom = menuTargetRefusal({ kind: 'category', id: 'joias' })
    const ruim = menuTargetRefusal({ kind: 'url', href: '/nao-existe' })
    expect(bom).toBeNull()
    expect(typeof ruim).toBe('string')
    // Com `strictNullChecks: false`, `{ ok: false; reason }` não estreita e ler `.reason` no `else`
    // é TS2339. Este formato não tem ramo para esquecer: ou há motivo, ou não há.
    expect(ruim && ruim.length).toBeGreaterThan(0)
  })

  const invalidos: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['string', '/sobre'],
    ['número', 42],
    ['array', [{ kind: 'url', href: '/sobre' }]],
    ['objeto sem kind', { id: 'joias' }],
    ['kind desconhecido', { kind: 'pagina', id: 'joias' }],
    ['categoria sem id', { kind: 'category' }],
    ['categoria com id vazio', { kind: 'category', id: '   ' }],
    ['produto com id não-string', { kind: 'product', id: 42 }],
    ['url sem href', { kind: 'url' }],
    ['url com href vazio', { kind: 'url', href: '   ' }],
  ]

  it.each(invalidos)('%s é recusado na gravação', (_label, raw) => {
    expect(menuTargetRefusal(raw)).toBeTypeOf('string')
  })

  it.each(invalidos)('%s não resolve na leitura', (_label, raw) => {
    expect(resolveMenuTarget(ctx, raw)).toBeNull()
  })

  it('destino bem-formado de categoria passa na gravação mesmo sem o catálogo na mão', () => {
    // A gravação julga a FORMA. Se a categoria ainda existe é pergunta da leitura — respondê-la aqui
    // exigiria o catálogo dentro do formulário e daria duas respostas em dois momentos.
    expect(menuTargetRefusal({ kind: 'category', id: 'sumiu' })).toBeNull()
    expect(resolveMenuTarget(ctx, { kind: 'category', id: 'sumiu' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// NAV-31 — um dono só: link e banner julgam o endereço pela mesma régua
// ---------------------------------------------------------------------------
describe('a régua é a mesma para o link e para o banner (NAV-31)', () => {
  const casos = ['/sobre', '/sobree', 'https://exemplo.com', 'http://exemplo.com', '//exemplo.com', '/']

  it.each(casos)('“%s”: o que a gravação recusa, a leitura não resolve', href => {
    const recusado = menuTargetRefusal({ kind: 'url', href }) !== null
    const resolvido = resolveMenuTarget(ctx, { kind: 'url', href }) !== null
    expect(resolvido).toBe(!recusado)
  })
})
