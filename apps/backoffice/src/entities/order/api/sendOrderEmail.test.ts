import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('@estrelinha/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }))

import { sendOrderEmail } from './sendOrderEmail'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'

beforeEach(() => {
  invoke.mockReset()
})

describe('sendOrderEmail', () => {
  it('manda SÓ type e order_id — destinatário e conteúdo são resolvidos no servidor', async () => {
    invoke.mockResolvedValue({ data: { sent: true, id: 'msg-1' }, error: null })

    await sendOrderEmail(ORDER_ID, 'order_shipped')

    expect(invoke).toHaveBeenCalledWith('send-email?action=send', {
      body: { type: 'order_shipped', order_id: ORDER_ID },
    })
  })

  it('sent:true → true', async () => {
    invoke.mockResolvedValue({ data: { sent: true, id: 'msg-1' }, error: null })

    await expect(sendOrderEmail(ORDER_ID, 'order_shipped')).resolves.toBe(true)
  })

  it('TRG-13: 422 (par incompleto) → false, sem lançar — é resposta esperada, não erro', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } })

    await expect(sendOrderEmail(ORDER_ID, 'order_shipped')).resolves.toBe(false)
  })

  it('TRG-14: já enviado (skipped) → false, para não prometer aviso duplicado no toast', async () => {
    invoke.mockResolvedValue({ data: { sent: false, skipped: 'already_sent' }, error: null })

    await expect(sendOrderEmail(ORDER_ID, 'order_shipped')).resolves.toBe(false)
  })

  it('falha do provedor (sent:false + reason) → false', async () => {
    invoke.mockResolvedValue({ data: { sent: false, reason: 'resend_forbidden' }, error: null })

    await expect(sendOrderEmail(ORDER_ID, 'order_shipped')).resolves.toBe(false)
  })

  it('exceção de rede → false, sem propagar: o e-mail nunca derruba a ação do admin', async () => {
    invoke.mockRejectedValue(new Error('network down'))

    await expect(sendOrderEmail(ORDER_ID, 'order_shipped')).resolves.toBe(false)
  })
})
