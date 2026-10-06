// Feature 61 · `ANL-10`/`ANL-11` — "as compras estão chegando ao Google?".
//
// Quem envia a compra é o servidor (`AD-047`), e ele grava o desfecho no próprio pedido:
// `orders.ga_purchase_status` e `orders.ga_purchase_at`. O painel só **lê** isso — admin já lê
// `orders` por RLS —, e nunca recalcula nada: "foi enviado?" tem um dono, e é a coluna.
//
// ## Três leituras, e duas delas não trazem linha nenhuma
//
// - o último envio bem-sucedido: **uma** linha, `limit(1)`;
// - quantos pedidos aprovados nos últimos 30 dias ficaram fora por **recusa** da cliente;
// - quantos ficaram fora por **falha** no envio.
//
// As duas contagens são `count: 'exact', head: true`: o servidor conta e nenhuma linha atravessa a
// rede — não há teto de 1.000 a herdar (`BL-008`). O recorte de 30 dias é por `paid_at`, que é o
// instante da aprovação: é a aprovação que dispara o envio.
//
// ## "enviado", nunca "aceito"
//
// O Measurement Protocol responde 2xx para quase tudo, inclusive para corpo que ele descarta. O que
// o servidor sabe é que **enviou**; se o Google contou, só o DebugView diz. A tela escreve "enviado
// ao Google" por isso (`design.md`, *Risks*).

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

export interface LastPurchaseSend {
  id: string
  order_number: string | null
  total: number
  ga_purchase_at: string
}

export interface PurchaseSendSummary {
  /** `null` ⇒ nenhuma compra foi enviada ainda (`ANL-11`). */
  last: LastPurchaseSend | null
  /** Aprovados em 30 dias que não foram enviados porque a cliente desligou as estatísticas. */
  declined: number
  /** Aprovados em 30 dias cujo envio falhou. */
  failed: number
}

export const PURCHASE_SEND_WINDOW_DAYS = 30

const DIA_MS = 24 * 60 * 60 * 1000

/** O começo da janela, em ISO. Recebe `agora` para o teste não depender do relógio da máquina. */
export const windowStart = (agora: Date): string =>
  new Date(agora.getTime() - PURCHASE_SEND_WINDOW_DAYS * DIA_MS).toISOString()

const contar = async (status: 'skipped_declined' | 'failed', desde: string): Promise<number> => {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('ga_purchase_status', status)
    .gte('paid_at', desde)
  if (error) throw error
  return count ?? 0
}

export const fetchPurchaseSendSummary = async (
  agora: Date = new Date(),
): Promise<PurchaseSendSummary> => {
  const desde = windowStart(agora)

  const [ultima, declined, failed] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, ga_purchase_at')
      .eq('ga_purchase_status', 'sent')
      .order('ga_purchase_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    contar('skipped_declined', desde),
    contar('failed', desde),
  ])

  if (ultima.error) throw ultima.error

  const linha = ultima.data as LastPurchaseSend | null
  return {
    last: linha ? { ...linha, total: Number(linha.total) } : null,
    declined,
    failed,
  }
}

export const PURCHASE_SEND_SUMMARY_KEY = ['google-analytics', 'last-send'] as const

export const useLastPurchaseSend = () =>
  useQuery({
    queryKey: PURCHASE_SEND_SUMMARY_KEY,
    queryFn: () => fetchPurchaseSendSummary(),
    staleTime: 1000 * 60,
  })
