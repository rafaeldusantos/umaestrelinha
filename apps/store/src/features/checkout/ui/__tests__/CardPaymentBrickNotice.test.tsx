import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CardPaymentBrick from '../CardPaymentBrick'
import { declinedNotice, unansweredNotice } from '../../lib/cardNotice'

/* eslint-disable @typescript-eslint/no-explicit-any */

// O aviso do cartão que não fechou — board `58 M`. Os dublês são os mesmos de
// `CardPaymentBrick.test.tsx`, pelo mesmo motivo: o componente monta sem `QueryClientProvider`.
vi.mock('@mercadopago/sdk-react', () => ({
  CardPayment: () => <div data-testid="mp-card-payment" />,
}))
vi.mock('../../api/useCardInstallments', () => ({
  useCardInstallments: () => ({ data: undefined, isError: false }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))

const renderBrick = (props: Partial<Parameters<typeof CardPaymentBrick>[0]> = {}) =>
  render(
    <CardPaymentBrick amount={100} payerEmail="marina@email.com" errorMessage={null} {...props} />,
  )

afterEach(() => {
  delete (Element.prototype as any).scrollIntoView
})

describe('CardPaymentBrick — aviso de recusa (board 58 M)', () => {
  it('desenha título, motivo e a linha do pedido guardado', () => {
    renderBrick({
      errorMessage: 'Saldo insuficiente no cartão.',
      notice: declinedNotice('cc_rejected_insufficient_amount', '0244'),
    })

    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent('O banco não aprovou este cartão')
    expect(aviso).toHaveTextContent('Saldo insuficiente no cartão.')
    expect(aviso).toHaveTextContent('Pedido #0244 · guardado, e nada foi cobrado')
  })

  it('o aviso SUBSTITUI a linha crua — a mesma mensagem não aparece duas vezes', () => {
    renderBrick({
      errorMessage: 'Saldo insuficiente no cartão.',
      notice: declinedNotice('cc_rejected_insufficient_amount', '0244'),
    })

    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getAllByText('Saldo insuficiente no cartão.')).toHaveLength(1)
  })

  it('fica ACIMA do formulário — embaixo ele caía fora da dobra', () => {
    renderBrick({ notice: declinedNotice(null, '0244') })

    const aviso = screen.getByRole('alert')
    const formulario = screen.getByTestId('mp-card-payment')
    expect(aviso.compareDocumentPosition(formulario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('rola até o aviso quando ele chega — a pessoa volta da espera direto para ele', () => {
    const rolar = vi.fn()
    ;(Element.prototype as any).scrollIntoView = rolar

    const { rerender } = renderBrick()
    expect(rolar).not.toHaveBeenCalled()

    rerender(
      <CardPaymentBrick
        amount={100}
        payerEmail="marina@email.com"
        errorMessage="Falhou."
        notice={unansweredNotice('Falhou.', '0244')}
      />,
    )
    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar.mock.contexts[0]).toBe(screen.getByRole('alert'))
  })

  it('sem resposta do banco, o aviso não fala de cobrança', () => {
    renderBrick({ notice: unansweredNotice('O pagamento demorou demais.', '0244') })

    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent('Não conseguimos concluir o pagamento')
    expect(aviso).toHaveTextContent('Pedido #0244 · continua guardado')
    expect(aviso.textContent).not.toMatch(/cobrad/)
  })

  it('sem aviso, a linha crua continua como era (o CPF que falta, por exemplo)', () => {
    renderBrick({ errorMessage: 'Informe o CPF ou CNPJ do titular.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o CPF ou CNPJ do titular.')
  })
})
