// As portas HTTP da `admin-users` — quem entra no painel (feature 48).
//
// ---------------------------------------------------------------------------------------------
// Por que esta function existe
// ---------------------------------------------------------------------------------------------
//
// Criar, editar e apagar conta no GoTrue exige a **service role**, e ela não pode chegar ao
// navegador: a chave dá acesso TOTAL ao banco, ignorando toda RLS. Um painel que a carregasse
// funcionaria perfeitamente e entregaria o banco inteiro a qualquer visitante — errar nisso não
// quebra nada, que é a propriedade que torna o erro caro.
//
// Por isso a function é a **porta única**, inclusive para LISTAR: `auth.users` não é exposto ao
// PostgREST, e a alternativa (uma view `security definer` sobre ela) entregaria o e-mail de toda
// pessoa cadastrada a qualquer sessão autenticada, além de criar um segundo dono de "quem é admin
// do painel" ao lado da function que precisa existir de qualquer forma.
//
// ---------------------------------------------------------------------------------------------
// `verify_jwt = false` no config.toml, com autorização MANUAL aqui
// ---------------------------------------------------------------------------------------------
//
// `verify_jwt = true` seria **teatro de segurança**: a anon key publicada no `.env` da loja É um JWT
// válido do projeto e passaria pelo gateway sem provar nada. O que importa é o PAPEL, e papel só se
// checa dentro do handler. Mesma decisão da `send-notification`, pelo mesmo motivo.
//
// ---------------------------------------------------------------------------------------------
// A regra pura NÃO mora aqui
// ---------------------------------------------------------------------------------------------
//
// As recusas vêm de `@estrelinha/core/admin-users`, importadas por caminho relativo com extensão
// explícita — Deno não conhece os alias. É a mesma função que o painel chama antes de gravar: a
// tela recusa cedo para a pessoa não perder o que digitou, esta porta recusa porque a escrita pode
// não vir da tela, e o trigger `guard_last_admin` recusa porque é o único que não se contorna.

import {
  type AccountHistory,
  accountHistoryRefusal,
  adminUserRefusal,
  lastAdminRefusal,
  normalizeEmail,
  selfTargetRefusal,
} from '../../../packages/core/src/admin-users/index.ts'

export interface Deps {
  supabase: any
}

/**
 * O que a listagem devolve por pessoa.
 *
 * Os campos são **escolhidos**, nunca o objeto do GoTrue inteiro: `raw_user_meta_data` pode carregar
 * qualquer coisa que um provedor OAuth tenha gravado, e `encrypted_password` está no mesmo registro.
 * Enumerar é o que faz um campo novo chegar ao painel de propósito, e não de carona.
 */
export interface AdminUserRow {
  id: string
  email: string
  name: string
  created_at: string
  last_sign_in_at: string | null
  /** Quem está pedindo. A tela usa para desabilitar as ações destrutivas na própria linha. */
  is_self: boolean
}

// Feature `49`: dono único em `_shared/http.ts`. Esta era a QUARTA declaração idêntica nas edge
// functions — e ela chegou no merge, pela feature `48`, depois de as outras três terem sido
// unificadas. Reexportadas, e não redeclaradas, para não quebrar import existente.
export { corsHeaders, json } from '../_shared/http.ts'
import { corsHeaders, json } from '../_shared/http.ts'

/**
 * Log estruturado, uma linha por desfecho.
 *
 * **Nunca recebe a senha.** Não há tabela de auditoria neste projeto, então esta linha é o único
 * registro de "quem mexeu em acesso" — e um registro que vaza senha em texto é pior que registro
 * nenhum.
 */
function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}


type AuthOutcome = { ok: true; userId: string } | { ok: false; status: number; error: string }

async function currentUser(deps: Deps, req: Request): Promise<{ id: string } | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (jwt === '') return null

  const { data, error } = await deps.supabase.auth.getUser(jwt)
  const user = data?.user
  if (error || !user?.id) return null
  return { id: user.id }
}

/**
 * `USR-01`, `USR-02`, `USR-03`, `USR-19`. Quatro desfechos, e os quatro fecham a porta:
 *
 *  - sem header            → 401
 *  - anon key como bearer  → é JWT válido do projeto mas NÃO tem `sub`, então `getUser` erra → 401
 *  - autenticada sem papel → `has_role` é falso → 403
 *  - a RPC `has_role` erra → **403**, e log distinto
 *
 * O último não é detalhe: falha de verificação que virasse permissão transformaria uma instabilidade
 * do banco em acesso administrativo. Fecha, e diz no log por quê.
 *
 * A checagem usa o client SERVICE-ROLE e a função canônica `has_role` — a mesma que toda policy de
 * admin do schema usa —, não uma leitura própria de `user_roles`, para não criar uma segunda
 * definição de "admin".
 */
async function requireAdmin(deps: Deps, req: Request): Promise<AuthOutcome> {
  const user = await currentUser(deps, req)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  const { data: isAdmin, error: roleError } = await deps.supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (roleError) {
    log({
      action: 'admin-users',
      status: 'admin_check_failed',
      message: String(roleError.message ?? roleError),
    })
    return { ok: false, status: 403, error: 'Acesso restrito ao admin' }
  }
  if (isAdmin !== true) return { ok: false, status: 403, error: 'Acesso restrito ao admin' }

  return { ok: true, userId: user.id }
}

/**
 * ACTION: list — quem tem acesso ao painel (`USR-20`, `USR-26`).
 *
 * Lê `user_roles` (tabela pequena, filtrada por `role = 'admin'`) e resolve cada id por
 * `getUserById`. **Não** usa `listUsers`: aquele endpoint é paginado sobre a base INTEIRA de
 * clientes — trazer 680 pessoas para filtrar duas no cliente é buscar a resposta errada e descartar
 * o excesso.
 *
 * Falha de leitura responde **erro**, e nunca lista vazia. É a distinção que a tela de Coleções não
 * fazia (`AD-014`): "não consegui ler" e "não há ninguém" são estados diferentes, e só um deles pede
 * "tentar de novo".
 */
async function list(deps: Deps, req: Request): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const { data: papeis, error: papeisError } = await deps.supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')

  if (papeisError) {
    log({ action: 'admin-users:list', status: 'roles_read_failed' })
    return json({ error: 'Não foi possível ler quem tem acesso ao painel.' }, 502)
  }

  const ids: string[] = (papeis ?? []).map((p: any) => p?.user_id).filter(Boolean)

  const users: AdminUserRow[] = []
  for (const id of ids) {
    const { data, error } = await deps.supabase.auth.admin.getUserById(id)
    if (error || !data?.user) {
      // Papel sem conta no GoTrue é linha órfã — não derruba a listagem inteira, mas fica no log.
      log({ action: 'admin-users:list', status: 'orphan_role', user_id: id })
      continue
    }
    const u = data.user
    users.push({
      id: u.id,
      email: u.email ?? '',
      name: String(u.user_metadata?.full_name ?? ''),
      created_at: u.created_at ?? '',
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_self: u.id === auth.userId,
    })
  }

  log({ action: 'admin-users:list', status: 'ok', total: users.length })
  return json({ users })
}

// ---------------------------------------------------------------------------------------------
// Auxiliares compartilhados pelas ações de escrita
// ---------------------------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** O id do alvo, quando vem do corpo. `null` quando ausente ou malformado. */
function targetIdOf(body: any): string | null {
  const id = body?.id
  return typeof id === 'string' && UUID_RE.test(id) ? id : null
}

/**
 * Quantos admins existem hoje.
 *
 * `null` quando a leitura falha — e `null` **fecha**, nunca abre: `lastAdminRefusal` recusa com
 * contagem não finita. Uma instabilidade de leitura que virasse "pode remover" poderia esvaziar o
 * painel, que é o desfecho que esta feature inteira existe para impedir.
 */
async function contarAdmins(deps: Deps): Promise<number> {
  const { count, error } = await deps.supabase
    .from('user_roles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (error || typeof count !== 'number') return NaN
  return count
}

/** Acha a conta do GoTrue por e-mail normalizado, percorrendo as páginas de `listUsers`. */
async function acharPorEmail(deps: Deps, email: string): Promise<{ id: string } | null> {
  const alvo = normalizeEmail(email)
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await deps.supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const users = data?.users ?? []
    const achado = users.find((u: any) => normalizeEmail(u?.email ?? '') === alvo)
    if (achado) return { id: achado.id }
    if (users.length < 200) return null
  }
  return null
}

/** A pessoa é admin hoje? Usada para distinguir os dois ramos de "e-mail já existe" (`USR-07`). */
async function jaEhAdmin(deps: Deps, userId: string): Promise<boolean> {
  const { data } = await deps.supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  return !!data
}

/**
 * ACTION: create — cria a conta e concede o papel (`USR-04`..`USR-08`, `USR-21`).
 *
 * **A compensação de `USR-08` é a parte que não pode faltar.** São duas escritas em sistemas
 * diferentes (GoTrue e Postgres) sem transação entre elas: se a segunda falhar, sobra uma conta de
 * LOJA criada por engano — a pessoa consegue entrar na vitrine, aparece em `/admin/clientes`, e não
 * tem acesso nenhum ao painel. Ninguém descobre, porque do lado de fora o desfecho é só "deu erro".
 */
async function create(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const name = String(body?.name ?? '')
  const email = normalizeEmail(String(body?.email ?? ''))
  const password = String(body?.password ?? '')

  // A MESMA função que o painel chama antes de enviar. Recusa aqui porque a escrita pode não vir da
  // tela — e recusa ANTES de qualquer chamada externa.
  const recusa = adminUserRefusal({ name, email, password })
  if (recusa) {
    log({ action: 'admin-users:create', status: 'refused' })
    return json({ error: recusa }, 400)
  }

  const existente = await acharPorEmail(deps, email)
  if (existente) {
    // Dois ramos, porque os remédios são opostos: um não tem nada a fazer, o outro tem.
    const motivo = (await jaEhAdmin(deps, existente.id))
      ? 'Esta pessoa já tem acesso ao painel.'
      : 'Já existe uma conta com este e-mail na loja. Em vez de criar outra, conceda o acesso a ela.'
    log({ action: 'admin-users:create', status: 'duplicate_email' })
    return json({ error: motivo }, 409)
  }

  const { data: criado, error: criarErro } = await deps.supabase.auth.admin.createUser({
    email,
    password,
    // Sem isto a pessoa nasce com e-mail pendente e não entra — e a Adri, que acabou de definir a
    // senha, não teria como saber por quê.
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (criarErro || !criado?.user?.id) {
    log({ action: 'admin-users:create', status: 'create_failed' })
    return json({ error: 'Não foi possível criar a conta agora. Tente de novo.' }, 502)
  }

  const { error: papelErro } = await deps.supabase
    .from('user_roles')
    .insert({ user_id: criado.user.id, role: 'admin' })

  if (papelErro) {
    // A compensação. Se ela também falhar, a conta órfã fica — e o log é o que permite achá-la.
    await deps.supabase.auth.admin.deleteUser(criado.user.id)
    log({ action: 'admin-users:create', status: 'role_failed_rolled_back', user_id: criado.user.id })
    return json({ error: 'Não foi possível conceder o acesso. Nada foi criado.' }, 502)
  }

  log({ action: 'admin-users:create', status: 'ok', user_id: criado.user.id })
  return json({ user: { id: criado.user.id, email, name: name.trim() } }, 201)
}

/**
 * ACTION: update — corrige nome e e-mail (`USR-28`, `USR-29`).
 *
 * O nome vai para **dois** lugares: `user_metadata.full_name`, que é o que a listagem do painel lê,
 * e `public.customers.name`, que é o que `/admin/clientes` lê. São duas telas do mesmo painel
 * mostrando a mesma pessoa — deixá-las divergir é o defeito 01 na sua forma mais visível.
 */
async function update(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = targetIdOf(body)
  if (!id) return json({ error: 'Informe quem editar' }, 400)

  const name = String(body?.name ?? '')
  const email = normalizeEmail(String(body?.email ?? ''))

  // `password` ausente de propósito: esta ação não troca senha.
  const recusa = adminUserRefusal({ name, email })
  if (recusa) {
    log({ action: 'admin-users:update', status: 'refused' })
    return json({ error: recusa }, 400)
  }

  const existente = await acharPorEmail(deps, email)
  if (existente && existente.id !== id) {
    log({ action: 'admin-users:update', status: 'duplicate_email' })
    return json({ error: 'Já existe outra conta com este e-mail.' }, 409)
  }

  const { error: gotrueErro } = await deps.supabase.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (gotrueErro) {
    log({ action: 'admin-users:update', status: 'update_failed' })
    return json({ error: 'Não foi possível salvar agora. Tente de novo.' }, 502)
  }

  // A ficha de cliente da MESMA pessoa. Falha aqui não desfaz a troca no GoTrue — desfazer exigiria
  // uma segunda escrita que também pode falhar —, mas fica no log, e o nome que a Adri vê na
  // listagem de acessos já está certo.
  const { error: fichaErro } = await deps.supabase
    .from('customers')
    .update({ name: name.trim(), email })
    .eq('user_id', id)

  log({
    action: 'admin-users:update',
    status: fichaErro ? 'ok_customer_desync' : 'ok',
    user_id: id,
  })
  return json({ user: { id, email, name: name.trim() } })
}

/**
 * ACTION: revoke — tira o acesso, preserva a conta (`USR-13`, `USR-14`, `USR-15`).
 *
 * Apaga **apenas** a linha de `user_roles` com `role = 'admin'`. A conta, a ficha de cliente e todo
 * o histórico ficam — é a diferença entre "não administra mais" e "nunca existiu", e só a primeira é
 * reversível com um clique.
 */
async function revoke(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = targetIdOf(body)
  if (!id) return json({ error: 'Informe quem remover' }, 400)

  const proprio = selfTargetRefusal(auth.userId, id, 'remover')
  if (proprio) {
    log({ action: 'admin-users:revoke', status: 'refused_self' })
    return json({ error: proprio }, 409)
  }

  const ultimo = lastAdminRefusal(await contarAdmins(deps))
  if (ultimo) {
    log({ action: 'admin-users:revoke', status: 'refused_last_admin' })
    return json({ error: ultimo }, 409)
  }

  const { error } = await deps.supabase
    .from('user_roles')
    .delete()
    .eq('user_id', id)
    .eq('role', 'admin')

  if (error) {
    log({ action: 'admin-users:revoke', status: 'delete_failed' })
    return json({ error: 'Não foi possível remover o acesso agora. Tente de novo.' }, 502)
  }

  // Linha já inexistente NÃO é erro: duas abas removendo a mesma pessoa devem terminar as duas em
  // silêncio. O PostgREST não reclama de delete que não casa nada, e este handler também não.
  log({ action: 'admin-users:revoke', status: 'ok', user_id: id })
  return json({ ok: true })
}

/**
 * Conta o rastro que a pessoa deixou na loja (`USR-32`).
 *
 * As quatro origens são chaves estrangeiras reais para `auth.users`, sem `ON DELETE`. Não é uma
 * lista defensiva: é o schema. Ver `AccountHistory` em `core/admin-users`.
 */
async function contarHistorico(deps: Deps, userId: string): Promise<AccountHistory> {
  const contar = async (tabela: string, coluna: string, valor: string): Promise<number> => {
    const { count, error } = await deps.supabase
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq(coluna, valor)
    return error || typeof count !== 'number' ? 0 : count
  }

  const { data: ficha } = await deps.supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    pedidos: ficha?.id ? await contar('orders', 'customer_id', ficha.id) : 0,
    notasDePedido: await contar('order_notes', 'created_by', userId),
    mudancasDeStatus: await contar('order_status_history', 'created_by', userId),
    notasDeCliente: await contar('customer_notes', 'created_by', userId),
  }
}

/**
 * ACTION: delete — apaga a conta de vez (`USR-31`..`USR-34`).
 *
 * **Conta o histórico ANTES**, e recusa nomeando o que bloqueia. Não é a tela que impede: o banco
 * impede, pelas quatro FKs. A contagem existe para a recusa ser legível em vez de um `23503` cru —
 * e o `23503` que chegar assim mesmo é traduzido para a MESMA frase, para a parede não falar duas
 * línguas dependendo de por onde se bateu nela.
 */
async function remove(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = targetIdOf(body)
  if (!id) return json({ error: 'Informe qual conta apagar' }, 400)

  const proprio = selfTargetRefusal(auth.userId, id, 'apagar')
  if (proprio) {
    log({ action: 'admin-users:delete', status: 'refused_self' })
    return json({ error: proprio }, 409)
  }

  const ultimo = lastAdminRefusal(await contarAdmins(deps))
  if (ultimo) {
    log({ action: 'admin-users:delete', status: 'refused_last_admin' })
    return json({ error: ultimo }, 409)
  }

  const historico = await contarHistorico(deps, id)
  const comRastro = accountHistoryRefusal(historico)
  if (comRastro) {
    log({ action: 'admin-users:delete', status: 'refused_history' })
    return json({ error: comRastro }, 409)
  }

  const { error } = await deps.supabase.auth.admin.deleteUser(id)
  if (error) {
    // O banco é quem garante. Se ele recusou por FK, a frase é a mesma da contagem — e as contagens
    // vêm do que ele acabou de dizer que existe, relidas.
    const codigo = String((error as any)?.code ?? '')
    if (codigo === '23503' || /foreign key/i.test(String((error as any)?.message ?? ''))) {
      const relido = accountHistoryRefusal(await contarHistorico(deps, id))
      log({ action: 'admin-users:delete', status: 'refused_fk' })
      return json(
        {
          error:
            relido ??
            'Esta conta tem registros no histórico da loja, e apagá-la os deixaria sem dono. Use “Remover do painel”: o acesso sai e o histórico fica.',
        },
        409,
      )
    }
    log({ action: 'admin-users:delete', status: 'delete_failed' })
    return json({ error: 'Não foi possível apagar a conta agora. Tente de novo.' }, 502)
  }

  log({ action: 'admin-users:delete', status: 'ok', user_id: id })
  return json({ ok: true })
}

/**
 * ACTION: reset-password — dispara o e-mail de recuperação (`USR-18`, `USR-30`).
 *
 * **O e-mail é resolvido pelo ID, e o do corpo é ignorado.** Aceitar o endereço de quem chamou faria
 * desta porta um jeito de mandar código de recuperação de uma conta do painel para um endereço
 * arbitrário — e ela é autenticada como admin, então quem já entrou uma vez poderia se dar acesso
 * permanente ao e-mail de outra pessoa.
 */
async function resetPassword(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = targetIdOf(body)
  if (!id) return json({ error: 'Informe para quem enviar' }, 400)

  const { data, error: leituraErro } = await deps.supabase.auth.admin.getUserById(id)
  const email = data?.user?.email
  if (leituraErro || !email) {
    log({ action: 'admin-users:reset-password', status: 'user_not_found' })
    return json({ error: 'Conta não encontrada.' }, 404)
  }

  const { error } = await deps.supabase.auth.resetPasswordForEmail(email)
  if (error) {
    const codigo = String((error as any)?.code ?? '')
    const motivo =
      codigo === 'over_email_send_rate_limit'
        ? 'Aguarde alguns segundos para reenviar'
        : 'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.'
    log({ action: 'admin-users:reset-password', status: 'send_failed' })
    return json({ error: motivo }, 502)
  }

  log({ action: 'admin-users:reset-password', status: 'ok', user_id: id })
  return json({ ok: true, email })
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const action = new URL(req.url).searchParams.get('action') ?? ''

  let body: any = null
  if (req.method !== 'GET') {
    try {
      const texto = await req.text()
      body = texto.trim() === '' ? {} : JSON.parse(texto)
    } catch {
      // 400, e não 500: corpo malformado é erro de quem chamou, e responder 500 faria o painel
      // reportar "problema no servidor" sobre um problema dele.
      log({ action: `admin-users:${action}`, status: 'bad_body' })
      return json({ error: 'Corpo da requisição inválido' }, 400)
    }
  }

  switch (action) {
    case 'list':
      return await list(deps, req)
    case 'create':
      return await create(deps, req, body)
    case 'update':
      return await update(deps, req, body)
    case 'revoke':
      return await revoke(deps, req, body)
    case 'delete':
      return await remove(deps, req, body)
    case 'reset-password':
      return await resetPassword(deps, req, body)
    default:
      log({ action: `admin-users:${action}`, status: 'unknown_action' })
      return json({ error: 'Ação desconhecida' }, 400)
  }
}
