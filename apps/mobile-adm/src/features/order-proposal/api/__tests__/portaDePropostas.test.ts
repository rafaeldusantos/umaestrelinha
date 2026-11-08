// A porta dos pedidos montados. Molde de `portaDeAvisos.test.ts`: `conferirPapel` é
// dublado por módulo, e o `invoke` responde da fila do `fakeSupabase` na forma do supabase-js. O que se
// prova: o nome literal e o corpo de cada ação, a frase e o código do erro da function, e que o status
// HTTP nunca decide sozinho uma recusa.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { fake } from '@/test/fakeSupabase'

import { cancelarMontado, gravarObservacaoDoMontado, lerMontado, listarMontados, registrarEnvio, renovarMontado } from '../portaDePropostas'

const papel = vi.hoisted(() => ({ conferirPapel: vi.fn() }))

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@/shared/api/lerComPapel', () => ({ conferirPapel: papel.conferirPapel }))

const ID = 'cccccccc-0000-4000-8000-000000000001'

const http = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  }),
})
const rede = () => ({
  data: null,
  error: Object.assign(new Error('Failed to send a request to the Edge Function'), { name: 'FunctionsFetchError' }),
})
const ok = (data: unknown) => ({ data, error: null })
const fila = (acao: string, ...respostas: unknown[]) =>
  fake.filaDeInvocacao(`order-proposals?action=${acao}`, ...(respostas as Parameters<typeof fake.filaDeInvocacao>[1][]))
const corpoDe = (acao: string) => fake.invocacoesDe(`order-proposals?action=${acao}`).map((i) => i.opcoes)

beforeEach(() => {
  fake.reset()
  papel.conferirPapel.mockReset()
})

describe('cada ação, pelo nome literal e com o corpo exato', () => {
  it('list, get, cancel, log-sent e note', async () => {
    fila('list', ok({ proposals: [], agora: '2026-11-07T12:00:00.000Z' }))
    fila('get', ok({ proposal: { id: ID }, state: 'open', actions: {}, token: 't' }))
    fila('cancel', ok({ id: ID }))
    fila('log-sent', ok({ ok: true }), ok({ ok: true }))
    fila('note', ok({ id: ID, admin_note: null }))
    await expect(listarMontados()).resolves.toEqual({ tipo: 'ok', dado: { proposals: [], agora: '2026-11-07T12:00:00.000Z' } })
    await expect(lerMontado(ID)).resolves.toMatchObject({ tipo: 'ok', dado: { token: 't' } })
    await cancelarMontado(ID)
    await registrarEnvio(ID, 'whatsapp')
    await registrarEnvio(ID, 'copy')
    await gravarObservacaoDoMontado(ID, null)
    expect(corpoDe('list')).toEqual([{ body: {} }])
    expect(corpoDe('get')).toEqual([{ body: { id: ID } }])
    expect(corpoDe('cancel')).toEqual([{ body: { id: ID } }])
    expect(corpoDe('log-sent')).toEqual([{ body: { id: ID, channel: 'whatsapp' } }, { body: { id: ID, channel: 'copy' } }])
    expect(corpoDe('note')).toEqual([{ body: { id: ID, admin_note: null } }])
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })

  it('renew sem total esperado manda só o id; com ele, o `expected_total`', async () => {
    fila('renew', ok({ id: ID, token: 'novo', expires_at: '2026-11-14T12:00:00Z' }), ok({ id: ID, token: 'novo2', expires_at: 'x' }))
    await expect(renovarMontado(ID)).resolves.toMatchObject({ tipo: 'ok', dado: { token: 'novo' } })
    await renovarMontado(ID, 412.5)
    expect(corpoDe('renew')).toEqual([{ body: { id: ID } }, { body: { id: ID, expected_total: 412.5 } }])
  })
})

describe('o erro da function: a frase e o código', () => {
  it('409 com código ⇒ o slug é o código, e a frase vem junto', async () => {
    fila('cancel', http(409, { error: 'Esta proposta não está mais aberta.', code: 'not_open' }))
    await expect(cancelarMontado(ID)).resolves.toEqual({
      tipo: 'erro',
      status: 409,
      slug: 'not_open',
      frase: 'Esta proposta não está mais aberta.',
      totalRelido: null,
    })
  })

  it('o `prices_changed` do renew traz o total relido', async () => {
    fila('renew', http(409, { error: 'Os preços mudaram enquanto você montava. Confira o resumo.', code: 'prices_changed', summary: { items_total: 380 } }))
    await expect(renovarMontado(ID)).resolves.toMatchObject({ tipo: 'erro', slug: 'prices_changed', totalRelido: 380 })
  })

  it('4xx sem código: o slug é a frase', async () => {
    fila('note', http(422, { error: 'A observação passou do limite.' }))
    await expect(gravarObservacaoDoMontado(ID, 'x')).resolves.toMatchObject({ tipo: 'erro', slug: 'A observação passou do limite.', frase: 'A observação passou do limite.' })
  })

  it('5xx ⇒ falha', async () => {
    fila('list', http(502, { error: 'Não consegui ler as propostas.' }))
    await expect(listarMontados()).resolves.toMatchObject({ tipo: 'falhou' })
  })
})

describe('a recusa só pelo `42501` de conferirPapel; rede é falha', () => {
  it('403 com conferirPapel em 42501 ⇒ LANÇA a recusa', async () => {
    fila('get', http(403, { error: 'forbidden' }))
    papel.conferirPapel.mockRejectedValueOnce({ message: 'acesso restrito ao painel', code: '42501' })
    const erro = await lerMontado(ID).then(
      () => null,
      (e: unknown) => e,
    )
    expect(isAccessDenied(erro)).toBe(true)
  })

  it('403 com o papel de pé ⇒ falha, nunca recusa', async () => {
    fila('list', http(403, { error: 'forbidden' }))
    papel.conferirPapel.mockResolvedValueOnce(undefined)
    await expect(listarMontados()).resolves.toMatchObject({ tipo: 'falhou' })
  })

  it('rede ⇒ falha, sem perguntar o papel', async () => {
    fila('log-sent', rede())
    await expect(registrarEnvio(ID, 'copy')).resolves.toMatchObject({ tipo: 'falhou' })
    expect(papel.conferirPapel).not.toHaveBeenCalled()
  })

  it('o `invoke` que rejeita (sem resposta) ⇒ falha, nunca exceção solta', async () => {
    await expect(listarMontados()).resolves.toMatchObject({ tipo: 'falhou' })
  })
})
