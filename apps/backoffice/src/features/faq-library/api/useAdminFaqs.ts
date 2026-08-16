import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { faqQuestionKey, faqRefusal } from '@estrelinha/core/faq'

/**
 * A biblioteca de perguntas frequentes — leitura e escrita (`FAQ-14`, `FAQ-15`, `FAQ-18`).
 *
 * As colunas são **nomeadas**, nunca `*`: é o que faz uma coluna nova aparecer aqui de propósito, e
 * não de carona (mesmo molde de `CATEGORY_SELECT`).
 */
export const FAQ_SELECT = 'id, question, answer, question_key, is_active, created_at, updated_at'

export interface AdminFaq {
  id: string
  question: string
  answer: string
  question_key: string
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  /** Em quantos produtos a entrada está. Vem da view `faq_usage`. */
  usage: number
}

interface UsageRow {
  faq_id: string
  products: number
}

/**
 * Traduz o código do Postgres para o que a dona precisa **fazer**.
 *
 * "Erro ao salvar" não é acionável. Cada um destes tem um remédio diferente, e é o remédio que a
 * mensagem precisa entregar.
 */
const motivoDoErro = (codigo: string | undefined, mensagem: string, usoAtual?: number): string => {
  if (codigo === '23505') {
    return 'Esta pergunta já existe na biblioteca — procure por ela na lista em vez de criar outra.'
  }
  if (codigo === '23503') {
    const onde = typeof usoAtual === 'number' ? ` Ela está em ${usoAtual} produto(s).` : ''
    return `Esta pergunta está em uso e não pode ser apagada.${onde} Desative-a: ela sai de todas as páginas de uma vez e volta com um clique.`
  }
  if (codigo === '23514') {
    return 'A pergunta ou a resposta passou do limite de caracteres.'
  }
  return mensagem
}

export const useAdminFaqs = () => {
  const [faqs, setFaqs] = useState<AdminFaq[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * Falha de leitura, para a tela poder dizer "quebrou" em vez de "está vazio".
   *
   * A tela de Coleções engolia o erro exatamente aqui e mostrou grade vazia por meses sobre uma
   * tabela que nunca existiu (`AD-014`). Biblioteca vazia e biblioteca ilegível não são o mesmo
   * estado, e a tela precisa distinguir os dois.
   */
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Duas consultas pequenas em paralelo. A contagem sai da view `faq_usage`, e não de uma coluna
    // em `faqs`: materializá-la daria um segundo dono do número, que desatualizaria em toda escrita
    // fora do painel — a começar pelo importador, que grava 3.475 vínculos de uma vez.
    const [entradas, usos] = await Promise.all([
      supabase.from('faqs').select(FAQ_SELECT).order('question', { ascending: true }),
      supabase.from('faq_usage').select('faq_id, products'),
    ])

    if (entradas.error) {
      setError(entradas.error.message)
      setLoading(false)
      return
    }

    const porFaq = new Map((usos.data ?? []).map((u: UsageRow) => [u.faq_id, u.products]))
    setFaqs(
      ((entradas.data ?? []) as Omit<AdminFaq, 'usage'>[]).map(f => ({
        ...f,
        usage: porFaq.get(f.id) ?? 0,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  /** Cria uma entrada. Devolve o motivo da recusa, ou `null`. */
  const create = useCallback(
    async (question: string, answer: string): Promise<string | null> => {
      const recusa = faqRefusal(question, answer)
      if (recusa) return recusa

      const { error: err } = await supabase.from('faqs').insert({
        question: question.trim(),
        answer: answer.trim(),
        question_key: faqQuestionKey(question),
      })
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [fetch],
  )

  const update = useCallback(
    async (id: string, question: string, answer: string): Promise<string | null> => {
      const recusa = faqRefusal(question, answer)
      if (recusa) return recusa

      const { error: err } = await supabase
        .from('faqs')
        .update({
          question: question.trim(),
          answer: answer.trim(),
          question_key: faqQuestionKey(question),
        })
        .eq('id', id)
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [fetch],
  )

  /**
   * Liga e desliga.
   *
   * Manda **`{ is_active }` e nada mais** — a mesma regra do pausar cupom. Acrescentar campos
   * reescreveria a entrada com o que a listagem tem em cache, que pode estar velho.
   */
  const toggle = useCallback(
    async (id: string, is_active: boolean): Promise<string | null> => {
      const { error: err } = await supabase.from('faqs').update({ is_active }).eq('id', id)
      if (err) return motivoDoErro(err.code, err.message)

      await fetch()
      return null
    },
    [fetch],
  )

  /**
   * Apaga — e o banco recusa se estiver em uso (`on delete restrict`).
   *
   * A tela confere o uso **antes** para explicar com número, mas não é ela quem impede: a garantia é
   * do banco, porque a contagem em mão pode estar velha e porque a escrita pode não vir daqui.
   */
  const remove = useCallback(
    async (id: string): Promise<string | null> => {
      const usoAtual = faqs.find(f => f.id === id)?.usage
      if (typeof usoAtual === 'number' && usoAtual > 0) {
        return motivoDoErro('23503', '', usoAtual)
      }

      const { error: err } = await supabase.from('faqs').delete().eq('id', id)
      if (err) return motivoDoErro(err.code, err.message, usoAtual)

      await fetch()
      return null
    },
    [faqs, fetch],
  )

  return { faqs, loading, error, refetch: fetch, create, update, toggle, remove }
}
