import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { createRateLimiter } from '../../_shared/rateLimit.ts'
import type { ClaudeJson, ClaudeJsonRequest, ClaudeJsonResult } from '../../_shared/claudePort.ts'
import { PARSE_BUDGET_MS, type Deps, route } from '../handlers.ts'
import { ADDRESS_SCHEMA, CONTACT_AND_ADDRESS_SCHEMA, PARSE_EFFORT, PARSE_MODEL } from '../prompt.ts'

// A porta `customer-parse` — ler contato e endereço de um texto colado.
//
// Toda recusa antes do modelo assere DUAS coisas: o status e que a porta do Claude NÃO foi chamada —
// com um dublê que LANÇA se for chamado. E nenhuma resposta grava nada: o dublê do banco registra
// toda leitura e escrita, e só a RPC do papel pode aparecer.

const ADRI = '11111111-1111-4111-8111-111111111111'
const ANA = '22222222-2222-4222-8222-222222222222'

const TEXTO =
  'Oi! Sou a Maria Souza, meu zap é 51 99999-8888, email maria.souza@exemplo.com. ' +
  'Mando para Rua dos Andradas 1001 apto 3, Centro Histórico, Porto Alegre/RS, CEP 90010-000.'

const req = (body: unknown = { text: TEXTO, mode: 'contact_and_address' }, init: RequestInit = {}) =>
  new Request('http://local/customer-parse', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-da-adri', 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })

const USO = { input: 400, output: 80 }
const LIDO = {
  name: 'Maria Souza',
  email: 'maria.souza@exemplo.com',
  phone: '51999998888',
  cpf: '',
  cep: '90010000',
  street: 'Rua dos Andradas',
  number: '1001',
  complement: 'apto 3',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  state: 'RS',
}
const ok = (json: unknown = LIDO): ClaudeJsonResult => ({ kind: 'ok', json, usage: USO })

function porta(...respostas: Array<ClaudeJsonResult | ((r: ClaudeJsonRequest) => Promise<ClaudeJsonResult>)>) {
  const chamadas: ClaudeJsonRequest[] = []
  const fn: ClaudeJson = async (r) => {
    chamadas.push(r)
    const prox = respostas.shift()
    if (!prox) throw new Error('porta do Claude chamada além do esperado')
    return typeof prox === 'function' ? prox(r) : prox
  }
  return { fn, chamadas }
}

function portaProibida() {
  const chamadas: ClaudeJsonRequest[] = []
  const fn: ClaudeJson = async (r) => {
    chamadas.push(r)
    throw new Error('a porta do Claude foi chamada num caminho de recusa')
  }
  return { fn, chamadas }
}

const comoAdmin = (extra: Parameters<typeof createFakeSupabase>[0] = {}) =>
  createFakeSupabase({ user: { id: ADRI }, rpcByFn: { has_role: { data: true } }, ...extra })

const deps = (over: Partial<Deps> & { supabase: any }): Deps => ({
  claude: porta(ok()).fn,
  limiter: createRateLimiter(30, 600_000, () => 0),
  ...over,
})

/** Nada além da RPC do papel tocou o banco. */
const naoGravouNada = (fake: ReturnType<typeof createFakeSupabase>) => {
  expect(fake.reads).toEqual([])
  expect(fake.inserts).toEqual([])
  expect(fake.updates).toEqual([])
  expect(fake.upserts).toEqual([])
  expect(fake.deletes).toEqual([])
  expect(fake.rpcs.map((r) => r.fn).filter((f) => f !== 'has_role')).toEqual([])
}

let logs: string[] = []
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logs.push(a.map(String).join(' '))
  })
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    logs.push(a.map(String).join(' '))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const linhasDeLog = () =>
  logs.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)).filter((l) => l.fn === 'customer-parse')

describe('customer-parse — o papel vem antes de tudo', () => {
  it('sem header ⇒ 401, sem chamar o modelo, mesmo sem chave e com o teto estourado', async () => {
    const { client } = createFakeSupabase({ user: null })
    const limiter = createRateLimiter(1, 600_000, () => 0)
    limiter.hit(ADRI)
    const p = portaProibida()
    const r1 = await route(deps({ supabase: client, claude: p.fn, limiter }), req(undefined, { headers: {} }))
    expect(r1.status).toBe(401)
    const r2 = await route(deps({ supabase: client, claude: null, limiter }), req(undefined, { headers: {} }))
    expect(r2.status).toBe(401)
    expect(p.chamadas).toEqual([])
  })

  it('conta sem papel admin ⇒ 403, sem chamar o modelo e sem gastar o teto', async () => {
    const { client } = createFakeSupabase({ user: { id: ANA }, rpcByFn: { has_role: { data: false } } })
    const limiter = createRateLimiter(1, 600_000, () => 0)
    const p = portaProibida()
    const res = await route(deps({ supabase: client, claude: p.fn, limiter }), req())
    expect(res.status).toBe(403)
    expect(p.chamadas).toEqual([])
    expect(limiter.hit(ANA)).toBe(true)
  })

  it('has_role em erro ⇒ 403, sem chamar o modelo', async () => {
    const { client } = createFakeSupabase({ user: { id: ADRI }, rpcByFn: { has_role: { error: { message: 'x' } } } })
    const p = portaProibida()
    const res = await route(deps({ supabase: client, claude: p.fn }), req())
    expect(res.status).toBe(403)
    expect(p.chamadas).toEqual([])
  })

  it('sem papel, o texto acima do teto não é avaliado: 401 antes do 413', async () => {
    const { client } = createFakeSupabase({ user: null })
    const res = await route(deps({ supabase: client }), req({ text: 'a'.repeat(5000), mode: 'address' }, { headers: {} }))
    expect(res.status).toBe(401)
  })

  it('OPTIONS ⇒ preflight; GET ⇒ 405', async () => {
    const { client } = comoAdmin()
    expect((await route(deps({ supabase: client }), new Request('http://local/x', { method: 'OPTIONS' }))).status).toBe(200)
    expect((await route(deps({ supabase: client }), new Request('http://local/x', { method: 'GET' }))).status).toBe(405)
  })
})

describe('customer-parse — sem chave', () => {
  it('claude: null ⇒ 503 not_configured, depois do papel', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: null }), req())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({ reason: 'not_configured' })
    expect(fake.rpcs.map((r) => r.fn)).toEqual(['has_role'])
    naoGravouNada(fake)
  })
})

describe('customer-parse — o teto por conta', () => {
  it('a 31ª leitura da mesma conta em 10 min ⇒ 429 limited, sem chamar o modelo; outra conta passa', async () => {
    const limiter = createRateLimiter(30, 600_000, () => 0)
    const fake = comoAdmin()
    for (let i = 0; i < 30; i++) {
      const r = await route({ supabase: fake.client, claude: porta(ok()).fn, limiter }, req())
      expect(r.status).toBe(200)
    }
    const p = portaProibida()
    const res = await route({ supabase: fake.client, claude: p.fn, limiter }, req())
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toEqual({ reason: 'limited' })
    expect(p.chamadas).toEqual([])

    const outra = comoAdmin({ user: { id: ANA } })
    expect((await route({ supabase: outra.client, claude: porta(ok()).fn, limiter }, req())).status).toBe(200)
  })
})

describe('customer-parse — o corpo', () => {
  it('texto com 2.001 caracteres ⇒ 413 too_long, sem chamar o modelo', async () => {
    const fake = comoAdmin()
    const p = portaProibida()
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req({ text: 'a'.repeat(2001), mode: 'address' }))
    expect(res.status).toBe(413)
    await expect(res.json()).resolves.toEqual({ reason: 'too_long' })
    expect(p.chamadas).toEqual([])
  })

  it('texto com exatamente 2.000 caracteres passa', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client }), req({ text: 'a'.repeat(2000), mode: 'address' }))
    expect(res.status).toBe(200)
  })

  it.each([
    ['texto vazio', { text: '   ', mode: 'address' }],
    ['texto que não é string', { text: 42, mode: 'address' }],
    ['sem modo', { text: TEXTO }],
    ['modo desconhecido', { text: TEXTO, mode: 'contact' }],
    ['JSON inválido', '{texto:'],
  ])('%s ⇒ 400 bad_request, sem chamar o modelo', async (_r, body) => {
    const fake = comoAdmin()
    const p = portaProibida()
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req(body))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ reason: 'bad_request' })
    expect(p.chamadas).toEqual([])
  })
})

describe('customer-parse — o pedido ao modelo', () => {
  it('o modelo, o esforço e o schema fixo de cada modo; o texto vai no user, nunca no system', async () => {
    const fake = comoAdmin()
    const p = porta(ok(), ok())
    await route(deps({ supabase: fake.client, claude: p.fn }), req())
    await route(deps({ supabase: fake.client, claude: p.fn }), req({ text: TEXTO, mode: 'address' }))

    const [a, b] = p.chamadas
    expect(a.model).toBe('claude-haiku-5-5')
    expect(PARSE_MODEL).toBe('claude-haiku-5-5')
    expect(a.effort).toBe(PARSE_EFFORT)
    expect(['low', 'medium', 'high']).toContain(a.effort)
    expect(a.schema).toBe(CONTACT_AND_ADDRESS_SCHEMA)
    expect(b.schema).toBe(ADDRESS_SCHEMA)
    expect(a.signal).toBeInstanceOf(AbortSignal)
    expect(a.user).toContain(TEXTO)
    expect(a.system).not.toContain(TEXTO)
    expect(Object.keys((b.schema as any).properties).sort()).toEqual(
      ['cep', 'city', 'complement', 'neighborhood', 'number', 'state', 'street'],
    )
    expect(Object.keys((a.schema as any).properties).sort()).toEqual(
      ['cep', 'city', 'complement', 'cpf', 'email', 'name', 'neighborhood', 'number', 'phone', 'state', 'street'],
    )
  })
})

describe('customer-parse — a resposta', () => {
  it('contato e endereço ⇒ 200 com os campos conferidos e quantos foram achados', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client }), req())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      contact: { name: 'Maria Souza', email: 'maria.souza@exemplo.com', phone: '(51) 99999-8888', cpf: '' },
      address: {
        cep: '90010-000',
        street: 'Rua dos Andradas',
        number: '1001',
        complement: 'apto 3',
        neighborhood: 'Centro Histórico',
        city: 'Porto Alegre',
        state: 'RS',
      },
      found: 10,
    })
    naoGravouNada(fake)
  })

  it('modo address ⇒ a resposta nem tem a chave do contato, mesmo que o modelo o devolva', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: porta(ok()).fn }), req({ text: TEXTO, mode: 'address' }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(Object.keys(corpo).sort()).toEqual(['address', 'found'])
    expect(JSON.stringify(corpo)).not.toContain('Maria')
    expect(JSON.stringify(corpo)).not.toContain('99999')
    expect(corpo.found).toBe(7)
  })

  it('o que não confere vira vazio (CPF com dígito errado, e-mail inválido)', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ ...LIDO, cpf: '529.982.247-26', email: 'maria@' }))
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    const corpo = await res.json()
    expect(corpo.contact.cpf).toBe('')
    expect(corpo.contact.email).toBe('')
  })

  it('texto sem dados ⇒ 200 com tudo vazio e found 0', async () => {
    const fake = comoAdmin()
    const vazio = Object.fromEntries(Object.keys(LIDO).map((k) => [k, '']))
    const res = await route(deps({ supabase: fake.client, claude: porta(ok(vazio)).fn }), req())
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo.found).toBe(0)
    expect(corpo.contact).toEqual({ name: '', email: '', phone: '', cpf: '' })
  })
})

describe('customer-parse — o modelo fora do ar', () => {
  it('5xx do modelo ⇒ 502 upstream', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: porta({ kind: 'upstream', status: 529 }).fn }), req())
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({ reason: 'upstream' })
  })

  it('o prazo aborta o signal e responde 502 upstream', async () => {
    vi.useFakeTimers()
    const fake = comoAdmin()
    let sinal: AbortSignal | null = null
    const p = porta(
      (r) =>
        new Promise((resolve) => {
          sinal = r.signal
          r.signal.addEventListener('abort', () => resolve({ kind: 'upstream', status: null }))
        }),
    )
    const pendente = route(deps({ supabase: fake.client, claude: p.fn }), req())
    await vi.advanceTimersByTimeAsync(PARSE_BUDGET_MS - 1)
    expect(sinal!.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(sinal!.aborted).toBe(true)
    const res = await pendente
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({ reason: 'upstream' })
  })
})

describe('customer-parse — saída cortada ou recusada nunca vira campo', () => {
  it.each([
    ['truncated', { kind: 'truncated', usage: USO } as ClaudeJsonResult],
    ['refusal', { kind: 'refusal', usage: USO } as ClaudeJsonResult],
    ['invalid', { kind: 'invalid', usage: USO } as ClaudeJsonResult],
  ])('%s ⇒ 422 com o próprio desfecho, sem campos, com UMA chamada', async (kind, resposta) => {
    const fake = comoAdmin()
    const p = porta(resposta)
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    const corpo = await res.json()
    expect(corpo).toEqual({ reason: kind })
    expect(p.chamadas).toHaveLength(1)
  })

  it('JSON que não é objeto ⇒ 422 invalid', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: porta(ok('Maria Souza')).fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'invalid' })
  })
})

describe('customer-parse — o log', () => {
  it('uma linha por chamada, com o tamanho e o desfecho — nunca o texto nem o que foi lido', async () => {
    const fake = comoAdmin()
    await route(deps({ supabase: fake.client }), req())
    await route(deps({ supabase: fake.client, claude: porta({ kind: 'truncated', usage: USO }).fn }), req())
    await route(deps({ supabase: fake.client, claude: null }), req())

    const linhas = linhasDeLog()
    expect(linhas.map((l) => l.result)).toEqual(['ok', 'truncated', 'not_configured'])
    expect(linhas[0].chars).toBe(TEXTO.length)
    expect(linhas[0].mode).toBe('contact_and_address')
    expect(linhas[0].found).toBe(10)

    const todas = logs.join('\n')
    for (const pedaco of ['Maria', 'Andradas', '99999', 'exemplo.com', '90010', 'Porto Alegre', 'Oi!']) {
      expect(todas).not.toContain(pedaco)
    }
  })

  it('o texto recusado por tamanho também não vai ao log', async () => {
    const fake = comoAdmin()
    const longo = 'Segredo da cliente '.repeat(200)
    await route(deps({ supabase: fake.client }), req({ text: longo, mode: 'address' }))
    const [linha] = linhasDeLog()
    expect(linha.result).toBe('too_long')
    expect(linha.chars).toBe(longo.length)
    expect(logs.join('\n')).not.toContain('Segredo')
  })
})
