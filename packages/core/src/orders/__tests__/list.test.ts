import { describe, expect, it } from 'vitest'

import { QUEUE_BLOCKS } from '../queue.ts'
import { ORDER_VIEWS, type OrderSlice } from '../views.ts'
import {
  EMPTY_TITLE,
  ORDER_PAGE_SIZE,
  cursorFilter,
  emptyHint,
  isOrderId,
  listCountLine,
  sliceOrder,
} from '../list.ts'

/** Feature `74`: a ordem, o cursor e as frases da lista de pedidos do ateliê. */
describe('sliceOrder — a ordem de cada recorte (MAP-08, A8)', () => {
  it('"Precisa de ação" ⇒ do mais antigo para o mais novo', () => {
    expect(sliceOrder({ visao: 'precisa-acao' })).toBe('asc')
  })

  it.each(QUEUE_BLOCKS.map((b) => b.id))('o bloco "%s" ⇒ do mais antigo para o mais novo', (id) => {
    expect(sliceOrder({ bloco: id })).toBe('asc')
  })

  it.each(ORDER_VIEWS.filter((v) => v.id !== 'precisa-acao').map((v) => v.id))('a visão "%s" ⇒ do mais novo para o mais antigo', (visao) => {
    expect(sliceOrder({ visao })).toBe('desc')
  })
})

describe('cursorFilter — a página seguinte por chave (MAP-14, R1)', () => {
  const cursor = { created_at: '2026-10-05T23:34:12.017605+00:00', id: '0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6e' }

  it('`asc` ⇒ `gt` nos dois ramos, com o instante entre aspas duplas', () => {
    expect(cursorFilter(cursor, 'asc')).toBe(
      'created_at.gt."2026-10-05T23:34:12.017605+00:00",and(created_at.eq."2026-10-05T23:34:12.017605+00:00",id.gt.0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6e)',
    )
  })

  it('`desc` ⇒ `lt` nos dois ramos', () => {
    expect(cursorFilter(cursor, 'desc')).toBe(
      'created_at.lt."2026-10-05T23:34:12.017605+00:00",and(created_at.eq."2026-10-05T23:34:12.017605+00:00",id.lt.0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6e)',
    )
  })

  it('a string do servidor vai CRUA: os microssegundos sobrevivem', () => {
    expect(cursorFilter(cursor, 'asc')).toContain('.017605+00:00')
  })

  it('passar por `Date` mudaria o valor — é por isso que o cursor não passa (R1)', () => {
    const viaDate = new Date(cursor.created_at).toISOString()
    expect(viaDate).toBe('2026-10-05T23:34:12.017Z')
    expect(cursorFilter({ ...cursor, created_at: viaDate }, 'asc')).not.toBe(cursorFilter(cursor, 'asc'))
  })
})

describe('listCountLine — a linha de contagem (MAP-08)', () => {
  const precisa: OrderSlice = { visao: 'precisa-acao' }

  it('"Precisa de ação" sem busca, no plural e no singular', () => {
    expect(listCountLine(12, precisa, false)).toBe('12 pedidos precisam de você, do mais antigo para o mais novo.')
    expect(listCountLine(1, precisa, false)).toBe('1 pedido precisa de você, do mais antigo para o mais novo.')
  })

  it('"Precisa de ação" COM busca ⇒ só "N pedidos"', () => {
    expect(listCountLine(3, precisa, true)).toBe('3 pedidos')
  })

  it('outras visões e blocos ⇒ "N pedidos" / "1 pedido"', () => {
    expect(listCountLine(54, { visao: 'tudo' }, false)).toBe('54 pedidos')
    expect(listCountLine(1, { visao: 'concluidos' }, false)).toBe('1 pedido')
    expect(listCountLine(18, { bloco: 'aguardando' }, false)).toBe('18 pedidos')
    expect(listCountLine(1, { bloco: 'sem-rastreio' }, false)).toBe('1 pedido')
  })

  it('lista vazia ⇒ a linha não aparece (MAP-09)', () => {
    expect(listCountLine(0, precisa, false)).toBeNull()
    expect(listCountLine(0, { visao: 'tudo' }, true)).toBeNull()
  })
})

describe('a lista vazia (MAP-09)', () => {
  it('o título é "Nada por aqui."', () => {
    expect(EMPTY_TITLE).toBe('Nada por aqui.')
  })

  it('com busca ⇒ "Nenhum pedido com “<termo>”." em qualquer recorte', () => {
    expect(emptyHint({ visao: 'precisa-acao' }, 'ana')).toBe('Nenhum pedido com “ana”.')
    expect(emptyHint({ bloco: 'aguardando' }, '  #0244 ')).toBe('Nenhum pedido com “#0244”.')
  })

  it('sem busca em "Precisa de ação" ⇒ "Nenhum pedido esperando você agora."', () => {
    expect(emptyHint({ visao: 'precisa-acao' }, '')).toBe('Nenhum pedido esperando você agora.')
    expect(emptyHint({ visao: 'precisa-acao' }, '   ')).toBe('Nenhum pedido esperando você agora.')
  })

  it('sem busca nos outros recortes, inclusive bloco ⇒ "Nenhum pedido nesta visão."', () => {
    expect(emptyHint({ visao: 'tudo' }, '')).toBe('Nenhum pedido nesta visão.')
    expect(emptyHint({ bloco: 'a-separar' }, '')).toBe('Nenhum pedido nesta visão.')
  })
})

describe('ORDER_PAGE_SIZE e isOrderId', () => {
  it('25 por página (A9)', () => {
    expect(ORDER_PAGE_SIZE).toBe(25)
  })

  it('aceita uuid, em qualquer caixa', () => {
    expect(isOrderId('0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6e')).toBe(true)
    expect(isOrderId('0B0C4C3E-6C2B-4C1A-9E1E-1F2A3B4C5D6E')).toBe(true)
  })

  it.each(['0244', '#0244', '', 'x0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6e', '0b0c4c3e-6c2b-4c1a-9e1e-1f2a3b4c5d6', null, 42])(
    'recusa o que não é uuid (%s)',
    (v) => {
      expect(isOrderId(v)).toBe(false)
    },
  )
})
