// Feature `76` · T26 — a ficha da cliente pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client que registra a cadeia). `MAC-14`..`MAC-22`, `MAC-28`, `MAC-36`, `MAC-37`.
//
// O dublê responde por cadeia: `customer_list` com `maybeSingle` é o cabeçalho da ficha e sem ele é a
// lista; `order_list` com `not` é a cidade, com `maybeSingle` o detalhe do pedido e sem nenhum dos dois
// os pedidos da ficha. As frases vêm ESCRITAS POR EXTENSO.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { customerOrdersCondition } from '@estrelinha/core/customers'

import { clienteHref } from '@/entities/customer'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU } from '@/shared/ui/leitura'
import { cliente, fichaDeCliente, listaDeClientes, pedidoDaFicha } from '@/test/clientes'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { movimento } from '@/test/movimento'
import { detalhe, item, statusRow, NOTA } from '@/test/pedidos'
import { resumo } from '@/test/resumo'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }
const ID = fichaDeCliente().id

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const temElo = (cadeia: Elo[], metodo: string) => cadeia.some((e) => e.metodo === metodo)

const PEDIDOS = [
  pedidoDaFicha({ id: '00000000-0000-4000-8000-000000000244', order_number: '0244', item: null, created_at: '2026-10-21T14:00:00.000001+00:00' }),
  pedidoDaFicha({ id: '00000000-0000-4000-8000-000000000230', order_number: '0230', item: null, total: 120, created_at: '2026-09-01T14:00:00.000001+00:00' }),
]

interface Cenario {
  ficha?: ReturnType<typeof fichaDeCliente> | null
  pedidos?: typeof PEDIDOS
  total?: number
  cidade?: { address_city: string | null; address_state: string | null } | null
  lista?: ReturnType<typeof listaDeClientes>
}

/** Configura as tabelas e a RPC do relógio para o cenário. */
const responder = ({ pedidos = PEDIDOS, ficha = fichaDeCliente({ orders_total: pedidos.length }), total = pedidos.length, cidade = { address_city: 'Porto Alegre', address_state: 'RS' }, lista = [cliente()] }: Cenario = {}) => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('customer_list', (cadeia): RespostaTabela =>
    temElo(cadeia, 'maybeSingle') ? { data: ficha, error: null } : { data: lista, error: null, count: lista.length },
  )
  fake.responderTabela('order_list', (cadeia): RespostaTabela => {
    if (temElo(cadeia, 'maybeSingle')) return { data: detalhe(), error: null }
    if (temElo(cadeia, 'not')) return { data: cidade ? [cidade] : [], error: null }
    return { data: pedidos, error: null, count: total }
  })
  fake.responderTabela('order_items', (cadeia): RespostaTabela =>
    temElo(cadeia, 'in')
      ? { data: pedidos.slice(0, 1).map((p) => ({ order_id: p.id, product_name: 'Pingente Gota' })), error: null }
      : { data: [item()], error: null },
  )
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
}

const h1 = () => screen.getByRole('heading', { level: 1 })
const abaDe = (nome: string) =>
  within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getByRole('link', { name: new RegExp(`^${nome}`) })
const bloco = (id: string) => document.querySelector(`[data-bloco="${id}"]`)
const papeisPerguntados = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerTermos()
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** As duas ondas de leitura da ficha: o cabeçalho e, depois dele, a cidade e os pedidos. */
const esperarAsDuasOndas = async () => {
  await andar(50)
  await andar(50)
}

const abrir = async (caminho = clienteHref(ID), estado?: Record<string, unknown>) => {
  await montarApp(caminho, { estado })
  await esperarAsDuasOndas()
}

describe('a ficha com dado (MAC-15..MAC-19)', () => {
  it('cabeçalho, números, contato e pedidos — o `h1` é "Cliente", o nome não', async () => {
    responder()
    await abrir()
    expect(h1().textContent).toBe('Cliente')
    expect(screen.getByText('Marina Duarte').closest('[data-bloco="cabecalho"]')).not.toBeNull()
    expect(document.querySelector('[data-parte="desde"]')?.textContent).toBe('Porto Alegre/RS · cliente desde março 2026')
    expect(bloco('numeros')).not.toBeNull()
    expect(bloco('contato')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Pedidos · 2' })).toBeInTheDocument()
    expect(screen.getAllByTestId('pedido-da-cliente')).toHaveLength(2)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h30\.$/)
  })

  it('o item do primeiro pedido vem de UMA leitura `in(order_id)` para a janela', async () => {
    responder()
    await abrir()
    const itens = fake.cadeiasDe('order_items').filter((c) => temElo(c, 'in'))
    expect(itens).toHaveLength(1)
    expect(itens[0].find((e) => e.metodo === 'in')?.args).toEqual(['order_id', PEDIDOS.map((p) => p.id)])
    expect(screen.getByText('#0244 · Pingente Gota')).toBeInTheDocument()
    expect(screen.getByText('#0230')).toBeInTheDocument()
  })

  it('as leituras: cabeçalho por id, cidade e pedidos pelo vínculo SEM curinga, cada uma com a confirmação de papel', async () => {
    responder()
    await abrir()
    const cabecalho = fake.cadeiasDe('customer_list').find((c) => temElo(c, 'maybeSingle'))!
    expect(cabecalho.find((e) => e.metodo === 'eq')?.args).toEqual(['id', ID])
    const vinculo = customerOrdersCondition(ID, 'marina@exemplo.invalid')
    const cadeiasDePedidos = fake.cadeiasDe('order_list')
    expect(cadeiasDePedidos.every((c) => c.some((e) => e.metodo === 'or' && e.args[0] === vinculo))).toBe(true)
    expect(cadeiasDePedidos.some((c) => temElo(c, 'not'))).toBe(true)
    expect(fake.chamadasDe('atelie_clock').length).toBeGreaterThanOrEqual(2)
  })

  it('sem cidade (nenhum pedido tem), o cabeçalho omite a cidade e o separador', async () => {
    responder({ cidade: null })
    await abrir()
    expect(document.querySelector('[data-parte="desde"]')?.textContent).toBe('cliente desde março 2026')
  })

  it('o ticket de quem nunca pagou é um travessão', async () => {
    responder({ ficha: fichaDeCliente({ orders_paid: 0, total_spent: 0, avg_ticket: null, orders_total: 0 }), pedidos: [], total: 0 })
    await abrir()
    expect(document.querySelector('[data-numero="ticket"] [data-parte="valor"]')?.textContent).toBe('—')
    expect(screen.getByText('Nenhum pedido ainda.')).toBeInTheDocument()
  })

  it('"Pedidos · N" é o `orders_total` do cabeçalho, e "Ver mais pedidos" lê a página seguinte pelo cursor', async () => {
    const vinte = Array.from({ length: 20 }, (_, i) =>
      pedidoDaFicha({
        id: `00000000-0000-4000-8000-${String(900 + i).padStart(12, '0')}`,
        order_number: String(900 + i),
        created_at: `2026-10-20T10:${String(59 - i).padStart(2, '0')}:00.${String(100000 + i).slice(-6)}+00:00`,
      }),
    )
    responder({ ficha: fichaDeCliente({ orders_total: 31 }), pedidos: vinte, total: 31 })
    await abrir()
    expect(screen.getByRole('heading', { level: 2, name: 'Pedidos · 31' })).toBeInTheDocument()
    expect(screen.getAllByTestId('pedido-da-cliente')).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais pedidos' }))
    await andar(50)
    const ultima = fake.cadeiasDe('order_list').filter((c) => !temElo(c, 'not')).at(-1)!
    const cursor = ultima.filter((e) => e.metodo === 'or').map((e) => String(e.args[0])).find((f) => f.includes(vinte[19].created_at))
    expect(cursor).toBeDefined()
    expect(ultima.find((e) => e.metodo === 'limit')?.args).toEqual([20])
  })
})

describe('"não encontrei" e id malformado (MAC-14)', () => {
  it('`:id` que não é uuid: a frase, SEM RPC e SEM leitura de dado; o `h1` existe', async () => {
    responder()
    await abrir('/clientes/ana@exemplo.invalid')
    expect(h1().textContent).toBe('Cliente')
    expect(screen.getByText('Não encontrei esta cliente.')).toBeInTheDocument()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(0)
    expect(fake.leiturasDeDado()).toEqual(['rpc:store_overview'])
    expect(screen.queryByTestId('pedido-da-cliente')).toBeNull()
  })

  it('uuid sem linha: a mesma frase, nenhum bloco e nenhuma leitura de pedido', async () => {
    responder({ ficha: null })
    await abrir()
    expect(h1().textContent).toBe('Cliente')
    expect(screen.getByRole('status')).toHaveTextContent('Não encontrei esta cliente.')
    expect(bloco('contato')).toBeNull()
    expect(fake.cadeiasDe('order_list')).toHaveLength(0)
  })
})

describe('o título do documento é uma constante, em todo estado (MAC-28)', () => {
  it('lendo, na falha, sem linha e com dado — nunca o nome', async () => {
    responder()
    fake.pendurarTabela('customer_list')
    const a = await montarApp(clienteHref(ID))
    await andar(50)
    expect(document.title).toBe('Cliente · Ateliê')
    expect(screen.getByTestId('ficha-carregando')).toHaveAttribute('aria-busy', 'true')
    expect(h1().textContent).toBe('Cliente')
    a.unmount()

    fake.falharTabela('customer_list', REDE)
    const b = await montarApp(clienteHref(ID))
    await andar(3000)
    expect(document.title).toBe('Cliente · Ateliê')
    b.unmount()

    responder({ ficha: null })
    const c = await montarApp(clienteHref(ID))
    await andar(50)
    expect(document.title).toBe('Cliente · Ateliê')
    c.unmount()

    responder()
    await abrir()
    expect(document.title).toBe('Cliente · Ateliê')
    expect(document.title).not.toMatch(/Marina|Duarte/)
  })
})

describe('a aba Clientes fica marcada na ficha, e `*` continua levando à Início (MAC-36)', () => {
  it('só a aba Clientes é a atual', async () => {
    responder()
    await abrir()
    const links = within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([null, null, 'page', null])
    expect(abaDe('Clientes')).toHaveAttribute('aria-current', 'page')
  })

  it('um caminho desconhecido ainda leva a `/`', async () => {
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    await abrir('/clientes/um/dois')
    expect(window.location.pathname).toBe('/')
  })
})

describe('abre no topo, volta à posição (MAC-14, MAC-20)', () => {
  it('uma entrada nova (a linha da lista) abre no topo: `scrollTo(0, 0)`', async () => {
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    responder()
    await abrir('/clientes')
    rolar.mockClear()
    fireEvent.click(screen.getByTestId('linha-do-cliente'))
    await andar(50)
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    expect(rolar).toHaveBeenCalledWith(0, 0)
  })
})

describe('"Voltar" (MAC-14, MAC-20)', () => {
  const caixa = () => screen.getByRole('searchbox', { name: 'Buscar cliente' }) as HTMLInputElement

  it('lista (recorte, busca, rolagem) → ficha → Voltar: a lista no MESMO recorte, busca e posição', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    responder({ lista: [cliente({ name: 'Helena Rocha' })] })
    await abrir('/clientes?recorte=recorrentes')
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 320 })
    fireEvent.click(screen.getByTestId('linha-do-cliente'))
    await andar(50)
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe('/clientes?recorte=recorrentes')
    expect(caixa().value).toBe('Helena')
    expect(screen.getAllByTestId('linha-do-cliente')).toHaveLength(1)
    expect(rolar).toHaveBeenCalledWith(0, 320)
  })

  it('o toque duplo numa linha vira UMA entrada de histórico', async () => {
    responder()
    await abrir('/clientes')
    const antes = window.history.length
    const linha = screen.getByTestId('linha-do-cliente')
    fireEvent.click(linha)
    fireEvent.click(linha)
    await andar(50)
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    expect(window.history.length).toBe(antes + 1)
  })

  it('sem `doApp` (link colado, F5): Voltar vai à lista por SUBSTITUIÇÃO', async () => {
    responder()
    await abrir()
    const antes = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/clientes')
    expect(window.history.length).toBe(antes)
  })

  it('ficha → pedido → Voltar: de volta à ficha, e dela à lista', async () => {
    responder()
    await abrir('/clientes')
    fireEvent.click(screen.getByTestId('linha-do-cliente'))
    await esperarAsDuasOndas()
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    fireEvent.click(screen.getAllByTestId('pedido-da-cliente')[0])
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos/00000000-0000-4000-8000-000000000244')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    await andar(50)
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    expect(screen.getAllByTestId('pedido-da-cliente')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/clientes')
  })

  it('voltar do pedido restaura a posição da ficha', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    responder()
    await abrir('/clientes')
    fireEvent.click(screen.getByTestId('linha-do-cliente'))
    await esperarAsDuasOndas()
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 540 })
    fireEvent.click(screen.getAllByTestId('pedido-da-cliente')[0])
    await andar(50)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    await andar(50)
    expect(window.location.pathname).toBe(clienteHref(cliente().id))
    expect(rolar).toHaveBeenCalledWith(0, 540)
  })
})

describe('a falha de um bloco não derruba a ficha (MAC-22)', () => {
  it('os pedidos em falha: só o bloco diz "Não consegui carregar os pedidos."; cabeçalho e contato ficam', async () => {
    responder()
    fake.responderTabela('order_list', (cadeia): RespostaTabela =>
      temElo(cadeia, 'not') ? { data: [{ address_city: 'Porto Alegre', address_state: 'RS' }], error: null } : { data: null, error: REDE },
    )
    await abrir()
    await andar(3000)
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar os pedidos.')
    expect(screen.getByText('Marina Duarte')).toBeInTheDocument()
    expect(bloco('contato')).not.toBeNull()
    expect(bloco('numeros')).not.toBeNull()
    expect(screen.queryByTestId('pedido-da-cliente')).toBeNull()
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
  })

  it('o "Tentar de novo" do bloco relê os pedidos', async () => {
    responder()
    let n = 0
    fake.responderTabela('order_list', (cadeia): RespostaTabela => {
      if (temElo(cadeia, 'not')) return { data: [], error: null }
      return ++n <= 2 ? { data: null, error: REDE } : { data: PEDIDOS, error: null, count: 2 }
    })
    await abrir()
    await andar(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar(50)
    expect(screen.getAllByTestId('pedido-da-cliente')).toHaveLength(2)
  })

  it('a falha do CABEÇALHO derruba a ficha, com "Tentar de novo" — e nenhum zero', async () => {
    responder()
    fake.falharTabela('customer_list', REDE)
    await abrir()
    await andar(3000)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(h1().textContent).toBe('Cliente')
    expect(bloco('numeros')).toBeNull()
    expect(bloco('contato')).toBeNull()
  })

  it('a cidade em falha é omitida e a ficha não cai', async () => {
    responder()
    fake.responderTabela('order_list', (cadeia): RespostaTabela =>
      temElo(cadeia, 'not') ? { data: null, error: REDE } : { data: PEDIDOS, error: null, count: 2 },
    )
    await abrir()
    expect(document.querySelector('[data-parte="desde"]')?.textContent).toBe('cliente desde março 2026')
    expect(screen.getAllByTestId('pedido-da-cliente')).toHaveLength(2)
  })
})

describe('recusa e rede (MAC-11, MAC-37)', () => {
  const puxar = async () => {
    const area = screen.getByRole('heading', { level: 1, name: 'Cliente' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    await andar(3000)
  }

  it('`42501` com o papel tirado: a recusa da 72, nenhum texto da cliente', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Marina|marina@|98124471|R\$/)
  })

  it('`42501` com o papel ainda admin, numa releitura: NENHUM bloco — nem o do cache — e UMA reconferência', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', (n) => (n <= 2 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(bloco('contato')).not.toBeNull()
    await puxar()
    expect(window.location.pathname).toBe(clienteHref(ID))
    expect(bloco('cabecalho')).toBeNull()
    expect(bloco('numeros')).toBeNull()
    expect(bloco('contato')).toBeNull()
    expect(screen.queryByTestId('pedido-da-cliente')).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/Marina|marina@|R\$/)
    expect(screen.queryByTestId('frescor')).toBeNull()
    expect(h1().textContent).toBe('Cliente')
    expect(papeisPerguntados()).toBe(2)
    await andar(30_000)
    expect(papeisPerguntados()).toBe(2)
  })

  it('rede na confirmação: falha de leitura, nunca recusa nem reconferência', async () => {
    responder()
    fake.falharRpc('atelie_clock', REDE)
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe(clienteHref(ID))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(1)
  })

  it('a releitura que falha mantém a ficha, com a hora e "Não consegui atualizar agora."', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', (n) => (n <= 2 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: REDE }))
    await abrir()
    await puxar()
    expect(bloco('contato')).not.toBeNull()
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/Atualizado às 11h30\.$/)
  })
})
