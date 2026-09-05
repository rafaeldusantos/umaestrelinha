// `PED-05`..`PED-10`, `PED-18`, `PED-20` — a listagem de pedidos, inteira no servidor.
//
// ---------------------------------------------------------------------------------------------
// OS QUATRO DEFEITOS QUE ESTE ARQUIVO EXISTE PARA DESFAZER
// ---------------------------------------------------------------------------------------------
// `useAdminOrders` continua existindo para o detalhe e as escritas. O que sai dele é a LEITURA da
// listagem, que carregava quatro defeitos, nenhum dos quais quebrava nada:
//
//   1. `fetchStatusCounts` lia `orders` **sem `where` nenhum**, então as contagens das abas
//      ignoravam os filtros ativos: com "Material: aguardando" ligado, a aba dizia `Pago (12)` e a
//      lista mostrava 3.
//   2. a mesma leitura era `select('status, material_status')` **sem paginação**, e herdava o teto
//      de 1.000 linhas do PostgREST em silêncio (`BL-008`).
//   3. o erro de leitura era engolido — `if (error) setOrders([])` — e a tela exibia "Nenhum pedido
//      encontrado", que é a frase para "o filtro não casou nada", não para "o banco não respondeu".
//   4. a busca alcançava duas colunas de cinco.
//
// A contagem agora é `count: 'exact'` com `head: true`: **o servidor conta, o cliente não carrega
// linha nenhuma**. Não há teto a herdar, porque não há linha atravessando a rede.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { readAllPages } from '@estrelinha/core/paging'
import {
  MATERIAL_NAO_SEGURA_LISTA,
  ORDER_LIST_FROM,
  ORDER_LIST_SELECT,
  ORDER_SORT_COLUMN,
  ORDER_VIEWS,
  buildOrderSearchCondition,
  pageRange,
  viewPredicate,
  type AdminOrderRow,
  type OrderFilters,
  type OrderQuery,
  type OrderViewId,
} from './orderQuery'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OrderListResult {
  rows: AdminOrderRow[]
  total: number
  loading: boolean
  /** `PED-08` — exposto, nunca engolido. A tela desenha faixa de erro, jamais o estado vazio. */
  error: string | null
  /** `PED-07` — uma contagem por visão, com os filtros ativos aplicados menos o eixo da própria aba. */
  viewCounts: Record<OrderViewId, number>
  /** `PED-12` — os quatro contadores do topo, e a idade do mais antigo da fila. */
  tileCounts: Record<string, number>
  oldestWaitingAt: string | null
  refetch: () => Promise<void>
  fetchAllFiltered: () => Promise<AdminOrderRow[]>
}

/**
 * Aplica tudo o que não é a visão.
 *
 * Separado do predicado da visão de propósito: é exatamente essa separação que permite contar uma
 * aba **com os filtros do usuário e sem o filtro da própria aba** (`PED-07`).
 */
const applyFilters = (builder: any, filters: OrderFilters, search: string): any => {
  let q = builder

  if (filters.statuses.length > 0) q = q.in('status', filters.statuses)
  if (filters.materialStatuses.length > 0) q = q.in('material_status', filters.materialStatuses)
  if (filters.paymentStatuses.length > 0) q = q.in('payment_status', filters.paymentStatuses)
  if (filters.paymentMethods.length > 0) q = q.in('payment_method', filters.paymentMethods)
  if (filters.semRastreio) q = q.is('tracking_code', null)
  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom)
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo)

  const busca = buildOrderSearchCondition(search)
  if (busca) q = q.or(busca)

  return q
}

const applyView = (builder: any, view: OrderViewId): any => {
  const predicado = viewPredicate(view)
  if (!predicado) return builder

  let q = builder
  if (predicado.or) q = q.or(predicado.or)
  for (const [coluna, valores] of Object.entries(predicado.in ?? {})) q = q.in(coluna, valores)
  return q
}

const contagemVazia = (): Record<OrderViewId, number> =>
  Object.fromEntries(ORDER_VIEWS.map(v => [v.id, 0])) as Record<OrderViewId, number>

export const useAdminOrderList = (query: OrderQuery): OrderListResult => {
  const [rows, setRows] = useState<AdminOrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewCounts, setViewCounts] = useState<Record<OrderViewId, number>>(contagemVazia)
  const [tileCounts, setTileCounts] = useState<Record<string, number>>({})
  const [oldestWaitingAt, setOldestWaitingAt] = useState<string | null>(null)

  const queryKey = useMemo(() => JSON.stringify(query), [query])

  /** A consulta filtrada e ordenada, **sem paginar**. */
  const buildFilteredQuery = useCallback((current: OrderQuery, select = ORDER_LIST_SELECT) => {
    let builder: any = supabase.from(ORDER_LIST_FROM).select(select, { count: 'exact' })
    builder = applyView(builder, current.filters.view)
    builder = applyFilters(builder, current.filters, current.search)

    // Embrulhado num objeto DE PROPÓSITO: o builder do `supabase-js` é *thenable*, e uma função
    // `async` que o devolvesse cru faria o `await` do chamador EXECUTAR a consulta e receber o
    // resultado no lugar do builder. Mesma armadilha registrada em `useAdminProductList`.
    return {
      builder: builder.order(ORDER_SORT_COLUMN[current.sort.key], {
        ascending: current.sort.dir === 'asc',
      }),
    }
  }, [])

  /**
   * `PED-07` + `PED-09` — a contagem de cada aba.
   *
   * `head: true` faz o PostgREST responder **só o cabeçalho `Content-Range`**: o servidor conta, e
   * nenhuma linha atravessa a rede. É o que tira a `BL-008` desta leitura — não há teto de 1.000 a
   * herdar quando não se carrega linha.
   *
   * Os filtros do usuário entram; a visão da aba **substitui** a visão ativa, e não se soma a ela.
   * Somar faria toda aba diferente da atual contar zero.
   */
  const fetchCounts = useCallback(async (current: OrderQuery) => {
    const contagens = await Promise.all(
      ORDER_VIEWS.map(async view => {
        let q: any = supabase.from('orders').select('id', { count: 'exact', head: true })
        q = applyView(q, view.id)
        q = applyFilters(q, current.filters, current.search)
        const { count } = await q
        return [view.id, count ?? 0] as const
      }),
    )

    setViewCounts(Object.fromEntries(contagens) as Record<OrderViewId, number>)
  }, [])

  /**
   * Os quatro tiles do topo — `PED-12`.
   *
   * **Não** herdam os filtros ativos: eles são o ponto de ENTRADA da tela, e um tile que já viesse
   * filtrado responderia "o que cobra dentro do que você já filtrou", que é a pergunta que a lista
   * abaixo dele já responde.
   */
  const fetchTiles = useCallback(async () => {
    const contar = async (aplicar: (q: any) => any): Promise<number> => {
      const { count } = await aplicar(
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      )
      return count ?? 0
    }

    const [aguardando, aSeparar, semRastreio, pix] = await Promise.all([
      contar(q => q.eq('material_status', 'aguardando_material')),
      // **Pago E com o material resolvido.** Contar só `status = 'paid'` incluiria os pedidos que
      // ainda esperam o envelope — e o próprio texto do tile diz "material já recebido ou não
      // exigido". Medido no navegador: o tile dizia 3 e o clique trazia 4, porque dois pedidos
      // estavam nos dois contadores ao mesmo tempo.
      contar(q => q.eq('status', 'paid').in('material_status', MATERIAL_NAO_SEGURA_LISTA)),
      contar(q => q.eq('status', 'shipped').is('tracking_code', null)),
      contar(q => q.eq('payment_method', 'pix').eq('payment_status', 'pending')),
    ])

    setTileCounts({
      aguardando,
      'a-separar': aSeparar,
      'sem-rastreio': semRastreio,
      'pix-aguardando': pix,
    })

    // A idade do mais antigo é o que transforma "5 pedidos" em "5 pedidos, e um deles há 9 dias".
    // Uma linha só, ordenada — não a fila inteira para achar o mínimo no cliente.
    const { data: maisAntigo } = await supabase
      .from('orders')
      .select('created_at')
      .eq('material_status', 'aguardando_material')
      .order('created_at', { ascending: true })
      .limit(1)

    setOldestWaitingAt((maisAntigo as { created_at: string }[] | null)?.[0]?.created_at ?? null)
  }, [])

  const refetch = useCallback(async () => {
    const current: OrderQuery = JSON.parse(queryKey)
    setLoading(true)
    setError(null)

    const [from, to] = pageRange(current.page, current.pageSize)
    const { data, error: queryError, count } = await buildFilteredQuery(current).builder.range(from, to)

    if (queryError) {
      // `PED-08`: a lista esvazia E o erro aparece. Esvaziar sem dizer por quê é o defeito antigo.
      setRows([])
      setTotal(0)
      setError((queryError as { message?: string }).message ?? 'Não foi possível carregar os pedidos')
      setLoading(false)
      return
    }

    setRows((data ?? []) as AdminOrderRow[])
    setTotal(count ?? 0)
    setLoading(false)

    await Promise.all([fetchCounts(current), fetchTiles()])
  }, [queryKey, buildFilteredQuery, fetchCounts, fetchTiles])

  useEffect(() => {
    refetch()
  }, [refetch])

  /**
   * `PED-05` — o filtro INTEIRO, para o CSV e para "selecionar os N do filtro".
   *
   * Passa por `readAllPages` de `@estrelinha/core/paging`, que é o dono de "lê tudo ou falha": ele
   * conta primeiro, pagina depois, e **recusa** quando os dois números discordam. Uma leitura
   * truncada aqui exportaria um CSV silenciosamente menor que o rodapé promete — e um CSV a menos é
   * indistinguível de um filtro mais estreito para quem o recebe.
   */
  const fetchAllFiltered = useCallback(async (): Promise<AdminOrderRow[]> => {
    const current: OrderQuery = JSON.parse(queryKey)

    const { count } = await buildFilteredQuery(current, 'id').builder.range(0, 0)
    const total = count ?? 0
    if (total === 0) return []

    return readAllPages<AdminOrderRow>({
      total,
      label: 'pedidos do filtro',
      consequence: 'o CSV sairia menor que o total que o botão promete',
      readPage: async (inicio, fim) => {
        const { data, error: pageError } = await buildFilteredQuery(current).builder.range(inicio, fim)
        if (pageError) throw new Error((pageError as { message?: string }).message ?? 'leitura falhou')
        return (data ?? []) as AdminOrderRow[]
      },
    })
  }, [queryKey, buildFilteredQuery])

  return {
    rows,
    total,
    loading,
    error,
    viewCounts,
    tileCounts,
    oldestWaitingAt,
    refetch,
    fetchAllFiltered,
  }
}
