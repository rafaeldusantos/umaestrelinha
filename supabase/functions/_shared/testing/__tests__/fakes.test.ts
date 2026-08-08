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
