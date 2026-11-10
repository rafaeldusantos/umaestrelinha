/**
 * `pageKind` — o tipo de página que a presença guarda. A loja e o servidor classificam do mesmo
 * jeito porque a regra mora aqui, delegando a `classifyPath` no que ele já sabe.
 */
import { describe, expect, it } from 'vitest'

import { pageKind, presencePage } from '../pageKind.ts'

describe('pageKind', () => {
  it.each([
    ['/produtos/colar-estrela', 'joia'],
    ['/produto/colar-estrela', 'joia'],
    ['/joias-afetivas', 'lista'],
    ['/joias-afetivas/colares', 'lista'],
    ['/colecao/joias-afetivas', 'lista'],
    ['/categoria/joias-afetivas', 'lista'],
    ['/busca', 'lista'],
    ['/carrinho', 'sacola'],
    ['/checkout', 'checkout'],
    ['/pedido-montado', 'checkout'],
    ['/pagar-com-cartao', 'checkout'],
    ['/pedido/8c5d5a1e-1234-4abc-8def-1234567890ab/pagamento', 'checkout'],
    ['/como-enviar-seu-material-de-dna', 'guia'],
    ['/como-enviar-o-material', 'guia'],
    ['/pedido/8c5d5a1e-1234-4abc-8def-1234567890ab', 'outra'],
    ['/', 'outra'],
    ['/sobre', 'outra'],
    ['/conta', 'outra'],
    ['/politica-de-privacidade', 'outra'],
    ['/a/b/c', 'outra'],
  ])('%s ⇒ %s', (caminho, tipo) => {
    expect(pageKind(caminho)).toBe(tipo)
  })
})

describe('presencePage', () => {
  it('a joia leva o slug (também do endereço legado)', () => {
    expect(presencePage('/produtos/colar-estrela')).toEqual({ kind: 'joia', slug: 'colar-estrela' })
    expect(presencePage('/produto/colar-estrela')).toEqual({ kind: 'joia', slug: 'colar-estrela' })
  })

  it('o que não é joia não leva slug', () => {
    expect(presencePage('/joias-afetivas')).toEqual({ kind: 'lista', slug: null })
    expect(presencePage('/carrinho')).toEqual({ kind: 'sacola', slug: null })
  })
})
