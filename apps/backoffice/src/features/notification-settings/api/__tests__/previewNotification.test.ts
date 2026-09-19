import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}))

import { previewNotification } from '../previewNotification'

beforeEach(() => {
  invokeMock.mockReset()
})

describe('previewNotification — o corpo da chamada (ABN-06)', () => {
  it('sem orderId: event, channel email e draft — SEM order_id no corpo', async () => {
    invokeMock.mockResolvedValue({ data: { subject: 'S', html: '<p>H</p>', text: 'T', sample: true }, error: null })

    await previewNotification({ event: 'order_paid', draft: { subject: 'Novo assunto' } })

    expect(invokeMock).toHaveBeenCalledWith('send-notification?action=preview', {
      body: { event: 'order_paid', channel: 'email', draft: { subject: 'Novo assunto' } },
    })
  })

  it('com orderId: order_id entra no corpo', async () => {
    invokeMock.mockResolvedValue({ data: { subject: 'S', html: '<p>H</p>', text: 'T', sample: false }, error: null })

    await previewNotification({ event: 'order_paid', draft: {}, orderId: 'order-123' })

    expect(invokeMock).toHaveBeenCalledWith('send-notification?action=preview', {
      body: { event: 'order_paid', channel: 'email', draft: {}, order_id: 'order-123' },
    })
  })
})

describe('previewNotification — resposta de sucesso repassada tal qual', () => {
  it('devolve subject, html, text e sample exatamente como a function respondeu', async () => {
    invokeMock.mockResolvedValue({
      data: { subject: 'Pagamento aprovado', html: '<p data-marcador="x">Corpo</p>', text: 'Corpo em texto', sample: true },
      error: null,
    })

    const resultado = await previewNotification({ event: 'order_paid', draft: {} })

    expect(resultado).toEqual({
      subject: 'Pagamento aprovado',
      html: '<p data-marcador="x">Corpo</p>',
      text: 'Corpo em texto',
      sample: true,
    })
  })
})

describe('previewNotification — nunca lança', () => {
  it('falha de rede (invoke lança) → { error }, não propaga', async () => {
    invokeMock.mockRejectedValue(new Error('network down'))

    const resultado = await previewNotification({ event: 'order_paid', draft: {} })

    expect('error' in resultado).toBe(true)
  })

  it('422 de recusa: lê o `error` do CORPO do FunctionsHttpError, não um texto genérico', async () => {
    const resposta = { json: async () => ({ error: 'Variável desconhecida: {{materia}}.' }) }
    invokeMock.mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError', context: resposta } })

    const resultado = await previewNotification({ event: 'order_paid', draft: { lead: '{{materia}}' } })

    expect(resultado).toEqual({ error: 'Variável desconhecida: {{materia}}.' })
  })

  it('erro sem corpo legível cai no fallback em português, nunca undefined nem crash', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError', context: undefined } })

    const resultado = await previewNotification({ event: 'order_paid', draft: {} })

    expect('error' in resultado && typeof resultado.error === 'string' && resultado.error.length > 0).toBe(true)
  })
})
