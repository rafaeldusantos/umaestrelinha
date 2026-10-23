// Feature `73` · T10 — o dublê ENXERGA o que as réguas da Início leem (design R8,
// `duble-que-nao-enxerga`). Sem isto, "uma chamada, sem argumento" e "um canal, fechado ao sair"
// seriam asserções sobre um dublê que não registra nada.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'

beforeEach(() => fake.reset())

describe('rpc', () => {
  it('registra o nome E os argumentos de cada chamada', async () => {
    await fake.client.rpc('store_overview')
    await fake.client.rpc('store_overview', { p_agora: '2026-10-22T12:00:00Z' })
    expect(fake.chamadasDe('store_overview')).toEqual([
      { nome: 'store_overview', args: [] },
      { nome: 'store_overview', args: [{ p_agora: '2026-10-22T12:00:00Z' }] },
    ])
  })

  it('responde por RPC: dado, `{ error }` (sem rejeitar) e por chamada', async () => {
    fake.responderRpc('store_movement', { hoje: '2026-10-22' })
    fake.falharRpc('store_overview', { message: 'x', code: '42501' })
    expect(await fake.client.rpc('store_movement')).toEqual({ data: { hoje: '2026-10-22' }, error: null })
    expect(await fake.client.rpc('store_overview')).toEqual({ data: null, error: { message: 'x', code: '42501' } })

    fake.aoChamarRpc('store_movement', (n) => ({ data: n, error: null }))
    expect((await fake.client.rpc('store_movement')).data).toBe(2)
  })

  it('pendura UMA RPC sem pendurar a outra', async () => {
    vi.useFakeTimers()
    fake.pendurarRpc('store_overview')
    let respondeu = false
    void fake.client.rpc('store_overview').then(() => (respondeu = true))
    const outra = await fake.client.rpc('store_movement')
    await vi.advanceTimersByTimeAsync(60_000)
    vi.useRealTimers()
    expect(respondeu).toBe(false)
    expect(outra).toEqual({ data: null, error: null })
  })

  it('o reset apaga comportamentos e chamadas', async () => {
    fake.falharRpc('store_movement', { message: 'x' })
    await fake.client.rpc('store_movement')
    fake.reset()
    expect(fake.chamadasDe('store_movement')).toEqual([])
    expect(await fake.client.rpc('store_movement')).toEqual({ data: null, error: null })
  })
})

describe('channel', () => {
  it('registra o nome, a inscrição em `postgres_changes` e o fechamento', async () => {
    const canal = fake.client
      .channel('atelie-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {})
      .subscribe()
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual(['atelie-orders-realtime'])
    expect(canal.inscricoes[0].filtro).toEqual({ event: '*', schema: 'public', table: 'orders' })

    await fake.client.removeChannel(canal)
    expect(fake.canaisAbertos()).toEqual([])
    expect(fake.client.removeChannel).toHaveBeenCalledWith(canal)
  })

  it('`emitir` chama só os canais abertos inscritos na tabela', async () => {
    const aviso = vi.fn()
    const outra = vi.fn()
    const aberto = fake.client.channel('a').on('postgres_changes', { table: 'orders' }, aviso).subscribe()
    fake.client.channel('b').on('postgres_changes', { table: 'customers' }, outra).subscribe()
    fake.client.channel('nao-inscrito').on('postgres_changes', { table: 'orders' }, outra)

    expect(fake.emitir('orders', { eventType: 'INSERT' })).toBe(1)
    expect(aviso).toHaveBeenCalledWith({ eventType: 'INSERT' })
    expect(outra).not.toHaveBeenCalled()

    await fake.client.removeChannel(aberto)
    expect(fake.emitir('orders')).toBe(0)
    expect(aviso).toHaveBeenCalledTimes(1)
  })
})
