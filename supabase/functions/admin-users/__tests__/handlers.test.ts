import { describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { type Deps, route } from '../handlers.ts'

// A `admin-users` — a porta única da service role (feature 48).
//
// Toda recusa aqui assere DUAS coisas: o status **e** que `auth.admin.*` não foi chamado (`L-004`).
// Sem a segunda metade, um handler que checasse o papel DEPOIS de criar a conta passaria em todos os
// testes de status — e teria criado a conta.

const ADRI = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'

const req = (action: string, init: RequestInit = {}) =>
  new Request(`http://local/admin-users?action=${action}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-da-adri' },
    ...init,
  })

/** Um ambiente em que quem chama É admin. O ponto de partida de todo caso de caminho feliz. */
const comoAdmin = (extra: Parameters<typeof createFakeSupabase>[0] = {}) =>
  createFakeSupabase({
    user: { id: ADRI },
    rpcByFn: { has_role: { data: true } },
    ...extra,
  })

const USUARIOS = {
  [ADRI]: {
    id: ADRI,
    email: 'adri@umaestrelinha.invalid',
    created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: '2026-09-13T10:00:00Z',
    user_metadata: { full_name: 'Adri Muniz' },
  },
  [ANA]: {
    id: ANA,
    email: 'ana@exemplo.invalid',
    created_at: '2026-05-05T00:00:00Z',
    last_sign_in_at: null,
    user_metadata: { full_name: 'Ana Helena' },
  },
}

// ---------------------------------------------------------------------------------------------
// USR-01, USR-02, USR-03, USR-19 — a porta
// ---------------------------------------------------------------------------------------------

describe('admin-users — autorização', () => {
  it('USR-01: sem header `Authorization` responde 401 e NÃO toca em auth.admin', async () => {
    const { client, adminCalls } = createFakeSupabase({ user: null })
    const res = await route({ supabase: client } as Deps, new Request('http://local/admin-users?action=list'))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Não autenticado' })
    expect(adminCalls).toEqual([])
  })

  it('USR-02: anon key como bearer responde 401 — é JWT do projeto, mas sem `sub`', async () => {
    // O dublê devolve `user: null` + erro, que é exatamente o que `getUser` faz com um JWT sem
    // `sub`. É o caso que torna `verify_jwt = true` teatro: o gateway deixaria passar.
    const { client, adminCalls } = createFakeSupabase({ user: null })
    const res = await route(
      { supabase: client } as Deps,
      new Request('http://local/admin-users?action=list', {
        headers: { Authorization: 'Bearer a-anon-key-publicada' },
      }),
    )

    expect(res.status).toBe(401)
    expect(adminCalls).toEqual([])
  })

  it('USR-03: autenticada SEM papel admin responde 403, e diz que é restrito', async () => {
    const { client, adminCalls } = createFakeSupabase({
      user: { id: ANA },
      rpcByFn: { has_role: { data: false } },
    })
    const res = await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: 'Acesso restrito ao admin' })
    expect(adminCalls).toEqual([])
  })

  it('USR-19: RPC `has_role` com ERRO fecha em 403 — falha de verificação nunca vira permissão', async () => {
    const { client, adminCalls } = createFakeSupabase({
      user: { id: ADRI },
      rpcByFn: { has_role: { error: { message: 'connection reset' } } },
    })
    const res = await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(res.status).toBe(403)
    expect(adminCalls).toEqual([])
  })

  it('USR-19: a falha da RPC sai no log com status PRÓPRIO, distinto de "não é admin"', async () => {
    // Sem log distinto, uma instabilidade do banco vira "esta conta não tem acesso" no suporte — e
    // ninguém procura a causa certa.
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { client } = createFakeSupabase({
      user: { id: ADRI },
      rpcByFn: { has_role: { error: { message: 'connection reset' } } },
    })

    await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    const linhas = spy.mock.calls.map(c => JSON.parse(String(c[0])))
    expect(linhas).toContainEqual(
      expect.objectContaining({ status: 'admin_check_failed', message: 'connection reset' }),
    )
    spy.mockRestore()
  })

  it('a checagem de papel usa a RPC canônica `has_role`, não leitura própria de `user_roles`', async () => {
    // Uma leitura própria criaria a SEGUNDA definição de "admin" no projeto, ao lado da que toda
    // policy do schema usa.
    const { client, rpcs } = comoAdmin({ lists: { user_roles: [] } })
    await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(rpcs[0]).toEqual({ fn: 'has_role', args: { _user_id: ADRI, _role: 'admin' } })
  })
})

// ---------------------------------------------------------------------------------------------
// Roteamento — os dois 400 dos edge cases da spec
// ---------------------------------------------------------------------------------------------

describe('admin-users — roteamento', () => {
  it('`?action=` desconhecido responde 400, nunca 500', async () => {
    const { client } = comoAdmin()
    const res = await route({ supabase: client } as Deps, req('inventada'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Ação desconhecida' })
  })

  it('`?action=` AUSENTE responde 400', async () => {
    const { client } = comoAdmin()
    const res = await route(
      { supabase: client } as Deps,
      new Request('http://local/admin-users', { method: 'POST', body: '{}' }),
    )

    expect(res.status).toBe(400)
  })

  it('corpo que não é JSON responde 400 com motivo, e não 500', async () => {
    const { client } = comoAdmin()
    const res = await route({ supabase: client } as Deps, req('create', { body: 'isto não é json' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Corpo da requisição inválido' })
  })

  it('corpo VAZIO não é erro de parse — vira objeto vazio', async () => {
    // `functions.invoke` sem `body` manda string vazia. Tratá-la como JSON malformado faria uma
    // ação sem parâmetros responder 400 por um motivo que não é o dela.
    const { client } = comoAdmin()
    const res = await route({ supabase: client } as Deps, req('inventada', { body: '' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Ação desconhecida' })
  })

  it('`OPTIONS` responde o preflight com os headers de CORS', async () => {
    const { client } = comoAdmin()
    const res = await route(
      { supabase: client } as Deps,
      new Request('http://local/admin-users?action=list', { method: 'OPTIONS' }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

// ---------------------------------------------------------------------------------------------
// USR-20, USR-26 — a listagem
// ---------------------------------------------------------------------------------------------

describe('admin-users — ?action=list', () => {
  const comDois = () =>
    comoAdmin({
      lists: { user_roles: [{ user_id: ADRI }, { user_id: ANA }] },
      authUsers: USUARIOS,
    })

  it('USR-20: devolve os seis campos, e `is_self` só para quem pediu', async () => {
    const { client } = comDois()
    const res = await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      users: [
        {
          id: ADRI,
          email: 'adri@umaestrelinha.invalid',
          name: 'Adri Muniz',
          created_at: '2026-01-01T00:00:00Z',
          last_sign_in_at: '2026-09-13T10:00:00Z',
          is_self: true,
        },
        {
          id: ANA,
          email: 'ana@exemplo.invalid',
          name: 'Ana Helena',
          created_at: '2026-05-05T00:00:00Z',
          last_sign_in_at: null,
          is_self: false,
        },
      ],
    })
  })

  it('USR-20: NENHUM outro campo do GoTrue vaza', async () => {
    // O objeto do GoTrue carrega `encrypted_password` e o `raw_user_meta_data` inteiro, onde um
    // provedor OAuth pode ter gravado qualquer coisa. A asserção é sobre as CHAVES, porque um
    // `...u` no lugar da enumeração passaria em todos os casos acima.
    const { client } = comoAdmin({
      lists: { user_roles: [{ user_id: ADRI }] },
      authUsers: {
        [ADRI]: {
          ...USUARIOS[ADRI],
          encrypted_password: '$2a$10$hash-de-verdade',
          user_metadata: { full_name: 'Adri Muniz', provider_token: 'ya29.segredo' },
        } as any,
      },
    })

    const { users } = await (await route({ supabase: client } as Deps, req('list', { method: 'GET' }))).json()

    expect(Object.keys(users[0]).sort()).toEqual([
      'created_at',
      'email',
      'id',
      'is_self',
      'last_sign_in_at',
      'name',
    ])
    expect(JSON.stringify(users)).not.toContain('encrypted_password')
    expect(JSON.stringify(users)).not.toContain('ya29.segredo')
  })

  it('usa `getUserById` por id, e NUNCA `listUsers`', async () => {
    // `listUsers` é paginado sobre a base inteira de clientes: trazer 680 pessoas para filtrar duas
    // é buscar a resposta errada e descartar o excesso.
    const { client, adminCalls } = comDois()
    await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(adminCalls.map(c => c.method)).toEqual(['getUserById', 'getUserById'])
    expect(adminCalls.map(c => c.id)).toEqual([ADRI, ANA])
  })

  it('painel SEM nenhum admin devolve lista vazia com 200, e não chama `getUserById`', async () => {
    // Estado impossível pelo trigger, mas alcançável por restore de backup. É o par de USR-26:
    // "vazio" tem de ser distinguível de "quebrou", e este caso fixa o lado do vazio.
    const { client, adminCalls } = comoAdmin({ lists: { user_roles: [] }, authUsers: USUARIOS })

    const res = await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ users: [] })
    expect(adminCalls).toEqual([])
  })

  it('USR-26: falha ao ler `user_roles` responde ERRO, e não lista vazia (AD-014)', async () => {
    // "Não consegui ler" e "não há ninguém" são estados diferentes, e só um deles pede "tentar de
    // novo". Foi este colapso que deixou a tela de Coleções mostrando grade vazia por meses.
    const comErro = createFakeSupabase({
      user: { id: ADRI },
      rpcByFn: { has_role: { data: true } },
    })
    comErro.client.from = () => ({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }),
    })

    const res = await route({ supabase: comErro.client } as Deps, req('list', { method: 'GET' }))

    // O status separa os dois estados para a tela: 502 pede "tentar de novo", 200 com `users: []`
    // pede "crie o primeiro acesso".
    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({
      error: 'Não foi possível ler quem tem acesso ao painel.',
    })
    expect(comErro.adminCalls).toEqual([])
  })

  it('papel órfão (sem conta no GoTrue) não derruba a listagem inteira', async () => {
    const { client } = comoAdmin({
      lists: { user_roles: [{ user_id: ADRI }, { user_id: 'fantasma' }] },
      authUsers: USUARIOS,
    })

    const { users } = await (await route({ supabase: client } as Deps, req('list', { method: 'GET' }))).json()

    expect(users).toHaveLength(1)
    expect(users[0].id).toBe(ADRI)
  })

  it('nome ausente em `user_metadata` vira string vazia, e não "undefined" na tela', async () => {
    const { client } = comoAdmin({
      lists: { user_roles: [{ user_id: ANA }] },
      authUsers: { [ANA]: { id: ANA, email: 'ana@exemplo.invalid' } },
    })

    const { users } = await (await route({ supabase: client } as Deps, req('list', { method: 'GET' }))).json()

    expect(users[0].name).toBe('')
    expect(users[0].last_sign_in_at).toBeNull()
  })

  it('USR-27: emite UMA linha de log com `action` e `status`', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { client } = comDois()

    await route({ supabase: client } as Deps, req('list', { method: 'GET' }))

    const linhas = spy.mock.calls.map(c => JSON.parse(String(c[0])))
    expect(linhas).toEqual([{ action: 'admin-users:list', status: 'ok', total: 2 }])
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------------------------
// USR-04..USR-08, USR-21 — criar um acesso
// ---------------------------------------------------------------------------------------------

/** Sem ninguém cadastrado com o e-mail pedido. `listUsers` vazio = endereço livre. */
const semDuplicata = { listedUsers: [] as any[] }

const criar = (body: Record<string, unknown>) => req('create', { body: JSON.stringify(body) })

const NOVO = { name: 'Ana Helena', email: 'ana@exemplo.invalid', password: 'segredo123' }

describe('admin-users — ?action=create', () => {
  it('USR-04: cria com e-mail JÁ CONFIRMADO e concede o papel admin', async () => {
    const { client, inserts, adminCalls } = comoAdmin({
      ...semDuplicata,
      createdUser: { id: ANA },
    })

    const res = await route({ supabase: client } as Deps, criar(NOVO))

    expect(res.status).toBe(201)
    const criacao = adminCalls.find(c => c.method === 'createUser')!
    // `email_confirm: true` é o que faz a pessoa entrar HOJE com a senha que a Adri definiu. Sem
    // ele a conta nasce pendente e ninguém descobre por quê.
    expect(criacao.attributes).toEqual({
      email: 'ana@exemplo.invalid',
      password: 'segredo123',
      email_confirm: true,
      user_metadata: { full_name: 'Ana Helena' },
    })
    expect(inserts).toEqual([{ table: 'user_roles', values: { user_id: ANA, role: 'admin' } }])
  })

  it('USR-04: o e-mail é NORMALIZADO antes de gravar', async () => {
    const { client, adminCalls } = comoAdmin({ ...semDuplicata, createdUser: { id: ANA } })

    await route({ supabase: client } as Deps, criar({ ...NOVO, email: '  Ana@Exemplo.INVALID ' }))

    expect(adminCalls.find(c => c.method === 'createUser')!.attributes!.email).toBe(
      'ana@exemplo.invalid',
    )
  })

  it.each([
    ['USR-21', { ...NOVO, name: '   ' }, 'Informe o nome de quem vai acessar'],
    ['USR-05', { ...NOVO, email: 'sem-arroba' }, 'E-mail inválido'],
    ['USR-06', { ...NOVO, password: 'abc' }, 'A senha precisa de pelo menos 6 caracteres'],
  ])('%s: recusa 400 ANTES de qualquer chamada externa', async (_id, body, motivo) => {
    const { client, inserts, adminCalls } = comoAdmin({ ...semDuplicata })

    const res = await route({ supabase: client } as Deps, criar(body))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: motivo })
    // A metade que importa: nada foi criado. Sem ela, um handler que validasse DEPOIS de
    // `createUser` passaria no status e teria deixado uma conta para trás.
    expect(adminCalls).toEqual([])
    expect(inserts).toEqual([])
  })

  it('USR-07: e-mail de quem JÁ É admin recusa dizendo que a pessoa já tem acesso', async () => {
    const { client, adminCalls } = comoAdmin({
      listedUsers: [{ id: ANA, email: 'ana@exemplo.invalid' }],
      rows: { user_roles: { id: 'papel-1' } },
    })

    const res = await route({ supabase: client } as Deps, criar(NOVO))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'Esta pessoa já tem acesso ao painel.' })
    expect(adminCalls.some(c => c.method === 'createUser')).toBe(false)
  })

  it('USR-07: e-mail de conta SEM acesso recusa sugerindo conceder à conta existente', async () => {
    // Os dois ramos têm remédios OPOSTOS — um não tem nada a fazer, o outro tem. Uma frase só para
    // os dois deixaria a Adri sem saber qual é o caso dela.
    const { client, adminCalls } = comoAdmin({
      listedUsers: [{ id: ANA, email: 'ana@exemplo.invalid' }],
      rows: { user_roles: null },
    })

    const res = await route({ supabase: client } as Deps, criar(NOVO))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error:
        'Já existe uma conta com este e-mail na loja. Em vez de criar outra, conceda o acesso a ela.',
    })
    expect(adminCalls.some(c => c.method === 'createUser')).toBe(false)
  })

  it('USR-07: a duplicata é detectada IGNORANDO caixa e espaço', async () => {
    const { client, adminCalls } = comoAdmin({
      listedUsers: [{ id: ANA, email: 'ANA@Exemplo.Invalid' }],
      rows: { user_roles: { id: 'papel-1' } },
    })

    const res = await route(
      { supabase: client } as Deps,
      criar({ ...NOVO, email: ' ana@exemplo.invalid ' }),
    )

    expect(res.status).toBe(409)
    expect(adminCalls.some(c => c.method === 'createUser')).toBe(false)
  })

  it('USR-08: papel não concedido, a conta recém-criada É APAGADA', async () => {
    // O caso que impede a conta órfã: pessoa que consegue entrar na LOJA, aparece em
    // /admin/clientes, e não tem acesso nenhum ao painel — criada por engano, sem ninguém saber.
    const { client, adminCalls } = comoAdmin({
      ...semDuplicata,
      createdUser: { id: ANA },
      insertError: { message: 'permission denied' },
    })

    const res = await route({ supabase: client } as Deps, criar(NOVO))

    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({
      error: 'Não foi possível conceder o acesso. Nada foi criado.',
    })
    expect(adminCalls).toContainEqual({ method: 'deleteUser', id: ANA, attributes: null })
  })

  it('USR-08: a compensação registra o id no log, para a órfã ser achável se ela também falhar', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { client } = comoAdmin({
      ...semDuplicata,
      createdUser: { id: ANA },
      insertError: { message: 'permission denied' },
    })

    await route({ supabase: client } as Deps, criar(NOVO))

    const linhas = spy.mock.calls.map(c => JSON.parse(String(c[0])))
    expect(linhas).toContainEqual(
      expect.objectContaining({ status: 'role_failed_rolled_back', user_id: ANA }),
    )
    spy.mockRestore()
  })

  it('falha do `createUser` NÃO tenta conceder papel nenhum', async () => {
    const { client, inserts } = comoAdmin({
      ...semDuplicata,
      adminErrors: { createUser: { message: 'gotrue down' } },
    })

    const res = await route({ supabase: client } as Deps, criar(NOVO))

    expect(res.status).toBe(502)
    expect(inserts).toEqual([])
  })

  it('USR-27: o log NUNCA carrega a senha em texto', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { client } = comoAdmin({ ...semDuplicata, createdUser: { id: ANA } })

    await route({ supabase: client } as Deps, criar(NOVO))

    expect(spy.mock.calls.map(c => String(c[0])).join('\n')).not.toContain('segredo123')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------------------------
// USR-28, USR-29 — editar
// ---------------------------------------------------------------------------------------------

describe('admin-users — ?action=update', () => {
  const editar = (body: Record<string, unknown>) => req('update', { body: JSON.stringify(body) })
  const EDICAO = { id: ANA, name: 'Ana H. Coelho', email: 'ana.nova@exemplo.invalid' }

  it('USR-28: grava o nome no GoTrue E na ficha de cliente — as duas telas do painel', async () => {
    const { client, updates, adminCalls } = comoAdmin({ ...semDuplicata, authUsers: USUARIOS })

    const res = await route({ supabase: client } as Deps, editar(EDICAO))

    expect(res.status).toBe(200)
    expect(adminCalls).toContainEqual({
      method: 'updateUserById',
      id: ANA,
      attributes: {
        email: 'ana.nova@exemplo.invalid',
        email_confirm: true,
        user_metadata: { full_name: 'Ana H. Coelho' },
      },
    })
    // A segunda metade. Sem ela, /admin/usuarios mostraria o nome novo e /admin/clientes o antigo —
    // a mesma pessoa, duas telas do mesmo painel, dois nomes.
    expect(updates).toContainEqual({
      table: 'customers',
      values: { name: 'Ana H. Coelho', email: 'ana.nova@exemplo.invalid' },
      eq: ['user_id', ANA],
    })
  })

  it('USR-29: e-mail que já pertence a OUTRA conta recusa sem escrever', async () => {
    const { client, updates, adminCalls } = comoAdmin({
      listedUsers: [{ id: ADRI, email: 'ana.nova@exemplo.invalid' }],
      authUsers: USUARIOS,
    })

    const res = await route({ supabase: client } as Deps, editar(EDICAO))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'Já existe outra conta com este e-mail.' })
    expect(adminCalls.some(c => c.method === 'updateUserById')).toBe(false)
    expect(updates).toEqual([])
  })

  it('USR-29: manter o PRÓPRIO e-mail não é duplicata', async () => {
    // O caso que uma régua ingênua quebra: editar só o nome reenvia o mesmo e-mail, que obviamente
    // "já existe" — na própria conta.
    const { client, adminCalls } = comoAdmin({
      listedUsers: [{ id: ANA, email: 'ana@exemplo.invalid' }],
      authUsers: USUARIOS,
    })

    const res = await route(
      { supabase: client } as Deps,
      editar({ id: ANA, name: 'Ana Helena Coelho', email: 'ana@exemplo.invalid' }),
    )

    expect(res.status).toBe(200)
    expect(adminCalls.some(c => c.method === 'updateUserById')).toBe(true)
  })

  it('a edição NÃO valida senha, porque ela não troca senha', async () => {
    // `password` ausente em `adminUserRefusal`. Se a edição exigisse senha, ou a tela pediria uma
    // que não usa, ou existiria uma segunda régua só para ela.
    const { client } = comoAdmin({ ...semDuplicata, authUsers: USUARIOS })

    const res = await route({ supabase: client } as Deps, editar(EDICAO))

    expect(res.status).toBe(200)
  })

  it('recusa 400 quando o id não é UUID', async () => {
    const { client, adminCalls } = comoAdmin({ ...semDuplicata })

    const res = await route({ supabase: client } as Deps, editar({ ...EDICAO, id: 'nao-e-uuid' }))

    expect(res.status).toBe(400)
    expect(adminCalls).toEqual([])
  })

  it('falha ao gravar a ficha de cliente sai no log como `ok_customer_desync`', async () => {
    // Não desfaz a troca no GoTrue: desfazer exigiria uma segunda escrita que também pode falhar. O
    // log é o que permite achar a divergência depois.
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { client } = comoAdmin({
      ...semDuplicata,
      authUsers: USUARIOS,
      updateError: { message: 'boom' },
    })

    await route({ supabase: client } as Deps, editar(EDICAO))

    const linhas = spy.mock.calls.map(c => JSON.parse(String(c[0])))
    expect(linhas).toContainEqual(expect.objectContaining({ status: 'ok_customer_desync' }))
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------------------------
// USR-13, USR-14, USR-15 — remover do painel
// ---------------------------------------------------------------------------------------------

describe('admin-users — ?action=revoke', () => {
  const remover = (id: string) => req('revoke', { body: JSON.stringify({ id }) })

  it('USR-13: apaga SÓ a linha de `user_roles` com role admin, e NÃO apaga a conta', async () => {
    const { client, deletes, adminCalls } = comoAdmin({ counts: { user_roles: 2 } })

    const res = await route({ supabase: client } as Deps, remover(ANA))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    // Os DOIS `.eq()`: sem o `role`, um dia em que a pessoa tenha outro papel, todos sumiriam.
    expect(deletes).toEqual([
      {
        table: 'user_roles',
        eq: [
          ['user_id', ANA],
          ['role', 'admin'],
        ],
      },
    ])
    // A conta fica. É a diferença entre "não administra mais" e "nunca existiu".
    expect(adminCalls.some(c => c.method === 'deleteUser')).toBe(false)
  })

  it('USR-14: remover a SI MESMA recusa, e não escreve nada', async () => {
    const { client, deletes } = comoAdmin({ counts: { user_roles: 5 } })

    const res = await route({ supabase: client } as Deps, remover(ADRI))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'Você não pode remover o seu próprio acesso. Peça a outra pessoa com acesso ao painel.',
    })
    expect(deletes).toEqual([])
  })

  it('USR-15: remover o ÚLTIMO admin recusa, e não escreve nada', async () => {
    const { client, deletes } = comoAdmin({ counts: { user_roles: 1 } })

    const res = await route({ supabase: client } as Deps, remover(ANA))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error:
        'Este é o único acesso ao painel. Crie outro antes de remover este — sem nenhum, ninguém entra.',
    })
    expect(deletes).toEqual([])
  })

  it('USR-15: a contagem ILEGÍVEL recusa, porque falha de leitura nunca vira permissão', async () => {
    const semContagem = createFakeSupabase({
      user: { id: ADRI },
      rpcByFn: { has_role: { data: true } },
    })
    const original = semContagem.client.from
    semContagem.client.from = (t: string) =>
      t === 'user_roles'
        ? {
            select: () => ({
              eq: () => Promise.resolve({ data: null, count: null, error: { message: 'boom' } }),
            }),
          }
        : original(t)

    const res = await route({ supabase: semContagem.client } as Deps, remover(ANA))

    expect(res.status).toBe(409)
    expect(semContagem.deletes).toEqual([])
  })

  it('USR-14 vence USR-15 quando os dois se aplicam — a recusa nomeia "seu próprio"', async () => {
    const { client } = comoAdmin({ counts: { user_roles: 1 } })

    const res = await route({ supabase: client } as Deps, remover(ADRI))

    await expect(res.json()).resolves.toEqual({
      error: 'Você não pode remover o seu próprio acesso. Peça a outra pessoa com acesso ao painel.',
    })
  })

  it('remover alguém que JÁ foi removido termina sem erro — duas abas, duas vezes', async () => {
    const { client } = comoAdmin({ counts: { user_roles: 2 } })

    const res = await route({ supabase: client } as Deps, remover(ANA))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it('recusa 400 quando o id não é UUID', async () => {
    const { client, deletes } = comoAdmin({ counts: { user_roles: 2 } })

    const res = await route(
      { supabase: client } as Deps,
      req('revoke', { body: JSON.stringify({ id: 'x' }) }),
    )

    expect(res.status).toBe(400)
    expect(deletes).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// USR-31..USR-34 — apagar a conta
// ---------------------------------------------------------------------------------------------

describe('admin-users — ?action=delete', () => {
  const apagar = (id: string) => req('delete', { body: JSON.stringify({ id }) })

  /** `user_roles` com 2 admins, e `customers` com ficha — o ponto de partida realista. */
  const semRastro = (counts: Record<string, number> = {}) =>
    comoAdmin({
      counts: {
        user_roles: 2,
        orders: 0,
        order_notes: 0,
        order_status_history: 0,
        customer_notes: 0,
        ...counts,
      },
      rows: { customers: { id: 'ficha-da-ana' } },
    })

  it('USR-31: conta SEM histórico é apagada', async () => {
    const { client, adminCalls } = semRastro()

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(adminCalls).toContainEqual({ method: 'deleteUser', id: ANA, attributes: null })
  })

  it.each([
    ['pedidos', 'orders', 7, '7 pedidos'],
    ['notas de pedido', 'order_notes', 3, '3 notas em pedidos'],
    ['mudancas de status', 'order_status_history', 5, '5 mudanças de status'],
    ['notas de cliente', 'customer_notes', 2, '2 notas sobre clientes'],
  ])('USR-32: %s bloqueiam, e a recusa NOMEIA com o número', async (_rotulo, tabela, n, trecho) => {
    // Um caso por origem, e não um bloco: ler a tabela errada produziria a mesma frase se os
    // quatro números fossem iguais. Aqui eles divergem de propósito.
    const { client, adminCalls } = semRastro({ [tabela as string]: n as number })

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    expect(res.status).toBe(409)
    const { error } = await res.json()
    expect(error).toContain(trecho)
    expect(error).toContain('Remover do painel')
    // Recusou ANTES — nada foi apagado.
    expect(adminCalls.some(c => c.method === 'deleteUser')).toBe(false)
  })

  it('USR-32: os pedidos são contados pela FICHA, não pelo id do usuário', async () => {
    // `orders.customer_id` aponta para `customers.id`, não para `auth.users.id`. Contar pelo id
    // errado devolveria zero sempre, e a recusa nunca dispararia por pedido.
    const { client } = comoAdmin({
      counts: { user_roles: 2, orders: 4 },
      rows: { customers: null },
    })

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    // Sem ficha, não há pedidos possíveis — e a conta é apagável.
    expect(res.status).toBe(200)
  })

  it('USR-33: `23503` vindo do banco é TRADUZIDO para a mesma frase', async () => {
    // O banco garante, a tela explica. Duas frases para a mesma parede fariam ela falar línguas
    // diferentes dependendo de por onde se bateu nela.
    // ─── A CORRIDA DE VERDADE ───
    //
    // Este é o único jeito de o ramo do `23503` ser alcançado em produção: a contagem vê zero, e um
    // pedido entra entre a leitura e o `deleteUser`. A primeira escrita deste caso deixava as quatro
    // contagens em zero o tempo TODO — então a releitura devolvia `null`, a resposta caía no literal
    // de fallback, e as duas asserções eram verdadeiras **nos dois mundos**: trocar a releitura por
    // `const relido = null` deixava a suíte verde.
    //
    // Aqui `orders` muda de 0 para 4 entre as duas leituras. A frase traduzida tem de trazer o
    // NÚMERO — que é o que `USR-32` exige e o que o fallback não sabe dizer.
    const comCorrida = comoAdmin({
      counts: { user_roles: 2, order_notes: 0, order_status_history: 0, customer_notes: 0 },
      rows: { customers: { id: 'ficha-da-ana' } },
      adminErrors: { deleteUser: { code: '23503', message: 'violates foreign key constraint' } },
    })

    let leiturasDePedido = 0
    const originalFrom = comCorrida.client.from
    comCorrida.client.from = (tabela: string) => {
      if (tabela !== 'orders') return originalFrom(tabela)
      leiturasDePedido += 1
      const total = leiturasDePedido === 1 ? 0 : 4
      return { select: () => ({ eq: () => Promise.resolve({ data: null, count: total, error: null }) }) }
    }

    const res = await route({ supabase: comCorrida.client } as Deps, apagar(ANA))

    expect(res.status).toBe(409)
    const { error } = await res.json()

    // As duas leituras aconteceram: a que liberou, e a que explicou.
    expect(leiturasDePedido).toBe(2)
    // O NÚMERO é o que separa a releitura do fallback. Sem ele, a parede fala duas línguas
    // dependendo de por onde se bateu nela.
    expect(error).toContain('4 pedidos')
    expect(error).toContain('Remover do painel')
  })

  it('USR-33: se a releitura TAMBÉM não achar nada, ainda assim recusa com saída', async () => {
    // O par do caso acima, e o motivo de o literal de fallback existir: a corrida pode ter sido por
    // uma tabela que a contagem nem conhece. Recusar sem número é pior que recusar com número, e
    // muito melhor que vazar um `23503` cru.
    const { client } = comoAdmin({
      counts: {
        user_roles: 2,
        orders: 0,
        order_notes: 0,
        order_status_history: 0,
        customer_notes: 0,
      },
      rows: { customers: { id: 'ficha-da-ana' } },
      adminErrors: { deleteUser: { code: '23503', message: 'violates foreign key constraint' } },
    })

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    expect(res.status).toBe(409)
    const { error } = await res.json()
    expect(error).toContain('Remover do painel')
    expect(error).not.toContain('23503')
  })

  it('erro que NÃO é de FK responde 502, e não a frase do histórico', async () => {
    const { client } = comoAdmin({
      counts: {
        user_roles: 2,
        orders: 0,
        order_notes: 0,
        order_status_history: 0,
        customer_notes: 0,
      },
      rows: { customers: { id: 'ficha-da-ana' } },
      adminErrors: { deleteUser: { message: 'gotrue down' } },
    })

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({
      error: 'Não foi possível apagar a conta agora. Tente de novo.',
    })
  })

  it('USR-34: apagar a SI MESMA recusa com a frase da AÇÃO, não a de remover', async () => {
    const { client, adminCalls } = semRastro()

    const res = await route({ supabase: client } as Deps, apagar(ADRI))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'Você não pode apagar a sua própria conta pelo painel.',
    })
    expect(adminCalls).toEqual([])
  })

  it('USR-34: apagar o ÚLTIMO admin recusa', async () => {
    const { client, adminCalls } = semRastro({ user_roles: 1 })

    const res = await route({ supabase: client } as Deps, apagar(ANA))

    expect(res.status).toBe(409)
    expect(adminCalls).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// USR-18, USR-30 — reenviar o link de senha
// ---------------------------------------------------------------------------------------------

describe('admin-users — ?action=reset-password', () => {
  const enviar = (body: Record<string, unknown>) =>
    req('reset-password', { body: JSON.stringify(body) })

  it('USR-18: dispara o e-mail para o endereço da conta, e devolve qual foi', async () => {
    const { client } = comoAdmin({ authUsers: USUARIOS })

    const res = await route({ supabase: client } as Deps, enviar({ id: ANA }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, email: 'ana@exemplo.invalid' })
  })

  it('USR-18: o e-mail vem do ID, e o do CORPO é ignorado', async () => {
    // A régua de segurança desta ação. Aceitar o endereço de quem chamou faria desta porta um jeito
    // de mandar código de recuperação de uma conta do painel para um endereço arbitrário.
    const { client, adminCalls } = comoAdmin({ authUsers: USUARIOS })

    const res = await route(
      { supabase: client } as Deps,
      enviar({ id: ANA, email: 'atacante@exemplo.invalid' }),
    )

    await expect(res.json()).resolves.toEqual({ ok: true, email: 'ana@exemplo.invalid' })
    const envio = adminCalls.find(c => c.attributes && 'resetFor' in (c.attributes as any))!
    expect((envio.attributes as any).resetFor).toBe('ana@exemplo.invalid')
  })

  it('USR-30: rate limit do GoTrue responde RECUSA, e nunca `{ ok: true }`', async () => {
    // Dizer "enviado" sobre um envio recusado faria a Adri esperar um e-mail que não vem.
    const { client } = comoAdmin({ authUsers: USUARIOS })
    client.auth.resetPasswordForEmail = async () => ({
      data: null,
      error: { code: 'over_email_send_rate_limit', message: 'rate limited' },
    })

    const res = await route({ supabase: client } as Deps, enviar({ id: ANA }))

    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({ error: 'Aguarde alguns segundos para reenviar' })
  })

  it('falha genérica de envio tem frase PRÓPRIA, distinta do rate limit', async () => {
    const { client } = comoAdmin({ authUsers: USUARIOS })
    client.auth.resetPasswordForEmail = async () => ({
      data: null,
      error: { message: 'smtp down' },
    })

    const res = await route({ supabase: client } as Deps, enviar({ id: ANA }))

    expect(res.status).toBe(502)
    await expect(res.json()).resolves.toEqual({
      error: 'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.',
    })
  })

  it('conta inexistente responde 404 e NÃO tenta enviar', async () => {
    const { client, adminCalls } = comoAdmin({ authUsers: {} })

    const res = await route({ supabase: client } as Deps, enviar({ id: ANA }))

    expect(res.status).toBe(404)
    expect(adminCalls.some(c => c.attributes && 'resetFor' in (c.attributes as any))).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// A porta fechada vale para TODA ação — não só para `list`
// ---------------------------------------------------------------------------------------------

describe('admin-users — toda ação exige admin', () => {
  it.each(['create', 'update', 'revoke', 'delete', 'reset-password'])(
    '`%s` sem papel admin responde 403 e não escreve nada',
    async action => {
      const { client, inserts, updates, deletes, adminCalls } = createFakeSupabase({
        user: { id: ANA },
        rpcByFn: { has_role: { data: false } },
      })

      const res = await route(
        { supabase: client } as Deps,
        req(action, { body: JSON.stringify({ id: ADRI, ...NOVO }) }),
      )

      expect(res.status).toBe(403)
      expect([...inserts, ...updates, ...deletes, ...adminCalls]).toEqual([])
    },
  )
})
