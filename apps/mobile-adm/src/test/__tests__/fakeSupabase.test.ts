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

// Feature `74` · T11 — o dublê registra a CADEIA inteira de uma leitura de tabela (R9, `L-060`). Sem
// isto, "o recorte é só a regra de `core`" seria uma asserção sobre um dublê que não vê os filtros
// (memória "dublê que não enxerga torna a regra inauditável").
describe('tabelas de dado', () => {
  it('registra a cadeia inteira, na ordem exata, com as opções do select', async () => {
    fake.responderTabela('order_list', { data: [{ id: 'a' }], error: null, count: 7 })
    const r = await fake.client
      .from('order_list')
      .select('id, status', { count: 'exact' })
      .or('status.eq.paid')
      .in('status', ['paid', 'separating'])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(25)
    expect(r).toEqual({ data: [{ id: 'a' }], error: null, count: 7 })
    expect(fake.cadeiasDe('order_list')).toEqual([
      [
        { metodo: 'select', args: ['id, status', { count: 'exact' }] },
        { metodo: 'or', args: ['status.eq.paid'] },
        { metodo: 'in', args: ['status', ['paid', 'separating']] },
        { metodo: 'order', args: ['created_at', { ascending: true }] },
        { metodo: 'order', args: ['id', { ascending: true }] },
        { metodo: 'limit', args: [25] },
      ],
    ])
  })

  it('um filtro a mais aparece na cadeia (a régua é a igualdade, não a presença)', async () => {
    fake.responderTabela('order_list', { data: [], error: null })
    await fake.client.from('order_list').select('id').neq('status', 'cancelled').limit(25)
    expect(fake.cadeiasDe('order_list')[0].map((e) => e.metodo)).toEqual(['select', 'neq', 'limit'])
  })

  it('`maybeSingle` encerra a cadeia e devolve a resposta configurada', async () => {
    fake.responderTabela('order_list', (cadeia) => ({
      data: cadeia.some((e) => e.metodo === 'eq' && e.args[1] === 'x') ? { id: 'x' } : null,
      error: null,
    }))
    expect(await fake.client.from('order_list').select('id').eq('id', 'x').maybeSingle()).toEqual({ data: { id: 'x' }, error: null })
    expect(await fake.client.from('order_list').select('id').eq('id', 'y').maybeSingle()).toEqual({ data: null, error: null })
    expect(fake.cadeiasDe('order_list')[0].at(-1)).toEqual({ metodo: 'maybeSingle', args: [] })
  })

  it('uma tabela sem resposta configurada LANÇA — nunca devolve `[]` em silêncio', () => {
    expect(() => fake.client.from('order_items')).toThrow('a tabela "order_items" não tem resposta configurada')
  })

  it('falha (`{ error }`, sem rejeitar) e pendura UMA tabela sem pendurar a outra', async () => {
    vi.useFakeTimers()
    fake.falharTabela('order_notes', { message: 'x', code: '500' })
    fake.pendurarTabela('order_items')
    let respondeu = false
    void Promise.resolve(fake.client.from('order_items').select('id')).then(() => (respondeu = true))
    const notas = await fake.client.from('order_notes').select('id')
    await vi.advanceTimersByTimeAsync(60_000)
    vi.useRealTimers()
    expect(respondeu).toBe(false)
    expect(notas).toEqual({ data: null, error: { message: 'x', code: '500' } })
  })

  it('a resposta pode depender do número da leitura', async () => {
    fake.responderTabela('order_list', (_c, n) => ({ data: n, error: null }))
    await fake.client.from('order_list').select('id')
    expect((await fake.client.from('order_list').select('id')).data).toBe(2)
  })

  it('o papel e o cadastro continuam no caminho do AuthProvider (não exigem resposta)', async () => {
    expect(await fake.client.from('user_roles').select('role').eq('user_id', 'u').eq('role', 'admin').maybeSingle()).toEqual({
      data: null,
      error: null,
    })
  })

  it('o reset apaga respostas e cadeias', async () => {
    fake.responderTabela('order_list', { data: [], error: null })
    await fake.client.from('order_list').select('id')
    fake.reset()
    expect(fake.cadeiasDe('order_list')).toEqual([])
    expect(() => fake.client.from('order_list')).toThrow()
  })
})
