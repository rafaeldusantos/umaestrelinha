import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { currentUser, requireAdmin } from '../auth.ts'
import { createFakeSupabase } from '../testing/fakes.ts'
import {
  currentUser as adminUsersCurrentUser,
  requireAdmin as adminUsersRequireAdmin,
} from '../../admin-users/handlers.ts'
import {
  currentUser as notifCurrentUser,
  requireAdmin as notifRequireAdmin,
} from '../../send-notification/handlers.ts'

/**
 * Feature `61` · T06 — "quem é admin?" tem **um** dono nas edge functions.
 *
 * Até aqui a checagem estava escrita TRÊS vezes (`admin-users`, `send-notification`,
 * `melhor-envio`), iguais no comportamento. A function `google-analytics` seria a quarta. A
 * primeira divergência — um `has_role` que falha virando permissão numa delas — não quebraria
 * build, `tsc` nem teste: abriria a porta de admin numa function só.
 *
 * Mesmo molde de `http.test.ts`: a régua mede DECLARAÇÃO (não menção), e a reexportação é provada
 * por identidade de referência (`toBe`), porque `toEqual` passaria com uma cópia colada.
 */

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Remove comentário de linha e de bloco na MESMA varredura — a régua mede uso, não menção. */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** Todo `.ts` de produção das functions (exclui teste e fixture). */
const arquivosDeProducao = (): { nome: string; fonte: string }[] => {
  const saida: { nome: string; fonte: string }[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!entrada.name.endsWith('.ts')) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('supabase/functions/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(FUNCTIONS)
  return saida
}

/**
 * Uma DECLARAÇÃO de `requireAdmin` ou `currentUser`: `function x(`, `const x =`, `let x =`.
 * Import, reexport e chamada não contam.
 */
const declara = (fonte: string, nome: 'requireAdmin' | 'currentUser'): boolean =>
  new RegExp(
    `(?:^|[\\n\\r])\\s*(?:export\\s+)?(?:(?:async\\s+)?function\\s*\\*?\\s*${nome}\\s*[(<]|(?:const|let|var)\\s+${nome}\\s*[=:])`,
  ).test(semComentario(fonte))

describe('_shared/auth.ts é o dono único de requireAdmin/currentUser', () => {
  const arquivos = arquivosDeProducao()

  it('a varredura leu as functions — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(10)
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining([
        '_shared/auth.ts',
        'admin-users/handlers.ts',
        'send-notification/handlers.ts',
        'melhor-envio/index.ts',
        'google-analytics/handlers.ts',
      ]),
    )
  })

  it('só `_shared/auth.ts` DECLARA requireAdmin', () => {
    expect(arquivos.filter((a) => declara(a.fonte, 'requireAdmin')).map((a) => a.nome)).toEqual([
      '_shared/auth.ts',
    ])
  })

  it('só `_shared/auth.ts` DECLARA currentUser', () => {
    expect(arquivos.filter((a) => declara(a.fonte, 'currentUser')).map((a) => a.nome)).toEqual([
      '_shared/auth.ts',
    ])
  })

  it('sensor — uma segunda declaração É acusada, e import/reexport/chamada NÃO são', () => {
    expect(declara('async function requireAdmin(deps, req) {}', 'requireAdmin')).toBe(true)
    expect(declara('export async function requireAdmin(deps: Deps) {}', 'requireAdmin')).toBe(true)
    expect(declara('const requireAdmin = async () => {}', 'requireAdmin')).toBe(true)
    expect(declara('x\r\nfunction currentUser(d, r) {}', 'currentUser')).toBe(true)
    expect(declara("import { requireAdmin } from '../_shared/auth.ts'", 'requireAdmin')).toBe(false)
    expect(declara("export { requireAdmin } from '../_shared/auth.ts'", 'requireAdmin')).toBe(false)
    expect(declara('  const auth = await requireAdmin(deps, req)', 'requireAdmin')).toBe(false)
    // a prosa que explica a regra, com CRLF e com LF
    expect(declara('// antes: async function requireAdmin(\r\nselect', 'requireAdmin')).toBe(false)
    expect(declara('/* const requireAdmin = x */\nselect', 'requireAdmin')).toBe(false)
    // o wrapper de rótulo de log tem outro nome, e não é acusado
    expect(declara("const exigirAdmin = (d, r) => requireAdmin(d, r, 'x')", 'requireAdmin')).toBe(false)
  })

  it('admin-users e send-notification reexportam a MESMA referência, não uma cópia', () => {
    expect(adminUsersRequireAdmin).toBe(requireAdmin)
    expect(adminUsersCurrentUser).toBe(currentUser)
    expect(notifRequireAdmin).toBe(requireAdmin)
    expect(notifCurrentUser).toBe(currentUser)
  })

  it('melhor-envio importa do dono (não pode ser importado no teste: lê env no carregamento)', () => {
    const fonte = semComentario(readFileSync(join(FUNCTIONS, 'melhor-envio/index.ts'), 'utf8'))
    expect(fonte).toMatch(/import\s*\{\s*requireAdmin\s*\}\s*from\s*["']\.\.\/_shared\/auth\.ts["']/)
  })
})

const req = (bearer?: string) =>
  new Request('http://x', { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} })

describe('requireAdmin — os quatro desfechos', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sem header → 401, sem chamar getUser nem has_role', async () => {
    const fake = createFakeSupabase({ user: { id: 'u1' }, rpc: { data: true } })
    expect(await requireAdmin({ supabase: fake.client }, req())).toEqual({
      ok: false,
      status: 401,
      error: 'Não autenticado',
    })
    expect(fake.rpcs).toEqual([])
  })

  it('bearer sem usuário (anon key) → 401', async () => {
    const fake = createFakeSupabase({ user: null })
    expect((await requireAdmin({ supabase: fake.client }, req('anon'))).ok).toBe(false)
    expect(await requireAdmin({ supabase: fake.client }, req('anon'))).toMatchObject({ status: 401 })
  })

  it('autenticada sem papel → 403', async () => {
    const fake = createFakeSupabase({ user: { id: 'u1' }, rpc: { data: false } })
    expect(await requireAdmin({ supabase: fake.client }, req('jwt'))).toMatchObject({ ok: false, status: 403 })
    expect(fake.rpcs).toEqual([{ fn: 'has_role', args: { _user_id: 'u1', _role: 'admin' } }])
  })

  // F16 da verificação: o caso "sem papel" usa `false`, então `isAdmin !== true` → `isAdmin === false`
  // passava. `has_role` é `exists(...)` e não devolve nulo hoje, mas este é o dono único da
  // autorização de quatro functions: só `true` abre a porta, e qualquer outra resposta fecha.
  it.each([
    ['null sem erro', null],
    ['undefined sem erro', undefined],
    ['string "true"', 'true'],
    ['1', 1],
  ])('has_role devolvendo %s → 403 (só `true` é permissão)', async (_rotulo, valor) => {
    const fake = createFakeSupabase({ user: { id: 'u1' }, rpc: { data: valor, error: null } })
    expect(await requireAdmin({ supabase: fake.client }, req('jwt'))).toEqual({
      ok: false,
      status: 403,
      error: 'Acesso restrito ao admin',
    })
    expect(fake.rpcs).toHaveLength(1) // âncora: a pergunta foi feita, e a resposta foi lida
  })

  it('has_role que ERRA → 403 (nunca permissão), com log distinto e o rótulo de quem chamou', async () => {
    const linhas: string[] = []
    vi.spyOn(console, 'log').mockImplementation((l: unknown) => void linhas.push(String(l)))
    const fake = createFakeSupabase({ user: { id: 'u1' }, rpc: { error: { message: 'boom' } } })
    expect(await requireAdmin({ supabase: fake.client }, req('jwt'), 'google-analytics')).toMatchObject({
      ok: false,
      status: 403,
    })
    expect(linhas.map((l) => JSON.parse(l))).toEqual([
      { action: 'google-analytics', status: 'admin_check_failed', message: 'boom' },
    ])
  })

  it('admin → ok, com o id', async () => {
    const fake = createFakeSupabase({ user: { id: 'adri' }, rpc: { data: true } })
    expect(await requireAdmin({ supabase: fake.client }, req('jwt'))).toEqual({ ok: true, userId: 'adri' })
  })
})
