import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { NOTIFICATION_EVENTS } from '../events.ts'
import { notificationCopyRefusal } from '../copy.ts'
import { NOTIFICATION_CHANNELS, isNotificationChannel } from '../settings.ts'
import {
  PUSH_EVENTS,
  PUSH_SUBSCRIPTION_LIMIT,
  PUSH_TEST_COOLDOWN_MS,
  PUSH_TEST_MESSAGE,
  isPushEvent,
  pushEndpointRefusal,
  pushEventsRefusal,
  pushKeysRefusal,
  pushMessage,
} from '../push.ts'
import * as barril from '../index.ts'

/**
 * Feature 79 — a regra pura do aviso no celular (`MAN-08`, `MAN-25`, `MAN-28`, `MAN-31`, `MAN-33`).
 *
 * Os textos são escritos POR EXTENSO aqui (`L-009`): ler a constante do próprio módulo provaria que
 * ela é igual a si mesma. O separador entre `R$` e o número é NBSP (U+00A0), porque é o que o ICU
 * emite em pt-BR — precedente de `formatters/__tests__/price.test.ts`.
 */

const NBSP = ' '
const PEDIDO = { id: 'b3c1d2e4-0000-4000-8000-000000000244', order_number: '0244', total: 189 }

describe('PUSH_EVENTS — os quatro eventos da dona', () => {
  it('são exatamente os quatro `owner_*`, na ordem de NOTIFICATION_EVENTS', () => {
    expect([...PUSH_EVENTS]).toEqual([
      'owner_order_received',
      'owner_order_paid',
      'owner_payment_rejected',
      'owner_material_incoming',
    ])
    expect([...PUSH_EVENTS]).toEqual(NOTIFICATION_EVENTS.filter((e) => e.startsWith('owner_')))
  })

  it('isPushEvent aceita os quatro e recusa os da cliente e lixo', () => {
    for (const e of PUSH_EVENTS) expect(isPushEvent(e)).toBe(true)
    for (const e of ['order_paid', 'order_received', 'payment_rejected', 'material_tracking_registered', '', 'owner_x'])
      expect(isPushEvent(e)).toBe(false)
    expect(isPushEvent(undefined)).toBe(false)
  })
})

describe('pushMessage — a tabela de MAN-08', () => {
  it('owner_order_paid', () => {
    expect(pushMessage('owner_order_paid', PEDIDO)).toEqual({
      title: 'Pedido #0244 pago',
      body: `R$${NBSP}189,00`,
      url: '/pedidos/b3c1d2e4-0000-4000-8000-000000000244',
      tag: 'pedido-b3c1d2e4-0000-4000-8000-000000000244-owner_order_paid',
    })
  })

  it('owner_order_received', () => {
    expect(pushMessage('owner_order_received', PEDIDO)).toEqual({
      title: 'Pedido #0244 recebido',
      body: `R$${NBSP}189,00 · aguardando o PIX`,
      url: '/pedidos/b3c1d2e4-0000-4000-8000-000000000244',
      tag: 'pedido-b3c1d2e4-0000-4000-8000-000000000244-owner_order_received',
    })
  })

  it('owner_payment_rejected', () => {
    expect(pushMessage('owner_payment_rejected', PEDIDO)).toEqual({
      title: 'Pagamento recusado no pedido #0244',
      body: `R$${NBSP}189,00`,
      url: '/pedidos/b3c1d2e4-0000-4000-8000-000000000244',
      tag: 'pedido-b3c1d2e4-0000-4000-8000-000000000244-owner_payment_rejected',
    })
  })

  it('owner_material_incoming', () => {
    expect(pushMessage('owner_material_incoming', PEDIDO)).toEqual({
      title: 'Material a caminho do pedido #0244',
      body: 'A cliente registrou o envio.',
      url: '/pedidos/b3c1d2e4-0000-4000-8000-000000000244',
      tag: 'pedido-b3c1d2e4-0000-4000-8000-000000000244-owner_material_incoming',
    })
  })

  it('o valor sai com centavos e milhar, e o número com um `#` só', () => {
    const m = pushMessage('owner_order_paid', { id: 'x', order_number: '#1001', total: 1234.5 })
    expect(m.title).toBe('Pedido #1001 pago')
    expect(m.body).toBe(`R$${NBSP}1.234,50`)
  })

  it.each(PUSH_EVENTS)('%s: sem `!`, sem emoji, e a régua de tom da loja aprova', (event) => {
    const m = pushMessage(event, PEDIDO)
    for (const texto of [m.title, m.body]) {
      expect(texto).not.toContain('!')
      expect(texto).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(notificationCopyRefusal(texto, { event, channel: 'email' })).toBeNull()
    }
  })
})

describe('o canal push na memória de envio (MAN-34)', () => {
  it('NOTIFICATION_CHANNELS é email, whatsapp e push — o mesmo `check` da migration da 79', () => {
    expect([...NOTIFICATION_CHANNELS]).toEqual(['email', 'whatsapp', 'push'])
    expect(isNotificationChannel('push')).toBe(true)
    expect(isNotificationChannel('sms')).toBe(false)
  })
})

describe('PUSH_TEST_MESSAGE e as constantes', () => {
  it('o aviso de teste de MAN-31 abre a Início', () => {
    expect(PUSH_TEST_MESSAGE).toEqual({
      title: 'Avisos ligados',
      body: 'É assim que os pedidos vão chegar.',
      url: '/',
      tag: 'teste',
    })
  })

  it('10 inscrições por conta (MAN-28) e 30 s entre testes (MAN-33)', () => {
    expect(PUSH_SUBSCRIPTION_LIMIT).toBe(10)
    expect(PUSH_TEST_COOLDOWN_MS).toBe(30_000)
  })
})

describe('pushEndpointRefusal — MAN-25 e A10', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc:def',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
    'https://web.push.apple.com/QAbc',
  ])('aceita %s', (endpoint) => {
    expect(pushEndpointRefusal(endpoint)).toBeNull()
  })

  it('recusa http:', () => {
    expect(pushEndpointRefusal('http://fcm.googleapis.com/fcm/send/abc')).toBe('not_https')
  })

  it.each([
    'https://evil.example.com/push',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evilfcm.googleapis.com/x',
    'https://notify.windows.com/x',
    'https://fcm.googleapis.com@evil.example.com/x',
    'https://fcm.googleapis.com:8443/fcm/send/abc',
    'https://127.0.0.1/push',
  ])('recusa host fora da lista: %s', (endpoint) => {
    expect(pushEndpointRefusal(endpoint)).toBe('host_not_allowed')
  })

  it.each(['não é url', '', '//fcm.googleapis.com/fcm/send/abc', '/fcm/send/abc'])('recusa URL inválida: %j', (endpoint) => {
    expect(pushEndpointRefusal(endpoint)).toBe('invalid_url')
  })

  it('recusa o que não é string', () => {
    expect(pushEndpointRefusal(undefined as unknown as string)).toBe('invalid_url')
    expect(pushEndpointRefusal(42 as unknown as string)).toBe('invalid_url')
  })
})

const b64url = (bytes: number[]): string =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const ponto = (n: number, primeiro = 0x04): string => b64url([primeiro, ...Array.from({ length: n - 1 }, (_, i) => i % 256)])
const segredo = (n: number): string => b64url(Array.from({ length: n }, (_, i) => (i * 7) % 256))

describe('pushKeysRefusal — MAN-25', () => {
  it('aceita p256dh de 65 bytes começando com 0x04 e auth de 16', () => {
    expect(pushKeysRefusal(ponto(65), segredo(16))).toBeNull()
  })

  it('aceita a forma com padding `=`', () => {
    const comPadding = Buffer.from(Array.from({ length: 16 }, (_, i) => i)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
    expect(comPadding.endsWith('=')).toBe(true)
    expect(pushKeysRefusal(ponto(65), comPadding)).toBeNull()
  })

  it.each([64, 66])('recusa p256dh de %i bytes', (n) => {
    expect(pushKeysRefusal(ponto(n), segredo(16))).toBe('invalid_p256dh')
  })

  it('recusa p256dh que não começa com 0x04', () => {
    expect(pushKeysRefusal(ponto(65, 0x03), segredo(16))).toBe('invalid_p256dh')
  })

  it.each([15, 17])('recusa auth de %i bytes', (n) => {
    expect(pushKeysRefusal(ponto(65), segredo(n))).toBe('invalid_auth')
  })

  it('recusa caractere fora do base64url e o que não é string', () => {
    expect(pushKeysRefusal(`${ponto(65).slice(0, -1)}+`, segredo(16))).toBe('invalid_p256dh')
    expect(pushKeysRefusal(ponto(65), 'abc$def/ghijklmnopqrstu')).toBe('invalid_auth')
    expect(pushKeysRefusal(undefined as unknown as string, segredo(16))).toBe('invalid_p256dh')
    expect(pushKeysRefusal(ponto(65), null as unknown as string)).toBe('invalid_auth')
  })
})

describe('pushEventsRefusal', () => {
  it('aceita qualquer subconjunto dos quatro, inclusive vazio', () => {
    expect(pushEventsRefusal([])).toBeNull()
    expect(pushEventsRefusal(['owner_order_paid'])).toBeNull()
    expect(pushEventsRefusal([...PUSH_EVENTS])).toBeNull()
  })

  it('recusa repetido', () => {
    expect(pushEventsRefusal(['owner_order_paid', 'owner_order_paid'])).toBe('duplicate_event')
  })

  it('recusa evento desconhecido ou da cliente', () => {
    expect(pushEventsRefusal(['order_paid'])).toBe('unknown_event')
    expect(pushEventsRefusal(['owner_order_paid', 'x'])).toBe('unknown_event')
  })

  it('recusa o que não é array', () => {
    for (const v of [undefined, null, 'owner_order_paid', { 0: 'owner_order_paid' }, 4])
      expect(pushEventsRefusal(v)).toBe('not_array')
  })
})

describe('o barril reexporta push.ts', () => {
  it('as funções chegam pelo index', () => {
    expect(barril.pushMessage).toBe(pushMessage)
    expect(barril.PUSH_EVENTS).toBe(PUSH_EVENTS)
    expect(barril.pushEndpointRefusal).toBe(pushEndpointRefusal)
  })
})

// ----------------------------------------------------------------------------------------------
// O grafo de `push.ts` é alcançável pelo Deno: o motor e a porta o importam por caminho relativo.
// Molde: `customers/__tests__/denoReach.test.ts`, com o leitor injetável para o sensor.
// ----------------------------------------------------------------------------------------------

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADA = join(DIR, 'push.ts')
type Leitor = (caminho: string) => string
const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1])

const caminhar = (entrada: string, ler: Leitor) => {
  const visitados = new Set<string>()
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [entrada]
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (visitados.has(atual)) continue
    visitados.add(atual)
    for (const esp of especificadores(ler(atual))) {
      if (!esp.startsWith('.')) externos.push(`${atual} → ${esp}`)
      else if (!esp.endsWith('.ts')) semExtensao.push(`${atual} → ${esp}`)
      else fila.push(resolve(dirname(atual), esp))
    }
  }
  return { visitados: [...visitados].map((c) => c.replace(/\\/g, '/')), semExtensao, externos }
}
const disco: Leitor = (c) => readFileSync(c, 'utf8')

describe('core/notifications/push.ts é alcançável por Deno', () => {
  const grafo = caminhar(ENTRADA, disco)

  it('âncora: o grafo alcança o número do pedido e o formatador de dinheiro', () => {
    for (const fim of ['notifications/push.ts', 'notifications/events.ts', 'orders/format.ts', 'formatters/price.ts'])
      expect(grafo.visitados.some((n) => n.endsWith(fim)), fim).toBe(true)
  })

  it('nenhum especificador relativo sem `.ts` e nenhum import de pacote', () => {
    expect(grafo.semExtensao).toEqual([])
    expect(grafo.externos).toEqual([])
  })

  it('sensor — um `import type` sem extensão é acusado', () => {
    const falso: Leitor = (c) => (c.endsWith('push.ts') ? `import type { X } from ${"'./events'"}` : disco(c))
    expect(caminhar(ENTRADA, falso).semExtensao.length).toBe(1)
  })

  it('sensor — um import de pacote é acusado', () => {
    const falso: Leitor = (c) => (c.endsWith('push.ts') ? `import { a } from ${"'@estrelinha/core/orders'"}` : disco(c))
    expect(caminhar(ENTRADA, falso).externos.length).toBe(1)
  })
})
