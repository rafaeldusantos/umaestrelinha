import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { formatPrice } from '@estrelinha/core/formatters'
import OrderItemsSummary, { type OrderItemsSummaryProps } from '../OrderItemsSummary'
import { itemDetailLine, type OrderSummaryItem } from '../../lib/itemDetailLine'

// Feature 59 — as peças e o resumo do detalhe.
//
// DET-10: miniatura, nome (até 2 linhas), opções unidas por " · " sem separador solto, quantidade,
//         gravação ("Gravação: “{texto}”") e valor; o resumo SOMA: subtotal + frete − descontos =
//         total, com o rótulo do cupom quando `coupon_code` existe.
// ACB-01: item sem tamanho nem acabamento mostra só a quantidade, sem ponto solto.
// Edge case: item sem foto mostra o quadrado neutro, sem ícone quebrado.

const item = (o: Partial<OrderSummaryItem> = {}): OrderSummaryItem => ({
  id: 'i-1',
  product_name: 'Pingente gota com leite materno',
  product_image: 'https://exemplo.invalid/gota.jpg',
  size: null,
  finish: null,
  variant_label: null,
  quantity: 1,
  unit_price: 189.9,
  engraving_text: null,
  ...o,
})

const pedido = (o: Partial<OrderItemsSummaryProps['order']> = {}): OrderItemsSummaryProps['order'] => ({
  order_items: [item()],
  subtotal: 189.9,
  shipping_cost: 21.5,
  discount: 0,
  pix_discount: 0,
  coupon_code: null,
  total: 211.4,
  ...o,
})

/** O valor da linha do resumo cujo rótulo é `rotulo`. */
const valorDa = (rotulo: string) => {
  const dt = screen.getByText(rotulo, { selector: 'dt' })
  return dt.parentElement?.querySelector('dd')?.textContent
}

/** "R$ 1.234,56" / "−R$ 10,00" → número. */
const emReais = (texto: string | null | undefined): number => {
  const negativo = (texto ?? '').includes('−')
  const n = Number((texto ?? '').replace(/[^\d,]/g, '').replace(',', '.'))
  return negativo ? -n : n
}

describe('itemDetailLine — sem separador solto (ACB-01)', () => {
  it('sem tamanho nem acabamento: só a quantidade', () => {
    expect(itemDetailLine(item({ quantity: 1 }))).toBe('Qtd: 1')
  })

  it('com as duas opções do modelo antigo: as duas, e a quantidade, por " · "', () => {
    expect(itemDetailLine(item({ size: '4,5 cm', finish: 'Fosco', quantity: 2 }))).toBe(
      '4,5 cm · Fosco · Qtd: 2',
    )
  })

  it('com só uma das opções: ela e a quantidade, sem ponto duplo', () => {
    expect(itemDetailLine(item({ size: null, finish: 'Dourado' }))).toBe('Dourado · Qtd: 1')
    expect(itemDetailLine(item({ size: '  ', finish: 'Dourado' }))).toBe('Dourado · Qtd: 1')
  })

  it('o rótulo da variação (pedido novo) vence os eixos antigos', () => {
    expect(
      itemDetailLine(item({ variant_label: '4,5 cm · Fosco', size: 'X', finish: 'Y', quantity: 3 })),
    ).toBe('4,5 cm · Fosco · Qtd: 3')
  })
})

describe('OrderItemsSummary — as peças (DET-10)', () => {
  it('cada peça mostra miniatura, nome, linha de detalhe e o valor da linha', () => {
    render(
      <OrderItemsSummary
        order={pedido({ order_items: [item({ quantity: 2, unit_price: 100, size: '4,5 cm' })] })}
      />,
    )

    const peca = screen.getByRole('listitem')
    expect(within(peca).getByRole('presentation').getAttribute('src')).toBe(
      'https://exemplo.invalid/gota.jpg',
    )
    expect(within(peca).getByText('Pingente gota com leite materno')).toHaveClass('line-clamp-2')
    expect(within(peca).getByText('4,5 cm · Qtd: 2')).toBeInTheDocument()
    // `formatPrice` separa o símbolo com espaço inseparável, e o matcher do RTL normaliza o do DOM.
    expect(within(peca).getByText(formatPrice(200).replace(/\s/g, ' '))).toBeInTheDocument()
  })

  it('a miniatura tem 56px (h-14 w-14)', () => {
    render(<OrderItemsSummary order={pedido()} />)

    const foto = screen.getByRole('presentation')
    expect(foto.className.split(/\s+/)).toEqual(expect.arrayContaining(['h-14', 'w-14']))
  })

  it('item SEM foto mostra o quadrado neutro, e nenhuma <img> quebrada', () => {
    render(<OrderItemsSummary order={pedido({ order_items: [item({ product_image: null })] })} />)

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByTestId('item-sem-foto').className.split(/\s+/)).toEqual(
      expect.arrayContaining(['h-14', 'w-14', 'bg-estrelinha-ground-deep']),
    )
  })

  it('gravação aparece entre aspas tipográficas; sem gravação, nenhuma linha', () => {
    const { unmount } = render(
      <OrderItemsSummary order={pedido({ order_items: [item({ engraving_text: '  Helena  ' })] })} />,
    )
    expect(screen.getByText('Gravação: “Helena”')).toBeInTheDocument()
    unmount()

    render(<OrderItemsSummary order={pedido()} />)
    expect(screen.queryByText(/Gravação/)).not.toBeInTheDocument()
  })

  it('item sem opção nenhuma não deixa ponto solto na tela (ACB-01)', () => {
    render(<OrderItemsSummary order={pedido()} />)

    expect(screen.getByText('Qtd: 1')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/·\s*Qtd/)
  })
})

describe('OrderItemsSummary — o resumo SOMA (DET-10, L-014)', () => {
  it('subtotal + frete − cupom − desconto PIX = total, com o rótulo do cupom', () => {
    // 200 + 21,50 − 20 (cupom) − 9 (5% PIX sobre 180) = 192,50
    render(
      <OrderItemsSummary
        order={pedido({
          order_items: [item({ quantity: 2, unit_price: 100 })],
          subtotal: 200,
          shipping_cost: 21.5,
          discount: 20,
          coupon_code: 'SAUDADE10',
          pix_discount: 9,
          total: 192.5,
        })}
      />,
    )

    expect(valorDa('Subtotal')).toBe(formatPrice(200))
    expect(valorDa('Frete')).toBe(formatPrice(21.5))
    expect(valorDa('Cupom SAUDADE10')).toBe(`−${formatPrice(20)}`)
    expect(valorDa('Desconto PIX')).toBe(`−${formatPrice(9)}`)
    expect(valorDa('Total')).toBe(formatPrice(192.5))

    // A soma das linhas acima do total É o total — a propriedade, não só os números.
    const linhas = ['Subtotal', 'Frete', 'Cupom SAUDADE10', 'Desconto PIX'].map((r) => emReais(valorDa(r)))
    expect(Math.round(linhas.reduce((a, b) => a + b, 0) * 100) / 100).toBe(emReais(valorDa('Total')))
  })

  it('desconto sem código de cupom (pedido importado) sai como "Desconto"', () => {
    render(<OrderItemsSummary order={pedido({ discount: 10, coupon_code: null, total: 201.4 })} />)

    expect(valorDa('Desconto')).toBe(`−${formatPrice(10)}`)
    expect(screen.queryByText(/^Cupom/)).not.toBeInTheDocument()
  })

  it('sem desconto, nenhuma linha de desconto — e o resumo continua somando', () => {
    render(<OrderItemsSummary order={pedido()} />)

    expect(screen.queryByText('Desconto')).not.toBeInTheDocument()
    expect(screen.queryByText('Desconto PIX')).not.toBeInTheDocument()
    const soma = Math.round((emReais(valorDa('Subtotal')) + emReais(valorDa('Frete'))) * 100) / 100
    expect(soma).toBe(emReais(valorDa('Total')))
  })

  it('frete zero aparece como "Grátis", nunca R$ 0,00', () => {
    render(<OrderItemsSummary order={pedido({ shipping_cost: 0, total: 189.9 })} />)

    expect(valorDa('Frete')).toBe('Grátis')
  })

  it('nenhuma cor padrão do Tailwind no bloco', () => {
    const { container } = render(
      <OrderItemsSummary order={pedido({ discount: 10, coupon_code: 'X', pix_discount: 5, total: 196.4 })} />,
    )

    expect(container.innerHTML).not.toMatch(/\b(bg|text|border)-(yellow|blue|purple|green|red)-\d/)
  })
})
