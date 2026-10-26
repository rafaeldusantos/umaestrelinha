import {
  CUSTOMER_PAGE_SIZE,
  applyCustomerSlice,
  buildAppCustomerSearch,
  customerCursorFilter,
  type CustomerCursor,
  type CustomerSliceId,
} from '@estrelinha/core/customers'
import { supabase } from '@estrelinha/supabase/client'

import { tamanhoDaJanelaDe, useJanelaPaginada } from '@/shared/api/useJanelaPaginada'

import { COLUNAS_DA_LISTA, type LinhaDeCliente } from '../model/linha'

/**
 * A lista de clientes do ateliê (feature `76`, `MAC-01`, `MAC-02`, `MAC-04`, `MAC-05`, `MAC-06`,
 * `MAC-11`..`MAC-13`). A máquina da janela (geração, recusa da próxima, releitura em páginas de 25,
 * `lerComPapel` em volta de CADA consulta) é a de `shared/api/useJanelaPaginada`, a mesma da lista de
 * pedidos; aqui ficam só a CONSULTA e o cursor.
 *
 * **O recorte, a busca e o cursor são só a regra de `core`** (`L-060`): a cadeia é exatamente
 * `select → applyCustomerSlice → or(busca)? → or(cursor)? → order(last_activity_at) → order(id) → limit`,
 * e o teste a compara por IGUALDADE com a que `core` produz. Nenhum filtro escrito aqui.
 *
 * `desduplicar`: a cliente que mudou de posição entre duas leituras pode aparecer duas vezes ao anexar
 * a página seguinte; o `id` repetido é descartado (`MAC-05`).
 */

export const LISTA_DE_CLIENTES_KEY = 'atelie-clientes'

export const chaveDaListaDeClientes = (slice: CustomerSliceId, termo: string) =>
  [LISTA_DE_CLIENTES_KEY, slice, termo.trim()] as const

/** O tamanho da janela relida: o que já estava carregado, em páginas cheias de 25 (nunca menos que uma). */
export const tamanhoDaJanelaDeClientes = (carregadas: number): number => tamanhoDaJanelaDe(carregadas, CUSTOMER_PAGE_SIZE)

interface Leitura {
  limite: number
  cursor?: CustomerCursor
  contar: boolean
}

/** A consulta — a única cadeia de leitura da lista. Lança o erro do supabase-js (ele não rejeita). */
const consultaDaLista = async (slice: CustomerSliceId, termo: string, { limite, cursor, contar }: Leitura) => {
  let q = contar
    ? supabase.from('customer_list').select(COLUNAS_DA_LISTA, { count: 'exact' })
    : supabase.from('customer_list').select(COLUNAS_DA_LISTA)
  q = applyCustomerSlice(q, slice)
  const busca = buildAppCustomerSearch(termo)
  if (busca) q = q.or(busca)
  if (cursor) q = q.or(customerCursorFilter(cursor))
  const { data, error, count } = await q
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(limite)
  if (error) throw error
  return { linhas: (data ?? []) as unknown as LinhaDeCliente[], count: count ?? null }
}

export const useListaDeClientes = (slice: CustomerSliceId, termo: string) => {
  const chave = chaveDaListaDeClientes(slice, termo)
  const termoLimpo = chave[2]
  return useJanelaPaginada<LinhaDeCliente, CustomerCursor>({
    chave,
    tamanhoDaPagina: CUSTOMER_PAGE_SIZE,
    consultar: (p) => consultaDaLista(slice, termoLimpo, p),
    cursorDe: (ultima) => ({ last_activity_at: ultima.last_activity_at, id: ultima.id }),
    desduplicar: true,
  })
}
