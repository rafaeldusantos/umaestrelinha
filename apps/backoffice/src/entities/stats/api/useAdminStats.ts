import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbOrder } from '@estrelinha/supabase/types'

interface TopProduct {
  id: string
  name: string
  image: string | null
  quantity: number
}

interface SalesDataPoint {
  date: string
  revenue: number
}

// Feature 71 · `VIS-35` (assunção PENDENTE de confirmação do usuário): `ordersToday` e
// `revenueToday` saíram. Eles definiam "hoje" pelo dia em UTC e contavam pedido criado, inclusive PIX
// não pago — ao lado do bloco "Movimento da loja" dariam duas respostas para "quanto vendi hoje?".
// O gráfico e o "Fat. do Mês" continuam na régua antiga, declarada no backlog (`BL-046`).
interface AdminStats {
  monthRevenue: number
  activeProducts: number
  newCustomers: number
  pendingOrders: number
  lowStockProducts: number
  recentOrders: DbOrder[]
  topProducts: TopProduct[]
  salesData: SalesDataPoint[]
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    monthRevenue: 0, activeProducts: 0,
    newCustomers: 0, pendingOrders: 0, lowStockProducts: 0,
    recentOrders: [], topProducts: [], salesData: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [
      { data: monthOrders },
      { count: activeCount },
      { count: custCount },
      { data: recent },
      { count: pendingCount },
      { count: lowStockCount },
      { data: last30Orders },
      { data: weekItems },
    ] = await Promise.all([
      supabase.from('orders').select('total').gte('created_at', monthStart).neq('status', 'cancelled'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).lte('stock_total', 5),
      supabase.from('orders').select('total, created_at').gte('created_at', thirtyDaysAgo).neq('status', 'cancelled'),
      supabase.from('order_items').select('product_id, product_name, product_image, quantity').gte('created_at', sevenDaysAgo),
    ])

    // Sales data grouped by day
    const salesMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      salesMap.set(d, 0)
    }
    last30Orders?.forEach((o: any) => {
      const d = new Date(o.created_at).toISOString().slice(0, 10)
      salesMap.set(d, (salesMap.get(d) || 0) + (o.total || 0))
    })
    const salesData = Array.from(salesMap.entries()).map(([date, revenue]) => ({ date, revenue }))

    // Top products
    const productMap = new Map<string, TopProduct>()
    weekItems?.forEach((item: any) => {
      const existing = productMap.get(item.product_id)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        productMap.set(item.product_id, {
          id: item.product_id,
          name: item.product_name,
          image: item.product_image,
          quantity: item.quantity,
        })
      }
    })
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    setStats({
      monthRevenue: monthOrders?.reduce((sum, o: any) => sum + (o.total || 0), 0) ?? 0,
      activeProducts: activeCount ?? 0,
      newCustomers: custCount ?? 0,
      pendingOrders: pendingCount ?? 0,
      lowStockProducts: lowStockCount ?? 0,
      recentOrders: recent ?? [],
      topProducts,
      salesData,
    })
    setLoading(false)
  }, [])

  // Feature 71 · `VIS-10 (d)`: o hook NÃO assina o canal de pedidos. O dono do canal é
  // `useOrdersRealtime` (`entities/order`), chamado uma vez pelo Dashboard, que repassa o aviso a
  // `refetch` e ao bloco "Movimento da loja" — dois canais seriam duas inscrições para o mesmo aviso.
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refetch: fetchStats }
}
