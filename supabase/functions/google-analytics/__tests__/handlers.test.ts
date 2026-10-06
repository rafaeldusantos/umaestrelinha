import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { GA4_SECRET_KEY, type Deps, route, secretRefusal } from '../handlers.ts'

// Feature 61 · T07 — a function `google-analytics` (ANL-05, ANL-06, ANL-07).
//
// Toda recusa de autorização assere DUAS coisas: o status **e** que a tabela da chave não foi
// tocada. Sem a segunda metade, um handler que gravasse ANTES de checar o papel passaria em todos
// os testes de status — e teria gravado.

const ADRI = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'
const CHAVE = 'Xy9_kQ2-aBcDeFgHiJkLmN'
const AGORA = new Date('2026-10-05T15:30:00.000Z')

const req = (action: string, init: RequestInit = {}, bearer: string | null = 'jwt-da-adri') =>
  new Request(`http://local/google-analytics?action=${action}`, {
    method: 'POST',
    ...init,
    headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(init.headers ?? {}) },
  })

const corpo = (o: unknown): RequestInit => ({ body: JSON.stringify(o) })

const comoAdmin = (extra: Parameters<typeof createFakeSupabase>[0] = {}) =>
  createFakeSupabase({ user: { id: ADRI }, rpcByFn: { has_role: { data: true } }, ...extra })

const deps = (fake: ReturnType<typeof createFakeSupabase>): Deps => ({
  supabase: fake.client,
  now: () => AGORA,
})

/** Toda tabela tocada pelo handler, por qualquer caminho de escrita. */
const escritas = (fake: ReturnType<typeof createFakeSupabase>) => [
  ...fake.upserts,
  ...fake.updates,
  ...fake.inserts,
  ...fake.deletes,
]

const ACOES: Array<[string, RequestInit]> = [
  ['status', { method: 'GET' }],
  ['save-secret', corpo({ secret: CHAVE })],
  ['clear-secret', {}],
]

// ---------------------------------------------------------------------------------------------
// ANL-06 — a porta, nas três ações
// ---------------------------------------------------------------------------------------------

describe('google-analytics — autorização (ANL-06), nas três ações', () => {
  it.each(ACOES)('%s: sem token → 401, sem tocar na chave', async (acao, init) => {
    const fake = createFakeSupabase({ user: null })
    const res = await route(deps(fake), req(acao, init, null))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Não autenticado' })
    expect(escritas(fake)).toEqual([])
  })

  it.each(ACOES)('%s: anon key como bearer → 401', async (acao, init) => {
    const fake = createFakeSupabase({ user: null })
    const res = await route(deps(fake), req(acao, init, 'a-anon-key-publicada'))

    expect(res.status).toBe(401)
    expect(escritas(fake)).toEqual([])
  })

  it.each(ACOES)('%s: autenticada sem papel → 403, sem tocar na chave', async (acao, init) => {
    const fake = createFakeSupabase({ user: { id: ANA }, rpcByFn: { has_role: { data: false } } })
    const res = await route(deps(fake), req(acao, init))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Acesso restrito ao admin' })
    expect(escritas(fake)).toEqual([])
  })

  it.each(ACOES)('%s: has_role que ERRA → 403 (falha de verificação nunca vira permissão)', async (acao, init) => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fake = createFakeSupabase({ user: { id: ADRI }, rpcByFn: { has_role: { error: { message: 'x' } } } })
    const res = await route(deps(fake), req(acao, init))

    expect(res.status).toBe(403)
    expect(escritas(fake)).toEqual([])
  })

  it.each(ACOES)('%s: admin → 200', async (acao, init) => {
    const fake = comoAdmin({ rows: { analytics_secrets: null } })
    const res = await route(deps(fake), req(acao, init))

    expect(res.status).toBe(200)
  })

  it('uma ação desconhecida também nasce fechada — 401 sem token', async () => {
    const fake = createFakeSupabase({ user: null })
    expect((await route(deps(fake), req('read-secret', {}, null))).status).toBe(401)
  })

  it('o papel é perguntado à RPC canônica, com o id de quem chama', async () => {
    const fake = comoAdmin({ rows: { analytics_secrets: null } })
    await route(deps(fake), req('status', { method: 'GET' }))
    expect(fake.rpcs).toEqual([{ fn: 'has_role', args: { _user_id: ADRI, _role: 'admin' } }])
  })

  it('OPTIONS responde o preflight sem pedir autorização', async () => {
    const fake = createFakeSupabase({ user: null })
    const res = await route(deps(fake), new Request('http://local/google-analytics', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(fake.rpcs).toEqual([])
  })
})

afterEach(() => vi.restoreAllMocks())

// ---------------------------------------------------------------------------------------------
// status — a chave NUNCA sai
// ---------------------------------------------------------------------------------------------

describe('status', () => {
  it('com chave guardada: configured + data, e o CORPO INTEIRO é só isso', async () => {
    let selecionado = ''
    let filtro: Array<[string, unknown]> = []
    const fake = comoAdmin({
      rows: {
        // A fixtura devolve a linha INTEIRA, com o valor — como faria um `select *` por engano. O
        // que impede o valor de sair é o handler, não o dublê.
        analytics_secrets: (_eq: unknown, select: string, eqs: Array<[string, unknown]>) => {
          selecionado = select
          filtro = eqs
          return { key: GA4_SECRET_KEY, value: CHAVE, updated_at: '2026-10-01T12:00:00Z', updated_by: ADRI }
        },
      },
    })
    const res = await route(deps(fake), req('status', { method: 'GET' }))
    const texto = await res.text()

    expect(res.status).toBe(200)
    expect(JSON.parse(texto)).toEqual({ secret_configured: true, secret_updated_at: '2026-10-01T12:00:00Z' })
    // Asserção sobre o corpo INTEIRO, em texto: nem o valor, nem um pedaço dele.
    expect(texto).not.toContain(CHAVE)
    expect(texto).not.toContain(CHAVE.slice(0, 6))
    // E o valor nem é pedido ao banco.
    expect(selecionado).toBe('updated_at')
    expect(selecionado).not.toMatch(/value|\*/)
    expect(filtro).toEqual([['key', GA4_SECRET_KEY]])
  })

  it('sem chave: configured false e data nula', async () => {
    const fake = comoAdmin({ rows: { analytics_secrets: null } })
    const res = await route(deps(fake), req('status', { method: 'GET' }))
    await expect(res.json()).resolves.toEqual({ secret_configured: false, secret_updated_at: null })
  })

  it('aceita POST também (o `functions.invoke` do painel usa POST por padrão)', async () => {
    const fake = comoAdmin({ rows: { analytics_secrets: null } })
    expect((await route(deps(fake), req('status'))).status).toBe(200)
  })

  it('leitura que falha é ERRO (502), nunca "não configurada"', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fake = comoAdmin()
    fake.client.from = () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: '57014', message: 'x' } }) }) }),
    })
    const res = await route(deps(fake), req('status', { method: 'GET' }))
    expect(res.status).toBe(502)
    expect(await res.json()).not.toHaveProperty('secret_configured')
  })
})

// ---------------------------------------------------------------------------------------------
// save-secret — validação, gravação e o rastro
// ---------------------------------------------------------------------------------------------

describe('save-secret', () => {
  it('grava a chave aparada, com updated_by = quem chamou, e devolve a data', async () => {
    const fake = comoAdmin()
    const res = await route(deps(fake), req('save-secret', corpo({ secret: `  ${CHAVE}\n` })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, secret_updated_at: AGORA.toISOString() })
    expect(fake.upserts).toEqual([
      {
        table: 'analytics_secrets',
        values: { key: GA4_SECRET_KEY, value: CHAVE, updated_at: AGORA.toISOString(), updated_by: ADRI },
        onConflict: 'key',
      },
    ])
  })

  it('a resposta NÃO devolve a chave', async () => {
    const fake = comoAdmin()
    const texto = await (await route(deps(fake), req('save-secret', corpo({ secret: CHAVE })))).text()
    expect(texto).not.toContain(CHAVE)
  })

  it.each([
    ['vazio', '', 'Cole a chave secreta antes de salvar.'],
    ['só espaço', '   ', 'Cole a chave secreta antes de salvar.'],
    ['ausente', undefined, 'Cole a chave secreta antes de salvar.'],
    ['número', 12345, 'Cole a chave secreta antes de salvar.'],
    ['129 caracteres', 'a'.repeat(129), 'A chave secreta tem no máximo 128 caracteres. Confira se ela foi copiada sem nada a mais.'],
    ['com espaço no meio', 'abc def', 'A chave secreta não tem espaços. Confira se ela foi copiada inteira e sem nada a mais.'],
    ['com quebra de linha no meio', 'abc\ndef', 'A chave secreta não tem espaços. Confira se ela foi copiada inteira e sem nada a mais.'],
  ])('recusa %s com 400 e a frase, sem gravar', async (_r, secret, frase) => {
    const fake = comoAdmin()
    const res = await route(deps(fake), req('save-secret', corpo({ secret })))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: frase })
    expect(escritas(fake)).toEqual([])
  })

  it('128 caracteres exatos passam (o teto é inclusivo, como o check da migration)', async () => {
    const fake = comoAdmin()
    expect((await route(deps(fake), req('save-secret', corpo({ secret: 'a'.repeat(128) })))).status).toBe(200)
    expect(secretRefusal('a'.repeat(128))).toBeNull()
  })

  it('corpo malformado → 400', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fake = comoAdmin()
    const res = await route(deps(fake), req('save-secret', { body: '{nao-e-json' }))
    expect(res.status).toBe(400)
    expect(escritas(fake)).toEqual([])
  })

  it('falha de gravação → 502, e o LOG não carrega a chave (nem o details do banco, que a repete)', async () => {
    const linhas: string[] = []
    vi.spyOn(console, 'log').mockImplementation((l: unknown) => void linhas.push(String(l)))
    vi.spyOn(console, 'error').mockImplementation((l: unknown) => void linhas.push(String(l)))
    const fake = comoAdmin({
      upsertErrorByTable: {
        analytics_secrets: {
          code: '23514',
          message: `new row violates check constraint — ${CHAVE}`,
          details: `Failing row contains (ga4_api_secret, ${CHAVE}, …)`,
        },
      },
    })
    const res = await route(deps(fake), req('save-secret', corpo({ secret: CHAVE })))

    expect(res.status).toBe(502)
    expect(linhas.length).toBeGreaterThan(0) // âncora: houve log, e é ele que está sendo medido
    for (const l of linhas) expect(l).not.toContain(CHAVE)
    expect(linhas.map((l) => JSON.parse(l))).toContainEqual(
      expect.objectContaining({ status: 'write_failed', code: '23514' }),
    )
  })

  it('o log do sucesso também não carrega a chave', async () => {
    const linhas: string[] = []
    vi.spyOn(console, 'log').mockImplementation((l: unknown) => void linhas.push(String(l)))
    await route(deps(comoAdmin()), req('save-secret', corpo({ secret: CHAVE })))
    expect(linhas.length).toBeGreaterThan(0)
    for (const l of linhas) expect(l).not.toContain(CHAVE)
  })
})

// ---------------------------------------------------------------------------------------------
// clear-secret
// ---------------------------------------------------------------------------------------------

describe('clear-secret', () => {
  it('apaga a linha da chave — e só ela', async () => {
    const fake = comoAdmin()
    const res = await route(deps(fake), req('clear-secret'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(fake.deletes).toEqual([{ table: 'analytics_secrets', eq: [['key', GA4_SECRET_KEY]] }])
  })

  it('falha → 502', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fake = comoAdmin({ deleteError: { code: 'x' } })
    expect((await route(deps(fake), req('clear-secret'))).status).toBe(502)
  })
})
