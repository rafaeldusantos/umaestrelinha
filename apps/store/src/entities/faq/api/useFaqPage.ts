import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { resolveFaqPage, type FaqPageGroup, type FaqPageLink } from '@estrelinha/core/faq'

/**
 * As perguntas da página da loja, já resolvidas e agrupadas — `FAQL-02`, `FAQL-09`.
 *
 * O embed traz a entrada junto (`faq:faqs(...)`). Quando ela está **inativa**, a RLS a esconde e o
 * PostgREST devolve `faq: null` com o `faq_id` intacto — e é `resolveFaqPage` quem decide pular a
 * vaga. A colocação é lida sem condição de propósito, justamente para esse ramo rodar em produção.
 *
 * ⚠️ **O erro SOBE, e aqui está a divergência deliberada de `useProductFaqs`.** Lá o hook devolve
 * `[]` quando a leitura falha, porque o FAQ é um pedaço da página do produto: a seção some e a
 * página vive. Aqui a leitura **é** a página. Engolir o erro produziria "ainda não há perguntas
 * publicadas" com o banco fora do ar — um estado vazio indistinguível de um ilegível, que é
 * exatamente o defeito que `AD-014` e o `BUG-20260809` já registraram duas vezes neste projeto.
 *
 * Quem separa os três estados é a página, por `isLoading` / `error` / lista vazia.
 */
export const useFaqPage = () =>
  useQuery({
    queryKey: ['faq-page'],
    queryFn: async (): Promise<FaqPageGroup[]> => {
      const { data, error } = await supabase
        .from('faq_page_items')
        .select('faq_id, category, position, answer_override, faq:faqs(id, question, answer, is_active)')
        .order('position', { ascending: true })

      if (error) throw error
      return resolveFaqPage((data ?? []) as unknown as FaqPageLink[])
    },
  })
