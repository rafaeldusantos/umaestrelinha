import { describe, expect, it } from 'vitest'

import { route } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase, type FakeSupabaseOptions } from './fakes.ts'

/**
 * A porta da dona que fecha a cobrança aberta de um pedido no Mercado Pago — chamada pelo painel ao
 * cancelar e ao registrar o pagamento à mão. Fechar é cancelar a order do MP (`cancelPreviousOrder`):
 * o PIX copiado antes ou o cartão em análise deixam de poder ser pagos.
 */

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const MP_ORDER_ID = 'ORDTST01KCOBRANCAABERTA0000000'
const ADMIN = { id: 'admin-1' }

const pedir = (body: unknown, comToken = true) =>
  new Request('http://local/functions/v1/mercado-pago?action=close-charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(comToken ? { Authorization: 'Bearer jwt-admin' } : {}) },
    body: JSON.stringify(body),
  })

const montar = (pedido: Record<string, unknown> | null, opcoes: FakeSupabaseOptions = {}, mpOk = true) => {
  const supabase = createFakeSupabase({
    user: ADMIN,
    rows: { orders: pedido },
    rpcByFn: { has_role: { data: true } },
    ...opcoes,
  })
  const fetchDouble = createFakeFetch([{ match: '/cancel', status: mpOk ? 200 : 409, body: { id: MP_ORDER_ID } }])
  return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
}

const cancelamentos = (calls: { url: string }[]) => calls.filter((c) => c.url.endsWith(`/v1/orders/${MP_ORDER_ID}/cancel`))

describe('fechar a cobrança aberta de um pedido', () => {
  it('pedido cancelado com cobrança aberta: cancela a order no Mercado Pago', async () => {
    const { fetchDouble, deps } = montar({ id: ORDER_ID, status: 'cancelled', payment_status: 'pending', paid_at: null, mp_order_id: MP_ORDER_ID })
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    expect(r.status).toBe(200)
    await expect(r.json()).resolves.toEqual({ result: 'fechada' })
    expect(cancelamentos(fetchDouble.calls)).toHaveLength(1)
  })

  it('pedido pago (registrado à mão) com cobrança aberta: cancela a order no Mercado Pago', async () => {
    const { fetchDouble, deps } = montar({ id: ORDER_ID, status: 'paid', payment_status: 'approved', paid_at: '2026-11-09T12:00:00Z', mp_order_id: MP_ORDER_ID })
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    await expect(r.json()).resolves.toEqual({ result: 'fechada' })
    expect(cancelamentos(fetchDouble.calls)).toHaveLength(1)
  })

  it('a order que o Mercado Pago não cancela (já processada) responde "nao_fechada", sem erro', async () => {
    const { deps } = montar({ id: ORDER_ID, status: 'cancelled', payment_status: 'pending', paid_at: null, mp_order_id: MP_ORDER_ID }, {}, false)
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    expect(r.status).toBe(200)
    await expect(r.json()).resolves.toEqual({ result: 'nao_fechada' })
  })

  it('pedido sem cobrança no Mercado Pago: nada a fechar, e nenhuma chamada', async () => {
    const { fetchDouble, deps } = montar({ id: ORDER_ID, status: 'cancelled', payment_status: 'pending', paid_at: null, mp_order_id: null })
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    await expect(r.json()).resolves.toEqual({ result: 'sem_cobranca' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('pedido em aberto (nem cancelado nem pago): recusa, e a cobrança da cliente continua de pé', async () => {
    const { fetchDouble, deps } = montar({ id: ORDER_ID, status: 'pending', payment_status: 'pending', paid_at: null, mp_order_id: MP_ORDER_ID })
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    expect(r.status).toBe(409)
    expect((await r.json()).result).toBe('em_aberto')
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('sem sessão: 401, e nada sai daqui', async () => {
    const { fetchDouble, deps } = montar({ id: ORDER_ID, status: 'cancelled', payment_status: 'pending', paid_at: null, mp_order_id: MP_ORDER_ID })
    const r = await route(deps, pedir({ order_id: ORDER_ID }, false))

    expect(r.status).toBe(401)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('conta que não é admin: 403, e nada sai daqui', async () => {
    const { fetchDouble, deps } = montar(
      { id: ORDER_ID, status: 'cancelled', payment_status: 'pending', paid_at: null, mp_order_id: MP_ORDER_ID },
      { rpcByFn: { has_role: { data: false } } },
    )
    const r = await route(deps, pedir({ order_id: ORDER_ID }))

    expect(r.status).toBe(403)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('order_id ausente ou que não é uuid: 400', async () => {
    const { deps } = montar(null)
    expect((await route(deps, pedir({}))).status).toBe(400)
    expect((await route(deps, pedir({ order_id: 'abc' }))).status).toBe(400)
  })

  it('pedido inexistente: 404', async () => {
    const { deps } = montar(null)
    expect((await route(deps, pedir({ order_id: ORDER_ID }))).status).toBe(404)
  })
})
