import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Order, OrderItem } from '@/entities/order'
import AttentionList from '../AttentionList'

// Feature 59 — "Precisa da sua atenção" (`PEN-01..04`, `PEN-07`): os literais de cada pendência e
// o destino de cada botão. A ordem e o recorte de cada tipo estão em `attention.test.ts`.

const { settings } = vi.hoisted(() => ({ settings: { whatsapp: '51998765432' } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings,
}))

const AGORA = new Date('2026-10-04T15:00:00Z')
const DIA = 24 * 60 * 60 * 1000
const haDias = (d: number) => new Date(AGORA.getTime() - d * DIA).toISOString()
const normaliza = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()

const peca = (extra: Partial<OrderItem> = {}): OrderItem => ({
  id: 'i1', product_name: 'Pingente Estrela', product_image: null, size: null, finish: null,
  quantity: 1, unit_price: 100, requires_material: false, ...extra,
})

const pedido = (extra: Partial<Order> = {}): Order =>
  ({
    id: 'order-1', order_number: '0244', customer_name: 'Ana', customer_email: 'ana@x.com',
    status: 'pending', payment_method: 'pix', payment_status: 'approved', subtotal: 400,
    discount: 0, shipping_cost: 12.8, total: 412.8, paid_at: haDias(1),
    material_status: 'nao_aplicavel', created_at: haDias(1), order_items: [peca()], ...extra,
  }) as Order

const montar = (orders: Order[]) =>
  render(
    <MemoryRouter>
      <AttentionList orders={orders} now={AGORA} />
    </MemoryRouter>,
  )

/** O cartão (`<li>`) que tem este título. */
const cartao = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('li') as HTMLElement

beforeEach(() => {
  settings.whatsapp = '51998765432'
})

describe('AttentionList — uma pendência por tipo, com os literais da spec', () => {
  it('material (PEN-01): "Aguardamos o seu material", o pedido, a peça e os dois caminhos', () => {
    montar([
      pedido({
        id: 'mat-1',
        material_status: 'aguardando_material',
        order_items: [peca({ product_name: 'Árvore da Vida', requires_material: true })],
      }),
    ])

    const c = cartao('Aguardamos o seu material')
    expect(normaliza(c.textContent)).toContain('Pedido #0244 · Árvore da Vida')
    expect(within(c).getByRole('link', { name: 'Informar código de envio' })).toHaveAttribute(
      'href',
      '/pedido/mat-1#material',
    )
    expect(within(c).getByRole('link', { name: 'Como enviar' })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna',
    )
  })

  it('PIX pendente (PEN-02): "Pagamento pendente", o valor e "Pagar com PIX" para a rota do pagamento', () => {
    montar([pedido({ id: 'pix-1', payment_status: 'pending', paid_at: null })])

    const c = cartao('Pagamento pendente')
    expect(normaliza(c.textContent)).toContain('Pedido #0244 · R$ 412,80')
    expect(within(c).getByRole('link', { name: 'Pagar com PIX' })).toHaveAttribute(
      'href',
      '/pedido/pix-1/pagamento',
    )
  })

  it('PIX expirado dentro de 7 dias (PEN-03): "O código PIX expirou", o valor, o prazo e "Gerar novo PIX"', () => {
    montar([pedido({ id: 'exp-1', payment_status: 'expired', paid_at: null, created_at: '2026-10-01T15:00:00Z' })])

    const c = cartao('O código PIX expirou')
    expect(normaliza(c.textContent)).toContain('Pedido #0244 · R$ 412,80. Dá para gerar um código novo até 8 de outubro.')
    expect(within(c).getByRole('link', { name: 'Gerar novo PIX' })).toHaveAttribute(
      'href',
      '/pedido/exp-1/pagamento',
    )
  })

  it('PIX recusado dentro de 7 dias: "O PIX foi recusado", com o mesmo caminho', () => {
    montar([pedido({ id: 'rej-1', payment_status: 'rejected', paid_at: null, created_at: haDias(2) })])

    const c = cartao('O PIX foi recusado')
    expect(within(c).getByRole('link', { name: 'Gerar novo PIX' })).toHaveAttribute(
      'href',
      '/pedido/rej-1/pagamento',
    )
  })

  it('passados 7 dias (PEN-04): "O pagamento não foi concluído" com o WhatsApp, e nenhum botão de PIX', () => {
    montar([pedido({ id: 'lost-1', payment_status: 'expired', paid_at: null, created_at: haDias(8) })])

    const c = cartao('O pagamento não foi concluído')
    const link = within(c).getByRole('link', { name: 'Conversar no WhatsApp' })
    const url = new URL(link.getAttribute('href') as string)
    expect(url.origin + url.pathname).toBe('https://wa.me/51998765432')
    expect(url.searchParams.get('text')).toBe('Olá! Quero retomar o pedido #0244.')
    expect(screen.queryByRole('link', { name: /gerar novo pix|pagar com pix/i })).not.toBeInTheDocument()
  })

  it('pagamento perdido sem número da loja: o cartão fica, o botão do WhatsApp some', () => {
    settings.whatsapp = ''
    montar([pedido({ payment_status: 'expired', paid_at: null, created_at: haDias(8) })])

    expect(cartao('O pagamento não foi concluído')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Conversar no WhatsApp' })).not.toBeInTheDocument()
  })
})

describe('AttentionList — o bloco e os alvos', () => {
  it('o título "Precisa da sua atenção" vem com as pendências, na ordem de `accountAttention`', () => {
    montar([
      pedido({ id: 'mat', material_status: 'aguardando_material', order_items: [peca({ requires_material: true })] }),
      pedido({ id: 'pix', payment_status: 'pending', paid_at: null }),
    ])

    expect(screen.getByRole('heading', { name: 'Precisa da sua atenção' })).toBeInTheDocument()
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Pagamento pendente', 'Aguardamos o seu material'])
  })

  it('todo botão tem o alvo de 44px', () => {
    montar([
      pedido({ id: 'mat', material_status: 'aguardando_material', order_items: [peca({ requires_material: true })] }),
      pedido({ id: 'pix', payment_status: 'pending', paid_at: null }),
    ])

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    for (const link of links) expect(link.className.split(/\s+/)).toContain('min-h-11')
  })

  it('no computador os cartões ficam lado a lado; no celular, um embaixo do outro (L-029)', () => {
    montar([pedido({ payment_status: 'pending', paid_at: null })])

    const lista = screen.getByRole('list').className.split(/\s+/)
    expect(lista).toContain('grid-cols-1')
    expect(lista).toContain('lg:grid-cols-2')
  })
})

describe('AttentionList — sem pendência, nada (PEN-07)', () => {
  it('pedidos sem pendência: o bloco inteiro, título incluído, não existe', () => {
    const { container } = montar([pedido(), pedido({ id: 'x', status: 'delivered' })])

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Precisa da sua atenção')).not.toBeInTheDocument()
  })

  it('sem pedidos: nada', () => {
    const { container } = montar([])
    expect(container).toBeEmptyDOMElement()
  })
})
