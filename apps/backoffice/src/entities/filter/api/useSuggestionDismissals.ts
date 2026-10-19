// As sugestões recusadas — feature 67 (`VFL-21`, `VFL-22`, `VFL-30`).
//
// Duas operações e nenhuma outra: **ler** as recusas (todas, para a fila; as de uma peça, para o
// formulário do produto) e **gravar N** numa requisição só. Não há tela para desfazer uma recusa
// (`spec.md`, *Implicit-requirement sweep*): ela só sai junto com a peça ou com o valor, pela cascata.
//
// A recusa é por ALVO, não por fonte: o alvo "peça toda" é o par vazio (`option_name = ''` e
// `option_value = ''`), como na tabela. Gravar é `upsert(..., { ignoreDuplicates: true })` sobre a
// chave inteira — recusar duas vezes a mesma coisa é no-op, nunca erro.
//
// A leitura é React Query, e a chave é a régua de "a fila atualiza sem recarregar" (`VFL-24`): quem
// grava invalida `SUGGESTION_DISMISSALS_KEY`, e o prefixo alcança as duas leituras (todas e por peça).
// A tabela NÃO tem leitura pública: quem lê é o admin (`for all` com `has_role`).

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import type { SuggestionDismissal } from '@estrelinha/core/filters'
import { supabase } from '@estrelinha/supabase/client'

export const SUGGESTION_DISMISSALS_KEY = ['filtros', 'recusas'] as const

export const DISMISSAL_COLUMNS = 'product_id, value_id, option_name, option_value'

/** A chave da tabela, na ordem do `primary key`. É o `onConflict` da gravação. */
export const DISMISSAL_CONFLICT = 'product_id,value_id,option_name,option_value'

const mensagem = (erro: { message?: string } | null | undefined, padrao: string): string =>
  erro?.message && erro.message.trim() !== '' ? erro.message : padrao

/* eslint-disable @typescript-eslint/no-explicit-any */
const toRecusa = (r: any): SuggestionDismissal => ({
  product_id: String(r?.product_id ?? ''),
  value_id: String(r?.value_id ?? ''),
  option_name: typeof r?.option_name === 'string' ? r.option_name : '',
  option_value: typeof r?.option_value === 'string' ? r.option_value : '',
})
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Lê as recusas — de uma peça, ou todas. Conta primeiro e pagina: a leitura truncada FALHA, porque
 * uma recusa que não chegou faz a sugestão recusada voltar à fila, que é exatamente o que `VFL-21`
 * promete que não acontece.
 */
export const lerRecusas = async (productId?: string): Promise<SuggestionDismissal[]> => {
  const contar = supabase.from('filter_suggestion_dismissals').select('product_id', { count: 'exact', head: true })
  const { count, error } = await (productId ? contar.eq('product_id', productId) : contar)
  if (error) throw new Error(mensagem(error, 'Não foi possível contar as sugestões recusadas.'))
  const total = count ?? 0
  if (total === 0) return []

  return readAllPages<SuggestionDismissal>({
    total,
    label: 'sugestões recusadas',
    consequence: 'uma sugestão recusada voltaria à fila',
    readPage: async (de, ate) => {
      const base = supabase.from('filter_suggestion_dismissals').select(DISMISSAL_COLUMNS)
      const filtrada = productId ? base.eq('product_id', productId) : base
      const { data, error: erroDaPagina } = await filtrada
        .order('product_id')
        .order('value_id')
        .order('option_name')
        .order('option_value')
        .range(de, ate)
      if (erroDaPagina) throw new Error(mensagem(erroDaPagina, 'Não foi possível ler as sugestões recusadas.'))
      return ((data ?? []) as unknown[]).map(toRecusa)
    },
  })
}

/** Grava as recusas numa requisição só. Devolve a frase do erro, ou `null`. */
export const gravarRecusas = async (recusas: readonly SuggestionDismissal[]): Promise<string | null> => {
  if (recusas.length === 0) return null
  const { error } = await supabase.from('filter_suggestion_dismissals').upsert(
    recusas.map(r => ({
      product_id: r.product_id,
      value_id: r.value_id,
      option_name: r.option_name ?? '',
      option_value: r.option_value ?? '',
    })),
    { onConflict: DISMISSAL_CONFLICT, ignoreDuplicates: true },
  )
  return error ? mensagem(error, 'Não foi possível recusar as sugestões.') : null
}

export const invalidarRecusas = (qc: QueryClient): Promise<void> =>
  qc.invalidateQueries({ queryKey: SUGGESTION_DISMISSALS_KEY })

/** As recusas de uma peça (`productId`) ou de todas (`undefined`). Peça nova (`null`): nenhuma. */
export const useSuggestionDismissals = (productId?: string | null) => {
  const daPeca = productId !== undefined
  const { data, isPending, error } = useQuery({
    queryKey: [...SUGGESTION_DISMISSALS_KEY, daPeca ? (productId ?? 'nova') : 'todas'],
    queryFn: () => lerRecusas(productId ?? undefined),
    enabled: !daPeca || !!productId,
  })
  return {
    recusas: data ?? [],
    carregando: daPeca && !productId ? false : isPending,
    erro: error ? mensagem(error as { message?: string }, 'Não foi possível ler as sugestões recusadas.') : null,
  }
}
