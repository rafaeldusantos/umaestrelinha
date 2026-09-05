import { describe, expect, it } from 'vitest'
import { MENU_PANEL_COLUMN_SIZE, menuPanelColumns, type MenuCategory } from '../menu'

/**
 * Feature 39 — `NAV-24`: as colunas do painel são **calculadas**, e não configuradas.
 *
 * O que este arquivo prova, além da aritmética: que a ordem de entrada sobrevive dentro e entre as
 * colunas. É a única entrada da função — a ordem da árvore, a mesma da grade da home e do rodapé —,
 * e é ela que faz a nona filha começar a segunda coluna sem mexer nas oito primeiras.
 */
const filhas = (quantas: number): MenuCategory[] =>
  Array.from({ length: quantas }, (_, i) => ({
    id: `c${i}`,
    name: `Filha ${String(i).padStart(2, '0')}`,
    slug: `c${i}`,
    description: null,
    parent_id: 'pai',
    sort_order: i,
    active: true,
  }))

const formato = (colunas: MenuCategory[][]): number[] => colunas.map(c => c.length)

describe('menuPanelColumns (NAV-24)', () => {
  it('sem filhas, não há coluna', () => {
    expect(menuPanelColumns([])).toEqual([])
  })

  it.each([
    [1, [1]],
    [7, [7]],
    [8, [8]],
    [9, [8, 1]],
    [16, [8, 8]],
    [17, [8, 8, 1]],
    [25, [8, 8, 8, 1]],
  ])('%i filhas viram colunas %j', (quantas, esperado) => {
    expect(formato(menuPanelColumns(filhas(quantas)))).toEqual(esperado)
  })

  it('enche a primeira coluna antes de abrir a segunda — não distribui equilibrado', () => {
    // Distribuir 9 em 5+4 faria a décima filha mudar a nona de coluna sem nada ter mudado nela.
    expect(formato(menuPanelColumns(filhas(9)))).toEqual([8, 1])
  })

  it('a ordem de entrada é preservada dentro e entre as colunas', () => {
    const colunas = menuPanelColumns(filhas(17))
    expect(colunas.flat().map(c => c.id)).toEqual(filhas(17).map(c => c.id))
    expect(colunas[0][0].id).toBe('c0')
    expect(colunas[1][0].id).toBe('c8')
    expect(colunas[2][0].id).toBe('c16')
  })

  it('não muda a lista que recebeu', () => {
    const entrada = filhas(9)
    menuPanelColumns(entrada)
    expect(entrada.map(c => c.id)).toEqual(filhas(9).map(c => c.id))
  })

  it('o teto de coluna é 8 — âncora do número que a AC cita', () => {
    expect(MENU_PANEL_COLUMN_SIZE).toBe(8)
  })

  it('aceita um teto próprio, para quem tem menos altura', () => {
    expect(formato(menuPanelColumns(filhas(9), 3))).toEqual([3, 3, 3])
    expect(formato(menuPanelColumns(filhas(10), 3))).toEqual([3, 3, 3, 1])
  })

  it.each([
    ['zero', 0],
    ['negativo', -4],
    ['fracionário', 2.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('teto %s cai no padrão em vez de laçar para sempre', (_label, max) => {
    // Um laço sem progresso aqui não é "coluna errada": é o header não renderizar nunca.
    expect(formato(menuPanelColumns(filhas(9), max))).toEqual([8, 1])
  })

  it('lista ausente devolve lista vazia em vez de lançar', () => {
    expect(menuPanelColumns(undefined as unknown as MenuCategory[])).toEqual([])
  })

  it('não existe campo de configuração de coluna — a única entrada é a ordem recebida', () => {
    // Se a ordem muda, o arranjo muda junto. É o que impede um "coluna: 2" por filha, que ficaria
    // com buraco no instante em que uma filha fosse desmarcada.
    const invertidas = [...filhas(9)].reverse()
    expect(menuPanelColumns(invertidas)[0][0].id).toBe('c8')
    expect(menuPanelColumns(invertidas)[1][0].id).toBe('c0')
  })
})
