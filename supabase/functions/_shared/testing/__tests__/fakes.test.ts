import { describe, expect, it } from 'vitest'
import { createFakeSupabase } from '../fakes.ts'

// Só o que a T3 acrescentou aos dublês tem teste próprio: `rpcByFn`. O resto da superfície
// (`fetch`, builder de query) já é exercitado de ponta a ponta pelos 93 testes da `mercado-pago`, e
// duplicar aqui seria testar o harness em vez da feature.
describe('createFakeSupabase — rpcByFn discrimina por nome de função', () => {
  it('devolve resultados DIFERENTES para RPCs distintas no mesmo fluxo', async () => {
    const { client, rpcs } = createFakeSupabase({
      rpcByFn: {
        has_role: { data: true },
        claim_order_email: { data: null },
      },
    })

    // "é admin" E "já foi enviado" — o cenário que um resultado único não consegue montar.
    await expect(client.rpc('has_role', { _user_id: 'u1', _role: 'admin' })).resolves.toEqual({
      data: true,
      error: null,
    })
    await expect(client.rpc('claim_order_email', { p_order_id: 'o1' })).resolves.toEqual({
      data: null,
      error: null,
    })

    expect(rpcs.map((r) => r.fn)).toEqual(['has_role', 'claim_order_email'])
  })

  it('rpcByFn vence rpc para a função nomeada, e rpc atende as demais', async () => {
    const { client } = createFakeSupabase({
      rpc: { data: 'fallback' },
      rpcByFn: { claim_order_email: { data: 'especifico' } },
    })

    expect((await client.rpc('claim_order_email', {})).data).toBe('especifico')
    expect((await client.rpc('finish_order_email', {})).data).toBe('fallback')
  })

  it('propaga error por nome sem afetar as outras RPCs', async () => {
    const { client } = createFakeSupabase({
      rpcByFn: { claim_order_email: { error: { message: 'boom' } }, has_role: { data: true } },
    })

    expect((await client.rpc('claim_order_email', {})).error).toEqual({ message: 'boom' })
    expect((await client.rpc('has_role', {})).error).toBeNull()
  })

  it('sem rpcByFn nem rpc, toda RPC devolve data null — comportamento anterior preservado', async () => {
    const { client } = createFakeSupabase()

    expect(await client.rpc('qualquer_uma', {})).toEqual({ data: null, error: null })
  })

  it('registra args de cada chamada, para os testes asseverarem o payload da RPC', async () => {
    const { client, rpcs } = createFakeSupabase({ rpcByFn: { claim_order_email: { data: 'row-1' } } })

    await client.rpc('claim_order_email', { p_order_id: 'o1', p_type: 'order_paid' })

    expect(rpcs[0]).toEqual({
      fn: 'claim_order_email',
      args: { p_order_id: 'o1', p_type: 'order_paid' },
    })
  })
})

// ---------------------------------------------------------------------------------------------
// Feature 48 — a superfície de `auth.admin.*` e as três operações de escrita que faltavam.
//
// Mesma régua do bloco acima: só o que a feature ACRESCENTOU tem teste próprio. O que justifica
// testar o dublê aqui é que estes ramos decidem vereditos de segurança nos handlers — "zero
// chamadas num caminho de recusa" é uma asserção sobre `adminCalls`, e um `adminCalls` que nunca
// enche tornaria TODA essa família de teste um no-op verde.
// ---------------------------------------------------------------------------------------------

describe('createFakeSupabase — auth.admin', () => {
  it('registra a chamada mesmo quando o método FALHA — é o que separa recusa de erro', async () => {
    const { client, adminCalls } = createFakeSupabase({
      adminErrors: { deleteUser: { message: 'boom' } },
    })

    const { error } = await client.auth.admin.deleteUser('u1')

    expect(error).toEqual({ message: 'boom' })
    // Registrar depois do erro faria "recusei antes de chamar" e "chamei e deu erro" ficarem
    // indistinguíveis — e os dois desfechos têm consequências opostas no handler.
    expect(adminCalls).toEqual([{ method: 'deleteUser', id: 'u1', attributes: null }])
  })

  it('`getUserById` devolve a fixture por id, e erro quando o id não existe', async () => {
    const { client } = createFakeSupabase({
      authUsers: { u1: { id: 'u1', email: 'a@b.invalid' } },
    })

    await expect(client.auth.admin.getUserById('u1')).resolves.toEqual({
      data: { user: { id: 'u1', email: 'a@b.invalid' } },
      error: null,
    })

    const ausente = await client.auth.admin.getUserById('u9')
    expect(ausente.data.user).toBeNull()
    expect(ausente.error).not.toBeNull()
  })

  it('`createUser` guarda os ATRIBUTOS enviados — é sobre eles que os handlers asseveram', async () => {
    const { client, adminCalls } = createFakeSupabase({ createdUser: { id: 'novo' } })

    const { data } = await client.auth.admin.createUser({
      email: 'a@b.invalid',
      password: 'segredo',
      email_confirm: true,
    })

    expect(data.user).toEqual({ id: 'novo' })
    expect(adminCalls[0].attributes).toEqual({
      email: 'a@b.invalid',
      password: 'segredo',
      email_confirm: true,
    })
  })

  it('`updateUserById` guarda id e atributos separadamente', async () => {
    const { client, adminCalls } = createFakeSupabase({})

    await client.auth.admin.updateUserById('u1', { email: 'novo@b.invalid' })

    expect(adminCalls).toEqual([
      { method: 'updateUserById', id: 'u1', attributes: { email: 'novo@b.invalid' } },
    ])
  })
})

describe('createFakeSupabase — insert, delete e contagem', () => {
  it('`insert` registra a tabela e os valores, e honra `insertError`', async () => {
    const bom = createFakeSupabase({})
    await bom.client.from('user_roles').insert({ user_id: 'u1', role: 'admin' })
    expect(bom.inserts).toEqual([{ table: 'user_roles', values: { user_id: 'u1', role: 'admin' } }])

    const ruim = createFakeSupabase({ insertError: { message: 'falhou' } })
    const { error } = await ruim.client.from('user_roles').insert({ user_id: 'u1', role: 'admin' })
    expect(error).toEqual({ message: 'falhou' })
    // Registrou mesmo falhando — o handler precisa saber que TENTOU para poder compensar.
    expect(ruim.inserts).toHaveLength(1)
  })

  it('`delete` guarda TODOS os `.eq()`, não só o último', async () => {
    // `revoke` escopa por `user_id` E por `role`: guardar só o último faria um delete que apaga
    // todos os papéis da pessoa passar como se apagasse só o de admin.
    const { client, deletes } = createFakeSupabase({})

    await client.from('user_roles').delete().eq('user_id', 'u1').eq('role', 'admin')

    expect(deletes).toEqual([
      { table: 'user_roles', eq: [['user_id', 'u1'], ['role', 'admin']] },
    ])
  })

  it('`select(..., { head: true })` devolve `count` por tabela, sem linha', async () => {
    const { client } = createFakeSupabase({ counts: { orders: 7, order_notes: 3 } })

    const pedidos = await client.from('orders').select('id', { count: 'exact', head: true })
    const notas = await client.from('order_notes').select('id', { count: 'exact', head: true })
    const semFixture = await client.from('customer_notes').select('id', { count: 'exact', head: true })

    expect(pedidos).toEqual({ data: null, count: 7, error: null })
    expect(notas).toEqual({ data: null, count: 3, error: null })
    expect(semFixture.count).toBe(0)
  })

  it('`select` SEM `head` continua devolvendo lista — o comportamento antigo não mudou', async () => {
    const { client } = createFakeSupabase({ lists: { order_items: [{ id: 'i1' }] } })

    await expect(client.from('order_items').select('*')).resolves.toEqual({
      data: [{ id: 'i1' }],
      error: null,
    })
  })
})
