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

describe('OrderItemsSummary — a peça que acompanha (Compre Junto)', () => {
  const principal = item({ id: 'i-p', product_id: 'joia', product_name: 'Pingente Estrela' })
  const corrente = item({
    id: 'i-c',
    product_id: 'corrente',
    product_name: 'Corrente Veneziana',
    accompanies_product_ids: ['joia'],
  })

  it('a linha adicional diz "Acompanha o <principal>", com o nome do principal tirado do próprio pedido', () => {
    render(<OrderItemsSummary order={pedido({ order_items: [principal, corrente] })} />)
    const linha = screen.getByText('Corrente Veneziana').closest('li') as HTMLElement

    expect(within(linha).getByText('Acompanha o Pingente Estrela', { normalizer: (t) => t })).toBeInTheDocument()
  })

  it('o principal não ganha frase', () => {
    render(<OrderItemsSummary order={pedido({ order_items: [principal, corrente] })} />)
    const linha = screen.getByText('Pingente Estrela').closest('li') as HTMLElement

    expect(within(linha).queryByText(/Acompanha/)).not.toBeInTheDocument()
  })

  it('cada adicional nomeia o próprio principal — "o X" numa linha e "o Y" na outra', () => {
    const anel = item({ id: 'i-a', product_id: 'anel', product_name: 'Anel Lua' })
    const brinco = item({ id: 'i-b', product_id: 'brinco', product_name: 'Brinco', accompanies_product_ids: ['anel'] })
    render(<OrderItemsSummary order={pedido({ order_items: [principal, anel, corrente, brinco] })} />)

    expect(within(screen.getByText('Corrente Veneziana').closest('li') as HTMLElement).getByText('Acompanha o Pingente Estrela')).toBeInTheDocument()
    expect(within(screen.getByText('Brinco').closest('li') as HTMLElement).getByText('Acompanha o Anel Lua')).toBeInTheDocument()
  })

  it('a MESMA linha que acompanha dois principais diz "Acompanha o X e o Y"', () => {
    const anel = item({ id: 'i-a', product_id: 'anel', product_name: 'Anel Lua' })
    const dupla = item({ id: 'i-d', product_id: 'corrente', product_name: 'Corrente Veneziana', accompanies_product_ids: ['joia', 'anel'] })
    render(<OrderItemsSummary order={pedido({ order_items: [principal, anel, dupla] })} />)
    const linha = screen.getByText('Corrente Veneziana').closest('li') as HTMLElement

    expect(
      within(linha).getByText('Acompanha o Pingente Estrela e o Anel Lua', { normalizer: (t) => t }),
    ).toBeInTheDocument()
  })

  it('o pedido de quem não usou o Compre Junto fica igual: nenhuma frase, mesmo texto em cada linha', () => {
    render(<OrderItemsSummary order={pedido({ order_items: [item({ id: 'a' }), item({ id: 'b', product_name: 'Anel' })] })} />)

    expect(screen.queryByText(/Acompanha/)).not.toBeInTheDocument()
    const linhas = screen.getAllByRole('listitem')
    expect(linhas.map((l) => l.textContent)).toEqual([
      `Pingente gota com leite maternoQtd: 1${formatPrice(189.9)}`,
      `AnelQtd: 1${formatPrice(189.9)}`,
    ])
  })
})

describe('OrderItemsSummary — o desconto da compra casada no pedido', () => {
  // O pedido como o `create-payment` o grava: a joia (300), a corrente partida em duas (uma com o
  // casado de 10%, 71,10; outra a preço cheio, 79), e o bump (40 → 20). PIX 5% sobre 470,10; frete 20.
  // Preço cheio e cobrado divergem em toda linha com desconto.
  const novo = (o: Partial<OrderItemsSummaryProps['order']> = {}) =>
    pedido({
      order_items: [
        item({ id: 'p', product_id: 'joia', product_name: 'Pingente Estrela', unit_price: 300, full_unit_price: 300 }),
        item({
          id: 'c1',
          product_id: 'corrente',
          product_name: 'Corrente Veneziana',
          unit_price: 71.1,
          full_unit_price: 79,
          accompanies_product_ids: ['joia'],
        }),
        item({
          id: 'c2',
          product_id: 'corrente',
          product_name: 'Corrente Veneziana',
          unit_price: 79,
          full_unit_price: 79,
          accompanies_product_ids: ['joia'],
        }),
        item({ id: 'b', product_id: 'bump', product_name: 'Cartão de lembrança', unit_price: 20, full_unit_price: 40 }),
      ],
      subtotal: 470.1,
      shipping_cost: 20,
      discount: 0,
      coupon_code: null,
      pix_discount: 23.51,
      total: 466.59,
      buy_together_discount: 7.9,
      promotion_discount: 0,
      order_bump_discount: 20,
      ...o,
    })

  const linhas = () => screen.getAllByRole('listitem')

  it('a peça com desconto mostra "de/por": o cheio riscado e o cobrado', () => {
    render(<OrderItemsSummary order={novo()} />)
    const [, casada, , bump] = linhas()

    const dePor = within(casada).getByTestId('item-de-por')
    expect(dePor.querySelector('s')?.textContent).toBe(formatPrice(79))
    expect(dePor.textContent).toBe(`${formatPrice(79)}${formatPrice(71.1)}`)
    expect(within(bump).getByTestId('item-de-por').querySelector('s')?.textContent).toBe(formatPrice(40))
  })

  it('a linha mista partida em duas: uma "Acompanha o X · 10% a menos" com "de/por", outra a preço cheio', () => {
    render(<OrderItemsSummary order={novo()} />)
    const [principal, casada, avulsa] = linhas()

    expect(
      within(casada).getByText('Acompanha o Pingente Estrela · 10% a menos', { normalizer: (t) => t }),
    ).toBeInTheDocument()
    expect(within(avulsa).queryByText(/Acompanha/)).not.toBeInTheDocument()
    expect(within(avulsa).queryByTestId('item-de-por')).not.toBeInTheDocument()
    expect(within(avulsa).getByText(formatPrice(79).replace(/\s/g, ' '))).toBeInTheDocument()
    // Cada uma com a sua linha de detalhe: "{variação} · N unidade(s)".
    expect(within(casada).getByText('1 unidade')).toBeInTheDocument()
    expect(within(avulsa).getByText('1 unidade')).toBeInTheDocument()
    expect(within(avulsa).queryByText(/Qtd/)).not.toBeInTheDocument()
    expect(within(principal).queryByTestId('item-de-por')).not.toBeInTheDocument()
  })

  it('o resumo: Subtotal cheio, uma linha por desconto, e a conta fecha', () => {
    render(
      <OrderItemsSummary
        order={novo({
          discount: 10,
          coupon_code: 'FLOR',
          promotion_discount: 3.95,
          // Os números mudam junto, para a conta seguir fechando com os cinco descontos.
          order_items: [
            item({ id: 'p', product_id: 'joia', unit_price: 300, full_unit_price: 300 }),
            item({ id: 'c1', product_id: 'corrente', unit_price: 71.1, full_unit_price: 79, accompanies_product_ids: ['joia'] }),
            item({ id: 'c2', product_id: 'corrente', unit_price: 75.05, full_unit_price: 79, accompanies_product_ids: ['joia'] }),
            item({ id: 'b', product_id: 'bump', unit_price: 20, full_unit_price: 40 }),
          ],
          subtotal: 466.15,
          pix_discount: 22.81,
          total: 453.34,
        })}
      />,
    )

    const rotulos = Array.from(document.querySelectorAll('dt')).map((dt) => dt.textContent)
    expect(rotulos).toEqual([
      'Subtotal',
      'Frete',
      'Desconto do Compre Junto',
      'Desconto progressivo',
      'Desconto da oferta',
      'Cupom FLOR',
      'Desconto PIX',
      'Total',
    ])
    expect(valorDa('Subtotal')).toBe(formatPrice(498))
    expect(valorDa('Desconto do Compre Junto')).toBe(`−${formatPrice(7.9)}`)
    expect(valorDa('Desconto da oferta')).toBe(`−${formatPrice(20)}`)
    expect(valorDa('Total')).toBe(formatPrice(453.34))

    const acima = rotulos.slice(0, -1).map((r) => emReais(valorDa(r as string)))
    expect(Math.round(acima.reduce((a, b) => a + b, 0) * 100) / 100).toBe(emReais(valorDa('Total')))
  })

  it('pedido de antes (sem preço cheio) continua igual: subtotal gravado, sem "de/por" nem linhas novas', () => {
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
          // Mesmo com a coluna da promoção preenchida, o pedido de antes não ganha a linha.
          promotion_discount: 5,
        })}
      />,
    )

    expect(Array.from(document.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([
      'Subtotal',
      'Frete',
      'Cupom SAUDADE10',
      'Desconto PIX',
      'Total',
    ])
    expect(valorDa('Subtotal')).toBe(formatPrice(200))
    expect(screen.queryByTestId('item-de-por')).not.toBeInTheDocument()
    expect(screen.getByText('Qtd: 2')).toBeInTheDocument()
    expect(screen.queryByText(/unidade/)).not.toBeInTheDocument()
  })

  it('no pedido novo, a variação e "N unidade(s)", no plural quando passa de uma', () => {
    render(
      <OrderItemsSummary
        order={pedido({
          order_items: [item({ quantity: 2, unit_price: 100, full_unit_price: 100, variant_label: '4,5 cm · Fosco' })],
          subtotal: 200,
          shipping_cost: 0,
          total: 200,
        })}
      />,
    )
    expect(screen.getByText('4,5 cm · Fosco · 2 unidades', { normalizer: (t) => t })).toBeInTheDocument()
  })

  it('tom memorial: nenhuma exclamação nem "economize" no bloco', () => {
    const { container } = render(<OrderItemsSummary order={novo()} />)
    expect(container.textContent).not.toMatch(/!|economi/i)
  })
})
