import {
  ORDER_PAGE_SIZE,
  applyOrderSlice,
  buildOrderSearchCondition,
  cursorFilter,
  sliceOrder,
  type OrderCursor,
  type OrderSlice,
} from '@estrelinha/core/orders'
import { supabase } from '@estrelinha/supabase/client'

import { tamanhoDaJanelaDe, useJanelaPaginada } from '@/shared/api/useJanelaPaginada'

import { COLUNAS_DA_LISTA, type LinhaDaLista } from '../model/linha'

/**
 * A lista de pedidos do ateliê (feature `74`, abordagem B do Design — "a janela"). Desde a `76` a
 * máquina da janela (geração, recusa da próxima, releitura em páginas de 25) mora em
 * `shared/api/useJanelaPaginada`; aqui ficam a CONSULTA e o cursor.
 *
 * **O recorte é só a regra de `core`** (`MAP-01`, `MAP-02`, `L-060`): a cadeia é exatamente
 * `select → applyOrderSlice → or(busca)? → or(cursor)? → order(created_at) → order(id) → limit`, e o
 * teste a compara por IGUALDADE com a que `core` produz. Nenhum filtro escrito aqui.
 */

export const LISTA_DE_PEDIDOS_KEY = 'atelie-pedidos'

export const chaveDaLista = (slice: OrderSlice, termo: string) => [LISTA_DE_PEDIDOS_KEY, slice, termo.trim()] as const

/** O tamanho da janela relida: o que já estava carregado, em páginas cheias de 25 (nunca menos que uma). */
export const tamanhoDaJanela = (carregadas: number): number => tamanhoDaJanelaDe(carregadas, ORDER_PAGE_SIZE)

interface Leitura {
  limite: number
  cursor?: OrderCursor
  contar: boolean
}

/** A consulta — a única cadeia de leitura da lista. Lança o erro do supabase-js (ele não rejeita). */
const consultaDaLista = async (slice: OrderSlice, termo: string, { limite, cursor, contar }: Leitura) => {
  let q = contar
    ? supabase.from('order_list').select(COLUNAS_DA_LISTA, { count: 'exact' })
    : supabase.from('order_list').select(COLUNAS_DA_LISTA)
  q = applyOrderSlice(q, slice)
  const busca = buildOrderSearchCondition(termo)
  if (busca) q = q.or(busca)
  const dir = sliceOrder(slice)
  if (cursor) q = q.or(cursorFilter(cursor, dir))
  const { data, error, count } = await q
    .order('created_at', { ascending: dir === 'asc' })
    .order('id', { ascending: dir === 'asc' })
    .limit(limite)
  if (error) throw error
  return { linhas: (data ?? []) as unknown as LinhaDaLista[], count: count ?? null }
}

export const useListaDePedidos = (slice: OrderSlice, termo: string) => {
  const chave = chaveDaLista(slice, termo)
  const termoLimpo = chave[2]
  return useJanelaPaginada<LinhaDaLista, OrderCursor>({
    chave,
    tamanhoDaPagina: ORDER_PAGE_SIZE,
    consultar: (p) => consultaDaLista(slice, termoLimpo, p),
    cursorDe: (ultima) => ({ created_at: ultima.created_at, id: ultima.id }),
  })
}
