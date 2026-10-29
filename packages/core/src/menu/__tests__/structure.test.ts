import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  menuNodeName,
  menuNodeState,
  parseMenuDocument,
} from '../structure'
import type { MenuCategory } from '../menu'

/**
 * Feature 86, T02 — a forma do documento e a leitura tolerante (`MNM-01`, `MNM-36`).
 *
 * `parseMenuDocument` é quem decide se a loja lê a montagem da dona ou cai no menu deduzido de hoje,
 * então o caso que mais importa é o "não": tudo o que não é `version: 2` devolve `null`.
 */

const no = (over: Record<string, unknown> = {}) => ({
  id: 'n1',
  target: { kind: 'category', category_id: 'joias' },
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const raiz = (over: Record<string, unknown> = {}) => ({
  ...no(),
  icon: null,
  banners: null,
  children: [],
  ...over,
})

describe('parseMenuDocument — o que NÃO é documento v2 devolve null', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['número', 2],
    ['texto', 'version: 2'],
    ['array', [{ version: 2, items: [] }]],
    ['objeto sem version', { items: [] }],
    ['version 1', { version: 1, items: [] }],
    ['version "2" em texto', { version: '2', items: [] }],
    ['o legado da 39, só com links', { links: [{ id: 'sobre', label: 'Sobre', href: '/sobre' }] }],
  ])('%s', (_rotulo, raw) => {
    expect(parseMenuDocument(raw)).toBeNull()
  })

  it('o par: version 2 com lista vazia É documento (o menu vazio é estado legítimo)', () => {
    expect(parseMenuDocument({ version: 2, items: [] })).toEqual({ version: 2, items: [] })
  })

  it('version 2 sem `items` vira documento vazio, não null', () => {
    expect(parseMenuDocument({ version: 2 })).toEqual({ version: 2, items: [] })
  })
})

describe('parseMenuDocument — nó inválido é descartado, o resto fica', () => {
  const ler = (items: unknown[]) => parseMenuDocument({ version: 2, items })!.items.map(i => i.id)

  it('nó que não é objeto sai', () => {
    expect(ler([raiz({ id: 'a' }), 'x', 3, null, [raiz({ id: 'b' })], raiz({ id: 'c' })])).toEqual([
      'a',
      'c',
    ])
  })

  it('nó sem id, com id vazio ou não-texto sai', () => {
    expect(ler([raiz({ id: '' }), raiz({ id: '   ' }), raiz({ id: 7 }), raiz({ id: undefined }), raiz({ id: 'ok' })])).toEqual(['ok'])
  })

  it.each([
    ['sem alvo', undefined],
    ['alvo não-objeto', 'joias'],
    ['tipo desconhecido', { kind: 'product', id: 'p1' }],
    ['categoria sem id', { kind: 'category' }],
    ['categoria com id vazio', { kind: 'category', category_id: '  ' }],
    ['link sem href', { kind: 'link' }],
    ['link com href vazio', { kind: 'link', href: '' }],
  ])('alvo inválido (%s) sai', (_r, target) => {
    expect(ler([raiz({ id: 'mau', target }), raiz({ id: 'bom' })])).toEqual(['bom'])
  })

  it('id repetido: o primeiro vence', () => {
    const doc = parseMenuDocument({
      version: 2,
      items: [raiz({ id: 'a', label: 'Primeiro' }), raiz({ id: 'a', label: 'Segundo' })],
    })!
    expect(doc.items).toHaveLength(1)
    expect(doc.items[0].label).toBe('Primeiro')
  })

  it('filho inválido sai do submenu, e o item principal fica', () => {
    const doc = parseMenuDocument({
      version: 2,
      items: [raiz({ children: [no({ id: 'f1' }), { id: 'f2' }, 'x', no({ id: 'f3' })] })],
    })!
    expect(doc.items[0].children.map(c => c.id)).toEqual(['f1', 'f3'])
  })

  it('categoria que NÃO EXISTE fica no documento (MNM-36 — o painel precisa vê-la)', () => {
    const doc = parseMenuDocument({
      version: 2,
      items: [raiz({ target: { kind: 'category', category_id: 'apagada' } })],
    })!
    expect(doc.items).toHaveLength(1)
    expect(doc.items[0].target).toEqual({ kind: 'category', category_id: 'apagada' })
  })
})

describe('parseMenuDocument — os campos', () => {
  const um = (over: Record<string, unknown>) =>
    parseMenuDocument({ version: 2, items: [raiz(over)] })!.items[0]

  it('preserva o que é válido', () => {
    const banners = { desktop: [{ target: { kind: 'url', href: '/sobre' } }], mobile: [] }
    const lido = um({
      id: 'x',
      target: { kind: 'link', href: '/sobre' },
      label: 'Sobre',
      desktop: true,
      mobile: false,
      icon: 'corrente',
      banners,
      children: [no({ id: 'c1', mobile: false })],
    })
    expect(lido).toEqual({
      id: 'x',
      target: { kind: 'link', href: '/sobre' },
      label: 'Sobre',
      desktop: true,
      mobile: false,
      icon: 'corrente',
      banners,
      children: [
        {
          id: 'c1',
          target: { kind: 'category', category_id: 'joias' },
          label: null,
          desktop: true,
          mobile: false,
        },
      ],
    })
  })

  it('rótulo não-texto vira null (usa o nome da categoria)', () => {
    expect(um({ label: 42 }).label).toBeNull()
  })

  it('chave de dispositivo ausente ou não-booleana é DESLIGADA — a leitura das colunas da 39', () => {
    const lido = um({ desktop: undefined, mobile: 'sim' })
    expect(lido.desktop).toBe(false)
    expect(lido.mobile).toBe(false)
  })

  it('ícone não-texto vira null; banners não-objeto viram null', () => {
    const lido = um({ icon: 3, banners: [] })
    expect(lido.icon).toBeNull()
    expect(lido.banners).toBeNull()
  })

  it('submenu não-array vira lista vazia', () => {
    expect(um({ children: 'x' }).children).toEqual([])
  })

  it('o id da categoria do alvo é aparado', () => {
    expect(um({ target: { kind: 'category', category_id: ' joias ' } }).target).toEqual({
      kind: 'category',
      category_id: 'joias',
    })
  })
})

const cat = (id: string, name: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...over,
})

describe('menuNodeState e menuNodeName', () => {
  const categorias = [cat('joias', 'Joias'), cat('velha', 'Velha', { active: false })]
  const alvo = (category_id: string) => ({ kind: 'category' as const, category_id })

  it('estado: ok, inativa, apagada — link é sempre ok', () => {
    expect(menuNodeState({ target: alvo('joias') }, categorias)).toBe('ok')
    expect(menuNodeState({ target: alvo('velha') }, categorias)).toBe('inactive')
    expect(menuNodeState({ target: alvo('sumiu') }, categorias)).toBe('deleted')
    expect(menuNodeState({ target: { kind: 'link', href: '/sobre' } }, categorias)).toBe('ok')
  })

  it('nome: label null usa o nome ATUAL da categoria; label próprio vence, aparado', () => {
    expect(menuNodeName({ target: alvo('joias'), label: null }, categorias)).toBe('Joias')
    const renomeada = [cat('joias', 'Joias finas')]
    expect(menuNodeName({ target: alvo('joias'), label: null }, renomeada)).toBe('Joias finas')
    expect(menuNodeName({ target: alvo('joias'), label: '  Presentes ' }, categorias)).toBe('Presentes')
  })

  it('nome: rótulo só de espaços cai no nome da categoria; apagada sem rótulo é vazio', () => {
    expect(menuNodeName({ target: alvo('joias'), label: '   ' }, categorias)).toBe('Joias')
    expect(menuNodeName({ target: alvo('sumiu'), label: null }, categorias)).toBe('')
  })
})

describe('alcance Deno — a direção dos imports', () => {
  const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
  const ler = (f: string) =>
    readFileSync(join(DIR, f), 'utf8')
      .replace(/\r\n/g, '\n')
      .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
  const especificadores = (fonte: string) =>
    [...fonte.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(m => m[1])

  it('`menu.ts` NÃO importa `structure.ts` nem `refusals.ts` (o Deno alcança menu.ts por caminho)', () => {
    const specs = especificadores(ler('menu.ts'))
    expect(specs.length).toBeGreaterThan(0) // âncora: o extrator achou o import de routes
    expect(specs.filter(s => /structure|refusals/.test(s))).toEqual([])
  })

  it('`structure.ts` importa só vizinhos do menu, todos com `.ts` explícito (import type incluso)', () => {
    const specs = especificadores(ler('structure.ts'))
    expect(specs).toEqual(expect.arrayContaining(['./menu.ts', './icons.ts']))
    expect(specs.every(s => s.startsWith('./') && s.endsWith('.ts'))).toBe(true)
  })

  it('sensor: o extrator acusa um `import type` sem extensão', () => {
    expect(especificadores("import type { X } from './menu'")).toEqual(['./menu'])
  })
})
