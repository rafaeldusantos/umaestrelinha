// Feature 71 · `VIS-04`, `VIS-10`, `VIS-33` — a leitura do bloco "Movimento da loja".
//
// UMA RPC, sem argumento: o painel nunca diz ao banco que dia é. Os três períodos vêm da mesma
// resposta, então trocar de aba não lê nada.
//
// Quando ler de novo (`VIS-10`):
// - (a) ao montar e (b) quando a janela volta a ter foco — React Query, com `staleTime: 0`;
// - (c) na virada do dia de Brasília — o timer abaixo;
// - (d) no aviso de tempo real de `orders` — quem invalida é o Dashboard, pela `STORE_MOVEMENT_KEY`
//   (o canal tem um dono só: `useOrdersRealtime`, em `entities/order`).
//
// **O prazo da virada é DURAÇÃO do servidor** (`expira_em − lido_em`), contada a partir da chegada
// da resposta (`dataUpdatedAt`). Contra o relógio do navegador (`expira_em − Date.now()`), um
// computador adiantado chamaria antes da meia-noite do servidor, receberia o mesmo dia de volta,
// agendaria zero e entraria em laço até a meia-noite de verdade. O piso de 1 s segura o caso
// degenerado (resposta com `expira_em` antes de `lido_em`); `NaN` não agenda nada.

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { StoreMovement } from '../model/storeMovement'

/** A chave do cache. Uma só, para quem lê e quem invalida (o Dashboard) não divergirem. */
export const STORE_MOVEMENT_KEY = ['store-movement'] as const

/** Piso do timer da virada: nunca um disparo imediato em laço. */
const PISO_MS = 1_000
/** Teto do `setTimeout` (acima disso o navegador dispara na hora). */
const TETO_MS = 2 ** 31 - 1

/**
 * Quanto falta para a virada, medido como duração do servidor a partir de `recebidoEm` (relógio
 * local da chegada). `null` quando a resposta não permite saber — e aí não se agenda nada.
 */
export const turnDelayMs = (m: Pick<StoreMovement, 'expira_em' | 'lido_em'>, recebidoEm: number, agora: number): number | null => {
  const duracao = Date.parse(m.expira_em) - Date.parse(m.lido_em)
  if (!Number.isFinite(duracao)) return null
  const restante = duracao - (agora - recebidoEm)
  return Math.min(Math.max(restante, PISO_MS), TETO_MS)
}

const lerMovimento = async (): Promise<StoreMovement> => {
  // Sem segundo argumento (`VIS-04`): `p_agora` existe só para probe.
  const { data, error } = await supabase.rpc('store_movement')
  // O supabase-js não rejeita: devolve `{ error }`. Sem este `throw` o estado de erro não existiria.
  if (error) throw error
  return data as StoreMovement
}

export const useStoreMovement = () => {
  const query = useQuery({
    queryKey: STORE_MOVEMENT_KEY,
    queryFn: lerMovimento,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
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
