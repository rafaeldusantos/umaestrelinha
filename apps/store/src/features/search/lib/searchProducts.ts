// O casamento da busca da loja — domínio puro, sem React e sem rede.
//
// O filtro anterior era `name.includes(q) || description.includes(q)` repetido em dois lugares
// (dropdown e página), e no celular ele erra o alvo três vezes:
//
// 1. **Acento.** Quem digita no teclado do celular escreve "pokemon", não "Pokémon" — e a loja
//    respondia "nada encontrado" com o produto em estoque.
// 2. **Dois termos.** "naruto chibi" não é substring de "Pin Naruto Chibi Kawaii" se a ordem das
//    palavras no nome não for exatamente a digitada. Cada termo passa a valer por si.
// 3. **Ordem.** `includes` não tem ranking: um produto que só cita o termo na descrição aparecia
//    antes do que tem o termo no nome. Numa lista de 5 linhas na tela do celular, isso é a
//    diferença entre achar e desistir.
//
// Tag e categoria também entram na varredura: "kawaii" e "K-Pop" são como a cliente pensa no
// catálogo, e nenhum dos dois está necessariamente no nome do produto.

import type { Category, Product } from '@nanapin/supabase/types'

/** Abaixo disso não se busca: uma letra casa com quase tudo e a lista vira ruído. */
export const MIN_QUERY_LENGTH = 2

export interface SearchHit {
  product: Product
  score: number
}

interface Options {
  /** Habilita o casamento por nome de categoria. Sem elas, a busca ignora esse campo. */
  categories?: readonly Category[]
  limit?: number
}

/** Minúsculas, sem acento, sem espaço sobrando — o formato em que tudo é comparado. */
export const normalizeTerm = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const terms = (query: string): string[] =>
  normalizeTerm(query)
    .split(/\s+/)
    .filter(Boolean)

// Peso por onde o termo casou. A escala é grosseira de propósito: o que importa é que nome ganhe de
// tag, tag ganhe de categoria e descrição seja o último recurso — não a distância exata entre eles.
const SCORE = {
  namePrefix: 100,
  nameWord: 60,
  name: 40,
  tagExact: 30,
  tag: 20,
  category: 15,
  description: 5,
} as const

const scoreTerm = (term: string, haystacks: {
  name: string
  description: string
  tags: string[]
  categories: string[]
}): number => {
  const { name, description, tags, categories } = haystacks

  if (name.startsWith(term)) return SCORE.namePrefix
  // Início de palavra: "sennin" em "pin naruto sennin" vale mais que casar no meio de uma palavra.
  if (name.split(/[^a-z0-9]+/).some((word) => word.startsWith(term))) return SCORE.nameWord
  if (name.includes(term)) return SCORE.name

  if (tags.some((tag) => tag === term)) return SCORE.tagExact
  if (tags.some((tag) => tag.includes(term))) return SCORE.tag

  if (categories.some((cat) => cat.includes(term))) return SCORE.category

  if (description.includes(term)) return SCORE.description

  return 0
}

/**
 * Os produtos que casam com `query`, do mais relevante para o menos.
 *
 * Todos os termos precisam casar em algum campo (AND) — buscar "naruto chibi" e receber tudo de
 * Naruto seria pior que não receber nada, porque a cliente confia na primeira linha da lista.
 * Empate cai no nome, para a ordem ser estável entre renders (mesma razão de `displayCategory`).
 */
export const searchProducts = (
  products: readonly Product[] | undefined,
  query: string,
  options: Options = {},
): SearchHit[] => {
  const parts = terms(query)
  if (normalizeTerm(query).length < MIN_QUERY_LENGTH || parts.length === 0) return []

  const categoryNameById = new Map(
    (options.categories ?? []).map((c) => [c.id, normalizeTerm(c.name)]),
  )

  const hits: SearchHit[] = []
  for (const product of products ?? []) {
    const haystacks = {
      name: normalizeTerm(product.name),
      description: normalizeTerm(product.description ?? ''),
      tags: (product.tags ?? []).map(normalizeTerm),
      categories: (product.category_links ?? [])
        .map((link) => categoryNameById.get(link.category_id))
        .filter((name): name is string => !!name),
    }

    let total = 0
    let matchedAll = true
    for (const term of parts) {
      const score = scoreTerm(term, haystacks)
      if (score === 0) {
        matchedAll = false
        break
      }
      total += score
    }
    if (matchedAll) hits.push({ product, score: total })
  }

  hits.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'pt-BR'))
  return options.limit ? hits.slice(0, options.limit) : hits
}
