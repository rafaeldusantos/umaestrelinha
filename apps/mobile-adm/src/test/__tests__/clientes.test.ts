// Feature `76` · T14 — o arnês enxerga o que as réguas da lista de clientes leem (`duble-que-nao-enxerga`):
// a cadeia inteira das leituras de `customer_list`, `order_list`, `order_items` e `customer_directory`
// (cada `or`, `gte`, `not`, `order`, `limit`), e a tabela sem resposta configurada LANÇA. As fixturas têm
// as chaves EXATAS das listas de colunas (`AD-012`): o probe 01 confere essas chaves contra o banco.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COLUNAS_DA_CIDADE,
  COLUNAS_DA_FICHA,
  COLUNAS_DA_LISTA,
  COLUNAS_DO_ACHADO,
  COLUNAS_DO_PEDIDO,
  COLUNAS_DOS_ITENS,
} from '@/entities/customer/model/linha'
import { fake } from '@/test/fakeSupabase'
import { real } from '@/test/clientReal'
import {
  COM_CONTA,
  COM_SUBLINHADO,
  CONVIDADA,
  EMAIL_LONGO,
  SEM_NOME,
  SEM_TELEFONE,
  cliente,
  fichaDeCliente,
  ilikeDoPostgres,
  listaDeClientes,
  pedidoDaFicha,
} from '@/test/clientes'

const chaves = (o: object) => Object.keys(o).sort()
const colunas = (lista: string) => lista.split(',').map((c) => c.trim()).sort()

beforeEach(() => fake.reset())
afterEach(() => vi.useRealTimers())

describe('as fixturas têm as chaves EXATAS das colunas (AD-012)', () => {
  it('cliente() = COLUNAS_DA_LISTA', () => expect(chaves(cliente())).toEqual(colunas(COLUNAS_DA_LISTA)))
  it('fichaDeCliente() = COLUNAS_DA_FICHA', () => expect(chaves(fichaDeCliente())).toEqual(colunas(COLUNAS_DA_FICHA)))
  it('pedidoDaFicha() = COLUNAS_DO_PEDIDO + o item que a janela acrescenta', () =>
    expect(chaves(pedidoDaFicha())).toEqual([...colunas(COLUNAS_DO_PEDIDO), 'item'].sort()))

  it('âncora: as listas de colunas têm o tamanho do banco medido pelo probe', () => {
    expect(colunas(COLUNAS_DA_LISTA)).toHaveLength(10)
    expect(colunas(COLUNAS_DA_FICHA)).toHaveLength(10)
    expect(colunas(COLUNAS_DO_PEDIDO)).toHaveLength(8)
    expect(colunas(COLUNAS_DOS_ITENS)).toEqual(['order_id', 'product_name'])
    expect(colunas(COLUNAS_DA_CIDADE)).toEqual(['address_city', 'address_state'])
    expect(colunas(COLUNAS_DO_ACHADO)).toEqual(['id'])
  })

  it('listaDeClientes(n): n ids distintos, em ordem decrescente de atividade, com µs', () => {
    const lista = listaDeClientes(30)
    expect(lista).toHaveLength(30)
    expect(new Set(lista.map((c) => c.id)).size).toBe(30)
    expect(lista[0].last_activity_at).toMatch(/\.\d{6}\+00:00$/)
  })

  it('as fixturas nomeadas cobrem os casos de borda', () => {
    expect(SEM_NOME.name).toBeNull()
    expect(SEM_TELEFONE.phone).toBeNull()
    expect(EMAIL_LONGO.email.length).toBeGreaterThan(60)
    expect(COM_SUBLINHADO.email).toContain('_')
    expect(COM_CONTA.orders_open).toBe(1)
    expect(CONVIDADA.orders_paid).toBe(1)
    expect(new Set([COM_CONTA, CONVIDADA, SEM_NOME, SEM_TELEFONE, EMAIL_LONGO, COM_SUBLINHADO].map((c) => c.id)).size).toBe(6)
  })
})

describe('o dublê registra a cadeia inteira das leituras de cliente', () => {
  it.each(['customer_list', 'order_list', 'order_items', 'customer_directory'])('%s: cada elo, na ordem, com os argumentos', async (tabela) => {
    fake.responderTabela(tabela, { data: [], error: null, count: 0 })
    await fake.client
      .from(tabela)
      .select('id', { count: 'exact' })
      .gte('orders_paid', 2)
      .or('name.ilike."%a%"')
      .not('address_city', 'is', null)
      .in('order_id', ['x'])
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(25)
    expect(fake.cadeiasDe(tabela)).toEqual([
      [
        { metodo: 'select', args: ['id', { count: 'exact' }] },
        { metodo: 'gte', args: ['orders_paid', 2] },
        { metodo: 'or', args: ['name.ilike."%a%"'] },
        { metodo: 'not', args: ['address_city', 'is', null] },
        { metodo: 'in', args: ['order_id', ['x']] },
        { metodo: 'order', args: ['last_activity_at', { ascending: false, nullsFirst: false }] },
        { metodo: 'order', args: ['id', { ascending: true }] },
        { metodo: 'limit', args: [25] },
      ],
    ])
  })

  it('o `maybeSingle` fecha a cadeia e também fica registrado', async () => {
    fake.responderTabela('customer_list', { data: null, error: null })
    await fake.client.from('customer_list').select(COLUNAS_DA_FICHA).eq('id', COM_CONTA.id).maybeSingle()
    expect(fake.cadeiasDe('customer_list')[0].map((e) => e.metodo)).toEqual(['select', 'eq', 'maybeSingle'])
  })

  it('a tabela de cliente sem resposta configurada LANÇA, e a que tem não afeta a outra', async () => {
    fake.responderTabela('customer_list', { data: [], error: null })
    expect(() => fake.client.from('customer_directory')).toThrow(/customer_directory/)
    await expect(fake.client.from('customer_list').select('id')).resolves.toEqual({ data: [], error: null })
  })

  it('uma tabela de cliente que só falha responde `{ error }`, sem rejeitar', async () => {
    fake.falharTabela('customer_list', { message: 'x', code: '42501' })
    expect(await fake.client.from('customer_list').select('id')).toEqual({ data: null, error: { message: 'x', code: '42501' } })
  })
})

describe('o client real responde as tabelas de cliente na forma do PostgREST', () => {
  it('customer_list, order_list, order_items e customer_directory chegam pelo `tabelas`', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      tabelas: {
        customer_list: { status: 200, corpo: [cliente()] },
        order_list: { status: 200, corpo: [pedidoDaFicha()] },
        order_items: { status: 200, corpo: [{ order_id: pedidoDaFicha().id, product_name: 'Pingente Gota' }] },
        customer_directory: { status: 200, corpo: [{ id: cliente().id }] },
      },
    })
    const { data: lista, count } = await r.client.from('customer_list').select(COLUNAS_DA_LISTA, { count: 'exact' }).gte('orders_paid', 2).limit(25)
    expect(lista).toEqual([cliente()])
    expect(count).toBeNull() // sem `Content-Range` no dublê HTTP, a contagem não vem: o teste de hook usa o dublê de cadeia
    const { data: achado } = await r.client.from('customer_directory').select('id').limit(1)
    expect(achado).toEqual([{ id: cliente().id }])
    // A cadeia vira filtro de URL do PostgREST: o `gte` e o `limit` saíram na busca.
    const chamada = r.chamadasDe('GET', '/rest/v1/customer_list')[0]
    expect(chamada.busca).toContain('orders_paid=gte.2')
    expect(chamada.busca).toContain('limit=25')
  })

  it('tabela de cliente sem entrada responde `[]` com 200, como as outras', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok' })
    expect((await r.client.from('customer_list').select('id')).data).toEqual([])
  })
})

describe('ilikeDoPostgres — o dublê entende o LIKE como o Postgres (A10)', () => {
  const f = (v: string) => `customer_id.eq.x,customer_email.ilike."${v}"`
  it('sem escape, `_` é curinga: VROSA_RJ casaria VROSAXRJ (o defeito do painel)', () => {
    expect(ilikeDoPostgres(f('VROSA_RJ@exemplo.invalid'), 'customer_email', 'VROSAXRJ@exemplo.invalid')).toBe(true)
  })
  it('com o escape de core (`\\\\_` no filtro), `_` é literal', () => {
    expect(ilikeDoPostgres(f('VROSA\\\\_RJ@exemplo.invalid'), 'customer_email', 'VROSAXRJ@exemplo.invalid')).toBe(false)
    expect(ilikeDoPostgres(f('VROSA\\\\_RJ@exemplo.invalid'), 'customer_email', 'vrosa_rj@exemplo.invalid')).toBe(true)
  })
  it('`%` sem escape é curinga; escapado, literal', () => {
    expect(ilikeDoPostgres(f('a%'), 'customer_email', 'abc')).toBe(true)
    expect(ilikeDoPostgres(f('a\\\\%'), 'customer_email', 'abc')).toBe(false)
  })
  it('lança para um filtro sem `ilike` entre aspas', () => {
    expect(() => ilikeDoPostgres('customer_email.eq.x', 'customer_email', 'x')).toThrow()
  })
})
