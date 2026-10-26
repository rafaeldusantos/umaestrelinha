// Feature `79` · T18 — o arnês do Web Push tem teste próprio: cada dublê registra as chamadas e os
// argumentos, reproduz os estados reais da plataforma, e `test/setup.ts` o desfaz entre os casos (`L-053`:
// o reset é provado por DOIS casos em sequência, o segundo lendo o que o primeiro deixou).
import { describe, expect, it } from 'vitest'

import { CHAVES_FALSAS, filaDaPorta, ok, portaFalsa, push } from '../push'

const registro = async () => (navigator as unknown as { serviceWorker: { ready: Promise<{ pushManager: PushManager }> } }).serviceWorker.ready

describe('sem instalar: o jsdom não tem nenhum dos três', () => {
  it('serviceWorker, PushManager e Notification ausentes', () => {
    expect('serviceWorker' in navigator).toBe(false)
    expect('PushManager' in window).toBe(false)
    expect('Notification' in window).toBe(false)
  })
})

describe('instalar', () => {
  it('os três presentes; cada um pode faltar sozinho', () => {
    push.instalar()
    expect('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window).toBe(true)
    push.reset()
    push.instalar({ suporte: { serviceWorker: false } })
    expect(['serviceWorker' in navigator, 'PushManager' in window, 'Notification' in window]).toEqual([false, true, true])
    push.reset()
    push.instalar({ suporte: { pushManager: false } })
    expect(['serviceWorker' in navigator, 'PushManager' in window, 'Notification' in window]).toEqual([true, false, true])
    push.reset()
    push.instalar({ suporte: { notification: false } })
    expect(['serviceWorker' in navigator, 'PushManager' in window, 'Notification' in window]).toEqual([true, true, false])
  })

  it('Notification: permission inicial, e requestPermission resolve com a resposta e passa a valer', async () => {
    push.instalar({ permissao: 'default', respostaDoPedido: 'denied' })
    expect(Notification.permission).toBe('default')
    await expect(Notification.requestPermission()).resolves.toBe('denied')
    expect(Notification.permission).toBe('denied')
    expect(push.chamadas.requestPermission).toBe(1)
  })

  it('getSubscription: nula sem inscrição; a existente com inscrito', async () => {
    push.instalar()
    const { pushManager } = await registro()
    await expect(pushManager.getSubscription()).resolves.toBeNull()
    push.reset()
    push.instalar({ inscrito: true })
    const sub = await (await registro()).pushManager.getSubscription()
    expect(sub?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/p79-existente')
    expect(push.chamadas.getSubscription).toBe(1)
  })

  it('subscribe registra as opções e devolve endpoint e as chaves em toJSON; a segunda devolve a MESMA', async () => {
    push.instalar()
    const { pushManager } = await registro()
    const sub = await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: 'BKEY' })
    expect(push.chamadas.subscribe).toEqual([{ userVisibleOnly: true, applicationServerKey: 'BKEY' }])
    expect(sub.toJSON()).toEqual({ endpoint: sub.endpoint, expirationTime: null, keys: CHAVES_FALSAS })
    expect(sub.endpoint).toMatch(/^https:\/\/fcm\.googleapis\.com\/fcm\/send\//)
    expect(await pushManager.subscribe({ userVisibleOnly: true })).toBe(sub)
    expect(await pushManager.getSubscription()).toBe(sub)
  })

  it('getRegistration: o registro, ou undefined sem o worker (e aí o `ready` nunca resolve)', async () => {
    push.instalar()
    const sw = navigator.serviceWorker as unknown as { getRegistration: () => Promise<unknown>; ready: Promise<unknown> }
    await expect(sw.getRegistration()).resolves.toBe(await sw.ready)
    push.reset()
    push.instalar({ semRegistro: true })
    const semWorker = navigator.serviceWorker as unknown as { getRegistration: () => Promise<unknown>; ready: Promise<unknown> }
    await expect(semWorker.getRegistration()).resolves.toBeUndefined()
    const corrida = await Promise.race([semWorker.ready.then(() => 'resolveu'), new Promise((r) => setTimeout(() => r('pendente'), 20))])
    expect(corrida).toBe('pendente')
    expect(push.chamadas.getRegistration).toBe(1)
  })

  it('subscribe que LANÇA', async () => {
    push.instalar()
    push.falharSubscribe()
    await expect((await registro()).pushManager.subscribe({ userVisibleOnly: true })).rejects.toMatchObject({ name: 'AbortError' })
    expect(push.inscricao).toBeNull()
  })

  it('unsubscribe apaga a inscrição do navegador e é registrado', async () => {
    push.instalar({ inscrito: true })
    const sub = push.inscricao!
    await expect(sub.unsubscribe()).resolves.toBe(true)
    expect(push.inscricao).toBeNull()
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('segurarSubscribe: o subscribe só termina quando o teste solta', async () => {
    push.instalar()
    const soltar = push.segurarSubscribe()
    let terminou = false
    const p = (await registro()).pushManager.subscribe({ userVisibleOnly: true }).then(() => (terminou = true))
    await Promise.resolve()
    expect(terminou).toBe(false)
    soltar()
    await p
    expect(terminou).toBe(true)
  })
})

describe('a porta falsa', () => {
  it('responde da fila, registra os argumentos, e a fila vazia LANÇA', async () => {
    filaDaPorta('inscrever', ok({ events: ['owner_order_paid'] }))
    await expect(portaFalsa.inscrever('e', { p256dh: 'p', auth: 'a' })).resolves.toEqual({ tipo: 'ok', dado: { events: ['owner_order_paid'] } })
    expect(portaFalsa.inscrever).toHaveBeenCalledWith('e', { p256dh: 'p', auth: 'a' })
    await expect(portaFalsa.inscrever('e', { p256dh: 'p', auth: 'a' })).rejects.toThrow(/esgotou/)
    expect(push.chamadas.log).toEqual(['porta inscrever', 'porta inscrever'])
  })

  it('uma função na fila pode lançar (a recusa)', async () => {
    filaDaPorta('lerStatus', () => Promise.reject(Object.assign(new Error('x'), { code: '42501' })))
    await expect(portaFalsa.lerStatus('e')).rejects.toMatchObject({ code: '42501' })
  })
})

describe('o reset entre os casos (L-053) — dois casos em sequência', () => {
  it('caso 1: deixa permissão, inscrição, chamadas e fila sujas', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    await (await registro()).pushManager.getSubscription()
    filaDaPorta('testar', ok({ ok: true }), ok({ ok: true }))
    await portaFalsa.testar('e')
    push.falharSubscribe()
    expect(push.chamadas.getSubscription).toBe(1)
  })

  it('caso 2: nada do caso 1 sobrou', async () => {
    expect('serviceWorker' in navigator).toBe(false)
    expect('Notification' in window).toBe(false)
    expect(push.inscricao).toBeNull()
    expect(push.permissao).toBe('default')
    expect(push.chamadas).toEqual({ requestPermission: 0, getSubscription: 0, getRegistration: 0, subscribe: [], unsubscribe: 0, log: [] })
    expect(portaFalsa.testar).not.toHaveBeenCalled()
    // A fila do caso 1 tinha uma resposta sobrando: ela não pode valer aqui.
    await expect(portaFalsa.testar('e')).rejects.toThrow(/esgotou/)
    push.instalar()
    // E o subscribe que falhava no caso 1 voltou a funcionar.
    await expect((await registro()).pushManager.subscribe({ userVisibleOnly: true })).resolves.toBeTruthy()
  })
})
