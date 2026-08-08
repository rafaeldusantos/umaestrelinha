// RFN-09 / T54 — o domínio da árvore.
//
// Cada teste aqui é uma AC da task, e não uma leitura do que o código faz: a contagem do pai inclui
// as filhas, a busca não deixa filha órfã na tela, a seleção cascateia como a barra promete, e o
// arraste recusa mudar de pai.

import { describe, expect, it } from 'vitest'
import {
  buildCategoryTree,
  cascadeSelection,
  deletionImpact,
  eligibleParents,
  filterCategoryRows,
  moveDestinations,
  moveSelection,
  planMove,
  reorderWithinParent,
  type CategoryRow,
} from './categoryTree'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory => ({
  slug: over.slug ?? over.id,
  description: null, image_url: null, banner_url: null, color_accent: null,
  active: true, sort_order: 0, parent_id: null, product_count: 0,
  ...over,
} as AdminCategory)

/** Anime(6) com Sailor(12) e Chainsaw(9); K-Pop(5) sem filha; Games(0) oculta. */
const catalog = (): AdminCategory[] => [
  cat({ id: 'anime', name: 'Anime', sort_order: 1, product_count: 6 }),
  cat({ id: 'sailor', name: 'Sailor Moon', parent_id: 'anime', sort_order: 1, product_count: 12 }),
  cat({ id: 'chainsaw', name: 'Chainsaw Man', parent_id: 'anime', sort_order: 2, product_count: 9 }),
  cat({ id: 'kpop', name: 'K-Pop', sort_order: 2, product_count: 5 }),
  cat({ id: 'games', name: 'Games', sort_order: 3, product_count: 0, active: false }),
]

/** Avó › Filha › Neta, mais uma raiz solta — o catálogo de três níveis. */
const treeNetos = (): AdminCategory[] => [
  cat({ id: 'avo', name: 'Avó', sort_order: 1, product_count: 1 }),
  cat({ id: 'filha', name: 'Filha', parent_id: 'avo', sort_order: 1, product_count: 2 }),
  cat({ id: 'neta', name: 'Neta', parent_id: 'filha', sort_order: 1, product_count: 4 }),
  cat({ id: 'outra', name: 'Outra', sort_order: 2, product_count: 7 }),
]

const idsOf = (rows: CategoryRow[]) => rows.map(r => r.category.id)
const rowFor = (rows: CategoryRow[], id: string) => rows.find(r => r.category.id === id)!

describe('buildCategoryTree — contagem e forma (T54 AC 1)', () => {
  it('o pai mostra própria + das filhas; a filha mostra só a própria', () => {
    const rows = buildCategoryTree(catalog())

    expect(rowFor(rows, 'anime').totalCount).toBe(27) // 6 + 12 + 9
    expect(rowFor(rows, 'anime').ownCount).toBe(6)
    expect(rowFor(rows, 'sailor').totalCount).toBe(12)
    expect(rowFor(rows, 'kpop').totalCount).toBe(5)
  })

  it('achata na ordem de desenho: raiz, filhas dela, próxima raiz — por sort_order', () => {
    expect(idsOf(buildCategoryTree(catalog()))).toEqual([
      'anime', 'sailor', 'chainsaw', 'kpop', 'games',
    ])
  })

  it('marca a última filha, que é quem desenha `└` em vez de `├`', () => {
    const rows = buildCategoryTree(catalog())

    expect(rowFor(rows, 'sailor').isLastChild).toBe(false)
    expect(rowFor(rows, 'chainsaw').isLastChild).toBe(true)
  })

  it('a raiz sabe quantas filhas tem, para o caret e o selo "N subcategorias"', () => {
    const rows = buildCategoryTree(catalog())

    expect(rowFor(rows, 'anime').childCount).toBe(2)
    expect(rowFor(rows, 'kpop').childCount).toBe(0)
  })
})

describe('buildCategoryTree — a neta é linha, não é dado perdido', () => {
  it('desenha o terceiro nível em vez de parar na filha', () => {
    const rows = buildCategoryTree(treeNetos())

    expect(idsOf(rows)).toEqual(['avo', 'filha', 'neta', 'outra'])
    expect(rowFor(rows, 'neta').depth).toBe(2)
  })

  it('a contagem do avô soma a descendência INTEIRA, não só as filhas diretas', () => {
    const rows = buildCategoryTree(treeNetos())

    expect(rowFor(rows, 'avo').totalCount).toBe(7) // 1 + 2 + 4
    expect(rowFor(rows, 'filha').totalCount).toBe(6) // 2 + 4
    expect(rowFor(rows, 'neta').totalCount).toBe(4)
  })

  it('a filha com neta anuncia o próprio caret', () => {
    const rows = buildCategoryTree(treeNetos())

    expect(rowFor(rows, 'filha').childCount).toBe(1)
    expect(rowFor(rows, 'neta').childCount).toBe(0)
  })
})

describe('buildCategoryTree — dado quebrado continua visível (T54 AC 5)', () => {
  it('ciclo em parent_id não trava, e as duas continuam na tela como raiz', () => {
    const rows = buildCategoryTree([
      cat({ id: 'a', name: 'A', parent_id: 'b' }),
      cat({ id: 'b', name: 'B', parent_id: 'a' }),
    ])

    expect(idsOf(rows).sort()).toEqual(['a', 'b'])
    expect(rows.every(r => r.depth === 0)).toBe(true)
  })

  it('filha de um pai que não existe vira raiz em vez de sumir', () => {
    const rows = buildCategoryTree([cat({ id: 'orfa', name: 'Órfã', parent_id: 'fantasma' })])

    expect(idsOf(rows)).toEqual(['orfa'])
    expect(rowFor(rows, 'orfa').depth).toBe(0)
  })
})

describe('filterCategoryRows — busca (T54 AC 2)', () => {
  const rows = () => buildCategoryTree(catalog())

  it('casa nome e slug, ignorando acento e caixa', () => {
    const porNome = filterCategoryRows(rows(), { search: 'SAILOR', view: 'todas' })
    expect(idsOf(porNome)).toContain('sailor')

    const comAcento = filterCategoryRows(
      buildCategoryTree([cat({ id: 'series', name: 'Filmes & Séries', slug: 'filmes-e-series' })]),
      { search: 'series', view: 'todas' },
    )
    expect(idsOf(comAcento)).toEqual(['series'])
  })

  it('mantém o pai visível quando só a FILHA casa — filha não fica pendurada em nada', () => {
    const found = filterCategoryRows(rows(), { search: 'Chainsaw', view: 'todas' })

    expect(idsOf(found)).toEqual(['anime', 'chainsaw'])
  })

  it('quando o PAI casa, as filhas ficam — quem busca "Anime" quer o ramo', () => {
    const found = filterCategoryRows(rows(), { search: 'Anime', view: 'todas' })

    expect(idsOf(found)).toEqual(['anime', 'sailor', 'chainsaw'])
  })

  it('busca vazia devolve tudo', () => {
    expect(filterCategoryRows(rows(), { search: '   ', view: 'todas' })).toHaveLength(5)
  })

  it('a NETA que casa mantém a cadeia inteira — a mãe também ficaria pendurada em nada', () => {
    const found = filterCategoryRows(buildCategoryTree(treeNetos()), { search: 'Neta', view: 'todas' })

    expect(idsOf(found)).toEqual(['avo', 'filha', 'neta'])
  })

  it('o avô que casa leva o ramo inteiro, e não só o primeiro nível', () => {
    const found = filterCategoryRows(buildCategoryTree(treeNetos()), { search: 'Avó', view: 'todas' })

    expect(idsOf(found)).toEqual(['avo', 'filha', 'neta'])
  })
})

describe('filterCategoryRows — visões (T54 AC 2)', () => {
  const rows = () => buildCategoryTree(catalog())

  it('`ocultas` traz só quem está fora da vitrine', () => {
    expect(idsOf(filterCategoryRows(rows(), { search: '', view: 'ocultas' }))).toEqual(['games'])
  })

  it('`vitrine` exclui a oculta', () => {
    expect(idsOf(filterCategoryRows(rows(), { search: '', view: 'vitrine' }))).not.toContain('games')
  })

  it('`sem-produto` usa o total COM as filhas — pai com filha vendendo não é "sem produto"', () => {
    const semProduto = filterCategoryRows(
      buildCategoryTree([
        cat({ id: 'pai', name: 'Pai', product_count: 0 }),
        cat({ id: 'filha', name: 'Filha', parent_id: 'pai', product_count: 4 }),
        cat({ id: 'vazia', name: 'Vazia', product_count: 0 }),
      ]),
      { search: '', view: 'sem-produto' },
    )

    expect(idsOf(semProduto)).toContain('vazia')
    expect(idsOf(semProduto)).not.toContain('pai')
  })
})

describe('cascadeSelection — as subcategorias acompanham (T54 AC 3)', () => {
  it('marcar o pai inclui as filhas no conjunto que vai para o update', () => {
    const selected = cascadeSelection(['anime'], buildCategoryTree(catalog()))

    expect(selected.sort()).toEqual(['anime', 'chainsaw', 'sailor'])
  })

  it('marcar só a filha não arrasta o pai', () => {
    expect(cascadeSelection(['sailor'], buildCategoryTree(catalog()))).toEqual(['sailor'])
  })

  it('seleção vazia continua vazia', () => {
    expect(cascadeSelection([], buildCategoryTree(catalog()))).toEqual([])
  })
})

describe('deletionImpact — o que se pode dizer com honestidade (T57 AC 1)', () => {
  it('conta categorias, subcategorias e vínculos com produtos', () => {
    const impact = deletionImpact(buildCategoryTree(catalog()), ['anime', 'sailor'])

    expect(impact.categories).toBe(2)
    expect(impact.subcategories).toBe(1)
    expect(impact.productLinks).toBe(18) // 6 próprios da raiz + 12 da filha
  })

  it('usa a contagem PRÓPRIA de cada linha, não o total com filhas — senão contaria em dobro', () => {
    const impact = deletionImpact(buildCategoryTree(catalog()), ['anime'])

    expect(impact.productLinks).toBe(6)
  })

  it('devolve as linhas afetadas, para o diálogo listar cada uma com a própria contagem', () => {
    const impact = deletionImpact(buildCategoryTree(catalog()), ['anime', 'sailor'])

    expect(impact.rows.map(r => r.category.id)).toEqual(['anime', 'sailor'])
    expect(impact.rows.map(r => r.ownCount)).toEqual([6, 12])
  })

  it('seleção vazia é impacto zero', () => {
    const impact = deletionImpact(buildCategoryTree(catalog()), [])

    expect(impact).toMatchObject({ categories: 0, subcategories: 0, productLinks: 0 })
  })
})

describe('eligibleParents — quem pode ser pai (T56 AC 2)', () => {
  it('não oferece a própria categoria', () => {
    const options = eligibleParents(catalog(), 'anime').map(c => c.id)

    expect(options).not.toContain('anime')
  })

  it('não oferece uma filha dela — seria ciclo', () => {
    const options = eligibleParents(catalog(), 'anime').map(c => c.id)

    expect(options).not.toContain('sailor')
    expect(options).not.toContain('chainsaw')
    expect(options).toEqual(['kpop', 'games'])
  })

  it('exclui a NETA também, mesmo listada antes da filha', () => {
    const options = eligibleParents(
      [
        cat({ id: 'neta', name: 'Neta', parent_id: 'filha' }),
        cat({ id: 'filha', name: 'Filha', parent_id: 'avo' }),
        cat({ id: 'avo', name: 'Avó' }),
        cat({ id: 'outra', name: 'Outra' }),
      ],
      'avo',
    ).map(c => c.id)

    expect(options).toEqual(['outra'])
  })

  it('categoria nova pode escolher qualquer uma', () => {
    expect(eligibleParents(catalog(), null)).toHaveLength(5)
  })
})

describe('moveSelection — quem muda de pai e quem só vai junto', () => {
  it('marcar o pai move o pai; a filha é CARREGADA, não recebe pai novo', () => {
    const rows = buildCategoryTree(catalog())
    const { moving, carried } = moveSelection(rows, cascadeSelection(['anime'], rows))

    expect(idsOf(moving)).toEqual(['anime'])
    expect(idsOf(carried)).toEqual(['sailor', 'chainsaw'])
  })

  it('duas filhas do mesmo pai, sem o pai marcado, movem-se as duas', () => {
    const rows = buildCategoryTree(catalog())
    const { moving, carried } = moveSelection(rows, ['sailor', 'chainsaw'])

    expect(idsOf(moving)).toEqual(['sailor', 'chainsaw'])
    expect(carried).toEqual([])
  })

  it('cobre a cadeia inteira: com o avô marcado, a NETA também é só carregada', () => {
    const rows = buildCategoryTree(treeNetos())
    const { moving, carried } = moveSelection(rows, ['avo', 'filha', 'neta'])

    expect(idsOf(moving)).toEqual(['avo'])
    expect(idsOf(carried)).toEqual(['filha', 'neta'])
  })

  it('seleção vazia não move nada', () => {
    expect(moveSelection(buildCategoryTree(catalog()), [])).toEqual({ moving: [], carried: [] })
  })
})

describe('moveDestinations — para onde dá para ir', () => {
  it('não oferece a que se move nem a descendência dela — seria ciclo', () => {
    const rows = buildCategoryTree(treeNetos())

    expect(idsOf(moveDestinations(rows, ['avo']))).toEqual(['outra'])
  })

  it('oferece o resto da árvore na ordem de desenho, com a profundidade', () => {
    const rows = buildCategoryTree(catalog())
    const destinos = moveDestinations(rows, ['sailor'])

    expect(idsOf(destinos)).toEqual(['anime', 'chainsaw', 'kpop', 'games'])
    expect(destinos.find(r => r.category.id === 'chainsaw')!.depth).toBe(1)
  })

  it('sem nada em movimento, tudo é destino', () => {
    expect(moveDestinations(buildCategoryTree(catalog()), [])).toHaveLength(5)
  })
})

describe('planMove — o que o `Mover para…` grava', () => {
  const rows = () => buildCategoryTree(catalog())

  it('grava o pai novo e enfileira DEPOIS das irmãs que já moram no destino', () => {
    // K-Pop e Games viram filhas de Anime, que já tem Sailor(1) e Chainsaw(2).
    const plan = planMove(catalog(), rows(), ['kpop', 'games'], 'anime')

    expect(plan).toEqual([
      { id: 'kpop', parent_id: 'anime', sort_order: 3 },
      { id: 'games', parent_id: 'anime', sort_order: 4 },
    ])
  })

  it('promover a raiz enfileira depois das raízes existentes', () => {
    const plan = planMove(catalog(), rows(), ['sailor'], null)

    expect(plan).toEqual([{ id: 'sailor', parent_id: null, sort_order: 4 }])
  })

  it('a filha carregada NÃO entra no plano — senão viraria irmã da própria mãe', () => {
    const plan = planMove(catalog(), rows(), cascadeSelection(['anime'], rows()), null)

    expect(plan).toEqual([])
  })

  it('quem já está no destino não é reescrita', () => {
    const plan = planMove(catalog(), rows(), ['sailor', 'kpop'], 'anime')

    expect(plan).toEqual([{ id: 'kpop', parent_id: 'anime', sort_order: 3 }])
  })

  it('destino dentro da própria seleção devolve plano vazio — a segunda tranca contra ciclo', () => {
    expect(planMove(catalog(), rows(), ['anime'], 'sailor')).toEqual([])
  })

  it('seleção vazia devolve plano vazio', () => {
    expect(planMove(catalog(), rows(), [], 'anime')).toEqual([])
  })
})

describe('reorderWithinParent — o arraste (T54 AC 4)', () => {
  it('recusa mover para outro pai — isso é o campo "Categoria pai", não o arraste', () => {
    expect(reorderWithinParent(catalog(), 'sailor', 'kpop')).toBeNull()
  })

  it('reordena entre irmãs e grava só as linhas que MUDARAM de posição', () => {
    const changed = reorderWithinParent(catalog(), 'chainsaw', 'sailor')

    expect(changed).toEqual([
      { id: 'chainsaw', sort_order: 1 },
      { id: 'sailor', sort_order: 2 },
    ])
  })

  it('reordena raízes entre si', () => {
    const changed = reorderWithinParent(catalog(), 'games', 'anime')

    expect(changed).toEqual([
      { id: 'games', sort_order: 1 },
      { id: 'anime', sort_order: 2 },
      { id: 'kpop', sort_order: 3 },
    ])
  })

  it('soltar em cima de si mesma não grava nada', () => {
    expect(reorderWithinParent(catalog(), 'anime', 'anime')).toEqual([])
  })

  it('id inexistente não explode — devolve null', () => {
    expect(reorderWithinParent(catalog(), 'fantasma', 'anime')).toBeNull()
  })
})
