import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@nanapin/supabase/client'

export interface AdminCustomer {
  id: string
  user_id: string | null
  name: string
  email: string
  cpf: string | null
  phone: string | null
  created_at: string
  order_count?: number
}

export const useAdminCustomers = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*, orders(count)')
      .order('created_at', { ascending: false })

    if (error || !data) {
      setCustomers([])
    } else {
      setCustomers(data.map((c: any) => ({
        ...c,
        order_count: c.orders?.[0]?.count ?? 0,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const getCustomerOrders = async (customerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    return data ?? []
  }

  return { customers, loading, fetchCustomers, getCustomerOrders }
}
