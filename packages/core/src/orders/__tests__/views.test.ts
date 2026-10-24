import { describe, expect, it } from 'vitest'

import { QUEUE_BLOCKS, needsActionOrFilter, queueBlock, toPostgrestFilter, type QueueBlockId } from '../queue.ts'
import {
  DEFAULT_ORDER_SLICE,
  MATERIAL_QUEUE_STATES,
  ORDER_VIEWS,
  applyOrderSlice,
  isBlockSlice,
  viewPredicate,
  type OrderSlice,
  type OrderViewId,
  type SliceBuilder,
} from '../views.ts'

/**
 * Feature `74` (`MAP-01`, `MAP-02`, `MAP-03`, `MAP-07`): as visões subiram do painel byte a byte, e o
 * recorte (visão OU bloco) virou dado com um tradutor só.
 *
 * O registrador abaixo é a régua de `L-060`: o recorte é SÓ a regra do dono, então se mede a CADEIA
 * inteira que chega ao builder — ordem e argumentos —, nunca a presença de um `.or`.
 */
type Chamada = ['or', string] | ['in', string, readonly string[]]

class Registrador implements SliceBuilder<Registrador> {
  readonly cadeia: Chamada[] = []
  or(filtro: string): Registrador {
    this.cadeia.push(['or', filtro])
    return this
  }
  in(coluna: string, valores: readonly string[]): Registrador {
    this.cadeia.push(['in', coluna, [...valores]])
    return this
  }
}

const cadeiaDe = (slice: OrderSlice): Chamada[] => applyOrderSlice(new Registrador(), slice).cadeia

describe('ORDER_VIEWS — as seis visões, na ordem e com os rótulos do painel (MAP-07)', () => {
  it('Precisa de ação · Tudo · Fila de material · A separar · Em trânsito · Concluídos', () => {
    expect(ORDER_VIEWS).toEqual([
      { id: 'precisa-acao', label: 'Precisa de ação' },
      { id: 'tudo', label: 'Tudo' },
      { id: 'fila-material', label: 'Fila de material' },
      { id: 'a-separar', label: 'A separar' },
      { id: 'em-transito', label: 'Em trânsito' },
      { id: 'concluidos', label: 'Concluídos' },
    ])
  })

  it('os estados que são fila de material — `nao_aplicavel` fica de fora', () => {
    expect([...MATERIAL_QUEUE_STATES]).toEqual([
      'aguardando_material',
      'material_enviado',
      'material_recebido',
      'em_producao',
    ])
  })
})

describe('viewPredicate — o predicado de cada visão, o mesmo que o painel aplicava', () => {
  it('"Tudo" não filtra', () => {
    expect(viewPredicate('tudo')).toBeNull()
  })

  it('"Precisa de ação" é a união dos três blocos acionáveis (o `or` de `needsActionOrFilter`)', () => {
    expect(viewPredicate('precisa-acao')).toEqual({ or: needsActionOrFilter() })
  })

  it('"Precisa de ação" NÃO inclui o Pix aguardando', () => {
    const pix = toPostgrestFilter(queueBlock('pix-aguardando').rule)
    expect(viewPredicate('precisa-acao').or).not.toContain(pix)
  })

  it.each<[OrderViewId, Record<string, string[]>]>([
    ['fila-material', { material_status: ['aguardando_material', 'material_enviado', 'material_recebido', 'em_producao'] }],
    ['a-separar', { status: ['paid', 'separating'] }],
    ['em-transito', { status: ['shipped'] }],
    ['concluidos', { status: ['delivered', 'cancelled'] }],
  ])('"%s" filtra por igualdade de conjunto', (visao, inEsperado) => {
    expect(viewPredicate(visao)).toEqual({ in: inEsperado })
  })
})

describe('applyOrderSlice — o recorte chega ao builder pela mesma cadeia do `applyView` do painel', () => {
  it('"Tudo" não chama nada', () => {
    expect(cadeiaDe({ visao: 'tudo' })).toEqual([])
  })

  it('"Precisa de ação" chama um `or` só, com a união', () => {
    expect(cadeiaDe({ visao: 'precisa-acao' })).toEqual([['or', needsActionOrFilter()]])
  })

  it.each<[OrderViewId, Chamada[]]>([
    ['fila-material', [['in', 'material_status', ['aguardando_material', 'material_enviado', 'material_recebido', 'em_producao']]]],
    ['a-separar', [['in', 'status', ['paid', 'separating']]]],
    ['em-transito', [['in', 'status', ['shipped']]]],
    ['concluidos', [['in', 'status', ['delivered', 'cancelled']]]],
  ])('"%s" chama exatamente um `in`', (visao, esperado) => {
    expect(cadeiaDe({ visao })).toEqual(esperado)
  })

  it.each(QUEUE_BLOCKS.map((b) => b.id))('o bloco "%s" é `or(toPostgrestFilter(regra do bloco))`, e nada mais', (id) => {
    expect(cadeiaDe({ bloco: id })).toEqual([['or', toPostgrestFilter(queueBlock(id).rule)]])
  })

  it('o bloco "Pago, a separar" NÃO é a visão "A separar" (A3): a visão inclui `separating`', () => {
    const bloco = cadeiaDe({ bloco: 'a-separar' })
    const visao = cadeiaDe({ visao: 'a-separar' })
    expect(bloco).not.toEqual(visao)
    expect(JSON.stringify(bloco)).not.toContain('separating')
    expect(JSON.stringify(visao)).toContain('separating')
  })

  it('o builder que volta é o que a última chamada devolveu (encadeia, não reusa o primeiro)', () => {
    const segundo = new Registrador()
    const primeiro = { or: () => segundo, in: () => segundo } as unknown as Registrador
    expect(applyOrderSlice(primeiro, { visao: 'precisa-acao' })).toBe(segundo)
  })
})

describe('OrderSlice — o recorte como dado', () => {
  it('o padrão é "Precisa de ação" (A5)', () => {
    expect(DEFAULT_ORDER_SLICE).toEqual({ visao: 'precisa-acao' })
  })

  it('isBlockSlice distingue bloco de visão', () => {
    const ids: QueueBlockId[] = ['aguardando', 'a-separar', 'sem-rastreio', 'pix-aguardando']
    for (const id of ids) expect(isBlockSlice({ bloco: id })).toBe(true)
    for (const v of ORDER_VIEWS) expect(isBlockSlice({ visao: v.id })).toBe(false)
  })
})
