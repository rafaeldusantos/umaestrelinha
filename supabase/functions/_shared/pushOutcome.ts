// Feature 79 — a tradução do que o serviço de push respondeu, PURA (TQ4, design §4.2, R3).
//
// Mora separada de `webPush.ts` (o único arquivo que importa a biblioteca de Web Push) para caber no
// vitest: quem decide "apagar a inscrição" ou "manter e registrar a falha" é este arquivo, e ele é
// testado; o adaptador da biblioteca fica fino.
//
// Três regras, cada uma medida:
//  - 2xx ⇒ `sent`.
//  - 404 e 410 ⇒ `gone` (`MAN-04`). Decidido pelo STATUS, nunca pelo `isGone()` da biblioteca, que
//    só reconhece o 410 (medido no probe 01, passo 5c).
//  - todo o resto — 413, 429, 5xx, rede, prazo — ⇒ `failed` (`MAN-07`): a inscrição fica.
//
// O prazo é uma corrida (`Promise.race`), porque a biblioteca não aceita `signal` (R3): o POST
// órfão segue no ar, inofensivo — o aviso já foi reivindicado e o orçamento é respeitado.

import type { PushOutcome } from '../send-notification/push.ts'

/** O desfecho de uma resposta HTTP do serviço de push. */
export function outcomeFromStatus(status: number): PushOutcome {
  if (status >= 200 && status < 300) return { kind: 'sent' }
  if (status === 404 || status === 410) return { kind: 'gone', http: status }
  return { kind: 'failed', reason: 'http', http: status }
}

/**
 * O desfecho de um erro lançado pelo envio. Com `response.status` (o `PushMessageError` da
 * biblioteca) ⇒ pelo status; sem ⇒ rede.
 */
export function outcomeFromError(err: unknown): PushOutcome {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (err as any)?.response?.status
  if (typeof status === 'number') return outcomeFromStatus(status)
  return { kind: 'failed', reason: 'network' }
}

/**
 * Corre o envio contra o prazo. Resolve ⇒ `sent`; lança ⇒ `outcomeFromError`; o prazo vence antes
 * ⇒ `failed: timeout`. Nunca lança.
 */
export async function attemptWithin(run: () => Promise<unknown>, timeoutMs: number): Promise<PushOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const prazo = new Promise<PushOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ kind: 'failed', reason: 'timeout' }), Math.max(0, timeoutMs))
  })
  const envio = (async (): Promise<PushOutcome> => {
    try {
      await run()
      return { kind: 'sent' }
    } catch (err) {
      return outcomeFromError(err)
    }
  })()
  try {
    return await Promise.race([envio, prazo])
  } finally {
    clearTimeout(timer)
  }
}
