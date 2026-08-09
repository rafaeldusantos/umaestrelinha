import { describe, expect, it } from 'vitest'

import categoriesFixture from '../__fixtures__/categories.json' with { type: 'json' }
import productsFixture from '../__fixtures__/products.json' with { type: 'json' }
import type { RawCategory, RawProduct } from '../nuvemshop/types.ts'
import { run, type RunDeps } from '../run.ts'
import { createMemoryCache } from '../write/cache.ts'

const cats = categoriesFixture as RawCategory[]
const prods = productsFixture as RawProduct[]

interface Op { tipo: string; tabela: string; payload?: Record<string, unknown> }

const harness = (over: Partial<RunDeps> = {}, uploadError: unknown = null) => {
  const ops: Op[] = []
  const fases: string[] = []
  const uploads: string[] = []
  let proximo = 1

  const db = {
    from: (tabela: string) => ({
      select: async () => ({ data: [] as never, error: null }),
      selectRange: async () => ({ data: [] as never, error: null }),
      insert: (values: unknown) => {
        ops.push({ tipo: 'insert', tabela, payload: values as Record<string, unknown> })
        return { select: () => ({ single: async () => ({ data: { id: `${tabela}-${proximo++}` } as never, error: null }) }) }
      },
      insertMany: async (values: readonly unknown[]) => {
        for (const v of values) ops.push({ tipo: 'insert', tabela, payload: v as Record<string, unknown> })
        return { data: null, error: null }
      },
      update: (values: unknown) => ({
        eq: async () => { ops.push({ tipo: 'update', tabela, payload: values as Record<string, unknown> }); return { data: null, error: null } },
        in: async () => ({ data: null, error: null }),
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null }),
        in: async () => ({ data: null, error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploads.push(path)
          return { error: uploadError as never }
        },
        // Bucket vazio: tudo é imagem nova. O caso "já existe" é coberto em storage.test.ts.
        list: async () => ({ data: [] as Array<{ name: string }>, error: null }),
      }),
    },
  }

  const deps: RunDeps = {
    nuvemshop: {
      listCategories: async () => { fases.push('categorias'); return cats },
      listProducts: async () => { fases.push('produtos'); return prods },
    },
    supabase: db as never,
    supabaseUrl: 'http://127.0.0.1:54341',
    cache: createMemoryCache(),
    fetch: (async () => {
      fases.push('imagem')
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/webp' },
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      }
    }) as unknown as typeof globalThis.fetch,
    log: () => {},
    ...over,
  }

  return { deps, ops, fases, uploads, of: (tipo: string, tabela: string) => ops.filter(o => o.tipo === tipo && o.tabela === tabela) }
}

describe('run — ordem das fases (CAT-05)', () => {
  it('lê categorias ANTES de produtos, e só então toca imagens', async () => {
    const { deps, fases } = harness()
    await run(deps)

    expect(fases[0]).toBe('categorias')
    expect(fases[1]).toBe('produtos')
    expect(fases.slice(2).every(f => f === 'imagem')).toBe(true)
  })

  it('para depois das categorias quando pedido', async () => {
    const { deps, fases, of } = harness()
    await run(deps, { stopAfter: 'categorias' })

    expect(fases).toEqual(['categorias'])
    expect(of('insert', 'products')).toHaveLength(0)
  })

  it('para depois dos produtos, sem tocar em imagem', async () => {
    const { deps, fases, uploads } = harness()
    await run(deps, { stopAfter: 'produtos' })

    expect(fases).toEqual(['categorias', 'produtos'])
    expect(uploads).toHaveLength(0)
  })
})

describe('run — contagem completa (CAT-08)', () => {
  it('a conferência fecha nas três entidades no catálogo do recorte', async () => {
    const { deps } = harness()
    const report = await run(deps)

    expect(report.balances().every(b => b.confere), JSON.stringify(report.balances())).toBe(true)
    expect(report.exitCode()).toBe(0)
  })

  it('conta o produto pulado no MAPEAMENTO — ele nunca chega à escrita', async () => {
    const { deps } = harness()
    const report = await run(deps)

    expect(report.data().entidades.produtos).toMatchObject({ lidos: 6, criados: 5, pulados: 1 })
    expect(report.data().produtosPulados[0].slug).toBe('pingente-figa-colecao-fragmentos')
    expect(report.data().produtosPulados[0].motivo).toBe('sem_preco')
  })

  it('conta as variações do produto pulado como puladas, e não as perde da soma', async () => {
    const { deps } = harness()
    const report = await run(deps)

    expect(report.data().entidades.variacoes.lidos).toBe(38)
    expect(report.data().entidades.variacoes.pulados).toBe(1)
    expect(report.balances().find(b => b.entidade === 'variacoes')!.confere).toBe(true)
  })

  it('respeita --limit para ensaio', async () => {
    const { deps } = harness()
    const report = await run(deps, { limit: 2 })
    expect(report.data().entidades.produtos.lidos).toBe(2)
  })
})

describe('run — SKU deduplicado no lote inteiro (CAT-04)', () => {
  it('nenhum SKU é gravado duas vezes, e os descartes vão ao relatório', async () => {
    const { deps, of } = harness()
    const report = await run(deps)

    const skus = of('insert', 'product_variants')
      .map(o => o.payload!.sku as string | null)
      .filter((s): s is string => s !== null)
    expect(skus.length).toBe(new Set(skus).size)
    expect(report.data().skusDescartados.length).toBeGreaterThan(0)
  })
})

describe('run — imagens (CAT-03, CAT-07)', () => {
  it('sobe as imagens e grava a galeria no produto', async () => {
    const { deps, uploads, of } = harness()
    const report = await run(deps)

    expect(uploads.length).toBeGreaterThan(0)
    expect(report.data().imagens.novas).toBe(uploads.length)

    const galerias = of('update', 'products').filter(o => Array.isArray(o.payload!.images))
    expect(galerias.length).toBeGreaterThan(0)
    const primeira = (galerias[0].payload!.images as Array<{ source: string; alt: string }>)[0]
    expect(primeira.source).toBe('import')
    expect(primeira.alt).not.toBe('')
  })

  it('nunca ultrapassa a concorrência pedida — o gargalo é o Storage, não o CDN', async () => {
    let emVoo = 0
    let pico = 0
    const { deps, uploads } = harness()
    deps.supabase = {
      ...(deps.supabase as never as object),
      storage: {
        from: () => ({
          upload: async (path: string) => {
            emVoo += 1
            pico = Math.max(pico, emVoo)
            await new Promise(r => setTimeout(r, 1))
            emVoo -= 1
            uploads.push(path)
            return { error: null as never }
          },
          list: async () => ({ data: [] as Array<{ name: string }>, error: null }),
        }),
      },
    } as never

    await run(deps, { concurrency: 2 })

    expect(uploads.length).toBeGreaterThan(2)
    expect(pico).toBeLessThanOrEqual(2)
    expect(emVoo).toBe(0)
  })

  it('produto entra mesmo quando TODAS as imagens falham', async () => {
    const { deps, of } = harness({
      fetch: (async () => ({ ok: false, status: 403, headers: { get: () => null } })) as unknown as typeof globalThis.fetch,
    })
    const report = await run(deps)

    expect(of('insert', 'products')).toHaveLength(5)
    expect(report.data().imagens.falhadas).toBeGreaterThan(0)
    expect(report.data().imagens.novas).toBe(0)
    // Imagem perdida não derruba o import.
    expect(report.exitCode()).toBe(0)
  })
})

describe('run — parada limpa (CAT-06)', () => {
  it('para e reporta quando a API lança, sem seguir para a fase seguinte', async () => {
    const { deps, fases, of } = harness({
      nuvemshop: {
        listCategories: async () => { fases.push('categorias'); return cats },
        listProducts: async () => { throw new Error('Nuvemshop devolveu 500 após 4 tentativas') },
      },
    })
    const report = await run(deps)

    expect(report.data().parouPorErro).toContain('após 4 tentativas')
    expect(report.exitCode()).toBe(1)
    expect(of('insert', 'products')).toHaveLength(0)
  })

  it('para quando o Storage recusa a gravação por algo que não é duplicata', async () => {
    const { deps } = harness({}, { statusCode: '500', message: 'connection refused' })
    const report = await run(deps)

    expect(report.data().parouPorErro).toContain('Storage')
    expect(report.exitCode()).toBe(1)
  })

  it('o relatório descreve o estado FINAL — nenhum upload segue em voo depois da parada', async () => {
    // O defeito que o primeiro import real expôs: `Promise.all` rejeita no primeiro erro mas não
    // cancela os outros runners do pool. O relatório saía com 290 imagens enquanto o Storage
    // recebia 3.651 — um relatório que descreve um estado que não é o do banco.
    let emVoo = 0
    let maxDepoisDaFalha = 0
    let falhou = false
    let sucessos = 0

    const { deps, uploads } = harness()
    deps.supabase = {
      ...(deps.supabase as never as object),
      storage: {
        from: () => ({
          upload: async (path: string) => {
            emVoo += 1
            if (falhou) maxDepoisDaFalha = Math.max(maxDepoisDaFalha, emVoo)
            await Promise.resolve()
            emVoo -= 1
            // A partir da terceira imagem o Storage fica fora DE VERDADE: falha persistente, que é
            // o que a guarda do CAT-06 existe para tratar. Falha única é coberta em storage.test.
            if (falhou || sucessos === 2) {
              falhou = true
              return { error: { statusCode: '500', message: 'connection refused' } as never }
            }
            sucessos += 1
            uploads.push(path)
            return { error: null as never }
          },
          list: async () => ({ data: [] as Array<{ name: string }>, error: null }),
        }),
      },
    } as never

    const report = await run(deps, { concurrency: 4 })

    expect(report.data().parouPorErro).toContain('Storage')
    // Depois que run() volta, nada mais pode estar sendo enviado.
    expect(emVoo).toBe(0)
    // E o contador do relatório tem de bater com o que de fato subiu, exatamente.
    expect(report.data().imagens.novas).toBe(uploads.length)
    expect(maxDepoisDaFalha).toBeGreaterThan(0)
  })

  it('trata duplicata do Storage como reuso, não como parada', async () => {
    const { deps } = harness({}, { statusCode: '409', message: 'The resource already exists' })
    const report = await run(deps)

    expect(report.data().parouPorErro).toBeNull()
    expect(report.data().imagens.reusadas).toBeGreaterThan(0)
    expect(report.data().imagens.novas).toBe(0)
    expect(report.exitCode()).toBe(0)
  })
})

describe('run — dry-run (CAT-09)', () => {
  it('não grava nada em banco nem em Storage, e ainda produz o relatório previsto', async () => {
    const { deps, ops, uploads } = harness()
    const report = await run(deps, { dryRun: true })

    expect(ops).toHaveLength(0)
    expect(uploads).toHaveLength(0)
    expect(report.data().entidades.produtos.criados).toBe(5)
    expect(report.data().entidades.categorias.criados).toBe(39)
    expect(report.balances().every(b => b.confere)).toBe(true)
  })

  it('não baixa nem sobe imagem quando o banco JÁ TEM os produtos', async () => {
    // O caso que o teste acima não pega: com o produto já gravado, o uuid existe, e a fase de
    // imagens deixaria de ser pulada por acidente. Um `--dry-run` que sobe 410 MB não é dry.
    const jaGravados = prods.map((p, n) => ({
      id: `p-${n}`, nuvemshop_id: p.id, slug: (p.handle as { pt: string }).pt, is_active: true,
    }))
    const { deps, ops, uploads, fases } = harness()
    const anterior = deps.supabase as unknown as { from: (t: string) => object }
    deps.supabase = {
      ...(deps.supabase as unknown as object),
      from: (tabela: string) => ({
        ...anterior.from(tabela),
        select: async () => ({ data: (tabela === 'products' ? jaGravados : []) as never, error: null }),
        selectRange: async () => ({ data: (tabela === 'products' ? jaGravados : []) as never, error: null }),
      }),
    } as never

    await run(deps, { dryRun: true })

    expect(uploads).toHaveLength(0)
    expect(fases.filter(f => f === 'imagem')).toHaveLength(0)
    expect(ops.filter(o => o.tipo !== 'select')).toHaveLength(0)
  })
})
