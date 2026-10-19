// As marcações por OPÇÃO da peça — feature 67 (`VFL-03`, `VFL-20`, `VFL-27`, `VFL-34`).
//
// A identidade é (peça, eixo, texto, valor), exatos como em `products.options`: não há id de opção
// no schema, e é o texto que `option_values` da variação usa para casar a linha. A chave da tabela é
// essa quádrupla, e é ela o `onConflict` — marcar o que já está marcado é no-op, nunca erro.
//
// Três escritas, e cada uma é UMA requisição:
//
// - **marcar N** (`gravarMarcacoesPorOpcao`): `upsert(..., { ignoreDuplicates: true })`;
// - **remover o valor de N peças, em todas as opções** (`apagarMarcacoesPorOpcaoDoValor`): é o
//   "Remover de N" da marcação em massa, que apaga as DUAS formas de marcação (`VFL-34`);
// - a leitura das marcações de UM valor (`useOptionMarks`), no molde de `useValueMarks`: conta,
//   pagina com `readAllPages`, `fetchMarks(modo)` com token de sequência.
//
// A gravação pelo formulário do produto NÃO passa por aqui: ela é um passo de `persistProduct`, que
// recebe o client injetado e grava pelo diff (molde de `product_filter_values`).
//
// **Nada é otimista**: o que a tela mostra como marcado só muda depois de o banco responder.

import { useCallback, useEffect, useRef, useState } from 'react'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { FetchMode } from '@/shared/lib/fetchMode'

export interface MarcacaoPorOpcaoDaPeca {
  product_id: string
  option_name: string
  option_value: string
  value_id: string
}

/** A chave de `product_option_filter_values`, na ordem do `primary key`. */
export const OPTION_MARK_CONFLICT = 'product_id,option_name,option_value,value_id'

const mensagem = (erro: { message?: string } | null | undefined, padrao: string): string =>
  erro?.message && erro.message.trim() !== '' ? erro.message : padrao

/** Grava as marcações por opção numa requisição só. Devolve a frase do erro, ou `null`. */
export const gravarMarcacoesPorOpcao = async (linhas: readonly MarcacaoPorOpcaoDaPeca[]): Promise<string | null> => {
  if (linhas.length === 0) return null
  const { error } = await supabase.from('product_option_filter_values').upsert(
    linhas.map(l => ({
      product_id: l.product_id,
      option_name: l.option_name,
      option_value: l.option_value,
      value_id: l.value_id,
    })),
    { onConflict: OPTION_MARK_CONFLICT, ignoreDuplicates: true },
  )
  return error ? mensagem(error, 'Não foi possível marcar as opções.') : null
}

/** Tira o valor de TODAS as opções das peças, numa requisição só (`VFL-34`). */
export const apagarMarcacoesPorOpcaoDoValor = async (
  valueId: string,
  productIds: readonly string[],
): Promise<string | null> => {
  if (productIds.length === 0) return null
  const { error } = await supabase
    .from('product_option_filter_values')
    .delete()
    .eq('value_id', valueId)
    .in('product_id', [...productIds])
  return error ? mensagem(error, 'Não foi possível remover as marcações por opção.') : null
}

export const lerMarcacoesPorOpcaoDoValor = async (valueId: string): Promise<MarcacaoPorOpcaoDaPeca[]> => {
  const { count, error } = await supabase
    .from('product_option_filter_values')
    .select('product_id', { count: 'exact', head: true })
    .eq('value_id', valueId)
  if (error) throw new Error(mensagem(error, 'Não foi possível contar as marcações por opção.'))
  const total = count ?? 0
  if (total === 0) return []

  return readAllPages<MarcacaoPorOpcaoDaPeca>({
    total,
    label: 'marcações por opção do valor',
    consequence: 'a lista diria “sem marcação” sobre uma peça marcada por opção',
    readPage: async (de, ate) => {
      const { data, error: erroDaPagina } = await supabase
        .from('product_option_filter_values')
        .select('product_id, option_name, option_value, value_id')
        .eq('value_id', valueId)
        .order('product_id')
        .order('option_name')
        .order('option_value')
        .range(de, ate)
      if (erroDaPagina) throw new Error(mensagem(erroDaPagina, 'Não foi possível ler as marcações por opção.'))
      return (data ?? []) as MarcacaoPorOpcaoDaPeca[]
    },
  })
}

/** As marcações por opção de UM valor, agrupadas por peça. */
export const useOptionMarks = (valueId: string | undefined) => {
  const [porPeca, setPorPeca] = useState<Map<string, MarcacaoPorOpcaoDaPeca[]>>(() => new Map())
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
        const linhas = await lerMarcacoesPorOpcaoDoValor(valueId)
        if (meu !== pedido.current) return
        const mapa = new Map<string, MarcacaoPorOpcaoDaPeca[]>()
        for (const l of linhas) mapa.set(l.product_id, [...(mapa.get(l.product_id) ?? []), l])
        setPorPeca(mapa)
      } catch (e) {
        if (meu !== pedido.current) return
        if (modo === 'inicial') setPorPeca(new Map())
        setError(e instanceof Error ? e.message : 'Não foi possível ler as marcações por opção.')
      }
      setLoading(false)
    },
    [valueId],
  )

  useEffect(() => {
    fetchMarks('inicial')
  }, [fetchMarks])

  /** Tira o valor de todas as opções das peças e relê. */
  const unmark = async (productIds: readonly string[]): Promise<string | null> => {
    if (!valueId) return null
    const motivo = await apagarMarcacoesPorOpcaoDoValor(valueId, productIds)
    if (motivo) return motivo
    await fetchMarks('revalidar')
    return null
  }

  return { porPeca, loading, error, fetchMarks, unmark }
}
