// Feature 18 / T8 — o contrato do formulário de cupom, e a regra da cópia (DSC-08 AC 1-3).

import { describe, expect, it } from 'vitest'
import type { Coupon } from '@estrelinha/supabase/types/coupon'
import { isoFromDateOnly } from '@/shared/lib/dateOnly'
import {
  CODE_TOO_SHORT,
  couponCopyValues,
  couponFormValues,
  couponSchema,
  toCouponPayload,
} from './schema'

const coupon = (over: Partial<Coupon> = {}): Coupon =>
  ({
    id: 'cup-1',
    code: 'ESTRELA10',
    description: 'Boas-vindas',
    type: 'percent',
    value: 10,
    min_order: 80,
    max_uses: 40,
    used_count: 12,
    first_order_only: true,
    active: true,
    valid_from: isoFromDateOnly('2026-08-01'),
    valid_until: isoFromDateOnly('2026-09-30'),
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Coupon

describe('couponSchema', () => {
  it('código com menos de 2 caracteres é recusado (DSC-02 AC 5)', () => {
    const result = couponSchema.safeParse({ code: 'A', type: 'percent', value: 10 })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map(i => i.message)).toContain(CODE_TOO_SHORT)
  })

  it('código válido passa', () => {
    expect(couponSchema.safeParse({ code: 'ESTRELA10', type: 'percent', value: 10 }).success).toBe(true)
  })
})

describe('couponFormValues', () => {
  it('traz o cupom gravado para o formulário, com as datas como dia', () => {
    expect(couponFormValues(coupon())).toEqual({
      code: 'ESTRELA10',
      description: 'Boas-vindas',
      type: 'percent',
      value: 10,
      min_order: 80,
      max_uses: 40,
      first_order_only: true,
      active: true,
      valid_from: '2026-08-01',
      valid_until: '2026-09-30',
    })
  })
})

describe('couponCopyValues (DSC-08)', () => {
  it('copia tipo, valor, mínimo, limite, vigência, descrição e `apenas primeiro pedido`', () => {
    const copy = couponCopyValues(coupon())

    expect(copy).toMatchObject({
      description: 'Boas-vindas',
      type: 'percent',
      value: 10,
      min_order: 80,
      max_uses: 40,
      first_order_only: true,
      valid_from: '2026-08-01',
      valid_until: '2026-09-30',
    })
  })

  it('NÃO copia o código — `coupons.code` é UNIQUE e é o texto que a cliente digita (AC 2)', () => {
    expect(couponCopyValues(coupon()).code).toBe('')
    // E nada de sufixo inventado: um `ESTRELA10-COPIA` publicaria um código que ninguém escolheu.
    expect(couponCopyValues(coupon()).code).not.toContain('ESTRELA10')
  })

  it('nasce desligada, e o contador de usos do original não vem junto (AC 3)', () => {
    const copy = couponCopyValues(coupon({ active: true, used_count: 12 }))

    expect(copy.active).toBe(false)
    expect(copy).not.toHaveProperty('used_count')
    // O payload gravado também não leva uso — a coluna tem `default 0`.
    expect(toCouponPayload(copy)).not.toHaveProperty('used_count')
  })
})

describe('toCouponPayload', () => {
  it('grava o código em maiúsculas e sem espaço (DSC-02 AC 6)', () => {
    expect(toCouponPayload({ code: '  estrela10 ', type: 'percent', value: 10 }).code).toBe('ESTRELA10')
  })

  it('`frete grátis` grava valor zero, qualquer que seja o número no campo (AC 4)', () => {
    expect(toCouponPayload({ code: 'FRETE', type: 'free_shipping', value: 99 }).value).toBe(0)
  })

  it('limite de usos em branco vira `null`, e mínimo em branco vira zero', () => {
    const payload = toCouponPayload({
      code: 'ESTRELA10',
      type: 'percent',
      value: 10,
      max_uses: null,
      min_order: undefined,
    })

    expect(payload.max_uses).toBeNull()
    expect(payload.min_order).toBe(0)
  })

  it('as datas viram ISO de meia-noite local, e a ausência vira `null`', () => {
    const payload = toCouponPayload({
      code: 'ESTRELA10',
      type: 'percent',
      value: 10,
      valid_from: '2026-08-01',
      valid_until: '',
    })

    expect(payload.valid_from).toBe(isoFromDateOnly('2026-08-01'))
    expect(payload.valid_until).toBeNull()
  })
})
