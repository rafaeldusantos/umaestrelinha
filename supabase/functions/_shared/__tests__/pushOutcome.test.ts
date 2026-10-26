// Feature 79 (T12) — a tradução do desfecho do serviço de push, pura (`_shared/pushOutcome.ts`).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attemptWithin, outcomeFromError, outcomeFromStatus } from '../pushOutcome.ts'

/** A forma do `PushMessageError` da biblioteca: `isGone()` só reconhece o 410 (probe 01, passo 5c). */
class ErroDoServicoDePush extends Error {
  constructor(public response: { status: number }) {
    super(`push falhou: ${response.status}`)
  }
  isGone() {
    return this.response.status === 410
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('outcomeFromStatus — o status decide (MAN-04, MAN-07)', () => {
  it('201 ⇒ sent', () => {
    expect(outcomeFromStatus(201)).toEqual({ kind: 'sent' })
  })
  it('404 ⇒ gone (a biblioteca NÃO o chama de gone; o adaptador sim)', () => {
    expect(outcomeFromStatus(404)).toEqual({ kind: 'gone', http: 404 })
  })
  it('410 ⇒ gone', () => {
    expect(outcomeFromStatus(410)).toEqual({ kind: 'gone', http: 410 })
  })
  it.each([413, 429, 500, 503, 400, 302])('%i ⇒ failed, com o status', (status) => {
    expect(outcomeFromStatus(status)).toEqual({ kind: 'failed', reason: 'http', http: status })
  })
})

describe('outcomeFromError', () => {
  it('erro com `response.status` 404 ⇒ gone, mesmo com `isGone()` falso', () => {
    const e = new ErroDoServicoDePush({ status: 404 })
    expect(e.isGone()).toBe(false)
    expect(outcomeFromError(e)).toEqual({ kind: 'gone', http: 404 })
  })
  it('erro com 410 ⇒ gone', () => {
    expect(outcomeFromError(new ErroDoServicoDePush({ status: 410 }))).toEqual({ kind: 'gone', http: 410 })
  })
  it('erro com 429 ⇒ failed', () => {
    expect(outcomeFromError(new ErroDoServicoDePush({ status: 429 }))).toEqual({ kind: 'failed', reason: 'http', http: 429 })
  })
  it('erro de rede (sem resposta) ⇒ failed: network', () => {
    expect(outcomeFromError(new TypeError('fetch failed'))).toEqual({ kind: 'failed', reason: 'network' })
    expect(outcomeFromError(undefined)).toEqual({ kind: 'failed', reason: 'network' })
  })
})

describe('attemptWithin — a corrida com o prazo (R3)', () => {
  it('o envio que resolve ⇒ sent', async () => {
    expect(await attemptWithin(async () => undefined, 1000)).toEqual({ kind: 'sent' })
  })

  it('o envio que lança 410 ⇒ gone; 500 ⇒ failed; rede ⇒ failed: network', async () => {
    expect(await attemptWithin(async () => { throw new ErroDoServicoDePush({ status: 410 }) }, 1000)).toEqual({ kind: 'gone', http: 410 })
    expect(await attemptWithin(async () => { throw new ErroDoServicoDePush({ status: 500 }) }, 1000)).toEqual({ kind: 'failed', reason: 'http', http: 500 })
    expect(await attemptWithin(async () => { throw new Error('ECONNRESET') }, 1000)).toEqual({ kind: 'failed', reason: 'network' })
  })

  it('o envio que não responde no prazo ⇒ failed: timeout, NO prazo', async () => {
    vi.useFakeTimers()
    let resolvido: unknown = null
    const p = attemptWithin(() => new Promise(() => {}), 2000).then((r) => (resolvido = r))

    await vi.advanceTimersByTimeAsync(1999)
    expect(resolvido).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(resolvido).toEqual({ kind: 'failed', reason: 'timeout' })
  })

  it('o envio que responde antes do prazo vence a corrida', async () => {
    vi.useFakeTimers()
    const p = attemptWithin(() => new Promise((r) => setTimeout(r, 500)), 2000)
    await vi.advanceTimersByTimeAsync(500)
    expect(await p).toEqual({ kind: 'sent' })
  })

  it('nunca lança, nem com o envio lançando de forma síncrona', async () => {
    const run = () => {
      throw new Error('síncrono')
    }
    await expect(attemptWithin(run as () => Promise<unknown>, 1000)).resolves.toEqual({ kind: 'failed', reason: 'network' })
  })
})
