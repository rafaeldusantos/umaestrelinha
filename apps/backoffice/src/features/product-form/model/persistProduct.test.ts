import { describe, expect, it, vi } from 'vitest'
import {
  isTempVariantId,
  persistProductRelations,
  planCategoryLinks,
  planVariants,
  tempVariantId,
  type PersistClient,
} from './persistProduct'
import type { ProductVariant } from '@nanapin/supabase/types'

// T21b: PFM-05 AC 4 ("as categorias SHALL persistir em `product_categories` com `position` = ordem
// de seleção"), PFM-07 AC 5 (a ordem dos eixos persiste) e a gravação da grade.
//
// O invariante mais caro está em `planVariants`: linha com id REAL nunca vira insert. A FK
// `order_items.variant_id → product_variants(id)` é `NO ACTION`, então recriar uma linha vendida
// deixaria o histórico do pedido apontando para nada.

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

describe('tempVariantId / isTempVariantId', () => {
  it('id temporário é reconhecível e único', () => {
    const a = tempVariantId()
    const b = tempVariantId()
    expect(isTempVariantId(a)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('id de banco (uuid) não é temporário', () => {
    expect(isTempVariantId('9f1c2f7a-0000-4000-8000-000000000000')).toBe(false)
  })
})

describe('planCategoryLinks — PFM-05 AC 4', () => {
  it('position é a ORDEM DE SELEÇÃO, não a ordem alfabética nem a do banco', () => {
    expect(planCategoryLinks(['kpop', 'anime', 'games'], []).toUpsert).toEqual([
      { category_id: 'kpop', position: 0 },
      { category_id: 'anime', position: 1 },
      { category_id: 'games', position: 2 },
    ])
  })

  it('vínculo removido na UI entra em toDelete', () => {
    const plan = planCategoryLinks(['anime'], ['anime', 'kpop'])
    expect(plan.toDelete).toEqual(['kpop'])
  })

  it('reordenar regrava TODOS os presentes — a position dos antigos também mudou', () => {
    const plan = planCategoryLinks(['kpop', 'anime'], ['anime', 'kpop'])
    expect(plan.toUpsert).toEqual([
      { category_id: 'kpop', position: 0 },
      { category_id: 'anime', position: 1 },
    ])
    expect(plan.toDelete).toEqual([])
  })

  it('duplicata na seleção é colapsada — violaria a PK composta', () => {
    expect(planCategoryLinks(['anime', 'anime'], []).toUpsert).toEqual([
      { category_id: 'anime', position: 0 },
    ])
  })

  it('id vazio é descartado', () => {
    expect(planCategoryLinks(['', 'anime'], []).toUpsert).toEqual([
      { category_id: 'anime', position: 0 },
    ])
  })

  it('esvaziar a seleção apaga todos os vínculos', () => {
    expect(planCategoryLinks([], ['anime', 'kpop'])).toEqual({
      toUpsert: [],
      toDelete: ['anime', 'kpop'],
    })
  })
})

describe('planVariants — insert, update e delete por id', () => {
  it('linha com id temporário vira INSERT, sem o id', () => {
    const nova = variant({ id: tempVariantId(), price: 7.9 })
    const plan = planVariants([nova], [])

    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toInsert[0]).not.toHaveProperty('id')
    expect(plan.toInsert[0].price).toBe(7.9)
    expect(plan.toUpdate).toEqual([])
  })

  it('linha existente ALTERADA vira UPDATE — nunca delete + insert (FK do histórico)', () => {
    const antes = variant({ id: 'v-real', price: 5.9 })
    const depois = { ...antes, price: 7.9 }

    const plan = planVariants([depois], [antes])

    expect(plan.toUpdate).toEqual([depois])
    expect(plan.toInsert).toEqual([])
    expect(plan.toDelete).toEqual([])
  })

  it('linha existente INTACTA não é regravada', () => {
    const linha = variant({ id: 'v-real' })
    expect(planVariants([{ ...linha }], [linha]).toUpdate).toEqual([])
  })

  it('detecta mudança em cada campo persistido, não só no preço', () => {
    const antes = variant({ id: 'v-real' })
    const campos: Partial<ProductVariant>[] = [
      { sku: 'NOVO' },
      { stock: 3 },
      { is_active: false },
      { position: 9 },
      { compare_price: 9.9 },
      { weight_kg: 0.02 },
      { image_url: 'v.webp' },
      { name: 'Grande' },
      { option_values: { Tamanho: '3,5 cm' } },
    ]
    for (const patch of campos) {
      expect(planVariants([{ ...antes, ...patch }], [antes]).toUpdate).toHaveLength(1)
    }
  })

  it('linha que saiu da grade vira DELETE, pelo id', () => {
    const fica = variant({ id: 'v-fica' })
    const sai = variant({ id: 'v-sai' })

    expect(planVariants([fica], [fica, sai]).toDelete).toEqual(['v-sai'])
  })

  it('id REAL que o banco não conhece é IGNORADO — não vira insert com id forjado', () => {
    const forjada = variant({ id: 'id-de-outro-produto' })
    const plan = planVariants([forjada], [])

    expect(plan.toInsert).toEqual([])
    expect(plan.toUpdate).toEqual([])
  })

  it('grade esvaziada apaga tudo e não insere nada', () => {
    const a = variant({ id: 'v1' })
    const b = variant({ id: 'v2' })
    expect(planVariants([], [a, b])).toEqual({ toInsert: [], toUpdate: [], toDelete: ['v1', 'v2'] })
  })

  it('regerar a grade: mantém as existentes e insere só as combinações novas', () => {
    const existente = variant({ id: 'v-45', option_values: { Tamanho: '4,5 cm' }, price: 7.9 })
    const novaLinha = variant({ id: tempVariantId(), option_values: { Tamanho: '5,5 cm' } })

    const plan = planVariants([existente, novaLinha], [existente])

    expect(plan.toInsert).toHaveLength(1)
    expect(plan.toUpdate).toEqual([])
    expect(plan.toDelete).toEqual([])
  })
})

// --- Execução ----------------------------------------------------------------------------------

interface Call {
  table: string
  op: 'insert' | 'upsert' | 'update' | 'delete'
  payload?: unknown
}

const fakeClient = (fail?: { table: string; op: Call['op']; message: string }) => {
  const calls: Call[] = []
  const result = (table: string, op: Call['op']) =>
    Promise.resolve(
      fail && fail.table === table && fail.op === op
        ? { error: { message: fail.message } }
        : { error: null },
    )
  const client: PersistClient = {
    from: (table: string) => ({
      insert: rows => {
        calls.push({ table, op: 'insert', payload: rows })
        return result(table, 'insert')
      },
      upsert: rows => {
        calls.push({ table, op: 'upsert', payload: rows })
        return result(table, 'upsert')
      },
      update: values => ({
        eq: (_column, value) => {
          calls.push({ table, op: 'update', payload: { id: value, values } })
          return result(table, 'update')
        },
      }),
      delete: () => ({
        eq: () => ({
          in: (_column, values) => {
            calls.push({ table, op: 'delete', payload: values })
            return result(table, 'delete')
          },
        }),
      }),
    }),
  }
  return { client, calls }
}

describe('persistProductRelations — as duas tabelas com diff', () => {
  it('grava categorias e grade, e reporta sucesso', async () => {
    const { client, calls } = fakeClient()

    const result = await persistProductRelations(
      client,
      'p1',
      { categoryIds: ['anime'], variants: [variant({ id: tempVariantId() })] },
      { categoryIds: [], variants: [] },
    )

    expect(result).toEqual({ ok: true })
    expect(calls.map(c => `${c.table}:${c.op}`)).toEqual([
      'product_categories:upsert',
      'product_variants:insert',
    ])
  })

  it('o vínculo de categoria leva o product_id junto', async () => {
    const { client, calls } = fakeClient()
    await persistProductRelations(
      client,
      'p1',
      { categoryIds: ['anime'], variants: [] },
      { categoryIds: [], variants: [] },
    )

    expect(calls[0].payload).toEqual([{ category_id: 'anime', position: 0, product_id: 'p1' }])
  })

  it('nada mudou: nenhuma escrita é feita', async () => {
    const linha = variant({ id: 'v-real' })
    const { client, calls } = fakeClient()

    await persistProductRelations(
      client,
      'p1',
      { categoryIds: ['anime'], variants: [{ ...linha }] },
      { categoryIds: ['anime'], variants: [linha] },
    )

    // A categoria presente é regravada (a position pode ter mudado); a grade intacta, não.
    expect(calls.filter(c => c.table === 'product_variants')).toEqual([])
  })

  it('apaga ANTES de inserir — o SKU é UNIQUE global e colidiria na ordem inversa', async () => {
    const sai = variant({ id: 'v-sai', sku: 'SLR-45' })
    const { client, calls } = fakeClient()

    await persistProductRelations(
      client,
      'p1',
      { categoryIds: [], variants: [variant({ id: tempVariantId(), sku: 'SLR-45' })] },
      { categoryIds: [], variants: [sai] },
    )

    const grid = calls.filter(c => c.table === 'product_variants').map(c => c.op)
    expect(grid).toEqual(['delete', 'insert'])
  })

  it('a linha existente é atualizada PELO ID, e o id não vai nos valores', async () => {
    const antes = variant({ id: 'v-real', price: 5.9 })
    const { client, calls } = fakeClient()

    await persistProductRelations(
      client,
      'p1',
      { categoryIds: [], variants: [{ ...antes, price: 7.9 }] },
      { categoryIds: [], variants: [antes] },
    )

    const update = calls.find(c => c.op === 'update')!
    expect((update.payload as { id: string }).id).toBe('v-real')
    expect((update.payload as { values: Record<string, unknown> }).values).not.toHaveProperty('id')
  })

  it('falha nas categorias PARA e nomeia o passo — a grade não é tocada', async () => {
    const { client, calls } = fakeClient({
      table: 'product_categories',
      op: 'upsert',
      message: 'permission denied',
    })

    const result = await persistProductRelations(
      client,
      'p1',
      { categoryIds: ['anime'], variants: [variant({ id: tempVariantId() })] },
      { categoryIds: [], variants: [] },
    )

    expect(result).toEqual({ ok: false, step: 'categorias', message: 'permission denied' })
    expect(calls.some(c => c.table === 'product_variants')).toBe(false)
  })

  it('falha na grade nomeia o passo "grade"', async () => {
    const { client } = fakeClient({
      table: 'product_variants',
      op: 'insert',
      message: 'duplicate key value violates unique constraint',
    })

    const result = await persistProductRelations(
      client,
      'p1',
      { categoryIds: [], variants: [variant({ id: tempVariantId() })] },
      { categoryIds: [], variants: [] },
    )

    expect(result).toMatchObject({ ok: false, step: 'grade' })
  })

  it('falha no update de uma linha interrompe antes dos inserts', async () => {
    const antes = variant({ id: 'v-real', price: 5.9 })
    const { client, calls } = fakeClient({
      table: 'product_variants',
      op: 'update',
      message: 'boom',
    })

    const result = await persistProductRelations(
      client,
      'p1',
      {
        categoryIds: [],
        variants: [{ ...antes, price: 7.9 }, variant({ id: tempVariantId() })],
      },
      { categoryIds: [], variants: [antes] },
    )

    expect(result).toMatchObject({ ok: false, step: 'grade' })
    expect(calls.some(c => c.op === 'insert')).toBe(false)
  })
})
