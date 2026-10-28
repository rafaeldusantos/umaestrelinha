import { describe, expect, it } from 'vitest'

import { createFakeSupabase, type ReadCall } from '../../_shared/testing/fakes.ts'
import {
  EXAMPLE_COLUMNS,
  type ExampleRow,
  SAME_CATEGORY_COLUMNS,
  SAME_CATEGORY_READ_LIMIT,
  loadContext,
  pickExamples,
} from '../examples.ts'

// Feature 84 (T06, A5, `SIA-21`) — os exemplos de tom.

const P = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ESTE = P(99)

const linha = (n: number, seo: string | null = `Título ${n}`): ExampleRow & Record<string, unknown> => ({
  id: P(n),
  name: `Peça ${n}`,
  seo_title: seo,
  seo_description: seo === null ? null : `Descrição ${n}`,
  // Colunas que o dublê só devolve se forem pedidas (`L-040`): se o código as pedisse, apareceriam.
  cost_price: 12.5,
  stock: 3,
  supplier_id: 'f',
})

/**
 * O dublê devolve SÓ as colunas pedidas (`L-040`). O embed `alias:tabela!inner(...)` vira a chave
 * `alias`. Coluna não pedida não chega — um `select` que perdesse `seo_title` produziria exemplos
 * vazios, e o teste veria.
 */
function projetar(rows: Array<Record<string, unknown>>, select: string): Array<Record<string, unknown>> {
  const partes = select.split(/,(?![^(]*\))/).map((s) => s.trim())
  return rows.map((r) => {
    const saida: Record<string, unknown> = {}
    for (const p of partes) {
      const alias = p.match(/^(\w+):/)
      if (alias) saida[alias[1]] = [{ category_id: 'x' }]
      else if (p in r) saida[p] = r[p]
    }
    return saida
  })
}

const NOME = (r: { name: string }) => r.name

describe('pickExamples — a régua de A5', () => {
  it('relacionados curados vêm primeiro, na ordem dada', () => {
    const r = pickExamples([linha(1), linha(2), linha(3)], [linha(10)], ESTE)
    expect(r.map(NOME)).toEqual(['Peça 1', 'Peça 2', 'Peça 3'])
  })

  it('com 3 relacionados curados, a mesma categoria NÃO completa', () => {
    const r = pickExamples([linha(1), linha(2), linha(3)], [linha(10), linha(11)], ESTE)
    expect(r).toHaveLength(3)
  })

  it('com menos de 3 relacionados, completa com a mesma categoria até 5', () => {
    const r = pickExamples([linha(1), linha(2)], [linha(10), linha(11), linha(12), linha(13)], ESTE)
    expect(r.map(NOME)).toEqual(['Peça 1', 'Peça 2', 'Peça 10', 'Peça 11', 'Peça 12'])
  })

  it('no máximo 5, mesmo com 7 relacionados', () => {
    const r = pickExamples([1, 2, 3, 4, 5, 6, 7].map((n) => linha(n)), [], ESTE)
    expect(r).toHaveLength(5)
  })

  it('nunca repete (o mesmo id nas duas listas)', () => {
    const r = pickExamples([linha(1)], [linha(1), linha(10)], ESTE)
    expect(r.map(NOME)).toEqual(['Peça 1', 'Peça 10'])
  })

  it('nunca o próprio produto, nem pelos relacionados nem pela categoria', () => {
    const proprio = { ...linha(99) }
    const r = pickExamples([proprio], [proprio, linha(10)], ESTE)
    expect(r.map(NOME)).toEqual(['Peça 10'])
  })

  it('relacionado sem seo_title (nulo ou só espaço) não conta, e a categoria completa', () => {
    const r = pickExamples([linha(1, null), linha(2, '   '), linha(3)], [linha(10), linha(11)], ESTE)
    expect(r.map(NOME)).toEqual(['Peça 3', 'Peça 10', 'Peça 11'])
  })

  it('zero exemplos ⇒ lista vazia', () => {
    expect(pickExamples([], [], ESTE)).toEqual([])
    expect(pickExamples([linha(1, null)], [linha(2, '')], null)).toEqual([])
  })

  it('o exemplo leva nome, título e descrição, aparados', () => {
    const r = pickExamples([{ id: P(1), name: 'Anel', seo_title: ' Anel Lua ', seo_description: ' Prata. ' }], [], null)
    expect(r).toEqual([{ name: 'Anel', title: 'Anel Lua', description: 'Prata.' }])
  })
})

describe('loadContext — as leituras (SIA-21)', () => {
  const montar = (
    produtos: Array<Record<string, unknown>>,
    categorias: Array<Record<string, unknown>>,
    erros: Record<string, unknown> = {},
  ) => {
    const pedidos: ReadCall[] = []
    const fake = createFakeSupabase({
      lists: {
        products: (_eqs, select, read) => {
          pedidos.push(read)
          if (erros.products && (erros.products as (r: ReadCall) => boolean)(read)) return null
          const ids = read.in.find(([c]) => c === 'id')?.[1] as string[] | undefined
          const base = ids ? produtos.filter((p) => ids.includes(p.id as string)) : produtos
          return projetar(base, select)
        },
        categories: (_eqs, select) => projetar(categorias, select),
      },
      listErrorByTable: erros.categories ? { categories: erros.categories } : {},
    })
    return { fake, pedidos }
  }

  it('relacionados pedem EXATAMENTE as 4 colunas, filtrados pelos ids; categorias pedem id,name', async () => {
    const { fake } = montar([linha(1), linha(2), linha(3)], [{ id: 'c1', name: 'Pingentes', slug: 'x' }])
    const ctx = await loadContext(fake.client, { productId: ESTE, categoryIds: ['c1'], relatedIds: [P(1), P(2), P(3)] })

    const leituraRel = fake.reads.find((r) => r.table === 'products')!
    expect(leituraRel.select).toBe('id,name,seo_title,seo_description')
    expect(EXAMPLE_COLUMNS).toBe('id,name,seo_title,seo_description')
    expect(leituraRel.in).toEqual([['id', [P(1), P(2), P(3)]]])

    const leituraCat = fake.reads.find((r) => r.table === 'categories')!
    expect(leituraCat.select).toBe('id,name')
    expect(leituraCat.in).toEqual([['id', ['c1']]])

    expect(ctx.categoryNames).toEqual(['Pingentes'])
    expect(ctx.examples.map(NOME)).toEqual(['Peça 1', 'Peça 2', 'Peça 3'])
    // Com 3 relacionados curados, a leitura por categoria nem acontece.
    expect(fake.reads.filter((r) => r.table === 'products')).toHaveLength(1)
    expect(ctx.readErrors).toEqual([])
  })

  it('a leitura por categoria: as 4 colunas + só o vínculo, ATIVOS, mais recentes, com limite', async () => {
    const { fake } = montar([linha(10), linha(11)], [{ id: 'c1', name: 'Pingentes' }])
    const ctx = await loadContext(fake.client, { productId: ESTE, categoryIds: ['c1'], relatedIds: [] })

    const leitura = fake.reads.find((r) => r.table === 'products')!
    expect(leitura.select).toBe('id,name,seo_title,seo_description,filtro:product_categories!inner(category_id)')
    expect(SAME_CATEGORY_COLUMNS).toBe(leitura.select)
    expect(leitura.in).toEqual([['filtro.category_id', ['c1']]])
    expect(leitura.eq).toEqual([['is_active', true]])
    expect(leitura.order).toEqual([['updated_at', { ascending: false }]])
    expect(leitura.limit).toBe(SAME_CATEGORY_READ_LIMIT)
    expect(SAME_CATEGORY_READ_LIMIT).toBe(8)
    expect(ctx.examples.map(NOME)).toEqual(['Peça 10', 'Peça 11'])
  })

  it('nenhuma leitura pede custo, fornecedor, estoque nem tabela de cliente', async () => {
    const { fake } = montar([linha(1), linha(10)], [{ id: 'c1', name: 'X' }])
    await loadContext(fake.client, { productId: null, categoryIds: ['c1'], relatedIds: [P(1)] })
    expect(fake.reads.length).toBe(3)
    for (const r of fake.reads) {
      expect(['products', 'categories']).toContain(r.table)
      expect(r.select).not.toMatch(/cost|supplier|stock|customer|price/)
    }
  })

  it('o dublê devolve só as colunas pedidas: o exemplo não traz custo nem estoque', async () => {
    const { fake } = montar([linha(1)], [])
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: [], relatedIds: [P(1)] })
    expect(ctx.examples).toEqual([{ name: 'Peça 1', title: 'Título 1', description: 'Descrição 1' }])
  })

  it('id relacionado inexistente é ignorado sem erro', async () => {
    const { fake } = montar([linha(1)], [])
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: [], relatedIds: [P(1), P(55)] })
    expect(ctx.examples.map(NOME)).toEqual(['Peça 1'])
    expect(ctx.readErrors).toEqual([])
  })

  it('sem relacionados e sem categoria: nenhuma leitura de produto, contexto vazio', async () => {
    const { fake } = montar([linha(1)], [])
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: [], relatedIds: [] })
    expect(fake.reads).toEqual([])
    expect(ctx).toEqual({ categoryNames: [], examples: [], readErrors: [] })
  })

  it('erro na leitura dos relacionados ⇒ segue sem eles, registrado; a categoria completa', async () => {
    const fake = createFakeSupabase({
      lists: {
        products: (_e, select, read) =>
          read.in.some(([c]) => c === 'id') ? null : projetar([linha(10)], select),
        categories: [],
      },
    })
    // A leitura dos relacionados falha: troca o resultado por erro só para ela.
    const original = fake.client.from
    fake.client.from = (t: string) => {
      const b = original(t)
      if (t !== 'products') return b
      const inOriginal = b.in
      b.in = (col: string, vals: unknown[]) => {
        const r = inOriginal(col, vals)
        if (col === 'id') r.then = (res: any) => Promise.resolve({ data: null, error: { message: 'x' } }).then(res)
        return r
      }
      return b
    }
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: ['c1'], relatedIds: [P(1)] })
    expect(ctx.readErrors).toEqual(['related'])
    expect(ctx.examples.map(NOME)).toEqual(['Peça 10'])
  })

  it('erro na leitura por categoria ⇒ exemplos só dos relacionados, registrado', async () => {
    const fake = createFakeSupabase({
      lists: { products: (_e, select) => projetar([linha(1)], select), categories: [] },
      listErrorByTable: {},
    })
    const original = fake.client.from
    fake.client.from = (t: string) => {
      const b = original(t)
      if (t !== 'products') return b
      const limitOriginal = b.limit
      b.limit = (n: number) => {
        const r = limitOriginal(n)
        r.then = (res: any) => Promise.resolve({ data: null, error: { message: 'x' } }).then(res)
        return r
      }
      return b
    }
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: ['c1'], relatedIds: [P(1)] })
    expect(ctx.readErrors).toEqual(['same_category'])
    expect(ctx.examples.map(NOME)).toEqual(['Peça 1'])
  })

  it('erro na leitura das categorias ⇒ sem nomes, registrado, os exemplos seguem', async () => {
    const { fake } = montar([linha(1)], [], { categories: { message: 'x' } })
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: ['c1'], relatedIds: [P(1)] })
    expect(ctx.categoryNames).toEqual([])
    expect(ctx.readErrors).toContain('categories')
    expect(ctx.examples.map(NOME)).toEqual(['Peça 1'])
  })

  it('os nomes das categorias saem na ordem do formulário', async () => {
    const { fake } = montar([], [
      { id: 'c2', name: 'Brincos' },
      { id: 'c1', name: 'Pingentes' },
    ])
    const ctx = await loadContext(fake.client, { productId: null, categoryIds: ['c1', 'c2'], relatedIds: [] })
    expect(ctx.categoryNames).toEqual(['Pingentes', 'Brincos'])
  })
})
