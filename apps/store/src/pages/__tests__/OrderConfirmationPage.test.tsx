import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useOrder } from '@/entities/order/api/useOrder'
import type { OrderDetail } from '@/entities/order/api/useOrder'
import OrderConfirmationPage from '../OrderConfirmationPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

// CNF-03: a confirmação é rota (`/pedido/:id`) — recompõe do banco, sobrevive ao reload e não
//         depende de nenhum estado do checkout.
// CNF-04: mascote `wink`, número do pedido, valor pago, e-mail da cliente e a timeline de 4
//         estágios com a janela de entrega lida das colunas de estimativa (SHP-08).
// CNF-05: **uma** ação primária ("Acompanhar pedido" → /conta, pílula geleia) e uma secundária
//         ("Ver mais pins" → /, contorno tinta); carrinho e cupom limpos só na aprovação.

vi.mock('@/entities/order/api/useOrder', async () => {
  const actual = await vi.importActual<typeof import('@/entities/order/api/useOrder')>(
    '@/entities/order/api/useOrder',
  )
  return { ...actual, useOrder: vi.fn() }
})

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
const mascotRects = () =>
  screen.getByRole('img', { name: /Nana/i }).querySelectorAll('rect').length

beforeEach(() => {
  useOrderMock.mockReset()
  useCartStore.setState({ items: [] })
  useCouponStore.getState().clearCoupon()
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

describe('OrderConfirmationPage — conteúdo da confirmação (CNF-04)', () => {
  it('exibe a mascote Nana com a expressão wink', () => {
    mockOrder({ data: order() })
    renderPage()

    expect(mascotRects()).toBe(1)
  })

  it('exibe o número do pedido', () => {
    mockOrder({ data: order({ order_number: 'NP-9001' }) })
    renderPage()

    expect(screen.getByText(/PEDIDO NP-9001/)).toBeInTheDocument()
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

    expect(screen.getByText(/PAGO EM 27 DE JULHO/)).toBeInTheDocument()
  })

  it('monta a timeline de 4 estágios com a janela de entrega do pedido', () => {
    mockOrder({
      data: order({ delivery_estimate_min: '2026-08-04', delivery_estimate_max: '2026-08-06' }),
    })
    renderPage()

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Chega entre 4 e 6 de agosto')).toBeInTheDocument()
  })

  it('pedido sem janela de estimativa mantém a timeline sem inventar data', () => {
    mockOrder({ data: order({ delivery_estimate_min: null, delivery_estimate_max: null }) })
    renderPage()

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByText(/^Chega/)).not.toBeInTheDocument()
  })

  it('pedido ainda não pago não afirma pagamento confirmado', () => {
    mockOrder({ data: order({ paid_at: null }) })
    renderPage()

    expect(screen.getByText(/AGUARDANDO PAGAMENTO/)).toBeInTheDocument()
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
    expect(primary.className).toContain('bg-nanita-jam')
    // Forma de ação é 14px (`rounded-sm`), não pílula — a pílula virou
    // rótulo na identidade papelaria (feature 19, PAP-04).
    expect(primary.className).toContain('rounded-sm')
    expect(primary.className).not.toContain('rounded-pill')
  })

  it('"Ver mais pins" é secundária em contorno tinta e aponta para a home', () => {
    mockOrder({ data: order() })
    renderPage()

    const secondary = screen.getByRole('link', { name: /ver mais pins/i })
    expect(secondary).toHaveAttribute('href', '/')
    expect(secondary.className).toContain('border-nanita-ink')
    expect(secondary.className).not.toContain('bg-nanita-jam')
  })

  it('existe uma única ação em Carmim na tela', () => {
    mockOrder({ data: order() })
    const { container } = renderPage()

    const primaryActions = container.querySelectorAll(
      '[class*="bg-nanita-jam"][class*="rounded-sm"]',
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
    useCouponStore.setState({ applied: { id: 'cp1', code: 'NANA10' } as any })
    mockOrder({ data: order() })
    renderPage()

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCouponStore.getState().applied).not.toBeNull()
  })

  it('nenhuma classe de cor fora da paleta Nanita', () => {
    mockOrder({ data: order() })
    const { container } = renderPage()

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})
