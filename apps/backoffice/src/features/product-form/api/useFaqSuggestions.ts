import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import {
  rankFaqSuggestions,
  type FaqCategoryUsage,
  type FaqSuggestion,
  type FaqUsage,
} from '@estrelinha/core/faq'

/**
 * As perguntas a oferecer para este produto — `FAQ-29`, `FAQ-31`, `FAQ-32`.
 *
 * O hook só faz **I/O**: lê as duas views e entrega as linhas a `rankFaqSuggestions`, que é função
 * pura em `@estrelinha/core/faq` e onde mora a decisão. Foi assim que a régua ficou medível — o
 * guarda `faqSuggestion.test.ts` roda o ranking contra a distribuição real do catálogo e cobra 80%
 * de acerto, o que seria impossível se a fórmula vivesse dentro de um `useEffect`.
 *
 * A leitura de `faq_category_usage` é **filtrada pelas categorias do produto** (≤ ~6 no catálogo
 * real), e não pela tabela inteira.
 */
export const useFaqSuggestions = (
  categoryIds: readonly string[],
  linkedFaqIds: readonly string[],
): { suggestions: FaqSuggestion[]; loading: boolean } => {
  const [usage, setUsage] = useState<FaqCategoryUsage[]>([])
  const [global, setGlobal] = useState<FaqUsage[]>([])
  const [loading, setLoading] = useState(true)

  // A lista de ids muda de identidade a cada render do formulário; a chave estável evita releitura
  // a cada tecla digitada em qualquer campo do produto.
  const chave = [...categoryIds].sort().join(',')

  useEffect(() => {
    let vivo = true
    const ler = async () => {
      setLoading(true)

      const ids = chave === '' ? [] : chave.split(',')
      const [porCategoria, geral] = await Promise.all([
        ids.length > 0
          ? supabase
              .from('faq_category_usage')
              .select('category_id, faq_id, uses, sample')
              .in('category_id', ids)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('faq_usage').select('faq_id, products'),
      ])

      if (!vivo) return
      setUsage((porCategoria.data ?? []) as FaqCategoryUsage[])
      setGlobal((geral.data ?? []) as FaqUsage[])
      setLoading(false)
    }

    void ler()
    return () => {
      vivo = false
    }
  }, [chave])

  const suggestions = useMemo(
    () =>
      rankFaqSuggestions({
        categoryIds: chave === '' ? [] : chave.split(','),
        usage,
        global,
        linkedFaqIds,
        productHasFaq: linkedFaqIds.length > 0,
      }),
    [chave, usage, global, linkedFaqIds],
  )

  return { suggestions, loading }
}
