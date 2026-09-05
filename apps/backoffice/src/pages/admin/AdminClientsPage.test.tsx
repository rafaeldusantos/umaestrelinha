// `TST-02` — a listagem de Clientes na TELA.
//
// A tela tinha 54 linhas, nenhum teste, e não respondia nenhuma das três perguntas que fazem alguém
// abri-la. Os casos abaixo cobrem as três, mais os dois defeitos silenciosos: a leitura truncada e a
// contagem que misturava abandono com compra.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { CustomerListRow } from '@/entities/customer/api/customerQuery'

const { listMock, fetchAllMock, refetchMock, exportMock, toastErrorMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  fetchAllMock: vi.fn(),
  refetchMock: vi.fn(),
  exportMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/entities/customer/api/useAdminCustomerList', () => ({ useAdminCustomerList: listMock }))
vi.mock('@/features/customer-detail/lib/exportCsv', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/customer-detail/lib/exportCsv')>()),
  exportCustomersCsv: exportMock,
}))
vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: vi.fn() } }))

import AdminClientsPage from './AdminClientsPage'

let seq = 0
const cliente = (over: Partial<CustomerListRow> = {}): CustomerListRow => ({
  id: `c${++seq}`,
  user_id: 'u1',
  name: 'Luciana Prado',
  email: 'lu.prado@example.com',
  cpf: null,
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
  material_kinds: ['cinzas', 'cabelo'],
  same_email_count: 1,
  ...over,
})

const listResult = (over: Record<string, unknown> = {}) => ({
  rows: [cliente()],
  total: 324,
  loading: false,
  error: null,
  portrait: {
    total: 324, compraram: 324, voltaram: 118, confiaramMaterial: 87,
    gastoMedio: 412, novasNoMes: 41,
  },
  refetch: refetchMock,
  fetchAllFiltered: fetchAllMock,
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminClientsPage />
    </MemoryRouter>,
  )

const tabela = () => within(screen.getByRole('table'))

beforeEach(() => {
  seq = 0
  vi.clearAllMocks()
  listMock.mockReturnValue(listResult())
  fetchAllMock.mockResolvedValue([cliente()])
})

describe('as três perguntas viram COLUNA, não clique (CLI-03)', () => {
  it('quanto gastou, qual o ticket, quando comprou e se confiou material', () => {
    renderPage()

    expect(tabela().getByText('Gastou')).toBeInTheDocument()
    expect(tabela().getByText('Ticket')).toBeInTheDocument()
    expect(tabela().getByText('Última compra')).toBeInTheDocument()
    expect(tabela().getByText('Material')).toBeInTheDocument()
  })

  it('mostra os valores da pessoa, e os materiais que ela confiou', () => {
    renderPage()

    expect(tabela().getByText('R$ 1.104,00')).toBeInTheDocument()
    expect(tabela().getByText('R$ 368,00')).toBeInTheDocument()
    expect(tabela().getByText('Cinzas')).toBeInTheDocument()
    expect(tabela().getByText('Mecha de cabelo')).toBeInTheDocument()
  })

  it('quem nunca comprou mostra travessão, e NÃO "R$ 0,00"', () => {
    // `avg_ticket` é `null` na view para quem nunca teve pedido pago. "Ticket R$ 0,00" seria uma
    // afirmação falsa sobre alguém que nunca comprou; ausência é a verdade.
    listMock.mockReturnValue(
      listResult({
        rows: [cliente({ orders_paid: 0, orders_total: 0, total_spent: 0, avg_ticket: null, last_activity_at: null, material_kinds: [] })],
      }),
    )
    renderPage()

    expect(tabela().queryByText('R$ 0,00')).not.toBeInTheDocument()
    expect(tabela().getByText('Nunca comprou')).toBeInTheDocument()
  })
})

describe('o critério do dinheiro está ESCRITO na tela (CLI-04)', () => {
  it('o cartão de gasto médio diz que só pedidos pagos entram', () => {
    // Um critério que só existe na spec é um número com dois donos silenciosos.
    renderPage()
    expect(screen.getByText('Só pedidos pagos entram na conta')).toBeInTheDocument()
  })
})

describe('a contagem deixa de misturar abandono com compra (CLI-05)', () => {
  it('a coluna Pedidos conta os PAGOS', () => {
    listMock.mockReturnValue(listResult({ rows: [cliente({ orders_paid: 3, orders_total: 5 })] }))
    renderPage()

    expect(tabela().getByText('3')).toBeInTheDocument()
    expect(tabela().queryByText('5')).not.toBeInTheDocument()
  })

  it('o pedido ainda não pago aparece como "em aberto" na última compra', () => {
    listMock.mockReturnValue(
      listResult({
        rows: [cliente({
          last_order_at: '2026-08-01T00:00:00Z',
          last_activity_at: '2026-08-20T00:00:00Z',
        })],
      }),
    )
    renderPage()

    expect(tabela().getByText('em aberto')).toBeInTheDocument()
  })
})

describe('o retrato da base (CLI-06)', () => {
  it('mostra os quatro números, com a fração da base', () => {
    renderPage()

    // "Confiaram material" é também o rótulo de uma VISÃO, então a consulta é escopada ao
    // retrato — um `getByText` solto casaria os dois e falharia por ambiguidade.
    const retrato = within(screen.getByRole('group', { name: 'Retrato da base' }))

    expect(retrato.getByText('Voltaram a comprar')).toBeInTheDocument()
    expect(retrato.getByText('118')).toBeInTheDocument()
    expect(retrato.getByText('36% da base')).toBeInTheDocument()
    expect(retrato.getByText('Confiaram material')).toBeInTheDocument()
    expect(retrato.getByText('87')).toBeInTheDocument()
    expect(retrato.getByText('Novas no mês')).toBeInTheDocument()
  })

  it('o subtítulo diz quantas compraram e quantas confiaram material', () => {
    renderPage()
    expect(
      screen.getByText('324 pessoas compraram alguma vez · 87 confiaram um material à Adri'),
    ).toBeInTheDocument()
  })
})

describe('a convidada é uma LINHA (finding da validação)', () => {
  it('a listagem distingue conta de convidada', () => {
    listMock.mockReturnValue(
      listResult({ rows: [cliente({ has_account: false, user_id: null })] }),
    )
    renderPage()

    expect(tabela().getByText(/convidada/)).toBeInTheDocument()
  })

  it('e o filtro oferece os dois lados', () => {
    renderPage()
    expect(screen.getByText('Conta ou convidada')).toBeInTheDocument()
  })
})

describe('duplicata é MOSTRADA, não resolvida (CLI-14)', () => {
  it('a linha anuncia quantos cadastros dividem o e-mail', () => {
    listMock.mockReturnValue(listResult({ rows: [cliente({ same_email_count: 2 })] }))
    renderPage()

    expect(tabela().getByText(/2 cadastros com este e-mail/)).toBeInTheDocument()
  })

  it('existe a visão "Possíveis duplicadas", e nenhum botão de fundir', () => {
    // Fundir dois cadastros é escrita destrutiva sobre pedido pago, e é decisão da dona.
    renderPage()

    expect(screen.getByRole('tab', { name: 'Possíveis duplicadas' })).toBeInTheDocument()
    expect(screen.queryByText(/Fundir/i)).not.toBeInTheDocument()
  })
})

describe('a leitura nunca é truncada em silêncio (CLI-02, CLI-12)', () => {
  it('o rodapé mostra o intervalo do SERVIDOR, e não `rows.length`', () => {
    // O defeito antigo era literal: `footer={<span>{customers.length} cliente(s)</span>}` sobre uma
    // leitura sem `range`. Com mais de 1.000 clientes, aquele número era o truncado.
    renderPage()
    expect(screen.getAllByText('1–25 de 324').length).toBeGreaterThan(0)
  })

  it('o botão de exportar carrega o total do filtro', () => {
    renderPage()
    expect(screen.getByText('Exportar 324 do filtro')).toBeInTheDocument()
  })

  it('exportar usa `fetchAllFiltered`, e leitura truncada vira erro', async () => {
    fetchAllMock.mockRejectedValue(new Error('leitura truncada: 1000 de 324'))
    renderPage()
    fireEvent.click(screen.getByText('Exportar 324 do filtro'))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(exportMock).not.toHaveBeenCalled()
  })
})

describe('visões, busca e erro', () => {
  it('as seis visões existem', () => {
    renderPage()
    const abas = screen.getByRole('tablist')

    for (const label of [
      'Todas', 'Voltaram', 'Confiaram material', 'Compraram uma vez só',
      'Cadastro sem compra', 'Possíveis duplicadas',
    ]) {
      expect(within(abas).getByRole('tab', { name: label })).toBeInTheDocument()
    }
  })

  it('a busca alcança nome, e-mail, telefone e CPF', () => {
    renderPage()
    expect(screen.getByPlaceholderText('Nome, e-mail, telefone ou CPF...')).toBeInTheDocument()
  })

  it('erro de leitura aparece como erro', () => {
    listMock.mockReturnValue(listResult({ rows: [], total: 0, error: 'connection refused' }))
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('connection refused')
  })

  it('o nome é link para a ficha em rota própria', () => {
    renderPage()
    expect(tabela().getByRole('link', { name: 'Luciana Prado' })).toHaveAttribute(
      'href',
      '/admin/clientes/c1',
    )
  })
})
