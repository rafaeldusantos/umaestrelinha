import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbOrder, DbOrderItem, DbOrderStatusHistory, DbOrderNote } from '@estrelinha/supabase/types'
import { ORDER_STATUS_LABELS } from '@estrelinha/core/orders'
import { writeMaterialStatus, writeMaterialTracking, writeOrderStatus, writeTrackingCode, type WriteOutcome } from '@estrelinha/core/order-actions'
import { notifyOrder } from './notifyOrder'

export const ORDER_STATUSES = ['pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

/**
 * Os rótulos de `orders.status`. Moram em `@estrelinha/core/orders` (`ORDER_STATUS_LABELS`) desde o
 * conserto do QA da feature `73`: o selo do app do ateliê lê as mesmas palavras. Reexportado por
 * REFERÊNCIA — `rotulosDoPainel.test.ts` confere com `toBe`.
 */
export const STATUS_LABELS: Record<string, string> = ORDER_STATUS_LABELS

const PAGE_SIZE = 20

/**
 * Feature `75` (A24): o `update` que não alterou nada (`nenhuma-linha`) deixou de passar como
 * sucesso. Para uma admin com o id da lista ele é inalcançável; se acontecer, a tela recebe um erro
 * em vez de um "salvo" falso. `falhou` devolve o erro do client, como antes.
 */
const falhaDaEscrita = (r: Exclude<WriteOutcome, { tipo: 'ok' }>) => ({
  error: r.tipo === 'falhou' ? (r as { erro: unknown }).erro : new Error('Nenhum pedido foi alterado.'),
  emailSent: false,
})

export const useAdminOrders = () => {
  const [orders, setOrders] = useState<DbOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [materialFilter, setMaterialFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({})

  const fetchStatusCounts = useCallback(async () => {
    // As duas contagens saem da MESMA leitura: uma segunda consulta só para o material dobraria o
    // tráfego para responder a mesma pergunta.
    //
    // ⚠️ Herda o teto de 1.000 linhas do PostgREST (`select` sem paginação) — o mesmo defeito que
    // quebrou a idempotência do importador na feature 21. Não foi introduzido aqui e não foi
    // corrigido aqui para não misturar escopo; está registrado no `BACKLOG.md`. As contagens ficam
    // certas até 1.000 pedidos.
    const { data } = await supabase.from('orders').select('status, material_status')
    if (data) {
      const counts: Record<string, number> = {}
      const material: Record<string, number> = {}
      data.forEach(o => {
        counts[o.status] = (counts[o.status] || 0) + 1
        const m = (o as { material_status?: string }).material_status ?? 'nao_aplicavel'
        material[m] = (material[m] || 0) + 1
      })
      setStatusCounts(counts)
      setMaterialCounts(material)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (paymentFilter !== 'all') query = query.eq('payment_method', paymentFilter)
    // MAT-10: no servidor, e não filtrando a página já carregada — a fila precisa atravessar a
    // paginação, senão "aguardando material" mostraria só o que coube nos 20 primeiros pedidos.
    if (materialFilter !== 'all') query = query.eq('material_status', materialFilter)
    if (dateFrom) query = query.gte('created_at', dateFrom.toISOString())
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query = query.lte('created_at', end.toISOString())
    }
    if (searchQuery.trim()) {
      query = query.or(`order_number.ilike.%${searchQuery.trim()}%,customer_name.ilike.%${searchQuery.trim()}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    query = query.range(from, from + PAGE_SIZE - 1)

    const { data, error, count } = await query
    if (error || !data) {
      setOrders([])
      setTotalCount(0)
    } else {
      setOrders(data)
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }, [statusFilter, paymentFilter, materialFilter, dateFrom, dateTo, searchQuery, page])

  useEffect(() => { setPage(1) }, [statusFilter, paymentFilter, materialFilter, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    fetchOrders()
    fetchStatusCounts()
  }, [fetchOrders, fetchStatusCounts])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
        fetchStatusCounts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchStatusCounts])

  const getOrderItems = async (orderId: string): Promise<DbOrderItem[]> => {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    return data ?? []
  }

  const getStatusHistory = async (orderId: string): Promise<DbOrderStatusHistory[]> => {
    const { data } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: true })
    return data ?? []
  }

  const getNotes = async (orderId: string): Promise<DbOrderNote[]> => {
    const { data } = await supabase.from('order_notes').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
    return data ?? []
  }

  const updateStatus = async (id: string, status: string, note?: string) => {
    // Feature `75` (`AD-059`): a escrita mora em `@estrelinha/core/order-actions`, que o app do ateliê
    // também chama. A sequência é a de sempre — update, histórico, `order_status_changed` —, com o
    // efeito conferido por `.select('id')`.
    //
    // TRG-12: um dos dois lados do par. Se o rastreio ainda não foi salvo, a pré-condição barra e o
    // aviso é no-op silencioso — ele sai quando `addTrackingCode` completar o par. O gatilho é
    // `order_status_changed` para TODO status (`AD-032`): quais status têm aviso é decisão de `core`.
    const from = orders.find(o => o.id === id)?.status
    const r = await writeOrderStatus({ client: supabase, notify: notifyOrder }, { id, to: status, from, note })
    if (r.tipo !== 'ok') return falhaDaEscrita(r)
    await fetchOrders()
    await fetchStatusCounts()
    return { error: null, emailSent: r.emailSent }
  }

  const cancelOrder = async (id: string, reason: string) => {
    const currentOrder = orders.find(o => o.id === id)
    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancel_reason: reason }).eq('id', id)
    if (!error) {
      await supabase.from('order_status_history').insert({
        order_id: id,
        from_status: currentOrder?.status ?? null,
        to_status: 'cancelled',
        note: `Cancelado: ${reason}`,
      })
      // Feature 42: o cancelamento deixou de ser mudo. `order_cancelled` nasce DESLIGADO, então até
      // a Adri ligar em `/admin/configuracoes` → Notificações isto é um no-op — e o contido de
      // sempre: falha de aviso não desfaz o cancelamento.
      await notifyOrder(id, 'order_status_changed')
      await fetchOrders()
      await fetchStatusCounts()
    }
    return error
  }

  const addTrackingCode = async (id: string, trackingCode: string, carrier: string) => {
    // O outro lado do par (TRG-12), tentado SEMPRE pelo dono: se o pedido já está `shipped`, salvar o
    // rastreio é o que completa e dispara. Cobre também o caminho do Melhor Envio, que grava o rastreio
    // sem tocar em `status`. O painel não normaliza nem valida o código (A8 vale só no app).
    const r = await writeTrackingCode({ client: supabase, notify: notifyOrder }, { id, code: trackingCode, carrier })
    if (r.tipo !== 'ok') return falhaDaEscrita(r)
    await fetchOrders()
    return { error: null, emailSent: r.emailSent }
  }

  /**
   * MAT-08 — a transição do material. **Só por RPC**, nunca `update` direto.
   *
   * `set_material_status` guarda os estados de origem permitidos no próprio `where`, o que a torna
   * idempotente sob concorrência: duas admins clicando ao mesmo tempo convergem para o resultado de
   * uma só. Um `update` daqui contornaria a máquina de estado inteira.
   */
  const setMaterialStatus = async (id: string, status: string) => {
    // A RPC e o aviso moram no dono (`writeMaterialStatus`). O aviso é contido (MAT-09 + AD-008):
    // falha de envio não reverte o estado nem vira erro para a admin. A tradução do desfecho para a
    // forma de retorno de sempre é a tabela do design da `75` (§3.3).
    const r = await writeMaterialStatus({ client: supabase, notify: notifyOrder }, { id, to: status })
    switch (r.tipo) {
      case 'ok':
        await fetchOrders()
        await fetchStatusCounts()
        return { ok: true, reason: null, emailSent: r.emailSent }
      case 'sem-papel':
        return { ok: false, reason: 'not_admin', emailSent: false }
      case 'material-recusado':
        return { ok: false, reason: r.reason ?? 'invalid_transition', emailSent: false }
      default:
        return { ok: false, reason: 'rpc_failed', emailSent: false }
    }
  }

  /**
   * MAT-11 — o rastreio da remessa da cliente, registrado pela Adri (o caso do WhatsApp).
   *
   * A **mesma** RPC que a loja chama: cliente e admin fazem a mesma coisa, e duas funções seriam
   * duas máquinas de estado que divergem no primeiro ajuste.
   */
  const setMaterialTracking = async (id: string, code: string) => {
    // Feature `82` (`ENV-14`): a RPC e o aviso moram no dono (`writeMaterialTracking`), o mesmo que o
    // app do ateliê chama. O gatilho é o MESMO que a loja dispara quando a própria cliente registra
    // (`NTF-13`): dois gatilhos para o mesmo fato seriam duas mensagens para a mesma cliente. A
    // tradução devolve a forma de sempre: `ok: false` sem motivo continua `not_allowed`, e a falha
    // continua `rpc_failed` (a exceção síncrona do client também, como em `setMaterialStatus`).
    const r = await writeMaterialTracking({ client: supabase, notify: notifyOrder }, { id, code })
    switch (r.tipo) {
      case 'ok':
        await fetchOrders()
        await fetchStatusCounts()
        return { ok: true, reason: null }
      case 'recusado':
        return { ok: false, reason: r.reason ?? 'not_allowed' }
      case 'nao-permitido':
        return { ok: false, reason: 'not_allowed' }
      default:
        return { ok: false, reason: 'rpc_failed' }
    }
  }

  const addNote = async (orderId: string, note: string) => {
    const { error } = await supabase.from('order_notes').insert({ order_id: orderId, note })
    return error
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return {
    orders, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    dateFrom, setDateFrom, dateTo, setDateTo,
    paymentFilter, setPaymentFilter,
    materialFilter, setMaterialFilter,
    page, setPage, totalPages, totalCount,
    statusCounts, materialCounts,
    fetchOrders, getOrderItems, updateStatus,
    getStatusHistory, getNotes, cancelOrder, addTrackingCode, addNote,
    setMaterialStatus, setMaterialTracking,
  }
}
