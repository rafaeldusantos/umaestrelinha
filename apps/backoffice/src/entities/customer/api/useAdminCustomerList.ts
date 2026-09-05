// `CLI-01`..`CLI-07` — a listagem de Clientes, inteira no servidor.
//
// `useAdminCustomers` (que continua existindo para a ficha) lia a base toda com
// `select('*, orders(count)')` **sem `range`**. O PostgREST devolve no máximo 1.000 linhas e não
// avisa quando trunca: a partir da milésima cliente, a tela mostrava um pedaço e o rodapé exibia
// `customers.length`, o número truncado, com toda a confiança. Mesma classe da `BL-008`.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { readAllPages } from '@estrelinha/core/paging'
import {
  CUSTOMER_LIST_SELECT,
  CUSTOMER_SORT_COLUMN,
  buildCustomerSearchCondition,
  pageRange,
  type CustomerFilters,
  type CustomerListRow,
  type CustomerQuery,
} from './customerQuery'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BasePortrait {
  /** Quantas pessoas compraram alguma vez. */
  compraram: number
  /** `CLI-06` — quantas voltaram (2+ pedidos pagos), e a fração da base. */
  voltaram: number
  confiaramMaterial: number
  /** Gasto médio **por pessoa que comprou** — não por pessoa cadastrada. */
  gastoMedio: number
  novasNoMes: number
  total: number
}

export interface CustomerListResult {
  rows: CustomerListRow[]
  total: number
  loading: boolean
  error: string | null
  portrait: BasePortrait
  refetch: () => Promise<void>
  fetchAllFiltered: () => Promise<CustomerListRow[]>
}

const diasAtras = (dias: number): string =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

const applyView = (builder: any, view: CustomerFilters['view']): any => {
  switch (view) {
    case 'todas':
      return builder
    case 'voltaram':
      return builder.gte('orders_paid', 2)
    case 'confiaram-material':
      return builder.gte('orders_with_material', 1)
    case 'uma-vez':
      return builder.eq('orders_paid', 1)
    case 'sem-compra':
      // Cadastro sem compra: nem pedido pago, nem pedido em aberto. Quem tem Pix pendente ainda
      // está tentando comprar, e pô-la aqui a trataria como quem nunca se interessou.
      return builder.eq('orders_total', 0)
    case 'duplicadas':
      return builder.gt('same_email_count', 1)
  }
}

const applyFilters = (builder: any, filters: CustomerFilters, search: string): any => {
  let q = applyView(builder, filters.view)

  if (filters.account === 'conta') q = q.eq('has_account', true)
  if (filters.account === 'convidada') q = q.eq('has_account', false)

  if (filters.lastPurchase === '30d') q = q.gte('last_activity_at', diasAtras(30))
  if (filters.lastPurchase === '90d') q = q.gte('last_activity_at', diasAtras(90))
  if (filters.lastPurchase === '180d+') q = q.lte('last_activity_at', diasAtras(180))
  if (filters.lastPurchase === 'nunca') q = q.is('last_activity_at', null)

  if (filters.materialKinds.length > 0) q = q.overlaps('material_kinds', filters.materialKinds)

  const busca = buildCustomerSearchCondition(search)
  if (busca) q = q.or(busca)

  return q
}

export const useAdminCustomerList = (query: CustomerQuery): CustomerListResult => {
  const [rows, setRows] = useState<CustomerListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portrait, setPortrait] = useState<BasePortrait>({
    compraram: 0, voltaram: 0, confiaramMaterial: 0, gastoMedio: 0, novasNoMes: 0, total: 0,
  })

  const queryKey = useMemo(() => JSON.stringify(query), [query])

  const buildFilteredQuery = useCallback((current: CustomerQuery, select = CUSTOMER_LIST_SELECT) => {
    let builder: any = supabase.from('customer_list').select(select, { count: 'exact' })
    builder = applyFilters(builder, current.filters, current.search)

    // Embrulhado num objeto: o builder do `supabase-js` é *thenable*, e devolvê-lo cru de uma
    // função `async` faria o `await` do chamador executar a consulta.
    return {
      builder: builder.order(CUSTOMER_SORT_COLUMN[current.sort.key], {
        ascending: current.sort.dir === 'asc',
        // Quem nunca comprou tem `avg_ticket` e `last_activity_at` nulos. Sem isto, o Postgres põe
        // NULL primeiro no `desc`, e a tela abriria com a lista de quem nunca comprou nada.
        nullsFirst: false,
      }),
    }
  }, [])

  /**
   * `CLI-06` — o retrato da base.
   *
   * Cinco contagens com `head: true`: **o servidor conta**, e nenhuma linha atravessa a rede. O
   * gasto médio é a única que precisa de dado, e vem de uma leitura estreita (`total_spent`) só de
   * quem comprou — não da base inteira.
   */
  const fetchPortrait = useCallback(async () => {
    const contar = async (aplicar: (q: any) => any): Promise<number> => {
      const { count } = await aplicar(
        supabase.from('customer_list').select('id', { count: 'exact', head: true }),
      )
      return count ?? 0
    }

    const inicioDoMes = new Date()
    inicioDoMes.setDate(1)
    inicioDoMes.setHours(0, 0, 0, 0)

    const [total, compraram, voltaram, confiaram, novas] = await Promise.all([
      contar(q => q),
      contar(q => q.gte('orders_paid', 1)),
      contar(q => q.gte('orders_paid', 2)),
      contar(q => q.gte('orders_with_material', 1)),
      contar(q => q.gte('first_order_at', inicioDoMes.toISOString())),
    ])

    const { data: gastos } = await supabase
      .from('customer_list')
      .select('total_spent')
      .gte('orders_paid', 1)
      .limit(1000)

    const soma = (gastos ?? []).reduce(
      (acc: number, r: { total_spent: number }) => acc + Number(r.total_spent ?? 0),
      0,
    )

    setPortrait({
      total,
      compraram,
      voltaram,
      confiaramMaterial: confiaram,
      // Média **por quem comprou**, não por cadastro: dividir pela base inteira misturaria quem
      // nunca gastou no denominador e produziria um número que não descreve ninguém.
      gastoMedio: compraram > 0 ? soma / Math.min(compraram, gastos?.length ?? compraram) : 0,
      novasNoMes: novas,
    })
  }, [])

  const refetch = useCallback(async () => {
    const current: CustomerQuery = JSON.parse(queryKey)
    setLoading(true)
    setError(null)

    const [from, to] = pageRange(current.page, current.pageSize)
    const { data, error: queryError, count } = await buildFilteredQuery(current).builder.range(from, to)

    if (queryError) {
      setRows([])
      setTotal(0)
      setError((queryError as { message?: string }).message ?? 'Não foi possível carregar as clientes')
      setLoading(false)
      return
    }

    setRows((data ?? []) as CustomerListRow[])
    // `CLI-02` — o total vem do `count` do servidor, **nunca** de `rows.length`.
    setTotal(count ?? 0)
    setLoading(false)

    await fetchPortrait()
  }, [queryKey, buildFilteredQuery, fetchPortrait])

  useEffect(() => {
    refetch()
  }, [refetch])

  /** `CLI-12` — o CSV do filtro inteiro, mesma régua de `PED-05`: lê tudo ou falha. */
  const fetchAllFiltered = useCallback(async (): Promise<CustomerListRow[]> => {
    const current: CustomerQuery = JSON.parse(queryKey)

    const { count } = await buildFilteredQuery(current, 'id').builder.range(0, 0)
    const total = count ?? 0
    if (total === 0) return []

    return readAllPages<CustomerListRow>({
      total,
      label: 'clientes do filtro',
      consequence: 'o CSV sairia menor que o total que o botão promete',
      readPage: async (inicio, fim) => {
        const { data, error: pageError } = await buildFilteredQuery(current).builder.range(inicio, fim)
        if (pageError) throw new Error((pageError as { message?: string }).message ?? 'leitura falhou')
        return (data ?? []) as CustomerListRow[]
      },
    })
  }, [queryKey, buildFilteredQuery])

  return { rows, total, loading, error, portrait, refetch, fetchAllFiltered }
}
