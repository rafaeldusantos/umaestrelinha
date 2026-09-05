import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * A faixa de vantagens da home — board `7CF-0`.
 *
 * O que estes testes congelam é a razão de ela ter substituído a `MarqueeBar`: **nenhum número da
 * faixa é escrito no JSX**. A faixa antiga prometia "Pix com 5% OFF", "Parcele em 12×" e "Frete
 * grátis acima de R$150" em texto fixo, e o teto de parcelas do sistema já era 6 — a home dizia uma
 * coisa e o caixa cobrava outra, sem nada acusar.
 */

const payment = vi.hoisted(() => ({
  value: {
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  },
}))
// `free_shipping_enabled` entra aqui e NÃO é substituído por `threshold: 0` (feature 37): o
// interruptor é campo próprio, e a faixa guardada sobrevive a ele. O componente lê `useFreeShipping`,
// que consome estas mesmas settings — mockar aqui exercita a regra de verdade, não um dublê dela.
const shipping = vi.hoisted(() => ({
  value: { free_shipping_enabled: true, free_shipping_threshold: 150 },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => payment.value,
  useShippingSettings: () => shipping.value,
}))

import TrustBar from '../TrustBar'

beforeEach(() => {
  payment.value = {
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }
  shipping.value = { free_shipping_enabled: true, free_shipping_threshold: 150 }
})

describe('TrustBar — os números saem das settings', () => {
  it('o teto de parcelas é o das settings, não um número cravado', () => {
    render(<TrustBar />)
    expect(screen.getByText('Pague em até 6x sem juros')).toBeInTheDocument()

    payment.value = { ...payment.value, max_installments: 4 }
    render(<TrustBar />)
    expect(screen.getByText('Pague em até 4x sem juros')).toBeInTheDocument()
  })

  it('o desconto do Pix é o das settings', () => {
    payment.value = { ...payment.value, pix_discount_percent: 8 }
    render(<TrustBar />)
    expect(screen.getByText('8% de desconto no Pix')).toBeInTheDocument()
  })

  it('o limiar de frete grátis vira a segunda linha do envio', () => {
    shipping.value = { free_shipping_enabled: true, free_shipping_threshold: 199 }
    render(<TrustBar />)
    expect(screen.getByText('grátis acima de R$ 199')).toBeInTheDocument()
  })
})

describe('TrustBar — o que some quando a loja desliga', () => {
  it('sem Pix, a vantagem do Pix não aparece', () => {
    payment.value = { ...payment.value, pix_enabled: false }
    render(<TrustBar />)
    expect(screen.queryByText(/desconto no Pix/)).toBeNull()
    // As outras três continuam: desligar um meio de pagamento não apaga o envio nem o atendimento.
    expect(screen.getByText('Envio garantido')).toBeInTheDocument()
  })

  it('com desconto zerado, a vantagem do Pix também não aparece', () => {
    // `pix_enabled` ligado e desconto 0 é o caso que uma checagem só de booleano deixaria passar,
    // e a faixa anunciaria "0% de desconto no Pix".
    payment.value = { ...payment.value, pix_discount_percent: 0 }
    render(<TrustBar />)
    expect(screen.queryByText(/desconto no Pix/)).toBeNull()
  })

  it('sem parcelamento, a vantagem de parcelas não aparece', () => {
    payment.value = { ...payment.value, max_installments: 1 }
    render(<TrustBar />)
    expect(screen.queryByText(/sem juros/)).toBeNull()
  })

  it('com o interruptor DESLIGADO, o envio continua prometendo o Brasil inteiro', () => {
    // O item NÃO some: enviar para todo o Brasil é verdade com ou sem frete grátis, e é a promessa
    // que a cliente precisa ler antes de comprar.
    shipping.value = { free_shipping_enabled: false, free_shipping_threshold: 150 }
    render(<TrustBar />)
    expect(screen.getByText('para todo o Brasil')).toBeInTheDocument()
    // E o número guardado NÃO vaza: a faixa segue 150 no banco, e a home não a menciona.
    expect(screen.queryByText(/grátis acima de/)).toBeNull()
    expect(screen.queryByText(/150/)).toBeNull()
  })

  it('interruptor LIGADO com faixa zerada não vira promessa de graça para todos', () => {
    // Configuração inválida (`FRG-12` a impede de ser gravada). Antes da feature 37, a leitura
    // `subtotal >= 0` que outras superfícies faziam liberava frete grátis para todo mundo.
    shipping.value = { free_shipping_enabled: true, free_shipping_threshold: 0 }
    render(<TrustBar />)
    expect(screen.getByText('para todo o Brasil')).toBeInTheDocument()
    expect(screen.queryByText(/grátis acima de/)).toBeNull()
  })
})
