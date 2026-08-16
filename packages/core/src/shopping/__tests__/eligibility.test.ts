import { describe, expect, it } from 'vitest'
import { FEED_EXCLUSIONS, feedExclusion } from '../eligibility'

/**
 * `GSH-04` (P1-A AC 5) — a regra de inclusão do feed.
 *
 * A régua é o catálogo real, medido no banco local em 2026-08-16: **3.233** variações ativas, de
 * produto ativo, com preço, contra **3.237** itens no Merchant Center. Afrouxar esta regra publica
 * ofertas que nunca estiveram no Google; apertá-la remove ofertas vivas.
 */

const ativo = { is_active: true }
const inativo = { is_active: false }
const vendavel = { is_active: true, price: 19.9 }

describe('feedExclusion — quem entra', () => {
  it('devolve null para variação ativa, de produto ativo, com preço', () => {
    expect(feedExclusion(ativo, vendavel)).toBeNull()
  })

  it('preço zero é preço — entra no feed', () => {
    expect(feedExclusion(ativo, { is_active: true, price: 0 })).toBeNull()
  })
})

describe('feedExclusion — os três motivos', () => {
  it('produto inativo', () => {
    expect(feedExclusion(inativo, vendavel)).toBe('produto_inativo')
  })

  it('variação inativa', () => {
    expect(feedExclusion(ativo, { is_active: false, price: 19.9 })).toBe('variacao_inativa')
  })

  it('variação sem preço', () => {
    expect(feedExclusion(ativo, { is_active: true, price: null })).toBe('sem_preco')
  })
})

describe('feedExclusion — precedência quando mais de um motivo se aplica', () => {
  it('produto inativo vence variação inativa', () => {
    expect(feedExclusion(inativo, { is_active: false, price: 19.9 })).toBe('produto_inativo')
  })

  it('produto inativo vence sem preço', () => {
    expect(feedExclusion(inativo, { is_active: true, price: null })).toBe('produto_inativo')
  })

  it('variação inativa vence sem preço', () => {
    expect(feedExclusion(ativo, { is_active: false, price: null })).toBe('variacao_inativa')
  })

  it('com os três motivos juntos, o mais externo vence — é o único passo que muda algo', () => {
    expect(feedExclusion(inativo, { is_active: false, price: null })).toBe('produto_inativo')
  })
})

describe('FEED_EXCLUSIONS', () => {
  it('lista os três motivos na ordem de precedência que a função aplica', () => {
    expect(FEED_EXCLUSIONS).toEqual(['produto_inativo', 'variacao_inativa', 'sem_preco'])
  })

  it('a tela agrupa por estes valores — todo motivo devolvido está na lista', () => {
    const devolvidos = [
      feedExclusion(inativo, vendavel),
      feedExclusion(ativo, { is_active: false, price: 19.9 }),
      feedExclusion(ativo, { is_active: true, price: null }),
    ]
    for (const motivo of devolvidos) {
      expect(FEED_EXCLUSIONS).toContain(motivo)
    }
  })
})
