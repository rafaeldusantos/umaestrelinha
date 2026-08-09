import { describe, expect, it } from 'vitest'

import { adaptSupabase, DbError, POSTGREST_PAGE, selectAll, unwrap, type SupabaseJsLike, type TableClient } from '../db.ts'

/** Dublê com a forma de encadeamento do supabase-js real, registrando a sequência de chamadas. */
const fakeSupabase = () => {
  const chamadas: string[] = []
  const chain = (prefixo: string) => ({
    select: (columns: string) => { chamadas.push(`${prefixo}.select(${columns})`); return chain(`${prefixo}.select`) },
    single: () => { chamadas.push(`${prefixo}.single()`); return 'RESULTADO' },
    range: (f: number, t: number) => { chamadas.push(`${prefixo}.range(${f},${t})`); return 'RESULTADO' },
    eq: (c: string, v: unknown) => { chamadas.push(`${prefixo}.eq(${c},${v})`); return 'RESULTADO' },
    in: (c: string, v: readonly unknown[]) => { chamadas.push(`${prefixo}.in(${c},[${v.join(',')}])`); return 'RESULTADO' },
  })

  const client: SupabaseJsLike = {
    from: (table: string) => ({
      select: (columns: string) => { chamadas.push(`from(${table}).select(${columns})`); return chain('select') },
      insert: (values: unknown) => {
        chamadas.push(`from(${table}).insert(${Array.isArray(values) ? `[${values.length}]` : 'obj'})`)
        return chain(`insert`)
      },
      update: () => { chamadas.push(`from(${table}).update()`); return chain('update') },
      delete: () => { chamadas.push(`from(${table}).delete()`); return chain('delete') },
    }),
  }

  return { client, chamadas }
}

/**
 * Dublê que TRUNCA como o PostgREST real.
 *
 * O terceiro defeito do primeiro import real veio daqui: nenhum dublê anterior chegava perto de
 * 1.000 linhas, então `select` parecia ler a tabela inteira. Este devolve no máximo `page` linhas
 * por chamada, que é o comportamento do servidor.
 */
const tabelaTruncante = (total: number, page = POSTGREST_PAGE) => {
  const ranges: Array<[number, number]> = []
  const linhas = Array.from({ length: total }, (_, i) => ({ id: i }))

  const table = {
    select: async () => ({ data: linhas.slice(0, page), error: null }),
    selectRange: async (_c: string, from: number, to: number) => {
      ranges.push([from, to])
      return { data: linhas.slice(from, Math.min(to + 1, from + page)), error: null }
    },
  } as unknown as TableClient

  return { table, ranges }
}

describe('selectAll — a tabela inteira, apesar do teto de 1.000 do PostgREST', () => {
  it('lê as 3.356 linhas de product_variants, e não as 1.000 que um select simples devolveria', async () => {
    const { table, ranges } = tabelaTruncante(3356)
    const todas = await selectAll<{ id: number }>(table, 'id', 'ler variações')

    expect(todas).toHaveLength(3356)
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999], [3000, 3999]])
  })

  it('um `select` simples nesta mesma tabela devolve só 1.000 — a prova de que a paginação importa', async () => {
    const { table } = tabelaTruncante(3356)
    const truncado = await table.select<{ id: number }>('id')
    expect(truncado.data).toHaveLength(POSTGREST_PAGE)
  })

  it('para na primeira página quando a tabela cabe nela', async () => {
    const { table, ranges } = tabelaTruncante(39)
    expect(await selectAll(table, 'id', 'ler categorias')).toHaveLength(39)
    expect(ranges).toHaveLength(1)
  })

  it('devolve lista vazia para tabela vazia, sem estourar', async () => {
    const { table, ranges } = tabelaTruncante(0)
    expect(await selectAll(table, 'id', 'ler')).toEqual([])
    expect(ranges).toHaveLength(1)
  })

  it('múltiplo exato do teto custa uma requisição vazia a mais, e não perde linha', async () => {
    const { table, ranges } = tabelaTruncante(2000)
    expect(await selectAll(table, 'id', 'ler')).toHaveLength(2000)
    expect(ranges).toHaveLength(3)
  })

  it('propaga erro do banco em vez de devolver lista truncada em silêncio', async () => {
    const table = {
      selectRange: async () => ({ data: null, error: { message: 'PGRST103' } }),
    } as unknown as TableClient
    await expect(selectAll(table, 'id', 'ler variações')).rejects.toThrow(/ler variações: PGRST103/)
  })
})

describe('adaptSupabase — encadeamento na ordem que o supabase-js exige', () => {
  it('select passa as colunas direto', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('products').select('id, slug')
    expect(chamadas).toEqual(['from(products).select(id, slug)'])
  })

  it('selectRange encadeia .range() DEPOIS do select, com a página fechada', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('product_variants').selectRange('id', 1000, 1999)
    expect(chamadas).toEqual(['from(product_variants).select(id)', 'select.range(1000,1999)'])
  })

  it('insert de uma linha encadeia select().single(), na ordem', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('products').insert({ slug: 'x' }).select('id').single()
    expect(chamadas).toEqual([
      'from(products).insert(obj)',
      'insert.select(id)',
      'insert.select.single()',
    ])
  })

  it('insertMany manda o array para o MESMO insert, sem select', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('product_categories').insertMany([{ a: 1 }, { a: 2 }])
    expect(chamadas).toEqual(['from(product_categories).insert([2])'])
  })

  it('update aplica o filtro DEPOIS do update, nunca antes', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('products').update({ name: 'n' }).eq('id', 'p-1')
    expect(chamadas).toEqual(['from(products).update()', 'update.eq(id,p-1)'])
  })

  it('update com `in` filtra por lista', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('product_variants').update({ is_active: false }).in('id', ['a', 'b'])
    expect(chamadas).toEqual(['from(product_variants).update()', 'update.in(id,[a,b])'])
  })

  it('delete aplica o filtro DEPOIS do delete — invertido, apagaria a tabela inteira', async () => {
    const { client, chamadas } = fakeSupabase()
    await adaptSupabase(client).from('product_categories').delete().eq('product_id', 'p-1')
    expect(chamadas).toEqual(['from(product_categories).delete()', 'delete.eq(product_id,p-1)'])
  })

  it('nenhum método do adaptador é async — devolver builder de função async entregaria o resultado', () => {
    const db = adaptSupabase(fakeSupabase().client)
    const tabela = db.from('products')
    expect(tabela.insert({}).select('id').single).toBeTypeOf('function')
    expect(tabela.update({}).eq).toBeTypeOf('function')
    expect(tabela.delete().in).toBeTypeOf('function')
  })
})

describe('unwrap', () => {
  it('devolve os dados quando não há erro', () => {
    expect(unwrap('ler', { data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }])
  })

  it('lança nomeando a operação e a mensagem do banco', () => {
    expect(() => unwrap('criar produto', { data: null, error: { message: 'PGRST204' } }))
      .toThrow(/criar produto: PGRST204/)
  })

  it('lança DbError, para o run distinguir de erro de rede', () => {
    expect(() => unwrap('x', { data: null, error: { code: '23505' } })).toThrow(DbError)
  })
})
