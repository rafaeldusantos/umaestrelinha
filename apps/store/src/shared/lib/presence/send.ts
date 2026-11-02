// O envio do pulso de presença à function `visit` (`?action=ping`).
//
// **`fetch` cru com só a chave publicável**, nunca `supabase.functions.invoke` — o `invoke` anexaria
// o JWT da sessão, e a presença não carrega a identidade de quem está logada. `credentials: 'omit'`.
// É o ÚNICO arquivo da presença que faz rede.

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@estrelinha/supabase'
import { presenceBody, type PresenceBody } from '@estrelinha/core/visits'

/** O status e, quando vieram numéricos, o prazo do id (`ate`) e o instante do servidor (`agora`). */
export interface PresenceResponse {
  status: number
  ate?: number
  agora?: number
}

const numeroFinito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export async function postPresence(body: PresenceBody): Promise<PresenceResponse> {
  let resposta: Response
  try {
    resposta = await fetch(`${SUPABASE_URL}/functions/v1/visit?action=ping`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(presenceBody(body)),
    })
  } catch {
    return { status: 0 }
  }
  let corpo: unknown = null
  try {
    corpo = await resposta.json()
  } catch {
    return { status: resposta.status }
  }
  const c = (corpo && typeof corpo === 'object' ? corpo : {}) as { ate?: unknown; agora?: unknown }
  if (numeroFinito(c.ate) && numeroFinito(c.agora)) return { status: resposta.status, ate: c.ate, agora: c.agora }
  return { status: resposta.status }
}
