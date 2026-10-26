// Feature 79 — o ramo do AVISO NO CELULAR do motor (`AD-062`, design §4.2).
//
// Não é um `NotificationProvider`, e a razão é de forma: o provider recebe UMA mensagem para UM
// destinatário; o push é um evento → N aparelhos, cada um com desfecho próprio (entregue, expirado,
// falhou), e a linha de `order_notifications (…, channel = 'push')` resume os N.
//
// Os contratos do motor valem aqui inteiros: NUNCA LANÇA (todo desfecho volta como `SendResult`), a
// memória "já avisei?" é a do banco (`claim_order_notification`) e o ORÇAMENTO é o mesmo do e-mail —
// este ramo roda por último e gasta só o que sobrou.
//
// A biblioteca de Web Push NÃO é importada aqui: o envio de um aviso a um aparelho chega injetado
// (`PushSender`), e a implementação real mora em `_shared/webPush.ts`, que só os `index.ts` carregam.
// É o que deixa este arquivo rodar sob vitest.

import {
  type PushEvent,
  pushEndpointRefusal,
  pushMessage,
} from '../../../packages/core/src/notifications/index.ts'
import { ERROR_MAX_CHARS, MIN_SEND_MS } from './budget.ts'
import type { SendResult } from './dispatch.ts'

/** Uma inscrição, no que o envio precisa. Nunca vai para log. */
export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

/** O que o aparelho recebe — a saída de `pushMessage`. */
export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

/**
 * O desfecho de UM envio a UM aparelho.
 *
 * `gone` (404/410) apaga a inscrição (`MAN-04`); `failed` (429, 5xx, rede, prazo) a mantém
 * (`MAN-07`). Quem traduz o status HTTP é `_shared/pushOutcome.ts`, puro.
 */
export type PushOutcome =
  | { kind: 'sent' }
  | { kind: 'gone'; http: number }
  | { kind: 'failed'; reason: string; http?: number }

/** O envio de UM aviso para UM aparelho. Real só no `index.ts`; nos testes, dublê. */
export interface PushSender {
  send(sub: PushTarget, message: PushPayload, ctx: { timeoutMs: number }): Promise<PushOutcome>
}

/**
 * O que este ramo lê das dependências do motor. Estrutural, para não importar valor de
 * `dispatch.ts` (que importa este arquivo): `NotificationDeps` satisfaz esta forma.
 */
export interface PushDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  push?: { sender: PushSender }
}

/** As colunas lidas — nomeadas, nunca `*` (a linha carrega a credencial de entrega). */
export const PUSH_SUBSCRIPTION_COLUMNS = 'id, user_id, endpoint, p256dh, auth'

interface Inscricao {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

/** Só o HOST do endpoint vai para log (`MAN-26`): o endpoint inteiro é credencial de entrega. */
export function hostDe(endpoint: string): string {
  try {
    return new URL(endpoint).hostname
  } catch {
    return 'invalid'
  }
}

async function apagarPorIds(deps: PushDeps, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await deps.supabase.from('push_subscriptions').delete().in('id', ids)
  if (error) log({ action: 'send-notification', channel: 'push', status: 'delete_failed' })
}

async function finishPush(
  deps: PushDeps,
  claimId: string,
  messageId: string | null,
  error: string | null,
): Promise<void> {
  const { error: rpcError } = await deps.supabase.rpc('finish_order_notification', {
    p_id: claimId,
    p_provider_message_id: messageId,
    p_error: error === null ? null : error.slice(0, ERROR_MAX_CHARS),
  })
  if (rpcError) {
    log({ action: 'send-notification', channel: 'push', status: 'finish_failed', message: String(rpcError.message ?? rpcError) })
  }
}

/**
 * Um evento `owner_*` para todos os aparelhos que o querem. Os passos 1–10 de §4.2, na ordem.
 *
 * Quem chama já conferiu o ESTADO do pedido (`orderStateFailure`); o contato de e-mail da dona não
 * entra aqui (`MAN-06`).
 */
export async function deliverPush(
  deps: PushDeps,
  event: PushEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  deadline: number,
): Promise<SendResult> {
  const channel = 'push'
  const base = { action: 'send-notification', order_id: order.id, event, channel }

  // 1. Sem VAPID neste deploy ⇒ o canal não existe (`MAN-37`). O e-mail já saiu antes.
  if (!deps.push) {
    log({ ...base, status: 'skipped', skipped: 'no_provider' })
    return { ok: false, event, channel, skipped: 'no_provider' }
  }

  // 2. Só as inscrições que querem ESTE evento (`MAN-02`), pela service role.
  const { data: linhas, error: leituraErro } = await deps.supabase
    .from('push_subscriptions')
    .select(PUSH_SUBSCRIPTION_COLUMNS)
    .contains('events', [event])
  if (leituraErro) {
    log({ ...base, status: 'subscriptions_read_failed' })
    return { ok: false, event, channel, reason: 'subscriptions_read_failed' }
  }
  const inscricoes = (linhas ?? []) as Inscricao[]

  // 3. O dono de cada inscrição ainda é admin? Uma pergunta por usuário distinto (`MAN-18`).
  const donos = [...new Set(inscricoes.map((i) => i.user_id))]
  const admins = new Set<string>()
  const semPapel: string[] = []
  for (const userId of donos) {
    const { data: ehAdmin, error: papelErro } = await deps.supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    })
    if (papelErro) {
      // Instabilidade não vira permissão (não envia) nem destruição (não apaga).
      log({ ...base, status: 'admin_check_failed' })
      continue
    }
    if (ehAdmin === true) admins.add(userId)
    else semPapel.push(userId)
  }
  const apagar = inscricoes.filter((i) => semPapel.includes(i.user_id)).map((i) => i.id)

  // 4. Endpoint fora da lista de A10 ⇒ apaga e não envia (`MAN-25`, a segunda volta).
  const elegiveis: Inscricao[] = []
  for (const i of inscricoes) {
    if (!admins.has(i.user_id)) continue
    if (pushEndpointRefusal(i.endpoint) !== null) {
      apagar.push(i.id)
      continue
    }
    elegiveis.push(i)
  }
  await apagarPorIds(deps, apagar)

  const hosts = elegiveis.map((i) => hostDe(i.endpoint))

  // 5. Ninguém quer o aviso ⇒ sem claim (`MAN-20`): uma retentativa com aparelho já ativado entrega.
  if (elegiveis.length === 0) {
    log({ ...base, status: 'skipped', skipped: 'no_device' })
    return { ok: false, event, channel, skipped: 'no_device' }
  }

  // 6. A memória "já avisei?" é a mesma do e-mail, por (pedido, evento, canal) (`MAN-05`).
  const { data: claimId, error: claimErro } = await deps.supabase.rpc('claim_order_notification', {
    p_order_id: order.id,
    p_event: event,
    p_channel: channel,
  })
  if (claimErro) {
    log({ ...base, status: 'claim_failed' })
    return { ok: false, event, channel, reason: 'claim_failed' }
  }
  if (!claimId) {
    log({ ...base, status: 'already_sent' })
    return { ok: false, event, channel, skipped: 'already_sent' }
  }

  // 7. O orçamento é o do gatilho inteiro (`MAN-19`). Conferido depois do claim: a linha aparece.
  const restante = deadline - Date.now()
  if (restante < MIN_SEND_MS) {
    await finishPush(deps, claimId, null, `budget_exhausted: restavam ${restante}ms`)
    log({ ...base, status: 'budget_exhausted', remaining_ms: restante, hosts })
    return { ok: false, event, channel, reason: 'budget_exhausted' }
  }

  // 8. Um envio por aparelho, em paralelo, cada um com o que sobra (`MAN-07`: sem retentativa).
  const mensagem = pushMessage(event, order)
  const sender = deps.push.sender
  const desfechos = await Promise.allSettled(
    elegiveis.map((i) =>
      sender.send({ endpoint: i.endpoint, p256dh: i.p256dh, auth: i.auth }, mensagem, { timeoutMs: restante }),
    ),
  )

  let entregues = 0
  const expiradas: string[] = []
  const usadas: string[] = []
  const motivos: string[] = []
  desfechos.forEach((d, n) => {
    const i = elegiveis[n]
    if (d.status === 'rejected') {
      motivos.push('sender_threw')
      return
    }
    const r = d.value
    if (r.kind === 'sent') {
      entregues += 1
      usadas.push(i.id)
    } else if (r.kind === 'gone') {
      expiradas.push(i.id)
      motivos.push(`gone_${r.http}`)
    } else {
      motivos.push(r.http ? `${r.reason}_${r.http}` : r.reason)
    }
  })

  await apagarPorIds(deps, expiradas)
  if (usadas.length > 0) {
    const { error } = await deps.supabase
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', usadas)
    if (error) log({ ...base, status: 'last_used_failed' })
  }

  // 9. ≥1 entregue ⇒ `sent` (terminal para o claim), com a contagem em `provider_message_id` e
  //    NUNCA em `error` — `error` preenchido marca `failed`, e a retentativa reenviaria a quem já
  //    recebeu. Zero ⇒ `failed`, reivindicável de novo.
  const total = elegiveis.length
  const contagem = `push:${entregues}/${total}`
  if (entregues > 0) {
    await finishPush(deps, claimId, contagem, null)
    log({ ...base, status: 'sent', entregues, total, hosts })
    return { ok: true, event, channel, id: contagem }
  }

  await finishPush(deps, claimId, null, `${contagem} — ${motivos.join(', ')}`)
  log({ ...base, status: 'failed', entregues, total, hosts, motivos })
  return { ok: false, event, channel, reason: 'push_failed' }
}
