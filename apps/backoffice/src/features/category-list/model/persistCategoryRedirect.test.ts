// 23 · T17 — `SEO-02`: "WHEN o slug de uma categoria muda THEN o anterior SHALL resolver por uma
// tabela equivalente" (spec `23`, AC 8).
//
// As asserções saem do "Done when" da T17 e da AC 9 herdada do molde de produto — nunca da
// implementação.

import { describe, expect, it } from 'vitest'
import {
  persistCategoryRedirect,
  type CategoryRedirectClient,
} from './persistCategoryRedirect'

interface Call {
  table: string
  op: string
  payload?: unknown
  options?: unknown
}

const fakeClient = (fail?: { table: string; op: string; message: string }) => {
  const calls: Call[] = []
  const result = (table: string, op: string) =>
    Promise.resolve(
      fail && fail.table === table && fail.op === op
        ? { error: { message: fail.message } }
        : { error: null },
    )
  const client: CategoryRedirectClient = {
    from: (table: string) => ({
      upsert: (rows, options) => {
        calls.push({ table, op: 'upsert', payload: rows, options })
        return result(table, 'upsert')
      },
      delete: () => ({
        eq: (column, value) => {
          calls.push({ table, op: 'delete', payload: { column, value } })
          return result(table, 'delete')
        },
      }),
    }),
  }
  return { client, calls }
}

const base = {
  categoryId: 'cat-1',
  previousSlug: 'joias-de-leite',
  nextSlug: 'joia-de-leite-materno',
}

describe('persistCategoryRedirect — os quatro vereditos (SEO-02)', () => {
  it('slug mudou: grava o slug ANTIGO apontando para a categoria, na tabela de categoria', async () => {
    const { client, calls } = fakeClient()

    const result = await persistCategoryRedirect(client, base)

    expect(result).toEqual({ written: true })
    const upsert = calls.find(c => c.op === 'upsert')!
    expect(upsert.table).toBe('category_redirects')
    expect(upsert.payload).toEqual([{ from_slug: 'joias-de-leite', category_id: 'cat-1' }])
  })

  it('o upsert vai com onConflict from_slug — renomear, voltar atrás e renomear de novo não estoura a PK', async () => {
    const { client, calls } = fakeClient()

    await persistCategoryRedirect(client, base)

    expect(calls.find(c => c.op === 'upsert')!.options).toEqual({ onConflict: 'from_slug' })
  })

  it('slug inalterado não grava nada — não há endereço antigo', async () => {
    const { client, calls } = fakeClient()

    const result = await persistCategoryRedirect(client, { ...base, nextSlug: base.previousSlug })

    expect(result).toEqual({ written: false, reason: 'unchanged' })
    expect(calls).toEqual([])
  })

  it('sem slug anterior (categoria recém-criada) não grava nada', async () => {
    const { client, calls } = fakeClient()

    expect(await persistCategoryRedirect(client, { ...base, previousSlug: '' })).toEqual({
      written: false,
      reason: 'empty',
    })
    expect(calls).toEqual([])
  })

  it('slug novo vazio não grava nada — redirect para endereço inexistente é pior que nenhum', async () => {
    const { client, calls } = fakeClient()

    expect(await persistCategoryRedirect(client, { ...base, nextSlug: '' })).toEqual({
      written: false,
      reason: 'empty',
    })
    expect(calls).toEqual([])
  })
})

describe('persistCategoryRedirect — categoria viva vence o redirect (AC 9 herdada)', () => {
  it('o slug que vira ATIVO deixa de ser redirect de outra categoria', async () => {
    const { client, calls } = fakeClient()

    await persistCategoryRedirect(client, base)

    const del = calls.find(c => c.op === 'delete')!
    expect(del.table).toBe('category_redirects')
    expect(del.payload).toEqual({ column: 'from_slug', value: 'joia-de-leite-materno' })
  })

  it('o delete vem ANTES do upsert — senão o registro novo poderia ser o apagado', async () => {
    const { client, calls } = fakeClient()

    await persistCategoryRedirect(client, base)

    expect(calls.findIndex(c => c.op === 'delete')).toBeLessThan(
      calls.findIndex(c => c.op === 'upsert'),
    )
  })

  it('falha ao limpar o conflito para antes do upsert, e reporta a mensagem', async () => {
    const { client, calls } = fakeClient({
      table: 'category_redirects',
      op: 'delete',
      message: 'permission denied',
    })

    expect(await persistCategoryRedirect(client, base)).toEqual({
      written: false,
      reason: 'error',
      message: 'permission denied',
    })
    expect(calls.some(c => c.op === 'upsert')).toBe(false)
  })
})

describe('persistCategoryRedirect — a falha não é engolida', () => {
  it('falha na gravação é reportada com a mensagem', async () => {
    const { client } = fakeClient({
      table: 'category_redirects',
      op: 'upsert',
      message: 'new row violates row-level security policy',
    })

    expect(await persistCategoryRedirect(client, base)).toEqual({
      written: false,
      reason: 'error',
      message: 'new row violates row-level security policy',
    })
  })
})
