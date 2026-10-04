import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Order, OrderItem } from '@/entities/order'
import OrderList from '../OrderList'

// Feature 59 — a lista da conta (`LST-02`, `LST-03`, `LST-06..08`, `LST-10`).
//
// jsdom devolve 0 para toda medida de layout: a largura de 390, o `truncate` cortando e as colunas
// do computador se provam em navegador. Aqui se prova a FORMA — as classes de cada tamanho, por
// token exato e com asserção positiva nos dois (`L-029`) — e o conteúdo de cada linha.

const normaliza = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/)

const peca = (extra: Partial<OrderItem> = {}): OrderItem => ({
  id: 'i1', product_name: 'Pingente Estrela', product_image: null, size: null, finish: null,
  quantity: 1, unit_price: 100, requires_material: false, ...extra,
})

const pedido = (extra: Partial<Order> = {}): Order =>
  ({
    id: 'order-1', order_number: '0244', customer_name: 'Ana', customer_email: 'ana@x.com',
    status: 'pending', payment_method: 'pix', payment_status: 'approved', subtotal: 400,
    discount: 0, shipping_cost: 12.8, total: 412.8, paid_at: '2026-10-02T15:10:00Z',
    material_status: 'nao_aplicavel', created_at: '2026-10-02T15:00:00Z', order_items: [peca()],
    ...extra,
  }) as Order

const montar = (props: Partial<React.ComponentProps<typeof OrderList>> = {}) =>
  render(
    <MemoryRouter>
      <OrderList orders={[pedido()]} {...props} />
    </MemoryRouter>,
  )

describe('OrderList — a linha (LST-02, LST-03)', () => {
  it('a linha INTEIRA é um link para o detalhe, com miniatura, número, data · peças, selo e total', () => {
    montar({
      orders: [pedido({ id: 'abc', order_items: [peca({ product_image: 'https://cdn/x.jpg' })] })],
    })

    const linha = screen.getByRole('link', { name: /Pedido #0244/ })
    expect(linha).toHaveAttribute('href', '/pedido/abc')
    expect(within(linha).getByText('Pedido #0244')).toBeInTheDocument()
    expect(normaliza(linha.textContent)).toContain('2 out 2026 · 1 peça')
    expect(within(linha).getByText('R$ 412,80', { normalizer: normaliza })).toBeInTheDocument()
    expect(linha.querySelector('[data-situation]')?.getAttribute('data-situation')).toBe('in_production')
    const foto = linha.querySelector('img')
    expect(foto?.getAttribute('src')).toBe('https://cdn/x.jpg')
    expect(foto?.className.split(/\s+/)).toEqual(expect.arrayContaining(['h-14', 'w-14']))
  })

  it('a linha tem altura de toque (≥ 44px): `min-h-[88px]` no celular e `lg:min-h-[72px]` no computador', () => {
    montar()
    expect(tokens(screen.getByRole('link', { name: /Pedido/ }))).toEqual(
      expect.arrayContaining(['min-h-[88px]', 'lg:min-h-[72px]']),
    )
  })

  it('o número sai pelo formatador, em Outfit 600 16px, numa linha só cortando com reticências', () => {
    montar({ orders: [pedido({ order_number: 'NS-123456789012' })] })

    const numero = screen.getByText('Pedido #NS-123456789012')
    expect(tokens(numero)).toEqual(
      expect.arrayContaining(['truncate', 'font-body', 'text-base', 'font-semibold']),
    )
    // A trilha do número precisa poder encolher, senão o `truncate` não corta (`minmax(0, …)`).
    expect(tokens(screen.getByRole('link', { name: /Pedido/ }))).toContain(
      'grid-cols-[56px_minmax(0,1fr)_auto_20px]',
    )
    // O total não quebra no meio.
    expect(tokens(screen.getByText('R$ 412,80', { normalizer: normaliza }))).toContain('whitespace-nowrap')
  })

  it('peças é a soma das quantidades, no plural', () => {
    montar({ orders: [pedido({ order_items: [peca({ id: 'a', quantity: 2 }), peca({ id: 'b' })] })] })
    expect(normaliza(screen.getByRole('link', { name: /Pedido/ }).textContent)).toContain('3 peças')
  })

  it('sem foto na primeira peça: o quadrado neutro, nenhuma `<img>` quebrada', () => {
    montar({ orders: [pedido({ order_items: [peca({ product_image: null })] })] })

    const linha = screen.getByRole('link', { name: /Pedido/ })
    expect(linha.querySelector('img')).toBeNull()
    expect(within(linha).getByTestId('order-row-sem-foto')).toBeInTheDocument()
  })

  it('um link por pedido, na ordem recebida', () => {
    montar({ orders: [pedido({ id: 'b', order_number: '0245' }), pedido({ id: 'a', order_number: '0244' })] })

    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/pedido/b', '/pedido/a'])
  })
})

describe('OrderList — celular e computador na mesma árvore (LST-10, L-029)', () => {
  it('celular: grade de miniatura · conteúdo · seta, com o total na linha do número', () => {
    montar()
    const classe = screen.getByRole('link', { name: /Pedido/ }).getAttribute('class') ?? ''

    expect(classe.split(/\s+/)).toContain('grid')
    expect(classe).toContain("[grid-template-areas:'thumb_num_price_chev'_'thumb_date_date_chev'_'thumb_badge_badge_chev']")
  })

  it('computador: Pedido (com a data) · Situação · Total, em larguras fixas compartilhadas com o cabeçalho', () => {
    montar()
    const link = screen.getByRole('link', { name: /Pedido/ })
    const classe = link.getAttribute('class') ?? ''
    const t = classe.split(/\s+/)

    // Prova em navegador da `59`: as larguras do Paper deixavam o título com 38px ("Pe…"), colunas
    // `auto` desalinhavam as linhas do cabeçalho, e uma coluna Data própria derrubava o título para
    // 102px (o cartão não cresce depois de 1024). A régua prende a trilha e as áreas (`L-029`).
    expect(t).toContain('lg:grid-cols-[56px_minmax(0,1fr)_196px_104px_20px]')
    expect(classe).toContain("lg:[grid-template-areas:'thumb_num_badge_price_chev'_'thumb_date_badge_price_chev']")
    expect(t.some((x) => /auto/.test(x) && /^lg:grid-cols/.test(x))).toBe(false)
    expect(t.some((x) => x.startsWith('xl:grid-cols'))).toBe(false)

    const cabecalho = screen.getByTestId('order-list-header')
    const tc = tokens(cabecalho)
    expect(tc).toEqual(expect.arrayContaining(['hidden', 'lg:grid']))
    expect(tc).toContain('lg:grid-cols-[56px_minmax(0,1fr)_196px_104px_20px]')
    expect(Array.from(cabecalho.children).map((c) => c.textContent)).toEqual([
      'Pedido',
      'Situação',
      'Total',
      '',
    ])
    // A data continua em toda linha — na coluna Pedido, embaixo do número.
    expect(screen.getAllByText(/\d{1,2} [a-z]{3} \d{4} · \d+ peças?/).length).toBeGreaterThan(0)
  })

})

describe('OrderList — vazio, carregando e erro (LST-06..08)', () => {
  it('sem pedidos: "Você ainda não fez nenhum pedido." e um link para a Home', () => {
    montar({ orders: [] })

    expect(screen.getByText('Você ainda não fez nenhum pedido.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conhecer as joias' })).toHaveAttribute('href', '/')
  })

  it('carregando: esqueleto de 3 linhas, sem texto "Carregando"', () => {
    const { container } = montar({ orders: undefined, isLoading: true })

    expect(screen.getByTestId('order-list-skeleton').querySelectorAll('li')).toHaveLength(3)
    expect(container.textContent).not.toMatch(/carregando/i)
    expect(screen.queryByText('Você ainda não fez nenhum pedido.')).not.toBeInTheDocument()
  })

  it('erro: a mensagem e "Tentar de novo" — nunca a lista vazia', () => {
    const onRetry = vi.fn()
    montar({ orders: undefined, isError: true, onRetry })

    expect(screen.getByText('Não conseguimos carregar seus pedidos.')).toBeInTheDocument()
    expect(screen.queryByText('Você ainda não fez nenhum pedido.')).not.toBeInTheDocument()
    const botao = screen.getByRole('button', { name: 'Tentar de novo' })
    expect(botao.className.split(/\s+/)).toContain('min-h-11')
    fireEvent.click(botao)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
