import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BuyTogetherBlock from '../buy-together/BuyTogetherBlock'
import type { BuyTogether } from '../../model/useBuyTogether'

/**
 * O esqueleto do bloco, medido no próprio bloco. A página não o alcança mais pelo caminho comum — ela
 * espera a primeira resposta do Compre Junto antes de pintar a coluna —, mas o estado `loading` do
 * conjunto continua existindo, e quando ele aparece o espaço tem de vir reservado.
 */
describe('BuyTogetherBlock carregando', () => {
  it('reserva o espaço com esqueleto ocupado e altura mínima', () => {
    render(<BuyTogetherBlock state={{ display: 'loading' } as BuyTogether} />)
    const reserva = screen.getByLabelText('Compre junto')
    expect(reserva).toHaveAttribute('aria-busy', 'true')
    expect(reserva.className).toMatch(/(?:^|\s)min-h-\[320px\](?![-\w])/)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})
