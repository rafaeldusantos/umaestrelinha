import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../AccountPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('@estrelinha/supabase/client', () => ({ supabase: {} }))

const { authState, openSpy } = vi.hoisted(() => ({
  authState: {
    user: null as any,
    customer: null as any,
    loading: false,
    signOut: vi.fn(),
    // Feature 59 (T27): "Meus dados" grava pelo contexto.
    updateCustomerProfile: vi.fn(),
    patchCustomer: vi.fn(),
  },
  openSpy: vi.fn(),
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

// Feature 59: a coluna lateral e o pagamento perdido leem o WhatsApp da loja em `store_settings`.
const { lojaSettings } = vi.hoisted(() => ({ lojaSettings: { whatsapp: '' } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => lojaSettings,
}))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openSpy }) }))

// Feature 59 (T27): o cartão de endereço lê o padrão da cliente, e o de dados grava o documento.
// Os dublês ficam na fronteira de dados — os cartões montados são os de verdade.
const { enderecoPadrao, cpfMutate } = vi.hoisted(() => ({
  enderecoPadrao: { current: null as any, pedidoPor: [] as unknown[] },
  cpfMutate: vi.fn(),
}))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({
  DEFAULT_ADDRESS_KEY: 'default-address',
  useDefaultAddress: (customerId: unknown) => {
    enderecoPadrao.pedidoPor.push(customerId)
    return { data: enderecoPadrao.current, isLoading: false }
  },
}))
vi.mock('@/entities/customer/api/useSaveCustomerCpf', async (original) => ({
  ...(await original<object>()),
  useSaveCustomerCpf: () => ({ mutateAsync: cpfMutate, isPending: false }),
}))

const baseOrder = {
  order_number: 'NP-1',
  customer_name: 'Ana',
  customer_email: 'ana@x.com',
  status: 'pending',
  payment_method: 'pix',
  subtotal: 50,
  discount: 0,
  shipping_cost: 0,
  total: 50,
  created_at: '2026-07-18T10:00:00Z',
  order_items: [],
}

const listagem = {
  current: [
    { ...baseOrder, id: 'order-pending', order_number: 'NP-1', payment_status: 'pending' },
    { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
  ] as Record<string, unknown>[],
}

// Feature 59 (`LST-07`, `LST-08`): a consulta passou a ter três estados além dos dados. O padrão é o
// de sempre — carregada, sem erro —, e os casos da `59` trocam quando é o estado que se mede.
const consulta = vi.hoisted(() => ({ isLoading: false, isError: false, refetch: vi.fn() }))

vi.mock('@/entities/order/api/useOrders', () => ({
  useOrdersByCustomerId: () => ({
    data: consulta.isLoading || consulta.isError ? undefined : listagem.current,
    isLoading: consulta.isLoading,
    isError: consulta.isError,
    refetch: consulta.refetch,
  }),
}))

const renderPage = (path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = { id: 'u1', email: 'ana@x.com' }
  authState.customer = { id: 'c1', name: 'Ana', email: 'ana@x.com' }
  authState.loading = false
  consulta.isLoading = false
  consulta.isError = false
  lojaSettings.whatsapp = ''
  enderecoPadrao.current = null
  enderecoPadrao.pedidoPor = []
  authState.updateCustomerProfile.mockResolvedValue({ error: null })
  listagem.current = [
    { ...baseOrder, id: 'order-pending', order_number: 'NP-1', payment_status: 'pending' },
    { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
  ]
})

describe('AccountPage — login gating (AUTH-01, AUTH-05)', () => {
  it('deslogado abre o overlay de login com returnTo=/conta', () => {
    authState.user = null
    authState.customer = null
    renderPage()
    expect(openSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
  })
})

/**
 * ⚠️ Este bloco media o **diálogo** de pagamento dentro da lista. A feature `58` o removeu
 * (`PIX-P3-04`): duas superfícies montando o mesmo pagamento são dois donos de "onde se paga um
 * pedido pendente", e a daqui já nascia errada — montava sem `amount`, então o valor em destaque
 * (`CNF-01`) não aparecia. Os casos foram **invertidos**, não apagados.
 */
describe('AccountPage — a conta LINKA para a rota do pagamento (PIX-P3-04)', () => {
  it('pedido pendente de PIX exibe "Pagar com PIX"; o aprovado não exibe', () => {
    renderPage()

    expect(screen.getAllByRole('link', { name: /pagar com pix/i })).toHaveLength(1)
  })

  it('a ação é um LINK para `/pedido/<id>/pagamento`, não um botão que abre diálogo', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /pagar com pix/i })).toHaveAttribute(
      'href',
      '/pedido/order-pending/pagamento',
    )
    expect(screen.queryByRole('button', { name: /pagar com pix/i })).not.toBeInTheDocument()
  })

  it('nenhuma superfície de pagamento é montada nesta tela', () => {
    // A metade que o link sozinho não prova: um diálogo montado e fechado continuaria existindo na
    // árvore em algumas formas de implementação, e o QR voltaria junto.
    const { container } = renderPage()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('svg[aria-label="QR Code PIX"]')).toBeNull()
    expect(screen.queryByLabelText(/copia e cola/i)).not.toBeInTheDocument()
  })

  it('pedido pendente de CARTÃO não ganha "Pagar com PIX"', () => {
    // Antes da feature `58` o botão aparecia em qualquer pedido pendente, inclusive de cartão — e
    // levava a um QR que o pedido não podia receber.
    listagem.current = [
      { ...baseOrder, id: 'order-card', order_number: 'NP-3', payment_status: 'pending', payment_method: 'card' },
    ]
    renderPage()

    expect(screen.queryByRole('link', { name: /pagar com pix/i })).not.toBeInTheDocument()
  })
})

// =================================================================================================
// Feature 59 — a conta reescrita: saudação, abas, pendências e a lista (`LST-01`, `LST-04..10`)
// =================================================================================================

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/)

describe('AccountPage — a ordem da página (LST-01)', () => {
  it('saudação, as abas, "Precisa da sua atenção" e "Seus pedidos" — nesta ordem', () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com' }
    renderPage('/conta')

    const saudacao = screen.getByText('Olá, Ana')
    const abas = screen.getByRole('navigation', { name: 'Minha conta' })
    const atencao = screen.getByRole('heading', { name: 'Precisa da sua atenção' })
    const lista = screen.getByRole('region', { name: 'Seus pedidos' })
    const antes = (a: Element, b: Element) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

    expect(antes(saudacao, abas)).toBe(true)
    expect(antes(abas, atencao)).toBe(true)
    expect(antes(atencao, lista)).toBe(true)
    expect(screen.getByText('ana@x.com')).toBeInTheDocument()
  })

  it('a aba "Pedidos" leva a contagem de pedidos', () => {
    renderPage('/conta')

    const pedidos = within(screen.getByRole('navigation', { name: 'Minha conta' })).getByRole('link', {
      name: /Pedidos/,
    })
    expect(pedidos.textContent).toBe('Pedidos2')
  })

  it('sem pendência, o bloco "Precisa da sua atenção" não existe e a lista continua (PEN-07)', () => {
    listagem.current = [
      { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
    ]
    renderPage('/conta')

    expect(screen.queryByText('Precisa da sua atenção')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pedido #NP-2/ })).toHaveAttribute('href', '/pedido/order-paid')
  })

  it('a lista desenha um link por pedido, para o detalhe (LST-02)', () => {
    renderPage('/conta')

    const lista = screen.getByRole('region', { name: 'Seus pedidos' })
    expect(within(lista).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      '/pedido/order-pending',
      '/pedido/order-paid',
    ])
  })
})

describe('AccountPage — a saudação no celular (LST-04, LST-05)', () => {
  it('o avatar mantém 48×48 e não encolhe; o e-mail corta com reticências', () => {
    authState.user = { id: 'u1', email: 'uma.cliente.com.um.email.bem.comprido@dominio-longo.com.br' }
    renderPage('/conta')

    expect(tokens(screen.getByTestId('account-avatar'))).toEqual(
      expect.arrayContaining(['h-12', 'w-12', 'shrink-0']),
    )
    expect(tokens(screen.getByText('uma.cliente.com.um.email.bem.comprido@dominio-longo.com.br'))).toContain(
      'truncate',
    )
  })

  it('as iniciais vêm do nome ("Ana Nunes" → "AN")', () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com' }
    renderPage('/conta')

    expect(screen.getByTestId('account-avatar').textContent).toBe('AN')
  })
})

describe('AccountPage — as abas são endereços (LST-01, `/conta/dados`)', () => {
  it('em `/conta`, "Pedidos" é a aba atual; as duas são links de 48px', () => {
    renderPage('/conta')
    const nav = within(screen.getByRole('navigation', { name: 'Minha conta' }))

    const pedidos = nav.getByRole('link', { name: /Pedidos/ })
    const dados = nav.getByRole('link', { name: 'Meus dados' })
    expect(pedidos).toHaveAttribute('href', '/conta')
    expect(pedidos).toHaveAttribute('aria-current', 'page')
    expect(dados).toHaveAttribute('href', '/conta/dados')
    expect(dados).not.toHaveAttribute('aria-current')
    expect(tokens(pedidos)).toContain('h-12')
    expect(tokens(dados)).toContain('h-12')
  })

  it('em `/conta/dados`, "Meus dados" é a atual e a página mostra os dados, não a lista', () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com' }
    renderPage('/conta/dados')
    const nav = within(screen.getByRole('navigation', { name: 'Minha conta' }))

    expect(nav.getByRole('link', { name: 'Meus dados' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: /Pedidos/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('region', { name: 'Dados pessoais' })).toHaveTextContent('Ana Nunes')
    expect(screen.queryByRole('region', { name: 'Seus pedidos' })).not.toBeInTheDocument()
    expect(screen.queryByText('Precisa da sua atenção')).not.toBeInTheDocument()
  })

  it('em `/conta/dados`, "Sair da conta" continua na página e chama o `signOut`', () => {
    renderPage('/conta/dados')

    fireEvent.click(within(screen.getByRole('region', { name: 'Dados pessoais' })).getByRole('button', { name: 'Sair da conta' }))
    expect(authState.signOut).toHaveBeenCalledTimes(1)
  })

  it('sem sessão em `/conta/dados`, o login abre e devolve à mesma aba (LST-09)', () => {
    authState.user = null
    authState.customer = null
    renderPage('/conta/dados')

    expect(openSpy).toHaveBeenCalledWith({ returnTo: '/conta/dados' })
  })

  it('sem sessão em `/conta`, o retorno é `/conta` (LST-09)', () => {
    authState.user = null
    authState.customer = null
    renderPage('/conta')

    expect(openSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
  })
})

describe('AccountPage — carregando e erro (LST-07, LST-08)', () => {
  it('carregando: esqueleto, sem "Carregando" e sem estado vazio', () => {
    consulta.isLoading = true
    renderPage('/conta')

    expect(screen.getByTestId('order-list-skeleton')).toBeInTheDocument()
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Você ainda não fez nenhum pedido.')).not.toBeInTheDocument()
  })

  it('erro: a mensagem e "Tentar de novo" relendo a consulta — nunca "você não tem pedidos"', () => {
    consulta.isError = true
    renderPage('/conta')

    expect(screen.getByText('Não conseguimos carregar seus pedidos.')).toBeInTheDocument()
    expect(screen.queryByText('Você ainda não fez nenhum pedido.')).not.toBeInTheDocument()
    expect(screen.queryByText('Precisa da sua atenção')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(consulta.refetch).toHaveBeenCalledTimes(1)
  })

  it('sem pedidos: o estado vazio com o link para a Home (LST-06)', () => {
    listagem.current = []
    renderPage('/conta')

    expect(screen.getByText('Você ainda não fez nenhum pedido.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conhecer as joias' })).toHaveAttribute('href', '/')
  })
})

describe('AccountPage — o computador (LST-10)', () => {
  it('duas colunas: a lateral de 264px e a principal; no celular, uma pilha', () => {
    const { container } = renderPage('/conta')

    const grade = container.querySelector('aside')?.parentElement
    expect(tokens(grade)).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'lg:grid', 'lg:grid-cols-[264px_minmax(0,1fr)]']),
    )
  })

  it('a navegação lateral tem Favoritos e "Sair da conta", que só aparecem a partir de `lg`', () => {
    renderPage('/conta')
    const nav = within(screen.getByRole('navigation', { name: 'Minha conta' }))

    const favoritos = nav.getByRole('link', { name: 'Favoritos' })
    expect(favoritos).toHaveAttribute('href', '/favoritos')
    expect(tokens(favoritos)).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))

    const sair = nav.getByRole('button', { name: 'Sair da conta' })
    expect(tokens(sair)).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))
    fireEvent.click(sair)
    expect(authState.signOut).toHaveBeenCalledTimes(1)
  })

  it('o título "Pedidos" e o subtítulo aparecem no computador e ficam para o leitor de tela no celular', () => {
    renderPage('/conta')

    const h1 = screen.getByRole('heading', { level: 1, name: 'Pedidos' })
    expect(tokens(h1.parentElement)).toEqual(expect.arrayContaining(['sr-only', 'lg:not-sr-only']))
    expect(screen.getByText('Acompanhe cada joia, da chegada do material até a entrega.')).toBeInTheDocument()
  })

  it('o bloco de ajuda leva ao WhatsApp da loja; sem número configurado, some', () => {
    lojaSettings.whatsapp = '51998765432'
    const { unmount } = renderPage('/conta')

    const link = screen.getByRole('link', { name: 'Conversar no WhatsApp' })
    expect(new URL(link.getAttribute('href') as string).pathname).toBe('/51998765432')
    unmount()

    lojaSettings.whatsapp = ''
    renderPage('/conta')
    expect(screen.queryByText('Precisa de ajuda?')).not.toBeInTheDocument()
  })
})

describe('AccountPage — paleta (SIT-13)', () => {
  it('nenhuma classe de cor padrão do Tailwind sobra na conta', () => {
    listagem.current = [
      { ...baseOrder, id: 'a', payment_status: 'approved', discount: 10 },
      { ...baseOrder, id: 'b', payment_status: 'expired', created_at: '2026-01-01T10:00:00Z' },
    ]
    const { container } = renderPage('/conta')

    expect(container.innerHTML).not.toMatch(/(?:text|bg|border)-(?:yellow|blue|purple|green|red)-\d/)
  })
})

// =================================================================================================
// Feature 59 — T28: a bolha do WhatsApp não cobre o último bloco (ACB-02)
// =================================================================================================

describe('AccountPage — o fim da página reserva o espaço da bolha (ACB-02)', () => {
  it.each(['/conta', '/conta/dados'])('em %s, a folga da bolha no fim da página, no celular e no `md`', (path) => {
    const { container } = renderPage(path)

    const pagina = container.querySelector('aside')?.parentElement?.parentElement
    expect(tokens(pagina)).toEqual(expect.arrayContaining(['container', 'pb-40', 'md:pb-24']))
    // Nenhum `py`/`pb` concorrente para disputar a folga na cascata.
    expect(tokens(pagina).filter((t) => /^(?:lg:|md:)?(?:py|pb)-/.test(t))).toEqual(['pb-40', 'md:pb-24'])
  })
})

// =================================================================================================
// Feature 59 — T27: a aba "Meus dados" monta os cartões de verdade (DAD-01)
// =================================================================================================

describe('AccountPage — "Meus dados" pela página real (DAD-01)', () => {
  it('"Dados pessoais" com "Editar", "Endereço de entrega" com "Alterar", e "Sair da conta" depois dos dois', () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com', phone: '51998765432', cpf: '' }
    enderecoPadrao.current = {
      cep: '90010000',
      street: 'Rua da Praia',
      number: '100',
      complement: '',
      neighborhood: 'Centro Histórico',
      city: 'Porto Alegre',
      state: 'RS',
    }
    renderPage('/conta/dados')

    const dados = screen.getByRole('region', { name: 'Dados pessoais' })
    expect(within(dados).getByRole('heading', { name: 'Dados pessoais' })).toBeInTheDocument()
    expect(within(dados).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(dados).getByText('(51) 99876-5432')).toBeInTheDocument()

    const endereco = within(dados).getByRole('region', { name: 'Endereço de entrega' })
    expect(within(endereco).getByText('Rua da Praia, 100')).toBeInTheDocument()
    expect(within(endereco).getByRole('button', { name: 'Alterar' })).toBeInTheDocument()
    // O cartão de endereço lê o padrão DESTA cliente.
    expect(enderecoPadrao.pedidoPor).toContain('c1')

    const sair = within(dados).getByRole('button', { name: 'Sair da conta' })
    expect(tokens(sair)).toEqual(expect.arrayContaining(['h-12', 'w-full', 'lg:hidden']))
    expect(endereco.contains(sair)).toBe(false)
    expect(endereco.compareDocumentPosition(sair) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('editar e salvar pela página grava pelo contexto (`updateCustomerProfile`)', async () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com', phone: '51998765432' }
    renderPage('/conta/dados')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), { target: { value: 'Ana Maria Nunes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(authState.updateCustomerProfile).toHaveBeenCalledWith({
        name: 'Ana Maria Nunes',
        phone: '(51) 99876-5432',
      }),
    )
  })

  it('o CPF preenchido pela primeira vez acerta o contexto (`patchCustomer`)', async () => {
    authState.customer = { id: 'c1', name: 'Ana Nunes', email: 'ana@x.com', phone: '', cpf: null }
    cpfMutate.mockResolvedValue('52998224725')
    renderPage('/conta/dados')

    fireEvent.change(screen.getByRole('textbox', { name: 'CPF' }), { target: { value: '52998224725' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar CPF' }))

    await waitFor(() => expect(authState.patchCustomer).toHaveBeenCalledWith({ cpf: '52998224725' }))
    expect(cpfMutate).toHaveBeenCalledWith({ customerId: 'c1', cpf: '529.982.247-25' })
  })

  it('sem endereço salvo, a página mostra "Nenhum endereço salvo." e o caminho para adicionar', () => {
    renderPage('/conta/dados')

    const endereco = screen.getByRole('region', { name: 'Endereço de entrega' })
    expect(within(endereco).getByText('Nenhum endereço salvo.')).toBeInTheDocument()
    expect(within(endereco).getByRole('button', { name: 'Adicionar endereço' })).toBeInTheDocument()
  })
})
