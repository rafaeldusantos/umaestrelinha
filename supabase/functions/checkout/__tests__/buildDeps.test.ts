import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { IDENTIFY_MAX, buildDeps, route } from '../handlers.ts'
import { PROPOSAL_READ_MAX, PROPOSAL_READ_WINDOW_MS } from '../proposal.ts'

// Fecho da rodada 1 do Verifier da 89 (K18, K19, SEG-04): o teto da página do link era injetado
// no `index.ts`, que nenhum teste lê — tirar a linha deixava a suíte verde, e `get-proposal`, que
// só aplicava o teto quando o balde vinha, ficava SEM teto. As `Deps` reais agora nascem em
// `buildDeps` (provado aqui por comportamento) e o `index.ts` só chama isto (provado pela fonte).
//
// O número (30 a cada 5 minutos) é do `design.md` da 89 — a spec pede "teto por IP" sem número.
// Ele é escrito POR EXTENSO abaixo, nunca lido da constante: ler a constante provaria que ela é
// igual a si mesma (foi assim que o mutante 30 → 30000 sobreviveu).

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const pedir = (action: string, body: unknown, ip: string) =>
  new Request(`https://x.test/functions/v1/checkout?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })

function montar() {
  let agora = Date.parse('2026-10-31T12:00:00Z')
  const fake = createFakeSupabase({ rpcByFn: { account_exists: { data: false } }, rows: { order_proposals: null } })
  const deps = buildDeps(fake.client, () => agora)
  return { deps, avancar: (ms: number) => (agora += ms) }
}

const ler = (deps: ReturnType<typeof buildDeps>, ip: string) =>
  route(deps, pedir('get-proposal', { token: 'tok-qualquer' }, ip)).then((r) => r.status)

describe('buildDeps — o teto da página do link (SEG-04)', () => {
  it('o balde da proposta vem montado', () => {
    expect(montar().deps.proposalLimiter).toBeDefined()
  })

  it('30 leituras por IP passam; a 31ª é recusada com 429', async () => {
    const { deps } = montar()
    for (let i = 0; i < 30; i++) expect(await ler(deps, '200.1.1.1')).toBe(404)
    expect(await ler(deps, '200.1.1.1')).toBe(429)
  })

  it('o teto é por IP: outro IP continua lendo', async () => {
    const { deps } = montar()
    for (let i = 0; i < 31; i++) await ler(deps, '200.1.1.1')
    expect(await ler(deps, '200.2.2.2')).toBe(404)
  })

  it('a janela é de 5 minutos: depois dela o mesmo IP volta a ler', async () => {
    const { deps, avancar } = montar()
    for (let i = 0; i < 31; i++) await ler(deps, '200.1.1.1')
    avancar(4 * 60 * 1000)
    expect(await ler(deps, '200.1.1.1')).toBe(429)
    avancar(60 * 1000 + 1)
    expect(await ler(deps, '200.1.1.1')).toBe(404)
  })

  it('balde próprio: esgotar a página do link não esgota o `identify`', async () => {
    const { deps } = montar()
    for (let i = 0; i < 31; i++) await ler(deps, '200.1.1.1')
    const res = await route(deps, pedir('identify', { email: 'maria@exemplo.invalid' }, '200.1.1.1'))
    expect(res.status).toBe(200)
  })

  it('as constantes declaradas batem com o número do design', () => {
    expect(PROPOSAL_READ_MAX).toBe(30)
    expect(PROPOSAL_READ_WINDOW_MS).toBe(5 * 60 * 1000)
    expect(IDENTIFY_MAX).toBe(20)
  })
})

// ---------------------------------------------------------------------------------------------
// O `index.ts` só chama `buildDeps` — nenhuma ferramenta além deste guarda o lê.
// ---------------------------------------------------------------------------------------------

const semComentario = (fonte: string) => fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

/** `null` = conforme; senão, o motivo. */
function fiacaoRefusal(fonte: string): string | null {
  const codigo = semComentario(fonte)
  if (!/\bconst deps = buildDeps\(\s*createClient\(/.test(codigo)) return 'o index.ts não monta as Deps por buildDeps'
  if (!/Deno\.serve\(\(req\) => route\(deps, req\)\)/.test(codigo)) return 'o index.ts não serve route(deps, req)'
  if (/\bLimiter\b|createRateLimiter|limiter\s*:/.test(codigo)) return 'o index.ts monta um balde à mão'
  if (/\.\.\.\s*deps|\{\s*\.\.\./.test(codigo)) return 'o index.ts espalha as Deps (pode sobrescrever o balde)'
  return null
}

describe('index.ts — a fiação passa por buildDeps', () => {
  const fonte = readFileSync(join(DIR, 'index.ts'), 'utf8')

  it('âncora: o arquivo foi lido e tem o `Deno.serve`', () => {
    expect(fonte).toContain('Deno.serve')
  })

  it('o index.ts monta as Deps por buildDeps e serve route', () => {
    expect(fiacaoRefusal(fonte)).toBeNull()
  })

  it('sensor — a forma de antes (as Deps montadas à mão, com o balde) é acusada', () => {
    const antes = `const deps: Deps = {\n  supabase: createClient(a, b),\n  now,\n  limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, now),\n}\nDeno.serve((req) => route(deps, req))`
    expect(fiacaoRefusal(antes)).not.toBeNull()
  })

  it('sensor — sobrescrever o balde depois de buildDeps é acusado', () => {
    const mutado = fonte.replace('Deno.serve', 'deps.proposalLimiter = undefined\nDeno.serve').replace(
      /const deps = buildDeps\(([^\n]*)\)\n/,
      'const deps = { ...buildDeps($1), proposalLimiter: undefined }\n',
    )
    expect(mutado).not.toBe(fonte)
    expect(fiacaoRefusal(mutado)).not.toBeNull()
  })

  it('sensor inverso — a menção em comentário (CRLF e LF) não é acusada', () => {
    const comentado = `// limiter: createRateLimiter(1, 1, now)\r\n/* proposalLimiter: x\n */\n${fonte}`
    expect(fiacaoRefusal(comentado)).toBeNull()
  })
})
