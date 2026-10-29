import { describe, expect, it } from 'vitest'
import {
  MENU_BANNER_LIMIT,
  MENU_LABEL_MAX,
  MENU_PANEL_COLUMN_SIZE,
  MENU_SUBMENU_LIMIT,
  internalMenuHrefRefusal,
  menuDocumentRefusal,
  menuTargetRefusal,
  menuHrefKey,
  menuLinkPathRefusal,
  menuNodeLabelRefusal,
  type MenuDocument,
  type MenuNode,
  type MenuRootNode,
} from '../index.ts'
import { ROUTE_SLUGS } from '../../routes/index.ts'

/** Feature 86, T05 — as recusas (`MNM-10`, `12`, `14`, `16`, `24`, `25`, `31`). */

describe('os limites', () => {
  it('40 caracteres de nome; 24 itens de submenu = três colunas do painel', () => {
    expect(MENU_LABEL_MAX).toBe(40)
    expect(MENU_SUBMENU_LIMIT).toBe(24)
    expect(MENU_SUBMENU_LIMIT).toBe(MENU_PANEL_COLUMN_SIZE * 3)
  })
})

describe('menuNodeLabelRefusal (MNM-14, MNM-16)', () => {
  it('null = usar o nome da categoria, aceito', () => {
    expect(menuNodeLabelRefusal(null)).toBeNull()
  })

  it('40 aceita, 41 recusa nomeando os dois números', () => {
    expect(menuNodeLabelRefusal('a'.repeat(40))).toBeNull()
    const recusa = menuNodeLabelRefusal('a'.repeat(41))
    expect(recusa).toMatch(/40/)
    expect(recusa).toMatch(/41/)
  })

  it('o comprimento é contado aparado: 40 + espaços nas pontas aceita', () => {
    expect(menuNodeLabelRefusal(`  ${'a'.repeat(40)}  `)).toBeNull()
  })

  it.each(['', ' ', '   \t '])('vazio ou só espaços (%j) recusa', label => {
    expect(menuNodeLabelRefusal(label)).toEqual(expect.any(String))
  })
})

describe('internalMenuHrefRefusal (MNM-12)', () => {
  it.each(['https://exemplo.com', 'http://exemplo.com', 'HTTPS://x.com/a', '//exemplo.com', '', '   '])(
    'recusa %j com motivo legível',
    href => {
      const recusa = internalMenuHrefRefusal(href)
      expect(recusa).toEqual(expect.any(String))
      expect(recusa!.length).toBeGreaterThan(10)
    },
  )

  // R01 (QA r2 da 86): a régua do LINK julga só a forma. "Existe uma página aqui?" é pergunta do painel
  // (`conferirEnderecoDaLoja`, com o catálogo e o banco na mão) — antes `core` recusava todo caminho
  // fora de `ROUTE_SLUGS`, inclusive o de uma coleção ativa que o seletor tinha aceitado. O requisito
  // mudou; a asserção foi trocada pela régua oposta, e a forma ganhou recusas próprias (abaixo).
  it('caminho interno bem formado passa, mesmo fora das rotas fixas (a existência é do painel)', () => {
    expect(internalMenuHrefRefusal('/nao-existe')).toBeNull()
  })

  it.each(['/sobre', '/produtos/x', '/', 'sobre', '/perguntas-frequentes'])('aceita %j', href => {
    expect(internalMenuHrefRefusal(href)).toBeNull()
  })

  it('não-texto recusa', () => {
    expect(internalMenuHrefRefusal(undefined)).toEqual(expect.any(String))
    expect(internalMenuHrefRefusal(3)).toEqual(expect.any(String))
  })
})

const no = (id: string, target: MenuNode['target'], over: Partial<MenuNode> = {}): MenuNode => ({
  id,
  target,
  label: target.kind === 'link' ? 'Link' : null,
  desktop: true,
  mobile: true,
  ...over,
})
const raiz = (id: string, target: MenuNode['target'], over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  ...no(id, target),
  icon: null,
  banners: null,
  children: [],
  ...over,
})
const C = (category_id: string) => ({ kind: 'category' as const, category_id })
const L = (href: string) => ({ kind: 'link' as const, href })
const doc = (...items: MenuRootNode[]): MenuDocument => ({ version: 2, items })

describe('menuDocumentRefusal', () => {
  it('documento bom passa (o par de cada recusa abaixo)', () => {
    expect(
      menuDocumentRefusal(
        doc(
          raiz('a', C('joias'), { children: [no('f1', C('aneis')), no('f2', L('/sobre'))] }),
          raiz('b', L('/sobre'), { label: 'Presentes', children: [no('f3', C('aneis'))] }),
        ),
      ),
    ).toBeNull()
  })

  it('forma desconhecida recusa', () => {
    expect(menuDocumentRefusal(null as never)).toEqual(expect.any(String))
    expect(menuDocumentRefusal({ version: 1, items: [] } as never)).toEqual(expect.any(String))
  })

  it('rótulo longo ou vazio recusa — na raiz e no submenu', () => {
    expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { label: 'x'.repeat(41) })))).toMatch(/40/)
    expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { label: '  ' })))).toEqual(expect.any(String))
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { children: [no('f', C('aneis'), { label: '' })] }))),
    ).toEqual(expect.any(String))
  })

  it('link sem rótulo recusa', () => {
    expect(menuDocumentRefusal(doc(raiz('a', L('/sobre'), { label: null })))).toEqual(expect.any(String))
  })

  it('24 filhos aceita, 25 recusa nomeando o 24', () => {
    const filhos = (n: number) => Array.from({ length: n }, (_, i) => no(`f${i}`, C(`c${i}`)))
    expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: filhos(24) })))).toBeNull()
    expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: filhos(25) })))).toBe(
      'O submenu tem o máximo de 24 itens.',
    )
  })

  describe('o teto recusa só a operação que AUMENTA o submenu acima de 24 (MNM-24, revisto em 2026-10-28)', () => {
    const filhos = (n: number) => Array.from({ length: n }, (_, i) => no(`f${i}`, C(`c${i}`)))
    // Um legado convertido com 30 filhas marcadas: já passou do teto ANTES de a dona tocar nele.
    const legado30 = doc(raiz('a', C('joias'), { children: filhos(30) }), raiz('b', L('/sobre'), { label: 'Sobre' }))

    it('com 30, tirar um (30 → 29) grava', () => {
      const proximo = doc(raiz('a', C('joias'), { children: filhos(30).slice(1) }), legado30.items[1])
      expect(menuDocumentRefusal(proximo, legado30)).toBeNull()
    })

    it('com 30, mover, renomear ou desligar um filho (30 → 30) grava', () => {
      const f = filhos(30)
      const movido = doc(raiz('a', C('joias'), { children: [f[1], f[0], ...f.slice(2)] }), legado30.items[1])
      const renomeado = doc(raiz('a', C('joias'), { children: [{ ...f[0], label: 'Anéis finos' }, ...f.slice(1)] }), legado30.items[1])
      const desligado = doc(raiz('a', C('joias'), { children: [{ ...f[0], mobile: false }, ...f.slice(1)] }), legado30.items[1])
      expect(menuDocumentRefusal(movido, legado30)).toBeNull()
      expect(menuDocumentRefusal(renomeado, legado30)).toBeNull()
      expect(menuDocumentRefusal(desligado, legado30)).toBeNull()
    })

    it('com 30, mexer em OUTRO item (o submenu acima do teto fica igual) grava', () => {
      const proximo = doc(legado30.items[0], { ...legado30.items[1], label: 'Quem somos' })
      expect(menuDocumentRefusal(proximo, legado30)).toBeNull()
    })

    it('com 30, adicionar o 31º recusa', () => {
      const proximo = doc(raiz('a', C('joias'), { children: [...filhos(30), no('x', C('novo'))] }), legado30.items[1])
      expect(menuDocumentRefusal(proximo, legado30)).toBe('O submenu tem o máximo de 24 itens.')
    })

    it('com 24, adicionar o 25º recusa (o caso comum do teto)', () => {
      const antes = doc(raiz('a', C('joias'), { children: filhos(24) }))
      expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: filhos(25) })), antes)).toBe(
        'O submenu tem o máximo de 24 itens.',
      )
    })

    it('item NOVO (id que o anterior não tem) com 25 filhos recusa', () => {
      const antes = doc(raiz('b', L('/sobre'), { label: 'Sobre' }))
      const proximo = doc(antes.items[0], raiz('novo', C('joias'), { children: filhos(25) }))
      expect(menuDocumentRefusal(proximo, antes)).toBe('O submenu tem o máximo de 24 itens.')
    })

    it('sem o documento anterior, a régua é a estrita: acima de 24 recusa', () => {
      expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: filhos(29) })))).toBe(
        'O submenu tem o máximo de 24 itens.',
      )
      expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: filhos(29) })), null)).toBe(
        'O submenu tem o máximo de 24 itens.',
      )
    })

    it('as outras recusas continuam valendo num submenu acima do teto (nome vazio no 30)', () => {
      const f = filhos(30)
      const proximo = doc(raiz('a', C('joias'), { children: [{ ...f[0], label: '  ' }, ...f.slice(1)] }), legado30.items[1])
      expect(menuDocumentRefusal(proximo, legado30)).toMatch(/nome/i)
    })
  })

  it('categoria repetida no menu principal recusa (MNM-10)', () => {
    expect(menuDocumentRefusal(doc(raiz('a', C('joias')), raiz('b', C('joias'))))).toMatch(/menu principal/)
  })

  it('repetida no MESMO submenu recusa; em submenus diferentes aceita (MNM-25)', () => {
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { children: [no('f1', C('aneis')), no('f2', C('aneis'))] }))),
    ).toMatch(/neste submenu/)
    expect(
      menuDocumentRefusal(
        doc(
          raiz('a', C('joias'), { children: [no('f1', C('aneis'))] }),
          raiz('b', C('presentes'), { children: [no('f2', C('aneis'))] }),
        ),
      ),
    ).toBeNull()
  })

  it('a mesma categoria na raiz e no submenu de outro item aceita', () => {
    expect(
      menuDocumentRefusal(doc(raiz('a', C('aneis')), raiz('b', C('joias'), { children: [no('f', C('aneis'))] }))),
    ).toBeNull()
  })

  it('link externo JÁ GRAVADO passa (MNM-31) — só a criação usa internalMenuHrefRefusal', () => {
    expect(menuDocumentRefusal(doc(raiz('a', L('https://exemplo.com/blog'), { label: 'Blog' })))).toBeNull()
    expect(internalMenuHrefRefusal('https://exemplo.com/blog')).toEqual(expect.any(String))
  })

  it('link interno mal formado recusa, citando o endereço (R01: bem formado passa)', () => {
    expect(menuDocumentRefusal(doc(raiz('a', L('/nao existe'), { label: 'X' })))).toMatch(/nao existe/)
    expect(menuDocumentRefusal(doc(raiz('a', L('/nao-existe'), { label: 'X' })))).toBeNull()
  })

  it('banners acima do limite da 39 recusam, por dispositivo', () => {
    const b = { target: { kind: 'url' as const, href: '/sobre' } }
    const muitos = Array.from({ length: MENU_BANNER_LIMIT + 1 }, () => b)
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { banners: { desktop: muitos, mobile: [] } }))),
    ).toEqual(expect.any(String))
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { banners: { desktop: [], mobile: muitos } }))),
    ).toEqual(expect.any(String))
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { banners: { desktop: [b, b], mobile: [b] } }))),
    ).toBeNull()
  })

  it('sem teto no menu principal: 60 itens passam', () => {
    const muitos = Array.from({ length: 60 }, (_, i) => raiz(`n${i}`, C(`c${i}`)))
    expect(menuDocumentRefusal(doc(...muitos))).toBeNull()
  })
})

/**
 * Q03 do QA da `86` (`BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe`) — a mesma página
 * entrava duas vezes, e `/sobre/` e `/SOBRE` viravam itens separados de `/sobre`. A régua é a da
 * categoria repetida: no menu principal uma vez, e no MESMO submenu uma vez.
 */
describe('menuHrefKey — a grafia que identifica uma página', () => {
  it('barra final fora, caminho em minúsculas, barra na frente', () => {
    expect(menuHrefKey('/sobre/')).toBe('/sobre')
    expect(menuHrefKey('/SOBRE')).toBe('/sobre')
    expect(menuHrefKey(' sobre ')).toBe('/sobre')
    expect(menuHrefKey('/Perguntas-Frequentes/')).toBe('/perguntas-frequentes')
  })

  it('a busca da query fica como está (só o caminho dobra a caixa)', () => {
    expect(menuHrefKey('/BUSCA?q=Anel')).toBe('/busca?q=Anel')
  })

  it('externo passa sem mexer no caminho', () => {
    expect(menuHrefKey('https://exemplo.com/Blog')).toBe('https://exemplo.com/Blog')
  })
})

describe('menuDocumentRefusal — a mesma página duas vezes (Q03)', () => {
  it('o mesmo endereço no menu principal recusa, em qualquer grafia', () => {
    expect(
      menuDocumentRefusal(doc(raiz('a', L('/sobre'), { label: 'Sobre' }), raiz('b', L('/SOBRE/'), { label: 'De novo' }))),
    ).toBe('Esta página já está no menu principal. Cada página aparece lá uma vez só.')
  })

  it('no MESMO submenu recusa; em submenus diferentes e na raiz × submenu aceita', () => {
    const f = (id: string, href: string) => no(id, L(href), { label: id })
    expect(
      menuDocumentRefusal(doc(raiz('a', C('joias'), { children: [f('f1', '/sobre'), f('f2', '/sobre/')] }))),
    ).toBe('Esta página já está neste submenu.')
    expect(
      menuDocumentRefusal(
        doc(
          raiz('a', C('joias'), { children: [f('f1', '/sobre')] }),
          raiz('b', C('presentes'), { children: [f('f2', '/sobre')] }),
          raiz('c', L('/sobre'), { label: 'Sobre' }),
        ),
      ),
    ).toBeNull()
  })

  it('páginas diferentes não são repetidas', () => {
    expect(
      menuDocumentRefusal(doc(raiz('a', L('/sobre'), { label: 'A' }), raiz('b', L('/perguntas-frequentes'), { label: 'B' }))),
    ).toBeNull()
  })

  it('um documento que JÁ tinha a repetição continua editável — só a op que a cria recusa', () => {
    const antes = doc(raiz('a', L('/sobre'), { label: 'A' }), raiz('b', L('/sobre'), { label: 'B' }))
    const renomeado = doc(raiz('a', L('/sobre'), { label: 'A2' }), raiz('b', L('/sobre'), { label: 'B' }))
    expect(menuDocumentRefusal(renomeado, antes)).toBeNull()
    // Sem `anterior`, a régua é a estrita.
    expect(menuDocumentRefusal(renomeado)).toMatch(/já está no menu principal/)
    // E uma repetição NOVA no mesmo documento continua recusada.
    const comOutra = doc(...renomeado.items, raiz('c', L('/conta'), { label: 'C' }), raiz('d', L('/conta'), { label: 'D' }))
    expect(menuDocumentRefusal(comOutra, antes)).toMatch(/já está no menu principal/)
  })
})

describe('R01 (QA r2) — o link julga a FORMA; a existência é do painel', () => {
  const COLECOES = ['/botanicas', '/joias-afetivas', '/joias-afetivas/joia-afetiva-linha-pet', '/produtos/colar-leite']

  it.each(COLECOES)('%s (caminho de coleção, filha ou peça) passa na criação e no documento', href => {
    expect(internalMenuHrefRefusal(href)).toBeNull()
    expect(menuDocumentRefusal(doc(raiz('a', L(href), { label: 'X' })))).toBeNull()
    expect(menuDocumentRefusal(doc(raiz('a', C('joias'), { children: [no('f', L(href), { label: 'F' })] })))).toBeNull()
  })

  it.each([
    'javascript:alert(1)',
    '/javascript:alert(1)',
    '/a b',
    '/sobre\\x',
    '/joias/../conta',
    '/./sobre',
    '/sobre//x',
    '/<script>',
    '/sobre"',
  ])('%j mal formado recusa, na criação e no documento', href => {
    expect(internalMenuHrefRefusal(href)).toEqual(expect.any(String))
    expect(menuDocumentRefusal(doc(raiz('a', L(href), { label: 'X' })))).toEqual(expect.any(String))
  })

  // G02 da verificação r2 (N14): a régua da query/âncora tinha só o inverso. Cada forma abaixo
  // derruba sozinha a mutação que aceita aspas, `<>`, crase, barra invertida ou quebra de linha
  // depois do `?`/`#` — o caminho antes dele é bem formado em todas.
  it.each([
    '/busca?q="x"',
    "/busca?q='x'",
    '/busca?q=`x`',
    '/sobre#<b>',
    '/busca?q=a>b',
    '/busca?q=a\\b',
    '/sobre?x=1\n2',
    '/sobre?x=1\r2',
    '/busca?q=a\tb',
  ])('query/âncora mal formada %j recusa, na régua da forma, na criação e no documento', href => {
    expect(menuLinkPathRefusal(href)).toEqual(expect.any(String))
    expect(internalMenuHrefRefusal(href)).toEqual(expect.any(String))
    expect(menuDocumentRefusal(doc(raiz('a', L(href), { label: 'X' })))).toEqual(expect.any(String))
  })

  it('query e âncora continuam aceitas (a busca da loja é /busca?q=…)', () => {
    expect(internalMenuHrefRefusal('/busca?q=Anel de prata')).toBeNull()
    expect(internalMenuHrefRefusal('/sobre#contato')).toBeNull()
  })

  it('a recusa NUNCA despeja a lista de rotas', () => {
    for (const href of ['/a b', 'javascript:alert(1)', '/x/../y']) {
      const motivo = internalMenuHrefRefusal(href) ?? ''
      expect(motivo).not.toMatch(/Endereços aceitos/)
      const citadas = ROUTE_SLUGS.filter(slug => motivo.includes(`/${slug}`))
      expect(citadas.length, motivo).toBeLessThanOrEqual(1)
    }
  })

  it('o destino de BANNER (39) não afrouxou: caminho de coleção digitado continua recusado', () => {
    expect(menuTargetRefusal({ kind: 'url', href: '/botanicas' })).toMatch(/botanicas/)
  })
})
