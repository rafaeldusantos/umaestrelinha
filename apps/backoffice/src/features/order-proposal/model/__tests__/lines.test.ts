// A linha da peça antes e depois de relida, e a linha escolhida na caixa "Acrescentar peça"
// (feature 89, `MON-05`; ajuste de 2026-11-01: a foto e o teto do estoque). E o rótulo do cupom.

import { describe, expect, it } from 'vitest'
import type { PecaParaProposta } from '@/entities/product'
import { acertoDaLinha, linhaEscolhida, linhaNova, tetoDoEstoque } from '../lines'
import { rotuloDoCupom } from '../coupon'

const P1 = '11111111-1111-4111-8111-111111111111'
const CAPA = 'http://x/storage/v1/object/public/product-images/capa.webp'
const FOTO_B = 'http://x/storage/v1/object/public/product-images/b.webp'

const peca: PecaParaProposta = {
  id: P1, nome: 'Colar', ativa: true, precoBase: 150, imagem: CAPA, politica: 'track', estoqueTotal: 0,
  pedeMaterial: true, limiteDeGravacao: 10, medidas: { weight_kg: null, width_cm: null, height_cm: null, length_cm: null },
  variacoes: [
    { id: 'a', rotulo: 'A', preco: 200, estoque: 1, disponivel: true, grava: false, imagem: CAPA, valores: {}, peso: null },
    { id: 'b', rotulo: 'B', preco: 210, estoque: 4, disponivel: true, grava: true, imagem: FOTO_B, valores: {}, peso: 0.1 },
  ],
}

describe('acertoDaLinha', () => {
  it('a variação pausada desde a montagem volta a ser pedida; o preço de hoje entra', () => {
    const pausada = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'sumiu', list_price: 150 }
    expect(acertoDaLinha(pausada, peca)).toMatchObject({ variant_id: null, list_price: null, needsVariant: true })
    const repreco = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'b', list_price: 150 }
    expect(acertoDaLinha(repreco, peca)).toMatchObject({ variant_id: 'b', list_price: 210, engraves: true, dimensions: { weight_kg: 0.1 } })
  })

  it('com duas oferecíveis não escolhe sozinha; com uma só, escolhe (B09)', () => {
    const nova = linhaNova({ id: P1, name: 'Colar' })
    expect(acertoDaLinha(nova, peca)).toMatchObject({ needsVariant: true, variant_id: null, variant_label: null, list_price: null })
    const umaSo: PecaParaProposta = { ...peca, variacoes: [{ ...peca.variacoes[0], disponivel: false }, peca.variacoes[1]] }
    expect(acertoDaLinha(nova, umaSo)).toMatchObject({ needsVariant: true, variant_id: 'b', list_price: 210 })
  })

  it('a foto é a da variação escolhida; sem escolha, a capa da peça', () => {
    const comB = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'b' }
    expect(acertoDaLinha(comB, peca).image_url).toBe(FOTO_B)
    expect(acertoDaLinha(linhaNova({ id: P1, name: 'Colar' }), peca).image_url).toBe(CAPA)
  })

  it('o teto do contador é o estoque da variação (track) ou da peça sem grade', () => {
    const comB = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'b' }
    expect(acertoDaLinha(comB, peca).stock_cap).toBe(4)
    const semGrade: PecaParaProposta = { ...peca, variacoes: [], estoqueTotal: 7 }
    expect(acertoDaLinha(linhaNova({ id: P1, name: 'Colar' }), semGrade)).toMatchObject({ needsVariant: false, list_price: 150, stock_cap: 7 })
    const livre: PecaParaProposta = { ...semGrade, politica: 'none' }
    expect(acertoDaLinha(linhaNova({ id: P1, name: 'Colar' }), livre).stock_cap).toBeNull()
  })

  it('a variação que sumiu leva junto o teto do estoque dela', () => {
    const velha = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'sumiu', stock_cap: 1 }
    expect(acertoDaLinha(velha, peca).stock_cap).toBeNull()
  })
})

describe('tetoDoEstoque', () => {
  it('track ⇒ o estoque, nunca abaixo de 1; livre ⇒ null', () => {
    expect(tetoDoEstoque('track', 3)).toBe(3)
    expect(tetoDoEstoque('track', 0)).toBe(1)
    expect(tetoDoEstoque('none', 3)).toBeNull()
    expect(tetoDoEstoque('backorder', 3)).toBeNull()
  })
})

describe('linhaEscolhida', () => {
  it('a linha pronta leva variação, preço, quantidade, foto, teto e a gravação (só se a variação grava)', () => {
    const l = linhaEscolhida(peca, peca.variacoes[1], 3, 'Ana')
    expect(l).toMatchObject({
      product_id: P1, product_name: 'Colar', needsVariant: true, variant_id: 'b', variant_label: 'B', list_price: 210,
      quantity: 3, engraves: true, engraving_text: 'Ana', engraving_max: 10, requires_material: true, image_url: FOTO_B, stock_cap: 4,
    })
    expect(typeof l.key).toBe('string')
  })

  it('variação que não grava descarta o texto digitado', () => {
    expect(linhaEscolhida(peca, peca.variacoes[0], 1, 'Ana')).toMatchObject({ variant_id: 'a', engraves: false, engraving_text: '' })
  })

  it('sem grade: preço base, sem variação', () => {
    const semGrade: PecaParaProposta = { ...peca, variacoes: [], estoqueTotal: 5 }
    expect(linhaEscolhida(semGrade, null, 2, '')).toMatchObject({ needsVariant: false, variant_id: null, list_price: 150, quantity: 2, image_url: CAPA })
  })
})

describe('rotuloDoCupom', () => {
  it('diz em palavras o que o cupom faz', () => {
    expect(rotuloDoCupom({ type: 'percent', value: 10 })).toBe('10% de desconto')
    expect(rotuloDoCupom({ type: 'percent', value: 7.5 })).toBe('7,5% de desconto')
    expect(rotuloDoCupom({ type: 'free_shipping', value: 0 })).toBe('Frete grátis')
    expect(rotuloDoCupom({ type: 'fixed', value: 20 }).replace(/\s/g, ' ')).toBe('R$ 20,00 de desconto')
  })
})
