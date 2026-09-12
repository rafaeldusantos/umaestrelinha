import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { faqOverrideOf, faqPageCategoryRefusal, type FaqPageCategoryKey } from '@estrelinha/core/faq'

/**
 * A curadoria da página de perguntas da loja — feature 46.
 *
 * **Colunas nomeadas, nunca `*`**, pelo mesmo motivo de `FAQ_SELECT`: coluna nova aparece aqui de
 * propósito, e não de carona.
 */
export const FAQ_PAGE_SELECT =
  'faq_id, category, position, answer_override, faq:faqs(id, question, answer, is_active)'

export interface AdminFaqPageItem {
  faq_id: string
  category: FaqPageCategoryKey
  position: number
  answer_override: string | null
  question: string
  /** A resposta **padrão** da biblioteca — o que a página mostra quando não há texto próprio. */
  answer: string
  /** `false` quando a entrada saiu do ar na biblioteca: some da loja, e a linha avisa. */
  is_active: boolean
  /** Em quantos produtos a mesma pergunta está. Vem da view `faq_usage`. */
  usage: number
}

interface LinhaCrua {
  faq_id: string
  category: FaqPageCategoryKey
  position: number
  answer_override: string | null
  faq: { id: string; question: string; answer: string; is_active: boolean } | null
}

/**
 * Traduz o código do Postgres para o que a dona precisa **fazer**.
 *
 * Mesma régua do `useAdminFaqs`: "erro ao salvar" não é acionável, e cada um destes tem um remédio
 * diferente.
 */
const motivoDoErro = (codigo: string | undefined, mensagem: string): string => {
  if (codigo === '23505') {
    return 'Esta pergunta já está na página. Procure por ela na lista em vez de acrescentar outra.'
  }
  if (codigo === '23503') {
    return 'A pergunta saiu da biblioteca enquanto esta tela estava aberta. Recarregue e tente de novo.'
  }
  if (codigo === '23514') {
    return 'A resposta passou do limite de 4000 caracteres, ou o assunto não é um dos seis da página.'
  }
  return mensagem
}

export const useAdminFaqPage = () => {
  const [items, setItems] = useState<AdminFaqPageItem[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * Falha de leitura, para a tela dizer "quebrou" em vez de "está vazia".
   *
   * Vazio e ilegível não são o mesmo estado: a tela de Coleções mostrou grade vazia por meses sobre
   * uma tabela que nunca existiu (`AD-014`).
   */
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [linhas, usos] = await Promise.all([
      supabase.from('faq_page_items').select(FAQ_PAGE_SELECT).order('position', { ascending: true }),
      supabase.from('faq_usage').select('faq_id, products'),
    ])

    if (linhas.error) {
      setError(linhas.error.message)
      setLoading(false)
      return
    }

    const porFaq = new Map((usos.data ?? []).map((u: { faq_id: string; products: number }) => [u.faq_id, u.products]))

    setItems(
      ((linhas.data ?? []) as unknown as LinhaCrua[]).map(l => ({
        faq_id: l.faq_id,
        category: l.category,
        position: l.position,
        answer_override: l.answer_override,
        question: l.faq?.question ?? '',
        answer: l.faq?.answer ?? '',
        // O embed vem `null` quando a entrada está inativa — a RLS a esconde. A tela precisa
        // distinguir isso de "não existe", e é por isso que a colocação é lida sem condição.
        is_active: l.faq?.is_active ?? false,
        usage: porFaq.get(l.faq_id) ?? 0,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  /** Põe entradas da biblioteca na página, no fim do assunto escolhido. */
  const adicionar = useCallback(
    async (faqIds: readonly string[], category: string): Promise<string | null> => {
      const recusa = faqPageCategoryRefusal(category)
      if (recusa) return recusa
      if (faqIds.length === 0) return 'Escolha ao menos uma pergunta.'

      const ultima = items
        .filter(i => i.category === category)
        .reduce((maior, i) => Math.max(maior, i.position), -1)

      const { error: err } = await supabase.from('faq_page_items').insert(
        faqIds.map((faq_id, i) => ({ faq_id, category, position: ultima + 1 + i })),
      )
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [items, fetch],
  )

  /**
   * Tira da PÁGINA — e a entrada continua na biblioteca, e nos produtos que a usam.
   *
   * É a diferença que a tela precisa dizer antes de executar: apagar a entrada é outra coisa, mora
   * na Biblioteca de perguntas, e o banco a recusa enquanto houver uso (`on delete restrict`).
   */
  const remover = useCallback(
    async (faqId: string): Promise<string | null> => {
      const { error: err } = await supabase.from('faq_page_items').delete().eq('faq_id', faqId)
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [fetch],
  )

  /**
   * Grava a ordem de um assunto inteiro.
   *
   * **Última gravação vence**, como o arraste do `/admin/menu`. Trava otimista aqui seria a única do
   * painel, e o conflito real — duas admins reordenando o mesmo assunto no mesmo minuto — não
   * acontece numa operação de uma pessoa.
   */
  const reordenar = useCallback(
    async (category: string, faqIdsNaOrdem: readonly string[]): Promise<string | null> => {
      for (let i = 0; i < faqIdsNaOrdem.length; i += 1) {
        const { error: err } = await supabase
          .from('faq_page_items')
          .update({ position: i })
          .eq('faq_id', faqIdsNaOrdem[i])
        if (err) return motivoDoErro(err.code, err.message)
      }

      await fetch()
      return null
    },
    [fetch],
  )

  /** Move a pergunta para outro assunto, no fim dele. */
  const moverDeAssunto = useCallback(
    async (faqId: string, category: string): Promise<string | null> => {
      const recusa = faqPageCategoryRefusal(category)
      if (recusa) return recusa

      const ultima = items
        .filter(i => i.category === category && i.faq_id !== faqId)
        .reduce((maior, i) => Math.max(maior, i.position), -1)

      const { error: err } = await supabase
        .from('faq_page_items')
        .update({ category, position: ultima + 1 })
        .eq('faq_id', faqId)
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [items, fetch],
  )

  /**
   * O texto que a página mostra no lugar da resposta da biblioteca.
   *
   * ⚠️ **Passa por `faqOverrideOf`, que grava `null` quando o texto é idêntico ao padrão.** Guardar
   * a cópia daria dois donos do mesmo texto: editar a biblioteca deixaria de alcançar esta página, e
   * nada na tela diria por quê. É o mesmo mecanismo de `product_faqs.answer_override`.
   */
  const salvarTextoProprio = useCallback(
    async (faqId: string, texto: string): Promise<string | null> => {
      const padrao = items.find(i => i.faq_id === faqId)?.answer
      const proprio = faqOverrideOf(texto, padrao)

      const { error: err } = await supabase
        .from('faq_page_items')
        .update({ answer_override: proprio })
        .eq('faq_id', faqId)
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [items, fetch],
  )

  return {
    items,
    loading,
    error,
    refetch: fetch,
    adicionar,
    remover,
    reordenar,
    moverDeAssunto,
    salvarTextoProprio,
  }
}
