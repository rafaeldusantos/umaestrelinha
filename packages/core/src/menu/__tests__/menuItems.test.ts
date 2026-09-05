import { describe, expect, it } from 'vitest'
import {
  byMenuOrder,
  menuBannerSlots,
  menuHrefIsExternal,
  menuItems,
  normalizeMenuHref,
  type MenuCategory,
  type MenuCategoryItem,
  type MenuLink,
} from '../menu'

/**
 * Feature 39 — as ACs de `NAV-01`, `NAV-03`, `NAV-05`, `NAV-06`, `NAV-07`, `NAV-14` e `NAV-15` como
 * função pura.
 *
 * A fixture NÃO traz `show_in_menu`: ele virou coluna gerada (`menu_desktop or menu_mobile`) e
 * ninguém aqui o lê. Escrevê-lo na fixture seria dar dois donos à mesma resposta dentro do próprio
 * teste — e a fixture poderia dizer uma coisa enquanto as duas booleanas dizem outra.
 */
const cat = (id: string, name: string, overrides: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  menu_desktop: false,
  menu_mobile: false,
  ...overrides,
})

const link = (id: string, label: string, overrides: Partial<MenuLink> = {}): MenuLink => ({
  id,
  label,
  href: `/${id}`,
  desktop: true,
  mobile: true,
  sort_order: 0,
  ...overrides,
})

/** A árvore da Uma Estrelinha em miniatura: uma raiz de coleções e as filhas que vendem. */
const ARVORE: MenuCategory[] = [
  cat('joias', 'Joias', { sort_order: 0, menu_desktop: true, menu_mobile: true }),
  cat('correntes', 'Correntes', { parent_id: 'joias', sort_order: 1 }),
  cat('pingentes', 'Pingentes', { parent_id: 'joias', sort_order: 2 }),
  cat('aneis', 'Anéis', { parent_id: 'joias', sort_order: 3 }),
  cat('afetivas', 'Coleção Afetivas', { sort_order: 1, menu_desktop: true, menu_mobile: true }),
]

const nomes = (surface: 'desktop' | 'mobile', input: Parameters<typeof menuItems>[0]) =>
  menuItems(input, surface).map(i => i.name)

// ---------------------------------------------------------------------------
// NAV-01 — duas superfícies independentes
// ---------------------------------------------------------------------------
describe('curadoria por dispositivo (NAV-01)', () => {
  const categories = ARVORE.map(c =>
    c.id === 'correntes' ? { ...c, menu_desktop: false, menu_mobile: true } : c,
  )

  it('categoria ligada só no celular não aparece no computador', () => {
    expect(nomes('desktop', { categories })).not.toContain('Correntes')
  })

  it('e aparece no celular', () => {
    // "Correntes" está marcada no celular com o pai "Joias" também marcado: ela é item do PAINEL
    // do pai, não entrada da barra. É a AC 6 da mesma história.
    const joias = menuItems({ categories }, 'mobile')[0] as MenuCategoryItem
    expect(joias.children.map(c => c.name)).toEqual(['Correntes'])
  })

  it('as duas superfícies são independentes — desligar uma não mexe na outra', () => {
    const soDesktop = ARVORE.map(c =>
      c.id === 'afetivas' ? { ...c, menu_mobile: false } : c,
    )
    expect(nomes('desktop', { categories: soDesktop })).toContain('Coleção Afetivas')
    expect(nomes('mobile', { categories: soDesktop })).not.toContain('Coleção Afetivas')
  })

  it('categoria sem as duas colunas (dado antigo) fica fora das duas superfícies', () => {
    const semColunas = [{ ...cat('orfa', 'Órfã'), menu_desktop: undefined, menu_mobile: undefined }]
    expect(menuItems({ categories: semColunas }, 'desktop')).toEqual([])
    expect(menuItems({ categories: semColunas }, 'mobile')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// NAV-06 — o papel é derivado da árvore, não gravado
// ---------------------------------------------------------------------------
describe('papel derivado da árvore (NAV-06)', () => {
  const comFilhas = ARVORE.map(c =>
    c.parent_id === 'joias' && c.id !== 'aneis'
      ? { ...c, menu_desktop: true, menu_mobile: true }
      : c,
  )

  it('filha marcada de pai marcado é item do painel, e não vira entrada da barra', () => {
    const barra = nomes('desktop', { categories: comFilhas })
    expect(barra).toEqual(['Joias', 'Coleção Afetivas'])

    const joias = menuItems({ categories: comFilhas }, 'desktop')[0] as MenuCategoryItem
    expect(joias.children.map(c => c.name)).toEqual(['Correntes', 'Pingentes'])
  })

  it('filha NÃO marcada não entra no painel — o painel é curadoria, não a árvore inteira', () => {
    const joias = menuItems({ categories: comFilhas }, 'desktop')[0] as MenuCategoryItem
    expect(joias.children.map(c => c.name)).not.toContain('Anéis')
  })

  it('filha marcada de pai NÃO marcado vira entrada da barra', () => {
    const paiDesligado = comFilhas.map(c => (c.id === 'joias' ? { ...c, menu_desktop: false } : c))
    // "Coleção Afetivas" e "Correntes" empatam em `sort_order = 1` e desempatam por nome.
    expect(nomes('desktop', { categories: paiDesligado })).toEqual([
      'Coleção Afetivas',
      'Correntes',
      'Pingentes',
    ])
  })

  it('o papel muda com a superfície: a mesma filha é painel no desktop e barra no celular', () => {
    const categories = comFilhas.map(c => (c.id === 'joias' ? { ...c, menu_mobile: false } : c))
    const desktop = menuItems({ categories }, 'desktop')[0] as MenuCategoryItem
    expect(desktop.children.map(c => c.name)).toContain('Correntes')
    expect(nomes('mobile', { categories })).toContain('Correntes')
  })

  it('a filha do painel sai na ordem da árvore, com desempate por nome', () => {
    const empatadas = ARVORE.map(c =>
      c.parent_id === 'joias' ? { ...c, sort_order: 0, menu_desktop: true } : c,
    )
    const joias = menuItems({ categories: empatadas }, 'desktop')[0] as MenuCategoryItem
    expect(joias.children.map(c => c.name)).toEqual(['Anéis', 'Correntes', 'Pingentes'])
  })
})

// ---------------------------------------------------------------------------
// NAV-03 / NAV-05 — sem teto de itens, e nenhuma recusa por contagem
// ---------------------------------------------------------------------------
describe('sem teto de itens (NAV-03)', () => {
  it('20 categorias ligadas devolvem 20 entradas', () => {
    const vinte = Array.from({ length: 20 }, (_, i) =>
      cat(`c${i}`, `Coleção ${String(i).padStart(2, '0')}`, {
        sort_order: i,
        menu_desktop: true,
      }),
    )
    expect(menuItems({ categories: vinte }, 'desktop')).toHaveLength(20)
  })

  it('a 5ª, a 6ª e a 10ª entram como qualquer outra — não há corte em 4', () => {
    const dez = Array.from({ length: 10 }, (_, i) =>
      cat(`c${i}`, `Coleção ${i}`, { sort_order: i, menu_mobile: true }),
    )
    const saida = menuItems({ categories: dez }, 'mobile')
    expect(saida.map(i => i.name)).toContain('Coleção 4')
    expect(saida.map(i => i.name)).toContain('Coleção 9')
  })
})

// ---------------------------------------------------------------------------
// NAV-07 — inativa some da loja
// ---------------------------------------------------------------------------
describe('categoria inativa (NAV-07)', () => {
  it('não é devolvida, mesmo marcada nas duas superfícies', () => {
    const categories = ARVORE.map(c => (c.id === 'afetivas' ? { ...c, active: false } : c))
    expect(nomes('desktop', { categories })).not.toContain('Coleção Afetivas')
    expect(nomes('mobile', { categories })).not.toContain('Coleção Afetivas')
  })

  it('filha inativa não entra no painel', () => {
    const categories = ARVORE.map(c =>
      c.id === 'correntes'
        ? { ...c, menu_desktop: true, active: false }
        : c.id === 'pingentes'
          ? { ...c, menu_desktop: true }
          : c,
    )
    const joias = menuItems({ categories }, 'desktop')[0] as MenuCategoryItem
    expect(joias.children.map(c => c.name)).toEqual(['Pingentes'])
  })

  it('pai inativo não entra no href — a canônica servida é a de um segmento', () => {
    const categories = ARVORE.map(c =>
      c.id === 'joias'
        ? { ...c, active: false }
        : c.id === 'correntes'
          ? { ...c, menu_desktop: true }
          : c,
    )
    const correntes = menuItems({ categories }, 'desktop').find(i => i.name === 'Correntes')!
    expect(correntes.href).toBe('/correntes')
  })

  it('o href da entrada filha tem os dois segmentos quando o pai está ativo', () => {
    const categories = ARVORE.map(c =>
      c.id === 'correntes' ? { ...c, menu_desktop: true } : c.id === 'joias' ? { ...c, menu_desktop: false } : c,
    )
    const correntes = menuItems({ categories }, 'desktop').find(i => i.name === 'Correntes')!
    expect(correntes.href).toBe('/joias/correntes')
  })

  it('o path traz a posição na árvore, inclusive com o pai inativo — é o que o admin lê', () => {
    const categories = ARVORE.map(c =>
      c.id === 'joias'
        ? { ...c, active: false }
        : c.id === 'correntes'
          ? { ...c, menu_desktop: true }
          : c,
    )
    const correntes = menuItems({ categories }, 'desktop').find(
      i => i.name === 'Correntes',
    ) as MenuCategoryItem
    expect(correntes.path).toBe('Joias › Correntes')
  })
})

// ---------------------------------------------------------------------------
// NAV-14 / NAV-15 — categorias e links na mesma lista, ordenados juntos
// ---------------------------------------------------------------------------
describe('a fusão das duas fontes (NAV-14, NAV-15)', () => {
  it('sem links, a lista é só de categorias', () => {
    expect(menuItems({ categories: ARVORE }, 'desktop').every(i => i.kind === 'category')).toBe(true)
    expect(menuItems({ categories: ARVORE, links: [] }, 'desktop')).toHaveLength(2)
  })

  it('links ausentes é o mesmo que lista vazia', () => {
    expect(nomes('desktop', { categories: ARVORE })).toEqual(
      nomes('desktop', { categories: ARVORE, links: [] }),
    )
  })

  it('sem categorias, a lista é só de links', () => {
    const saida = menuItems({ categories: [], links: [link('sobre', 'Sobre')] }, 'desktop')
    expect(saida).toHaveLength(1)
    expect(saida[0].kind).toBe('link')
  })

  it('categorias e links são ordenados JUNTOS, pela mesma regra', () => {
    const links = [link('sobre', 'Sobre', { sort_order: 100 }), link('ajuda', 'Ajuda', { sort_order: -1, href: '/politicas' })]
    expect(nomes('desktop', { categories: ARVORE, links })).toEqual([
      'Ajuda',
      'Joias',
      'Coleção Afetivas',
      'Sobre',
    ])
  })

  it('empate de sort_order desempata por nome, com locale pt-BR', () => {
    const links = [link('zebra', 'Zebra'), link('alpha', 'Álvaro')]
    const categories = [cat('meio', 'Meio', { menu_desktop: true })]
    expect(nomes('desktop', { categories, links })).toEqual(['Álvaro', 'Meio', 'Zebra'])
  })

  it('o link é ligado por dispositivo como qualquer outro item', () => {
    const links = [link('sobre', 'Sobre', { mobile: false })]
    expect(nomes('desktop', { categories: [], links })).toEqual(['Sobre'])
    expect(nomes('mobile', { categories: [], links })).toEqual([])
  })

  it('link sem rótulo ou sem destino não é item — é linha pela metade no jsonb', () => {
    const links = [
      link('vazio', '   '),
      link('semDestino', 'Sem destino', { href: '   ' }),
      link('ok', 'Sobre'),
    ]
    expect(nomes('desktop', { categories: [], links })).toEqual(['Sobre'])
  })

  it('link para rota que deixou de existir CONTINUA renderizando — sumir em silêncio é pior', () => {
    // O item já gravado permanece; quem recusa é a gravação, na próxima edição. A loja não tem como
    // saber que a rota morreu, e um 404 visível é diagnosticável — um item que some não é.
    const links = [link('velho', 'Campanha antiga', { href: '/pagina-que-morreu' })]
    expect(nomes('desktop', { categories: [], links })).toEqual(['Campanha antiga'])
  })

  it('o link é sempre link direto: sem painel, sem filha, sem seta (NAV-12)', () => {
    const item = menuItems({ categories: [], links: [link('sobre', 'Sobre')] }, 'desktop')[0]
    expect(item.kind).toBe('link')
    expect(item).not.toHaveProperty('children')
    expect(item).not.toHaveProperty('hasPanel')
  })

  it('destino externo sai marcado como externo; interno, não', () => {
    const links = [
      link('externo', 'Instagram', { href: 'https://instagram.com/umaestrelinha' }),
      link('interno', 'Sobre', { href: '/sobre' }),
    ]
    const saida = menuItems({ categories: [], links }, 'desktop')
    expect(saida.find(i => i.name === 'Instagram')).toMatchObject({ external: true })
    expect(saida.find(i => i.name === 'Sobre')).toMatchObject({ external: false })
  })

  it('o destino interno é normalizado na saída', () => {
    const links = [link('sobre', 'Sobre', { href: 'sobre/' })]
    expect(menuItems({ categories: [], links }, 'desktop')[0].href).toBe('/sobre')
  })
})

// ---------------------------------------------------------------------------
// NAV-19 — o ícone, e a chave que degrada
// ---------------------------------------------------------------------------
describe('o ícone do item (NAV-19)', () => {
  it('a chave válida chega ao item, na categoria e no link', () => {
    const categories = [cat('joias', 'Joias', { menu_desktop: true, icon: 'corrente' })]
    const links = [link('sobre', 'Sobre', { icon: 'estrela' })]
    const saida = menuItems({ categories, links }, 'desktop')
    expect(saida.find(i => i.name === 'Joias')!.icon).toBe('corrente')
    expect(saida.find(i => i.name === 'Sobre')!.icon).toBe('estrela')
  })

  it('emoji do catálogo anterior e chave desconhecida degradam para null, sem quebrar a barra', () => {
    const categories = [
      cat('a', 'A', { menu_desktop: true, icon: '🎸' }),
      cat('b', 'B', { menu_desktop: true, icon: 'foguete' }),
      cat('c', 'C', { menu_desktop: true, icon: null }),
    ]
    expect(menuItems({ categories }, 'desktop').map(i => i.icon)).toEqual([null, null, null])
  })
})

// ---------------------------------------------------------------------------
// NAV-25 — quando a entrada abre painel
// ---------------------------------------------------------------------------
describe('hasPanel (NAV-25)', () => {
  it('sem filha curada e sem banner, a entrada é link direto', () => {
    const item = menuItems({ categories: ARVORE }, 'desktop')[0] as MenuCategoryItem
    expect(item.hasPanel).toBe(false)
  })

  it('com filha curada, abre painel', () => {
    const categories = ARVORE.map(c => (c.id === 'correntes' ? { ...c, menu_desktop: true } : c))
    const item = menuItems({ categories }, 'desktop')[0] as MenuCategoryItem
    expect(item.hasPanel).toBe(true)
  })

  it('com banner e sem filha, abre painel', () => {
    const categories = ARVORE.map(c =>
      c.id === 'joias'
        ? { ...c, menu_banners: { desktop: [{ target: { kind: 'category', id: 'correntes' } }], mobile: [] } }
        : c,
    )
    const item = menuItems({ categories }, 'desktop')[0] as MenuCategoryItem
    expect(item.hasPanel).toBe(true)
  })

  it('o banner conta por superfície: banner só no desktop não abre painel no celular', () => {
    const categories = ARVORE.map(c =>
      c.id === 'joias'
        ? { ...c, menu_banners: { desktop: [{ target: { kind: 'category', id: 'correntes' } }], mobile: [] } }
        : c,
    )
    const noCelular = menuItems({ categories }, 'mobile')[0] as MenuCategoryItem
    expect(noCelular.hasPanel).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Bordas declaradas na spec
// ---------------------------------------------------------------------------
describe('bordas', () => {
  it('ciclo a → b → a termina, e o header não trava', () => {
    const ciclo: MenuCategory[] = [
      cat('a', 'A', { parent_id: 'b', menu_desktop: true }),
      cat('b', 'B', { parent_id: 'a', menu_desktop: true }),
      cat('livre', 'Livre', { menu_desktop: true, sort_order: 9 }),
    ]
    // As duas do ciclo são item de painel uma da outra e nenhuma chega à barra — o dado é que está
    // estranho. O que este caso prova é que a montagem TERMINA e o resto do menu continua de pé.
    expect(nomes('desktop', { categories: ciclo })).toEqual(['Livre'])
  })

  it('nenhum item no dispositivo devolve lista vazia — a faixa simplesmente não renderiza', () => {
    expect(menuItems({ categories: ARVORE.map(c => ({ ...c, menu_desktop: false, menu_mobile: false })) }, 'desktop')).toEqual([])
  })

  it('entrada nula na lista de categorias não derruba a montagem', () => {
    const categories = [null as unknown as MenuCategory, ...ARVORE]
    expect(nomes('desktop', { categories })).toEqual(['Joias', 'Coleção Afetivas'])
  })

  it('input ausente devolve lista vazia em vez de lançar', () => {
    expect(menuItems(undefined as unknown as { categories: MenuCategory[] }, 'desktop')).toEqual([])
  })

  it('o mesmo ícone em dois itens é aceito — não é chave', () => {
    const categories = [
      cat('a', 'A', { menu_desktop: true, icon: 'pingente' }),
      cat('b', 'B', { menu_desktop: true, icon: 'pingente' }),
    ]
    expect(menuItems({ categories }, 'desktop').map(i => i.icon)).toEqual(['pingente', 'pingente'])
  })
})

// ---------------------------------------------------------------------------
// Os primitivos que `target.ts` e `banners.ts` reusam
// ---------------------------------------------------------------------------
describe('normalizeMenuHref e menuHrefIsExternal', () => {
  it.each([
    ['sobre', '/sobre'],
    ['/sobre', '/sobre'],
    ['  /sobre  ', '/sobre'],
    ['/sobre/', '/sobre'],
    ['/', '/'],
    ['//exemplo.com', '/exemplo.com'],
    ['', ''],
    [null, ''],
    [42, ''],
  ])('normaliza %s em %s', (entrada, esperado) => {
    expect(normalizeMenuHref(entrada)).toBe(esperado)
  })

  it('endereço externo passa intacto pela normalização', () => {
    expect(normalizeMenuHref(' https://exemplo.com/pagina/ ')).toBe('https://exemplo.com/pagina/')
  })

  it.each([
    ['https://exemplo.com', true],
    ['HTTPS://EXEMPLO.COM', true],
    ['http://exemplo.com', true],
    ['/sobre', false],
    ['sobre', false],
    [null, false],
  ])('%s é externo? %s', (href, esperado) => {
    expect(menuHrefIsExternal(href)).toBe(esperado)
  })
})

describe('menuBannerSlots', () => {
  it('devolve a lista da superfície pedida', () => {
    const raw = { desktop: [{ a: 1 }, { b: 2 }], mobile: [{ c: 3 }] }
    expect(menuBannerSlots(raw, 'desktop')).toHaveLength(2)
    expect(menuBannerSlots(raw, 'mobile')).toHaveLength(1)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'banner'],
    ['array na raiz', [{ target: {} }]],
    ['objeto sem a superfície', { mobile: [] }],
    ['superfície que não é lista', { desktop: { target: {} } }],
  ])('%s devolve lista vazia, sem lançar', (_label, raw) => {
    expect(menuBannerSlots(raw, 'desktop')).toEqual([])
  })
})

describe('byMenuOrder', () => {
  it('é a mesma regra de bySortOrder, no vocabulário do item', () => {
    const itens = menuItems(
      {
        categories: [cat('b', 'B', { menu_desktop: true, sort_order: 1 })],
        links: [link('a', 'A', { sort_order: 1 }), link('z', 'Z', { sort_order: 0 })],
      },
      'desktop',
    )
    expect(itens.map(i => i.name)).toEqual(['Z', 'A', 'B'])
    expect([...itens].sort(byMenuOrder).map(i => i.name)).toEqual(['Z', 'A', 'B'])
  })
})
