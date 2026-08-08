// "Quantos produtos esta regra vai pegar, e sobre que preço?" (feature 17 / T16).
//
// Duas respostas de uma leitura, porque a tela precisa das duas:
//
//   * **contagem** — `142 produtos elegíveis · inclui subcategorias` do board. Sem ela, escolher
//     "Bottons" e não ver número nenhum deixa a pessoa sem saber se o escopo pegou algo. E o roll-up
//     por descendência não é detalhe: no banco real os universos são FILHAS de `Bottons`, então uma
//     contagem sem descendentes daria zero justamente no caso de uso principal (A9).
//   * **preço de referência** — a prévia "Cliente paga" precisa de um preço CHEIO para ter o que
//     descontar. `tierUnitPrice` é `min(cheio, faixa)`: sem o cheio, A10 não é aplicável e `% off`
//     não tem sobre o quê incidir.
//
// Por que a view `promotion_eligible_products` **não** serve aqui: ela é chaveada por `promotion_id`,
// e uma promoção que está sendo criada ainda não tem id. A mesma regra é reconstruída a partir das
// categorias escolhidas — `descendantIds` (a função que a loja e o menu já usam) mais
// `product_categories`.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import { descendantIds, type MenuCategory } from '@nanapin/core/menu'

export interface EligiblePreview {
  /** Produtos distintos alcançados pelo escopo. */
  count: number
  /**
   * A **mediana** do `base_price` dos alcançados, ou `null` quando não há nenhum.
   *
   * Mediana e não média: um porta-pins de R$ 79 no meio de bottons de R$ 8,90 puxaria a média para
   * um preço que nenhum produto tem, e a prévia mentiria sobre o desconto que a cliente vê.
   */
  referencePrice: number | null
  isLoading: boolean
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100
}

async function fetchPrices(
  scope: 'all' | 'categories',
  categoryIds: string[],
  categories: readonly MenuCategory[],
): Promise<number[]> {
  if (scope === 'all') {
    const { data, error } = await supabase.from('products').select('base_price').eq('is_active', true)
    if (error) return []
    return ((data || []) as { base_price: number | null }[])
      .map(row => Number(row.base_price))
      .filter(price => price > 0)
  }

  if (categoryIds.length === 0) return []

  // Categoria escolhida + toda a descendência dela (A9) — o mesmo roll-up que a view faz em SQL.
  const scoped = new Set<string>()
  for (const id of categoryIds) for (const descendant of descendantIds(categories, id)) scoped.add(descendant)

  const { data: links, error: linksError } = await supabase
    .from('product_categories')
    .select('product_id')
    .in('category_id', [...scoped])
  if (linksError) return []

  const productIds = [...new Set(((links || []) as { product_id: string }[]).map(row => row.product_id))]
  if (productIds.length === 0) return []

  const { data, error } = await supabase
    .from('products')
    .select('base_price')
    .in('id', productIds)
    .eq('is_active', true)
  if (error) return []

  return ((data || []) as { base_price: number | null }[])
    .map(row => Number(row.base_price))
    .filter(price => price > 0)
}

export function useEligiblePreview(
  scope: 'all' | 'categories',
  categoryIds: string[],
  categories: readonly MenuCategory[],
): EligiblePreview {
  // A chave leva as categorias ORDENADAS: `['a','b']` e `['b','a']` são o mesmo escopo, e sem
  // ordenar cada reordenação dos chips refaria a leitura e piscaria a contagem.
  const key = [...categoryIds].sort().join(',')

  const query = useQuery({
    queryKey: ['promotion_eligible_preview', scope, key],
    queryFn: () => fetchPrices(scope, categoryIds, categories),
    enabled: scope === 'all' || categoryIds.length > 0,
  })

  const prices = query.data ?? []
  return {
    count: prices.length,
    referencePrice: median(prices),
    isLoading: query.isLoading && (scope === 'all' || categoryIds.length > 0),
  }
}
