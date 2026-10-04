import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderPaymentDelivery, { type OrderPaymentDeliveryProps } from '../OrderPaymentDelivery'
import { addressLines, paymentMethodLabel } from '../../lib/paymentDelivery'

// Feature 59 — pagamento e entrega do detalhe.
//
// DET-11: a forma de pagamento (PIX · Cartão) com a data de aprovação quando houver, e o endereço
//         do SNAPSHOT do pedido em linhas (nome · rua, número, complemento · bairro · cidade/UF ·
//         CEP), com o CEP sem quebrar no hífen.
// Edge case: pedido da Nuvemshop (`credit_card`/`boleto`/`manual`) tem rótulo legível.

const pedido = (
  o: Partial<OrderPaymentDeliveryProps['order']> = {},
): OrderPaymentDeliveryProps['order'] => ({
  payment_method: 'pix',
  paid_at: '2026-10-02T15:00:00Z',
  customer_name: 'Marina Yamashita',
  address_street: 'Rua Padre Chagas',
  address_number: '185',
  address_complement: 'Apto 302',
  address_neighborhood: 'Moinhos de Vento',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90570080',
  ...o,
})

describe('paymentMethodLabel — um rótulo legível para cada forma', () => {
  it.each([
    ['pix', 'PIX'],
    ['card', 'Cartão de crédito'],
    ['credit_card', 'Cartão de crédito'],
    ['boleto', 'Boleto'],
    ['manual', 'Combinado com a loja'],
  ])('%s → %s', (metodo, rotulo) => {
    expect(paymentMethodLabel(metodo)).toBe(rotulo)
  })

  it('valor desconhecido ou ausente nunca vira texto técnico', () => {
    expect(paymentMethodLabel('wallet_xyz')).toBe('Outra forma de pagamento')
    expect(paymentMethodLabel(null)).toBe('Outra forma de pagamento')
  })
})

describe('OrderPaymentDelivery — pagamento (DET-11)', () => {
  it('mostra a forma e a data de aprovação', () => {
    render(<OrderPaymentDelivery order={pedido()} />)

    expect(screen.getByText('PIX')).toBeInTheDocument()
    expect(screen.getByText('Aprovado em 2 out')).toBeInTheDocument()
  })

  it('pedido não aprovado não afirma aprovação', () => {
    render(<OrderPaymentDelivery order={pedido({ payment_method: 'card', paid_at: null })} />)

    expect(screen.getByText('Cartão de crédito')).toBeInTheDocument()
    expect(screen.queryByText(/^Aprovado em/)).not.toBeInTheDocument()
  })
})

describe('OrderPaymentDelivery — entrega (DET-11)', () => {
  it('o endereço do snapshot em linhas: nome · rua, número, complemento · bairro · cidade/UF', () => {
    expect(addressLines(pedido())).toEqual([
      'Marina Yamashita',
      'Rua Padre Chagas, 185, Apto 302',
      'Moinhos de Vento',
      'Porto Alegre/RS',
    ])
  })

  it('linha sem dado some inteira — sem vírgula nem barra sobrando', () => {
    expect(
      addressLines(pedido({ address_complement: '  ', address_state: null, address_neighborhood: '' })),
    ).toEqual(['Marina Yamashita', 'Rua Padre Chagas, 185', 'Porto Alegre'])
  })

  it('renderiza as linhas e o CEP mascarado, numa linha só que não quebra no hífen', () => {
    render(<OrderPaymentDelivery order={pedido()} />)

    expect(screen.getByText('Rua Padre Chagas, 185, Apto 302')).toBeInTheDocument()
    expect(screen.getByText('Porto Alegre/RS')).toBeInTheDocument()
    const cep = screen.getByTestId('endereco-cep')
    expect(cep.textContent).toBe('CEP 90570-080')
    expect(cep.className.split(/\s+/)).toContain('whitespace-nowrap')
  })

  it('pedido sem endereço gravado não desenha o bloco de entrega vazio', () => {
    render(
      <OrderPaymentDelivery
        order={pedido({
          address_street: null,
          address_number: null,
          address_complement: null,
          address_neighborhood: null,
          address_city: null,
          address_state: null,
          address_zip: null,
        })}
      />,
    )

    expect(screen.queryByText('Entrega')).not.toBeInTheDocument()
    expect(screen.queryByTestId('endereco-cep')).not.toBeInTheDocument()
    expect(screen.getByText('PIX')).toBeInTheDocument()
  })
})
