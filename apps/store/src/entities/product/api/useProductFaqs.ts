import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { resolveProductFaqs, type ProductFaqLink, type ResolvedFaq } from '@estrelinha/core/faq'

/**
 * As perguntas frequentes de um produto, já resolvidas — `FAQ-01`, `FAQ-04`, `FAQ-09`.
 *
 * **Consulta própria, e não uma coluna a mais em `PRODUCT_SELECT`.** O `PRODUCT_SELECT` alimenta
 * também a listagem de categoria, que já é a leitura mais pesada da loja (`BL-00X`: 3,1 MB por
 * página). Embutir o FAQ ali faria cada página de categoria baixar ~120 perguntas para desenhar
 * zero delas.
 *
 * O embed traz a entrada junto (`faq:faqs(...)`). Quando ela está **inativa**, a RLS a esconde e o
 * PostgREST devolve `faq: null` com o `faq_id` intacto — é o comportamento que a feature 24 mediu
 * com produto despublicado, e é `resolveProductFaqs` quem decide pular a vaga.
 *
 * Erro de leitura devolve `[]`: a seção some, a página vive. Perguntas frequentes não valem uma tela
 * de erro numa página de produto.
 */
export const useProductFaqs = (productId: string | null | undefined) =>
  useQuery({
    queryKey: ['product-faqs', productId],
    queryFn: async (): Promise<ResolvedFaq[]> => {
      const { data, error } = await supabase
        .from('product_faqs')
        .select('faq_id, position, answer_override, faq:faqs(id, question, answer, is_active)')
        .eq('product_id', productId)
        .order('position', { ascending: true })

      if (error || !data) return []
      return resolveProductFaqs(data as unknown as ProductFaqLink[])
    },
    enabled: !!productId,
  })
