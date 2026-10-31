// A linha do rótulo do bloco fechado (Contato, Entrega) QUEBRA quando não cabe.
//
// Achado na prova em navegador da feature 89 (T27), em `/pedido-montado` a 390 com a fonte do
// sistema a 200 %: o disco (64px), o rótulo em versalete (128px) e o "Alterar" (141px) pediam 381px
// numa linha que tinha 262, e a página rolava de lado (`scrollWidth` 448). O `/checkout` usa a
// MESMA casca, então o defeito era dele também. jsdom devolve 0 para layout: a régua é o token que
// produz a quebra (molde de `acoesDoCabecalho` da `88`), e a medida é de navegador.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CollapsedBlock from '../CollapsedBlock'

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

describe('CollapsedBlock — a linha do rótulo quebra em vez de estourar', () => {
  const montar = () =>
    render(
      <CollapsedBlock label="Entrega" step={2} complete completeLabel="Entrega preenchida" actionLabel="Alterar" onAction={() => {}}>
        <p>Rua dos Andradas, 100</p>
      </CollapsedBlock>,
    )

  it('a linha que leva o rótulo e o "Alterar" embrulha (token exato)', () => {
    montar()
    const linha = screen.getByRole('button', { name: 'Alterar' }).parentElement!
    expect(tokens(linha)).toContain('flex-wrap')
    // O vão horizontal continua o de 12px do desenho; o vertical só existe quando quebra.
    expect(tokens(linha)).toContain('gap-x-3')
  })

  it('o alvo de 44px do "Alterar" continua (token exato)', () => {
    montar()
    expect(tokens(screen.getByRole('button', { name: 'Alterar' }))).toContain('min-h-11')
  })
})
