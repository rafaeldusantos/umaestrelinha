// O pulso de presença na loja — a ação `ping` da function `visit`.
//
// Separado de `handlers.ts` (a visita única) porque são dois portões com donos diferentes, e de
// `index.ts` (wiring) por `AD-004`: sem `Deno.env` e sem `esm.sh`, carrega no vitest.
//
// Os portões, nesta ordem, e cada resposta escreve UMA linha de log (`{ fn, acao, desfecho }`):
//
//   1  outro método que não POST          ⇒ 405, `inválido`
//   2  teto por IP próprio (sem IP, libera) ⇒ 429, `limite` — sem tocar o banco
//   3  o corpo (`presenceBodyRefusal`)    ⇒ 400, `inválido`
//   4  user agent de robô ou IP de data center ⇒ 200, `robô`, sem gravar
//   5  `Origin` ausente ou ilegível       ⇒ 200, `interno`, sem gravar
//   6  `record_store_presence`            ⇒ 200, `gravada`/`interno`/`teto`; falha ⇒ 500, `erro`
//
// O pulso NÃO lê `store_clock`: o host de produção é comparado dentro da gravação, e o relógio
// (`ate`, `agora`) volta com ela. O user agent é lido para a faixa do aparelho (`deviceBucket`) e
// para o filtro de robô, e NUNCA vai à RPC nem ao log. O handler não lê `Authorization`.

import { isBotUserAgent } from '../../../packages/core/src/visits/bots.ts'
import { requestFromDatacenter } from '../../../packages/core/src/visits/datacenter.ts'
import { presenceBodyRefusal, type PresenceBody } from '../../../packages/core/src/visits/presence.ts'
import { deviceBucket } from '../../../packages/core/src/live/buckets.ts'
import { json } from '../_shared/http.ts'
import { clientIp, type RateLimiter } from '../_shared/rateLimit.ts'

export interface PingDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  limiter: RateLimiter
  log: (linha: Record<string, unknown>) => void
}

const DESFECHOS_DA_GRAVACAO: readonly string[] = ['gravada', 'interno', 'teto']

const ehInteiro = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function hostDaOrigem(origem: string | null): string | null {
  if (!origem) return null
  try {
    return new URL(origem).host || null
  } catch {
    return null
  }
}

export async function routePing(deps: PingDeps, req: Request): Promise<Response> {
  const responder = (desfecho: string, corpo: unknown, status: number, extra: Record<string, unknown> = {}) => {
    deps.log({ fn: 'visit', acao: 'ping', desfecho, ...extra })
    return json(corpo, status)
  }

  if (req.method !== 'POST') return responder('inválido', { error: 'método não permitido' }, 405, { motivo: 'metodo' })

  const ip = clientIp(req)
  if (ip && !deps.limiter.hit(ip)) return responder('limite', { error: 'muitos pulsos deste endereço' }, 429)

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    corpo = undefined
  }
  const recusa = presenceBodyRefusal(corpo)
  if (recusa !== null) return responder('inválido', { error: 'corpo inválido' }, 400, { motivo: recusa })
  const b = corpo as PresenceBody

  const ua = req.headers.get('user-agent')
  if (isBotUserAgent(ua)) return responder('robô', { desfecho: 'robô' }, 200)
  if (requestFromDatacenter((nome) => req.headers.get(nome))) {
    return responder('robô', { desfecho: 'robô' }, 200, { motivo: 'rede' })
  }

  const host = hostDaOrigem(req.headers.get('origin'))
  if (host === null) return responder('interno', { desfecho: 'interno' }, 200)

  const { data, error } = await deps.supabase.rpc('record_store_presence', {
    p_id: b.id,
    p_page_kind: b.page,
    p_product_slug: b.product,
    p_cart_items: b.cart,
    p_source: b.source,
    p_device: deviceBucket(ua),
    p_host: host,
  })
  if (error) return responder('erro', { error: 'falha ao gravar' }, 500, { codigo: error.code ?? null })

  const d = (data && typeof data === 'object' ? data : {}) as { desfecho?: unknown; ate?: unknown; agora?: unknown }
  if (typeof d.desfecho !== 'string' || !DESFECHOS_DA_GRAVACAO.includes(d.desfecho) || !ehInteiro(d.ate) || !ehInteiro(d.agora)) {
    return responder('erro', { error: 'resposta inesperada' }, 500)
  }
  return responder(d.desfecho, { desfecho: d.desfecho, ate: d.ate, agora: d.agora }, 200)
}
