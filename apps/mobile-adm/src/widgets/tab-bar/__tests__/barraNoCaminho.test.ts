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

  it('o pedido montado (`/pedidos/montados/<id>`, com e sem a barra final) NÃO tem a barra; a aba Pedidos com a visão Montados tem', () => {
    expect(barraNoCaminho('/pedidos/montados/cccccccc-0000-4000-8000-000000000001')).toBe(false)
    expect(barraNoCaminho('/pedidos/montados/abc/')).toBe(false)
    expect(barraNoCaminho('/pedidos')).toBe(true)
    // Um terceiro segmento que não é o do pedido montado continua com a barra (a regra é a rota, não o prefixo).
    expect(barraNoCaminho('/clientes/montados/abc')).toBe(true)
  })

  it('a montagem de um pedido (`/pedidos/montar`, com e sem a barra final) NÃO tem a barra: é tela cheia', () => {
    expect(barraNoCaminho('/pedidos/montar')).toBe(false)
    expect(barraNoCaminho('/pedidos/montar/')).toBe(false)
  })
})
