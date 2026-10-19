// Feature 67 (T06) — a etapa das marcações por opção em `persistProductRelations` (`VFL-03`,
// `VFL-08`). O dublê ENXERGA cada `eq` do `delete`: a linha só se identifica por produto, eixo, texto
// e valor, e um `eq` a menos apagaria as marcações das outras opções da peça.

import { describe, expect, it } from 'vitest'
import { persistProductRelations, type PersistClient } from '../persistProduct'

interface Chamada {
  table: string
  op: 'insert' | 'upsert' | 'update' | 'delete'
  payload?: unknown
  options?: unknown
  filters?: [string, unknown][]
}

const duble = (falha?: { table: string; op: Chamada['op'] }) => {
  const calls: Chamada[] = []
  const res = (table: string, op: Chamada['op']) =>
    Promise.resolve(falha && falha.table === table && falha.op === op ? { error: { message: 'boom' } } : { error: null })
  const client: PersistClient = {
    from: table => ({
      insert: rows => {
        calls.push({ table, op: 'insert', payload: rows })
        return res(table, 'insert')
      },
      upsert: (rows, options) => {
        calls.push({ table, op: 'upsert', payload: rows, options })
        return res(table, 'upsert')
      },
      update: values => ({
        eq: () => {
          calls.push({ table, op: 'update', payload: values })
          return res(table, 'update')
        },
      }),
      delete: () => {
        const filters: [string, unknown][] = []
        const f: ReturnType<ReturnType<PersistClient['from']>['delete']> = {
          eq: (c, v) => {
            filters.push([c, v])
            return f
          },
          in: (c, vs) => {
            filters.push([c, vs])
            calls.push({ table, op: 'delete', filters })
            return res(table, 'delete')
          },
        }
        return f
      },
    }),
  }
  return { client, calls }
}

const m = (option_name: string, option_value: string, value_id: string) => ({ option_name, option_value, value_id })
const base = { categoryIds: [] as string[], variants: [] }

describe('persistProductRelations — marcações por opção', () => {
  it('apaga a que saiu pelos QUATRO campos e grava a nova com o product_id', async () => {
    const { client, calls } = duble()
    const r = await persistProductRelations(
      client,
      'p1',
      { ...base, optionMarks: [m('Cor', 'Prata 925', 'prata'), m('Cor', 'Ouro', 'ouro')] },
      { ...base, optionMarks: [m('Cor', 'Prata 925', 'prata'), m('Cor', 'Prata 925', 'rodio')] },
    )
    expect(r).toEqual({ ok: true })
    expect(calls.filter(c => c.table === 'product_option_filter_values')).toEqual([
      {
        table: 'product_option_filter_values',
        op: 'delete',
        filters: [
          ['product_id', 'p1'],
          ['option_name', 'Cor'],
          ['option_value', 'Prata 925'],
          ['value_id', ['rodio']],
        ],
      },
      {
        table: 'product_option_filter_values',
        op: 'upsert',
        payload: [{ product_id: 'p1', option_name: 'Cor', option_value: 'Ouro', value_id: 'ouro' }],
        options: { onConflict: 'product_id,option_name,option_value,value_id' },
      },
    ])
  })

  it('produto novo (snapshot vazio): grava todas, com o id que o banco devolveu', async () => {
    const { client, calls } = duble()
    await persistProductRelations(client, 'novo', { ...base, optionMarks: [m('Cor', 'A', 'v')] }, base)
    expect(calls).toEqual([
      expect.objectContaining({
        op: 'upsert',
        payload: [{ product_id: 'novo', option_name: 'Cor', option_value: 'A', value_id: 'v' }],
      }),
    ])
  })

  it('`optionMarks` ausente NÃO apaga nada (a grade rápida e a edição em massa também chamam)', async () => {
    const { client, calls } = duble()
    await persistProductRelations(client, 'p1', base, { ...base, optionMarks: [m('Cor', 'A', 'v')] })
    expect(calls.filter(c => c.table === 'product_option_filter_values')).toEqual([])
  })

  it('vem DEPOIS da grade', async () => {
    const { client, calls } = duble()
    await persistProductRelations(
      client,
      'p1',
      {
        categoryIds: [],
        variants: [{ id: 'tmp-x', product_id: 'p1', option_values: {}, name: null, sku: null, price: 1, compare_price: null, stock: 1, weight_kg: null, image_url: null, is_active: true, position: 0 }],
        optionMarks: [m('Cor', 'A', 'v')],
      },
      base,
    )
    expect(calls.map(c => c.table)).toEqual(['product_variants', 'product_option_filter_values'])
  })

  it('VFL-08: a falha nomeia o passo e devolve ok:false', async () => {
    const { client } = duble({ table: 'product_option_filter_values', op: 'upsert' })
    expect(await persistProductRelations(client, 'p1', { ...base, optionMarks: [m('Cor', 'A', 'v')] }, base)).toEqual({
      ok: false,
      step: 'marcações por variação',
      message: 'boom',
    })
  })

  it('a falha no delete para antes de gravar as novas', async () => {
    const { client, calls } = duble({ table: 'product_option_filter_values', op: 'delete' })
    const r = await persistProductRelations(
      client,
      'p1',
      { ...base, optionMarks: [m('Cor', 'B', 'v')] },
      { ...base, optionMarks: [m('Cor', 'A', 'v')] },
    )
    expect(r).toMatchObject({ ok: false, step: 'marcações por variação' })
    expect(calls.some(c => c.op === 'upsert')).toBe(false)
  })
})
