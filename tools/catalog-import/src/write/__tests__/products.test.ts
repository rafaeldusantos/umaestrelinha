import { describe, expect, it } from 'vitest'

import productsFixture from '../../__fixtures__/products.json' with { type: 'json' }
import { mapProduct } from '../../map/product.ts'
import { mapVariants } from '../../map/variant.ts'
import type { RawProduct } from '../../nuvemshop/types.ts'
import { createReport } from '../../report.ts'
import type { DbLike } from '../db.ts'
import { CAMPOS_DE_VITRINE, writeProducts, writeProductImages, type ProductItem } from '../products.ts'

const reais = productsFixture as RawProduct[]

interface Operacao { tipo: 'select' | 'insert' | 'update' | 'delete'; tabela: string; payload?: Record<string, unknown> }

const fakeDb = (tabelas: Record<string, Array<Record<string, unknown>>> = {}) => {
  const ops: Operacao[] = []
  let proximo = 1

  const db: DbLike = {
    from: (tabela: string) => ({
      select: async () => {
        ops.push({ tipo: 'select', tabela })
        return { data: (tabelas[tabela] ?? []) as never, error: null }
      },
      selectRange: async (_c: string, from: number, to: number) => {
        ops.push({ tipo: 'select', tabela })
        return { data: (tabelas[tabela] ?? []).slice(from, to + 1) as never, error: null }
      },
      insert: (values: unknown) => {
        ops.push({ tipo: 'insert', tabela, payload: values as Record<string, unknown> })
        const id = `${tabela}-${proximo++}`
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
        in: async () => {
          ops.push({ tipo: 'update', tabela, payload: values as Record<string, unknown> })
          return { data: null, error: null }
        },
      }),
      delete: () => ({
        eq: async () => { ops.push({ tipo: 'delete', tabela }); return { data: null, error: null } },
        in: async () => { ops.push({ tipo: 'delete', tabela }); return { data: null, error: null } },
      }),
    }),
  }

  const of = (tipo: Operacao['tipo'], tabela: string) => ops.filter(o => o.tipo === tipo && o.tabela === tabela)
  return { db, ops, of }
}

/** Os 5 produtos que o mapeamento aceita (o sexto é pulado por não ter preço). */
const itens = (): ProductItem[] =>
  reais.flatMap(raw => {
    const out = mapProduct(raw)
    return out.kind === 'product' ? [{ product: out.row, variants: mapVariants(raw) }] : []
  })

const categoryUuids = new Map(
  [...new Set(reais.flatMap(p => p.categories.map(c => c.id)))].map((id, i) => [id, `categoria-${i}`]),
)

describe('writeProducts — criação (CAT-01)', () => {
  it('cria os 5 produtos aceitos e devolve o mapa nuvemshop_id → uuid', async () => {
    const { db, of } = fakeDb()
    const report = createReport()
    const mapa = await writeProducts(itens(), categoryUuids, { supabase: db, report })

    expect(mapa.size).toBe(5)
    expect(of('insert', 'products')).toHaveLength(5)
    expect(report.data().entidades.produtos.criados).toBe(5)
  })

  it('grava base_price e is_active no INSERT — a semente do NOT NULL', async () => {
    const { db, of } = fakeDb()
    await writeProducts(itens(), categoryUuids, { supabase: db, report: createReport() })

    for (const op of of('insert', 'products')) {
      expect(typeof op.payload!.base_price).toBe('number')
      expect(op.payload!.base_price).toBeGreaterThan(0)
      expect(typeof op.payload!.is_active).toBe('boolean')
    }
  })

  it('a conferência de totais fecha nas três entidades', async () => {
    const { db } = fakeDb()
    const report = createReport()
    await writeProducts(itens(), categoryUuids, { supabase: db, report })

    expect(report.balances().every(b => b.confere)).toBe(true)
    expect(report.exitCode()).toBe(0)
  })
})

describe('writeProducts — variações (CAT-04)', () => {
  it('cria uma linha por variação, com nuvemshop_id próprio', async () => {
    const { db, of } = fakeDb()
    const report = createReport()
    await writeProducts(itens(), categoryUuids, { supabase: db, report })

    const esperado = itens().reduce((s, i) => s + i.variants.length, 0)
    expect(of('insert', 'product_variants')).toHaveLength(esperado)
    expect(report.data().entidades.variacoes.criados).toBe(esperado)
    for (const op of of('insert', 'product_variants')) {
      expect(typeof op.payload!.nuvemshop_id).toBe('number')
    }
  })

  it('grava o preço da variação, e o compare_price só quando é "de" verdadeiro', async () => {
    const { db, of } = fakeDb()
    await writeProducts(itens(), categoryUuids, { supabase: db, report: createReport() })

    for (const op of of('insert', 'product_variants')) {
      const price = op.payload!.price as number | null
      const compare = op.payload!.compare_price as number | null
      if (compare !== null) expect(compare).toBeGreaterThan(price!)
    }
  })

  it('DESATIVA a variação que sumiu da origem, em vez de apagar', async () => {
    const item = itens()[0]
    const { db, of } = fakeDb({
      products: [{ id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug, is_active: true }],
      product_variants: [{ id: 'v-orfa', nuvemshop_id: 999999999, product_id: 'p-1' }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })

    expect(of('delete', 'product_variants')).toHaveLength(0)
    const desativacao = of('update', 'product_variants').find(o => o.payload!.is_active === false)
    expect(desativacao).toBeDefined()
  })
})

describe('writeProducts — re-execução preserva a vitrine (CAT-12)', () => {
  const jaGravados = () => ({
    products: itens().map((i, n) => ({
      id: `p-${n}`, nuvemshop_id: i.product.nuvemshop_id, slug: i.product.slug, is_active: i.product.is_active,
    })),
    product_variants: itens().flatMap((i, n) =>
      i.variants.map(v => ({ id: `v-${v.nuvemshop_id}`, nuvemshop_id: v.nuvemshop_id, product_id: `p-${n}` }))),
  })

  it('não envia NENHUM campo de vitrine nem base_price no update', async () => {
    const { db, of } = fakeDb(jaGravados())
    await writeProducts(itens(), categoryUuids, { supabase: db, report: createReport() })

    const updates = of('update', 'products')
    expect(updates.length).toBeGreaterThan(0)
    for (const op of updates) {
      for (const campo of CAMPOS_DE_VITRINE) {
        expect(
          Object.prototype.hasOwnProperty.call(op.payload!, campo),
          `update reescreveu ${campo}`,
        ).toBe(false)
      }
    }
  })

  it('segunda execução: zero criados, zero duplicata', async () => {
    const { db, of } = fakeDb(jaGravados())
    const report = createReport()
    await writeProducts(itens(), categoryUuids, { supabase: db, report })

    expect(report.data().entidades.produtos).toMatchObject({ criados: 0, atualizados: 5 })
    expect(of('insert', 'products')).toHaveLength(0)
    expect(of('insert', 'product_variants')).toHaveLength(0)
    expect(report.data().entidades.variacoes.criados).toBe(0)
  })

  it('registra a divergência de is_active em vez de aplicá-la', async () => {
    const tabelas = jaGravados()
    tabelas.products[0].is_active = false
    const { db } = fakeDb(tabelas)
    const report = createReport()
    await writeProducts(itens(), categoryUuids, { supabase: db, report })

    const divergencia = report.data().vitrinePreservada.find(v => v.campo === 'is_active')
    expect(divergencia).toBeDefined()
    expect(divergencia!.loja).toBe('false')
  })
})

describe('writeProducts — vínculo N:N (CAT-05)', () => {
  it('reescreve product_categories com a posição da origem', async () => {
    const item = itens().find(i => i.product.category_nuvemshop_ids.length > 1)!
    const { db, of } = fakeDb()
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })

    expect(of('delete', 'product_categories')).toHaveLength(1)
    const vinculos = of('insert', 'product_categories')
    expect(vinculos).toHaveLength(item.product.category_nuvemshop_ids.length)
    expect(vinculos.map(o => o.payload!.position)).toEqual(
      item.product.category_nuvemshop_ids.map((_, i) => i),
    )
  })

  it('não grava vínculo para produto sem categoria, e o produto entra assim mesmo', async () => {
    const semCategoria = itens().find(i => i.product.category_nuvemshop_ids.length === 0)!
    const { db, of } = fakeDb()
    await writeProducts([semCategoria], categoryUuids, { supabase: db, report: createReport() })

    expect(of('insert', 'products')).toHaveLength(1)
    expect(of('insert', 'product_categories')).toHaveLength(0)
  })

  it('ignora categoria que não foi gravada, sem derrubar o produto', async () => {
    const item = itens().find(i => i.product.category_nuvemshop_ids.length > 0)!
    const { db, of } = fakeDb()
    await writeProducts([item], new Map(), { supabase: db, report: createReport() })

    expect(of('insert', 'products')).toHaveLength(1)
    expect(of('insert', 'product_categories')).toHaveLength(0)
  })
})

describe('writeProducts — colisão de slug', () => {
  it('pula o produto e TODAS as suas variações, mantendo a conferência fechada', async () => {
    const item = itens()[0]
    const { db, of } = fakeDb({
      products: [{ id: 'local', nuvemshop_id: null, slug: item.product.slug, is_active: true }],
    })
    const report = createReport()
    await writeProducts([item], categoryUuids, { supabase: db, report })

    expect(of('insert', 'products')).toHaveLength(0)
    expect(report.data().entidades.produtos.pulados).toBe(1)
    expect(report.data().entidades.variacoes.pulados).toBe(item.variants.length)
    expect(report.balances().every(b => b.confere)).toBe(true)
  })
})

describe('writeProducts — dry-run', () => {
  it('não grava nada e classifica variação nova como criada, não como atualizada', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()
    await writeProducts(itens(), categoryUuids, { supabase: db, report, dryRun: true })

    expect(ops.filter(o => o.tipo !== 'select')).toHaveLength(0)
    expect(report.data().entidades.variacoes.atualizados).toBe(0)
    expect(report.data().entidades.variacoes.criados).toBeGreaterThan(0)
    expect(report.balances().every(b => b.confere)).toBe(true)
  })
})

describe('writeProductImages', () => {
  it('grava a galeria com source `import`', async () => {
    const { db, of } = fakeDb()
    await writeProductImages(
      'p-1',
      [{ url: 'http://local/storage/x.webp', alt: 'Pingente', source: 'import' }],
      { supabase: db, report: createReport() },
    )

    const update = of('update', 'products')[0]
    expect(update.payload!.images).toEqual([
      { url: 'http://local/storage/x.webp', alt: 'Pingente', source: 'import' },
    ])
  })

  it('não grava em dry-run', async () => {
    const { db, ops } = fakeDb()
    await writeProductImages('p-1', [], { supabase: db, report: createReport(), dryRun: true })
    expect(ops).toHaveLength(0)
  })
})

// =================================================================================================
// Feature 22 — a semente de material afetivo
// =================================================================================================
//
// Ela existe para a feature não nascer inerte: o catálogo real tem ZERO eixo de material em 3.356
// variações, e o material está no NOME. Sem semear, a fila `aguardando_material` ficaria vazia até
// alguém editar centenas de produtos à mão.
//
// E ela tem uma obrigação simétrica, que é o que estes testes guardam de verdade: **nunca
// sobrescrever o que a dona decidiu**.

describe('semente de material (feature 22)', () => {
  const comNome = (nome: string): ProductItem => {
    const base = itens()[0]
    return { product: { ...base.product, name: nome }, variants: [] }
  }

  it('produto NOVO nasce com o material inferido do nome', async () => {
    const { db, of } = fakeDb()
    const report = createReport()

    await writeProducts([comNome('Pingente com cinzas')], categoryUuids, { supabase: db, report })

    const insert = of('insert', 'products')[0].payload as Record<string, unknown>
    expect(insert.requires_material).toBe(true)
    expect(insert.material_kinds).toEqual(['cinzas'])
    expect(report.data().materialSemeado).toBe(1)
  })

  it('produto novo SEM material afetivo no nome nasce com `false` e lista vazia', async () => {
    const { db, of } = fakeDb()
    const report = createReport()

    await writeProducts([comNome('Corrente de prata 925')], categoryUuids, { supabase: db, report })

    const insert = of('insert', 'products')[0].payload as Record<string, unknown>
    expect(insert.requires_material).toBe(false)
    expect(insert.material_kinds).toEqual([])
  })

  it('produto EXISTENTE com `requires_material: null` é semeado', async () => {
    const item = comNome('Pingente com leite materno')
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: null,
      }],
    })
    const report = createReport()

    await writeProducts([item], categoryUuids, { supabase: db, report })

    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update.requires_material).toBe(true)
    expect(update.material_kinds).toEqual(['leite_materno'])
    expect(report.data().materialSemeado).toBe(1)
  })

  it.each([true, false])(
    'produto existente com `requires_material: %s` NÃO é tocado — decisão da dona é preservada',
    async (decidido) => {
      // Esta é a razão de a coluna ser nullable. Sem o terceiro estado, a sincronização do catálogo
      // apagaria a curadoria a cada execução, e ninguém veria: o dano só aparece na fila da Adri.
      const item = comNome('Pingente com cinzas')
      const { db, of } = fakeDb({
        products: [{
          id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
          is_active: true, requires_material: decidido,
        }],
      })
      const report = createReport()

      await writeProducts([item], categoryUuids, { supabase: db, report })

      const update = of('update', 'products')[0].payload as Record<string, unknown>
      expect(update).not.toHaveProperty('requires_material')
      expect(update).not.toHaveProperty('material_kinds')
      expect(report.data().materialSemeado).toBe(0)
    },
  )

  it('a semente NÃO entra em `catalogoDoProduto` — o update normal não a reescreve', async () => {
    // Se ela entrasse, todo import sobrescreveria a curadoria; o teste acima passaria a falhar.
    const item = comNome('Pingente com cinzas')
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: false,
      }],
    })

    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })

    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(Object.keys(update)).not.toContain('requires_material')
    // e o resto do catálogo continua sendo atualizado normalmente
    expect(update.name).toBe('Pingente com cinzas')
  })

  it('`--dry-run` conta sem gravar', async () => {
    const { db, of } = fakeDb()
    const report = createReport()

    await writeProducts([comNome('Pingente com cinzas')], categoryUuids, {
      supabase: db, report, dryRun: true,
    })

    expect(of('insert', 'products')).toHaveLength(0)
    expect(report.data().materialSemeado).toBe(0)
  })
})
