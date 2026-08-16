import { describe, expect, it } from 'vitest'
import {
  FAQ_MIN_CATEGORY_SAMPLE,
  FAQ_SUGGESTION_LIMIT,
  rankFaqSuggestions,
} from '../suggest'
import type { FaqCategoryUsage } from '../types'

/**
 * `FAQ-30`, `FAQ-31`, `FAQ-32` — o ranking.
 *
 * Os cenários usam a forma real do catálogo: uma categoria guarda-chuva enorme (`Joias e acessórios`,
 * 634 produtos) ao lado de uma específica pequena (`Anéis`, 47) — que é onde a contagem bruta erra e
 * a proporção acerta.
 */

const uso = (
  category_id: string,
  faq_id: string,
  uses: number,
  sample: number,
): FaqCategoryUsage => ({ category_id, faq_id, uses, sample })

describe('rankFaqSuggestions — a proporção decide', () => {
  // O caso que separa as duas fórmulas. Contagem bruta poria `generica` na frente (300 > 31);
  // proporção põe `ajustavel` (31/47 = 66% contra 300/634 = 47%).
  it('prefere a pergunta concentrada na categoria específica à comum na guarda-chuva', () => {
    const usage = [
      uso('guarda-chuva', 'generica', 300, 634),
      uso('aneis', 'ajustavel', 31, 47),
    ]
    const saida = rankFaqSuggestions({ categoryIds: ['guarda-chuva', 'aneis'], usage })

    expect(saida.map(s => s.faq_id)).toEqual(['ajustavel', 'generica'])
    expect(saida[0].score).toBeCloseTo(31 / 47, 5)
  })

  it('toma a MAIOR proporção quando a pergunta aparece em duas categorias do produto', () => {
    const usage = [uso('guarda-chuva', 'p', 300, 634), uso('aneis', 'p', 40, 47)]
    const saida = rankFaqSuggestions({ categoryIds: ['guarda-chuva', 'aneis'], usage })

    expect(saida[0].score).toBeCloseTo(40 / 47, 5)
  })

  it('ignora categoria que não é do produto', () => {
    const usage = [uso('outra', 'de-outra', 40, 47), uso('aneis', 'daqui', 10, 47)]
    const saida = rankFaqSuggestions({ categoryIds: ['aneis'], usage })

    expect(saida.map(s => s.faq_id)).toEqual(['daqui'])
  })

  it('marca a origem como `category`', () => {
    const saida = rankFaqSuggestions({ categoryIds: ['a'], usage: [uso('a', 'p', 3, 5)] })
    expect(saida[0].source).toBe('category')
  })
})

describe('rankFaqSuggestions — amostra mínima', () => {
  it('a constante é 3', () => {
    expect(FAQ_MIN_CATEGORY_SAMPLE).toBe(3)
  })

  // Com 2 vizinhos, 2/2 = 100% — certeza fabricada.
  it('ignora categoria com menos de 3 produtos com FAQ', () => {
    const usage = [uso('minuscula', 'ruido', 2, 2), uso('aneis', 'real', 10, 47)]
    const saida = rankFaqSuggestions({ categoryIds: ['minuscula', 'aneis'], usage })

    expect(saida.map(s => s.faq_id)).toEqual(['real'])
  })

  it('aceita a categoria exatamente no limite de 3', () => {
    const saida = rankFaqSuggestions({ categoryIds: ['a'], usage: [uso('a', 'p', 2, 3)] })
    expect(saida.map(s => s.faq_id)).toEqual(['p'])
  })
})

describe('rankFaqSuggestions — o produto sai da própria conta', () => {
  it('desconta o produto do denominador quando ele já tem perguntas', () => {
    const saida = rankFaqSuggestions({
      categoryIds: ['a'],
      usage: [uso('a', 'p', 5, 11)],
      productHasFaq: true,
    })
    expect(saida[0].score).toBeCloseTo(5 / 10, 5)
  })

  it('não desconta quando o produto ainda não tem nenhuma', () => {
    const saida = rankFaqSuggestions({
      categoryIds: ['a'],
      usage: [uso('a', 'p', 5, 11)],
      productHasFaq: false,
    })
    expect(saida[0].score).toBeCloseTo(5 / 11, 5)
  })

  it('descarta a linha cujo denominador zeraria', () => {
    const saida = rankFaqSuggestions({
      categoryIds: ['a'],
      usage: [uso('a', 'p', 1, 3)],
      productHasFaq: true,
    })
    expect(saida[0].score).toBeCloseTo(1 / 2, 5)
  })

  it('não sugere o que o produto já tem', () => {
    const usage = [uso('a', 'ja-tem', 40, 47), uso('a', 'nova', 10, 47)]
    const saida = rankFaqSuggestions({ categoryIds: ['a'], usage, linkedFaqIds: ['ja-tem'] })

    expect(saida.map(s => s.faq_id)).toEqual(['nova'])
  })
})

describe('rankFaqSuggestions — limite e ordem', () => {
  it('o limite padrão é 5', () => {
    expect(FAQ_SUGGESTION_LIMIT).toBe(5)

    const usage = Array.from({ length: 9 }, (_, i) => uso('a', `p${i}`, 9 - i, 10))
    expect(rankFaqSuggestions({ categoryIds: ['a'], usage })).toHaveLength(5)
  })

  it('respeita um limite explícito', () => {
    const usage = Array.from({ length: 9 }, (_, i) => uso('a', `p${i}`, 9 - i, 10))
    expect(rankFaqSuggestions({ categoryIds: ['a'], usage, limit: 3 })).toHaveLength(3)
    expect(rankFaqSuggestions({ categoryIds: ['a'], usage, limit: 0 })).toEqual([])
  })

  // Sem desempate, duas aberturas da mesma aba mostrariam ordens diferentes.
  it('desempata por `faq_id` e é estável entre chamadas', () => {
    const usage = [uso('a', 'zebra', 5, 10), uso('a', 'abacate', 5, 10)]
    const primeira = rankFaqSuggestions({ categoryIds: ['a'], usage })
    const segunda = rankFaqSuggestions({ categoryIds: ['a'], usage: [...usage].reverse() })

    expect(primeira.map(s => s.faq_id)).toEqual(['abacate', 'zebra'])
    expect(segunda.map(s => s.faq_id)).toEqual(['abacate', 'zebra'])
  })
})

describe('rankFaqSuggestions — recuo global', () => {
  const global = [
    { faq_id: 'comum', products: 483 },
    { faq_id: 'media', products: 300 },
    { faq_id: 'rara', products: 9 },
  ]

  it('usa a frequência global quando o produto não tem categoria', () => {
    const saida = rankFaqSuggestions({ categoryIds: [], usage: [], global })

    expect(saida.map(s => s.faq_id)).toEqual(['comum', 'media', 'rara'])
    expect(saida[0].source).toBe('global')
    expect(saida[0].score).toBe(483)
  })

  it('usa a frequência global quando toda categoria do produto é pequena demais', () => {
    const saida = rankFaqSuggestions({
      categoryIds: ['minuscula'],
      usage: [uso('minuscula', 'ruido', 2, 2)],
      global,
    })
    expect(saida.every(s => s.source === 'global')).toBe(true)
  })

  it('o recuo também respeita o que o produto já tem', () => {
    const saida = rankFaqSuggestions({ categoryIds: [], usage: [], global, linkedFaqIds: ['comum'] })
    expect(saida.map(s => s.faq_id)).toEqual(['media', 'rara'])
  })

  // Tudo-ou-nada: completar as vagas com globais mudaria a medição de 84% sem ninguém notar.
  it('NÃO completa as vagas com globais quando alguma categoria qualificou', () => {
    const saida = rankFaqSuggestions({
      categoryIds: ['a'],
      usage: [uso('a', 'unica', 4, 10)],
      global,
    })

    expect(saida).toHaveLength(1)
    expect(saida[0].faq_id).toBe('unica')
  })
})

describe('rankFaqSuggestions — bordas', () => {
  it('sem uso e sem global devolve []', () => {
    expect(rankFaqSuggestions({ categoryIds: ['a'], usage: [] })).toEqual([])
  })

  it('descarta linha com uso zero', () => {
    expect(rankFaqSuggestions({ categoryIds: ['a'], usage: [uso('a', 'p', 0, 10)] })).toEqual([])
  })

  it('não muta as entradas', () => {
    const usage = [uso('a', 'b', 1, 10), uso('a', 'a', 2, 10)]
    rankFaqSuggestions({ categoryIds: ['a'], usage })
    expect(usage.map(u => u.faq_id)).toEqual(['b', 'a'])
  })
})
