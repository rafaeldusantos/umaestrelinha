import { describe, expect, it } from 'vitest'

import categoriesFixture from '../../__fixtures__/categories.json' with { type: 'json' }
import { mapCategories } from '../../map/category.ts'
import type { RawCategory } from '../../nuvemshop/types.ts'
import { createReport } from '../../report.ts'
import { CAMPOS_DE_VITRINE, writeCategories } from '../categories.ts'
import type { DbLike } from '../db.ts'

const reais = categoriesFixture as RawCategory[]

interface Operacao { tipo: 'select' | 'insert' | 'update'; tabela: string; payload?: Record<string, unknown> }

/**
 * Dublê do `supabase-js`. Nenhum método devolve builder de dentro de função `async` — a `L-011`
 * registra que o builder é thenable e a promise o adotaria, entregando o resultado no lugar dele.
 */
const fakeDb = (existentes: Array<Record<string, unknown>> = []) => {
  const ops: Operacao[] = []
  let proximoId = 1

  const db: DbLike = {
    from: (tabela: string) => ({
      select: async () => {
        ops.push({ tipo: 'select', tabela })
        return { data: existentes as never, error: null }
      },
      selectRange: async (_c: string, from: number, to: number) => {
        ops.push({ tipo: 'select', tabela })
        return { data: existentes.slice(from, to + 1) as never, error: null }
      },
      insert: (values: unknown) => {
        ops.push({ tipo: 'insert', tabela, payload: values as Record<string, unknown> })
        const id = `uuid-${proximoId++}`
        return { select: () => ({ single: async () => ({ data: { id } as never, error: null }) }) }
      },
      insertMany: async (values: readonly unknown[]) => {
        for (const v of values) ops.push({ tipo: 'insert', tabela, payload: v as Record<string, unknown> })
        return { data: null, error: null }
      },
      update: (values: unknown) => ({
        eq: async () => {
          ops.push({ tipo: 'update', tabela, payload: values as Record<string, unknown> })
          return { data: null, error: null }
        },
        in: async () => ({ data: null, error: null }),
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null }),
        in: async () => ({ data: null, error: null }),
      }),
    }),
  }

  return { db, ops, inserts: () => ops.filter(o => o.tipo === 'insert'), updates: () => ops.filter(o => o.tipo === 'update') }
}

const rowsReais = () => mapCategories(reais)

describe('writeCategories — criação (CAT-01, CAT-05)', () => {
  it('cria as 39 categorias e devolve o mapa nuvemshop_id → uuid', async () => {
    const { db } = fakeDb()
    const report = createReport()
    const mapa = await writeCategories(rowsReais(), { supabase: db, report })

    expect(mapa.size).toBe(39)
    expect(report.data().entidades.categorias).toEqual({
      lidos: 39, criados: 39, atualizados: 0, pulados: 0,
    })
    expect(report.exitCode()).toBe(0)
  })

  it('resolve parent_id para o uuid da pai já gravada, nunca para o id da Nuvemshop', async () => {
    const { db, inserts } = fakeDb()
    await writeCategories(rowsReais(), { supabase: db, report: createReport() })

    const comPai = inserts().filter(o => o.payload!.parent_id !== null)
    expect(comPai.length).toBeGreaterThan(0)
    for (const op of comPai) {
      expect(String(op.payload!.parent_id)).toMatch(/^uuid-/)
    }
  })

  it('grava active e sort_order no INSERT — a origem é o único dado quando a linha nasce', async () => {
    const { db, inserts } = fakeDb()
    await writeCategories(rowsReais(), { supabase: db, report: createReport() })

    const blackFriday = inserts().find(o => o.payload!.slug === 'black-friday')!
    expect(blackFriday.payload!.active).toBe(false)
    expect(inserts().find(o => o.payload!.slug === 'joias-afetivas')!.payload!.active).toBe(true)
  })
})

describe('writeCategories — curadoria (CAT-11)', () => {
  it('nomeia as quatro categorias desativadas no relatório', async () => {
    const { db } = fakeDb()
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report })

    const slugs = report.data().categoriasInativadas.map(c => c.slug).sort()
    expect(slugs).toHaveLength(4)
    expect(slugs).toContain('black-friday')
    expect(slugs).toContain('rastreio')
    expect(slugs).toContain('profissoes')
    for (const c of report.data().categoriasInativadas) expect(c.motivo).not.toBe('')
  })
})

describe('writeCategories — re-execução preserva a curadoria (CAT-12)', () => {
  const existente = (over: Record<string, unknown>) => ({
    id: 'uuid-existente', nuvemshop_id: 32376553, slug: 'joias-afetivas',
    active: true, sort_order: 0, ...over,
  })

  it('não envia NENHUM campo de vitrine no update', async () => {
    const { db, updates } = fakeDb([existente({ active: false, sort_order: 99 })])
    await writeCategories(rowsReais(), { supabase: db, report: createReport() })

    const doExistente = updates()[0]
    for (const campo of CAMPOS_DE_VITRINE) {
      expect(
        Object.prototype.hasOwnProperty.call(doExistente.payload!, campo),
        `update reescreveu ${campo}`,
      ).toBe(false)
    }
  })

  it('atualiza os campos de catálogo no update', async () => {
    const { db, updates } = fakeDb([existente({})])
    await writeCategories(rowsReais(), { supabase: db, report: createReport() })

    expect(updates()[0].payload!.name).toBe('Joias afetivas')
    expect(updates()[0].payload!.slug).toBe('joias-afetivas')
  })

  it('registra a divergência de `active` no relatório em vez de aplicá-la', async () => {
    // A dona desativou no admin; a origem continua ativa. A loja manda, e o relatório conta.
    const { db } = fakeDb([existente({ active: false })])
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report })

    const divergencia = report.data().vitrinePreservada.find(v => v.campo === 'active')!
    expect(divergencia.slug).toBe('joias-afetivas')
    expect(divergencia.loja).toBe('false')
    expect(divergencia.origem).toBe('true')
  })

  it('registra a divergência de `sort_order`', async () => {
    const { db } = fakeDb([existente({ sort_order: 99 })])
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report })

    expect(report.data().vitrinePreservada.some(v => v.campo === 'sort_order')).toBe(true)
  })

  it('segunda execução: zero criados, 39 atualizados, zero duplicata', async () => {
    const jaGravadas = rowsReais().map((r, i) => ({
      id: `uuid-${i}`, nuvemshop_id: r.nuvemshop_id, slug: r.slug,
      active: r.active, sort_order: r.sort_order,
    }))
    const { db, inserts } = fakeDb(jaGravadas)
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report })

    expect(report.data().entidades.categorias).toEqual({
      lidos: 39, criados: 0, atualizados: 39, pulados: 0,
    })
    expect(inserts()).toHaveLength(0)
    expect(report.data().vitrinePreservada).toEqual([])
  })
})

describe('writeCategories — colisão de slug', () => {
  it('pula e reporta quando o slug já pertence a outro nuvemshop_id', async () => {
    const { db, inserts } = fakeDb([
      { id: 'uuid-local', nuvemshop_id: null, slug: 'joias-afetivas', active: true, sort_order: 0 },
    ])
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report })

    expect(report.data().entidades.categorias.pulados).toBe(1)
    expect(inserts().some(o => o.payload!.slug === 'joias-afetivas')).toBe(false)
    // A conferência continua fechando: lido = criado + atualizado + pulado.
    expect(report.exitCode()).toBe(0)
  })
})

describe('writeCategories — dry-run', () => {
  it('não grava nada, mas conta o que gravaria', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()
    await writeCategories(rowsReais(), { supabase: db, report, dryRun: true })

    expect(ops.filter(o => o.tipo !== 'select')).toHaveLength(0)
    expect(report.data().entidades.categorias.criados).toBe(39)
  })
})
