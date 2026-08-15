import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbOrder, DbOrderItem, DbOrderStatusHistory, DbOrderNote } from '@estrelinha/supabase/types'
import { sendOrderEmail } from './sendOrderEmail'

export const ORDER_STATUSES = ['pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  separating: 'Em Separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const PAGE_SIZE = 20

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
    const currentOrder = orders.find(o => o.id === id)
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) return { error, emailSent: false }

    await supabase.from('order_status_history').insert({
      order_id: id,
      from_status: currentOrder?.status ?? null,
      to_status: status,
      note: note || null,
    })
    // TRG-12: um dos dois lados do par. Se o rastreio ainda não foi salvo, a function devolve 422 e
    // isto é no-op silencioso — o e-mail sai quando `addTrackingCode` completar o par.
    const emailSent = status === 'shipped' ? await sendOrderEmail(id, 'order_shipped') : false
    await fetchOrders()
    await fetchStatusCounts()
    return { error: null, emailSent }
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
      await fetchOrders()
      await fetchStatusCounts()
    }
    return error
  }

  const addTrackingCode = async (id: string, trackingCode: string, carrier: string) => {
    const { error } = await supabase.from('orders').update({ tracking_code: trackingCode, shipping_carrier: carrier }).eq('id', id)
    if (error) return { error, emailSent: false }

    // O outro lado do par (TRG-12), tentado SEMPRE: se o pedido já está `shipped`, salvar o rastreio é
    // o que completa e dispara. Se ainda não está, 422 e nada acontece. Cobre também o caminho do
    // Melhor Envio, que grava o rastreio sem tocar em `status`.
    const emailSent = await sendOrderEmail(id, 'order_shipped')
    await fetchOrders()
    return { error: null, emailSent }
  }

  /**
   * MAT-08 — a transição do material. **Só por RPC**, nunca `update` direto.
   *
   * `set_material_status` guarda os estados de origem permitidos no próprio `where`, o que a torna
   * idempotente sob concorrência: duas admins clicando ao mesmo tempo convergem para o resultado de
   * uma só. Um `update` daqui contornaria a máquina de estado inteira.
   */
  const setMaterialStatus = async (id: string, status: string) => {
    const { data, error } = await supabase.rpc('set_material_status', {
      p_order_id: id,
      p_status: status,
    })
    if (error) return { ok: false, reason: 'rpc_failed', emailSent: false }

    const resultado = (data ?? {}) as { ok?: boolean; reason?: string | null }
    if (resultado.ok !== true) {
      return { ok: false, reason: resultado.reason ?? 'invalid_transition', emailSent: false }
    }

    // MAT-09 + AD-008: o e-mail é contido. `sendOrderEmail` devolve booleano e NUNCA lança — falha
    // de envio não reverte o estado nem vira erro para a admin. Ela acabou de conferir o envelope na
    // bancada; desfazer isso porque o Resend caiu seria pior do que não avisar a cliente.
    const emailSent =
      status === 'material_recebido' ? await sendOrderEmail(id, 'material_received') : false

    await fetchOrders()
    await fetchStatusCounts()
    return { ok: true, reason: null, emailSent }
  }

  /**
   * MAT-11 — o rastreio da remessa da cliente, registrado pela Adri (o caso do WhatsApp).
   *
   * A **mesma** RPC que a loja chama: cliente e admin fazem a mesma coisa, e duas funções seriam
   * duas máquinas de estado que divergem no primeiro ajuste.
   */
  const setMaterialTracking = async (id: string, code: string) => {
    const { data, error } = await supabase.rpc('set_material_tracking', {
      p_order_id: id,
      p_code: code,
    })
    if (error) return { ok: false, reason: 'rpc_failed' }

    const resultado = (data ?? {}) as { ok?: boolean; reason?: string | null }
    if (resultado.ok !== true) {
      return { ok: false, reason: resultado.reason ?? 'not_allowed' }
    }

    await fetchOrders()
    await fetchStatusCounts()
    return { ok: true, reason: null }
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
