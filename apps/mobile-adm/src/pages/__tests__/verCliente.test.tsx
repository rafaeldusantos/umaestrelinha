// Feature `76` · T27 — "Ver cliente" no detalhe do pedido pela árvore REAL (`MAC-21`, `MAC-20`,
// `MAC-11`): Pedidos → pedido de uma convidada → "Ver cliente" → a ficha dela, e ficha → pedido →
// Voltar. A leitura do `customer_directory` por e-mail sai pareada com a RPC de papel.
process.env.TZ = 'UTC'

import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { directoryEmailCondition } from '@estrelinha/core/customers'

import { clienteHref } from '@/entities/customer'
import { pedidoHref } from '@/entities/order'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { CONVIDADA, fichaDeCliente, pedidoDaFicha } from '@/test/clientes'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { NOTA, detalhe, item, linha, statusRow } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }
const ID_PEDIDO = '00000000-0000-4000-8000-000000000244'
const EMAIL_DA_CONVIDADA = CONVIDADA.email

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const esperar = async () => {
  await andar(50)
  await andar(50)
  await andar(50)
}
const temElo = (cadeia: Elo[], metodo: string) => cadeia.some((e) => e.metodo === metodo)

const pedidoDaConvidada = detalhe({ id: ID_PEDIDO, customer_name: 'Helena Rocha', customer_email: EMAIL_DA_CONVIDADA })

const responder = ({ achada = [{ id: CONVIDADA.id }] as { id: string }[] | RespostaTabela['error'] } = {}) => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela => {
    if (temElo(cadeia, 'maybeSingle')) return { data: pedidoDaConvidada, error: null }
    if (temElo(cadeia, 'not')) return { data: [{ address_city: 'Gramado', address_state: 'RS' }], error: null }
    // A lista de pedidos e os pedidos da ficha: o mesmo pedido, nos dois lugares.
    return { data: [linha({ id: ID_PEDIDO, customer_name: 'Helena Rocha', customer_email: EMAIL_DA_CONVIDADA }), pedidoDaFicha({ id: ID_PEDIDO })].slice(0, 1), error: null, count: 1 }
  })
  fake.responderTabela('customer_directory', (): RespostaTabela =>
    Array.isArray(achada) ? { data: achada, error: null } : { data: null, error: achada },
  )
  fake.responderTabela('customer_list', { data: fichaDeCliente({ id: CONVIDADA.id, name: 'Helena Rocha', email: EMAIL_DA_CONVIDADA }), error: null })
  fake.responderTabela('order_items', (cadeia): RespostaTabela =>
    temElo(cadeia, 'in') ? { data: [{ order_id: ID_PEDIDO, product_name: 'Pingente Gota' }], error: null } : { data: [item()], error: null },
  )
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
}

const botao = () => screen.getByRole('button', { name: /^(Ver cliente|Abrindo…)$/ })
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

const abrir = async (caminho: string) => {
  await montarApp(caminho)
  await esperar()
}

describe('o percurso Pedidos → pedido → Ver cliente → ficha (MAC-21)', () => {
  it('a convidada: a ficha dela abre pelo e-mail do pedido, com `doApp`', async () => {
    responder()
    await abrir('/pedidos?visao=tudo')
    fireEvent.click(screen.getAllByTestId('linha-do-pedido')[0])
    await esperar()
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
    expect(botao()).toHaveTextContent('Ver cliente')
    const lidasAntes = fake.chamadasDe('atelie_clock').length
    fireEvent.click(botao())
    await esperar()
    expect(window.location.pathname).toBe(clienteHref(CONVIDADA.id))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cliente')
    expect(screen.getByText('Helena Rocha')).toBeInTheDocument()
    // A leitura por e-mail saiu PAREADA com a RPC de papel (uma a mais, antes das da ficha).
    expect(fake.chamadasDe('atelie_clock').length).toBeGreaterThan(lidasAntes)
    const achado = fake.cadeiasDe('customer_directory')
    expect(achado).toHaveLength(1)
    expect(achado[0].find((e) => e.metodo === 'or')?.args).toEqual([directoryEmailCondition(EMAIL_DA_CONVIDADA)])
    expect(achado[0].find((e) => e.metodo === 'limit')?.args).toEqual([1])
  })

  it('ficha → pedido → Voltar: de volta à ficha; Voltar de novo: de volta ao pedido', async () => {
    responder()
    await abrir(pedidoHref(ID_PEDIDO))
    // Aberto por link direto: o "Voltar" do pedido não tem histórico do app; o toque no botão abre a ficha.
    fireEvent.click(botao())
    await esperar()
    expect(window.location.pathname).toBe(clienteHref(CONVIDADA.id))
    fireEvent.click(screen.getAllByTestId('pedido-da-cliente')[0])
    await esperar()
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await esperar()
    expect(window.location.pathname).toBe(clienteHref(CONVIDADA.id))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await esperar()
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
  })

  it('durante a espera o botão diz "Abrindo…" sem mudar de tamanho, e dois toques no mesmo tique são UMA leitura', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', () => ({ data: { lido_em: LIDO_EM }, error: null }))
    await abrir(pedidoHref(ID_PEDIDO))
    const antes = botao().className
    fake.responderTabela('customer_directory', () => new Promise<RespostaTabela>(() => {}))
    fireEvent.click(botao())
    fireEvent.click(botao())
    await andar(50)
    expect(botao()).toHaveTextContent('Abrindo…')
    expect(botao().className).toBe(antes)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    expect(fake.cadeiasDe('customer_directory')).toHaveLength(1)
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
  })
})

describe('quando a pessoa não é achada ou a leitura falha', () => {
  it('nenhuma pessoa: "Não encontrei esta cliente." na própria linha, e nenhuma navegação', async () => {
    responder({ achada: [] })
    await abrir(pedidoHref(ID_PEDIDO))
    fireEvent.click(botao())
    await esperar()
    expect(screen.getByRole('status')).toHaveTextContent('Não encontrei esta cliente.')
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
    expect(botao()).toHaveTextContent('Ver cliente')
  })

  it('rede: "Não consegui abrir agora. Tente de novo.", e um novo toque tenta de novo', async () => {
    responder({ achada: REDE })
    await abrir(pedidoHref(ID_PEDIDO))
    fireEvent.click(botao())
    await esperar()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui abrir agora. Tente de novo.')
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    responder()
    fireEvent.click(botao())
    await esperar()
    expect(window.location.pathname).toBe(clienteHref(CONVIDADA.id))
  })
})

describe('a recusa entra na MESMA vigia da página do pedido (MAC-11)', () => {
  it('`42501` com o papel tirado: a recusa da 72, nenhum texto da cliente nem do pedido', async () => {
    responder()
    await abrir(pedidoHref(ID_PEDIDO))
    fake.responderTabela('customer_directory', () => ({ data: [{ id: CONVIDADA.id }], error: null }))
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    fireEvent.click(botao())
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Helena|helena\.rocha@/)
  })

  it('`42501` com o papel ainda admin: o pedido sai da tela e UMA reconferência', async () => {
    responder()
    await abrir(pedidoHref(ID_PEDIDO))
    const antes = papeisPerguntados()
    fake.aoChamarRpc('atelie_clock', () => ({ data: null, error: RECUSA }))
    fireEvent.click(botao())
    await andar(3000)
    expect(window.location.pathname).toBe(pedidoHref(ID_PEDIDO))
    expect(screen.queryByRole('button', { name: 'Ver cliente' })).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/Helena|helena\.rocha@/)
    expect(papeisPerguntados()).toBe(antes + 1)
    await andar(30_000)
    expect(papeisPerguntados()).toBe(antes + 1)
  })
})
