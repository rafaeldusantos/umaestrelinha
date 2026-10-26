// Feature `79` · T17 — a porta dos avisos do app (design §4.5; `MAN-23`, `MAN-16`; `L-047`).
//
// `conferirPapel` é dublado POR MÓDULO (molde de `gravarAcao.test.ts`), e o `invoke` responde da fila
// do `fakeSupabase`, com o erro na forma do supabase-js: `FunctionsHttpError` com o `Response` em
// `context`, `FunctionsFetchError` sem resposta. O que se prova: a TRADUÇÃO — e que o status HTTP da
// function nunca decide sozinho uma recusa.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { fake } from '@/test/fakeSupabase'

import { desinscrever, gravarEventos, inscrever, lerConfig, lerStatus, testar } from '../portaDeAvisos'

const papel = vi.hoisted(() => ({ conferirPapel: vi.fn() }))

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@/shared/api/lerComPapel', () => ({ conferirPapel: papel.conferirPapel }))

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'
const KEYS = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) }
const RECUSA_DA_RPC = { message: 'acesso restrito ao painel', code: '42501' }

/** O erro do supabase-js para uma resposta não-2xx: `FunctionsHttpError`, com o `Response` em `context`. */
const http = (status: number, corpo: unknown = undefined) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(corpo === undefined ? null : typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  }),
})
/** Rede caída: `FunctionsFetchError`, sem resposta. */
const rede = () => ({
  data: null,
  error: Object.assign(new Error('Failed to send a request to the Edge Function'), {
    name: 'FunctionsFetchError',
    context: new TypeError('Failed to fetch'),
  }),
})
const ok = (data: unknown) => ({ data, error: null })

const fila = (acao: string, ...respostas: unknown[]) =>
  fake.filaDeInvocacao(`atelie-avisos?action=${acao}`, ...(respostas as Parameters<typeof fake.filaDeInvocacao>[1][]))

beforeEach(() => {
  fake.reset()
  papel.conferirPapel.mockReset()
})

describe('2xx ⇒ o dado, e o corpo enviado é exato (L-039)', () => {
  it('lerConfig', async () => {
    fila('config', ok({ applicationServerKey: 'BKEY' }))
    await expect(lerConfig()).resolves.toEqual({ tipo: 'ok', dado: { applicationServerKey: 'BKEY' } })
    expect(fake.invocacoesDe('atelie-avisos?action=config').map((i) => i.opcoes)).toEqual([{ body: {} }])
  })

  it('lerStatus', async () => {
    fila('status', ok({ subscribed: true, events: ['owner_order_paid'] }))
    await expect(lerStatus(ENDPOINT)).resolves.toEqual({ tipo: 'ok', dado: { subscribed: true, events: ['owner_order_paid'] } })
    expect(fake.invocacoesDe('atelie-avisos?action=status').map((i) => i.opcoes)).toEqual([{ body: { endpoint: ENDPOINT } }])
  })

  it('inscrever — só endpoint e as duas chaves, nada mais', async () => {
    fila('subscribe', ok({ events: ['a'] }))
    const keys = { ...KEYS, extra: 'nao-vai' } as typeof KEYS
    await expect(inscrever(ENDPOINT, keys)).resolves.toEqual({ tipo: 'ok', dado: { events: ['a'] } })
    expect(fake.invocacoesDe('atelie-avisos?action=subscribe').map((i) => i.opcoes)).toEqual([
      { body: { endpoint: ENDPOINT, keys: { p256dh: KEYS.p256dh, auth: KEYS.auth } } },
    ])
  })

  it('gravarEventos', async () => {
    fila('events', ok({ events: ['owner_order_paid'] }))
    await expect(gravarEventos(ENDPOINT, ['owner_order_paid'])).resolves.toEqual({ tipo: 'ok', dado: { events: ['owner_order_paid'] } })
    expect(fake.invocacoesDe('atelie-avisos?action=events').map((i) => i.opcoes)).toEqual([
      { body: { endpoint: ENDPOINT, events: ['owner_order_paid'] } },
    ])
  })

  it('desinscrever e testar', async () => {
    fila('unsubscribe', ok({ ok: true }))
    fila('test', ok({ ok: true }))
    await expect(desinscrever(ENDPOINT)).resolves.toEqual({ tipo: 'ok', dado: { ok: true } })
    await expect(testar(ENDPOINT)).resolves.toEqual({ tipo: 'ok', dado: { ok: true } })
    expect(fake.invocacoesDe('atelie-avisos?action=unsubscribe').map((i) => i.opcoes)).toEqual([{ body: { endpoint: ENDPOINT } }])
    expect(fake.invocacoesDe('atelie-avisos?action=test').map((i) => i.opcoes)).toEqual([{ body: { endpoint: ENDPOINT } }])
  })

  it('nenhuma conferência de papel no sucesso', async () => {
    fila('config', ok({ applicationServerKey: 'BKEY' }))
    await lerConfig()
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })
})

describe('os cinco casos obrigatórios de §4.5 — o status nunca decide a recusa sozinho', () => {
  it('403 com o papel DE PÉ (conferirPapel responde o instante) ⇒ falha, NUNCA recusa', async () => {
    fila('subscribe', http(403, { error: 'forbidden' }))
    papel.conferirPapel.mockResolvedValueOnce(undefined)
    const r = await inscrever(ENDPOINT, KEYS)
    expect(r.tipo).toBe('falhou')
    expect(papel.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('403 com conferirPapel em 42501 ⇒ LANÇA a recusa no formato único do app', async () => {
    fila('subscribe', http(403, { error: 'forbidden' }))
    papel.conferirPapel.mockRejectedValueOnce(RECUSA_DA_RPC)
    const erro = await inscrever(ENDPOINT, KEYS).then(
      () => null,
      (e: unknown) => e,
    )
    expect(isAccessDenied(erro)).toBe(true)
    expect(erro).toBeInstanceOf(Error)
    expect(papel.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('401 com conferirPapel em 42501 ⇒ LANÇA a recusa', async () => {
    fila('status', http(401, { error: 'unauthorized' }))
    papel.conferirPapel.mockRejectedValueOnce(RECUSA_DA_RPC)
    await expect(lerStatus(ENDPOINT)).rejects.toMatchObject({ code: '42501' })
  })

  it('FunctionsFetchError (rede) ⇒ falha, SEM chamar conferirPapel', async () => {
    fila('subscribe', rede())
    const r = await inscrever(ENDPOINT, KEYS)
    expect(r.tipo).toBe('falhou')
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })

  it('403 com conferirPapel SEM REDE ⇒ falha, nunca recusa', async () => {
    fila('events', http(403, { error: 'forbidden' }))
    papel.conferirPapel.mockRejectedValueOnce({ message: 'Failed to fetch' })
    const r = await gravarEventos(ENDPOINT, [])
    expect(r.tipo).toBe('falhou')
    expect(papel.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('401 com o papel de pé ⇒ falha', async () => {
    fila('test', http(401, { error: 'unauthorized' }))
    papel.conferirPapel.mockResolvedValueOnce(undefined)
    await expect(testar(ENDPOINT)).resolves.toMatchObject({ tipo: 'falhou' })
  })
})

describe('4xx de validação, cooldown, not_found e gone ⇒ o slug do corpo', () => {
  it.each<[string, number, string, () => Promise<unknown>, string]>([
    ['400 invalid_endpoint', 400, 'invalid_endpoint', () => inscrever(ENDPOINT, KEYS), 'subscribe'],
    ['400 da regra de eventos', 400, 'unknown_event', () => gravarEventos(ENDPOINT, []), 'events'],
    ['404 not_found', 404, 'not_found', () => gravarEventos(ENDPOINT, []), 'events'],
    ['429 cooldown', 429, 'cooldown', () => testar(ENDPOINT), 'test'],
    ['410 gone', 410, 'gone', () => testar(ENDPOINT), 'test'],
  ])('%s', async (_nome, status, slug, chamar, acao) => {
    fila(acao, http(status, { error: slug }))
    await expect(chamar()).resolves.toEqual({ tipo: 'erro', slug, status })
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })

  it('4xx sem slug legível no corpo ⇒ falha', async () => {
    fila('test', http(400, 'não é json'))
    await expect(testar(ENDPOINT)).resolves.toMatchObject({ tipo: 'falhou' })
  })
})

describe('5xx ⇒ falha', () => {
  it.each<[number, string]>([
    [500, 'db_error'],
    [502, 'push_failed'],
    [503, 'push_unconfigured'],
  ])('%i %s ⇒ falha, sem conferir o papel', async (status, slug) => {
    fila('config', http(status, { error: slug }))
    await expect(lerConfig()).resolves.toMatchObject({ tipo: 'falhou' })
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })

  it('o relay (FunctionsRelayError) ⇒ falha', async () => {
    fila('config', {
      data: null,
      error: Object.assign(new Error('Relay Error'), { name: 'FunctionsRelayError', context: new Response(null, { status: 502 }) }),
    })
    await expect(lerConfig()).resolves.toMatchObject({ tipo: 'falhou' })
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })
})
