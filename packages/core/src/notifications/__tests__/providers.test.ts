import { describe, expect, it } from 'vitest'

import { RESEND_ENDPOINT, classifyResendFailure, createResendProvider } from '../providers/resend.ts'
import {
  type NotificationProvider,
  type ProviderContext,
  type ProviderOutcome,
  type RenderedMessage,
  isProviderFailure,
} from '../providers/types.ts'

/**
 * NTF-09 — a interface `NotificationProvider`, exercitada com o adaptador `resend` E com um dublê,
 * pela MESMA bateria. É a prova de que a feature 43 só acrescenta um arquivo: se o dublê passa na
 * bateria, qualquer adaptador que satisfaça a interface passa.
 *
 * NTF-06 — a classificação por slug: `reason` nunca é o corpo cru; o corpo vai para `detail`.
 */

// ---------------------------------------------------------------------------------------------
// O dublê: um provedor de WhatsApp fictício, com a mesma forma. Chama um endpoint, lê `{ id }`,
// classifica por status. Não é o adaptador da 43 — é a prova de que a interface a comporta.
// ---------------------------------------------------------------------------------------------

const FAKE_ENDPOINT = 'https://whatsapp.exemplo.invalid/send'

const classifyFake = (status: number, body: unknown): string => {
  const code = body !== null && typeof body === 'object' ? String((body as { code?: unknown }).code ?? '') : ''
  if (status === 401) return 'fake_unauthorized'
  if (status === 403) return 'fake_forbidden'
  if (status === 429) return code === 'quota' ? 'fake_quota_exceeded' : 'fake_rate_limited'
  if (status >= 500) return 'fake_unavailable'
  return 'fake_failed'
}

const fakeProvider: NotificationProvider = {
  channel: 'whatsapp',
  classifyFailure: classifyFake,
  async send(message, ctx): Promise<ProviderOutcome> {
    let res: Response
    try {
      res = await ctx.fetch(FAKE_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ to: message.to, text: message.text, key: message.idempotencyKey }),
        signal: ctx.signal,
      })
    } catch (err) {
      return ctx.signal.aborted
        ? { ok: false, reason: 'fake_timeout', detail: 'timeout' }
        : { ok: false, reason: 'fake_unavailable', detail: String(err) }
    }
    const body = (await res.json().catch(() => null)) as { id?: unknown } | null
    if (res.ok) {
      const id = typeof body?.id === 'string' ? body.id : ''
      return id === '' ? { ok: false, reason: 'fake_no_id', detail: 'sem id', http: res.status } : { ok: true, id }
    }
    return { ok: false, reason: classifyFake(res.status, body), detail: JSON.stringify(body), http: res.status }
  },
}

// ---------------------------------------------------------------------------------------------
// A bateria, parametrizada por provedor
// ---------------------------------------------------------------------------------------------

interface Caso {
  nome: string
  provider: NotificationProvider
  endpoint: string
  slugs: {
    unauthorized: string
    forbidden: string
    rateLimited: string
    quota: string
    unavailable: string
    noId: string
    timeout: string
  }
  /** O corpo de 429 que significa "cota", na shape que ESTE provedor devolve. */
  corpoDeCota: unknown
}

const CASOS: Caso[] = [
  {
    nome: 'resend',
    provider: createResendProvider({ apiKey: 're_test', from: 'Uma Estrelinha <adri@loja.umaestrelinha.com.br>' }),
    endpoint: RESEND_ENDPOINT,
    slugs: {
      unauthorized: 'resend_unauthorized',
      forbidden: 'resend_forbidden',
      rateLimited: 'resend_rate_limited',
      quota: 'resend_quota_exceeded',
      unavailable: 'resend_unavailable',
      noId: 'resend_no_id',
      timeout: 'resend_timeout',
    },
    corpoDeCota: { statusCode: 429, name: 'daily_quota_exceeded', message: 'quota' },
  },
  {
    nome: 'dublê (whatsapp)',
    provider: fakeProvider,
    endpoint: FAKE_ENDPOINT,
    slugs: {
      unauthorized: 'fake_unauthorized',
      forbidden: 'fake_forbidden',
      rateLimited: 'fake_rate_limited',
      quota: 'fake_quota_exceeded',
      unavailable: 'fake_unavailable',
      noId: 'fake_no_id',
      timeout: 'fake_timeout',
    },
    corpoDeCota: { code: 'quota' },
  },
]

const mensagem = (channel: RenderedMessage['channel']): RenderedMessage => ({
  channel,
  to: 'cliente@exemplo.invalid',
  subject: 'Pagamento aprovado — pedido NP-1',
  html: '<p>oi</p>',
  text: 'oi',
  idempotencyKey: 'notification:pedido-1:order_paid:' + channel,
})

/** Um `fetch` que responde o que se mandar, e registra a chamada. */
const fetchQueResponde = (status: number, body: unknown) => {
  const chamadas: { url: string; init: RequestInit }[] = []
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init: init ?? {} })
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof globalThis.fetch
  return { fetch, chamadas }
}

const ctx = (fetch: typeof globalThis.fetch, signal = new AbortController().signal): ProviderContext => ({ fetch, signal })

describe.each(CASOS)('NotificationProvider — $nome', ({ provider, endpoint, slugs, corpoDeCota }) => {
  it('declara o canal, e a mensagem sai para o endpoint do provedor com a chave de idempotência', async () => {
    expect(['email', 'whatsapp']).toContain(provider.channel)
    const { fetch, chamadas } = fetchQueResponde(200, { id: 'msg_1' })
    await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].url).toBe(endpoint)
    expect(chamadas[0].init.method).toBe('POST')
    expect(String(chamadas[0].init.body)).toContain('cliente@exemplo.invalid')
    // Cada provedor põe a chave onde a API dele manda (o Resend, num header; o dublê, no corpo). O
    // que a interface exige é que ela CHEGUE à requisição.
    expect(JSON.stringify(chamadas[0].init)).toContain(mensagem(provider.channel).idempotencyKey)
  })

  it('2xx com `id` → { ok: true, id }', async () => {
    const { fetch } = fetchQueResponde(200, { id: 'msg_abc' })
    expect(await provider.send(mensagem(provider.channel), ctx(fetch))).toEqual({ ok: true, id: 'msg_abc' })
  })

  it('201 também é sucesso — qualquer 2xx', async () => {
    const { fetch } = fetchQueResponde(201, { id: 'msg_201' })
    expect(await provider.send(mensagem(provider.channel), ctx(fetch))).toEqual({ ok: true, id: 'msg_201' })
  })

  it('2xx SEM `id` → falha classificada, com o http', async () => {
    const { fetch } = fetchQueResponde(200, { ok: true })
    const r = await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(isProviderFailure(r)).toBe(true)
    if (isProviderFailure(r)) {
      expect(r.reason).toBe(slugs.noId)
      expect(r.http).toBe(200)
    }
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [429, 'rateLimited'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('%i → slug %s, corpo cru só em `detail`', async (status, chave) => {
    const corpo = { statusCode: status, name: 'x_error', message: 'The address cliente@exemplo.invalid is not allowed' }
    const { fetch } = fetchQueResponde(status, corpo)
    const r = await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(isProviderFailure(r)).toBe(true)
    if (isProviderFailure(r)) {
      expect(r.reason).toBe(slugs[chave])
      // NTF-06: o slug nunca carrega o corpo — é o que vai para o log.
      expect(r.reason).not.toContain('exemplo.invalid')
      expect(r.http).toBe(status)
      expect(typeof r.detail).toBe('string')
    }
  })

  it('429 de COTA é distinguido do 429 de ritmo', async () => {
    const { fetch } = fetchQueResponde(429, corpoDeCota)
    const r = await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(isProviderFailure(r) && r.reason).toBe(slugs.quota)
  })

  it('`signal` já abortado → timeout, sem pegar a rede pela causa', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = (async (_url: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      return new Response('{}', { status: 200 })
    }) as typeof globalThis.fetch
    const r = await provider.send(mensagem(provider.channel), ctx(fetch, controller.signal))
    expect(isProviderFailure(r) && r.reason).toBe(slugs.timeout)
  })

  it('queda de rede (fetch lança sem abort) → indisponível', async () => {
    const fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof globalThis.fetch
    const r = await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(isProviderFailure(r) && r.reason).toBe(slugs.unavailable)
  })

  it('corpo que não é JSON não derruba o provedor', async () => {
    const fetch = (async () => new Response('<html>502</html>', { status: 502 })) as typeof globalThis.fetch
    const r = await provider.send(mensagem(provider.channel), ctx(fetch))
    expect(isProviderFailure(r) && r.reason).toBe(slugs.unavailable)
  })

  it('`classifyFailure` é a mesma função que `send` usa', () => {
    expect(provider.classifyFailure(401, null)).toBe(slugs.unauthorized)
    expect(provider.classifyFailure(429, corpoDeCota)).toBe(slugs.quota)
  })
})

describe('classifyResendFailure — a tabela do sender.ts (RSD-01), agora em core', () => {
  it.each([
    [401, 'missing_api_key', 'resend_unauthorized'],
    [403, 'validation_error', 'resend_forbidden'],
    [409, 'invalid_idempotent_request', 'resend_duplicate'],
    [429, 'rate_limit_exceeded', 'resend_rate_limited'],
    [429, 'daily_quota_exceeded', 'resend_quota_exceeded'],
    [429, 'monthly_quota_exceeded', 'resend_quota_exceeded'],
    [400, 'validation_error', 'resend_invalid'],
    [422, 'invalid_from_address', 'resend_invalid'],
    [500, 'application_error', 'resend_unavailable'],
    [503, 'application_error', 'resend_unavailable'],
    [418, 'teapot', 'resend_failed'],
  ])('%i %s → %s', (status, name, slug) => {
    expect(classifyResendFailure(status, { statusCode: status, name, message: 'x' })).toBe(slug)
  })

  it('tolera corpo nulo, sem `name`, ou com `name` que não é string', () => {
    expect(classifyResendFailure(429, null)).toBe('resend_rate_limited')
    expect(classifyResendFailure(429, {})).toBe('resend_rate_limited')
    expect(classifyResendFailure(429, { name: 42 })).toBe('resend_rate_limited')
    expect(classifyResendFailure(401, 'texto')).toBe('resend_unauthorized')
  })
})

describe('o adaptador resend — o que só ele sabe', () => {
  const provider = createResendProvider({ apiKey: 're_key', from: 'Adri <adri@loja.umaestrelinha.com.br>' })

  it('manda o Bearer, o Idempotency-Key e o `from` do env; subject/html/text da mensagem', async () => {
    const { fetch, chamadas } = fetchQueResponde(200, { id: 'x' })
    await provider.send(mensagem('email'), ctx(fetch))
    const headers = chamadas[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer re_key')
    expect(headers['Idempotency-Key']).toBe('notification:pedido-1:order_paid:email')
    expect(JSON.parse(String(chamadas[0].init.body))).toEqual({
      from: 'Adri <adri@loja.umaestrelinha.com.br>',
      to: 'cliente@exemplo.invalid',
      subject: 'Pagamento aprovado — pedido NP-1',
      html: '<p>oi</p>',
      text: 'oi',
    })
  })

  it('o `detail` da falha carrega status, name e message — é o que vai para `order_notifications.error`', async () => {
    const { fetch } = fetchQueResponde(403, {
      statusCode: 403,
      name: 'validation_error',
      message: 'The exemplo.invalid domain is not verified.',
    })
    const r = await provider.send(mensagem('email'), ctx(fetch))
    expect(isProviderFailure(r) && r.detail).toBe('403 validation_error: The exemplo.invalid domain is not verified.')
  })
})
