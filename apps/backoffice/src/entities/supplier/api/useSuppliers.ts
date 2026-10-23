// Feature 80 — os fornecedores cadastrados, para a sugestão do nome (FOR-07) e o filtro da
// listagem (FOR-18). Lista pequena, lida inteira uma vez e recortada em memória.
//
// `readAllPages` e não `select` simples: o PostgREST corta em 1.000 linhas sem avisar, e uma
// sugestão que deixasse de enxergar parte dos fornecedores ofereceria "Criar" para um nome que já
// existe — o save reaproveitaria, mas a tela teria mentido.

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { Supplier } from '../model/suggest'

export const SUPPLIERS_KEY = ['admin-suppliers'] as const

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { count, error } = await supabase.from('suppliers').select('id', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return readAllPages<Supplier>({
    total: count ?? 0,
    label: 'fornecedores',
    consequence: 'a sugestão ofereceria criar um fornecedor que já existe',
    readPage: async (from, to) => {
      const { data, error: pageError } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')
        .order('id')
        .range(from, to)
      if (pageError) throw new Error(pageError.message)
      return (data ?? []) as Supplier[]
    },
  })
}

export const useSuppliers = () => {
  const query = useQuery({ queryKey: SUPPLIERS_KEY, queryFn: fetchSuppliers, staleTime: 5 * 60_000 })
  return { suppliers: query.data ?? [], loading: query.isLoading, error: query.error }
}

/** Depois de um save que pode ter criado fornecedor: a próxima sugestão já o enxerga. */
export const invalidateSuppliers = (client: QueryClient) => client.invalidateQueries({ queryKey: SUPPLIERS_KEY })
