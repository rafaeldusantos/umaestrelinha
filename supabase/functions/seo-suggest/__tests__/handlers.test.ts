import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { createRateLimiter } from '../../_shared/rateLimit.ts'
import type { ClaudeJson, ClaudeJsonRequest, ClaudeJsonResult } from '../../_shared/claudePort.ts'
import { type Deps, RETRY_MIN_REMAINING_MS, SUGGEST_BUDGET_MS, route } from '../handlers.ts'
import { SEO_SCHEMA, buildSeoPrompt } from '../prompt.ts'

// Feature 84 (T08) — a porta `seo-suggest`.
//
// Toda recusa antes do modelo assere DUAS coisas: o status e que a porta do Claude NÃO foi chamada —
// com um dublê que LANÇA se for chamado. Sem a segunda metade, um handler que checasse o papel
// depois de chamar o modelo passaria em todos os testes de status (e teria gastado a chave).

const ADRI = '11111111-1111-4111-8111-111111111111'
const ANA = '22222222-2222-4222-8222-222222222222'
const PROD = '33333333-3333-4333-8333-333333333333'
const REL = '44444444-4444-4444-8444-444444444444'
const CAT = '55555555-5555-4555-8555-555555555555'

const NOME = 'Pingente Estrela Guia'
const DESCRICAO_TEXTO = 'Pingente em resina feito a mao com delicadeza singular'

const corpo = (extra: Record<string, unknown> = {}) => ({
  productId: PROD,
  name: NOME,
  description: `<p>${DESCRICAO_TEXTO}</p>`,
  categoryIds: [CAT],
  relatedIds: [REL],
  requiresMaterial: false,
  ...extra,
})

const req = (body: unknown = corpo(), init: RequestInit = {}) =>
  new Request('http://local/seo-suggest', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-da-adri', 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })

const USO = { input: 1000, output: 60 }
const BOA = {
  title: 'Pingente Estrela em resina',
  description:
    'Pingente em resina feito à mão, com a delicadeza de uma lembrança que acompanha você todos os dias. Peça personalizada. Envio para todo o Brasil.',
}
const ok = (json: unknown = BOA): ClaudeJsonResult => ({ kind: 'ok', json, usage: USO })

/** Uma porta do Claude que responde em fila e registra cada pedido. */
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

/** A porta que NÃO pode ser chamada. Conta e lança. */
function portaProibida() {
  const chamadas: ClaudeJsonRequest[] = []
  const fn: ClaudeJson = async (r) => {
    chamadas.push(r)
    throw new Error('a porta do Claude foi chamada num caminho de recusa')
  }
  return { fn, chamadas }
}

const LINHA_REL = {
  id: REL,
  name: 'Anel Lua',
  seo_title: 'Anel Lua em resina',
  seo_description: 'Um anel delicado feito à mão.',
}

const comoAdmin = (extra: Parameters<typeof createFakeSupabase>[0] = {}) =>
  createFakeSupabase({
    user: { id: ADRI },
    rpcByFn: { has_role: { data: true } },
    lists: {
      categories: [{ id: CAT, name: 'Pingentes' }],
      products: (_e, _s, read) => (read.in.some(([c]) => c === 'id') ? [LINHA_REL] : []),
    },
    ...extra,
  })

const deps = (over: Partial<Deps> & { supabase: any }): Deps => ({
  claude: porta(ok()).fn,
  limiter: createRateLimiter(30, 600_000, () => 0),
  ...over,
})

let logs: string[] = []
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logs.push(a.map(String).join(' '))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const linhasDeLog = () =>
  logs.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)).filter((l) => l.fn === 'seo-suggest')

describe('seo-suggest — a porta (SIA-17)', () => {
  it('sem header ⇒ 401, sem chamar o modelo', async () => {
    const { client } = createFakeSupabase({ user: null })
    const p = portaProibida()
    const res = await route(deps({ supabase: client, claude: p.fn }), req(corpo(), { headers: {} }))
    expect(res.status).toBe(401)
    expect(p.chamadas).toEqual([])
  })

  it('conta sem papel admin ⇒ 403, sem chamar o modelo', async () => {
    const { client } = createFakeSupabase({ user: { id: ANA }, rpcByFn: { has_role: { data: false } } })
    const p = portaProibida()
    const res = await route(deps({ supabase: client, claude: p.fn }), req())
    expect(res.status).toBe(403)
    expect(p.chamadas).toEqual([])
  })

  it('has_role em erro ⇒ 403, sem chamar o modelo', async () => {
    const { client } = createFakeSupabase({ user: { id: ADRI }, rpcByFn: { has_role: { error: { message: 'x' } } } })
    const p = portaProibida()
    const res = await route(deps({ supabase: client, claude: p.fn }), req())
    expect(res.status).toBe(403)
    expect(p.chamadas).toEqual([])
  })

  it('OPTIONS ⇒ preflight; GET ⇒ 405', async () => {
    const { client } = comoAdmin()
    expect((await route(deps({ supabase: client }), new Request('http://local/x', { method: 'OPTIONS' }))).status).toBe(200)
    expect((await route(deps({ supabase: client }), new Request('http://local/x', { method: 'GET' }))).status).toBe(405)
  })
})

describe('seo-suggest — sem chave (SIA-20)', () => {
  it('claude: null ⇒ 503 not_configured, depois do admin e antes de qualquer leitura', async () => {
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: null }), req())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({ reason: 'not_configured' })
    expect(fake.rpcs.map((r) => r.fn)).toEqual(['has_role'])
    expect(fake.reads).toEqual([])
  })

  it('sem admin, a chave ausente não é revelada: 401 antes do 503', async () => {
    const { client } = createFakeSupabase({ user: null })
    const res = await route(deps({ supabase: client, claude: null }), req())
    expect(res.status).toBe(401)
  })
})

describe('seo-suggest — o teto por conta (SIA-18)', () => {
  it('a 31ª chamada da mesma conta em 10 min ⇒ 429 limited, sem chamar o modelo; outra conta passa', async () => {
    const limiter = createRateLimiter(30, 600_000, () => 0)
    for (let i = 0; i < 30; i++) expect(limiter.hit(ADRI)).toBe(true)

    const p = portaProibida()
    const fake = comoAdmin()
    const res = await route({ supabase: fake.client, claude: p.fn, limiter }, req())
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toEqual({ reason: 'limited' })
    expect(p.chamadas).toEqual([])
    expect(fake.reads).toEqual([])

    const outra = comoAdmin({ user: { id: ANA } })
    const resAna = await route({ supabase: outra.client, claude: porta(ok()).fn, limiter }, req())
    expect(resAna.status).toBe(200)
  })

  it('o teto da porta é 30 por 10 min (o limitador real, por conta)', async () => {
    const limiter = createRateLimiter(30, 600_000, () => 0)
    const fake = comoAdmin()
    for (let i = 0; i < 30; i++) {
      const r = await route({ supabase: fake.client, claude: porta(ok()).fn, limiter }, req())
      expect(r.status).toBe(200)
    }
    const p = portaProibida()
    expect((await route({ supabase: fake.client, claude: p.fn, limiter }, req())).status).toBe(429)
  })
})

describe('seo-suggest — corpo inválido (400)', () => {
  const muitos = (n: number) =>
    Array.from({ length: n }, (_, i) => `66666666-6666-4666-8666-${String(i).padStart(12, '0')}`)

  it.each([
    ['nome vazio', corpo({ name: '   ' })],
    ['nome > 200', corpo({ name: 'a'.repeat(201) })],
    ['> 20 relacionados', corpo({ relatedIds: muitos(21) })],
    ['> 10 categorias', corpo({ categoryIds: muitos(11) })],
    ['id não-uuid', corpo({ relatedIds: ['abc'] })],
    ['productId não-uuid', corpo({ productId: '1' })],
    ['JSON inválido', '{nome:'],
    ['requiresMaterial como string', corpo({ requiresMaterial: 'false' as unknown as boolean })],
  ])('%s ⇒ 400 bad_request, sem chamar o modelo', async (_r, body) => {
    const p = portaProibida()
    const fake = comoAdmin()
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req(body))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ reason: 'bad_request' })
    expect(p.chamadas).toEqual([])
  })

  it('nos limites (200, 20, 10) passa', async () => {
    const fake = comoAdmin()
    const res = await route(
      deps({ supabase: fake.client }),
      req(corpo({ name: 'a'.repeat(200), relatedIds: muitos(20), categoryIds: muitos(10) })),
    )
    expect(res.status).toBe(200)
  })

  it('produto ainda não salvo (productId null) passa', async () => {
    const fake = comoAdmin()
    expect((await route(deps({ supabase: fake.client }), req(corpo({ productId: null })))).status).toBe(200)
  })
})

describe('seo-suggest — o pedido ao modelo (SIA-13, L-039)', () => {
  it('o payload enviado à porta, campo a campo', async () => {
    const fake = comoAdmin()
    const p = porta(ok())
    await route(deps({ supabase: fake.client, claude: p.fn }), req())

    expect(p.chamadas).toHaveLength(1)
    const c = p.chamadas[0]
    expect(c.model).toBe('claude-haiku-5-5')
    expect(c.effort).toBe('medium')
    expect(c.maxTokens).toBe(4096)
    expect(c.schema).toBe(SEO_SCHEMA)
    expect(c.signal).toBeInstanceOf(AbortSignal)
    const esperado = buildSeoPrompt({
      name: NOME,
      description: `<p>${DESCRICAO_TEXTO}</p>`,
      categoryNames: ['Pingentes'],
      requiresMaterial: false,
      examples: [{ name: 'Anel Lua', title: 'Anel Lua em resina', description: 'Um anel delicado feito à mão.' }],
    })
    expect(c.system).toBe(esperado.system)
    expect(c.user).toBe(esperado.user)
    expect(Object.keys(c).sort()).toEqual(['effort', 'maxTokens', 'model', 'schema', 'signal', 'system', 'user'])
  })

  it('requiresMaterial do corpo chega ao prompt', async () => {
    const fake = comoAdmin()
    const p = porta(ok())
    await route(deps({ supabase: fake.client, claude: p.fn }), req(corpo({ requiresMaterial: true })))
    expect(p.chamadas[0].user).toContain('feita com material enviado pela cliente')
  })
})

describe('seo-suggest — a resposta (SIA-14, SIA-15)', () => {
  it('200 com o título SEM a marca e aparado, a descrição aparada, e o número de exemplos', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ title: '  Pingente Estrela em resina | Uma Estrelinha ', description: `  ${BOA.description}  ` }))
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      title: 'Pingente Estrela em resina',
      description: BOA.description,
      examples: 1,
    })
  })

  it('reprovada 1× e aprovada ⇒ 200 com 2 chamadas', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ title: 'Corra! Últimas unidades', description: BOA.description }), ok())
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(200)
    expect(p.chamadas).toHaveLength(2)
  })

  it('reprovada 2× ⇒ 422 off_rules', async () => {
    const fake = comoAdmin()
    const ruim = ok({ title: 'Anel Lua em resina', description: BOA.description }) // igual ao exemplo
    const p = porta(ruim, ruim)
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'off_rules' })
    expect(p.chamadas).toHaveLength(2)
  })

  it('invalid conta como reprovada (invalid, depois ok ⇒ 200; invalid 2× ⇒ off_rules)', async () => {
    const fake = comoAdmin()
    const inv: ClaudeJsonResult = { kind: 'invalid', usage: USO }
    expect((await route(deps({ supabase: fake.client, claude: porta(inv, ok()).fn }), req())).status).toBe(200)
    const res = await route(deps({ supabase: fake.client, claude: porta(inv, inv).fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'off_rules' })
  })

  it('JSON sem a forma (title não é string) conta como reprovada', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ title: 1, description: BOA.description }), ok({ titulo: 'x' }))
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    expect(p.chamadas).toHaveLength(2)
  })

  // A12 (decisão do usuário, 2026-10-27): substitui "material nomeado ⇒ reprovado". O mesmo corpo,
  // o veredito invertido: nomear o material com `requiresMaterial` passa na primeira.
  it('A12: material nomeado com requiresMaterial ⇒ 200 com UMA chamada', async () => {
    const fake = comoAdmin()
    const nomeia = ok({ title: 'Pingente com Cinzas de Cremação', description: BOA.description })
    const p = porta(nomeia)
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req(corpo({ requiresMaterial: true })))
    expect(res.status).toBe(200)
    expect(p.chamadas).toHaveLength(1)
  })

  it('A13: título igual ao nome do produto ⇒ retentativa; a 2ª boa ⇒ 200', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ title: NOME, description: BOA.description }), ok())
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(200)
    expect(p.chamadas).toHaveLength(2)
  })

  it('A13: título igual ao nome (com caixa e acento diferentes) 2× ⇒ 422 off_rules', async () => {
    const fake = comoAdmin()
    const igual = ok({ title: 'pingente estrêla GUIA', description: BOA.description })
    const p = porta(igual, igual)
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'off_rules' })
    expect(p.chamadas).toHaveLength(2)
  })

  it('A13: o nome que vale é o do CORPO (outro nome, o mesmo título ⇒ 200)', async () => {
    const fake = comoAdmin()
    const p = porta(ok({ title: NOME, description: BOA.description }))
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req(corpo({ name: 'Colar Lua Nova' })))
    expect(res.status).toBe(200)
    expect(p.chamadas).toHaveLength(1)
  })
})

describe('seo-suggest — falhas do modelo (SIA-22, SIA-23)', () => {
  it('refusal ⇒ 422 refusal com UMA chamada', async () => {
    const fake = comoAdmin()
    const p = porta({ kind: 'refusal', usage: USO })
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'refusal' })
    expect(p.chamadas).toHaveLength(1)
  })

  it('truncated ⇒ 422 truncated com UMA chamada', async () => {
    const fake = comoAdmin()
    const p = porta({ kind: 'truncated', usage: USO })
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'truncated' })
    expect(p.chamadas).toHaveLength(1)
  })

  it('upstream ⇒ 502 upstream', async () => {
    const fake = comoAdmin()
    const p = porta({ kind: 'upstream', status: 529 })
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req())
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({ reason: 'upstream' })
  })

  it('o prazo de 15 s aborta o signal e responde 502', async () => {
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
    await vi.advanceTimersByTimeAsync(SUGGEST_BUDGET_MS - 1)
    expect(sinal!.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(sinal!.aborted).toBe(true)
    const res = await pendente
    expect(SUGGEST_BUDGET_MS).toBe(15_000)
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({ reason: 'upstream' })
  })

  it('a 2ª tentativa NÃO acontece com menos de 5 s sobrando ⇒ off_rules com 1 chamada', async () => {
    let agora = 0
    const fake = comoAdmin()
    const p = porta(async () => {
      agora += SUGGEST_BUDGET_MS - RETRY_MIN_REMAINING_MS + 1 // sobram 4.999 ms
      return ok({ title: 'Corra', description: BOA.description })
    })
    const res = await route(deps({ supabase: fake.client, claude: p.fn, now: () => agora }), req())
    expect(RETRY_MIN_REMAINING_MS).toBe(5_000)
    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toEqual({ reason: 'off_rules' })
    expect(p.chamadas).toHaveLength(1)
  })

  it('com exatamente 5 s sobrando a 2ª tentativa acontece', async () => {
    let agora = 0
    const fake = comoAdmin()
    const p = porta(
      async () => {
        agora += SUGGEST_BUDGET_MS - RETRY_MIN_REMAINING_MS
        return ok({ title: 'Corra', description: BOA.description })
      },
      ok(),
    )
    const res = await route(deps({ supabase: fake.client, claude: p.fn, now: () => agora }), req())
    expect(res.status).toBe(200)
    expect(p.chamadas).toHaveLength(2)
  })

  it('erro de leitura do contexto não derruba a sugestão', async () => {
    const fake = comoAdmin({ listErrorByTable: { products: { message: 'x' }, categories: { message: 'y' } } })
    const res = await route(deps({ supabase: fake.client }), req())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ examples: 0 })
  })
})

describe('seo-suggest — o log (SIA-26)', () => {
  it('uma linha JSON com conta, resultado, exemplos, tentativas, tokens e duração — sem o texto do produto', async () => {
    let agora = 1_000
    const fake = comoAdmin()
    const p = porta(
      async () => {
        agora += 700
        return ok({ title: 'Corra', description: BOA.description })
      },
      async () => {
        agora += 500
        return { kind: 'ok', json: BOA, usage: { input: 900, output: 40 } }
      },
    )
    await route(deps({ supabase: fake.client, claude: p.fn, now: () => agora }), req())

    const linhas = linhasDeLog()
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      fn: 'seo-suggest',
      userId: ADRI,
      result: 'ok',
      examples: 1,
      attempts: 2,
      inputTokens: 1900,
      outputTokens: 100,
      ms: 1200,
    })
    const todas = logs.join('\n')
    expect(todas).not.toContain(NOME)
    expect(todas).not.toContain('Pingente Estrela')
    expect(todas).not.toContain(DESCRICAO_TEXTO)
    expect(todas).not.toContain(BOA.description)
  })

  // Conserto r1 do Verifier (V40): o corte da descrição acima de 4.000 é DECLARADO no log, e a
  // descrição curta declara o contrário — senão `descriptionCut` sumir do log passaria.
  it('descrição com mais de 4.000 caracteres de texto ⇒ a linha declara `descriptionCut: true`', async () => {
    const longa = `<p>${'pingente feito a mao '.repeat(250)}</p>` // 5.250 de texto
    const fake = comoAdmin()
    const p = porta(ok())
    const res = await route(deps({ supabase: fake.client, claude: p.fn }), req(corpo({ description: longa })))
    expect(res.status).toBe(200)
    const linhas = linhasDeLog()
    expect(linhas).toHaveLength(1)
    expect(linhas[0].descriptionCut).toBe(true)
    // o par: o prompt de fato foi cortado (o log diz a verdade sobre o que foi enviado)
    expect(p.chamadas[0].user).not.toContain('pingente feito a mao '.repeat(250).trim())
  })

  it('descrição curta ⇒ a linha declara `descriptionCut: false`', async () => {
    const fake = comoAdmin()
    await route(deps({ supabase: fake.client }), req())
    const linhas = linhasDeLog()
    expect(linhas).toHaveLength(1)
    expect(linhas[0].descriptionCut).toBe(false)
  })

  it.each([
    ['limited', 429],
    ['not_configured', 503],
    ['upstream', 502],
    ['refusal', 422],
  ])('o resultado %s também vira uma linha', async (result, status) => {
    const fake = comoAdmin()
    const limiter = createRateLimiter(result === 'limited' ? 0 : 30, 600_000, () => 0)
    const claude =
      result === 'not_configured'
        ? null
        : porta(result === 'upstream' ? { kind: 'upstream', status: 500 } : { kind: 'refusal', usage: USO }).fn
    const res = await route({ supabase: fake.client, claude, limiter }, req())
    expect(res.status).toBe(status)
    const linhas = linhasDeLog()
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ userId: ADRI, result })
    expect(typeof linhas[0].ms).toBe('number')
  })
})
