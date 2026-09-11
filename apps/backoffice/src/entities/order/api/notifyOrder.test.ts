import { beforeEach, describe, expect, it, vi } from 'vitest'

// Substitui `sendOrderEmail.test.ts` (feature 42): os 6 casos dele continuam aqui, agora sobre o
// gatilho, mais os do reenvio por evento. A troca de nome é a troca de contrato — quem chama diz o
// que ACONTECEU, e não qual mensagem quer (`AD-032`).

const invoke = vi.fn()

vi.mock('@estrelinha/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }))

import { notifyOrder, resendNotification } from './notifyOrder'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'

beforeEach(() => {
  invoke.mockReset()
})

describe('notifyOrder — o gatilho', () => {
  it('manda SÓ trigger e order_id, na porta `trigger` — destinatário e conteúdo são do servidor', async () => {
    invoke.mockResolvedValue({ data: { sent: true, results: [] }, error: null })

    await notifyOrder(ORDER_ID, 'order_status_changed')

    expect(invoke).toHaveBeenCalledWith('send-notification?action=trigger', {
      body: { order_id: ORDER_ID, trigger: 'order_status_changed' },
    })
  })

  it('NÃO manda evento — a escolha da mensagem é de `core`, não do painel', async () => {
    invoke.mockResolvedValue({ data: { sent: true }, error: null })

    await notifyOrder(ORDER_ID, 'material_status_changed')

    const corpo = invoke.mock.calls[0][1].body
    expect(corpo).not.toHaveProperty('event')
    expect(corpo).not.toHaveProperty('type')
  })

  it('sent:true → true', async () => {
    invoke.mockResolvedValue({ data: { sent: true, results: [{ ok: true }] }, error: null })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(true)
  })

  it('TRG-13: par incompleto (a pré-condição barrou) → false, sem lançar — é resposta esperada', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('TRG-14: já enviado → false, para não prometer aviso duplicado no toast', async () => {
    invoke.mockResolvedValue({ data: { sent: false, results: [{ ok: false, skipped: 'already_sent' }] }, error: null })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('evento DESLIGADO no painel → false, e nenhum erro: é o estado normal dos onze novos', async () => {
    invoke.mockResolvedValue({ data: { sent: false, results: [{ ok: false, skipped: 'disabled' }] }, error: null })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('falha do provedor → false', async () => {
    invoke.mockResolvedValue({ data: { sent: false, results: [{ ok: false, reason: 'resend_forbidden' }] }, error: null })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('exceção de rede → false, sem propagar: o aviso nunca derruba a ação do admin', async () => {
    invoke.mockRejectedValue(new Error('network down'))

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(false)
  })

  it('um gatilho que produziu VÁRIOS eventos conta como enviado se algum saiu', async () => {
    // `payment_approved` produz a mensagem da cliente E o aviso da dona. Se o da dona estiver
    // desligado, o toast ainda deve dizer que a cliente foi avisada.
    invoke.mockResolvedValue({
      data: { sent: true, results: [{ ok: true, event: 'order_paid' }, { ok: false, skipped: 'disabled' }] },
      error: null,
    })

    await expect(notifyOrder(ORDER_ID, 'order_status_changed')).resolves.toBe(true)
  })
})

describe('resendNotification — o reenvio', () => {
  it('nomeia o EVENTO e o canal, na porta `send` — repetir é dizer qual mensagem', async () => {
    invoke.mockResolvedValue({ data: { sent: true, id: 'msg-1' }, error: null })

    await resendNotification(ORDER_ID, 'order_shipped')

    expect(invoke).toHaveBeenCalledWith('send-notification?action=send', {
      body: { order_id: ORDER_ID, event: 'order_shipped', channel: 'email' },
    })
  })

  it('sent:true → true; 422 → false; exceção → false', async () => {
    invoke.mockResolvedValue({ data: { sent: true, id: 'm' }, error: null })
    await expect(resendNotification(ORDER_ID, 'order_paid')).resolves.toBe(true)

    invoke.mockResolvedValue({ data: null, error: { message: 'non-2xx' } })
    await expect(resendNotification(ORDER_ID, 'order_paid')).resolves.toBe(false)

    invoke.mockRejectedValue(new Error('down'))
    await expect(resendNotification(ORDER_ID, 'order_paid')).resolves.toBe(false)
  })
})
