import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { createRateLimiter, type RateLimiter } from '../../_shared/rateLimit.ts'
import { createFakeSupabase, type FakeSupabase } from '../../_shared/testing/fakes.ts'
import { createClockCache, route, type Deps } from '../handlers.ts'

/**
 * A function `visit` (feature `71`) — `VIS-14`, `VIS-21`, `VIS-23`, `VIS-27`, `VIS-29`.
 *
 * Os portões, na ordem do `design.md` (C10): preflight · método · teto por IP · corpo · relógio ·
 * robô · origem · gravação. O que estes casos protegem, em ordem de custo:
 *
 * 1. **Nada é gravado fora do caminho feliz.** Cada recusa prova que `record_store_visit` não foi
 *    chamada — não pela resposta, que poderia mentir, mas pela lista de RPCs que o dublê registra.
 * 2. **O dia vem do banco.** O handler nunca calcula `dia`, `ate` nem `agora` de gravação: repassa o
 *    que a RPC devolveu, e o teste compara o JSON inteiro.
 * 3. **O log não identifica ninguém.** Cada linha é varrida procurando o id, o IP e o user agent do
 *    caso. E **toda** requisição deste arquivo é montada com um `headers.get('authorization')` que
 *    LANÇA — o handler que passar a ler o cabeçalho quebra todos os casos de uma vez.
 */

const ID = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c'
const IP = '203.0.113.7'
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const ORIGEM_PROD = 'https://umaestrelinha.com.br'

const AGORA_EDGE = 1_792_681_200_000 // 2026-10-22T15:00:00Z
const RELOGIO = {
  dia: '2026-10-22',
  ate: 1_792_724_400_000, // 2026-10-23T03:00:00Z — a próxima 00:00 de Brasília
  agora: 1_792_681_199_000, // o instante do banco, 1 s antes do da edge
  production_host: 'umaestrelinha.com.br',
}

const criarRelogio = () => {
  let t = AGORA_EDGE
  return { now: () => t, avancar: (ms: number) => (t += ms) }
}

type Linha = Record<string, unknown>

const criar = (
  opcoes: {
    clock?: { data?: unknown; error?: unknown }
    record?: { data?: unknown; error?: unknown }
    limiter?: RateLimiter
    relogio?: ReturnType<typeof criarRelogio>
  } = {},
) => {
  const supabase: FakeSupabase = createFakeSupabase({
    rpcByFn: {
      store_clock: opcoes.clock ?? { data: RELOGIO },
      record_store_visit: opcoes.record ?? {
        data: { desfecho: 'gravada', dia: RELOGIO.dia, ate: RELOGIO.ate, agora: RELOGIO.agora },
      },
    },
  })
  const relogio = opcoes.relogio ?? criarRelogio()
  const logs: Linha[] = []
  const deps: Deps = {
    supabase: supabase.client,
    now: relogio.now,
    limiter: opcoes.limiter ?? createRateLimiter(30, 60_000, relogio.now),
    clock: createClockCache(),
    log: (linha) => logs.push(linha),
  }
  return { supabase, deps, logs, relogio }
}

/**
 * Uma requisição cujo `headers.get('authorization')` LANÇA (`VIS-29`: o handler não lê o
 * cabeçalho). Todo caso deste arquivo passa por aqui.
 */
const pedir = (
  opcoes: {
    metodo?: string
    corpo?: unknown
    corpoCru?: string
    origem?: string | null
    ua?: string | null
    ip?: string | null
  } = {},
): Request => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const origem = opcoes.origem === undefined ? ORIGEM_PROD : opcoes.origem
  if (origem !== null) headers.set('Origin', origem)
  const ua = opcoes.ua === undefined ? UA_IPHONE : opcoes.ua
  if (ua !== null) headers.set('User-Agent', ua)
  const ip = opcoes.ip === undefined ? IP : opcoes.ip
  if (ip !== null) headers.set('x-forwarded-for', `${ip}, 70.41.3.18`)
  headers.set('Authorization', 'Bearer sessao-da-cliente')

  const metodo = opcoes.metodo ?? 'POST'
  const temCorpo = metodo !== 'GET' && metodo !== 'HEAD' && metodo !== 'OPTIONS'
  const req = new Request('https://x.test/functions/v1/visit', {
    method: metodo,
    headers,
    body: temCorpo ? (opcoes.corpoCru ?? JSON.stringify(opcoes.corpo ?? { id: ID })) : undefined,
  })
  const vigiados = new Proxy(req.headers, {
    get(alvo, prop) {
      if (prop === 'get') {
        return (nome: string) => {
          if (nome.toLowerCase() === 'authorization') {
            throw new Error('o handler da visita não pode ler Authorization')
          }
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

const gravacoes = (s: FakeSupabase) => s.rpcs.filter((r) => r.fn === 'record_store_visit')
const leituras = (s: FakeSupabase) => s.rpcs.filter((r) => r.fn === 'store_clock')

const DESFECHOS = ['gravada', 'repetida', 'robô', 'interno', 'inválido', 'limite', 'teto', 'erro']

/** Uma linha de log por resposta, com um dos oito desfechos, e sem id, IP nem user agent. */
const conferirLog = (logs: Linha[], desfecho: string, extras: string[] = []) => {
  expect(logs).toHaveLength(1)
  expect(logs[0].fn).toBe('visit')
  expect(logs[0].desfecho).toBe(desfecho)
  expect(DESFECHOS).toContain(logs[0].desfecho)
  const texto = JSON.stringify(logs)
  for (const segredo of [ID, IP, UA_IPHONE, ...extras]) expect(texto).not.toContain(segredo)
}

// -------------------------------------------------------------------------------------------
// Portões 0a e 0b — preflight e método
// -------------------------------------------------------------------------------------------

describe('VIS-29 — preflight e método', () => {
  it('OPTIONS ⇒ preflight com CORS, sem log e sem RPC', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ metodo: 'OPTIONS' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(await res.text()).toBe('ok')
    expect(logs).toEqual([])
    expect(supabase.rpcs).toEqual([])
  })

  it.each(['GET', 'PUT', 'DELETE'])('%s ⇒ 405, log `inválido`, nenhuma RPC', async (metodo) => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ metodo }))

    expect(res.status).toBe(405)
    expect(supabase.rpcs).toEqual([])
    conferirLog(logs, 'inválido')
  })
})

// -------------------------------------------------------------------------------------------
// Portão 1 — o teto por IP
// -------------------------------------------------------------------------------------------

describe('VIS-27 — 30 gravações por minuto por IP', () => {
  it('a 31ª chamada do mesmo IP no minuto ⇒ 429 { dia, ate, agora }, sem gravar', async () => {
    const { supabase, deps, logs } = criar()
    for (let i = 0; i < 30; i++) {
      const ok = await route(deps, pedir())
      expect(ok.status).toBe(200)
    }
    expect(gravacoes(supabase)).toHaveLength(30)
    logs.length = 0

    const res = await route(deps, pedir())

    expect(res.status).toBe(429)
    // O relógio vem do cache (alimentado pelas 30 anteriores): dia e prazo do banco, e o `agora`
    // é o instante desta resposta — com o `agora` do cache, o navegador mediria a duração até a
    // meia-noite a partir de um instante velho e seguraria o marcador além da virada.
    expect(await res.json()).toEqual({ dia: RELOGIO.dia, ate: RELOGIO.ate, agora: AGORA_EDGE })
    expect(gravacoes(supabase)).toHaveLength(30)
    conferirLog(logs, 'limite')
  })

  it('o teto é por IP: outro IP no mesmo minuto continua gravando', async () => {
    const { supabase, deps } = criar()
    for (let i = 0; i < 30; i++) await route(deps, pedir())

    const res = await route(deps, pedir({ ip: '198.51.100.4' }))

    expect(res.status).toBe(200)
    expect(gravacoes(supabase)).toHaveLength(31)
  })

  it('a janela passa: um minuto depois o mesmo IP volta a gravar', async () => {
    const { supabase, deps, relogio } = criar()
    for (let i = 0; i < 30; i++) await route(deps, pedir())
    relogio.avancar(60_001)

    const res = await route(deps, pedir())

    expect(res.status).toBe(200)
    expect(gravacoes(supabase)).toHaveLength(31)
  })

  it('SEM IP, a 31ª chamada ⇒ 200 — sem IP libera, nunca um balde único', async () => {
    const { supabase, deps } = criar()
    for (let i = 0; i < 31; i++) {
      const res = await route(deps, pedir({ ip: null }))
      expect(res.status).toBe(200)
    }
    expect(gravacoes(supabase)).toHaveLength(31)
  })

  it('sem relógio no cache, o 429 lê `store_clock` e responde com ele', async () => {
    const recusa: RateLimiter = { hit: () => false }
    const { supabase, deps, logs } = criar({ limiter: recusa })

    const res = await route(deps, pedir())

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ dia: RELOGIO.dia, ate: RELOGIO.ate, agora: RELOGIO.agora })
    expect(leituras(supabase)).toHaveLength(1)
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'limite')
  })

  it('`store_clock` falhando no 429 ⇒ 429 SEM relógio, e o desfecho continua `limite`', async () => {
    const recusa: RateLimiter = { hit: () => false }
    const { supabase, deps, logs } = criar({
      limiter: recusa,
      clock: { error: { code: '57014', message: 'canceling statement due to statement timeout' } },
    })

    const res = await route(deps, pedir())

    expect(res.status).toBe(429)
    const corpo = await res.json()
    expect(corpo).not.toHaveProperty('ate')
    expect(corpo).not.toHaveProperty('agora')
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'limite')
  })

  it('o limitador vem ANTES do corpo: um corpo inválido no teto ainda é `limite`', async () => {
    const recusa: RateLimiter = { hit: () => false }
    const { deps, logs } = criar({ limiter: recusa })

    const res = await route(deps, pedir({ corpoCru: '{não é json' }))

    expect(res.status).toBe(429)
    conferirLog(logs, 'limite')
  })
})

// -------------------------------------------------------------------------------------------
// Portão 2 — o corpo
// -------------------------------------------------------------------------------------------

describe('VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado', () => {
  const casos: Array<[string, { corpo?: unknown; corpoCru?: string }]> = [
    ['JSON inválido', { corpoCru: '{"id": ' }],
    ['corpo vazio', { corpoCru: '' }],
    ['corpo que é texto JSON, não objeto', { corpo: ID }],
    ['corpo que é lista', { corpo: [ID] }],
    ['corpo `null`', { corpoCru: 'null' }],
    ['sem `id`', { corpo: {} }],
    ['`id` numérico', { corpo: { id: 42 } }],
    ['`id` que não é UUID', { corpo: { id: 'abc' } }],
    ['`id` UUID v1', { corpo: { id: '3f2b8c1e-9a4d-1b7e-8c21-5d6e7f8a9b0c' } }],
    ['`id` com espaço', { corpo: { id: ` ${ID}` } }],
    ['chave extra `force`', { corpo: { id: ID, force: true } }],
    ['chave extra `day`', { corpo: { id: ID, day: '2026-10-01' } }],
    ['chave extra `dia`', { corpo: { id: ID, dia: '2026-10-01' } }],
    ['chave extra `p_agora`', { corpo: { id: ID, p_agora: '2999-01-01T00:00:00Z' } }],
    ['chave extra `visitor_id`', { corpo: { id: ID, visitor_id: ID } }],
  ]

  it.each(casos)('%s', async (_nome, corpo) => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir(corpo))

    expect(res.status).toBe(400)
    expect(supabase.rpcs).toEqual([])
    conferirLog(logs, 'inválido')
  })

  it('UUID v4 em MAIÚSCULAS é aceito, e o id vai à RPC como chegou', async () => {
    const maiusculo = ID.toUpperCase()
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ corpo: { id: maiusculo } }))

    expect(res.status).toBe(200)
    expect(gravacoes(supabase)).toEqual([{ fn: 'record_store_visit', args: { p_id: maiusculo } }])
    conferirLog(logs, 'gravada', [maiusculo])
  })
})

// -------------------------------------------------------------------------------------------
// Portões 3 a 5 — relógio, robô e origem
// -------------------------------------------------------------------------------------------

describe('portão 3 — o relógio do banco', () => {
  it('`store_clock` falha ⇒ 500, `erro`, nada gravado', async () => {
    const { supabase, deps, logs } = criar({ clock: { error: { code: '08006', message: 'down' } } })
    const res = await route(deps, pedir())

    expect(res.status).toBe(500)
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'erro')
  })

  it('`store_clock` com forma errada (prazo não numérico) ⇒ 500, `erro`, nada gravado', async () => {
    const { supabase, deps, logs } = criar({ clock: { data: { ...RELOGIO, ate: '1792724400000' } } })
    const res = await route(deps, pedir())

    expect(res.status).toBe(500)
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'erro')
  })

  it('`store_clock` é lido a CADA requisição, sem argumento (o host nunca vem de cache)', async () => {
    const { supabase, deps } = criar()
    await route(deps, pedir())
    await route(deps, pedir())

    expect(leituras(supabase)).toHaveLength(2)
    for (const r of leituras(supabase)) expect(Object.keys(r.args ?? {})).toEqual([])
  })
})

describe('VIS-23 — robô e origem ⇒ 200, sem gravar', () => {
  const corpoDoRelogio = { dia: RELOGIO.dia, ate: RELOGIO.ate, agora: RELOGIO.agora }

  it.each([
    ['HeadlessChrome', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36'],
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)'],
  ])('user agent %s ⇒ `robô`', async (_nome, ua) => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ ua }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ desfecho: 'robô', ...corpoDoRelogio })
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'robô', [ua])
  })

  it('sem `Origin` ⇒ `interno`', async () => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ origem: null }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ desfecho: 'interno', ...corpoDoRelogio })
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'interno')
  })

  it.each(['null', 'not a url', ''])('`Origin` ilegível (%j) ⇒ `interno`', async (origem) => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ origem }))

    expect(res.status).toBe(200)
    expect((await res.json()).desfecho).toBe('interno')
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'interno')
  })

  it.each([
    'https://umaestrelinha-store-five.vercel.app',
    'http://localhost:8082',
    'https://umaestrelinha.com.br.exemplo.invalid',
  ])('origem de homologação %s ⇒ `interno`', async (origem) => {
    const { supabase, deps, logs } = criar()
    const res = await route(deps, pedir({ origem }))

    expect(res.status).toBe(200)
    expect((await res.json()).desfecho).toBe('interno')
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'interno')
  })

  it('o host de produção vem de `store_clock`: o MESMO localhost grava quando o banco diz `localhost`', async () => {
    // O par do caso acima. Sem ele, um handler com o host escrito no código passaria nos dois.
    const { supabase, deps } = criar({ clock: { data: { ...RELOGIO, production_host: 'localhost' } } })
    const res = await route(deps, pedir({ origem: 'http://localhost:8082' }))

    expect(res.status).toBe(200)
    expect((await res.json()).desfecho).toBe('gravada')
    expect(gravacoes(supabase)).toHaveLength(1)
  })

  it('`production_host` vazio ⇒ tudo é `interno`, inclusive a origem de produção', async () => {
    const { supabase, deps, logs } = criar({ clock: { data: { ...RELOGIO, production_host: '' } } })
    const res = await route(deps, pedir())

    expect((await res.json()).desfecho).toBe('interno')
    expect(gravacoes(supabase)).toEqual([])
    conferirLog(logs, 'interno')
  })

  it('o `www.` da origem casa o host de produção (a régua é `trafficType`)', async () => {
    const { supabase, deps } = criar()
    const res = await route(deps, pedir({ origem: 'https://www.umaestrelinha.com.br' }))

    expect((await res.json()).desfecho).toBe('gravada')
    expect(gravacoes(supabase)).toHaveLength(1)
  })

  it('robô vem ANTES da origem: robô sem `Origin` é `robô`, não `interno`', async () => {
    const { deps, logs } = criar()
    const ua = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
    await route(deps, pedir({ ua, origem: null }))
    conferirLog(logs, 'robô', [ua])
  })
})

// -------------------------------------------------------------------------------------------
// Portão 6 — a gravação
// -------------------------------------------------------------------------------------------

describe('VIS-14 — a gravação', () => {
  it('chama `record_store_visit` com as chaves EXATAS `{ p_id }` — nunca `p_agora`', async () => {
    const { supabase, deps } = criar()
    await route(deps, pedir())

    expect(gravacoes(supabase)).toHaveLength(1)
    expect(Object.keys(gravacoes(supabase)[0].args)).toEqual(['p_id'])
    expect(gravacoes(supabase)[0].args.p_id).toBe(ID)
  })

  it.each(['gravada', 'repetida', 'teto'])(
    'desfecho `%s` é repassado com o dia e o prazo DO BANCO',
    async (desfecho) => {
      const doBanco = { desfecho, dia: '2026-10-22', ate: 1_792_724_400_000, agora: 1_792_681_200_123 }
      const { deps, logs } = criar({ record: { data: doBanco } })
      const res = await route(deps, pedir())

      expect(res.status).toBe(200)
      // O JSON inteiro: `ate` e `agora` saem inteiros, como o banco os devolveu.
      expect(await res.clone().text()).toBe(JSON.stringify(doBanco))
      expect(await res.json()).toEqual(doBanco)
      conferirLog(logs, desfecho)
    },
  )

  it('`record_store_visit` falha ⇒ 500, `erro`', async () => {
    const { deps, logs } = criar({ record: { error: { code: '42501', message: 'permission denied' } } })
    const res = await route(deps, pedir())

    expect(res.status).toBe(500)
    conferirLog(logs, 'erro')
  })

  it('`record_store_visit` com desfecho fora do contrato ⇒ 500, `erro` (nunca repassa)', async () => {
    const { deps, logs } = criar({
      record: { data: { desfecho: 'apagada', dia: RELOGIO.dia, ate: RELOGIO.ate, agora: RELOGIO.agora } },
    })
    const res = await route(deps, pedir())

    expect(res.status).toBe(500)
    conferirLog(logs, 'erro')
  })
})

// -------------------------------------------------------------------------------------------
// VIS-29 — o log e o cabeçalho de autorização
// -------------------------------------------------------------------------------------------

describe('VIS-29 — o handler não lê Authorization', () => {
  it('sensor: a requisição do arquivo LANÇA ao ler Authorization', () => {
    // Sem este par, um Proxy que não interceptasse nada faria o arquivo inteiro passar sem provar a
    // ausência da leitura.
    const req = pedir()
    expect(() => req.headers.get('authorization')).toThrow(/não pode ler Authorization/)
    expect(() => req.headers.get('Authorization')).toThrow(/não pode ler Authorization/)
    expect(req.headers.get('origin')).toBe(ORIGEM_PROD)
  })
})

describe('o ClockCache', () => {
  it('nasce vazio, guarda até o próprio `ate`, e cada instância é independente', () => {
    const a = createClockCache()
    const b = createClockCache()
    const relogio = { dia: '2026-10-22', ate: 1_000, agora: 500 }

    expect(a.get(0)).toBeNull()
    a.set(relogio)
    expect(a.get(999)).toEqual(relogio)
    expect(a.get(1_000)).toBeNull()
    expect(b.get(999)).toBeNull()
  })

  it('não vaza entre casos: com um cache novo, o 429 volta a ler `store_clock`', async () => {
    const recusa: RateLimiter = { hit: () => false }
    const primeiro = criar({ limiter: recusa })
    await route(primeiro.deps, pedir())
    const segundo = criar({ limiter: recusa })
    await route(segundo.deps, pedir())

    expect(leituras(primeiro.supabase)).toHaveLength(1)
    expect(leituras(segundo.supabase)).toHaveLength(1)
  })
})

// -------------------------------------------------------------------------------------------
// VIS-29 — a configuração do gateway (conserto G1 da verificação r1)
// -------------------------------------------------------------------------------------------

describe('VIS-29 — `[functions.visit]` com `verify_jwt = false` no `config.toml`', () => {
  // A loja chama com SÓ a chave publicável (`sb_publishable_…`, que não é JWT). Com `true`, o gateway
  // recusaria a chamada antes do handler: zero visitas para sempre, sem erro em lugar nenhum, e com
  // todas as outras suítes verdes — este arquivo nunca chega ao gateway. Molde: a régua da
  // `checkout` (`checkout/__tests__/identify.test.ts`).
  const HERE = dirname(fileURLToPath(import.meta.url))
  const config = readFileSync(resolve(HERE, '../../../config.toml'), 'utf8').replace(/\r\n/g, '\n')
  const regua = (texto: string) => /\[functions\.visit\]\s*\nverify_jwt = false/.test(texto)

  /** Muta o texto real; lança quando o alvo some, para o sensor não virar no-op em silêncio. */
  const mutar = (de: string, para: string) => {
    if (!config.includes(de)) throw new Error(`mutar: alvo ausente — ${de}`)
    return config.replace(de, para)
  }

  it('a leitura achou o `config.toml` e a seção da function — âncora', () => {
    expect(config.length).toBeGreaterThan(1000)
    expect(config).toContain('[functions.checkout]')
    expect(config.match(/^\[functions\.visit\]$/gm)).toHaveLength(1)
  })

  it('`verify_jwt` é `false` na seção `[functions.visit]`', () => {
    expect(regua(config)).toBe(true)
  })

  it('sensor: `verify_jwt = true` na seção reprova a régua', () => {
    expect(regua(mutar('[functions.visit]\nverify_jwt = false', '[functions.visit]\nverify_jwt = true'))).toBe(false)
  })

  it('sensor: a seção sem a linha (o padrão do CLI é `true`) reprova a régua', () => {
    expect(regua(mutar('[functions.visit]\nverify_jwt = false\n', '[functions.visit]\n'))).toBe(false)
  })

  it('sensor inverso: o `false` de OUTRA function não satisfaz a régua da `visit`', () => {
    const semVisit = mutar('[functions.visit]\nverify_jwt = false', '[functions.outra]\nverify_jwt = false')
    expect(semVisit).toContain('[functions.checkout]\nverify_jwt = false')
    expect(regua(semVisit)).toBe(false)
  })
})
