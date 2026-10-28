// Feature 84 — o pedido de sugestão e a tradução da resposta (`SIA-10`, `SIA-17`, `SIA-18`,
// `SIA-20`, `SIA-22`, `SIA-23`).
//
// O dublê de erro tem a forma que o supabase-js produz: o `FunctionsHttpError` leva a `Response` em
// `context` (com `status` e `json()`), e o de rede (`FunctionsFetchError`) leva o erro cru, sem
// status. As duas formas importam: é por elas que "não tem acesso" e "a rede caiu" se distinguem.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { functions: { invoke } } }))

import { requestSeoSuggestion, type SeoSuggestionInput } from '../requestSeoSuggestion'

const INPUT: SeoSuggestionInput = {
  productId: '11111111-1111-4111-8111-111111111111',
  name: 'Anel Coração',
  description: '<p>Anel feito à mão.</p>',
  categoryIds: ['22222222-2222-4222-8222-222222222222'],
  relatedIds: ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'],
  requiresMaterial: true,
}

const erroHttp = (status: number, corpo: unknown) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { status, json: async () => corpo },
})

beforeEach(() => invoke.mockReset())

describe('o corpo enviado (SIA-10)', () => {
  it('chama `seo-suggest` com os seis campos do input, campo a campo, e nada além', async () => {
    invoke.mockResolvedValueOnce({ data: { title: 't', description: 'd', examples: 2 }, error: null })
    await requestSeoSuggestion({ ...INPUT, extra: 'não vai' } as unknown as SeoSuggestionInput)

    expect(invoke).toHaveBeenCalledTimes(1)
    const [nome, opcoes] = invoke.mock.calls[0]
    expect(nome).toBe('seo-suggest')
    const body = (opcoes as { body: Record<string, unknown> }).body
    expect(Object.keys(body).sort()).toEqual(
      ['categoryIds', 'description', 'name', 'productId', 'relatedIds', 'requiresMaterial'],
    )
    expect(body.productId).toBe('11111111-1111-4111-8111-111111111111')
    expect(body.name).toBe('Anel Coração')
    expect(body.description).toBe('<p>Anel feito à mão.</p>')
    expect(body.categoryIds).toEqual(['22222222-2222-4222-8222-222222222222'])
    expect(body.relatedIds).toEqual(['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'])
    expect(body.requiresMaterial).toBe(true)
  })

  it('produto não salvo vai com `productId: null`', async () => {
    invoke.mockResolvedValueOnce({ data: { title: 't', description: 'd', examples: 0 }, error: null })
    await requestSeoSuggestion({ ...INPUT, productId: null, requiresMaterial: false })
    const body = (invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body
    expect(body.productId).toBeNull()
    expect(body.requiresMaterial).toBe(false)
  })
})

describe('o desfecho', () => {
  it('200 ⇒ ok com título e descrição', async () => {
    invoke.mockResolvedValueOnce({
      data: { title: 'Anel de resina com coração', description: 'Uma descrição.', examples: 3 },
      error: null,
    })
    expect(await requestSeoSuggestion(INPUT)).toEqual({
      kind: 'ok',
      title: 'Anel de resina com coração',
      description: 'Uma descrição.',
    })
  })

  it('200 sem a forma combinada ⇒ upstream, nunca lixo nos campos', async () => {
    invoke.mockResolvedValueOnce({ data: { title: 1 }, error: null })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'upstream' })
  })

  it.each([
    [503, { reason: 'not_configured' }, 'not_configured'],
    [429, { reason: 'limited' }, 'limited'],
    [400, { reason: 'bad_request' }, 'bad_request'],
    [422, { reason: 'off_rules' }, 'off_rules'],
    [422, { reason: 'refusal' }, 'refusal'],
    [422, { reason: 'truncated' }, 'truncated'],
    [502, { reason: 'upstream' }, 'upstream'],
  ])('%i %j ⇒ %s (o `reason` do corpo decide)', async (status, corpo, esperado) => {
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp(status, corpo) })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: esperado })
  })

  it.each([401, 403])('%i ⇒ forbidden (o corpo é `{ error }`, sem `reason`)', async status => {
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp(status, { error: 'Não autenticado' }) })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'forbidden' })
  })

  it('404 do gateway, com corpo ilegível (deploy fora de ordem) ⇒ upstream', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { name: 'FunctionsHttpError', context: { status: 404, json: async () => { throw new Error('html') } } },
    })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'upstream' })
  })

  it('o status decide quando o corpo não traz `reason` conhecido', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp(429, { reason: 'qualquer' }) })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'limited' })
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp(503, {}) })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'not_configured' })
  })

  it('erro de rede (sem status no context) ⇒ network', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { name: 'FunctionsFetchError', message: 'Failed to send', context: new TypeError('fetch failed') },
    })
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'network' })
  })

  it('o invoke que LANÇA ⇒ network', async () => {
    invoke.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect(await requestSeoSuggestion(INPUT)).toEqual({ kind: 'error', reason: 'network' })
  })
})
