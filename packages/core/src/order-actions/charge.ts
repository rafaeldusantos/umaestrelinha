// Fechar a cobrança aberta de um pedido no Mercado Pago — pela porta da `mercado-pago`
// (`?action=close-charge`, só admin), que cancela a order do MP: o PIX copiado antes ou o cartão em
// análise deixam de poder ser pagos. O painel chama ao cancelar e ao registrar o pagamento à mão.
//
// Nunca lança: o cancelamento ou o registro já foram gravados quando isto roda, e a cobrança que não
// fecha não os desfaz. O pagamento que ainda assim for aprovado vira marcador no banco.
//
// O client é injetado; o supabase-js entra só como tipo (`purity.test.ts`).

import type { OrderWriteClient } from './types.ts'

/** O desfecho, por STRING. `falhou` é a porta que não respondeu ou respondeu o que não se reconhece. */
export type ChargeCloseOutcome = 'fechada' | 'nao_fechada' | 'sem_cobranca' | 'falhou'

const DESFECHOS: readonly string[] = ['fechada', 'nao_fechada', 'sem_cobranca']

export async function closeOrderCharge(
  client: Pick<OrderWriteClient, 'functions'>,
  orderId: string,
): Promise<ChargeCloseOutcome> {
  try {
    const resposta = await client.functions.invoke('mercado-pago?action=close-charge', { body: { order_id: orderId } })
    if (!resposta || resposta.error) return 'falhou'
    const result = (resposta.data as { result?: string } | null)?.result ?? ''
    return DESFECHOS.includes(result) ? (result as ChargeCloseOutcome) : 'falhou'
  } catch {
    return 'falhou'
  }
}
