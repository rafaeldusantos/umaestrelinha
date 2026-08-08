import { describe, it, expect } from 'vitest'
import {
  MENU_SLOT_LIMIT,
  ancestorsOf,
  bySortOrder,
  descendantIds,
  menuEntries,
  menuSlotRefusal,
  pathLabel,
  resolvePromo,
  slotsUsed,
  type MenuCategory,
} from '../menu'

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
  show_in_menu: false,
  menu_promo: null,
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
  cat('anime', 'Anime', { parent_id: 'bottons', sort_order: 1, show_in_menu: true }),
  cat('kpop', 'K-Pop', { parent_id: 'bottons', sort_order: 2, show_in_menu: true }),
  cat('filmes', 'Filmes', { parent_id: 'bottons', sort_order: 3, show_in_menu: true }),
  cat('games', 'Games', { parent_id: 'bottons', sort_order: 5, show_in_menu: true }),
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
// MENU-05, MENU-10, MENU-14 — entradas do menu
// ---------------------------------------------------------------------------
describe('menuEntries (MENU-05, MENU-10, MENU-14)', () => {
  it('devolve só as marcadas, em ordem, com o caminho na árvore', () => {
    const entries = menuEntries(REAL_TREE)
    expect(entries.map(e => e.name)).toEqual(['Anime', 'K-Pop', 'Filmes', 'Games'])
    // Nem "Bottons" (contêiner, não marcado) nem "Academia" aparecem — era o bug do topo.
    expect(entries.map(e => e.name)).not.toContain('Bottons')
    expect(entries.map(e => e.name)).not.toContain('Academia')
    expect(entries[0].path).toBe('Bottons › Anime')
    expect(entries[0].href).toBe('/colecao/anime')
  })

  it('aceita entrada em qualquer profundidade — os universos são filhas de "Bottons"', () => {
    expect(menuEntries(REAL_TREE).every(e => e.name !== 'Bottons')).toBe(true)
    expect(menuEntries(REAL_TREE)).toHaveLength(4)
  })

  it('traz as subcategorias ativas, ordenadas', () => {
    const anime = menuEntries(REAL_TREE)[0]
    expect(anime.children.map(c => c.name)).toEqual(['Naruto', 'Villains'])
  })

  it('entrada sem subcategoria vem com children vazio — vira link direto (MENU-14)', () => {
    const kpop = menuEntries(REAL_TREE).find(e => e.slug === 'kpop')!
    expect(kpop.children).toEqual([])
    expect(kpop.promo).toBeNull()
  })

  it('categoria marcada mas INATIVA não aparece (MENU-10)', () => {
    const tree = REAL_TREE.map(c => (c.id === 'anime' ? { ...c, active: false } : c))
    expect(menuEntries(tree).map(e => e.name)).toEqual(['K-Pop', 'Filmes', 'Games'])
  })

  it('subcategoria inativa não entra em children', () => {
    const tree = REAL_TREE.map(c => (c.id === 'naruto' ? { ...c, active: false } : c))
    expect(menuEntries(tree)[0].children.map(c => c.name)).toEqual(['Villains'])
  })

  it('lista vazia devolve vazio', () => {
    expect(menuEntries([])).toEqual([])
  })

  it('todas inativas devolve vazio — a barra fica só com os itens fixos', () => {
    expect(menuEntries(REAL_TREE.map(c => ({ ...c, active: false })))).toEqual([])
  })

  it('NÃO trunca em 4: cinco marcadas devolvem cinco, para a quinta poder ser desmarcada', () => {
    const tree = REAL_TREE.map(c => (c.id === 'bandas' ? { ...c, show_in_menu: true } : c))
    expect(menuEntries(tree)).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// MENU-06 — o limite de vagas
// ---------------------------------------------------------------------------
describe('slotsUsed e menuSlotRefusal (MENU-06)', () => {
  it('conta as marcadas', () => {
    expect(slotsUsed(REAL_TREE)).toBe(4)
    expect(MENU_SLOT_LIMIT).toBe(4)
  })

  it('conta a marcada INATIVA também — a vaga fica reservada', () => {
    const tree = REAL_TREE.map(c => (c.id === 'anime' ? { ...c, active: false } : c))
    expect(slotsUsed(tree)).toBe(4)
    // …e ela não renderiza, então a loja mostra 3 de 4 vagas reservadas.
    expect(menuEntries(tree)).toHaveLength(3)
  })

  it('recusa a quinta com o motivo, e o motivo diz o que fazer', () => {
    const refusal = menuSlotRefusal(REAL_TREE, 'bandas')
    expect(refusal).toContain('4 vagas')
    expect(refusal).toContain('Desligue uma')
  })

  it('aceita a quarta quando só três estão ocupadas', () => {
    const tree = REAL_TREE.map(c => (c.id === 'games' ? { ...c, show_in_menu: false } : c))
    expect(slotsUsed(tree)).toBe(3)
    expect(menuSlotRefusal(tree, 'bandas')).toBeNull()
  })

  it('ligar quem já está ligado é idempotente, mesmo com as 4 vagas cheias', () => {
    expect(menuSlotRefusal(REAL_TREE, 'anime')).toBeNull()
  })

  it('categoria inexistente é recusada com motivo próprio', () => {
    expect(menuSlotRefusal(REAL_TREE, 'fantasma')).toBe('Categoria não encontrada.')
  })
})

// ---------------------------------------------------------------------------
// MENU-25, MENU-26, MENU-27 — o card promocional
// ---------------------------------------------------------------------------
describe('resolvePromo (MENU-25, MENU-26)', () => {
  const promo = { category_id: 'villains', badge: 'NOVIDADE' }

  it('resolve destino, link e contagem', () => {
    const tree = REAL_TREE.map(c => (c.id === 'villains' ? { ...c, product_count: 12 } : c))
    const resolved = resolvePromo(tree, promo)!
    expect(resolved.href).toBe('/colecao/villains')
    expect(resolved.badge).toBe('NOVIDADE')
    expect(resolved.productCount).toBe(12)
  })

  it('título e texto vazios caem no nome e na descrição do destino (MENU-25)', () => {
    const resolved = resolvePromo(REAL_TREE, promo)!
    expect(resolved.title).toBe('Villains')
    expect(resolved.subtitle).toBe('12 pins dos vilões.')
  })

  it('título e texto preenchidos sobrescrevem o destino', () => {
    const resolved = resolvePromo(REAL_TREE, {
      ...promo,
      title: 'Coleção Anime Villains',
      subtitle: 'Só os melhores.',
    })!
    expect(resolved.title).toBe('Coleção Anime Villains')
    expect(resolved.subtitle).toBe('Só os melhores.')
  })

  it('texto em branco (só espaços) conta como ausente, não como texto vazio', () => {
    const resolved = resolvePromo(REAL_TREE, { ...promo, title: '   ', badge: '  ' })!
    expect(resolved.title).toBe('Villains')
    expect(resolved.badge).toBeNull()
  })

  it('destino APAGADO devolve null (MENU-26) — jsonb não tem FK que limpe a referência', () => {
    const semDestino = REAL_TREE.filter(c => c.id !== 'villains')
    expect(resolvePromo(semDestino, promo)).toBeNull()
  })

  it('destino INATIVO devolve null (MENU-26)', () => {
    const inativo = REAL_TREE.map(c => (c.id === 'villains' ? { ...c, active: false } : c))
    expect(resolvePromo(inativo, promo)).toBeNull()
  })

  it('destino sem descrição devolve subtitle nulo em vez de string vazia', () => {
    const resolved = resolvePromo(REAL_TREE, { category_id: 'naruto' })!
    expect(resolved.subtitle).toBeNull()
  })

  it('promo apontando para a PRÓPRIA categoria é aceita', () => {
    expect(resolvePromo(REAL_TREE, { category_id: 'anime' })?.href).toBe('/colecao/anime')
  })

  describe('jsonb malformado devolve null sem lançar', () => {
    const casos: [string, unknown][] = [
      ['nulo', null],
      ['undefined', undefined],
      ['string', 'villains'],
      ['número', 42],
      ['array', [{ category_id: 'villains' }]],
      ['objeto sem category_id', { badge: 'NOVIDADE' }],
      ['category_id vazio', { category_id: '' }],
      ['category_id em branco', { category_id: '   ' }],
      ['category_id não-string', { category_id: 42 }],
    ]
    it.each(casos)('%s', (_label, raw) => {
      expect(resolvePromo(REAL_TREE, raw)).toBeNull()
    })
  })

  it('menuEntries resolve a promo da entrada e devolve null quando o destino não serve', () => {
    const comPromo = REAL_TREE.map(c =>
      c.id === 'anime' ? { ...c, menu_promo: { category_id: 'villains' } } : c,
    )
    expect(menuEntries(comPromo)[0].promo?.title).toBe('Villains')

    const destinoInativo = comPromo.map(c => (c.id === 'villains' ? { ...c, active: false } : c))
    expect(menuEntries(destinoInativo)[0].promo).toBeNull()
  })
})
