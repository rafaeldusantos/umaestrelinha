import { describe, expect, it, vi } from 'vitest'

import { closeOrderCharge } from '../charge.ts'
import * as barril from '../index.ts'

// Fechar a cobrança aberta de um pedido pela porta da `mercado-pago`. Nunca lança: o cancelamento e
// o registro já gravaram, e a cobrança que não fecha não os desfaz.

const cliente = (invoke: (...a: unknown[]) => unknown) =>
  ({ functions: { invoke: vi.fn(invoke) } }) as unknown as Parameters<typeof closeOrderCharge>[0]

describe('closeOrderCharge', () => {
  it('chama a porta com o pedido e devolve o desfecho dela', async () => {
    const c = cliente(async () => ({ data: { result: 'fechada' }, error: null }))
    await expect(closeOrderCharge(c, 'ord-1')).resolves.toBe('fechada')
    expect(c.functions.invoke).toHaveBeenCalledWith('mercado-pago?action=close-charge', { body: { order_id: 'ord-1' } })
  })

  it.each(['nao_fechada', 'sem_cobranca'])('repassa "%s"', async (result) => {
    await expect(closeOrderCharge(cliente(async () => ({ data: { result }, error: null })), 'ord-1')).resolves.toBe(result)
  })

  it('erro da porta, resposta desconhecida ou rede caída viram "falhou", sem lançar', async () => {
    await expect(closeOrderCharge(cliente(async () => ({ data: null, error: { message: '409' } })), 'o')).resolves.toBe('falhou')
    await expect(closeOrderCharge(cliente(async () => ({ data: { result: 'qualquer' }, error: null })), 'o')).resolves.toBe('falhou')
    await expect(closeOrderCharge(cliente(async () => { throw new Error('rede') }), 'o')).resolves.toBe('falhou')
    await expect(closeOrderCharge(cliente(async () => undefined), 'o')).resolves.toBe('falhou')
  })

  it('o barril expõe a regra', () => {
    expect(barril.closeOrderCharge).toBe(closeOrderCharge)
  })
})
