import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ancestorsOf,
  bySortOrder,
  categoryHref,
  descendantIds,
  menuItems,
  pathLabel,
  type MenuCategory,
} from '../menu'

/**
 * **Três blocos saíram deste arquivo na feature 39 (T30), e a queda é declarada.**
 *
 * `menuEntries` (10 casos), `slotsUsed`/`menuSlotRefusal` (6) e `resolvePromo` (13) mediam funções
 * que **deixaram de existir**: elas liam um booleano só (`show_in_menu`), não conheciam superfície,
 * não tinham curadoria de painel e resolviam um card sem imagem. O que as substituiu tem cobertura
 * própria e maior — `menuItems.test.ts` (a porta única, por dispositivo) e `banners.test.ts` (o
 * anúncio com arte, três tipos de destino e o reaproveitamento entre dispositivos).
 *
 * O que **não** caiu foi o conjunto `URL-03`: os três casos do href pela árvore foram **reescritos**
 * contra `menuItems` logo abaixo, no mesmo lugar. Eles guardam `AD-018` — a canônica de dois
 * segmentos e o pai inativo que não pode entrar na URL — e essa regra continua de pé.
 */

const cat = (
  id: string,
  name: string,
  overrides: Partial<MenuCategory> = {},
): MenuCategory => ({
  id,
  name,
  slug: id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...overrides,
})

/**
 * A árvore que o banco tinha de verdade quando a feature 16 começou — e é ela que expõe o bug:
 * "Bottons" (raiz) e "Academia" (filha) empatados em `sort_order = 0`, com os universos todos
 * pendurados na raiz. Os testes de ordenação e de raiz usam esta forma de propósito.
 */
const REAL_TREE: MenuCategory[] = [
  cat('bottons', 'Bottons', { sort_order: 0 }),
  cat('academia', 'Academia', { parent_id: 'bottons', sort_order: 0 }),
  cat('anime', 'Anime', { parent_id: 'bottons', sort_order: 1, menu_desktop: true }),
  cat('kpop', 'K-Pop', { parent_id: 'bottons', sort_order: 2, menu_desktop: true }),
  cat('filmes', 'Filmes', { parent_id: 'bottons', sort_order: 3, menu_desktop: true }),
  cat('games', 'Games', { parent_id: 'bottons', sort_order: 5, menu_desktop: true }),
  cat('bandas', 'Bandas', { parent_id: 'bottons', sort_order: 4 }),
  cat('naruto', 'Naruto', { parent_id: 'anime', sort_order: 1 }),
  cat('villains', 'Villains', { parent_id: 'anime', sort_order: 2, description: '12 pins dos vilões.' }),
]

// ---------------------------------------------------------------------------
// MENU-01 — ordem determinística
// ---------------------------------------------------------------------------
describe('bySortOrder (MENU-01)', () => {
  it('ordena por sort_order ascendente', () => {
    const out = [cat('c', 'C', { sort_order: 3 }), cat('a', 'A', { sort_order: 1 })].sort(bySortOrder)
    expect(out.map(c => c.id)).toEqual(['a', 'c'])
  })

  it('desempata por nome — é o empate real que levava "Academia" ao topo', () => {
    // Bottons(0) e Academia(0): sem desempate a ordem era o que o Postgres devolvesse.
    const empate = [
      REAL_TREE.find(c => c.id === 'bottons')!,
      REAL_TREE.find(c => c.id === 'academia')!,
    ]
    expect([...empate].sort(bySortOrder).map(c => c.name)).toEqual(['Academia', 'Bottons'])
    // E ao contrário dá o MESMO resultado — é isso que "determinístico" significa.
    expect([...empate].reverse().sort(bySortOrder).map(c => c.name)).toEqual(['Academia', 'Bottons'])
  })

  it('sort_order ausente conta como 0 em vez de NaN', () => {
    const semOrdem = { name: 'Z' } as unknown as MenuCategory
    expect(bySortOrder(semOrdem, cat('a', 'A', { sort_order: 1 }))).toBeLessThan(0)
  })

  it('empate em sort_order E em nome não lança e devolve 0 (ordem estável)', () => {
    expect(bySortOrder(cat('a', 'Igual'), cat('b', 'Igual'))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// ancestorsOf / pathLabel
// ---------------------------------------------------------------------------
describe('ancestorsOf e pathLabel', () => {
  it('sobe do pai direto até a raiz, sem incluir a própria', () => {
    expect(ancestorsOf(REAL_TREE, 'naruto').map(c => c.id)).toEqual(['bottons', 'anime'])
  })

  it('raiz não tem ancestral', () => {
    expect(ancestorsOf(REAL_TREE, 'bottons')).toEqual([])
  })

  it('id inexistente devolve vazio em vez de lançar', () => {
    expect(ancestorsOf(REAL_TREE, 'nao-existe')).toEqual([])
    expect(pathLabel(REAL_TREE, 'nao-existe')).toBe('')
  })

  it('pai fora da lista encerra a subida (árvore parcial)', () => {
    const orfa = [cat('naruto', 'Naruto', { parent_id: 'anime' })]
    expect(pathLabel(orfa, 'naruto')).toBe('Naruto')
  })

  it('ciclo em parent_id termina em vez de travar', () => {
    const ciclo = [cat('a', 'A', { parent_id: 'b' }), cat('b', 'B', { parent_id: 'a' })]
    expect(pathLabel(ciclo, 'a')).toBe('B › A')
  })

  it('monta o caminho com a própria categoria e aceita separador próprio', () => {
    expect(pathLabel(REAL_TREE, 'anime')).toBe('Bottons › Anime')
    expect(pathLabel(REAL_TREE, 'naruto', ' · ')).toBe('Bottons · Anime · Naruto')
  })
})

// ---------------------------------------------------------------------------
// URL-03 — a URL canônica de uma categoria da árvore (feature 23, `AD-018`)
// ---------------------------------------------------------------------------
describe('categoryHref (URL-03)', () => {
  it('categoria raiz sai na raiz do domínio, com um segmento', () => {
    expect(categoryHref(REAL_TREE, 'bottons')).toBe('/bottons')
  })

  it('categoria filha sai com o pai na frente', () => {
    expect(categoryHref(REAL_TREE, 'anime')).toBe('/bottons/anime')
  })

  it('árvore de TRÊS níveis para no pai imediato — a canônica tem no máximo dois segmentos', () => {
    // "Naruto" pende de "Anime", que pende de "Bottons". O avô não entra.
    const href = categoryHref(REAL_TREE, 'naruto')
    expect(href).toBe('/anime/naruto')
    expect(href.split('/').filter(Boolean)).toHaveLength(2)
    expect(href).not.toContain('bottons')
  })

  it('id inexistente devolve `/` em vez de lançar', () => {
    expect(() => categoryHref(REAL_TREE, 'fantasma')).not.toThrow()
    expect(categoryHref(REAL_TREE, 'fantasma')).toBe('/')
  })

  it('pai ausente da lista cai na forma de um segmento (árvore parcial)', () => {
    const orfa = [cat('naruto', 'Naruto', { parent_id: 'anime' })]
    expect(categoryHref(orfa, 'naruto')).toBe('/naruto')
  })
})

// ---------------------------------------------------------------------------
// MENU-03 — roll-up da descendência
// ---------------------------------------------------------------------------
describe('descendantIds (MENU-03)', () => {
  it('inclui a própria e desce recursivamente até a neta', () => {
    // `bottons` tem filhas e NETAS (naruto/villains sob anime) — meia-descida perderia as netas.
    const ids = descendantIds(REAL_TREE, 'bottons')
    expect(ids).toContain('bottons')
    expect(ids).toContain('anime')
    expect(ids).toContain('naruto')
    expect(ids).toContain('villains')
    expect(ids).toHaveLength(REAL_TREE.length)
  })

  it('folha devolve só o próprio id', () => {
    expect(descendantIds(REAL_TREE, 'naruto')).toEqual(['naruto'])
  })

  it('não devolve duplicata', () => {
    const ids = descendantIds(REAL_TREE, 'bottons')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ciclo termina, tratando o nó repetido como folha', () => {
    const ciclo = [cat('a', 'A', { parent_id: 'b' }), cat('b', 'B', { parent_id: 'a' })]
    expect(descendantIds(ciclo, 'a').sort()).toEqual(['a', 'b'])
  })

  it('id inexistente devolve só ele — a consulta acima resulta em lista vazia', () => {
    expect(descendantIds(REAL_TREE, 'fantasma')).toEqual(['fantasma'])
  })
})

// ---------------------------------------------------------------------------
// URL-03 — a entrada do menu monta o href pela árvore
//
// Os três casos vinham de `menuEntries`, apagada na T30. Foram **reescritos** contra `menuItems`,
// que é a porta única desde a feature 39 — a regra medida (`AD-018`) não mudou: a canônica tem no
// máximo dois segmentos, e um pai que a RLS esconde não pode aparecer numa URL que a cliente abre.
// ---------------------------------------------------------------------------
describe('a entrada do menu monta o href pela árvore (URL-03)', () => {
  const barra = (tree: MenuCategory[]) => menuItems({ categories: tree }, 'desktop')

  it('entrada RAIZ marcada sai com um segmento só', () => {
    const tree = REAL_TREE.map(c => (c.id === 'bottons' ? { ...c, menu_desktop: true } : c))
    // Com o pai marcado, as filhas marcadas viram painel dele — e a entrada da barra é a raiz.
    const bottons = barra(tree).find(i => i.kind === 'category' && i.slug === 'bottons')!
    expect(bottons.href).toBe('/bottons')
  })

  it('entrada FILHA marcada sai com dois segmentos', () => {
    const anime = barra(REAL_TREE).find(i => i.kind === 'category' && i.slug === 'anime')!
    expect(anime.href).toBe('/bottons/anime')
  })

  it('pai INATIVO não entra no href — a canônica que a loja serve é a de um segmento', () => {
    // O href é montado sobre as categorias VISÍVEIS: um pai que a RLS esconde não pode aparecer
    // numa URL que a cliente vai abrir. A forma de um segmento resolve com 200 e declara a sua.
    const tree = REAL_TREE.map(c => (c.id === 'bottons' ? { ...c, active: false } : c))
    expect(barra(tree).find(i => i.kind === 'category' && i.slug === 'anime')!.href).toBe('/anime')
  })
})

// ---------------------------------------------------------------------------
// URL-03 — o formato legado saiu do domínio do menu
// ---------------------------------------------------------------------------
describe('o caminho legado de coleção não é mais construído em core', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const CORE_SRC = resolve(HERE, '../..')

  // Montado por junção **de propósito**: escrito por extenso, o próprio guarda apareceria na
  // varredura e a régua viraria o objeto medido.
  const LEGADO = ['/', 'colecao', '/'].join('')

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        // `routes/` é a exceção declarada: é lá que as formas legadas vivem COMO DADO
        // (`LEGACY_REDIRECTS`), que é a finalidade do módulo. O que não pode existir é href montado
        // à mão fora dele.
        return entry.name === 'routes' ? [] : sourceFiles(full)
      }
      return entry.isFile() && /\.ts$/.test(entry.name) ? [full] : []
    })

  it('nenhum arquivo de core monta o caminho legado à mão — nem em comentário', () => {
    const files = sourceFiles(CORE_SRC)
    // Âncora dupla: a varredura leu arquivos DE VERDADE e alcançou o arquivo que ela existe para
    // vigiar. Sem as duas, um caminho errado varre zero e passa em silêncio.
    expect(files.length).toBeGreaterThan(15)
    expect(files.map(f => relative(CORE_SRC, f).replace(/\\/g, '/'))).toContain('menu/menu.ts')

    const offenders = files
      .flatMap(file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((text, index) => ({ file, line: index + 1, text }))
          .filter(entry => entry.text.includes(LEGADO)),
      )
      .map(entry => `${relative(CORE_SRC, entry.file)}:${entry.line} — ${entry.text.trim()}`)

    expect(offenders).toEqual([])
  })
})
