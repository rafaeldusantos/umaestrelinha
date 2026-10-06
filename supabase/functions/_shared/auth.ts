// Quem está chamando, e se é admin — um dono só nas edge functions.
//
// Até a feature `61` esta checagem estava escrita **três vezes**: em `admin-users/handlers.ts`, em
// `send-notification/handlers.ts` e em `melhor-envio/index.ts`. As três eram iguais no
// comportamento e só divergiam no rótulo do log. A function `google-analytics` seria a quarta — e é
// a mesma história do `corsHeaders` (`_shared/http.ts`, feature `49`): a primeira divergência numa
// das cópias (um `has_role` que falha virando permissão, um 401 virando 403) não quebraria build,
// `tsc` nem teste. Abriria uma porta de admin numa function só.
//
// `admin-users` e `send-notification` **reexportam** daqui em vez de declarar, e
// `_shared/__tests__/auth.test.ts` confere a MESMA referência (`toBe`, nunca `toEqual`).
//
// A checagem usa o client SERVICE-ROLE e a função canônica `has_role` — a mesma que toda policy de
// admin do schema usa —, não uma leitura própria de `user_roles`, para não criar uma segunda
// definição de "admin".

/** O que a checagem precisa: o client com a service role. */
export interface AuthDeps {
  supabase: any
}

export type AuthOutcome = { ok: true; userId: string } | { ok: false; status: number; error: string }

/**
 * O usuário dono do bearer, ou `null`.
 *
 * A anon key é um JWT válido do projeto mas **não tem `sub`**: `getUser` erra, e ela cai aqui como
 * "ninguém" — que é exatamente o que ela é.
 */
export async function currentUser(deps: AuthDeps, req: Request): Promise<{ id: string } | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (jwt === '') return null

  const { data, error } = await deps.supabase.auth.getUser(jwt)
  const user = data?.user
  if (error || !user?.id) return null
  return { id: user.id }
}

/**
 * Quatro desfechos, e os quatro fecham a porta de quem não é a dona:
 *
 *  - sem header            → 401
 *  - anon key como bearer  → `getUser` erra → 401
 *  - autenticada sem papel → `has_role` é falso → 403
 *  - a RPC `has_role` erra → **403**, e log distinto
 *
 * O último não é detalhe: falha de verificação que virasse permissão transformaria uma instabilidade
 * do banco em acesso administrativo. Fecha, e diz no log por quê.
 *
 * `logAction` é só o rótulo da linha de log — cada function continua dizendo o próprio nome.
 */
export async function requireAdmin(
  deps: AuthDeps,
  req: Request,
  logAction = 'admin',
): Promise<AuthOutcome> {
  const user = await currentUser(deps, req)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  const { data: isAdmin, error: roleError } = await deps.supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (roleError) {
    console.log(
      JSON.stringify({
        action: logAction,
        status: 'admin_check_failed',
        message: String(roleError.message ?? roleError),
      }),
    )
    return { ok: false, status: 403, error: 'Acesso restrito ao admin' }
  }
  if (isAdmin !== true) return { ok: false, status: 403, error: 'Acesso restrito ao admin' }

  return { ok: true, userId: user.id }
}
