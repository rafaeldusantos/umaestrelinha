import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useOrder } from '@/entities/order/api/useOrder'
import type { OrderDetail } from '@/entities/order/api/useOrder'
import OrderConfirmationPage from '../OrderConfirmationPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

// CNF-03: a confirmação é rota (`/pedido/:id`) — recompõe do banco, sobrevive ao reload e não
//         depende de nenhum estado do checkout.
// CNF-04: número do pedido, valor pago, e-mail da cliente e a linha do tempo com a janela de
//         entrega lida das colunas de estimativa (SHP-08). A timeline de 4 estágios foi revogada
//         pela feature 59 (jornada vertical, `DET-05..07`).
// CNF-05: **uma** ação primária ("Acompanhar pedido" → /conta, pílula geleia) e uma secundária
//         ("Ver mais joias" → /, contorno tinta); carrinho e cupom limpos só na aprovação.

vi.mock('@/entities/order/api/useOrder', async () => {
  const actual = await vi.importActual<typeof import('@/entities/order/api/useOrder')>(
    '@/entities/order/api/useOrder',
  )
  return { ...actual, useOrder: vi.fn() }
})

// Feature 49: a convidada chega aqui SEM sessão, e a tela oferece a ela o caminho que funciona —
// o código por e-mail — em vez de mandá-la a uma conta em que ela nunca entrou.
const { authUser } = vi.hoisted(() => ({ authUser: { current: null as { id: string } | null } }))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: authUser.current }) }))

// Feature 59 (`DET-12`): o detalhe passou a fechar com a ajuda pelo WhatsApp, que lê o número da loja
// em `store_settings`. A página continua montada SEM `QueryClientProvider` (o caso do material,
// abaixo, depende disso), então a leitura das configurações é dublada aqui.
const { lojaSettings } = vi.hoisted(() => ({ lojaSettings: { whatsapp: '' } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => lojaSettings,
}))

const useOrderMock = vi.mocked(useOrder)

const order = (overrides: Partial<OrderDetail> = {}): OrderDetail =>
  ({
    id: 'order-1',
    order_number: 'NP-4821',
    customer_name: 'Marina Yamashita',
    customer_email: 'marina@email.com',
    customer_id: 'c1',
    status: 'pending',
    payment_method: 'pix',
    payment_status: 'approved',
    subtotal: 100,
    discount: 0,
    shipping_cost: 14.9,
    total: 109.9,
    shipping_service_id: '1',
    delivery_estimate_min: '2026-08-04',
    delivery_estimate_max: '2026-08-06',
    paid_at: '2026-07-27T12:00:00Z',
    created_at: '2026-07-27T17:58:00Z',
    order_items: [],
    ...overrides,
  }) as OrderDetail

const mockOrder = (
  state: { data?: OrderDetail | null; isLoading?: boolean; isError?: boolean } = {},
) =>
  useOrderMock.mockReturnValue({
    data: state.data ?? null,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as any)

const renderPage = (id = 'order-1') =>
  render(
    <MemoryRouter initialEntries={[`/pedido/${id}`]}>
      <Routes>
        <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
      </Routes>
    </MemoryRouter>,
  )

/**
 * `expression="wink"` é a única expressão que renderiza **um** olho pílula (`<rect>`): o outro
 * olho é o arco fechado. `happy`/`sad` renderizam dois; `heart`, `star` e `surprised`, nenhum.
 * A contagem de `rect` é, portanto, o discriminador de forma da expressão.
 */

beforeEach(() => {
  useOrderMock.mockReset()
  useCartStore.setState({ items: [] })
  useCouponStore.getState().clearCoupon()
  // O padrão dos casos antigos: havia sessão, porque o checkout a exigia.
  authUser.current = { id: 'usr-1' }
  lojaSettings.whatsapp = ''
})

describe('OrderConfirmationPage — o pedido é lido por id (CNF-03)', () => {
  it('busca o pedido pelo id da rota', () => {
    mockOrder({ data: order() })
    renderPage('order-42')

    expect(useOrderMock).toHaveBeenCalledWith('order-42')
  })

  it('renderiza a confirmação sem nenhum estado de checkout — carrinho vazio inclusive', () => {
    mockOrder({ data: order() })
    renderPage()

    expect(screen.getByText('É nosso!')).toBeInTheDocument()
    expect(screen.getByText(/NP-4821/)).toBeInTheDocument()
  })

  it('enquanto carrega não afirma que o pedido foi pago', () => {
    mockOrder({ isLoading: true })
    renderPage()

    expect(screen.getByText('Carregando seu pedido...')).toBeInTheDocument()
    expect(screen.queryByText('É nosso!')).not.toBeInTheDocument()
  })

  it('erro na busca é distinguido de pedido inexistente', () => {
    mockOrder({ isError: true })
    renderPage()

    expect(screen.getByText('Não conseguimos abrir este pedido')).toBeInTheDocument()
  })

  it('pedido inexistente informa isso, sem fingir confirmação', () => {
    mockOrder({ data: null })
    renderPage()

    expect(screen.getByText('Pedido não encontrado')).toBeInTheDocument()
    expect(screen.queryByText('É nosso!')).not.toBeInTheDocument()
  })
})

describe('OrderConfirmationPage — sem sessão, o acesso expirado tem saída (feature 49)', () => {
  it('quem não tem sessão recebe "Entrar com código", não "Ir para Minha conta"', () => {
    // Mandar a convidada a `/conta` é um conselho que não funciona: a conta dela existe, mas ela
    // nunca entrou nela. O caminho honesto é o código por e-mail.
    authUser.current = null
    mockOrder({ data: null })
    renderPage()

    expect(screen.getByRole('button', { name: 'Entrar com código' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir para Minha conta' })).not.toBeInTheDocument()
  })

  it('o texto explica a expiração em vez de culpar o link', () => {
    authUser.current = null
    mockOrder({ data: null })
    renderPage()

    expect(screen.getByText(/acesso a este pedido pode ter expirado/i)).toBeInTheDocument()
  })

  it('o alvo do botão tem os 44px da premissa mobile', () => {
    authUser.current = null
    mockOrder({ data: null })
    renderPage()

    // Token exato: `h-11` é substring de `min-h-11`, e conferir por `includes` aprovaria o errado.
    const botao = screen.getByRole('button', { name: 'Entrar com código' })
    expect(botao.className.split(/\s+/)).toContain('min-h-11')
  })

  it('COM sessão, o caminho continua sendo Minha conta — o par inverso', () => {
    // Sem este caso, uma implementação que trocasse o link por botão para todo mundo passaria.
    authUser.current = { id: 'usr-1' }
    mockOrder({ data: null })
    renderPage()

    expect(screen.getByRole('link', { name: 'Ir para Minha conta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com código' })).not.toBeInTheDocument()
  })

  it('erro de REDE sem sessão continua mandando a Minha conta, não ao código', () => {
    // Erro de rede não é expiração de acesso: oferecer o código ali faria a loja pedir que a
    // cliente digite um código para resolver um problema que é nosso.
    authUser.current = null
    mockOrder({ isError: true })
    renderPage()

    expect(screen.getByText('Não conseguimos abrir este pedido')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com código' })).not.toBeInTheDocument()
  })
})

describe('OrderConfirmationPage — conteúdo da confirmação (CNF-04)', () => {
  it('o cabeçalho fica de pé sem a ilustração de persona', () => {
    // A `CNF-04` original pedia a mascote da loja anterior aqui, piscando. A
    // persona saiu com o rebrand (`COP-07`), e o teste inverteu junto: ele
    // deixou de provar que a ilustração aparece e passa a provar que ela não
    // voltou. O cabeçalho da confirmação segue inteiro sem ela.
    mockOrder({ data: order() })
    renderPage()

    // Que a persona não POSSA voltar é a `brandScan.test.ts` que garante, e no
    // repositório inteiro — aqui se prova o que é desta tela: o cabeçalho da
    // confirmação continua de pé sem a ilustração que o sustentava no board.
    // Feature 59 (`DET-01`): o título passou a ser o número — a linha em caixa alta saiu. A régua
    // ficou mais estreita, não mais frouxa: além de existir um h1, ele tem de SER o número.
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido #NP-4821' })).toBeInTheDocument()
    expect(screen.queryByText(/PEDIDO #/)).not.toBeInTheDocument()
  })

  it('exibe o número do pedido, com o `#` do formatador (PIX-P4-03)', () => {
    // Até a feature `58` esta era a ÚNICA das quatro superfícies que mostrava o número **sem**
    // prefixo — a conta, o painel e o e-mail já o escreviam à mão, cada um do seu jeito. O `#`
    // passa a vir de `formatOrderNumber`, e é por isso que o literal aqui mudou: não é a régua que
    // afrouxou, é a tela que passou a concordar com as outras três.
    mockOrder({ data: order({ order_number: 'NP-9001' }) })
    renderPage()

    // ⚠️ INVERTIDO na feature 59 (`DET-01`, decisão do usuário em 2026-10-04): o número saiu da
    // linha em caixa alta e virou o TÍTULO. O `#` continua vindo do formatador, e a régua agora
    // exige o nome inteiro do h1 — não um trecho em qualquer lugar da tela.
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido #NP-9001' })).toBeInTheDocument()
    expect(screen.getAllByText(/NP-9001/)).toHaveLength(1)
  })

  it('o número da sequência sai com UM `#`, e o legado não ganha um segundo', () => {
    // O par do caso acima, com a forma que a `58` passou a gravar (`PIX-P4-01`). Sem ele, um
    // formatador que devolvesse o valor cru continuaria reprovando só no caso do legado.
    mockOrder({ data: order({ order_number: '0170' }) })
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Pedido #0170' })).toBeInTheDocument()
    expect(screen.queryByText(/##/)).not.toBeInTheDocument()
  })

  it('exibe o valor pago do pedido', () => {
    mockOrder({ data: order({ total: 109.9 }) })
    renderPage()

    expect(screen.getByText('R$ 109,90')).toBeInTheDocument()
  })

  it('exibe o e-mail da cliente', () => {
    mockOrder({ data: order({ customer_email: 'marina.y@email.com' }) })
    renderPage()

    expect(screen.getByText('marina.y@email.com')).toBeInTheDocument()
  })

  it('exibe a data do pagamento no selo do pedido', () => {
    mockOrder({ data: order({ paid_at: '2026-07-27T12:00:00Z' }) })
    renderPage()

    // ⚠️ INVERTIDO na feature 59: a data do pagamento saiu da linha em caixa alta ("PAGO EM 27 DE
    // JULHO", revogada com `DET-01`) e mora no bloco de pagamento (`DET-11`).
    expect(screen.getByText('Aprovado em 27 jul')).toBeInTheDocument()
    expect(screen.queryByText(/PAGO EM/)).not.toBeInTheDocument()
  })

  // ⚠️ INVERTIDOS na feature 59 (T11): `CNF-04` pedia a timeline horizontal de 4 estágios, e o
  // design da `59` a revogou em favor da jornada vertical (`DET-05..07`). Os dois casos continuam
  // provando a mesma coisa — a página monta a linha do tempo e lê a janela das colunas de
  // estimativa, sem inventar data —, agora com as etapas e a previsão da jornada, e cada um
  // GANHOU asserção (os nomes das etapas e a etapa atual).
  it('monta a jornada do pedido com a previsão de entrega lida das colunas (CNF-04 → DET-05/07)', () => {
    mockOrder({
      data: order({ delivery_estimate_min: '2026-08-04', delivery_estimate_max: '2026-08-06' }),
    })
    renderPage()

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Em produção no ateliê').closest('li')?.getAttribute('aria-current')).toBe(
      'step',
    )
    expect(screen.getByText('Previsão: entre 4 e 6 ago')).toBeInTheDocument()
  })

  it('pedido sem janela de estimativa mantém a jornada sem inventar data (CNF-04 → DET-07)', () => {
    mockOrder({ data: order({ delivery_estimate_min: null, delivery_estimate_max: null }) })
    renderPage()

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Entregue')).toBeInTheDocument()
    expect(screen.queryByText(/^Previsão/)).not.toBeInTheDocument()
  })

  it('pedido ainda não pago não afirma pagamento confirmado', () => {
    mockOrder({ data: order({ paid_at: null }) })
    renderPage()

    // ⚠️ INVERTIDO na feature 59: "AGUARDANDO PAGAMENTO" era a linha em caixa alta revogada com
    // `DET-01`; quem diz isso agora é o subtítulo da etapa.
    expect(screen.getByText('Pedido registrado')).toBeInTheDocument()
    expect(screen.queryByText('É nosso!')).not.toBeInTheDocument()
  })

  // Este teste era o inverso: asseverava a AUSÊNCIA da promessa, porque não havia infra de e-mail.
  // A feature 10 passou a enviar de verdade, então ele foi INVERTIDO em vez de apagado — o guard
  // continua valendo, só mudou de lado, e a metade que importa (não prometer comprovante em pedido
  // não pago) é justamente a que segue negativa.
  it('STO-01: pedido pago informa que o comprovante foi enviado, com o endereço', () => {
    mockOrder({ data: order() })
    const { container } = renderPage()

    expect(container.textContent).toMatch(/enviamos o comprovante para/i)
    expect(screen.getByText('marina@email.com')).toBeInTheDocument()
  })

  it('STO-01: pedido NÃO pago promete o aviso futuro e não alega comprovante enviado', () => {
    mockOrder({ data: order({ paid_at: null }) })
    const { container } = renderPage()

    expect(container.textContent).toMatch(/avisamos por e-?mail assim que ele cair/i)
    expect(container.textContent).not.toMatch(/enviamos o comprovante|comprovante foi enviado/i)
  })
})

describe('OrderConfirmationPage — ações (CNF-05)', () => {
  it('"Acompanhar pedido" é a ação primária em Carmim, na forma de ação, e aponta para /conta', () => {
    mockOrder({ data: order() })
    renderPage()

    const primary = screen.getByRole('link', { name: /acompanhar pedido/i })
    expect(primary).toHaveAttribute('href', '/conta')
    expect(primary.className).toContain('bg-estrelinha-primary')
    // Forma de ação é 14px (`rounded-sm`), não pílula — a pílula virou
    // rótulo na identidade papelaria (feature 19, PAP-04).
    expect(primary.className).toContain('rounded-sm')
    expect(primary.className).not.toContain('rounded-pill')
  })

  it('"Ver mais joias" é secundária em contorno tinta e aponta para a home', () => {
    mockOrder({ data: order() })
    renderPage()

    const secondary = screen.getByRole('link', { name: /ver mais joias/i })
    expect(secondary).toHaveAttribute('href', '/')
    expect(secondary.className).toContain('border-estrelinha-ink')
    expect(secondary.className).not.toContain('bg-estrelinha-primary')
  })

  it('existe uma única ação em Carmim na tela', () => {
    mockOrder({ data: order() })
    const { container } = renderPage()

    const primaryActions = container.querySelectorAll(
      '[class*="bg-estrelinha-primary"][class*="rounded-sm"]',
    )
    expect(primaryActions).toHaveLength(1)
    expect(primaryActions[0].textContent).toContain('Acompanhar pedido')
  })

  it('a página NÃO limpa carrinho nem cupom — isso acontece só na aprovação', () => {
    useCartStore.setState({
      items: [{
        product: { id: 'p1' } as any, size: '', finish: '', quantity: 1,
        variantId: null, variantLabel: '', optionValues: {}, unitPrice: 10,
      }],
    })
    useCouponStore.setState({ applied: { id: 'cp1', code: 'ESTRELA10' } as any })
    mockOrder({ data: order() })
    renderPage()

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCouponStore.getState().applied).not.toBeNull()
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha', () => {
    mockOrder({ data: order() })
    const { container } = renderPage()

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

/**
 * Feature `58` — **o pedido pendente ganhou caminho de volta para pagar** (`PIX-P3-01`,
 * `PIX-P3-02`, `PIX-P3-03`), board `58 I`.
 *
 * Até aqui esta tela oferecia "Acompanhar pedido" e "Ver mais joias" e nenhum caminho para pagar:
 * quem saía do PIX sem pagar só voltava pelo diálogo de `/conta`, que a convidada não alcança sem
 * entrar por código.
 */
describe('OrderConfirmationPage — voltar a pagar (PIX-P3-01 … PIX-P3-03)', () => {
  const pendente = (extra: Partial<OrderDetail> = {}) =>
    order({ paid_at: null, payment_status: 'pending', payment_method: 'pix', ...extra })

  const pagarComPix = () => screen.queryByRole('link', { name: /pagar com pix/i })

  it('pendente de PIX oferece "Pagar com PIX" apontando para a rota do pagamento', () => {
    mockOrder({ data: pendente() })
    renderPage()

    expect(pagarComPix()).toHaveAttribute('href', '/pedido/order-1/pagamento')
  })

  it('com o botão, ele é a ÚNICA pílula cheia — "Acompanhar pedido" desce para contorno', () => {
    mockOrder({ data: pendente() })
    const { container } = renderPage()

    const cheias = container.querySelectorAll(
      '[class*="bg-estrelinha-primary"][class*="rounded-sm"]',
    )
    expect(cheias).toHaveLength(1)
    expect(cheias[0].textContent).toContain('Pagar com PIX')

    const acompanhar = screen.getByRole('link', { name: /acompanhar pedido/i })
    expect(acompanhar.className).toContain('border-estrelinha-ink')
    expect(acompanhar.className).not.toContain('bg-estrelinha-primary')
  })

  it.each([
    ['pago', { paid_at: '2026-09-21T12:00:00Z', payment_status: 'approved' as const }],
    ['de cartão', { payment_method: 'card' }],
    ['cancelado', { status: 'cancelled' }],
  ])('%s: o botão de pagar não existe (PIX-P3-03)', (_nome, extra) => {
    mockOrder({ data: pendente(extra as Partial<OrderDetail>) })
    renderPage()

    expect(pagarComPix()).not.toBeInTheDocument()
  })

  it('sem o botão, "Acompanhar pedido" volta a ser a pílula cheia (CNF-05)', () => {
    // O par inverso. Sem ele, um "Acompanhar pedido" permanentemente em contorno passaria no caso
    // acima e a tela do pedido pago ficaria sem ação primária nenhuma.
    mockOrder({ data: order() })
    const { container } = renderPage()

    const cheias = container.querySelectorAll(
      '[class*="bg-estrelinha-primary"][class*="rounded-sm"]',
    )
    expect(cheias).toHaveLength(1)
    expect(cheias[0].textContent).toContain('Acompanhar pedido')
  })
})

// =================================================================================================
// Feature 22 — o bloco de material na confirmação (MAT-11)
// =================================================================================================

describe('OrderConfirmationPage — bloco de material', () => {
  it('pedido sem material NÃO monta o bloco — nem a consulta que ele faria', () => {
    // É o que mantém esta página montável sem `QueryClientProvider` para o pedido comum: a mutação
    // do rastreio vive no formulário, que só existe quando há material a caminho.
    useOrderMock.mockReturnValue({
      data: order({ material_status: 'nao_aplicavel' }),
      isLoading: false,
      isError: false,
    } as any)
    renderPage()

    expect(screen.queryByText('Material da sua joia')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seu material' })).not.toBeInTheDocument()
  })

  it('pedido cujo material já chegou mostra o bloco, sem pedir código de novo', () => {
    useOrderMock.mockReturnValue({
      data: order({
        material_status: 'material_recebido',
        material_tracking_code: 'AA123456789BR',
        order_items: [
          { id: 'i1', product_name: 'Árvore da Vida', product_image: null, size: null,
            finish: null, quantity: 1, unit_price: 100,
            requires_material: true, material_kinds: ['cabelo'], engraving_text: null },
        ],
      }),
      isLoading: false,
      isError: false,
    } as any)
    renderPage()

    // ⚠️ Feature 59 (`DET-09`): o bloco passou a se chamar "Seu material". A régua ficou mais
    // estreita — o título tem de ser o NOME do cabeçalho do bloco, e o antigo não pode sobrar.
    expect(screen.getByRole('heading', { level: 2, name: 'Seu material' })).toBeInTheDocument()
    expect(screen.queryByText('Material da sua joia')).not.toBeInTheDocument()
    expect(screen.getByText('Material recebido')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mecha de cabelo' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/registre o código/i)).not.toBeInTheDocument()
  })

  it('os materiais vêm do SNAPSHOT dos itens, sem repetir quando duas linhas pedem o mesmo', () => {
    useOrderMock.mockReturnValue({
      data: order({
        material_status: 'material_recebido',
        order_items: [
          { id: 'i1', product_name: 'A', product_image: null, size: null, finish: null,
            quantity: 1, unit_price: 50, requires_material: true,
            material_kinds: ['cabelo'], engraving_text: null },
          { id: 'i2', product_name: 'B', product_image: null, size: null, finish: null,
            quantity: 1, unit_price: 50, requires_material: true,
            material_kinds: ['cabelo', 'cinzas'], engraving_text: null },
        ],
      }),
      isLoading: false,
      isError: false,
    } as any)
    renderPage()

    expect(screen.getAllByRole('link', { name: 'Mecha de cabelo' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Cinzas' })).toBeInTheDocument()
  })
})

// =================================================================================================
// Feature 59 — `/pedido/:id` como o DETALHE do pedido (`DET-01..12`)
// =================================================================================================

/**
 * Com o material na vez, o topo monta o formulário do código — e ele usa `useMutation`. Os casos
 * da feature 59 que chegam a esse estado montam a página com o provedor; os antigos seguem sem ele,
 * que é o que prova que o pedido comum não depende dele.
 */
const renderDetalhe = (id = 'order-1') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/pedido/${id}`]}>
        <Routes>
          <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const normaliza = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()

/** `a` vem antes de `b` no documento. */
const antes = (a: Element, b: Element) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

const item = (extra: Record<string, unknown> = {}) => ({
  id: 'i1', product_name: 'Pingente Estrela', product_image: null, size: null, finish: null,
  quantity: 1, unit_price: 100, requires_material: false, material_kinds: [], engraving_text: null,
  ...extra,
})

describe('OrderConfirmationPage — o cabeçalho do detalhe (DET-01)', () => {
  it('com sessão, "Meus pedidos" volta para a conta, com o alvo de 44px', () => {
    mockOrder({ data: order() })
    renderPage()

    const voltar = screen.getByRole('link', { name: 'Meus pedidos' })
    expect(voltar).toHaveAttribute('href', '/conta')
    expect(voltar.className.split(/\s+/)).toContain('min-h-11')
  })

  it('sem sessão (convidada pelo token), não há "Meus pedidos" — ela não tem conta em que voltar', () => {
    authUser.current = null
    mockOrder({ data: order() })
    renderPage()

    expect(screen.queryByRole('link', { name: 'Meus pedidos' })).not.toBeInTheDocument()
    // O resto do detalhe continua de pé para ela.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('a linha "Feito em {d MMM yyyy} · {n} peças · {total}"', () => {
    mockOrder({
      data: order({
        created_at: '2026-09-14T15:00:00Z',
        total: 412.8,
        order_items: [item({ id: 'a', quantity: 1 }), item({ id: 'b', quantity: 1 })] as any,
      }),
    })
    renderPage()

    expect(
      screen.getByText('Feito em 14 set 2026 · 2 peças · R$ 412,80', { normalizer: normaliza }),
    ).toBeInTheDocument()
  })

  it('uma peça só sai no singular', () => {
    mockOrder({ data: order({ created_at: '2026-10-02T15:00:00Z', order_items: [item()] as any }) })
    renderPage()

    expect(
      screen.getByText('Feito em 2 out 2026 · 1 peça · R$ 109,90', { normalizer: normaliza }),
    ).toBeInTheDocument()
  })

  it('o selo da situação vem do dono único: pago e em `pending` é "Em produção" (Independent Test)', () => {
    mockOrder({ data: order({ status: 'pending', payment_status: 'approved' }) })
    const { container } = renderPage()

    const selo = container.querySelector('[data-situation]')
    expect(selo?.getAttribute('data-situation')).toBe('in_production')
    expect(normaliza(selo?.textContent)).toBe('Em produção')
    // Nada de "Pendente" num pedido pago — o defeito que abriu a feature.
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument()
  })
})

describe('OrderConfirmationPage — o estado do topo é o primeiro bloco (DET-02)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('PIX pendente: "Pagamento pendente" logo depois do cabeçalho, antes da linha do tempo', () => {
    mockOrder({ data: order({ paid_at: null, payment_status: 'pending' }) })
    renderPage()

    const titulo = screen.getByRole('heading', { level: 1 })
    const estado = screen.getByRole('region', { name: 'Pagamento pendente' })
    const jornada = screen.getByRole('region', { name: 'Onde seu pedido está' })
    expect(antes(titulo, estado)).toBe(true)
    expect(antes(estado, jornada)).toBe(true)
    expect(titulo.closest('header')?.nextElementSibling).toBe(estado)
  })

  it('material a enviar: "Envie o seu material" no topo, e o bloco de baixo não se repete', () => {
    mockOrder({
      data: order({
        material_status: 'aguardando_material',
        order_items: [item({ requires_material: true, material_kinds: ['cabelo'] })] as any,
      }),
    })
    const { container } = renderDetalhe()

    const titulo = screen.getByRole('heading', { level: 1 })
    const estado = screen.getByRole('region', { name: 'Envie o seu material' })
    expect(titulo.closest('header')?.nextElementSibling).toBe(estado)
    expect(screen.getByLabelText('Código de rastreio do envio')).toBeInTheDocument()
    expect(screen.queryByText('Material da sua joia')).not.toBeInTheDocument()
    // O bloco de baixo se chama "Seu material" desde o `DET-09`: com o material no topo, ele não
    // aparece de novo.
    expect(screen.queryByRole('heading', { name: 'Seu material' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('#material')).toHaveLength(1)
    // `CNF-05`: "Enviar código" é a ação da vez, e "Acompanhar pedido" desce para contorno.
    const acompanhar = screen.getByRole('link', { name: /acompanhar pedido/i })
    expect(acompanhar.className).toContain('border-estrelinha-ink')
    expect(acompanhar.className).not.toContain('bg-estrelinha-primary')
  })

  it('PIX expirado dentro dos 7 dias: "Gerar novo PIX" leva à rota do pagamento, e é a única pílula cheia', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'))
    mockOrder({
      data: order({
        paid_at: null,
        payment_status: 'expired',
        created_at: '2026-10-04T15:00:00Z',
      }),
    })
    const { container } = renderPage()

    expect(screen.getByText('O código PIX expirou')).toBeInTheDocument()
    expect(normaliza(container.textContent)).toContain('dá para fazer isso até 11 de outubro.')
    expect(screen.getByRole('link', { name: 'Gerar novo PIX' })).toHaveAttribute(
      'href',
      '/pedido/order-1/pagamento',
    )
    const cheias = container.querySelectorAll('[class*="bg-estrelinha-primary"][class*="rounded-sm"]')
    expect(cheias).toHaveLength(1)
    expect(cheias[0].textContent).toContain('Gerar novo PIX')
  })

  it('o mesmo PIX depois de 7 dias: "O pagamento não foi concluído", e nenhum botão de gerar PIX (PEN-04)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T15:01:00Z'))
    lojaSettings.whatsapp = '51998765432'
    mockOrder({
      data: order({ paid_at: null, payment_status: 'expired', created_at: '2026-10-04T15:00:00Z' }),
    })
    renderPage()

    expect(screen.getByText('O pagamento não foi concluído')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conversar no WhatsApp' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /gerar novo pix/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pagar com pix/i })).not.toBeInTheDocument()
    // Sem ação da vez, "Acompanhar pedido" volta a ser a pílula cheia.
    expect(screen.getByRole('link', { name: /acompanhar pedido/i }).className).toContain(
      'bg-estrelinha-primary',
    )
  })

  it('cancelado: "Pedido cancelado" aparece UMA vez — no topo, no lugar da linha do tempo (DET-08)', () => {
    mockOrder({
      data: order({
        status: 'cancelled',
        status_events: [{ status: 'cancelled', at: '2026-07-29T12:00:00Z' }],
      }),
    })
    const { container } = renderPage()

    expect(screen.getAllByText('Pedido cancelado')).toHaveLength(1)
    expect(screen.getByText('Cancelado em 29 jul')).toBeInTheDocument()
    // Nenhuma etapa da linha do tempo: cancelado não finge progresso.
    expect(container.querySelector('[data-step]')).toBeNull()
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(antes(titulo, screen.getByText('Pedido cancelado'))).toBe(true)
  })

  it('pago, em produção, sem material: nenhum estado do topo', () => {
    mockOrder({ data: order() })
    renderPage()

    const titulo = screen.getByRole('heading', { level: 1 })
    // O primeiro bloco depois do cabeçalho já é a linha do tempo.
    expect(titulo.closest('header')?.nextElementSibling).toBe(
      screen.getByRole('region', { name: 'Onde seu pedido está' }),
    )
  })
})

describe('OrderConfirmationPage — rastreio, peças, pagamento e ajuda (DET-03, DET-04, DET-10..12)', () => {
  it('com `tracking_code`, o cartão "Rastreio do pacote" aparece antes da linha do tempo', () => {
    mockOrder({ data: order({ status: 'shipped', tracking_code: 'AB123456789BR', shipping_carrier: 'Correios' }) })
    renderPage()

    const rastreio = screen.getByRole('region', { name: 'Rastreio do pacote' })
    expect(rastreio).toHaveTextContent('AB123456789BR')
    expect(rastreio).toHaveTextContent('Enviado por Correios')
    expect(antes(rastreio, screen.getByRole('region', { name: 'Onde seu pedido está' }))).toBe(true)
  })

  it('sem `tracking_code`, nenhum cartão de rastreio', () => {
    mockOrder({ data: order({ tracking_code: null }) })
    renderPage()

    expect(screen.queryByRole('region', { name: 'Rastreio do pacote' })).not.toBeInTheDocument()
  })

  it('a ordem dos blocos: linha do tempo · peças · pagamento e entrega · ajuda · as duas ações', () => {
    lojaSettings.whatsapp = '51998765432'
    mockOrder({
      data: order({
        order_items: [item({ product_name: 'Pingente Estrela' })] as any,
        address_street: 'Rua das Flores',
        address_number: '10',
        address_city: 'Porto Alegre',
        address_state: 'RS',
        address_zip: '90000000',
      }),
    })
    renderPage()

    const ordem = [
      screen.getByRole('region', { name: 'Onde seu pedido está' }),
      screen.getByRole('region', { name: 'Peças do pedido' }),
      screen.getByRole('region', { name: 'Pagamento e entrega' }),
      screen.getByRole('region', { name: 'Alguma dúvida sobre este pedido?' }),
      screen.getByRole('link', { name: /acompanhar pedido/i }),
    ]
    for (let i = 1; i < ordem.length; i++) expect(antes(ordem[i - 1], ordem[i])).toBe(true)
    expect(screen.getByText('Pingente Estrela')).toBeInTheDocument()
    expect(screen.getByTestId('endereco-cep')).toHaveTextContent('CEP 90000-000')
  })

  it('a ajuda abre o WhatsApp com o número do pedido; sem número da loja, o bloco some (DET-12)', () => {
    lojaSettings.whatsapp = '51998765432'
    mockOrder({ data: order({ order_number: '0231' }) })
    const { unmount } = renderPage()

    const conversar = screen.getByRole('link', { name: 'Conversar' })
    expect(new URL(conversar.getAttribute('href') as string).searchParams.get('text')).toBe(
      'Olá! Tenho uma dúvida sobre o pedido #0231.',
    )
    unmount()

    lojaSettings.whatsapp = ''
    renderPage()
    expect(screen.queryByText('Alguma dúvida sobre este pedido?')).not.toBeInTheDocument()
  })
})


// Feature 59 — `DET-01` (decisão do usuário, 2026-10-04): o subtítulo caloroso e a promessa de
// e-mail (`STO-01`) só aparecem enquanto são verdade. Um pedido entregue em agosto não abre com
// "É nosso!" nem com "já estamos preparando sua joia".
describe('OrderConfirmationPage — o subtítulo muda com a etapa (DET-01)', () => {
  it('pago e ainda no ateliê: "É nosso!" logo abaixo do título', () => {
    mockOrder({ data: order({ status: 'separating' }) })
    renderPage()

    expect(screen.getByText('É nosso!')).toBeInTheDocument()
    expect(screen.queryByText('Pedido registrado')).not.toBeInTheDocument()
  })

  it.each(['shipped', 'delivered', 'cancelled'])(
    'status %s: sem subtítulo e sem a promessa de e-mail — e o título continua sendo o número',
    (status) => {
      mockOrder({ data: order({ status }) })
      const { container } = renderPage()

      expect(screen.getByRole('heading', { level: 1, name: 'Pedido #NP-4821' })).toBeInTheDocument()
      expect(screen.queryByText('É nosso!')).not.toBeInTheDocument()
      expect(screen.queryByText('Pedido registrado')).not.toBeInTheDocument()
      expect(container.textContent).not.toMatch(/já estamos preparando sua joia/i)
    },
  )

  it.each(['expired', 'rejected'] as const)(
    'PIX %s: sem subtítulo e sem prometer a confirmação — quem fala é o estado do topo',
    (payment_status) => {
      mockOrder({ data: order({ payment_status, paid_at: null }) })
      const { container } = renderPage()

      expect(screen.queryByText('Pedido registrado')).not.toBeInTheDocument()
      expect(container.textContent).not.toMatch(/aguardando a confirmação do pagamento/i)
    },
  )

  it('reembolsado: sem subtítulo, mesmo com paid_at e status de preparo', () => {
    mockOrder({ data: order({ status: 'paid', payment_status: 'refunded' }) })
    renderPage()

    expect(screen.queryByText('É nosso!')).not.toBeInTheDocument()
    expect(screen.queryByText('Pedido registrado')).not.toBeInTheDocument()
  })
})
