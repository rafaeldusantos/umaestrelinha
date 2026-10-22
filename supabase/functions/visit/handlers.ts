// Handlers da edge function `visit` — a gravação de uma visita única (feature `71`, `AD-055`).
//
// Separado de `index.ts` (que só faz wiring) por `AD-004`: sem `Deno.env` e sem import de `esm.sh`
// aqui, este módulo carrega no vitest.
//
// Os portões, nesta ordem (`design.md`, C10), e cada resposta registra UMA linha de log, menos o
// preflight:
//
//   0a  OPTIONS                      ⇒ preflight, sem log (não é resposta a uma visita)
//   0b  outro método que não POST    ⇒ 405, `inválido`
//   1   teto por IP (sem IP, libera) ⇒ 429 com o relógio do cache — ou de `store_clock`, ou sem
//                                       relógio quando nem ela responde; desfecho `limite`
//   2   o corpo (`visitBodyRefusal`) ⇒ 400, `inválido`
//   3   `store_clock` fresco          ⇒ falha ⇒ 500, `erro`
//   4   user agent de robô           ⇒ 200, `robô`, sem gravar
//   5   origem fora do host de produção (ou ausente, ou ilegível) ⇒ 200, `interno`, sem gravar
//   6   `record_store_visit`          ⇒ 200, `gravada`/`repetida`/`teto`; falha ⇒ 500, `erro`
//
// O handler NUNCA lê `Authorization` (`VIS-29`): a visita é anônima, e a loja manda só a chave
// publicável. E o log nunca carrega id, IP nem user agent — a linha diz o desfecho e nada mais.
//
// O dia de Brasília não é calculado aqui. Quem decide é o banco (`store_day`), e o handler repassa o
// que as duas RPCs devolvem.

import { isBotUserAgent } from '../../../packages/core/src/visits/bots.ts'
import { visitBodyRefusal } from '../../../packages/core/src/visits/visitor.ts'
import { trafficType } from '../../../packages/core/src/analytics/host.ts'
import { json, preflight } from '../_shared/http.ts'
import { clientIp, type RateLimiter } from '../_shared/rateLimit.ts'

export interface Clock {
  dia: string
  /** Epoch em ms da próxima 00:00 de Brasília. */
  ate: number
  /** Epoch em ms do instante do servidor. */
  agora: number
}

/** O relógio guardado só para o `429` não ler o banco a cada recusa. */
export interface ClockCache {
  get(now: number): Clock | null
  set(c: Clock): void
}

export type Desfecho =
  | 'gravada'
  | 'repetida'
  | 'robô'
  | 'interno'
  | 'inválido'
  | 'limite'
  | 'teto'
  | 'erro'

/** Tudo que o handler toca fora do próprio processo. O wiring (`index.ts`) fornece o real. */
export interface Deps {
  // Client service-role. `any` porque o import real vem de esm.sh (Deno) e o dublê do teste
  // implementa só a superfície usada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  now: () => number
  limiter: RateLimiter
  /** Injetado: em estado de módulo, o relógio de um caso de teste vazaria para o seguinte. */
  clock: ClockCache
  log: (linha: Record<string, unknown>) => void
}

/** Um cache de um relógio só, que vale até o próprio `ate` (a virada do dia o invalida). */
export function createClockCache(): ClockCache {
  let guardado: Clock | null = null
  return {
    get(now: number): Clock | null {
      return guardado && now < guardado.ate ? guardado : null
    },
    set(c: Clock): void {
      guardado = { dia: c.dia, ate: c.ate, agora: c.agora }
    },
  }
}

const GRAVACAO: readonly string[] = ['gravada', 'repetida', 'teto']

const ehInteiro = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** `{ dia, ate, agora }` com a forma do contrato, ou `null`. Nunca confia no que a RPC devolveu. */
function lerRelogio(data: unknown): (Clock & { production_host: string }) | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.dia !== 'string' || !ehInteiro(d.ate) || !ehInteiro(d.agora)) return null
  return {
    dia: d.dia,
    ate: d.ate,
    agora: d.agora,
    production_host: typeof d.production_host === 'string' ? d.production_host : '',
  }
}

/** O host do `Origin`, ou `null` quando ausente ou ilegível (`'null'` de um iframe isolado, lixo). */
function hostDaOrigem(origem: string | null): string | null {
  if (!origem) return null
  try {
    return new URL(origem).host || null
  } catch {
    return null
  }
}

/** Lê `store_clock` (sem argumento) e alimenta o cache. `null` em falha ou forma errada. */
async function lerStoreClock(deps: Deps) {
  const { data, error } = await deps.supabase.rpc('store_clock')
  if (error) return null
  const c = lerRelogio(data)
  if (c) deps.clock.set(c)
  return c
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const responder = (desfecho: Desfecho, corpo: unknown, status: number, extra: Record<string, unknown> = {}) => {
    deps.log({ fn: 'visit', desfecho, ...extra })
    return json(corpo, status)
  }

  if (req.method !== 'POST') {
    return responder('inválido', { error: 'método não permitido' }, 405, { motivo: 'metodo' })
  }

  // Portão 1 — o mais barato, e não toca o banco enquanto houver relógio no cache. Sem IP, libera:
  // todo mundo sem cabeçalho no mesmo balde faria 30 visitantes esgotarem o teto da loja inteira.
  const ip = clientIp(req)
  if (ip && !deps.limiter.hit(ip)) {
    const agora = deps.now()
    const guardado = deps.clock.get(agora)
    if (guardado) {
      // O `agora` é o desta resposta, não o do cache: o navegador mede a duração até a meia-noite
      // a partir dele, e um instante velho seguraria o marcador além da virada.
      return responder('limite', { dia: guardado.dia, ate: guardado.ate, agora }, 429)
    }
    const fresco = await lerStoreClock(deps)
    if (fresco) return responder('limite', { dia: fresco.dia, ate: fresco.ate, agora: fresco.agora }, 429)
    // Sem relógio, o `429` sai assim mesmo: a loja trata resposta sem prazo como falha e tenta uma
    // vez mais na próxima navegação (`VIS-18`). O desfecho continua sendo o do teto.
    return responder('limite', { error: 'muitas visitas deste endereço' }, 429)
  }

  // Portão 2 — o corpo. JSON inválido cai no mesmo motivo de corpo que não é objeto.
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    corpo = undefined
  }
  const recusa = visitBodyRefusal(corpo)
  if (recusa !== null) {
    return responder('inválido', { error: 'corpo inválido' }, 400, { motivo: recusa })
  }
  const id = (corpo as { id: string }).id

  // Portão 3 — o relógio e o host de produção, FRESCOS a cada requisição (o host nunca vem de
  // cache: trocá-lo no banco vale na próxima visita).
  const relogio = await lerStoreClock(deps)
  if (!relogio) return responder('erro', { error: 'relógio indisponível' }, 500, { etapa: 'relogio' })
  const doRelogio = { dia: relogio.dia, ate: relogio.ate, agora: relogio.agora }

  // Portão 4 — robô que se declara.
  if (isBotUserAgent(req.headers.get('user-agent'))) {
    return responder('robô', { desfecho: 'robô', ...doRelogio }, 200)
  }

  // Portão 5 — a origem. Sem `Origin`, ilegível ou fora do host de produção, é tráfego interno — a
  // MESMA régua (`trafficType`) que o GA4 e a loja usam.
  const host = hostDaOrigem(req.headers.get('origin'))
  if (host === null || trafficType(host, relogio.production_host) === 'internal') {
    return responder('interno', { desfecho: 'interno', ...doRelogio }, 200)
  }

  // Portão 6 — a gravação. Só `p_id`: `p_agora` existe para os probes, nunca para a requisição.
  const { data, error } = await deps.supabase.rpc('record_store_visit', { p_id: id })
  if (error) {
    return responder('erro', { error: 'falha ao gravar' }, 500, { etapa: 'gravacao', codigo: error.code ?? null })
  }
  const gravado = lerRelogio(data)
  const desfecho = (data as { desfecho?: unknown } | null)?.desfecho
  if (!gravado || typeof desfecho !== 'string' || !GRAVACAO.includes(desfecho)) {
    return responder('erro', { error: 'resposta inesperada' }, 500, { etapa: 'gravacao' })
  }
  return responder(desfecho as Desfecho, { desfecho, dia: gravado.dia, ate: gravado.ate, agora: gravado.agora }, 200)
}
