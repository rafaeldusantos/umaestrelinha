// `/admin/pedidos/montados` pela PÁGINA REAL (feature 89, ajuste de 2026-11-01: o item "Pedidos
// montados" da sidebar). Dublado só o client — a lista chega por `functions.invoke`; `ProposalsList`,
// `useProposalList` e o React Query são os reais.

import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { estado } = vi.hoisted(() => ({
  estado: {
    invocacoes: [] as string[],
    invocar: (_nome: string): unknown => ({ data: { proposals: [] }, error: null }),
  },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('a lista de pedidos montados não lê tabela nenhuma pelo PostgREST')
    },
    functions: {
      invoke: async (nome: string) => {
        estado.invocacoes.push(nome)
        return estado.invocar(nome)
      },
    },
  },
}))

import AdminProposalsPage from './AdminProposalsPage'

const PROPOSTA = {
  id: '99999999-9999-4999-8999-999999999999', number: 'P-0007', status: 'open', version: 1,
  expires_at: '2026-11-07T15:00:00Z', viewed_at: null, order_id: null, order_number: null,
  customer_name: 'Ana Souza', customer_email: 'ana@x.invalid', items_total: 170,
  created_at: '2026-10-31T15:00:00Z', state: 'open',
}

beforeEach(() => {
  estado.invocacoes = []
  estado.invocar = () => ({ data: { proposals: [PROPOSTA] }, error: null })
})

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/pedidos/montados']}>
        <AdminProposalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('Pedidos montados — a página da sidebar', () => {
  it('tem cabeçalho próprio e "Montar pedido" leva à montagem', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos montados' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Montar pedido/ })).toHaveAttribute('href', '/admin/pedidos/montar')
  })

  it('mostra a lista de propostas (a mesma da aba Montados), lida pela function', async () => {
    montar()
    const lista = await screen.findByTestId('lista-de-montados')
    expect(within(lista).getAllByText(/P-0007/).length).toBeGreaterThan(0)
    expect(within(lista).getAllByText(/Ana Souza/).length).toBeGreaterThan(0)
    expect(estado.invocacoes).toEqual(['order-proposals?action=list'])
  })

  it('a leitura que falha diz isso e oferece tentar de novo', async () => {
    estado.invocar = () => ({ data: null, error: { message: 'x' } })
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não consegui ler os pedidos montados.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
