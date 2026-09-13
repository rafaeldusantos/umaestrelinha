import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { createFakeSupabase, type FakeSupabase } from '../../_shared/testing/fakes.ts'
import {
  IDENTIFY_MAX,
  IDENTIFY_WINDOW_MS,
  clientIp,
  createRateLimiter,
  route,
  type Deps,
} from '../handlers.ts'

/**
 * `IDN-01`/`IDN-09` — a ação que responde "este e-mail já tem conta?".
 *
 * O que estes casos protegem, em ordem de custo:
 *
 * 1. **`account_exists` é a única fonte.** Se a ação passar a consultar `auth.users` direto, ou a
 *    derivar a resposta de `orders`, a pergunta ganha um segundo dono — e um pedido de convidada
 *    antigo faria a loja desafiar alguém que nunca criou conta.
 * 2. **O teto existe e não é global.** Sem IP, libera: todo mundo no mesmo balde faria um visitante
 *    esgotar o teto da loja inteira.
 * 3. **O log não carrega o e-mail.** Um log desta ação é um índice de quem comprou aqui.
 */

const AGORA_BASE = 1_789_300_800_000 // 2026-09-13T12:00:00Z

/** Relógio controlável — sem ele o teto por IP só seria testável dormindo. */
const criarRelogio = () => {
  let t = AGORA_BASE
  return { now: () => t, avancar: (ms: number) => (t += ms) }
}

const criarDeps = (
  supabase: FakeSupabase,
  relogio = criarRelogio(),
  max = IDENTIFY_MAX,
): Deps => ({
  supabase: supabase.client,
  now: relogio.now,
  limiter: createRateLimiter(max, IDENTIFY_WINDOW_MS, relogio.now),
})

const pedir = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.test/functions/v1/checkout?action=identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

describe('identify — a resposta', () => {
  it('responde `registered: true` quando `account_exists` diz que sim', async () => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: true } } })
    const res = await route(criarDeps(supabase), pedir({ email: 'marina@exemplo.com' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ registered: true })
  })

  it('responde `registered: false` quando `account_exists` diz que não', async () => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: false } } })
    const res = await route(criarDeps(supabase), pedir({ email: 'nova@exemplo.com' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ registered: false })
  })

  it('pergunta a `account_exists`, e com o e-mail NORMALIZADO', async () => {
    // O par com a migration: lá a comparação é `lower()` nos dois lados. Aqui a chave já chega
    // canônica, para que a tela e o servidor perguntem exatamente a mesma coisa.
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: true } } })
    await route(criarDeps(supabase), pedir({ email: '  Marina@Exemplo.COM  ' }))

    expect(supabase.rpcs).toEqual([
      { fn: 'account_exists', args: { p_email: 'marina@exemplo.com' } },
    ])
  })

  it('um valor que não é `true` nunca vira "tem conta"', async () => {
    // A RPC devolvendo `null` (erro engolido, coluna renomeada) não pode ser lida como sim: isso
    // desafiaria toda cliente nova, e ninguém compraria.
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: null } } })
    const res = await route(criarDeps(supabase), pedir({ email: 'nova@exemplo.com' }))

    expect(await res.json()).toEqual({ registered: false })
  })
})

describe('identify — entrada inválida não consulta o banco', () => {
  it.each([
    ['vazio', ''],
    ['sem arroba', 'marina.exemplo.com'],
    ['sem domínio', 'marina@'],
    ['sem ponto', 'marina@exemplo'],
    ['ausente', undefined],
  ])('%s responde 400 sem chamar a RPC', async (_rotulo, email) => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: true } } })
    const res = await route(criarDeps(supabase), pedir({ email }))

    expect(res.status).toBe(400)
    // A asserção que importa: **zero** consulta. Só o status deixaria passar uma versão que
    // pergunta ao banco e depois recusa.
    expect(supabase.rpcs).toEqual([])
  })
})

describe('identify — a falha da RPC não vira "não tem conta"', () => {
  it('erro da RPC responde 502, e não `registered: false`', async () => {
    // `registered: false` num erro faria a tela seguir como convidada e o `create-order` recusar
    // depois — a cliente preencheria a compra inteira para ouvir "não" no fim.
    const supabase = createFakeSupabase({
      rpcByFn: { account_exists: { error: { message: 'boom' } } },
    })
    const res = await route(criarDeps(supabase), pedir({ email: 'marina@exemplo.com' }))

    expect(res.status).toBe(502)
    expect(await res.json()).not.toHaveProperty('registered')
  })
})

describe('identify — o teto por IP (IDN-09)', () => {
  const comIp = (ip: string) => ({ 'x-forwarded-for': ip })

  it(`deixa passar ${IDENTIFY_MAX} e recusa a seguinte, do mesmo IP`, async () => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: false } } })
    const deps = criarDeps(supabase)

    for (let i = 0; i < IDENTIFY_MAX; i++) {
      const res = await route(deps, pedir({ email: `a${i}@exemplo.com` }, comIp('203.0.113.7')))
      expect(res.status).toBe(200)
    }

    const excedente = await route(deps, pedir({ email: 'x@exemplo.com' }, comIp('203.0.113.7')))
    expect(excedente.status).toBe(429)
  })

  it('o teto é POR IP — outro IP não paga a conta do primeiro', async () => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: false } } })
    const deps = criarDeps(supabase, criarRelogio(), 2)

    await route(deps, pedir({ email: 'a@exemplo.com' }, comIp('203.0.113.7')))
    await route(deps, pedir({ email: 'b@exemplo.com' }, comIp('203.0.113.7')))
    const terceira = await route(deps, pedir({ email: 'c@exemplo.com' }, comIp('203.0.113.7')))
    const outroIp = await route(deps, pedir({ email: 'd@exemplo.com' }, comIp('198.51.100.4')))

    expect(terceira.status).toBe(429)
    expect(outroIp.status).toBe(200)
  })

  it('a janela desliza — passados 5 minutos, o mesmo IP volta a perguntar', async () => {
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: false } } })
    const relogio = criarRelogio()
    const deps = criarDeps(supabase, relogio, 1)

    await route(deps, pedir({ email: 'a@exemplo.com' }, comIp('203.0.113.7')))
    const bloqueada = await route(deps, pedir({ email: 'b@exemplo.com' }, comIp('203.0.113.7')))
    relogio.avancar(IDENTIFY_WINDOW_MS + 1)
    const liberada = await route(deps, pedir({ email: 'c@exemplo.com' }, comIp('203.0.113.7')))

    expect(bloqueada.status).toBe(429)
    expect(liberada.status).toBe(200)
  })

  it('sem IP identificável, LIBERA — um balde comum puniria a loja inteira', async () => {
    // Decisão declarada: a fronteira de segurança é a recusa de `create-order`, não este teto.
    // Um throttle compartilhado por todos faria um visitante esgotar o limite de todo mundo.
    const supabase = createFakeSupabase({ rpcByFn: { account_exists: { data: false } } })
    const deps = criarDeps(supabase, criarRelogio(), 1)

    await route(deps, pedir({ email: 'a@exemplo.com' }))
    const segunda = await route(deps, pedir({ email: 'b@exemplo.com' }))

    expect(segunda.status).toBe(200)
  })

  it('o IP sai do primeiro valor de `x-forwarded-for`, com `cf-connecting-ip` de recuo', () => {
    expect(clientIp(pedir({}, { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7')
    expect(clientIp(pedir({}, { 'cf-connecting-ip': '198.51.100.4' }))).toBe('198.51.100.4')
    expect(clientIp(pedir({}))).toBeNull()
    expect(clientIp(pedir({}, { 'x-forwarded-for': '   ' }))).toBeNull()
  })
})

describe('checkout — roteamento', () => {
  it('OPTIONS responde o preflight com os headers de CORS', async () => {
    const supabase = createFakeSupabase()
    const res = await route(
      criarDeps(supabase),
      new Request('https://x.test/functions/v1/checkout', { method: 'OPTIONS' }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('action desconhecida responde 400 e nomeia as válidas', async () => {
    const supabase = createFakeSupabase()
    const res = await route(
      criarDeps(supabase),
      new Request('https://x.test/functions/v1/checkout?action=inventada', { method: 'POST' }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('identify')
  })

  it('corpo que não é JSON não derruba a function', async () => {
    const supabase = createFakeSupabase()
    const res = await route(
      criarDeps(supabase),
      new Request('https://x.test/functions/v1/checkout?action=identify', {
        method: 'POST',
        body: 'isto não é json',
      }),
    )

    // Cai na validação de e-mail, não num 500 — corpo malformado é entrada inválida, não erro.
    expect(res.status).toBe(400)
  })
})

describe('checkout — a configuração da function', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const config = readFileSync(resolve(HERE, '../../../config.toml'), 'utf8')

  it('a varredura leu o `config.toml` — âncora', () => {
    // Sem âncora, um caminho errado leria string vazia e a asserção abaixo passaria sobre o nada.
    expect(config).toContain('[functions.mercado-pago]')
    expect(config.length).toBeGreaterThan(1000)
  })

  it('`verify_jwt` é `false` — a convidada não tem JWT nenhum', () => {
    // Com `true`, o gateway recusaria a chamada ANTES do handler, e o checkout sem conta pararia
    // de existir em produção com os testes todos verdes.
    expect(config).toMatch(/\[functions\.checkout\]\s*\nverify_jwt = false/)
  })
})
