// Feature `75` · T14 — os dois arneses ENXERGAM a escrita (memória "dublê que não enxerga torna a
// regra inauditável", `L-055`). Sem isto, "o app grava com a guarda de status" e "zero escritas"
// seriam asserções sobre dublês que não registram nada — verdadeiras nos dois mundos.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { real } from '@/test/clientReal'

beforeEach(() => fake.reset())

describe('fakeSupabase — escrita registrada', () => {
  it('registra o comando, os VALORES e cada filtro depois dele, na ordem', async () => {
    fake.filaDeEscrita('orders', { data: [{ id: 'o-1' }], error: null })
    const r = await fake.client
      .from('orders')
      .update({ status: 'separating' })
      .eq('id', 'o-1')
      .eq('status', 'paid')
      .select('id')
    expect(r).toEqual({ data: [{ id: 'o-1' }], error: null })
    expect(fake.escritasDe('orders')).toEqual([
      {
        tabela: 'orders',
        comando: 'update',
        valores: [{ status: 'separating' }],
        cadeia: [
          { metodo: 'eq', args: ['id', 'o-1'] },
          { metodo: 'eq', args: ['status', 'paid'] },
          { metodo: 'select', args: ['id'] },
        ],
      },
    ])
  })

  it('ENXERGA o filtro trocado: a guarda de status por `in` aparece diferente da por `eq`', async () => {
    fake.filaDeEscrita('orders', { data: [], error: null }, { data: [], error: null })
    await fake.client.from('orders').update({ tracking_code: 'AB123456' }).eq('id', 'o-1').in('status', ['shipped']).select('id')
    await fake.client.from('orders').update({ tracking_code: 'AB123456' }).eq('id', 'o-1').eq('status', 'shipped').select('id')
    const [a, b] = fake.escritasDe('orders')
    expect(a.cadeia[1]).toEqual({ metodo: 'in', args: ['status', ['shipped']] })
    expect(b.cadeia[1]).toEqual({ metodo: 'eq', args: ['status', 'shipped'] })
    expect(a.cadeia).not.toEqual(b.cadeia)
  })

  it('`insert`, `upsert` e `delete` também são registrados, e o `insert` sem filtro responde ao ser aguardado', async () => {
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeEscrita('outra', { data: null, error: null }, { data: null, error: null })
    await fake.client.from('order_status_history').insert({ order_id: 'o-1', to_status: 'shipped' })
    await fake.client.from('outra').upsert({ id: 1 })
    await fake.client.from('outra').delete().eq('id', 1)
    expect(fake.escritasDe('order_status_history')[0]).toMatchObject({ comando: 'insert', valores: [{ order_id: 'o-1', to_status: 'shipped' }], cadeia: [] })
    expect(fake.escritasDe('outra').map((e) => e.comando)).toEqual(['upsert', 'delete'])
  })

  it('a fila responde UMA resposta por escrita, na ordem', async () => {
    fake.filaDeEscrita('orders', { data: [{ id: 'o-1' }], error: null }, { data: [], error: null }, { data: null, error: { message: 'x' } })
    const respostas = []
    for (let i = 0; i < 3; i++) respostas.push(await fake.client.from('orders').update({ status: 'shipped' }).eq('id', 'o-1').select('id'))
    expect(respostas).toEqual([
      { data: [{ id: 'o-1' }], error: null },
      { data: [], error: null },
      { data: null, error: { message: 'x' } },
    ])
  })

  it('a fila que ESGOTA lança e fica registrada — "zero escritas" nunca é verdade por silêncio', async () => {
    fake.filaDeEscrita('orders', { data: [{ id: 'o-1' }], error: null })
    await fake.client.from('orders').update({ status: 'shipped' }).eq('id', 'o-1').select('id')
    await expect(fake.client.from('orders').update({ status: 'shipped' }).eq('id', 'o-1').select('id')).rejects.toThrow(/esgotou/)
    expect(fake.esgotamentos()).toEqual(['update orders'])
  })

  it('a tabela sem fila nem leitura LANÇA na hora (como na `74`); com só a fila de escrita, LER dela rejeita', async () => {
    expect(() => fake.client.from('orders')).toThrow(/não tem resposta configurada/)
    fake.filaDeEscrita('orders', { data: [], error: null })
    await expect(fake.client.from('orders').select('id').eq('id', 'o-1')).rejects.toThrow(/LEITURA/)
  })

  it('leitura e escrita da MESMA tabela respondem cada uma da sua fonte', async () => {
    fake.responderTabela('orders', { data: [{ id: 'o-1', status: 'paid' }], error: null })
    fake.filaDeEscrita('orders', { data: [], error: null })
    const lida = await fake.client.from('orders').select('id,status').eq('id', 'o-1')
    const escrita = await fake.client.from('orders').update({ status: 'separating' }).eq('id', 'o-1').select('id')
    expect(lida.data).toEqual([{ id: 'o-1', status: 'paid' }])
    expect(escrita.data).toEqual([])
    expect(fake.log()).toEqual(['select orders', 'update orders'])
  })

  it('a resposta da fila pode SEGURAR (função que devolve promessa)', async () => {
    let soltar: (v: { data: unknown; error: null }) => void = () => {}
    fake.filaDeEscrita('orders', () => new Promise((r) => (soltar = r)))
    let respondeu = false
    const p = fake.client.from('orders').update({ status: 'shipped' }).eq('id', 'o-1').select('id').then(() => (respondeu = true))
    await Promise.resolve()
    expect(respondeu).toBe(false)
    soltar({ data: [{ id: 'o-1' }], error: null })
    await p
    expect(respondeu).toBe(true)
  })
})

describe('fakeSupabase — RPC em fila e functions.invoke', () => {
  it('`filaRpc` responde por chamada, na ordem, e a chamada a mais LANÇA (síncrona) e é registrada', async () => {
    fake.filaRpc('set_material_status', { data: { ok: true }, error: null }, { data: { ok: false, reason: 'not_admin' }, error: null })
    expect((await fake.client.rpc('set_material_status', { p_order_id: 'o-1', p_status: 'material_recebido' })).data).toEqual({ ok: true })
    expect((await fake.client.rpc('set_material_status', { p_order_id: 'o-1', p_status: 'material_recebido' })).data).toEqual({ ok: false, reason: 'not_admin' })
    expect(() => fake.client.rpc('set_material_status', {})).toThrow(/esgotou/)
    expect(fake.esgotamentos()).toEqual(['rpc set_material_status'])
    expect(fake.chamadasDe('set_material_status')[0].args).toEqual([{ p_order_id: 'o-1', p_status: 'material_recebido' }])
  })

  it('`functions.invoke` registra o nome e o corpo, responde da fila, e a invocação sem resposta LANÇA', async () => {
    fake.filaDeInvocacao('send-notification?action=trigger', { data: { sent: true }, error: null })
    const r = await fake.client.functions.invoke('send-notification?action=trigger', { body: { order_id: 'o-1', trigger: 'order_status_changed' } })
    expect(r).toEqual({ data: { sent: true }, error: null })
    expect(fake.invocacoesDe('send-notification?action=trigger')).toEqual([
      { nome: 'send-notification?action=trigger', opcoes: { body: { order_id: 'o-1', trigger: 'order_status_changed' } } },
    ])
    await expect(fake.client.functions.invoke('send-notification?action=trigger', {})).rejects.toThrow(/esgotou/)
    expect(fake.esgotamentos()).toEqual(['invoke send-notification?action=trigger'])
  })

  it('o `log` é a ordem global das idas ao banco', async () => {
    fake.filaDeEscrita('orders', { data: [{ id: 'o-1' }], error: null })
    fake.filaDeEscrita('order_status_history', { data: null, error: null })
    fake.filaDeInvocacao('send-notification?action=trigger', { data: { sent: false }, error: null })
    await fake.client.from('orders').update({ status: 'delivered' }).eq('id', 'o-1').select('id')
    await fake.client.from('order_status_history').insert({})
    await fake.client.functions.invoke('send-notification?action=trigger', {})
    await fake.client.rpc('atelie_clock')
    expect(fake.log()).toEqual(['update orders', 'insert order_status_history', 'invoke send-notification?action=trigger', 'rpc atelie_clock'])
  })

  it('a RPC sem fila continua como na `73` (`{ data: null }`), e o reset apaga filas, escritas e esgotamentos', async () => {
    expect(await fake.client.rpc('store_overview')).toEqual({ data: null, error: null })
    fake.filaDeEscrita('orders', { data: [], error: null })
    await fake.client.from('orders').update({}).eq('id', 'x').select('id')
    await expect(fake.client.from('orders').update({}).select('id')).rejects.toThrow()
    fake.reset()
    expect(fake.escritasDe('orders')).toEqual([])
    expect(fake.esgotamentos()).toEqual([])
    expect(fake.log()).toEqual([])
    expect(fake.client.functions.invoke).not.toHaveBeenCalled()
    expect(() => fake.client.from('orders')).toThrow()
  })
})

describe('clientReal — resposta por MÉTODO na mesma tabela', () => {
  afterEach(() => {
    real.atual = null
  })

  it('o PATCH e o GET de `orders` respondem diferente, e o PATCH leva o corpo e os filtros', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      tabelas: {
        orders: {
          porMetodo: {
            GET: { status: 200, corpo: [{ id: 'o-1', status: 'paid' }] },
            PATCH: { status: 200, corpo: [] },
          },
        },
      },
    })
    const lida = await r.client.from('orders').select('id,status').eq('id', 'o-1')
    const escrita = await r.client.from('orders').update({ status: 'separating' }).eq('id', 'o-1').eq('status', 'paid').select('id')
    expect(lida.data).toEqual([{ id: 'o-1', status: 'paid' }])
    expect(escrita.data).toEqual([])
    expect(escrita.error).toBeNull()

    const [patch] = r.chamadasDe('PATCH', '/rest/v1/orders')
    expect(patch.corpo).toEqual({ status: 'separating' })
    expect(new URLSearchParams(patch.busca).getAll('id')).toEqual(['eq.o-1'])
    expect(new URLSearchParams(patch.busca).getAll('status')).toEqual(['eq.paid'])
    expect(r.chamadasDe('GET', '/rest/v1/orders')).toHaveLength(1)
  })

  it('o PATCH em 500 é erro (nunca recusa), e o método sem entrada responde `[]`', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      tabelas: { orders: { porMetodo: { PATCH: { status: 500, corpo: { message: 'boom', code: 'XX000' } } } } },
    })
    const escrita = await r.client.from('orders').update({ status: 'shipped' }).eq('id', 'o-1').select('id')
    expect(escrita.error).toMatchObject({ code: 'XX000' })
    const lida = await r.client.from('orders').select('id')
    expect(lida.data).toEqual([])
  })

  it('a entrada simples (sem `porMetodo`) continua valendo para todo método, como na `74`', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', tabelas: { order_list: { status: 200, corpo: [{ id: 'o-9' }] } } })
    expect((await r.client.from('order_list').select('id')).data).toEqual([{ id: 'o-9' }])
    expect((await r.client.from('order_list').update({ x: 1 }).select('id')).data).toEqual([{ id: 'o-9' }])
  })
})
