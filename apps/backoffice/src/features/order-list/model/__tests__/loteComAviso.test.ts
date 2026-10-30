// Feature `88` · T19 — o lote com progresso, a escolha da caixa e a contagem de e-mails
// (`CRG-10`, `CRG-11`, `AVS-19`). Os casos antigos do lote (`orderList.test.ts`) seguem intactos.

import { describe, expect, it, vi } from 'vitest'
import type { AdminOrderRow } from '@/entities/order/api/orderQuery'
import { BULK_LIMIT, bulkSummary, runMaterialBulk, runStatusBulk } from '../bulkMaterial'

let seq = 0
const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: `o${++seq}`,
  order_number: `100${seq}`,
  customer_id: null,
  customer_name: 'Luciana Prado',
  customer_email: 'lu@example.com',
  status: 'paid',
  payment_status: 'approved',
  payment_method: 'pix',
  total: 100,
  tracking_code: null,
  material_tracking_code: null,
  material_status: 'aguardando_material',
  material_received_at: null,
  created_at: '2026-10-20T12:00:00Z',
  notes: null,
  purchase_ordinal: 1,
  customer_phone: null,
  ...over,
})

describe('runMaterialBulk — progresso (CRG-10)', () => {
  it('chama onProgress a cada pedido, inclusive no que falha e no que lança', async () => {
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, reason: null })
      .mockResolvedValueOnce({ ok: false, reason: 'rpc_failed' })
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce({ ok: false, reason: 'invalid_transition' })
    const onProgress = vi.fn()

    const r = await runMaterialBulk([row(), row(), row(), row()], 'material_recebido', transition, { onProgress })

    expect(onProgress.mock.calls).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]])
    expect(r).toMatchObject({ changed: 1, failed: 2, refused: 1 })
  })

  it('o progresso conta só os 50 do teto', async () => {
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    const onProgress = vi.fn()
    await runMaterialBulk(Array.from({ length: 70 }, () => row()), 'material_recebido', transition, { onProgress })

    expect(transition).toHaveBeenCalledTimes(BULK_LIMIT)
    expect(onProgress).toHaveBeenLastCalledWith(BULK_LIMIT, BULK_LIMIT)
    expect(onProgress).toHaveBeenCalledTimes(BULK_LIMIT)
  })
})

describe('runMaterialBulk — a escolha da caixa chega a cada escrita (AVS-19)', () => {
  it('`false` chega por valor, como terceiro argumento, a TODAS as escritas', async () => {
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    const [a, b] = [row(), row()]
    await runMaterialBulk([a, b], 'material_recebido', transition, { avisarCliente: false })

    expect(transition.mock.calls).toEqual([
      [a.id, 'material_recebido', false],
      [b.id, 'material_recebido', false],
    ])
  })

  it('`true` também chega por valor', async () => {
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    const a = row()
    await runMaterialBulk([a], 'material_recebido', transition, { avisarCliente: true })
    expect(transition.mock.calls).toEqual([[a.id, 'material_recebido', true]])
  })

  it('sem escolha (lote sem diálogo) ⇒ exatamente dois argumentos', async () => {
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    const a = row()
    await runMaterialBulk([a], 'material_recebido', transition)
    expect(transition.mock.calls).toEqual([[a.id, 'material_recebido']])
  })
})

describe('runMaterialBulk — contagem de e-mails e anotados (CRG-11)', () => {
  it('soma `emailSent` só das escritas que passaram', async () => {
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, reason: null, emailSent: true })
      .mockResolvedValueOnce({ ok: true, reason: null, emailSent: false })
      .mockResolvedValueOnce({ ok: true, reason: null, emailSent: true })
      .mockResolvedValueOnce({ ok: false, reason: 'invalid_transition', emailSent: true })

    const r = await runMaterialBulk([row(), row(), row(), row()], 'material_recebido', transition, { avisarCliente: true })
    expect(r.emailsSent).toBe(2)
    expect(r.annotated).toBe(0)
  })

  it('caixa desmarcada: anotados = os que passaram E tinham e-mail previsto', async () => {
    const [a, b, c] = [row(), row(), row()]
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, reason: null, emailSent: true }) // a: aviso da dona saiu
      .mockResolvedValueOnce({ ok: true, reason: null }) // b: sem previsão
      .mockResolvedValueOnce({ ok: false, reason: 'rpc_failed' }) // c: previsto, mas falhou

    const r = await runMaterialBulk([a, b, c], 'material_recebido', transition, {
      avisarCliente: false,
      previstos: new Set([a.id, c.id]),
    })
    expect(r.annotated).toBe(1)
  })
})

describe('runStatusBulk — o avanço em lote (CRG-10, CRG-11)', () => {
  it('cada pedido vai ao PRÓXIMO status dele, com a escolha por valor', async () => {
    const update = vi.fn().mockResolvedValue({ error: null, emailSent: false })
    const [a, b] = [row({ status: 'separating' }), row({ status: 'paid' })]
    await runStatusBulk([a, b], update, { avisarCliente: false })

    expect(update.mock.calls).toEqual([
      [a.id, 'shipped', false],
      [b.id, 'separating', false],
    ])
  })

  it('sem escolha ⇒ dois argumentos', async () => {
    const update = vi.fn().mockResolvedValue({ error: null })
    const a = row({ status: 'shipped' })
    await runStatusBulk([a], update)
    expect(update.mock.calls).toEqual([[a.id, 'delivered']])
  })

  it('fim de linha fica como está, fora do progresso, e é contado', async () => {
    const update = vi.fn().mockResolvedValue({ error: null, emailSent: true })
    const onProgress = vi.fn()
    const r = await runStatusBulk(
      [row({ status: 'delivered' }), row({ status: 'separating' }), row({ status: 'cancelled' })],
      update,
      { onProgress },
    )
    expect(update).toHaveBeenCalledTimes(1)
    expect(onProgress.mock.calls).toEqual([[1, 1]])
    expect(r).toMatchObject({ changed: 1, untouched: 2, emailsSent: 1 })
  })

  it('a falha no meio não para o lote, e conta como falha', async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ error: null, emailSent: true })
      .mockResolvedValueOnce({ error: new Error('boom') })
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce({ error: null, emailSent: false })
    const rows = [row(), row(), row(), row()]
    const onProgress = vi.fn()
    const r = await runStatusBulk(rows, update, { onProgress })

    expect(update).toHaveBeenCalledTimes(4)
    expect(onProgress).toHaveBeenCalledTimes(4)
    expect(r).toMatchObject({ changed: 2, failed: 2, emailsSent: 1 })
    expect(r.failedOrders).toEqual([rows[1].order_number, rows[2].order_number])
  })

  it('o teto vale também aqui', async () => {
    const update = vi.fn().mockResolvedValue({ error: null })
    await runStatusBulk(Array.from({ length: 60 }, () => row()), update)
    expect(update).toHaveBeenCalledTimes(BULK_LIMIT)
  })
})

describe('bulkSummary — o resumo com os e-mails (CRG-11)', () => {
  const base = { refusedOrders: [], failedOrders: [] }
  const avancaram = { um: 'avançou', varios: 'avançaram' }

  it('mudaram · ficaram · recusados · falharam · e-mails enviados', () => {
    expect(
      bulkSummary(
        { ...base, changed: 7, refused: 2, failed: 1, untouched: 3, emailsSent: 3, annotated: 0 },
        { verbo: avancaram, aviso: { perguntou: true, avisar: true } },
      ),
    ).toBe('7 avançaram · 3 ficaram como estavam (já no fim do caminho) · 2 não estavam em estado que permite · 1 falhou — tente de novo · 3 e-mails enviados')
  })

  it('caixa desmarcada ⇒ a frase pela CAIXA, mesmo com `emailSent` (o aviso à dona)', () => {
    expect(
      bulkSummary(
        { ...base, changed: 2, refused: 0, failed: 0, emailsSent: 2, annotated: 1 },
        { aviso: { perguntou: true, avisar: false } },
      ),
    ).toBe('2 marcadas · sem e-mail às clientes — anotado no histórico de 1 pedido')
  })

  it('caixa marcada e nenhum e-mail saiu ⇒ diz isso, não promete', () => {
    expect(
      bulkSummary({ ...base, changed: 1, refused: 0, failed: 0, emailsSent: 0 }, { aviso: { perguntou: true, avisar: true } }),
    ).toBe('1 marcada · nenhum e-mail saiu')
  })

  it('lote sem diálogo ⇒ nenhum aviso sai', () => {
    expect(
      bulkSummary({ ...base, changed: 4, refused: 0, failed: 0, emailsSent: 0 }, { verbo: avancaram, aviso: { perguntou: false, avisar: true } }),
    ).toBe('4 avançaram · nenhum aviso sai nestas mudanças')
  })

  it('1 e-mail no singular', () => {
    expect(
      bulkSummary({ ...base, changed: 1, refused: 0, failed: 0, emailsSent: 1 }, { aviso: { perguntou: true, avisar: true } }),
    ).toBe('1 marcada · 1 e-mail enviado')
  })

  it('nada mudou ⇒ não fala de e-mail', () => {
    expect(
      bulkSummary({ ...base, changed: 0, refused: 2, failed: 0 }, { aviso: { perguntou: true, avisar: false } }),
    ).toBe('2 não estavam em estado que permite')
  })
})
