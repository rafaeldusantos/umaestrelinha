// "Este grupo não aparece nesta categoria" — feature 66 (`FLT-35`..`FLT-38`).
//
// Curadoria é PRESENÇA de linha (`category_hidden_filter_groups`): sem linha, o grupo aparece. É o
// que faz um grupo novo nascer visível em toda categoria sem ninguém gravar nada (`FLT-37`), e o
// que torna uma flag `shown` um segundo dono do mesmo dado.
//
// Desligar = inserir a linha; religar = apagar. Cada toque grava na hora, como o interruptor de ativo
// das perguntas — não há "salvar" para um interruptor sozinho.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'

export const useCategoryHiddenGroups = (categoryId: string | null | undefined) => {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pedido = useRef(0)

  const fetchHidden = useCallback(async () => {
    const meu = ++pedido.current
    if (!categoryId) {
      setHidden(new Set())
      setLoading(false)
      return
    }
    setError(null)
    const { data, error: erro } = await supabase
      .from('category_hidden_filter_groups')
      .select('group_id')
      .eq('category_id', categoryId)
    if (meu !== pedido.current) return
    if (erro) {
      setError(erro.message ?? 'Não foi possível ler os filtros desta categoria.')
      setLoading(false)
      return
    }
    setHidden(new Set(((data ?? []) as { group_id: string }[]).map(l => l.group_id)))
    setLoading(false)
  }, [categoryId])

  useEffect(() => {
    setLoading(true)
    fetchHidden()
  }, [fetchHidden])

  /** `visible = false` grava a linha; `true` a apaga. Devolve a frase do erro, ou `null`. */
  const setGroupVisible = async (groupId: string, visible: boolean): Promise<string | null> => {
    if (!categoryId) return null
    const { error: erro } = visible
      ? await supabase
          .from('category_hidden_filter_groups')
          .delete()
          .eq('category_id', categoryId)
          .eq('group_id', groupId)
      : await supabase
          .from('category_hidden_filter_groups')
          .upsert(
            { category_id: categoryId, group_id: groupId },
            { onConflict: 'category_id,group_id', ignoreDuplicates: true },
          )
    if (erro) {
      const frase = erro.message ?? 'Não foi possível salvar.'
      setError(frase)
      return frase
    }
    await fetchHidden()
    return null
  }

  return { hidden, loading, error, setGroupVisible }
}
