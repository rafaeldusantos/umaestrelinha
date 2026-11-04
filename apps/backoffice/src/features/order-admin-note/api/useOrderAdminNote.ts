// A observação do pedido — a leitura e a gravação do painel.
//
// A leitura é uma relação à parte do pedido (`order_admin_notes`, uma linha no máximo por pedido),
// em React Query com chave própria: a página e o card dividem o cache, sem segunda requisição. A
// falha é estado PRÓPRIO — "sem observação" é a frase para "não há linha", nunca para "o banco não
// respondeu".
//
// A escrita não mora aqui: delega ao dono, `writeAdminNote` (`@estrelinha/core/order-actions`), o
// mesmo que o app do ateliê chama. Depois de gravar, o cache recebe a linha devolvida e é revalidado
// sem voltar ao esqueleto.

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@estrelinha/auth'
import { supabase } from '@estrelinha/supabase/client'
import {
  ORDER_ADMIN_NOTE_COLUMNS,
  writeAdminNote,
  type AdminNoteOutcome,
  type AdminNoteRow,
} from '@estrelinha/core/order-actions'

export const orderAdminNoteKey = (orderId: string) => ['order-admin-note', orderId] as const

const lerObservacao = async (orderId: string): Promise<AdminNoteRow | null> => {
  const { data, error } = await supabase
    .from('order_admin_notes')
    .select(ORDER_ADMIN_NOTE_COLUMNS)
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw error
  return (data as AdminNoteRow | null) ?? null
}

export interface OrderAdminNote {
  /** A observação gravada, ou `null` quando o pedido não tem. Só vale quando `carregando` e `falhou` são falsos. */
  nota: AdminNoteRow | null
  /** A primeira leitura ainda não respondeu. */
  carregando: boolean
  /** A leitura falhou e não há o que mostrar — nunca se apresenta como "sem observação". */
  falhou: boolean
  tentarDeNovo: () => void
  /** Grava pelo dono de `core`. Vazio apaga. */
  salvar: (texto: string) => Promise<AdminNoteOutcome>
}

export function useOrderAdminNote(orderId: string | null | undefined): OrderAdminNote {
  const qc = useQueryClient()
  const { user, customer } = useAuthContext()
  const id = orderId ?? ''

  const consulta = useQuery({
    queryKey: orderAdminNoteKey(id),
    queryFn: () => lerObservacao(id),
    enabled: id !== '',
    staleTime: 0,
  })

  const salvar = useCallback(
    async (texto: string): Promise<AdminNoteOutcome> => {
      const nome = customer?.name?.trim() || user?.email || null
      const r = await writeAdminNote({ client: supabase }, { orderId: id, texto, userId: user?.id ?? null, userName: nome })
      if (r.tipo === 'ok') {
        qc.setQueryData(orderAdminNoteKey(id), r.nota)
        void qc.invalidateQueries({ queryKey: orderAdminNoteKey(id) })
      }
      return r
    },
    [qc, id, user, customer],
  )

  const { refetch } = consulta
  const tentarDeNovo = useCallback(() => {
    void refetch()
  }, [refetch])

  const semDado = consulta.data === undefined
  return {
    nota: consulta.data ?? null,
    carregando: semDado && consulta.isPending && !consulta.isError,
    falhou: semDado && consulta.isError,
    tentarDeNovo,
    salvar,
  }
}
