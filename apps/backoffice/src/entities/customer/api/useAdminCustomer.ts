// `CLI-08`..`CLI-13` — uma pessoa, para a rota `/admin/clientes/:id`.
//
// Lê `customer_list` (que já traz o agregado), os pedidos por vínculo, os endereços e as notas
// internas. Funciona igual para cadastro e para convidada — o id da convidada é derivado do e-mail
// e é estável, então a rota é compartilhável nos dois casos.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbAddress, DbCustomerNote, DbOrder } from '@estrelinha/supabase/types'
import type { CustomerListRow } from './customerQuery'

/**
 * Um pedido da ficha, com o **resumo do que ela comprou** — `CLI-11`.
 *
 * A linha da ficha mostra "Pingente Gota · Cinzas + Caixinha de guarda", e isso não está em `orders`:
 * é `order_items`. Sem os itens, a linha só teria número e valor, e a pergunta que se faz olhando o
 * histórico de alguém é justamente **o que** ela levou.
 */
export interface CustomerOrderRow extends DbOrder {
  /** Os nomes dos produtos, na ordem em que foram gravados. */
  item_names: string[]
}

export interface AdminCustomerDetail {
  customer: CustomerListRow | null
  orders: CustomerOrderRow[]
  addresses: DbAddress[]
  notes: DbCustomerNote[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  addNote: (note: string) => Promise<string | null>
  anonymize: () => Promise<{ ok: boolean; reason: string | null; ordersPreserved: number }>
}

export const useAdminCustomer = (id: string | undefined): AdminCustomerDetail => {
  const [customer, setCustomer] = useState<CustomerListRow | null>(null)
  const [orders, setOrders] = useState<CustomerOrderRow[]>([])
  const [addresses, setAddresses] = useState<DbAddress[]>([])
  const [notes, setNotes] = useState<DbCustomerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setError('Cliente não informada')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('customer_list')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (queryError) {
      setError(queryError.message ?? 'Não foi possível carregar a cliente')
      setCustomer(null)
      setLoading(false)
      return
    }

    if (!data) {
      setCustomer(null)
      setLoading(false)
      return
    }

    const pessoa = data as CustomerListRow
    setCustomer(pessoa)

    // O vínculo é por id OU por e-mail — a mesma regra da view. Um pedido feito como convidada
    // ANTES de a pessoa criar conta tem `customer_id` nulo e só casa pelo e-mail; ignorá-lo faria a
    // ficha mostrar menos pedidos do que o agregado do topo conta, e os dois números brigariam.
    const [pedidosRes, enderecosRes, notasRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .or(`customer_id.eq.${id},customer_email.ilike.${pessoa.email}`)
        .order('created_at', { ascending: false }),
      // `CLI-09` — a tabela `addresses` existe desde a migration inicial e o painel NUNCA a leu.
      supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', id)
        .order('is_default', { ascending: false }),
      supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
    ])

    const pedidos = (pedidosRes.data ?? []) as DbOrder[]

    // Os nomes dos itens, em UMA leitura para todos os pedidos da ficha — não uma por linha. Com
    // `in`, a pessoa com 12 compras custa a mesma ida ao banco que a com uma.
    const idsDosPedidos = pedidos.map(o => o.id)
    const { data: itens } = idsDosPedidos.length
      ? await supabase
          .from('order_items')
          .select('order_id, product_name, created_at')
          .in('order_id', idsDosPedidos)
          .order('created_at', { ascending: true })
      : { data: [] as { order_id: string; product_name: string }[] }

    const porPedido = new Map<string, string[]>()
    for (const item of (itens ?? []) as { order_id: string; product_name: string }[]) {
      porPedido.set(item.order_id, [...(porPedido.get(item.order_id) ?? []), item.product_name])
    }

    setOrders(pedidos.map(o => ({ ...o, item_names: porPedido.get(o.id) ?? [] })))
    setAddresses((enderecosRes.data ?? []) as DbAddress[])
    setNotes((notasRes.data ?? []) as DbCustomerNote[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  const addNote = useCallback(
    async (note: string): Promise<string | null> => {
      if (!id) return 'Cliente não informada'
      // Payload em igualdade exata (`TST-05`): só `customer_id` e `note`. `created_by` fica a cargo
      // do banco, e um campo novo não entra na escrita sem alguém decidir.
      const { error: writeError } = await supabase
        .from('customer_notes')
        .insert({ customer_id: id, note })
      if (writeError) return writeError.message
      await reload()
      return null
    },
    [id, reload],
  )

  const anonymize = useCallback(async () => {
    if (!id) return { ok: false, reason: 'sem_id', ordersPreserved: 0 }

    // `CLI-13` — escrita destrutiva sobre dado sensível **só por RPC guardada**, nunca `update`
    // direto. Mesma regra de `set_material_status`.
    const { data, error: rpcError } = await supabase.rpc('anonymize_customer', {
      p_customer_id: id,
    })

    if (rpcError) return { ok: false, reason: 'rpc_failed', ordersPreserved: 0 }

    const r = (data ?? {}) as { ok?: boolean; reason?: string | null; orders_preserved?: number }
    if (r.ok === true) await reload()

    return {
      ok: r.ok === true,
      reason: r.reason ?? null,
      ordersPreserved: r.orders_preserved ?? 0,
    }
  }, [id, reload])

  return { customer, orders, addresses, notes, loading, error, reload, addNote, anonymize }
}
