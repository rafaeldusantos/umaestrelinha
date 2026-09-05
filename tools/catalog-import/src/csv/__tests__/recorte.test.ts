import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { lerVendas } from '../parse.ts'
import { PRIMEIRO_PEDIDO, aplicarRecorte, dentroDoRecorte } from '../recorte.ts'

/**
 * O recorte dos dois negócios.
 *
 * O arquivo exportado carrega a loja de artigos religiosos (`#100..#134`) e a Uma Estrelinha
 * (`#135` em diante). Medido: 35 pedidos de cada lado, zero e-mail em comum. Decisão do usuário em
 * 2026-08-30: importar só a partir do `#135`.
 */

const pedidos = lerVendas(fs.readFileSync(new URL('../../__fixtures__/vendas.csv', import.meta.url)))

describe('recorte', () => {
  it('o primeiro pedido da Uma Estrelinha é o 135', () => {
    expect(PRIMEIRO_PEDIDO).toBe(135)
  })

  it('separa dentro e fora, e a soma bate com o total lido', () => {
    const { dentro, fora } = aplicarRecorte(pedidos)
    expect(dentro.map(p => p.numero)).toEqual([135, 136, 137, 138, 139, 140, 170])
    expect(fora.map(p => p.numero)).toEqual([133, 134])
    expect(dentro.length + fora.length).toBe(pedidos.length)
  })

  it('o 134 fica de fora e o 135 entra — o corte é exatamente ali', () => {
    expect(dentroDoRecorte({ numero: 134 })).toBe(false)
    expect(dentroDoRecorte({ numero: 135 })).toBe(true)
  })

  it('NÃO tem teto: um pedido acima do maior número real entra', () => {
    // O arquivo de hoje vai até #169. Um `max` deixaria os pedidos novos de fora em silêncio, e o
    // import passaria verde espelhando um recorte velho — a pior falha possível aqui.
    expect(dentroDoRecorte({ numero: 170 })).toBe(true)
    expect(dentroDoRecorte({ numero: 99999 })).toBe(true)
    expect(aplicarRecorte(pedidos).dentro.some(p => p.numero === 170)).toBe(true)
  })

  it('quem fica de fora é DEVOLVIDO, não descartado em silêncio', () => {
    // A lista `fora` alimenta a seção do relatório. Filtrar sem devolver esconderia um corte errado.
    expect(aplicarRecorte(pedidos).fora).toHaveLength(2)
  })
})
