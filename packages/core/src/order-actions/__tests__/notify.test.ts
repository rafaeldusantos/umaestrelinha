import { beforeEach, describe, expect, it, vi } from 'vitest'

import { triggerOrderNotification } from '../notify.ts'
import type { OrderWriteClient } from '../types.ts'

// Feature `75` · `MAA-24`, `AD-059` — o disparo `action=trigger` subiu do painel
// (`apps/backoffice/src/entities/order/api/notifyOrder.ts`) com o client RECEBIDO. O caminho e o
// corpo são escritos por extenso aqui: lê-los de uma constante do próprio módulo provaria que ele é
// igual a si mesmo.

const invoke = vi.fn()
const client = { functions: { invoke: (...args: unknown[]) => invoke(...args) } } as unknown as OrderWriteClient

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'

beforeEach(() => {
  invoke.mockReset()
})

describe('triggerOrderNotification — a porta `trigger`, com o client recebido', () => {
  it('chama `send-notification?action=trigger` com SÓ `order_id` e `trigger` — a mensagem é do servidor', async () => {
    invoke.mockResolvedValue({ data: { sent: true }, error: null })

    await triggerOrderNotification(client, ORDER_ID, 'order_status_changed')

    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('send-notification?action=trigger', {
      body: { order_id: ORDER_ID, trigger: 'order_status_changed' },
    })
  })

  it('o gatilho passado é o que vai no corpo (material)', async () => {
    invoke.mockResolvedValue({ data: { sent: true }, error: null })

    await triggerOrderNotification(client, ORDER_ID, 'material_status_changed')

    expect(invoke.mock.calls[0][1]).toEqual({ body: { order_id: ORDER_ID, trigger: 'material_status_changed' } })
  })

  it('`true` só quando a resposta diz que saiu (`sent: true`)', async () => {
    invoke.mockResolvedValue({ data: { sent: true, results: [{ ok: true }] }, error: null })
    await expect(triggerOrderNotification(client, ORDER_ID, 'order_status_changed')).resolves.toBe(true)
  })

  it.each([
    ['`sent: false`', { data: { sent: false }, error: null }],
    ['`sent` truthy que não é `true`', { data: { sent: 'yes' }, error: null }],
    ['sem `data`', { data: null, error: null }],
    ['`{ error }` (o 422 da pré-condição)', { data: null, error: { message: 'Edge Function returned a non-2xx status code' } }],
  ])('%s ⇒ `false`', async (_rotulo, resposta) => {
    invoke.mockResolvedValue(resposta)
    await expect(triggerOrderNotification(client, ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('exceção SÍNCRONA do client ⇒ `false`, sem lançar', async () => {
    invoke.mockImplementation(() => {
      throw new Error('boom síncrono')
    })
    await expect(triggerOrderNotification(client, ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('promessa REJEITADA ⇒ `false`, sem lançar', async () => {
    invoke.mockRejectedValue(new Error('rede'))
    await expect(triggerOrderNotification(client, ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })
})
