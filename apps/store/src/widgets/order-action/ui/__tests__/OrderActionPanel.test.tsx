import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { OrderDetail } from '@/entities/order'
import OrderActionPanel from '../OrderActionPanel'
import type { OrderActionState } from '../../lib/orderActionState'

// Feature 59 — `DET-02`: o estado do topo do detalhe, conforme o quadro "Estados do topo" do Paper.
// Um caso por estado, e a prova de que só o do estado pedido aparece.

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }))

const { sessao, settings } = vi.hoisted(() => ({
  sessao: { user: { id: 'usr-1' } as { id: string } | null },
  settings: { whatsapp: '51998765432' },
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: sessao.user }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings,
}))

const normaliza = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()

const pedido = (extra: Partial<OrderDetail> = {}): OrderDetail =>
  ({
    id: 'order-1',
    order_number: '0231',
    customer_name: 'Marina',
    customer_email: 'marina@email.com',
    status: 'pending',
    payment_method: 'pix',
    payment_status: 'pending',
    subtotal: 400,
    discount: 0,
    shipping_cost: 12.8,
    total: 412.8,
    paid_at: null,
    created_at: '2026-10-04T15:00:00Z',
    material_status: 'nao_aplicavel',
    material_tracking_code: null,
    status_events: [],
    order_items: [],
    ...extra,
  }) as OrderDetail

const montar = (state: OrderActionState | null, extra: Partial<OrderDetail> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderActionPanel
          order={pedido(extra)}
          state={state}
          paymentHref="/pedido/order-1/pagamento"
          materialKinds={['cabelo']}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

/** Os títulos de todos os estados — só UM pode estar na tela por vez. */
const TITULOS = [
  'Envie o seu material',
  'Pagamento pendente',
  'O código PIX expirou',
  'O PIX foi recusado',
  'O pagamento não foi concluído',
  'Pedido cancelado',
]

const titulosNaTela = () => TITULOS.filter((t) => screen.queryByText(t) !== null)

beforeEach(() => {
  sessao.user = { id: 'usr-1' }
  settings.whatsapp = '51998765432'
})

describe('OrderActionPanel — material a enviar', () => {
  it('monta "Envie o seu material" com o campo do código, e só ele', () => {
    const { container } = montar('material', {
      payment_status: 'approved',
      paid_at: '2026-10-04T15:10:00Z',
      material_status: 'aguardando_material',
    })

    expect(titulosNaTela()).toEqual(['Envie o seu material'])
    expect(screen.getByLabelText('Código de rastreio do envio')).toBeInTheDocument()
    expect(container.querySelector('#material')).not.toBeNull()
  })
})

describe('OrderActionPanel — PIX pendente', () => {
  it('"Pagamento pendente", o valor e "Pagar com PIX" para a rota do pagamento', () => {
    montar('pix_pending')

    expect(titulosNaTela()).toEqual(['Pagamento pendente'])
    expect(screen.getByText('R$ 412,80', { normalizer: normaliza })).toBeInTheDocument()
    const botao = screen.getByRole('link', { name: 'Pagar com PIX' })
    expect(botao).toHaveAttribute('href', '/pedido/order-1/pagamento')
    // A pílula cheia, na forma de ação (`CNF-05`).
    expect(botao.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['bg-estrelinha-primary', 'rounded-sm', 'min-h-12']),
    )
  })
})

describe('OrderActionPanel — PIX novo (dentro dos 7 dias)', () => {
  it('expirado: "O código PIX expirou", o prazo por extenso, o valor e "Gerar novo PIX"', () => {
    const { container } = montar('repix', { payment_status: 'expired' })

    expect(titulosNaTela()).toEqual(['O código PIX expirou'])
    expect(normaliza(container.textContent)).toContain(
      'O seu pedido continua guardado. Gere um código novo para concluir — dá para fazer isso até 11 de outubro.',
    )
    expect(screen.getByText('R$ 412,80', { normalizer: normaliza })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gerar novo PIX' })).toHaveAttribute(
      'href',
      '/pedido/order-1/pagamento',
    )
  })

  it('recusado: "O PIX foi recusado", com o mesmo caminho', () => {
    montar('repix', { payment_status: 'rejected' })

    expect(titulosNaTela()).toEqual(['O PIX foi recusado'])
    expect(screen.getByRole('link', { name: 'Gerar novo PIX' })).toHaveAttribute(
      'href',
      '/pedido/order-1/pagamento',
    )
  })
})

describe('OrderActionPanel — pagamento perdido', () => {
  it('"O pagamento não foi concluído", o texto literal e o WhatsApp com o pedido', () => {
    const { container } = montar('payment_lost', { payment_status: 'expired' })

    expect(titulosNaTela()).toEqual(['O pagamento não foi concluído'])
    expect(normaliza(container.textContent)).toContain(
      'Fale com a Adri para retomar este pedido. Ela confere o valor e o prazo com você.',
    )
    const link = screen.getByRole('link', { name: 'Conversar no WhatsApp' })
    const url = new URL(link.getAttribute('href') as string)
    expect(url.origin + url.pathname).toBe('https://wa.me/51998765432')
    expect(url.searchParams.get('text')).toBe('Olá! Quero retomar o pedido #0231.')
    expect(link.className.split(/\s+/)).toContain('min-h-11')
    // `PEN-04`: passada a janela, nenhum botão de gerar PIX em tela nenhuma.
    expect(screen.queryByRole('link', { name: /gerar novo pix/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pagar com pix/i })).not.toBeInTheDocument()
  })

  it('sem número da loja configurado, o botão some e o texto fica', () => {
    settings.whatsapp = ''
    montar('payment_lost', { payment_status: 'expired' })

    expect(screen.getByText('O pagamento não foi concluído')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Conversar no WhatsApp' })).not.toBeInTheDocument()
  })
})

describe('OrderActionPanel — cancelado', () => {
  it('"Pedido cancelado", com a data do registro `cancelled` do histórico', () => {
    montar('cancelled', {
      status: 'cancelled',
      status_events: [
        { status: 'pending', at: '2026-10-04T15:00:00Z' },
        { status: 'cancelled', at: '2026-10-06T12:00:00Z' },
      ],
    })

    expect(titulosNaTela()).toEqual(['Pedido cancelado'])
    expect(screen.getByText('Cancelado em 6 out')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('sem o registro no histórico, nenhuma data inventada', () => {
    montar('cancelled', { status: 'cancelled' })

    expect(screen.getByText('Pedido cancelado')).toBeInTheDocument()
    expect(screen.queryByText(/^Cancelado em/)).not.toBeInTheDocument()
  })
})

describe('OrderActionPanel — nenhum estado', () => {
  it('`null`: o painel não existe', () => {
    const { container } = montar(null)
    expect(container).toBeEmptyDOMElement()
  })
})
