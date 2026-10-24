import { CUSTOMER_ORDERS_PAGE_SIZE, customerOrdersCondition } from '@estrelinha/core/customers'
import { cursorFilter, type OrderCursor } from '@estrelinha/core/orders'
import { supabase } from '@estrelinha/supabase/client'

import { useJanelaPaginada } from '@/shared/api/useJanelaPaginada'
import { ler } from '@/shared/api/lerSemLancar'

import { COLUNAS_DO_PEDIDO, COLUNAS_DOS_ITENS, type PedidoDaFicha } from '../model/linha'

/**
 * Os pedidos de uma cliente (feature `76`, `MAC-18`, `MAC-19`, `MAC-22`, `MAC-11`, `MAC-12`) — a MESMA
 * máquina de janela da lista (`useJanelaPaginada`), sem segunda escrita. Uma segunda query da ficha:
 * a falha dos pedidos derruba só este bloco, e o cabeçalho e o contato continuam na tela.
 *
 * - `habilitada` só com o cabeçalho lido: o e-mail vem dele (o vínculo é por `customer_id` OU e-mail
 *   exato, `customerOrdersCondition` — sem curinga, A10);
 * - 20 por página (`CUSTOMER_ORDERS_PAGE_SIZE`), do mais novo ao mais antigo, `created_at` e `id` por
 *   cursor (as strings do servidor, R1);
 * - **dentro da consulta**, uma leitura `order_items` `.in('order_id', ids)` para os nomes — uma por
 *   janela, não uma por linha —, o primeiro item de cada pedido (`created_at`, depois `id`: estável).
 *   Se ela falha, as linhas saem SEM o item e a janela vive (`MAC-18`).
 */

export const PEDIDOS_DA_CLIENTE_KEY = 'atelie-cliente-pedidos'
export const chaveDosPedidosDoCliente = (id: string) => [PEDIDOS_DA_CLIENTE_KEY, id] as const

type LinhaDoPedido = Omit<PedidoDaFicha, 'item'>

/** O primeiro item de cada pedido; qualquer falha devolve um mapa vazio (as linhas saem sem o nome). */
const nomesDosItens = async (ids: string[]): Promise<Map<string, string>> => {
  const nomes = new Map<string, string>()
  if (ids.length === 0) return nomes
  const itens = await ler<{ order_id: string; product_name: string }[]>(() =>
    supabase
      .from('order_items')
      .select(COLUNAS_DOS_ITENS)
      .in('order_id', ids)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  )
  if (itens.error) return nomes
  for (const i of itens.data ?? []) if (!nomes.has(i.order_id)) nomes.set(i.order_id, i.product_name)
  return nomes
}

interface Leitura {
  limite: number
  cursor?: OrderCursor
  contar: boolean
}

/** A consulta — a única cadeia de leitura dos pedidos. Lança o erro do supabase-js (ele não rejeita). */
const consultaDosPedidos = async (id: string, email: string, { limite, cursor, contar }: Leitura) => {
  let q = contar
    ? supabase.from('order_list').select(COLUNAS_DO_PEDIDO, { count: 'exact' })
    : supabase.from('order_list').select(COLUNAS_DO_PEDIDO)
  q = q.or(customerOrdersCondition(id, email))
  if (cursor) q = q.or(cursorFilter(cursor, 'desc'))
  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limite)
  if (error) throw error
  const linhas = (data ?? []) as unknown as LinhaDoPedido[]
  const nomes = await nomesDosItens(linhas.map((l) => l.id))
  return { linhas: linhas.map((l): PedidoDaFicha => ({ ...l, item: nomes.get(l.id) ?? null })), count: count ?? null }
}

export const usePedidosDoCliente = (id: string, email: string | null | undefined) =>
  useJanelaPaginada<PedidoDaFicha, OrderCursor>({
    chave: chaveDosPedidosDoCliente(id),
    tamanhoDaPagina: CUSTOMER_ORDERS_PAGE_SIZE,
    consultar: (p) => consultaDosPedidos(id, email ?? '', p),
    cursorDe: (ultima) => ({ created_at: ultima.created_at, id: ultima.id }),
    habilitada: Boolean(email),
  })
