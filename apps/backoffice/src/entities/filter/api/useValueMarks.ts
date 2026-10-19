// As marcações de UM valor — a marcação em massa (feature 66, `FLT-15`..`FLT-20`).
//
// Três operações e nenhuma outra:
//
// - **ler** quais peças têm o valor (contando primeiro e paginando com `readAllPages`: a marcação
//   cresce com a curadoria, e o PostgREST corta em 1.000 linhas sem avisar);
// - **marcar N** numa requisição só — `upsert(..., { ignoreDuplicates: true })`, que é
//   `on conflict do nothing` sobre a chave produto × valor: peça que já estava marcada é no-op, nunca
//   erro (`FLT-16`);
// - **remover de N** numa requisição só — `delete().eq('value_id').in('product_id', ids)` (`FLT-17`).
//
// **Nada é otimista** (`FLT-19`): o conjunto marcado só muda depois que o banco respondeu e a
// releitura voltou. Uma falha deixa a tela exatamente como estava — nenhuma peça aparece marcada sem
// estar.

import { useCallback, useEffect, useRef, useState } from 'react'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { FetchMode } from '@/shared/lib/fetchMode'

const mensagem = (erro: { message?: string } | null | undefined, padrao: string): string =>
  erro?.message && erro.message.trim() !== '' ? erro.message : padrao

export const lerMarcacoesDoValor = async (valueId: string): Promise<string[]> => {
  const { count, error } = await supabase
    .from('product_filter_values')
    .select('product_id', { count: 'exact', head: true })
    .eq('value_id', valueId)
  if (error) throw new Error(mensagem(error, 'Não foi possível contar as marcações.'))
  const total = count ?? 0
  if (total === 0) return []

  const linhas = await readAllPages<{ product_id: string }>({
    total,
    label: 'marcações do valor',
    consequence: 'a lista diria “não marcada” sobre uma peça marcada',
    readPage: async (de, ate) => {
      const { data, error: erroDaPagina } = await supabase
        .from('product_filter_values')
        .select('product_id')
        .eq('value_id', valueId)
        .order('product_id')
        .range(de, ate)
      if (erroDaPagina) throw new Error(mensagem(erroDaPagina, 'Não foi possível ler as marcações.'))
      return (data ?? []) as { product_id: string }[]
    },
  })
  return linhas.map(l => l.product_id)
}

/**
 * Feature 67 — marcar na peça toda pares (peça, valor) de valores diferentes numa requisição só: é o
 * "Aprovar" da fila de sugestões, que aprova de uma vez peças que podem estar em valores distintos.
 */
export const gravarMarcacoesNaPeca = async (
  linhas: readonly { product_id: string; value_id: string }[],
): Promise<string | null> => {
  if (linhas.length === 0) return null
  const { error } = await supabase
    .from('product_filter_values')
    .upsert(
      linhas.map(l => ({ product_id: l.product_id, value_id: l.value_id })),
      { onConflict: 'product_id,value_id', ignoreDuplicates: true },
    )
  return error ? mensagem(error, 'Não foi possível marcar as peças.') : null
}

/** Feature 67 — tirar a marcação da peça toda de UM valor em N peças (a troca de `VFL-27`). */
export const apagarMarcacoesNaPeca = async (valueId: string, productIds: readonly string[]): Promise<string | null> => {
  if (productIds.length === 0) return null
  const { error } = await supabase
    .from('product_filter_values')
    .delete()
    .eq('value_id', valueId)
    .in('product_id', [...productIds])
  return error ? mensagem(error, 'Não foi possível tirar a marcação da peça toda.') : null
}

export const useValueMarks = (valueId: string | undefined) => {
  const [marked, setMarked] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pedido = useRef(0)

  const fetchMarks = useCallback(
    async (modo: FetchMode = 'inicial') => {
      const meu = ++pedido.current
      if (!valueId) {
        setLoading(false)
        return
      }
      if (modo === 'inicial') setLoading(true)
      setError(null)
      try {
        const ids = await lerMarcacoesDoValor(valueId)
        if (meu !== pedido.current) return
        setMarked(new Set(ids))
      } catch (e) {
        if (meu !== pedido.current) return
        if (modo === 'inicial') setMarked(new Set())
        setError(e instanceof Error ? e.message : 'Não foi possível ler as marcações.')
      }
      setLoading(false)
    },
    [valueId],
  )

  useEffect(() => {
    fetchMarks('inicial')
  }, [fetchMarks])

  /** Marca as peças numa chamada só. Devolve a frase do erro, ou `null`. */
  const mark = async (productIds: readonly string[]): Promise<string | null> => {
    if (!valueId || productIds.length === 0) return null
    const { error: erro } = await supabase
      .from('product_filter_values')
      .upsert(
        productIds.map(product_id => ({ product_id, value_id: valueId })),
        { onConflict: 'product_id,value_id', ignoreDuplicates: true },
      )
    if (erro) return mensagem(erro, 'Não foi possível marcar as peças.')
    await fetchMarks('revalidar')
    return null
  }

  /** Remove a marcação das peças numa chamada só. */
  const unmark = async (productIds: readonly string[]): Promise<string | null> => {
    if (!valueId || productIds.length === 0) return null
    const { error: erro } = await supabase
      .from('product_filter_values')
      .delete()
      .eq('value_id', valueId)
      .in('product_id', [...productIds])
    if (erro) return mensagem(erro, 'Não foi possível remover as marcações.')
    await fetchMarks('revalidar')
    return null
  }

  return { marked, loading, error, fetchMarks, mark, unmark }
}
