import { beforeEach, describe, expect, it, vi } from 'vitest'

// `validateCoupon` passou a delegar a regra a `core/coupons/rules.ts` (feature 89). Este arquivo
// prova o hook pelo que a loja vê: as recusas que dependem de consulta, a pergunta ao banco SÓ
// quando o cupom é de primeira compra e passou no resto, e o desconto pelo dono único do cupom.

const { maybeSingle, countEq, ordersSelect } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  countEq: vi.fn(),
  ordersSelect: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'orders') {
        return {
          select: (...args: unknown[]) => {
            ordersSelect(...args)
            return { eq: countEq }
          },
        }
      }
      return { select: () => ({ ilike: () => ({ maybeSingle }) }) }
    },
  },
}))

import { validateCoupon } from '../useCoupons'

const linha = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  code: 'DEZ',
  description: null,
  type: 'percent',
  value: 10,
  min_order: 0,
  max_uses: null,
  used_count: 0,
  first_order_only: false,
  active: true,
  valid_from: null,
  valid_until: null,
  created_at: '',
  updated_at: '',
  ...over,
})

const entrada = { code: ' dez ', subtotal: 89.7, shippingCost: 24.8 }

beforeEach(() => {
  maybeSingle.mockReset()
  countEq.mockReset()
  ordersSelect.mockReset()
})

describe('validateCoupon', () => {
  it('código vazio', async () => {
    expect(await validateCoupon({ ...entrada, code: '  ' })).toEqual({ ok: false, error: 'Informe um código.' })
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  it('erro da leitura e cupom inexistente', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'x' } })
    expect(await validateCoupon(entrada)).toEqual({ ok: false, error: 'Erro ao validar cupom.' })
    maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await validateCoupon(entrada)).toEqual({ ok: false, error: 'Cupom inválido.' })
  })

  it('recusa da regra pura chega com o texto da loja', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ active: false }), error: null })
    expect(await validateCoupon(entrada)).toEqual({ ok: false, error: 'Cupom desativado.' })
    maybeSingle.mockResolvedValueOnce({ data: linha({ min_order: 100 }), error: null })
    expect(await validateCoupon(entrada)).toEqual({ ok: false, error: 'Pedido mínimo de R$ 100,00.' })
  })

  it('percentual: desconto pela base arredondada (3 × 29,90 = 89,70 ⇒ 8,97)', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha(), error: null })
    const r = await validateCoupon({ ...entrada, subtotal: 29.9 * 3 })
    expect(r.ok).toBe(true)
    expect(r.coupon).toEqual({ id: 'c1', code: 'DEZ', type: 'percent', value: 10, discount: 8.97, freeShipping: false })
  })

  it('fixo nunca desconta mais que o subtotal', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ type: 'fixed', value: 200 }), error: null })
    expect((await validateCoupon(entrada)).coupon?.discount).toBe(89.7)
  })

  it('frete grátis: desconto = frete, e a bandeira', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ type: 'free_shipping', value: 0 }), error: null })
    const r = await validateCoupon(entrada)
    expect(r.coupon?.freeShipping).toBe(true)
    expect(r.coupon?.discount).toBe(24.8)
  })

  it('primeira compra com e-mail que já comprou: recusa depois de perguntar ao banco', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ first_order_only: true }), error: null })
    countEq.mockResolvedValueOnce({ count: 2 })
    const r = await validateCoupon({ ...entrada, customerEmail: 'a@exemplo.invalid' })
    expect(r).toEqual({ ok: false, error: 'Cupom válido apenas no primeiro pedido.' })
    expect(countEq).toHaveBeenCalledWith('customer_email', 'a@exemplo.invalid')
    expect(ordersSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  })

  it('primeira compra sem pedido anterior: vale', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ first_order_only: true }), error: null })
    countEq.mockResolvedValueOnce({ count: 0 })
    expect((await validateCoupon({ ...entrada, customerEmail: 'a@exemplo.invalid' })).ok).toBe(true)
  })

  it('não pergunta ao banco quando o cupom já foi recusado antes, nem quando não há e-mail', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha({ first_order_only: true, active: false }), error: null })
    await validateCoupon({ ...entrada, customerEmail: 'a@exemplo.invalid' })
    maybeSingle.mockResolvedValueOnce({ data: linha({ first_order_only: true }), error: null })
    expect((await validateCoupon(entrada)).ok).toBe(true)
    expect(countEq).not.toHaveBeenCalled()
  })

  it('cupom que não é de primeira compra não pergunta ao banco, mesmo com e-mail', async () => {
    maybeSingle.mockResolvedValueOnce({ data: linha(), error: null })
    expect((await validateCoupon({ ...entrada, customerEmail: 'a@exemplo.invalid' })).ok).toBe(true)
    expect(countEq).not.toHaveBeenCalled()
  })
})
