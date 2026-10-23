// Feature 71 · `VIS-04`, `VIS-10`, `VIS-33` — a leitura do bloco "Movimento da loja". Movido do
// painel na feature `73` (`AD-056`): o app do ateliê abre a Início com o mesmo bloco. O painel
// reexporta pelo caminho de antes (`apps/backoffice/src/entities/stats/api/useStoreMovement.ts`).
//
// UMA RPC, sem argumento: ninguém diz ao banco que dia é. Os três períodos vêm da mesma resposta,
// então trocar de período não lê nada.
//
// Quando ler de novo (`VIS-10`):
// - (a) ao montar e (b) quando a janela volta a ter foco — React Query, com `staleTime: 0`;
// - (c) na virada do dia de Brasília — o timer abaixo, por `turnDelayMs` (duração do SERVIDOR);
// - (d) no aviso de tempo real de `orders` — quem invalida é a página, pela `STORE_MOVEMENT_KEY`.

import { useEffect } from 'react'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { turnDelayMs } from '../stats/turn.ts'
import type { StoreMovement } from '../stats/movement.ts'

/** A chave do cache. Uma só, para quem lê e quem invalida não divergirem. */
export const STORE_MOVEMENT_KEY = ['store-movement'] as const

const lerMovimento = async (): Promise<StoreMovement> => {
  // Sem segundo argumento (`VIS-04`): `p_agora` existe só para probe.
  const { data, error } = await supabase.rpc('store_movement')
  // O supabase-js não rejeita: devolve `{ error }`. Sem este `throw` o estado de erro não existiria.
  if (error) throw error
  return data as StoreMovement
}

/**
 * Opções de quem lê. Feature `73`: o `retry` é opção do HOOK, e a opção de uma query vence a do
 * `QueryClient` — sem este parâmetro, o app do ateliê não teria como fazer o `42501` deixar de
 * repetir (`MAI-22`, design §6). O padrão continua `1`, então o painel não muda.
 */
export interface StoreMovementOptions {
  retry?: UseQueryOptions<StoreMovement>['retry']
}

export const useStoreMovement = ({ retry = 1 }: StoreMovementOptions = {}) => {
  const query = useQuery({
    queryKey: STORE_MOVEMENT_KEY,
    queryFn: lerMovimento,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry,
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
