import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PaymentProgress from '../PaymentProgress'

/**
 * A espera do CARTÃO — boards `58 J`, `58 K` e `58 N`.
 *
 * É a MESMA tela do PIX (`PaymentProgress.test.tsx` prende a mecânica dos passos), e o que estes
 * casos prendem é só o que muda com o meio: o rótulo do passo 2, o meio ao lado do valor e a frase
 * de baixo. A frase importa mais que as outras duas: no PIX a cobrança acontece DEPOIS, no app do
 * banco; no cartão ela É o passo 2 — e "a cobrança acontece quando você paga no app" diria uma
 * coisa falsa a quem está pagando com cartão.
 */

const PASSO_2_CARTAO = 'Confirmando com o banco'
const PASSO_2_PIX = 'Gerando o código PIX com o banco'

describe('PaymentProgress — cartão, passo 1', () => {
  it('nomeia o passo 2 do cartão, e nunca o do PIX', () => {
    render(<PaymentProgress method="card" step="order" amount={49} />)

    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estamos registrando seu pedido' })).toBeInTheDocument()
    expect(screen.getByText(PASSO_2_CARTAO)).toBeInTheDocument()
    expect(screen.queryByText(PASSO_2_PIX)).not.toBeInTheDocument()
  })

  it('a frase de baixo diz que a cobrança depende da aprovação — não do app do banco', () => {
    render(<PaymentProgress method="card" step="order" amount={49} />)

    expect(
      screen.getByText('Nada foi cobrado ainda. A cobrança só acontece se o banco aprovar o cartão.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/quando você paga no app/)).not.toBeInTheDocument()
  })
})

describe('PaymentProgress — cartão, passo 2', () => {
  it('título, frase e o número do pedido guardado', () => {
    render(<PaymentProgress method="card" step="code" amount={49} orderNumber="0244" />)

    expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Confirmando seu pagamento' })).toBeInTheDocument()
    expect(screen.getByText('#0244')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Seu pedido já está guardado. Se o banco não aprovar, nada é cobrado e você pode tentar de novo.',
      ),
    ).toBeInTheDocument()
  })

  it('o passo 2 do cartão é o que gira; o 1 está concluído', () => {
    render(<PaymentProgress method="card" step="code" amount={49} />)

    const passo2 = screen.getByText(PASSO_2_CARTAO).closest('li') as HTMLElement
    expect(passo2.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText('Pedido registrado')).toBeInTheDocument()
  })

  it('a linha de espera longa acrescenta, sem tirar os passos', () => {
    render(<PaymentProgress method="card" step="code" amount={49} slow />)

    expect(screen.getByText('A espera está mais longa que o normal.')).toBeInTheDocument()
    expect(screen.getByText(PASSO_2_CARTAO)).toBeInTheDocument()
  })
})

describe('PaymentProgress — o meio ao lado do valor', () => {
  it('cartão parcelado diz em quantas vezes', () => {
    render(<PaymentProgress method="card" step="code" amount={49} installments={3} />)
    expect(screen.getByText('· cartão em 3x')).toBeInTheDocument()
  })

  it('cartão à vista não anuncia "1x"', () => {
    render(<PaymentProgress method="card" step="code" amount={49} installments={1} />)
    expect(screen.getByText('· cartão')).toBeInTheDocument()
    expect(screen.queryByText(/1x/)).not.toBeInTheDocument()
  })

  it('sem `method`, a tela continua sendo a do PIX — os consumidores antigos não mudam', () => {
    render(<PaymentProgress step="code" amount={46.55} />)
    expect(screen.getByText('· PIX')).toBeInTheDocument()
    expect(screen.getByText(PASSO_2_PIX)).toBeInTheDocument()
  })
})
