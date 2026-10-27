// Feature `83` · T06 — `LAV-06`: a Loja ao vivo não tem a barra de abas (tem o próprio "Voltar").
import { describe, expect, it } from 'vitest'
import { barraNoCaminho } from '../model/tabs'

describe('barraNoCaminho', () => {
  it('`/ao-vivo` (e com a barra final) NÃO tem a barra', () => {
    expect(barraNoCaminho('/ao-vivo')).toBe(false)
    expect(barraNoCaminho('/ao-vivo/')).toBe(false)
  })

  it.each(['/', '/pedidos', '/clientes', '/descontos', '/avisos'])('%s continua com a barra', (c) => {
    expect(barraNoCaminho(c)).toBe(true)
  })

  it('os detalhes continuam sem a barra, e um caminho que só COMEÇA com ao-vivo não é a tela', () => {
    expect(barraNoCaminho('/pedidos/abc')).toBe(false)
    expect(barraNoCaminho('/clientes/abc')).toBe(false)
    expect(barraNoCaminho('/ao-vivo-x')).toBe(true)
  })
})
