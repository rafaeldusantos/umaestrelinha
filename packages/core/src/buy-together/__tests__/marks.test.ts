import { describe, expect, it } from 'vitest'

import {
  companionPhrase,
  markColumns,
  marksFromColumns,
  orderItemCompanionNames,
  orderItemMarks,
} from '../marks.ts'

const LISTA = '7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b'
const OUTRA_LISTA = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

describe('orderItemMarks — as marcas "acompanha" que o pedido aceita', () => {
  it('aceita a marca cujo principal está no pedido, com a lista de origem', () => {
    expect(
      orderItemMarks([{ mainProductId: 'joia', listId: LISTA }], ['joia', 'corrente'], 'corrente'),
    ).toEqual([{ mainProductId: 'joia', listId: LISTA }])
  })

  it('aceita a peça avulsa, sem lista; lista ausente vale como avulsa', () => {
    expect(orderItemMarks([{ mainProductId: 'joia', listId: null }], ['joia', 'brinco'], 'brinco')).toEqual([
      { mainProductId: 'joia', listId: null },
    ])
    expect(orderItemMarks([{ mainProductId: 'joia' }], ['joia', 'brinco'], 'brinco')).toEqual([
      { mainProductId: 'joia', listId: null },
    ])
  })

  it('guarda TODOS os principais da linha, na ordem — "o X e o Y" não se perde', () => {
    expect(
      orderItemMarks(
        [
          { mainProductId: 'joia', listId: LISTA },
          { mainProductId: 'anel', listId: null },
        ],
        ['joia', 'anel', 'corrente'],
        'corrente',
      ),
    ).toEqual([
      { mainProductId: 'joia', listId: LISTA },
      { mainProductId: 'anel', listId: null },
    ])
  })

  it('descarta só a marca cujo principal não está no pedido; as outras ficam', () => {
    expect(
      orderItemMarks(
        [
          { mainProductId: 'saiu-da-sacola', listId: null },
          { mainProductId: 'anel', listId: OUTRA_LISTA },
        ],
        ['anel', 'brinco'],
        'brinco',
      ),
    ).toEqual([{ mainProductId: 'anel', listId: OUTRA_LISTA }])
  })

  it('descarta a marca que aponta para a própria linha', () => {
    expect(orderItemMarks([{ mainProductId: 'brinco', listId: null }], ['brinco'], 'brinco')).toEqual([])
  })

  it('descarta a marca forjada: principal que não é texto, ou lista que não é um id', () => {
    const pedido = ['joia', 'brinco']
    expect(orderItemMarks([{ mainProductId: 42, listId: null }], pedido, 'brinco')).toEqual([])
    expect(orderItemMarks([{ mainProductId: '', listId: null }], pedido, 'brinco')).toEqual([])
    expect(orderItemMarks([{ mainProductId: 'joia', listId: "x'; drop table" }], pedido, 'brinco')).toEqual([])
    expect(orderItemMarks([{ mainProductId: 'joia', listId: 7 }], pedido, 'brinco')).toEqual([])
  })

  it('a mesma marca repetida entra uma vez; o mesmo principal com outra lista entra de novo', () => {
    expect(
      orderItemMarks(
        [
          { mainProductId: 'joia', listId: LISTA },
          { mainProductId: 'joia', listId: LISTA },
          { mainProductId: 'joia', listId: OUTRA_LISTA },
        ],
        ['joia', 'brinco'],
        'brinco',
      ),
    ).toEqual([
      { mainProductId: 'joia', listId: LISTA },
      { mainProductId: 'joia', listId: OUTRA_LISTA },
    ])
  })

  it('sem marca, nada', () => {
    expect(orderItemMarks(undefined, ['joia'], 'brinco')).toEqual([])
    expect(orderItemMarks([], ['joia'], 'brinco')).toEqual([])
  })
})

describe('markColumns e marksFromColumns — as duas colunas, alinhadas por posição', () => {
  it('as marcas viram dois arrays do mesmo tamanho', () => {
    expect(
      markColumns([
        { mainProductId: 'joia', listId: LISTA },
        { mainProductId: 'anel', listId: null },
      ]),
    ).toEqual({ accompanies_product_ids: ['joia', 'anel'], accompanies_list_ids: [LISTA, null] })
  })

  it('sem marca, as duas colunas são nulas', () => {
    expect(markColumns([])).toEqual({ accompanies_product_ids: null, accompanies_list_ids: null })
  })

  it('o caminho de volta casa principal e lista pela posição; lista curta vira avulsa', () => {
    expect(marksFromColumns(['joia', 'anel'], [LISTA])).toEqual([
      { mainProductId: 'joia', listId: LISTA },
      { mainProductId: 'anel', listId: null },
    ])
    expect(marksFromColumns('joia', [LISTA])).toEqual([])
    expect(marksFromColumns(null, null)).toEqual([])
  })
})

describe('companionPhrase — a frase da peça que acompanha', () => {
  it('um principal', () => {
    expect(companionPhrase(['Pingente Estrela'])).toBe('Acompanha o Pingente Estrela')
  })

  it('dois principais: "o X e o Y"', () => {
    expect(companionPhrase(['Pingente Estrela', 'Anel Lua'])).toBe('Acompanha o Pingente Estrela e o Anel Lua')
  })

  it('três principais', () => {
    expect(companionPhrase(['A', 'B', 'C'])).toBe('Acompanha o A, o B e o C')
  })

  it('sem principal, sem frase', () => {
    expect(companionPhrase([])).toBeNull()
  })
})

describe('orderItemCompanionNames — os nomes dos principais saem de outras linhas do mesmo pedido', () => {
  const pedido = [
    { id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela' },
    { id: 'i2', product_id: 'joia', product_name: 'Pingente Estrela (outra variação)' },
    { id: 'i3', product_id: 'anel', product_name: 'Anel Lua' },
    { id: 'i4', product_id: 'corrente', product_name: 'Corrente Veneziana', accompanies_product_ids: ['joia', 'anel'] },
    { id: 'i5', product_id: 'brinco', product_name: 'Brinco', accompanies_product_ids: null },
  ]

  it('nomeia cada principal pela primeira linha dele, na ordem das marcas', () => {
    expect(orderItemCompanionNames(pedido[3], pedido)).toEqual(['Pingente Estrela', 'Anel Lua'])
  })

  it('o mesmo principal (com duas listas) é nomeado uma vez', () => {
    const linha = { id: 'x', product_id: 'p', product_name: 'P', accompanies_product_ids: ['joia', 'joia'] }
    expect(orderItemCompanionNames(linha, [...pedido, linha])).toEqual(['Pingente Estrela'])
  })

  it('linha sem marca não acompanha nada', () => {
    expect(orderItemCompanionNames(pedido[4], pedido)).toEqual([])
    expect(orderItemCompanionNames(pedido[0], pedido)).toEqual([])
  })

  it('principal que não está no pedido não é nomeado', () => {
    const linha = { id: 'x', product_id: 'p', product_name: 'P', accompanies_product_ids: ['sumiu', 'anel'] }
    expect(orderItemCompanionNames(linha, [...pedido, linha])).toEqual(['Anel Lua'])
  })
})
