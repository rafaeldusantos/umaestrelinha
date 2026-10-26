// Feature 79 — o adaptador da biblioteca de Web Push (`AD-062`, design §4.2, R1).
//
// É o ÚNICO arquivo do repositório que importa a biblioteca, com a versão fixada, e só os `index.ts`
// o importam (`pushSoNoMotor.test.ts` guarda as duas pontas). O vitest nunca o carrega: a tradução
// do desfecho mora em `pushOutcome.ts`, pura e testada; aqui fica só a chamada. A cifra (RFC 8291),
// a assinatura VAPID (RFC 8292) e a reimportação das chaves foram provadas pelo probe 01 da `79`,
// no Deno e no edge runtime.
//
// Trocar de biblioteca é trocar este arquivo: o motor conhece só `PushSender`.

import {
  ApplicationServer,
  Urgency,
  exportApplicationServerKey,
  importVapidKeys,
} from 'jsr:@negrel/webpush@0.5.0'
import { attemptWithin } from './pushOutcome.ts'
import type { PushSender } from '../send-notification/push.ts'

/**
 * Um dia. A biblioteca usa 28 dias quando não se passa nada, e um aviso de "pedido pago" entregue
 * semanas depois a um celular que ficou desligado só confunde.
 */
const PUSH_TTL_SECONDS = 24 * 60 * 60

export interface WebPush {
  sender: PushSender
  /** A chave pública (base64url) para o `applicationServerKey` do navegador — do MESMO par que assina. */
  applicationServerKey: string
}

/**
 * Monta o envio real a partir dos secrets. `undefined` quando falta qualquer um, ou quando
 * `VAPID_KEYS` não é o JSON de `exportVapidKeys`: o canal push simplesmente não existe neste deploy
 * (`MAN-37`) — e o e-mail e o pagamento seguem iguais. Nunca lança.
 */
export async function createWebPushSender(env: {
  keys: string | undefined
  subject: string | undefined
}): Promise<WebPush | undefined> {
  const keys = env.keys?.trim()
  const subject = env.subject?.trim()
  if (!keys || !subject) return undefined

  try {
    const vapidKeys = await importVapidKeys(JSON.parse(keys), { extractable: true })
    const applicationServerKey = await exportApplicationServerKey(vapidKeys)
    // Uma instância por worker: `ApplicationServer.new` gera um par ECDH novo a cada chamada (achado
    // 4 do probe 01), e instanciar por mensagem pagaria uma geração de chave por envio.
    const servidor = await ApplicationServer.new({ contactInformation: subject, vapidKeys })

    const sender: PushSender = {
      send: (sub, message, ctx) =>
        attemptWithin(
          () =>
            servidor
              .subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
              .pushTextMessage(JSON.stringify(message), { ttl: PUSH_TTL_SECONDS, urgency: Urgency.High }),
          ctx.timeoutMs,
        ),
    }
    return { sender, applicationServerKey }
  } catch {
    // Só o fato: a mensagem de um erro de importação poderia ecoar parte da chave.
    console.log(JSON.stringify({ action: 'web-push', status: 'invalid_vapid_keys' }))
    return undefined
  }
}
