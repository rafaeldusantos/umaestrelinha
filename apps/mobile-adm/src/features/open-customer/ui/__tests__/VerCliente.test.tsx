// Feature `76` · T19 — `VerCliente` / `useAbrirCliente`: os estados, a trava de duplo toque, a recusa e
// a navegação com `doApp`, pela árvore real (roteador + client React Query não são necessários: o hook
// só navega).
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clienteHref } from '@/entities/customer'
import { fake, type RespostaTabela } from '@/test/fakeSupabase'

import VerCliente from '../VerCliente'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-24T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-c076-000000000001'
const EMAIL = 'marina@exemplo.invalid'

const Sonda = () => {
  const l = useLocation()
  return <div data-testid="onde">{`${l.pathname}|${JSON.stringify(l.state)}`}</div>
}

const montar = (aoRecusa?: (e: unknown) => void) =>
  render(
    <MemoryRouter initialEntries={['/pedidos/x']}>
      <Routes>
        <Route path="/pedidos/:id" element={<VerCliente email={EMAIL} aoRecusa={aoRecusa} />} />
        <Route path="/clientes/:id" element={<Sonda />} />
      </Routes>
    </MemoryRouter>,
  )

const botao = () => screen.getByRole('button')

beforeEach(() => {
  fake.reset()
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
})

describe('o botão', () => {
  it('ocioso: "Ver cliente", 44 px por token exato, largura inteira, no molde do botão secundário', () => {
    fake.responderTabela('customer_directory', { data: [], error: null })
    montar()
    expect(botao()).toHaveTextContent('Ver cliente')
    const classes = botao().className.split(/\s+/)
    expect(classes).toContain('min-h-11')
    expect(classes).not.toContain('min-h-12') // a fusão deixa UMA altura mínima
    expect(classes).toContain('w-full')
    expect(classes).toContain('text-estrelinha-primary')
  })

  it('"Abrindo…" não muda o tamanho: as mesmas classes, só o texto troca', async () => {
    let soltar: (r: RespostaTabela) => void = () => {}
    fake.responderTabela('customer_directory', () => new Promise<RespostaTabela>((r) => (soltar = r)))
    montar()
    const antes = botao().className
    fireEvent.click(botao())
    await waitFor(() => expect(botao()).toHaveTextContent('Abrindo…'))
    expect(botao().className).toBe(antes)
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    await act(async () => soltar({ data: [{ id: ID }], error: null }))
  })
})

describe('achou: navega para a ficha com `doApp`', () => {
  it('abre /clientes/<id> com o state { doApp: true }', async () => {
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    montar()
    fireEvent.click(botao())
    await waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent(`${clienteHref(ID)}|{"doApp":true}`))
  })
})

describe('não achou e falhou', () => {
  it('nenhuma pessoa ⇒ "Não encontrei esta cliente." (status), sem navegar, botão de pé', async () => {
    fake.responderTabela('customer_directory', { data: [], error: null })
    montar()
    fireEvent.click(botao())
    const frase = await screen.findByRole('status')
    expect(frase).toHaveTextContent('Não encontrei esta cliente.')
    expect(screen.queryByTestId('onde')).toBeNull()
    expect(botao()).toHaveTextContent('Ver cliente')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rede ⇒ "Não consegui abrir agora. Tente de novo." (alert), e tocar de novo tenta de novo', async () => {
    fake.falharTabela('customer_directory', { message: 'TypeError: Failed to fetch' })
    montar()
    fireEvent.click(botao())
    expect(await screen.findByRole('alert')).toHaveTextContent('Não consegui abrir agora. Tente de novo.')
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    fireEvent.click(botao())
    await waitFor(() => expect(screen.getByTestId('onde')).toBeInTheDocument())
  })

  it('a RPC que cai por rede também é "falhou", nunca recusa', async () => {
    fake.aoChamarRpc('atelie_clock', () => Promise.reject(new TypeError('Failed to fetch')))
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    const aoRecusa = vi.fn()
    montar(aoRecusa)
    fireEvent.click(botao())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(aoRecusa).not.toHaveBeenCalled()
  })
})

describe('a trava de duplo toque é síncrona (um useRef)', () => {
  it('dois cliques no MESMO tique ⇒ UMA leitura', async () => {
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    montar()
    act(() => {
      botao().click()
      botao().click()
    })
    await waitFor(() => expect(screen.getByTestId('onde')).toBeInTheDocument())
    expect(fake.cadeiasDe('customer_directory')).toHaveLength(1)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })
})

describe('a recusa (42501) vai a quem chamou e NÃO vira "falhou"', () => {
  it('chama `aoRecusa` com o erro, volta a ocioso, nenhuma frase de falha', async () => {
    const recusa = { message: 'acesso restrito', code: '42501' }
    fake.falharRpc('atelie_clock', recusa)
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    const aoRecusa = vi.fn()
    montar(aoRecusa)
    fireEvent.click(botao())
    await waitFor(() => expect(aoRecusa).toHaveBeenCalledWith(recusa))
    expect(aoRecusa).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(botao()).toHaveTextContent('Ver cliente')
    expect(screen.queryByTestId('onde')).toBeNull()
  })

  it('sem `aoRecusa`, a recusa ainda não vira "falhou"', async () => {
    fake.falharRpc('atelie_clock', { message: 'acesso restrito', code: '42501' })
    fake.responderTabela('customer_directory', { data: [{ id: ID }], error: null })
    montar()
    fireEvent.click(botao())
    await waitFor(() => expect(fake.chamadasDe('atelie_clock')).toHaveLength(1))
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
