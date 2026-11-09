import { describe, expect, it } from 'vitest'

import { createRateLimiter } from '../../_shared/rateLimit.ts'
import { createFakeSupabase, type FakeSupabase } from '../../_shared/testing/fakes.ts'
import { createClockCache, route, type Deps } from '../handlers.ts'

/**
 * A ação `ping` da function `visit` — o pulso de presença na loja.
 *
 * Os portões: preflight (com `Max-Age`) · método · teto próprio por IP (120/min, separado do da
 * visita) · corpo (`presenceBodyRefusal`) · robô · origem · `record_store_presence`. O pulso NUNCA lê
 * `store_clock`: quem devolve `{ ate, agora }` é a própria gravação. O aparelho é calculado pelo user
 * agent e só a FAIXA vai à RPC; o log nunca carrega id, IP nem user agent.
 */

const ID = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c'
const IP = '203.0.113.7'
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const UA_ROBO = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const ORIGEM_PROD = 'https://umaestrelinha.com.br'
const CORPO = { id: ID, page: 'joia', product: 'colar-estrela', cart: 1, source: 'instagram' }
const GRAVADA = { desfecho: 'gravada', ate: 1_792_724_400_000, agora: 1_792_681_200_000 }

type Linha = Record<string, unknown>

const criar = (opcoes: { record?: { data?: unknown; error?: unknown } } = {}) => {
  const supabase: FakeSupabase = createFakeSupabase({
    rpcByFn: {
      store_clock: { data: { dia: '2026-10-22', ate: GRAVADA.ate, agora: GRAVADA.agora, production_host: 'umaestrelinha.com.br' } },
      record_store_visit: { data: { desfecho: 'gravada', dia: '2026-10-22', ate: GRAVADA.ate, agora: GRAVADA.agora } },
      record_store_presence: opcoes.record ?? { data: GRAVADA },
    },
  })
  let t = 1_792_681_200_000
  const now = () => t
  const logs: Linha[] = []
  const deps: Deps = {
    supabase: supabase.client,
    now,
    limiter: createRateLimiter(30, 60_000, now),
    pingLimiter: createRateLimiter(120, 60_000, now),
    clock: createClockCache(),
    log: (linha) => logs.push(linha),
  }
  return { supabase, deps, logs, avancar: (ms: number) => (t += ms) }
}

const pedir = (
  opcoes: { acao?: string | null; metodo?: string; corpo?: unknown; origem?: string | null; ua?: string | null; ip?: string } = {},
): Request => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const origem = opcoes.origem === undefined ? ORIGEM_PROD : opcoes.origem
  if (origem !== null) headers.set('Origin', origem)
  const ua = opcoes.ua === undefined ? UA_IPHONE : opcoes.ua
  if (ua !== null) headers.set('User-Agent', ua)
  headers.set('x-forwarded-for', opcoes.ip ?? IP)
  headers.set('Authorization', 'Bearer sessao-da-cliente')
  const acao = opcoes.acao === undefined ? 'ping' : opcoes.acao
  const metodo = opcoes.metodo ?? 'POST'
  const url = `https://x.test/functions/v1/visit${acao ? `?action=${acao}` : ''}`
  const req = new Request(url, {
    method: metodo,
    headers,
    body: metodo === 'POST' ? JSON.stringify(opcoes.corpo ?? (acao === 'ping' ? CORPO : { id: ID })) : undefined,
  })
  const vigiados = new Proxy(req.headers, {
    get(alvo, prop) {
      if (prop === 'get') {
        return (nome: string) => {
          if (nome.toLowerCase() === 'authorization') throw new Error('o pulso não pode ler Authorization')
          return alvo.get(nome)
        }
      }
      const v = Reflect.get(alvo, prop, alvo)
      return typeof v === 'function' ? v.bind(alvo) : v
    },
  })
  Object.defineProperty(req, 'headers', { value: vigiados })
  return req
}

const presencas = (s: FakeSupabase) => s.rpcs.filter((r) => r.fn === 'record_store_presence')

const conferirLog = (logs: Linha[], desfecho: string) => {
  expect(logs).toHaveLength(1)
  expect(logs[0]).toMatchObject({ fn: 'visit', acao: 'ping', desfecho })
  const texto = JSON.stringify(logs)
  for (const segredo of [ID, IP, UA_IPHONE, 'colar-estrela']) expect(texto).not.toContain(segredo)
}

describe('o pulso de presença — o caminho feliz', () => {
  it('grava pela RPC com as faixas, o host da origem e o aparelho — nunca o user agent', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ desfecho: 'gravada', ate: GRAVADA.ate, agora: GRAVADA.agora })
    expect(presencas(supabase)).toEqual([
      {
        fn: 'record_store_presence',
        args: {
          p_id: ID,
          p_page_kind: 'joia',
          p_product_slug: 'colar-estrela',
          p_cart_items: 1,
          p_source: 'instagram',
          p_device: 'celular',
          p_host: 'umaestrelinha.com.br',
        },
      },
    ])
    expect(JSON.stringify(supabase.rpcs)).not.toContain('iPhone')
    conferirLog(logs, 'gravada')
  })

  it('o pulso NÃO lê `store_clock` nem grava visita', async () => {
    const { supabase, deps } = criar()
    await route(deps, pedir())
    expect(supabase.rpcs.map((r) => r.fn)).toEqual(['record_store_presence'])
  })

  it('o aparelho sai do user agent: computador e tablet', async () => {
    const { supabase, deps } = criar()
    await route(deps, pedir({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36' }))
    await route(deps, pedir({ ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1' }))
    expect(presencas(supabase).map((r) => r.args.p_device)).toEqual(['computador', 'tablet'])
  })

  it('o `interno` que o banco decide (host fora da produção) é repassado com o relógio', async () => {
    const { deps, logs } = criar({ record: { data: { ...GRAVADA, desfecho: 'interno' } } })
    const res = await route(deps, pedir({ origem: 'https://umaestrelinha-store-five.vercel.app' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ desfecho: 'interno', ate: GRAVADA.ate, agora: GRAVADA.agora })
    conferirLog(logs, 'interno')
  })
})

describe('o pulso de presença — o que não grava', () => {
  it('robô não grava', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ ua: UA_ROBO }))
    expect(res.status).toBe(200)
    expect(presencas(supabase)).toEqual([])
    conferirLog(logs, 'robô')
  })

  it('IP de data center (o robô de 2026-11-08/09) não grava, com motivo `rede`', async () => {
    const { supabase, deps, logs } = criar()
    const req = pedir({ ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' })
    req.headers.set('cf-connecting-ip', '198.46.191.25')
    const res = await route(deps, req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ desfecho: 'robô' })
    expect(presencas(supabase)).toEqual([])
    conferirLog(logs, 'robô')
    expect(logs[0].motivo).toBe('rede')
  })

  it('sem `Origin`, ou ilegível, é interno e não grava', async () => {
    for (const origem of [null, 'null']) {
      const { supabase, deps, logs } = criar()
      const res = await route(deps, pedir({ origem }))
      expect(res.status).toBe(200)
      expect(presencas(supabase)).toEqual([])
      conferirLog(logs, 'interno')
    }
  })

  it('corpo recusado ⇒ 400 com o motivo no log, sem RPC', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ corpo: { ...CORPO, url: 'https://x' } }))
    expect(res.status).toBe(400)
    expect(supabase.rpcs).toEqual([])
    conferirLog(logs, 'inválido')
    expect(logs[0].motivo).toBe('chave')
  })

  it('outro método ⇒ 405', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ metodo: 'GET' }))
    expect(res.status).toBe(405)
    expect(supabase.rpcs).toEqual([])
    conferirLog(logs, 'inválido')
  })

  it('falha da RPC ⇒ 500 `erro`', async () => {
    const { deps, logs } = criar({ record: { error: { code: '23514', message: 'x' } } })
    const res = await route(deps, pedir())
    expect(res.status).toBe(500)
    conferirLog(logs, 'erro')
  })

  it('resposta da RPC sem relógio ⇒ 500 `erro`', async () => {
    const { deps, logs } = criar({ record: { data: { desfecho: 'gravada' } } })
    const res = await route(deps, pedir())
    expect(res.status).toBe(500)
    conferirLog(logs, 'erro')
  })
})

describe('os dois limitadores não se consomem', () => {
  it('o pulso tem teto de 120 por minuto por IP, sem ler o banco no 429', async () => {
    const { supabase, deps, logs } = criar()
    for (let i = 0; i < 120; i++) expect((await route(deps, pedir())).status).toBe(200)
    logs.length = 0
    const antes = supabase.rpcs.length
    const res = await route(deps, pedir())
    expect(res.status).toBe(429)
    expect(supabase.rpcs.length).toBe(antes)
    conferirLog(logs, 'limite')
  })

  it('120 pulsos do mesmo IP não derrubam a visita dele', async () => {
    const { deps } = criar()
    for (let i = 0; i < 121; i++) await route(deps, pedir())
    expect((await route(deps, pedir({ acao: null }))).status).toBe(200)
  })

  it('30 visitas do mesmo IP não derrubam o pulso dele', async () => {
    const { deps } = criar()
    for (let i = 0; i < 31; i++) await route(deps, pedir({ acao: null }))
    expect((await route(deps, pedir({ acao: null }))).status).toBe(429)
    expect((await route(deps, pedir())).status).toBe(200)
  })
})

describe('o preflight da `visit`', () => {
  it('traz `Access-Control-Max-Age`, com o CORS do dono, sem log nem RPC', async () => {
    for (const acao of ['ping', null]) {
      const { supabase, deps, logs } = criar()
      const res = await route(deps, pedir({ acao, metodo: 'OPTIONS' }))
      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(Number(res.headers.get('Access-Control-Max-Age'))).toBeGreaterThanOrEqual(600)
      expect(logs).toEqual([])
      expect(supabase.rpcs).toEqual([])
    }
  })
})
