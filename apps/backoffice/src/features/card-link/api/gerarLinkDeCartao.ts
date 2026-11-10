// A porta "gerar link de cartão" (function `mercado-pago`, ação `card-link`, só admin). O servidor
// confere o pedido pela mesma regra do botão (`cardLinkRefusal`), grava só o hash do token — revogando
// o link anterior do pedido — e fecha a cobrança aberta no Mercado Pago. Ela devolve o link pronto,
// montado com a origem da loja; o token vem só nesta resposta, dentro do link.
import { supabase } from '@estrelinha/supabase/client'

/** União por literal de STRING (estreita sem `strictNullChecks`). */
export type GerarLinkDeCartao =
  | { tipo: 'ok'; link: string }
  | { tipo: 'recusado'; motivo: string }
  | { tipo: 'falhou' }

async function corpoDoErro(error: unknown): Promise<Record<string, unknown> | null> {
  try {
    const context = (error as { context?: Response })?.context
    return ((await context?.json()) as Record<string, unknown>) ?? null
  } catch {
    return null
  }
}

export async function gerarLinkDeCartao(orderId: string): Promise<GerarLinkDeCartao> {
  try {
    const { data, error } = await supabase.functions.invoke('mercado-pago?action=card-link', {
      body: { order_id: orderId },
    })
    if (!error && typeof data?.link === 'string' && data.link) return { tipo: 'ok', link: data.link }
    const corpo = await corpoDoErro(error)
    const status = (error as { context?: Response })?.context?.status
    // 409: o pedido não pode receber link; 503: a loja não está configurada no servidor. Nos dois a
    // function diz por quê, e nada foi emitido.
    if ((status === 409 || status === 503) && typeof corpo?.error === 'string') {
      return { tipo: 'recusado', motivo: corpo.error }
    }
    return { tipo: 'falhou' }
  } catch {
    return { tipo: 'falhou' }
  }
}
