// A leitura da presença na loja (`store_live`): quem está na loja agora, o funil, os 30 minutos, as
// joias, as faixas de origem e de aparelho. Molde de `useStoreMovement`: UMA RPC admin, sem argumento
// (o "agora" e as janelas são do banco), o `throw` do `{ error }` e chave de cache própria.
//
// Quando ler de novo: ao montar; quando a janela volta a ter foco (`staleTime: 0`); a cada
// `refetchInterval` ms SÓ com a aba visível (`refetchIntervalInBackground: false`), parando na recusa
// por papel (`42501`); e quando a página invalida `STORE_LIVE_KEY` (o puxar para atualizar). Sem timer
// de virada: a presença não tem dia.

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { StoreLive } from '../live/presence.ts'
import { isAccessDenied } from './useStoreOverview.ts'

/** A chave do cache. Uma só, para quem lê e quem invalida não divergirem. */
export const STORE_LIVE_KEY = ['store-live'] as const

const lerPresenca = async (): Promise<StoreLive> => {
  // Sem argumento: `p_agora` existe só para probe.
  const { data, error } = await supabase.rpc('store_live')
  // O supabase-js não rejeita: devolve `{ error }`. Sem este `throw` o estado de erro não existiria.
  if (error) throw error
  return data as StoreLive
}

export interface StoreLiveOptions {
  retry?: UseQueryOptions<StoreLive>['retry']
  /** Relê a cada N ms com a aba visível (a Início a 30 s, a Loja ao vivo a 15 s). Para na recusa. */
  refetchInterval?: number
}

export const useStoreLive = ({ retry = 1, refetchInterval }: StoreLiveOptions = {}) =>
  useQuery({
    queryKey: STORE_LIVE_KEY,
    queryFn: lerPresenca,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry,
    refetchInterval: refetchInterval ? (q) => (isAccessDenied(q.state.error) ? false : refetchInterval) : false,
    refetchIntervalInBackground: false,
  })
