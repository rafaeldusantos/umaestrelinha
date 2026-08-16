// Feature 28 — a sugestão de perguntas, **determinística**.
//
// Não há IA aqui, e a ausência é decisão registrada (`AD-011`, e a escolha do usuário em 2026-08-16:
// "determinístico agora, IA depois" — `BL-014`). O que existe é uma medição: as perguntas do
// catálogo se concentram por categoria de forma forte o bastante para o ranking acertar 84% no top-5.
//
// | categoria             | pergunta                                          | presente em |
// | --------------------- | ------------------------------------------------- | ----------: |
// | Anéis                 | `O anel é ajustável?`                             | 66% (0% fora) |
// | Coleção Código Morse  | `O que está escrito em código Morse nesse colar?` |        100% |
// | Nomes                 | `Posso escolher o nome que será gravado na peça?` |        100% |

import type { FaqCategoryUsage, FaqUsage } from './types'

/**
 * Cinco, e o número é medido — é o joelho da curva.
 *
 * | top-N | precisão | cobertura |
 * | ----: | -------: | --------: |
 * |     3 |    91,3% |     55,3% |
 * |     4 |    91,4% |     73,9% |
 * | **5** | **84,0%**| **83,5%** |
 * |     6 |    75,9% |     89,4% |
 * |     8 |    60,7% |     95,1% |
 */
export const FAQ_SUGGESTION_LIMIT = 5

/**
 * Abaixo de 3 produtos com FAQ, a categoria é ignorada.
 *
 * Com 1 ou 2 vizinhos a proporção é 100% por acidente — e uma sugestão errada com aparência de
 * certeza é pior que sugestão nenhuma, porque a dona a aceita sem conferir.
 */
export const FAQ_MIN_CATEGORY_SAMPLE = 3

export interface FaqSuggestionInput {
  /** As categorias do produto que está sendo editado. */
  categoryIds: readonly string[]
  /** Linhas de `faq_category_usage` — já podem vir filtradas pelas categorias do produto. */
  usage: readonly FaqCategoryUsage[]
  /** Linhas de `faq_usage`, para o caso de nenhuma categoria qualificar. */
  global?: readonly FaqUsage[]
  /** O que o produto já tem: sai da lista, porque sugerir o que já está lá é ruído. */
  linkedFaqIds?: readonly string[]
  /** O produto já conta na estatística das categorias dele? Desconta do denominador. */
  productHasFaq?: boolean
  limit?: number
}

export interface FaqSuggestion {
  faq_id: string
  /**
   * Proporção (0..1) quando `source` é `'category'`; **contagem de produtos** quando é `'global'`.
   * As duas escalas não se comparam entre si — e não precisam, porque uma resposta nunca mistura as
   * duas origens.
   */
  score: number
  source: 'category' | 'global'
}

const ordenar = (a: FaqSuggestion, b: FaqSuggestion): number =>
  b.score - a.score || a.faq_id.localeCompare(b.faq_id)

/**
 * As perguntas a oferecer, em ordem.
 *
 * **A fórmula é PROPORÇÃO dentro da categoria, nunca contagem bruta.** Medido no catálogo real:
 * proporção acerta **84,0%** com **83,5%** de cobertura e 3 produtos sem acerto; contagem bruta
 * acerta **61,1%** com 56,1% e 52 produtos sem acerto. A diferença tem uma causa só — `Joias e
 * acessórios` tem 634 produtos, e na contagem bruta ela decide o ranking de todo mundo.
 *
 * O score de uma pergunta é a **maior** proporção entre as categorias do produto: é o que faz
 * `O anel é ajustável?` ganhar de uma pergunta genérica num produto que está em `Anéis` **e** em
 * `Joias e acessórios`. Tomar a média diluiria o sinal da categoria específica na categoria
 * guarda-chuva, que é exatamente o que se quer evitar.
 *
 * **O recuo para a frequência global é tudo-ou-nada**, e não um complemento: quando alguma categoria
 * qualifica, a resposta é só dela. Completar as vagas que faltam com perguntas globais mudaria a
 * medição de 84% sem que ninguém percebesse — e a vaga vazia é informação ("esta categoria ainda não
 * tem repertório"), não defeito.
 */
export const rankFaqSuggestions = (input: FaqSuggestionInput): FaqSuggestion[] => {
  const {
    categoryIds = [],
    usage = [],
    global = [],
    linkedFaqIds = [],
    productHasFaq = false,
    limit = FAQ_SUGGESTION_LIMIT,
  } = input ?? ({} as FaqSuggestionInput)

  if (limit <= 0) return []

  const jaTem = new Set(linkedFaqIds)
  const doProduto = new Set(categoryIds)
  const desconto = productHasFaq ? 1 : 0

  const melhor = new Map<string, number>()

  for (const linha of usage) {
    if (!doProduto.has(linha.category_id)) continue
    if (jaTem.has(linha.faq_id)) continue
    if (!(linha.sample >= FAQ_MIN_CATEGORY_SAMPLE)) continue

    const denominador = linha.sample - desconto
    if (denominador <= 0) continue

    const score = linha.uses / denominador
    if (!(score > 0)) continue

    const atual = melhor.get(linha.faq_id)
    if (atual === undefined || score > atual) melhor.set(linha.faq_id, score)
  }

  if (melhor.size > 0) {
    return [...melhor.entries()]
      .map(([faq_id, score]): FaqSuggestion => ({ faq_id, score, source: 'category' }))
      .sort(ordenar)
      .slice(0, limit)
  }

  return global
    .filter(linha => !jaTem.has(linha.faq_id) && linha.products > 0)
    .map((linha): FaqSuggestion => ({ faq_id: linha.faq_id, score: linha.products, source: 'global' }))
    .sort(ordenar)
    .slice(0, limit)
}
