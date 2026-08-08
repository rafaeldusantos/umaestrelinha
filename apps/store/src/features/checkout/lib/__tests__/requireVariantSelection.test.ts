import { describe, expect, it } from 'vitest'
import { findItemsMissingVariant, missingVariantMessage } from '../requireVariantSelection'

// Testes derivados de PST-03 AC 5 e do "Done when" da T16.

const item = (productId: string, productName: string, variantId: string | null) =>
  ({ productId, productName, variantId })

describe('findItemsMissingVariant', () => {
  it('produto que exige variação e está sem ela é apontado pelo NOME', () => {
    expect(
      findItemsMissingVariant([item('p1', 'Botton Naruto', null)], new Set(['p1'])),
    ).toEqual(['Botton Naruto'])
  })

  it('produto que exige variação E TEM uma passa', () => {
    expect(findItemsMissingVariant([item('p1', 'Botton Naruto', 'v1')], new Set(['p1']))).toEqual([])
  })

  it('produto SEM grade passa mesmo sem variantId — é precificado por base_price', () => {
    expect(findItemsMissingVariant([item('p1', 'Botton Naruto', null)], new Set())).toEqual([])
  })

  it('pin personalizado (product_id sintético, sem grade) passa', () => {
    expect(
      findItemsMissingVariant([item('custom-1754', 'Botton Personalizado', null)], new Set(['p1'])),
    ).toEqual([])
  })

  it('aponta só os culpados, deixando os demais em paz', () => {
    const missing = findItemsMissingVariant(
      [
        item('p1', 'Naruto', null),   // exige e não tem  -> aponta
        item('p2', 'Gojo', 'v9'),     // exige e tem      -> passa
        item('p3', 'Sailor', null),   // não exige        -> passa
      ],
      new Set(['p1', 'p2']),
    )
    expect(missing).toEqual(['Naruto'])
  })

  it('não repete o nome quando o mesmo produto aparece duas vezes', () => {
    expect(
      findItemsMissingVariant(
        [item('p1', 'Naruto', null), item('p1', 'Naruto', null)],
        new Set(['p1']),
      ),
    ).toEqual(['Naruto'])
  })

  it('carrinho vazio passa', () => {
    expect(findItemsMissingVariant([], new Set(['p1']))).toEqual([])
  })
})

describe('missingVariantMessage', () => {
  it('nomeia o produto — "algo deu errado" não é acionável', () => {
    expect(missingVariantMessage(['Botton Naruto'])).toContain('Botton Naruto')
  })

  it('lista todos quando são vários', () => {
    const msg = missingVariantMessage(['Naruto', 'Gojo'])
    expect(msg).toContain('Naruto')
    expect(msg).toContain('Gojo')
  })
})
