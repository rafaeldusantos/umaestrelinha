import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { formatPrice } from '@estrelinha/core/formatters'

import { approvedNote } from '../../model/approvedNote'
import PaymentApproved from '../PaymentApproved'

/**
 * A batida do pagamento aprovado — boards `58 D` (PIX) e `58 L` (cartão).
 *
 * Uma tela para os dois meios. O PIX já tem os casos dele em `PixSurface.test.tsx`, que passaram a
 * exercitar ESTE componente sem uma asserção alterada — é a prova de que a extração não mudou o que
 * o PIX mostra. Aqui fica o que é do cartão, e o que é dos dois.
 */

const montar = (props: Partial<Parameters<typeof PaymentApproved>[0]> = {}) =>
  render(
    <MemoryRouter>
      <PaymentApproved
        method="card"
        amount={49}
        orderNumber="0244"
        orderHref="/pedido/ord-1"
        {...props}
      />
    </MemoryRouter>,
  )

describe('PaymentApproved — cartão (board 58 L)', () => {
  it('diz "aprovado", não "confirmado" — o cartão não espera o app do banco', () => {
    const { container } = montar()

    expect(screen.getByRole('heading', { name: 'Pagamento aprovado' })).toBeInTheDocument()
    expect(container.querySelector('.estrelinha-eyebrow')?.textContent).toBe(
      'Pedido #0244 · Pagamento aprovado',
    )
    expect(screen.getByText(/Aprovado às \d{2}:\d{2}/)).toBeInTheDocument()
    expect(screen.queryByText(/confirmado/i)).not.toBeInTheDocument()
  })

  it('parcelado, diz a parcela que a fatura vai mostrar', () => {
    montar({ installments: { count: 3, value: 16.33 } })
    // Regex com `\s`: o `Intl` separa `R$` com espaço não-separável, e o normalizador do Testing
    // Library o troca por espaço comum no DOM — uma string com o NBSP nunca casaria.
    expect(screen.getByText(/^no cartão, em 3x de R\$\s16,33$/)).toBeInTheDocument()
  })

  it('o caminho manual para o pedido fica visível (PIX-P2-04)', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toHaveAttribute(
      'href',
      '/pedido/ord-1',
    )
  })

  it('o comprovante só é prometido quando há para onde mandá-lo', () => {
    const { unmount } = montar({ customerEmail: 'marina.y@email.com' })
    expect(screen.getByText('marina.y@email.com')).toBeInTheDocument()
    unmount()

    montar()
    expect(screen.queryByText(/O comprovante está indo/)).not.toBeInTheDocument()
  })
})

describe('approvedNote — a linha sob o valor', () => {
  it.each([
    ['pix', null, 'pagos com PIX'],
    ['card', null, 'pagos no cartão'],
    ['card', { count: 1, value: 49 }, 'pagos no cartão'],
    ['card', { count: 3, value: 16.33 }, `no cartão, em 3x de ${formatPrice(16.33)}`],
  ] as const)('%s %o → %s', (method, installments, esperado) => {
    expect(approvedNote(method, installments)).toBe(esperado)
  })

  it('o PIX ignora parcelas mesmo que alguém as mande', () => {
    expect(approvedNote('pix', { count: 3, value: 16.33 })).toBe('pagos com PIX')
  })
})
