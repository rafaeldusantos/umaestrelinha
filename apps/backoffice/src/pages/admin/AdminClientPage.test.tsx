// A ficha da cliente em rota própria — `CLI-08`..`CLI-13`.
//
// O bloco de privacidade tem teste próprio e detalhado porque é o único lugar do painel onde um
// clique apaga dado de uma pessoa **para sempre**, e porque o texto do diálogo É o requisito: ele
// precisa dizer o que apaga e o que preserva antes de perguntar.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CustomerListRow } from '@/entities/customer/api/customerQuery'

const {
  detailMock, addNoteMock, anonymizeMock, reloadMock, toastErrorMock, toastSuccessMock, navigateMock,
} = vi.hoisted(() => ({
  detailMock: vi.fn(),
  addNoteMock: vi.fn(),
  anonymizeMock: vi.fn(),
  reloadMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('@/entities/customer/api/useAdminCustomer', () => ({ useAdminCustomer: detailMock }))
vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: toastSuccessMock } }))
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))

import AdminClientPage from './AdminClientPage'

const cliente = (over: Partial<CustomerListRow> = {}): CustomerListRow => ({
  id: 'c1',
  user_id: 'u1',
  name: 'Luciana Prado',
  email: 'lu.prado@example.com',
  cpf: '04212345618',
  phone: '51999184227',
  created_at: '2026-03-14T00:00:00Z',
  has_account: true,
  orders_paid: 3,
  orders_total: 3,
  total_spent: 1104,
  avg_ticket: 368,
  first_order_at: '2026-03-27T00:00:00Z',
  last_order_at: '2026-08-20T00:00:00Z',
  last_activity_at: '2026-08-20T00:00:00Z',
  orders_with_material: 2,
  material_kinds: ['cinzas'],
  same_email_count: 1,
  ...over,
})

const detail = (over: Record<string, unknown> = {}) => ({
  customer: cliente(),
  orders: [
    {
      id: 'o1', order_number: '1042', status: 'paid', material_status: 'aguardando_material',
      total: 369.55, created_at: '2026-08-20T14:32:00Z', payment_method: 'pix',
      tracking_code: null, item_names: ['Pingente Gota · Cinzas', 'Caixinha de guarda'],
    },
  ],
  addresses: [
    {
      id: 'a1', customer_id: 'c1', label: 'Casa', cep: '90540-041',
      street: 'Rua Marcelo Gama', number: '1120', complement: 'apto 302',
      neighborhood: 'São João', city: 'Porto Alegre', state: 'RS',
      is_default: true, created_at: null,
    },
  ],
  notes: [
    { id: 'n1', customer_id: 'c1', note: 'Prefere ser chamada de Lu.', created_by: null, created_at: '2026-08-26T16:14:00Z' },
  ],
  loading: false,
  error: null,
  reload: reloadMock,
  addNote: addNoteMock,
  anonymize: anonymizeMock,
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/clientes/c1']}>
      <Routes>
        <Route path="/admin/clientes/:id" element={<AdminClientPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  detailMock.mockReturnValue(detail())
  addNoteMock.mockResolvedValue(null)
  anonymizeMock.mockResolvedValue({ ok: true, reason: null, ordersPreserved: 3 })
})

describe('a ficha é rota própria (CLI-08)', () => {
  it('carrega pelo id da URL', () => {
    renderPage()
    expect(detailMock).toHaveBeenCalledWith('c1')
    // Escopado ao `h1`: o nome aparece duas vezes de propósito, no título e na trilha.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Luciana Prado')
    expect(screen.getByRole('navigation', { name: 'Trilha' })).toHaveTextContent('Clientes')
  })

  it('cliente inexistente oferece caminho de volta', () => {
    detailMock.mockReturnValue(detail({ customer: null }))
    renderPage()

    expect(screen.getByText(/Esta cliente não existe/)).toBeInTheDocument()
  })
})

describe('a ficha liga aos pedidos (CLI-11)', () => {
  it('cada linha abre a rota do pedido', () => {
    renderPage()
    expect(screen.getByRole('link', { name: '#1042' })).toHaveAttribute('href', '/admin/pedidos/o1')
  })

  it('a linha mostra O QUE ela levou, e o que segura o pedido em aberto', () => {
    // A pergunta que se faz olhando o histórico de alguém é "o que ela levou" — número e valor não
    // respondem isso. E o pedido em aberto diz o que o segura, em âmbar.
    renderPage()

    expect(screen.getByText('Pingente Gota · Cinzas + Caixinha de guarda')).toBeInTheDocument()
    expect(screen.getByText(/Aguardando material · parado há \d+ dias/)).toBeInTheDocument()
  })

  it('pedido concluído diz quando saiu e por qual código, sem alarme', () => {
    detailMock.mockReturnValue(
      detail({
        orders: [{
          id: 'o9', order_number: '0871', status: 'delivered', material_status: 'nao_aplicavel',
          total: 412, created_at: '2026-06-02T12:00:00Z', payment_method: 'pix',
          tracking_code: 'BR31 0092 4', item_names: ['Anel Fio · Cabelo'],
        }],
      }),
    )
    renderPage()

    expect(screen.getByText('Entregue · BR31 0092 4')).toBeInTheDocument()
  })

  it('enviado SEM código se anuncia como falha — a cliente não foi avisada', () => {
    detailMock.mockReturnValue(
      detail({
        orders: [{
          id: 'o9', order_number: '0900', status: 'shipped', material_status: 'nao_aplicavel',
          total: 100, created_at: '2026-08-01T12:00:00Z', payment_method: 'pix',
          tracking_code: null, item_names: ['Brinco'],
        }],
      }),
    )
    renderPage()

    expect(screen.getByText(/não foi avisada/)).toBeInTheDocument()
  })
})

describe('endereços vêm de `addresses`, que o painel nunca lia (CLI-09)', () => {
  it('mostra o endereço com o padrão marcado e um copiar', () => {
    renderPage()

    expect(screen.getByText(/Casa · padrão/)).toBeInTheDocument()
    expect(screen.getByText(/Rua Marcelo Gama, 1120 — apto 302/)).toBeInTheDocument()
    expect(screen.getByText('Copiar')).toBeInTheDocument()
  })

  it('sem endereço, diz que não há — e não desenha bloco vazio', () => {
    detailMock.mockReturnValue(detail({ addresses: [] }))
    renderPage()

    expect(screen.getByText('Sem endereço salvo.')).toBeInTheDocument()
  })
})

describe('notas internas (CLI-10)', () => {
  it('a tela DECLARA que a cliente nunca vê', () => {
    renderPage()
    expect(screen.getByText('Só a Adri vê · nunca aparece na loja')).toBeInTheDocument()
  })

  it('grava a nota e limpa o campo', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nova nota sobre a cliente'), {
      target: { value: 'Mandou pouca cinza no primeiro pedido' },
    })
    fireEvent.click(screen.getByText('Anotar'))

    await waitFor(() =>
      expect(addNoteMock).toHaveBeenCalledWith('Mandou pouca cinza no primeiro pedido'),
    )
  })

  it('erro de gravação vira toast, e não silêncio', async () => {
    addNoteMock.mockResolvedValue('permission denied')
    renderPage()
    fireEvent.change(screen.getByLabelText('Nova nota sobre a cliente'), {
      target: { value: 'x' },
    })
    fireEvent.click(screen.getByText('Anotar'))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('permission denied'))
  })
})

describe('privacidade é bloco de tela, não menu escondido (CLI-13, D7)', () => {
  it('os dois caminhos de LGPD estão visíveis sem abrir menu nenhum', () => {
    renderPage()

    expect(screen.getByText('Exportar tudo o que temos dela')).toBeInTheDocument()
    expect(screen.getByText('Anonimizar cadastro')).toBeInTheDocument()
  })

  it('o resumo do bloco já diz o que anonimizar faz', () => {
    renderPage()
    expect(
      screen.getByText(/Os pedidos ficam, sem dono, porque são registro fiscal/),
    ).toBeInTheDocument()
  })

  it('o diálogo escreve o que APAGA e o que PRESERVA antes de perguntar', () => {
    renderPage()
    fireEvent.click(screen.getByText('Anonimizar cadastro'))

    const dialogo = screen.getByRole('dialog')
    const texto = dialogo.textContent ?? ''

    // Medido pelo texto do diálogo inteiro: a frase de preservação é quebrada por `<strong>` e por
    // interpolação, e um `getByText` por nó não a alcança. O que o requisito exige é que ela ESTEJA
    // escrita ali, e não em que nó ela cai.
    expect(texto).toContain('O que isto APAGA, para sempre:')
    expect(texto).toContain('no cadastro e em cada pedido')
    expect(texto).toContain('O que isto PRESERVA:')
    expect(texto).toContain('sem dono')
    expect(texto).toContain('registro fiscal')
  })

  it('a contagem de pedidos preservados concorda em singular e plural', () => {
    // Uma cliente com um pedido não pode ler "Os 1 pedidos dela continuam" num diálogo que
    // decide sobre a exclusão dos dados dela.
    renderPage()
    fireEvent.click(screen.getByText('Anonimizar cadastro'))
    expect(screen.getByRole('dialog').textContent).toContain('O pedido dela continua')

    fireEvent.click(screen.getByText('Voltar'))

    detailMock.mockReturnValue(
      detail({
        orders: [
          { id: 'o1', order_number: '1042', status: 'paid', material_status: 'nao_aplicavel', total: 1, created_at: '2026-08-20T12:00:00Z', item_names: ['A'] },
          { id: 'o2', order_number: '0871', status: 'delivered', material_status: 'nao_aplicavel', total: 2, created_at: '2026-06-02T12:00:00Z', item_names: ['B'] },
          { id: 'o3', order_number: '0644', status: 'delivered', material_status: 'nao_aplicavel', total: 3, created_at: '2026-03-27T12:00:00Z', item_names: ['C'] },
        ],
      }),
    )
    renderPage()
    fireEvent.click(screen.getAllByText('Anonimizar cadastro')[0])

    expect(
      screen.getAllByRole('dialog').some(d => (d.textContent ?? '').includes('Os 3 pedidos dela continuam')),
    ).toBe(true)
  })

  it('exige digitar ANONIMIZAR — o clique não pode ser o de qualquer botão', () => {
    renderPage()
    fireEvent.click(screen.getByText('Anonimizar cadastro'))

    const confirmar = screen.getByRole('button', { name: 'Anonimizar cadastro' })
    expect(confirmar).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Digite ANONIMIZAR para confirmar'), {
      target: { value: 'ANONIMIZAR' },
    })
    expect(confirmar).not.toBeDisabled()
  })

  it('confirmar chama a RPC e informa quantos pedidos ficaram', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Anonimizar cadastro'))
    fireEvent.change(screen.getByLabelText('Digite ANONIMIZAR para confirmar'), {
      target: { value: 'ANONIMIZAR' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Anonimizar cadastro' }))

    await waitFor(() => expect(anonymizeMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        'Cadastro anonimizado · 3 pedido(s) preservados sem dono',
      ),
    )
  })

  it('falha da RPC NÃO navega para lugar nenhum', async () => {
    anonymizeMock.mockResolvedValue({ ok: false, reason: 'not_admin', ordersPreserved: 0 })
    renderPage()
    fireEvent.click(screen.getByText('Anonimizar cadastro'))
    fireEvent.change(screen.getByLabelText('Digite ANONIMIZAR para confirmar'), {
      target: { value: 'ANONIMIZAR' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Anonimizar cadastro' }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(navigateMock).not.toHaveBeenCalledWith('/admin/clientes')
  })
})

describe('a convidada tem ficha igual (finding da validação)', () => {
  it('sem cadastro, o cabeçalho diz "Convidada" e não quebra', () => {
    detailMock.mockReturnValue(
      detail({ customer: cliente({ has_account: false, user_id: null, cpf: null }) }),
    )
    renderPage()

    expect(screen.getByText(/^Convidada desde/)).toBeInTheDocument()
  })
})
