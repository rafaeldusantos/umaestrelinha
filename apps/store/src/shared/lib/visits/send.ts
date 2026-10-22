// O envio da visita à function `visit` (feature `71`, `VIS-13`, `VIS-18`).
//
// **`fetch` cru, nunca `supabase.functions.invoke`**: o `invoke` anexa o JWT da sessão, e a visita
// de uma cliente logada levaria o token dela a uma function pública que não tem o que fazer com ele.
// Vai só a chave publicável (`apikey`), que o gateway exige, e `credentials: 'omit'`.
//
// **Sem `keepalive`**: a chamada é agendada fora do descarregamento da página (`VisitCounter`), e
// `keepalive` com preflight de CORS tem suporte irregular entre navegadores.
//
// A URL e a chave vêm de `@estrelinha/supabase`, o único leitor das duas env do navegador.

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@estrelinha/supabase'
import { visitBody } from '@estrelinha/core/visits'

/**
 * O que a loja precisa da resposta: o status e, quando os dois vieram como números finitos, o
 * relógio do servidor (`ate`, a próxima 00:00 de Brasília; `agora`, o instante dele). Resposta sem
 * relógio conta como falha (`VIS-18`) — inclusive um `429` sem ele. Rede que rejeita é `status: 0`.
 */
export interface VisitResponse {
  status: number
  ate?: number
  agora?: number
}

const numeroFinito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export async function postVisit(id: string): Promise<VisitResponse> {
  let resposta: Response
  try {
    resposta = await fetch(`${SUPABASE_URL}/functions/v1/visit`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(visitBody(id)),
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
  if (numeroFinito(c.ate) && numeroFinito(c.agora)) {
    return { status: resposta.status, ate: c.ate, agora: c.agora }
  }
  return { status: resposta.status }
}
