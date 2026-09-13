import { describe, expect, it } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import {
  guestAccessExpiry,
  hashAccessToken,
  newAccessToken,
} from '../../../../packages/core/src/checkout/guestAccess.ts'
import { IDENTIFY_MAX, IDENTIFY_WINDOW_MS, createRateLimiter, route, type Deps } from '../handlers.ts'

/**
 * `CSC-06`/`PED-07` — a convidada lê o próprio pedido.
 *
 * A recusa é sempre a MESMA (403, sem nada do pedido no corpo), e isso é desenho: distinguir
 * "pedido não existe" de "token errado" transformaria a ação num oráculo de quais ids existem.
 */

const AGORA = 1_789_300_800_000 // 2026-09-13T12:00:00Z

const criarDeps = (supabase: ReturnType<typeof createFakeSupabase>, now = AGORA): Deps => ({
  supabase: supabase.client,
  now: () => now,
  limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, () => now),
})

const pedir = (body: unknown) =>
  new Request('https://x.test/functions/v1/checkout?action=get-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

/** Um pedido de convidada com acesso válido para `token`. */
const pedidoCom = async (token: string, expira = guestAccessExpiry(new Date(AGORA))) => ({
  id: 'ord-1',
  customer_name: 'Marina Yamashita',
  customer_email: 'marina@exemplo.com',
  total: 110,
  guest_access_hash: await hashAccessToken(token),
  guest_access_expires_at: expira,
  order_items: [{ product_name: 'Joia', quantity: 1 }],
})

describe('get-order — o token certo abre o pedido', () => {
  it('devolve o pedido com os itens', async () => {
    const token = newAccessToken()
    const supabase = createFakeSupabase({ rows: { orders: await pedidoCom(token) } })
    const res = await route(criarDeps(supabase), pedir({ order_id: 'ord-1', access_token: token }))
    const corpo = await res.json()

    expect(res.status).toBe(200)
    expect(corpo.order.id).toBe('ord-1')
    expect(corpo.order.order_items).toHaveLength(1)
  })

  it('o hash e a validade NÃO voltam para o navegador', async () => {
    // Devolvê-los daria a quem já tem o token um segundo caminho para conferi-lo offline, e
    // vazaria o material de um ataque de dicionário contra tokens futuros.
    const token = newAccessToken()
    const supabase = createFakeSupabase({ rows: { orders: await pedidoCom(token) } })
    const res = await route(criarDeps(supabase), pedir({ order_id: 'ord-1', access_token: token }))
    const { order } = await res.json()

    expect(order).not.toHaveProperty('guest_access_hash')
    expect(order).not.toHaveProperty('guest_access_expires_at')
  })
})

describe('get-order — as recusas (PED-07)', () => {
  const semNadaDoPedido = async (res: Response) => {
    expect(res.status).toBe(403)
    const texto = await res.text()
    // A recusa não pode vazar nem o nome nem o e-mail de quem comprou.
    expect(texto).not.toContain('Marina')
    expect(texto).not.toContain('marina@exemplo.com')
  }

  it('token de OUTRO pedido é recusado', async () => {
    // O caso que uma comparação frouxa deixaria passar: token válido, pedido errado.
    const token = newAccessToken()
    const supabase = createFakeSupabase({ rows: { orders: await pedidoCom(token) } })
    const res = await route(
      criarDeps(supabase),
      pedir({ order_id: 'ord-1', access_token: newAccessToken() }),
    )

    await semNadaDoPedido(res)
  })

  it('token expirado é recusado', async () => {
    const token = newAccessToken()
    const supabase = createFakeSupabase({ rows: { orders: await pedidoCom(token) } })
    const oitoDias = AGORA + 8 * 24 * 60 * 60 * 1000
    const res = await route(
      criarDeps(supabase, oitoDias),
      pedir({ order_id: 'ord-1', access_token: token }),
    )

    await semNadaDoPedido(res)
  })

  it('sem token é recusado, e o banco nem é consultado', async () => {
    const supabase = createFakeSupabase({ rows: { orders: await pedidoCom(newAccessToken()) } })
    const res = await route(criarDeps(supabase), pedir({ order_id: 'ord-1' }))

    await semNadaDoPedido(res)
  })

  it('sem id é recusado', async () => {
    const supabase = createFakeSupabase({ rows: { orders: null } })
    const res = await route(criarDeps(supabase), pedir({ access_token: newAccessToken() }))

    expect(res.status).toBe(403)
  })

  it('pedido inexistente responde o MESMO 403 de token errado', async () => {
    // Sem isto a ação vira um oráculo de quais ids existem.
    const supabase = createFakeSupabase({ rows: { orders: null } })
    const res = await route(
      criarDeps(supabase),
      pedir({ order_id: 'ord-fantasma', access_token: newAccessToken() }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Pedido não encontrado.' })
  })

  it('pedido criado COM sessão não abre por token nenhum', async () => {
    // Ele não tem `guest_access_hash`. Sem o recorte de ausência em `accessGrant`, um token vazio
    // contra um hash vazio passaria — o buraco clássico deste padrão.
    const supabase = createFakeSupabase({
      rows: {
        orders: {
          id: 'ord-1',
          customer_name: 'Marina Yamashita',
          guest_access_hash: null,
          guest_access_expires_at: null,
        },
      },
    })
    const res = await route(
      criarDeps(supabase),
      pedir({ order_id: 'ord-1', access_token: newAccessToken() }),
    )

    expect(res.status).toBe(403)
  })
})
