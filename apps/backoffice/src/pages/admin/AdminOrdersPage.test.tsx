// `TST-01` — a listagem de pedidos na TELA.
//
// A tela não tinha teste nenhum, e carregava quatro defeitos que **nada no repositório acusava**.
// Os casos abaixo estão organizados por defeito: cada `describe` nomeia o que estava errado, para
// que uma regressão futura chegue com o nome do problema, e não com "expected 2 to be 3".

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { AdminOrderRow } from '@/entities/order/api/orderQuery'

const {
  listMock, toastErrorMock, toastSuccessMock, setMaterialStatusMock, updateStatusMock,
  fetchAllMock, refetchMock, exportMock, openMock,
} = vi.hoisted(() => ({
  listMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  setMaterialStatusMock: vi.fn(),
  updateStatusMock: vi.fn(),
  fetchAllMock: vi.fn(),
  refetchMock: vi.fn(),
  exportMock: vi.fn(),
  openMock: vi.fn(),
}))

vi.mock('@/entities/order/api/useAdminOrderList', () => ({ useAdminOrderList: listMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    setMaterialStatus: setMaterialStatusMock,
    updateStatus: updateStatusMock,
  }),
}))
vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock, message: vi.fn() },
}))
vi.mock('@/features/export-orders/lib/exportCsv', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/export-orders/lib/exportCsv')>()),
  exportOrdersCsv: exportMock,
}))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))

import AdminOrdersPage from './AdminOrdersPage'

let seq = 0
const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: `o${++seq}`,
  order_number: `100${seq}`,
  customer_id: 'c1',
  customer_name: 'Luciana Prado',
  customer_email: 'lu.prado@example.com',
  status: 'paid',
  payment_status: 'approved',
  payment_method: 'pix',
  total: 389,
  tracking_code: null,
  material_tracking_code: null,
  material_status: 'aguardando_material',
  material_received_at: null,
  created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
  notes: null,
  purchase_ordinal: 1,
  customer_phone: null,
  ...over,
})

const listResult = (over: Record<string, unknown> = {}) => ({
  rows: [row()],
  total: 148,
  loading: false,
  error: null,
  viewCounts: {
    'precisa-acao': 12, tudo: 148, 'fila-material': 9,
    'a-separar': 4, 'em-transito': 23, concluidos: 96,
  },
  tileCounts: { aguardando: 5, 'a-separar': 4, 'sem-rastreio': 3, 'pix-aguardando': 7 },
  oldestWaitingAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  refetch: refetchMock,
  fetchAllFiltered: fetchAllMock,
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminOrdersPage />
    </MemoryRouter>,
  )

/**
 * As consultas são ESCOPADAS de propósito.
 *
 * "Aguardando material" é, ao mesmo tempo, o rótulo do primeiro contador e o texto do selo de
 * material na linha — e a tela renderiza a tabela (desktop) E os cartões (mobile), porque quem
 * esconde uma das duas é `media query`, que jsdom não aplica. Um `getByText` solto casa três nós
 * e falha por ambiguidade, dizendo a coisa errada sobre um comportamento que está certo.
 */
const tiles = () => within(screen.getByRole('group', { name: 'O que precisa de ação' }))
const tabela = () => within(screen.getByRole('table'))

beforeEach(() => {
  seq = 0
  vi.clearAllMocks()
  listMock.mockReturnValue(listResult())
  fetchAllMock.mockResolvedValue([row(), row()])
  setMaterialStatusMock.mockResolvedValue({ ok: true, reason: null })
  updateStatusMock.mockResolvedValue({ error: null, emailSent: false })
  window.localStorage.clear()
  vi.stubGlobal('open', openMock)
})

describe('o topo diz o que COBRA, não o que existe (PED-12)', () => {
  it('mostra os quatro contadores, e o de Pix declara que não é fila', () => {
    renderPage()

    expect(tiles().getByText('Aguardando material')).toBeInTheDocument()
    expect(tiles().getByText('Pago, a separar')).toBeInTheDocument()
    expect(tiles().getByText('Enviado sem rastreio')).toBeInTheDocument()
    expect(tiles().getByText('Pix aguardando')).toBeInTheDocument()

    // A frase existe para impedir que quatro números lado a lado se leiam como quatro dívidas.
    expect(tiles().getByText('Expiram sozinhos — nada a fazer')).toBeInTheDocument()
  })

  it('o primeiro contador carrega a idade do mais antigo', () => {
    renderPage()
    // Escopado ao tile: o subtítulo do cabeçalho carrega a mesma frase, de propósito — os dois
    // respondem "há quanto tempo?", um para a fila inteira e outro para o contador.
    expect(tiles().getByText(/o mais antigo parado há 9 dias/)).toBeInTheDocument()
  })

  it('o subtítulo usa a UNIÃO do servidor, e não a soma dos tiles', () => {
    // Os tiles se sobrepõem: um pedido pago que ainda espera o envelope está em "aguardando" e em
    // "a separar". Somar (5+4+3=12) contaria duas vezes. O número certo é o da visão
    // `Precisa de ação`, que o servidor calcula como união — aqui, 12 por coincidência dos mocks,
    // e o teste abaixo prova que é a visão que manda.
    renderPage()
    expect(screen.getByText(/12 esperando alguma coisa sua/)).toBeInTheDocument()
  })

  it('o subtítulo acompanha a VISÃO, mesmo quando a soma dos tiles é outra', () => {
    // Foi medido no navegador: com 8 pedidos, a soma dizia 7 e a aba dizia 4. Duas frases sobre a
    // mesma coisa, discordando na mesma tela.
    listMock.mockReturnValue(
      listResult({
        viewCounts: {
          'precisa-acao': 4, tudo: 8, 'fila-material': 6,
          'a-separar': 4, 'em-transito': 2, concluidos: 1,
        },
        tileCounts: { aguardando: 3, 'a-separar': 3, 'sem-rastreio': 1, 'pix-aguardando': 1 },
      }),
    )
    renderPage()

    expect(screen.getByText(/4 esperando alguma coisa sua/)).toBeInTheDocument()
    expect(screen.queryByText(/7 esperando alguma coisa sua/)).not.toBeInTheDocument()
  })

  it('clicar num contador aplica o filtro dele', () => {
    renderPage()
    fireEvent.click(tiles().getByText('Enviado sem rastreio'))

    // O chip aparece porque o filtro entrou — e é o chip que dá o caminho de volta.
    expect(screen.getByText('Sem rastreio de saída')).toBeInTheDocument()
  })
})

describe('"Limpar filtros" limpa TUDO e aparece sempre (PED-04)', () => {
  it('o botão aparece quando só o material está filtrado — o defeito antigo', () => {
    // A condição antiga era `(dateFrom || dateTo || paymentFilter !== 'all' || searchQuery)`: com só
    // a fila de material ligada, o botão NÃO aparecia, e a lista ficava filtrada sem saída visível.
    renderPage()
    fireEvent.click(tiles().getByText('Aguardando material'))

    expect(screen.getByText(/Limpar/)).toBeInTheDocument()
  })

  it('o rótulo diz QUANTOS filtros serão limpos', () => {
    renderPage()
    fireEvent.click(tiles().getByText('Pix aguardando'))

    // O tile de Pix liga dois eixos (método e situação do pagamento).
    expect(screen.getByText('Limpar os 2')).toBeInTheDocument()
  })

  it('limpar remove TODOS os chips, inclusive status e material', () => {
    renderPage()
    fireEvent.click(tiles().getByText('Aguardando material'))
    expect(screen.getByText(/^Material:/)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Limpar/))
    expect(screen.queryByText(/^Material:/)).not.toBeInTheDocument()
  })

  it('cada chip tem o seu próprio × ', () => {
    renderPage()
    fireEvent.click(tiles().getByText('Enviado sem rastreio'))

    const chip = screen.getByLabelText('Remover filtro Sem rastreio de saída')
    fireEvent.click(chip)

    expect(screen.queryByText('Sem rastreio de saída')).not.toBeInTheDocument()
  })
})

describe('as contagens das abas vêm do servidor e concordam (PED-07)', () => {
  it('cada visão mostra a contagem que o hook devolveu', () => {
    renderPage()
    const abas = screen.getByRole('tablist')

    expect(within(abas).getByText('12')).toBeInTheDocument()
    expect(within(abas).getByText('148')).toBeInTheDocument()
    expect(within(abas).getByText('96')).toBeInTheDocument()
  })
})

describe('erro de leitura APARECE (PED-08)', () => {
  it('a faixa de erro é exibida, e não o estado vazio', () => {
    // O defeito antigo: `if (error) setOrders([])`, e a tela mostrava "Nenhum pedido encontrado" —
    // que é a frase para "o filtro não casou nada", não para "o banco não respondeu".
    listMock.mockReturnValue(listResult({ rows: [], total: 0, error: 'connection refused' }))
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('connection refused')
  })

  it('a mensagem vazia MUDA quando houve erro', () => {
    listMock.mockReturnValue(listResult({ rows: [], total: 0, error: 'boom' }))
    renderPage()

    expect(screen.getByText('A lista não pôde ser carregada.')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum pedido neste filtro.')).not.toBeInTheDocument()
  })
})

describe('o CSV exporta o FILTRO, não a página (PED-05)', () => {
  it('o botão carrega o total do filtro no rótulo', () => {
    renderPage()
    expect(screen.getByText('Exportar 148 do filtro')).toBeInTheDocument()
  })

  it('exportar chama `fetchAllFiltered`, e não usa as linhas da página', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Exportar 148 do filtro'))

    await waitFor(() => expect(fetchAllMock).toHaveBeenCalled())
    expect(exportMock).toHaveBeenCalledWith(await fetchAllMock.mock.results[0].value)
  })

  it('leitura truncada vira ERRO, e não um arquivo menor em silêncio', async () => {
    fetchAllMock.mockRejectedValue(new Error('leitura truncada: 20 de 148'))
    renderPage()
    fireEvent.click(screen.getByText('Exportar 148 do filtro'))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('leitura truncada: 20 de 148'))
    expect(exportMock).not.toHaveBeenCalled()
  })
})

describe('seleção em massa (PED-16, PED-17)', () => {
  it('a barra só aparece com alguma linha selecionada', () => {
    renderPage()
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Selecionar pedido 1001'))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('oferece selecionar os N do filtro, e não só a página', () => {
    renderPage()
    fireEvent.click(screen.getByLabelText('Selecionar pedido 1001'))

    expect(screen.getByText('Selecionar os 148 do filtro')).toBeInTheDocument()
  })

  it('o lote resume quantas passaram e quantas não — e recusa NÃO é erro', async () => {
    listMock.mockReturnValue(listResult({ rows: [row(), row(), row()] }))
    setMaterialStatusMock
      .mockResolvedValueOnce({ ok: true, reason: null })
      .mockResolvedValueOnce({ ok: false, reason: 'invalid_transition' })
      .mockResolvedValueOnce({ ok: true, reason: null })

    renderPage()
    fireEvent.click(screen.getByLabelText('Selecionar a página'))
    fireEvent.click(screen.getByText('Marcar material recebido'))

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        '2 marcadas · 1 não estava em estado que permite',
      ),
    )
    // Recusa é o caso esperado (outra aba já atualizou). Não pode virar toast de erro.
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('uma transição inválida NÃO aborta as outras', async () => {
    listMock.mockReturnValue(listResult({ rows: [row(), row(), row()] }))
    setMaterialStatusMock.mockResolvedValueOnce({ ok: false, reason: 'invalid_transition' })

    renderPage()
    fireEvent.click(screen.getByLabelText('Selecionar a página'))
    fireEvent.click(screen.getByText('Marcar material recebido'))

    // Três chamadas, e não uma seguida de abort: a primeira falhar não pode fazer a Adri repetir
    // o lote inteiro por causa de um pedido que outra aba já atualizou.
    await waitFor(() => expect(setMaterialStatusMock).toHaveBeenCalledTimes(3))
  })
})

describe('a linha diz a idade e liga ao cliente (PED-13, PED-21, PED-22)', () => {
  it('parado há 9 dias aparece com o prefixo "parado"', () => {
    renderPage()
    // Duas vezes: a idade do pedido (coluna Pedido) e o marcador da fila (coluna Material).
    expect(tabela().getAllByText('parado há 9 dias').length).toBeGreaterThan(0)
  })

  it('pedido sem material ainda mostra a idade — travessão sem explicação não serve', () => {
    listMock.mockReturnValue(
      listResult({
        rows: [row({
          material_status: 'nao_aplicavel',
          created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
        })],
      }),
    )
    renderPage()

    expect(tabela().getByText('há 6 dias')).toBeInTheDocument()
  })

  it('só o terceiro degrau diz "parado" — 2 dias não', () => {
    listMock.mockReturnValue(
      listResult({ rows: [row({ created_at: new Date(Date.now() - 2 * 86400000).toISOString() })] }),
    )
    renderPage()

    expect(tabela().getAllByText('há 2 dias').length).toBeGreaterThan(0)
    expect(tabela().queryByText(/parado há/)).not.toBeInTheDocument()
  })

  it('o nome da cliente é link para a ficha', () => {
    renderPage()
    expect(tabela().getByRole('link', { name: 'Luciana Prado' })).toHaveAttribute(
      'href',
      '/admin/clientes/c1',
    )
  })

  it('cliente sem cadastro não vira link quebrado', () => {
    listMock.mockReturnValue(listResult({ rows: [row({ customer_id: null })] }))
    renderPage()

    expect(tabela().queryByRole('link', { name: 'Luciana Prado' })).not.toBeInTheDocument()
    expect(tabela().getByText('Luciana Prado')).toBeInTheDocument()
  })

  it('enviado sem código se anuncia como falha, não como vazio', () => {
    listMock.mockReturnValue(
      listResult({ rows: [row({ status: 'shipped', tracking_code: null })] }),
    )
    renderPage()

    expect(tabela().getByText('sem código')).toBeInTheDocument()
  })
})

describe('rodapé e tamanho de página (PED-20)', () => {
  it('o rodapé mostra o intervalo, e não `rows.length`', () => {
    renderPage()

    // Duas ocorrências, e as duas importam: o rodapé da tabela (desktop) e o do fim dos cartões
    // (mobile). Se uma das superfícies passasse a exibir `rows.length`, ela mostraria "1" aqui.
    const rodapes = screen.getAllByText('1–25 de 148')
    expect(rodapes).toHaveLength(2)
  })
})
