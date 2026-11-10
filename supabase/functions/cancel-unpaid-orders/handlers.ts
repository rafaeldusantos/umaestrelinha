// Handlers da edge function `cancel-unpaid-orders` — o cancelamento automático do pedido não pago.
//
// O job do `pg_cron` chama esta function a cada hora (migration `20261118120000`). Ela lê os pedidos
// em Pendente criados há 7 dias ou mais, decide quais venceram pela regra de `core`
// (`unpaidCancelDue`: sem pagamento, sem material da cliente em trânsito ou no ateliê, não importado,
// depois da data de corte, e o prazo recomeçado do desfazer de um pagamento registrado à mão) e, para
// cada um:
//
//   1. grava `status = 'cancelled'` e a marca `unpaid_cancelled_at` — com o recorte REPETIDO no
//      `update`, de modo que o pedido pago (ou com material postado) entre a leitura e a gravação não
//      é tocado, e a segunda rodada não acha nada;
//   2. registra a linha do histórico, sem autor;
//   3. fecha a cobrança aberta no Mercado Pago (`closeOpenCharge`, a regra da `mercado-pago`);
//   4. dispara o gatilho `order_auto_cancelled` no motor de notificação, no mesmo processo
//      (`AD-005`) — é ele quem decide se o e-mail sai (nasce desligado).
//
// Os passos 3 e 4 só acontecem para o pedido que o passo 1 de fato gravou. Nenhum deles lança: uma
// cobrança que o MP não fecha, ou um motor quebrado, não impede o próximo pedido.
//
// Separado de `index.ts` (só wiring) por `AD-004`: sem `Deno` e sem `esm.sh`, este módulo roda no
// vitest.

import { closeOpenCharge, type Deps as MercadoPagoDeps } from '../mercado-pago/handlers.ts'
import { type NotificationEnv, dispatchTrigger } from '../send-notification/dispatch.ts'
import type { NotificationTrigger } from '../../../packages/core/src/notifications/index.ts'
import {
  MATERIAL_EM_MAOS,
  UNPAID_CANCEL_DAYS,
  unpaidCancelDue,
  type UnpaidCancelManualPayment,
} from '../../../packages/core/src/orders/unpaidCancel.ts'
import { corsHeaders, json } from '../_shared/http.ts'

/** Tudo que o job toca fora do próprio processo. O wiring (`index.ts`) fornece o real. */
export interface Deps {
  // Client service-role (o real vem de esm.sh; o dublê implementa só a superfície usada).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fetch: typeof globalThis.fetch
  env: {
    mpAccessToken: string
    /** A chave que o job apresenta no `Authorization`. Vazia ⇒ toda chamada é recusada. */
    jobKey: string
  }
  notifications: NotificationEnv
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any[]
  /** O relógio. Ausente ⇒ o do processo. */
  now?: () => Date
  /** O motor. Ausente ⇒ `dispatchTrigger`, da `send-notification`. */
  dispatch?: typeof dispatchTrigger
}

/** O gatilho que este job informa: o fato, nunca a mensagem (`AD-032`). */
const GATILHO: NotificationTrigger = 'order_auto_cancelled'

/** Quantos pedidos uma rodada lê. O que sobrar fica para a próxima hora. */
const LOTE = 200

/** O orçamento do motor por pedido: ninguém espera do outro lado, como no webhook. */
const NOTIFY_BUDGET_MS = 8000

/** A nota da linha do histórico — o que a dona lê no pedido. */
const NOTA_DO_HISTORICO = 'Cancelado automaticamente por falta de pagamento: 7 dias sem pagamento confirmado.'

const COLUNAS = 'id, status, payment_status, paid_at, material_status, nuvemshop_id, created_at, mp_order_id'

/** O recorte do material para o PostgREST: os estados em que a cliente já mandou o material. */
const MATERIAL_EM_MAOS_FILTRO = `(${MATERIAL_EM_MAOS.join(',')})`

const DIA_MS = 24 * 60 * 60 * 1000

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: 'cancel-unpaid-orders', ...entry }))
}

/** Comparação de tempo constante: a chave do job não vaza pelo tempo de resposta. */
function mesmaChave(recebida: string, esperada: string): boolean {
  if (esperada === '' || recebida.length !== esperada.length) return false
  let diferenca = 0
  for (let i = 0; i < esperada.length; i++) diferenca |= recebida.charCodeAt(i) ^ esperada.charCodeAt(i)
  return diferenca === 0
}

/** O recorte na consulta e na gravação: Pendente, sem pagamento confirmado, sem material em mãos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const naoPago = (q: any) =>
  q
    .eq('status', 'pending')
    .is('paid_at', null)
    .neq('payment_status', 'approved')
    .not('material_status', 'in', MATERIAL_EM_MAOS_FILTRO)

export interface CancellationReport {
  cancelled: string[]
}

/** Uma rodada do job. Lança só quando não sabe a data de corte ou não lê os pedidos. */
export async function runUnpaidCancellation(deps: Deps): Promise<CancellationReport> {
  const agora = (deps.now ?? (() => new Date()))()

  const { data: desde, error: erroDoCorte } = await deps.supabase.rpc('unpaid_cancel_since')
  if (erroDoCorte || !desde) throw new Error('sem a data de corte')

  // Grosso na consulta (criado há 7 dias ou mais, depois do corte); a regra fina — o desfazer — é de `core`.
  const limite = new Date(agora.getTime() - UNPAID_CANCEL_DAYS * DIA_MS).toISOString()
  const { data: candidatos, error: erroDaLeitura } = await naoPago(
    deps.supabase.from('orders').select(COLUNAS),
  )
    .is('nuvemshop_id', null)
    .gte('created_at', String(desde))
    .lte('created_at', limite)
    .order('created_at', { ascending: true })
    .limit(LOTE)
  if (erroDaLeitura) throw new Error('não li os pedidos')

  const pedidos = (candidatos ?? []) as Array<Record<string, any>>
  if (pedidos.length === 0) return { cancelled: [] }

  const { data: registros, error: erroDosRegistros } = await deps.supabase
    .from('order_manual_payments')
    .select('order_id, undone_at')
    .in(
      'order_id',
      pedidos.map((p) => p.id),
    )
  if (erroDosRegistros) throw new Error('não li os pagamentos registrados')

  const registrosDe = (id: string): UnpaidCancelManualPayment[] =>
    ((registros ?? []) as Array<Record<string, any>>).filter((r) => r.order_id === id)

  const cancelados: string[] = []
  for (const pedido of pedidos) {
    if (!unpaidCancelDue(pedido, { agora, desde: String(desde), registros: registrosDe(pedido.id) })) continue
    if (await cancelar(deps, pedido, agora)) cancelados.push(pedido.id)
  }

  log({ desfecho: 'rodada', lidos: pedidos.length, cancelados: cancelados.length })
  return { cancelled: cancelados }
}

/** Cancela UM pedido. `true` só quando a gravação pegou a linha (o recorte ainda valia). */
async function cancelar(deps: Deps, pedido: Record<string, any>, agora: Date): Promise<boolean> {
  const { data: gravadas, error } = await naoPago(
    deps.supabase.from('orders').update({ status: 'cancelled', unpaid_cancelled_at: agora.toISOString() }),
  )
    .eq('id', pedido.id)
    .select('id')
  if (error) {
    log({ desfecho: 'erro_ao_gravar', order_id: pedido.id })
    return false
  }
  if (!gravadas || gravadas.length === 0) {
    log({ desfecho: 'mudou', order_id: pedido.id })
    return false
  }

  await deps.supabase.from('order_status_history').insert({
    order_id: pedido.id,
    from_status: 'pending',
    to_status: 'cancelled',
    note: NOTA_DO_HISTORICO,
    created_by: null,
  })

  const cobranca = await closeOpenCharge(paraMercadoPago(deps), pedido)
  await avisar(deps, pedido.id)
  log({ desfecho: 'cancelado', order_id: pedido.id, cobranca })
  return true
}

/** As dependências que `closeOpenCharge` lê — o `fetch` e o token do MP; o resto não é usado. */
function paraMercadoPago(deps: Deps): MercadoPagoDeps {
  return {
    supabase: deps.supabase,
    fetch: deps.fetch,
    env: { mpAccessToken: deps.env.mpAccessToken, mpWebhookSecret: '', strictVariantPricing: true },
    notifications: deps.notifications,
    providers: deps.providers,
  }
}

/** O gatilho no motor, sem nunca derrubar o job (molde de `fireTrigger`, na `mercado-pago`). */
async function avisar(deps: Deps, orderId: string) {
  try {
    await (deps.dispatch ?? dispatchTrigger)(
      { supabase: deps.supabase, fetch: deps.fetch, env: deps.notifications, providers: deps.providers },
      { orderId, trigger: GATILHO, budgetMs: NOTIFY_BUDGET_MS },
    )
  } catch (err) {
    log({ desfecho: 'aviso_falhou', order_id: orderId, message: err instanceof Error ? err.message : String(err) })
  }
}

/** A porta: só `POST`, só com a chave do job. */
export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const chave = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!mesmaChave(chave, deps.env.jobKey ?? '')) return json({ error: 'Não autorizado' }, 401)

  try {
    const r = await runUnpaidCancellation(deps)
    return json({ cancelled: r.cancelled.length })
  } catch (err) {
    log({ desfecho: 'erro', message: err instanceof Error ? err.message : String(err) })
    return json({ error: 'Não consegui rodar o cancelamento automático' }, 500)
  }
}
