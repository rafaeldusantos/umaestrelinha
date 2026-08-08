import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { DbAbandonedCart, AbandonedCartStatus } from '@estrelinha/supabase/types/abandonedCart'

export const STATUS_LABELS: Record<AbandonedCartStatus, string> = {
  active: 'Ativo',
  abandoned: 'Abandonado',
  recovered: 'Recuperado',
  lost: 'Perdido',
}

export const STATUS_COLORS: Record<AbandonedCartStatus, string> = {
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  abandoned: 'bg-orange-100 text-orange-700 border-orange-200',
  recovered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

interface Filters {
  status: AbandonedCartStatus | 'all'
  search: string
  hasReminder: 'all' | 'yes' | 'no'
}

export function useAdminAbandonedCarts() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    search: '',
    hasReminder: 'all',
  })

  const query = useQuery({
    queryKey: ['admin', 'abandoned_carts'],
    queryFn: async (): Promise<DbAbandonedCart[]> => {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .limit(500)
      if (error) {
        // Tabela ainda não criada → retorna vazio
        return []
      }
      return (data || []) as DbAbandonedCart[]
    },
    staleTime: 1000 * 30,
  })

  const all = query.data ?? []

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.hasReminder === 'yes' && !c.reminder_sent_at) return false
      if (filters.hasReminder === 'no' && c.reminder_sent_at) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !c.customer_email.toLowerCase().includes(q) &&
          !(c.customer_name?.toLowerCase().includes(q) ?? false)
        )
          return false
      }
      return true
    })
  }, [all, filters])

  // Métricas (sobre todos, não sobre filtrados)
  const metrics = useMemo(() => {
    const total = all.length
    const recovered = all.filter((c) => c.status === 'recovered').length
    const abandoned = all.filter((c) => c.status === 'abandoned').length
    const active = all.filter((c) => c.status === 'active').length
    const recoveredValue = all
      .filter((c) => c.status === 'recovered')
      .reduce((sum, c) => sum + Number(c.subtotal), 0)
    const abandonedValue = all
      .filter((c) => c.status === 'abandoned' || c.status === 'lost')
      .reduce((sum, c) => sum + Number(c.subtotal), 0)
    const recoveryRate = total > 0 ? (recovered / total) * 100 : 0
    const avgTicket = recovered > 0 ? recoveredValue / recovered : 0

    return {
      total,
      active,
      recovered,
      abandoned,
      recoveredValue,
      abandonedValue,
      recoveryRate,
      avgTicket,
    }
  }, [all])

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AbandonedCartStatus }) => {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'abandoned_carts'] }),
  })

  const deleteCart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('abandoned_carts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'abandoned_carts'] }),
  })

  return {
    carts: filtered,
    allCarts: all,
    loading: query.isLoading,
    error: query.error,
    metrics,
    filters,
    setFilters,
    updateStatus,
    deleteCart,
    refetch: query.refetch,
  }
}
