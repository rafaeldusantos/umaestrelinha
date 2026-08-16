import { describe, expect, it } from 'vitest'

import productsFixture from '../../__fixtures__/products.json' with { type: 'json' }
import { mapProduct } from '../../map/product.ts'
import { mapVariants, type VariantRow } from '../../map/variant.ts'
import type { RawProduct } from '../../nuvemshop/types.ts'
import { createReport } from '../../report.ts'
import type { DbLike } from '../db.ts'
import {
  CAMPOS_DE_VITRINE, writeProducts, writeProductImages, writeVariantImages, type ProductItem,
} from '../products.ts'

const reais = productsFixture as RawProduct[]

interface Operacao {
  tipo: 'select' | 'insert' | 'update' | 'delete'
  tabela: string
  payload?: Record<string, unknown>
  /** Qual linha a operação alcançou. Sem isto não dá para provar QUAL variação recebeu qual foto. */
  filtro?: { coluna: string; valor: unknown }
}

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
        eq: async (coluna: string, valor: unknown) => {
          ops.push({
            tipo: 'update', tabela, payload: values as Record<string, unknown>, filtro: { coluna, valor },
          })
          return { data: null, error: null }
        },
        in: async (coluna: string, valores: readonly unknown[]) => {
          ops.push({
            tipo: 'update', tabela, payload: values as Record<string, unknown>, filtro: { coluna, valor: valores },
          })
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
// Feature 26 — as tags da origem (COR-06, COR-07, COR-08)
// =================================================================================================
//
// A loja já filtra por tag, e o filtro nasceu morto: 0 de 680 produtos tinham tag gravada. Aqui a
// obrigação é a SIMÉTRICA da semente de material logo abaixo — tag **é** sobrescrita, porque não há
// tela de curadoria de tag nesta loja e a origem é a única dona.

describe('tags da origem (feature 26)', () => {
  const comTags = (tags: string[]): ProductItem => {
    const base = itens()[0]
    return { product: { ...base.product, tags }, variants: [] }
  }

  it('o INSERT de produto novo carrega as tags (COR-06)', async () => {
    const { db, of } = fakeDb()
    await writeProducts([comTags(['Afetivo', 'Pingente Afetivo'])], categoryUuids, {
      supabase: db, report: createReport(),
    })

    const insert = of('insert', 'products')[0].payload as Record<string, unknown>
    expect(insert.tags).toEqual(['Afetivo', 'Pingente Afetivo'])
  })

  it('o UPDATE de produto existente SOBRESCREVE as tags anteriores (COR-08)', async () => {
    const item = comTags(['Renomeada'])
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, tags: ['Nome Velho'],
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })

    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update.tags).toEqual(['Renomeada'])
  })

  it('origem que removeu todas as tags grava `[]`, e o update apaga o que havia (COR-07, COR-08)', async () => {
    const item = comTags([])
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, tags: ['Tema Antigo'],
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })

    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update.tags).toEqual([])
  })

  it('as tags dos 5 produtos REAIS chegam ao insert, sem `null` em nenhum', async () => {
    const { db, of } = fakeDb()
    await writeProducts(itens(), categoryUuids, { supabase: db, report: createReport() })

    const inserts = of('insert', 'products')
    expect(inserts).toHaveLength(5)
    for (const op of inserts) {
      expect(Array.isArray(op.payload!.tags), `produto sem array de tags`).toBe(true)
    }
    const todas = inserts.flatMap(op => op.payload!.tags as string[])
    expect(todas).toContain('Ateliê da Prata')
    expect(todas).not.toContain('')
  })
})

// =================================================================================================
// Feature 26 — a foto de cada variação (COR-01, COR-02, COR-04, COR-05)
// =================================================================================================
//
// `image_url` estava `null` em 3.245 de 3.245 variações. O `image_nuvemshop_id` era mapeado desde o
// primeiro import, com um comentário dizendo que "vira URL do Storage na fase de imagens" — e nada
// implementava a frase.

describe('writeVariantImages (feature 26)', () => {
  const CAPA = 'http://local/storage/nuvemshop/10/900.webp'
  const AZUL = 'http://local/storage/nuvemshop/10/901.webp'
  const ROSA = 'http://local/storage/nuvemshop/10/902.webp'

  const variacao = (over: Partial<VariantRow>): VariantRow => ({
    nuvemshop_id: 1, product_nuvemshop_id: 10, name: null, sku: null, price: 10,
    compare_price: null, stock: 0, option_values: {}, weight_kg: null, is_active: true,
    position: 1, image_nuvemshop_id: null, ...over,
  })

  /** `nuvemshop_id` da variação → o `image_url` que a escrita mandou para ela. */
  const gravadas = (of: ReturnType<typeof fakeDb>['of']) =>
    new Map(of('update', 'product_variants').map(op => {
      expect(op.filtro!.coluna).toBe('nuvemshop_id')
      return [op.filtro!.valor as number, op.payload!.image_url as string | null]
    }))

  const mapa = new Map([[900, CAPA], [901, AZUL], [902, ROSA]])

  it('a variação com vínculo resolvido recebe a URL do Storage daquela imagem (COR-01)', async () => {
    const { db, of } = fakeDb()
    await writeVariantImages(
      [variacao({ nuvemshop_id: 11, image_nuvemshop_id: 901 }),
        variacao({ nuvemshop_id: 12, image_nuvemshop_id: 902 })],
      mapa,
      { supabase: db, report: createReport() },
    )

    expect(gravadas(of).get(11)).toBe(AZUL)
    expect(gravadas(of).get(12)).toBe(ROSA)
  })

  it('a variação SEM `image_id` na origem fica `null` — nunca a capa (COR-02)', async () => {
    const { db, of } = fakeDb()
    await writeVariantImages(
      [variacao({ nuvemshop_id: 13, image_nuvemshop_id: null })],
      mapa,
      { supabase: db, report: createReport() },
    )

    expect(gravadas(of).get(13)).toBeNull()
  })

  it('vínculo cuja imagem falhou no upload fica `null` — nunca a capa nem a foto de outra cor (COR-02)', async () => {
    // A imagem 903 não está no mapa porque o upload dela falhou. Herdar a capa faria três cores da
    // mesma peça mostrarem a mesma foto: a cliente concluiria que a cor não muda a peça.
    const { db, of } = fakeDb()
    await writeVariantImages(
      [variacao({ nuvemshop_id: 14, image_nuvemshop_id: 903 })],
      mapa,
      { supabase: db, report: createReport() },
    )

    const escrito = gravadas(of).get(14)
    expect(escrito).toBeNull()
    expect([CAPA, AZUL, ROSA]).not.toContain(escrito)
  })

  it('vínculo que mudou na origem é CORRIGIDO, não preservado (COR-04)', async () => {
    const { db, of } = fakeDb({
      product_variants: [{ id: 'v-1', nuvemshop_id: 15, product_id: 'p-1', image_url: AZUL }],
    })
    await writeVariantImages(
      [variacao({ nuvemshop_id: 15, image_nuvemshop_id: 902 })],
      mapa,
      { supabase: db, report: createReport() },
    )

    expect(gravadas(of).get(15)).toBe(ROSA)
  })

  it('escreve para TODA variação, inclusive as sem foto — é o que impede URL velha de sobreviver (COR-04)', async () => {
    const { db, of } = fakeDb()
    const variantes = [
      variacao({ nuvemshop_id: 21, image_nuvemshop_id: 901 }),
      variacao({ nuvemshop_id: 22, image_nuvemshop_id: null }),
      variacao({ nuvemshop_id: 23, image_nuvemshop_id: 999 }),
    ]
    await writeVariantImages(variantes, mapa, { supabase: db, report: createReport() })

    expect(of('update', 'product_variants')).toHaveLength(3)
    expect([...gravadas(of).entries()]).toEqual([[21, AZUL], [22, null], [23, null]])
  })

  it('alimenta os contadores do relatório: com foto e sem foto (COR-03)', async () => {
    const { db } = fakeDb()
    const report = createReport()
    await writeVariantImages(
      [variacao({ nuvemshop_id: 31, image_nuvemshop_id: 901 }),
        variacao({ nuvemshop_id: 32, image_nuvemshop_id: 902 }),
        variacao({ nuvemshop_id: 33, image_nuvemshop_id: null })],
      mapa,
      { supabase: db, report },
    )

    expect(report.data().fotosDeVariacao).toEqual({ com: 2, sem: 1 })
  })

  it('não grava nada em dry-run (COR-05)', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()
    await writeVariantImages(
      [variacao({ nuvemshop_id: 41, image_nuvemshop_id: 901 })],
      mapa,
      { supabase: db, report, dryRun: true },
    )

    expect(ops).toHaveLength(0)
    expect(report.data().fotosDeVariacao).toEqual({ com: 0, sem: 0 })
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

// =================================================================================================
// Feature 30 — a semente de MARCA
// =================================================================================================
//
// `RawProduct.brand` sempre existiu na API da Nuvemshop e o mapeamento a ignorava. O feed do Google
// emite `<g:brand>`, e sem semear a coluna nasceria vazia nos 689 produtos.
//
// A obrigação simétrica é a mesma da semente de material, e é o que estes testes guardam: **nunca
// sobrescrever o que a dona decidiu**. Sem isso, toda sincronização do catálogo desfaria a curadoria
// de marca, e ninguém veria — o dano só apareceria no feed.

describe('semente de marca (feature 30 · GSH-21)', () => {
  const comMarca = (brand: string | null): ProductItem => {
    const base = itens()[0]
    return { product: { ...base.product, brand }, variants: [] }
  }

  it('produto NOVO nasce com a marca da origem', async () => {
    const { db, of } = fakeDb()
    await writeProducts([comMarca('Uma Estrelinha')], categoryUuids, {
      supabase: db,
      report: createReport(),
    })
    const insert = of('insert', 'products')[0].payload as Record<string, unknown>
    expect(insert.brand).toBe('Uma Estrelinha')
  })

  it('origem SEM marca não grava campo nenhum — nada de string vazia', async () => {
    const { db, of } = fakeDb()
    await writeProducts([comMarca(null)], categoryUuids, {
      supabase: db,
      report: createReport(),
    })
    const insert = of('insert', 'products')[0].payload as Record<string, unknown>
    expect(insert).not.toHaveProperty('brand')
  })

  it('produto EXISTENTE com `brand: null` é semeado', async () => {
    const item = comMarca('Uma Estrelinha')
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, brand: null,
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })
    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update.brand).toBe('Uma Estrelinha')
  })

  it('marca já CURADA não é sobrescrita, mesmo com a origem divergente', async () => {
    // O valor da origem difere do curado de propósito: fixtures em que os dois lados valem o mesmo
    // não detectam sobrescrita.
    const item = comMarca('Marca Da Origem')
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, brand: 'Marca Curada Pela Dona',
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })
    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update).not.toHaveProperty('brand')
  })

  it('origem sem marca NÃO zera a curada', async () => {
    const item = comMarca(null)
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, brand: 'Marca Curada Pela Dona',
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })
    const update = of('update', 'products')[0].payload as Record<string, unknown>
    expect(update).not.toHaveProperty('brand')
  })

  it('a marca NÃO entra em `catalogoDoProduto` — o update normal não a reescreve', async () => {
    const item = comMarca('Marca Da Origem')
    const { db, of } = fakeDb({
      products: [{
        id: 'p-1', nuvemshop_id: item.product.nuvemshop_id, slug: item.product.slug,
        is_active: true, requires_material: true, brand: 'Curada',
      }],
    })
    await writeProducts([item], categoryUuids, { supabase: db, report: createReport() })
    const update = of('update', 'products')[0].payload as Record<string, unknown>
    // O update normal continua acontecendo — o que não pode é levar `brand` junto.
    expect(Object.keys(update).length).toBeGreaterThan(3)
    expect(update).not.toHaveProperty('brand')
  })
})
