// Feature `73` · `MAI-09`, `MAI-21`, `MAI-22` — a leitura do resumo do ateliê (os 7 dias, o mês, as
// clientes novas, as joias, a fila e os últimos pedidos). Molde de `useStoreMovement`: UMA RPC
// admin, sem argumento (`AD-055`: ninguém diz ao banco que dia é), `throw` do `{ error }` e a
// releitura na virada do dia por DURAÇÃO do servidor (`turnDelayMs`).
//
// SPEC_DEVIATION (design §4, "molde exato"): a única diferença para `useStoreMovement` é o `retry`.
// Lá é `retry: 1` em qualquer erro (a suíte da `71` prende isso, inclusive para `42501`). Aqui é
// `retryUnlessDenied`: falha de rede repete uma vez, e a recusa por papel (`42501`, design §6) não
// repete — repetir só atrasa a ida à tela de recusa (`MAI-22`).

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { turnDelayMs } from '../stats/turn.ts'
import type { StoreOverview } from '../stats/overview.ts'

/** A chave do cache. Uma só, para quem lê e quem invalida (a Início, pelo Realtime) não divergirem. */
export const STORE_OVERVIEW_KEY = ['store-overview'] as const

/** O código do Postgres para "sem privilégio" — o que `has_role` levanta numa RPC admin. */
export const ACCESS_DENIED_CODE = '42501'

/** A leitura foi recusada por PAPEL (`42501`), e não por rede. O único dono desta pergunta. */
export const isAccessDenied = (erro: unknown): boolean =>
  (erro as { code?: unknown } | null | undefined)?.code === ACCESS_DENIED_CODE

/** Repete uma vez, menos quando a RPC recusou por papel. */
export const retryUnlessDenied = (falhas: number, erro: unknown): boolean => !isAccessDenied(erro) && falhas < 1

const lerResumo = async (): Promise<StoreOverview> => {
  // Sem segundo argumento: `p_agora` existe só para probe.
  const { data, error } = await supabase.rpc('store_overview')
  // O supabase-js não rejeita: devolve `{ error }`. Sem este `throw` o estado de erro não existiria.
  if (error) throw error
  return data as StoreOverview
}

export const useStoreOverview = () => {
  const query = useQuery({
    queryKey: STORE_OVERVIEW_KEY,
    queryFn: lerResumo,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })

  const { data, dataUpdatedAt, refetch } = query

  useEffect(() => {
    if (!data) return
    const atraso = turnDelayMs(data, dataUpdatedAt, Date.now())
    if (atraso === null) return
    const timer = setTimeout(() => {
      void refetch()
    }, atraso)
    return () => clearTimeout(timer)
  }, [data, dataUpdatedAt, refetch])

  return query
}
