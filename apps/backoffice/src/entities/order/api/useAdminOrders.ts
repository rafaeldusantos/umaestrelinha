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
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  const fetchStatusCounts = useCallback(async () => {
    const { data } = await supabase.from('orders').select('status')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
      setStatusCounts(counts)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (paymentFilter !== 'all') query = query.eq('payment_method', paymentFilter)
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
  }, [statusFilter, paymentFilter, dateFrom, dateTo, searchQuery, page])

  useEffect(() => { setPage(1) }, [statusFilter, paymentFilter, dateFrom, dateTo, searchQuery])

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
    page, setPage, totalPages, totalCount,
    statusCounts,
    fetchOrders, getOrderItems, updateStatus,
    getStatusHistory, getNotes, cancelOrder, addTrackingCode, addNote,
  }
}
