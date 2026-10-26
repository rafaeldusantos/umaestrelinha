// A leitura da biblioteca de opções — feature 81 (OPV-21, OPV-22).
//
// Lê `products.options` do catálogo inteiro e entrega a `buildOptionLibrary`. Molde de
// `useProductPool`: client injetável (a capacidade do dublê é parte da régua), **conta primeiro e
// pagina** com `readAllPages` — o PostgREST corta em 1.000 linhas sem avisar, e uma biblioteca
// truncada sugeriria só parte dos valores sem nada dizer.
//
// A chave começa por `PRODUCT_POOL_KEY`: quem grava produto já invalida o pool
// (`invalidarPoolDeProdutos`), e o React Query invalida por prefixo — a sugestão reflete o
// salvamento na próxima abertura do editor sem uma linha a mais em quem grava (OPV-22).

import { useQuery } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { ProductOption } from '@estrelinha/supabase/types'
import { buildOptionLibrary, type OptionLibraryEntry } from '../lib/optionLibrary'
import { PRODUCT_POOL_KEY, PRODUCT_POOL_STALE_TIME, type ClienteDeLeitura } from './useProductPool'

/** Só a coluna das opções: nada de descrição, imagem ou variação. */
export const OPTION_LIBRARY_COLUMNS = 'options'

export const OPTION_LIBRARY_KEY = [...PRODUCT_POOL_KEY, 'options'] as const

/** O client real, com o cast num lugar só (mesmo motivo de `useProductPool`). */
const clientePadrao = (): ClienteDeLeitura => supabase as unknown as ClienteDeLeitura

const mensagem = (erro: unknown, padrao: string): string => {
  const texto = (erro as { message?: string } | null)?.message
  return texto && texto.trim() !== '' ? texto : padrao
}

/**
 * Lê as opções de todos os produtos e monta a biblioteca, ou **falha**.
 *
 * A ordem é `id`, único: sem critério único o PostgREST não garante a mesma sequência entre páginas,
 * e linhas repetiriam ou sumiriam com a contagem batendo.
 */
export const lerBibliotecaDeOpcoes = async (
  client: ClienteDeLeitura = clientePadrao(),
): Promise<OptionLibraryEntry[]> => {
  const { count, error } = await client
    .from('products')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(mensagem(error, 'não foi possível contar o catálogo'))

  const total = count ?? 0
  if (total === 0) return []

  const linhas = await readAllPages<{ options: ProductOption[] | null }>({
    total,
    label: 'opções do catálogo',
    consequence: 'o editor sugeriria só parte dos nomes e valores usados',
    readPage: async (de, ate) => {
      const { data, error: erroDaPagina } = await client
        .from('products')
        .select(OPTION_LIBRARY_COLUMNS)
        .order('id')
        .range(de, ate)
      if (erroDaPagina) throw new Error(mensagem(erroDaPagina, 'não foi possível ler as opções'))
      return (data ?? []) as { options: ProductOption[] | null }[]
    },
  })

  return buildOptionLibrary(linhas)
}

export interface BibliotecaDeOpcoes {
  library: OptionLibraryEntry[]
  /** Texto legível. O editor ignora: sem biblioteca ele é texto livre (OPV-21). */
  error: string | null
}

/** A biblioteca, cacheada sob o pool. Erro ou carga em curso ⇒ biblioteca vazia, nunca bloqueio. */
export const useOptionLibrary = (client?: ClienteDeLeitura): BibliotecaDeOpcoes => {
  const { data, error } = useQuery({
    queryKey: OPTION_LIBRARY_KEY,
    queryFn: () => lerBibliotecaDeOpcoes(client),
    staleTime: PRODUCT_POOL_STALE_TIME,
  })

  return {
    library: data ?? [],
    error: error ? mensagem(error, 'não foi possível ler as opções') : null,
  }
}
