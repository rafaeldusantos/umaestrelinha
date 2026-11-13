import { describe, expect, it } from 'vitest'
import { ANNOUNCEMENT_KINDS } from '../index.ts'

/**
 * O tom da loja: a faixa não tem aviso com relógio correndo, com estoque nem com prova social. A
 * AUSÊNCIA é a regra — um catálogo genérico de avisos os traria de volta pela porta do painel. Molde:
 * o caso equivalente de `homeSections.test.ts`, na suíte da loja.
 */
const PROIBIDOS =
  /countdown|contagem|regressiv|timer|cronometr|prazo|stock|estoque|ultimas|últimas|unidades|scarcity|escassez|social_proof|prova_social|depoiment|testimonial|review|avaliac|vendid|comprando/i

describe('o catálogo de tipos de aviso', () => {
  it('são exatamente texto e imagem', () => {
    expect([...ANNOUNCEMENT_KINDS]).toEqual(['text', 'image'])
  })

  it('não tem tipo de contagem regressiva, de estoque nem de prova social', () => {
    expect(ANNOUNCEMENT_KINDS.length).toBeGreaterThan(0)
    for (const tipo of ANNOUNCEMENT_KINDS) {
      expect(tipo, `o catálogo traz \`${tipo}\``).not.toMatch(PROIBIDOS)
    }
  })

  it('a régua de fato pega as formas proibidas — sensor', () => {
    for (const tipo of ['countdown', 'contagem_regressiva', 'low_stock', 'estoque', 'social_proof', 'ultimas_unidades']) {
      expect(tipo).toMatch(PROIBIDOS)
    }
    expect('text').not.toMatch(PROIBIDOS)
    expect('image').not.toMatch(PROIBIDOS)
  })
})
