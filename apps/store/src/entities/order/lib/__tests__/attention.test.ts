import { describe, expect, it } from 'vitest'
import type { Order, OrderItem } from '../../api/useOrders'
import { accountAttention } from '../attention'

// Feature 59 — "Precisa da sua atenção" (`PEN-01..07`): o que depende da cliente, no topo da conta.

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const AGORA = new Date('2026-10-04T15:00:00Z')
const haDias = (dias: number) => new Date(AGORA.getTime() - dias * DIA).toISOString()

const peca = (extra: Partial<OrderItem> = {}): OrderItem => ({
  id: 'i1',
  product_name: 'Pingente Estrela',
  product_image: null,
  size: null,
  finish: null,
  quantity: 1,
  unit_price: 100,
  requires_material: false,
  ...extra,
})

const pedido = (id: string, extra: Partial<Order> = {}): Order =>
  ({
    id,
    order_number: id,
    customer_name: 'Ana',
    customer_email: 'ana@x.com',
    status: 'pending',
    payment_method: 'pix',
    payment_status: 'approved',
    subtotal: 100,
    discount: 0,
    shipping_cost: 0,
    total: 100,
    paid_at: haDias(1),
    material_status: 'nao_aplicavel',
    created_at: haDias(1),
    order_items: [peca()],
    ...extra,
  }) as Order

const materialPendente = (id: string, extra: Partial<Order> = {}) =>
  pedido(id, {
    material_status: 'aguardando_material',
    order_items: [
      peca({ id: 'a', product_name: 'Corrente', requires_material: false }),
      peca({ id: 'b', product_name: 'Árvore da Vida', requires_material: true }),
      peca({ id: 'c', product_name: 'Gota', requires_material: true }),
    ],
    ...extra,
  })

describe('accountAttention — um caso por tipo', () => {
  it('material (PEN-01): pago, aguardando, com peça que exige material — e o nome da PRIMEIRA delas', () => {
    const [p] = accountAttention([materialPendente('m1')], AGORA)

    expect(p.kind).toBe('material')
    expect(p.order.id).toBe('m1')
    expect(p.pieceName).toBe('Árvore da Vida')
  })

  it('material: sem peça que exige material, nenhuma pendência — mesmo com o estado do pedido em aguardando', () => {
    expect(accountAttention([pedido('m2', { material_status: 'aguardando_material' })], AGORA)).toEqual([])
  })

  it('material: não pago, ou já postado (`material_enviado`), não pede o código', () => {
    expect(
      accountAttention(
        [materialPendente('m3', { payment_status: 'rejected', paid_at: null, payment_method: 'card' })],
        AGORA,
      ).map((p) => p.kind),
    ).toEqual(['payment_lost'])
    expect(accountAttention([materialPendente('m4', { material_status: 'material_enviado' })], AGORA)).toEqual([])
  })

  it('PIX pendente (PEN-02): "pay_pending"; cartão pendente não', () => {
    expect(
      accountAttention([pedido('p1', { payment_status: 'pending', paid_at: null })], AGORA).map((p) => p.kind),
    ).toEqual(['pay_pending'])
    expect(
      accountAttention(
        [pedido('p2', { payment_method: 'card', payment_status: 'pending', paid_at: null })],
        AGORA,
      ),
    ).toEqual([])
  })

  it.each(['expired', 'rejected'] as const)(
    'PIX %s com 6 dias e 23 h (PEN-03): "repix", com o prazo de `created_at + 7 dias`',
    (payment_status) => {
      const criado = new Date(AGORA.getTime() - (6 * DIA + 23 * HORA)).toISOString()
      const [p] = accountAttention([pedido('r1', { payment_status, paid_at: null, created_at: criado })], AGORA)

      expect(p.kind).toBe('repix')
      expect(p.deadline?.toISOString()).toBe(new Date(new Date(criado).getTime() + 7 * DIA).toISOString())
    },
  )

  it.each(['expired', 'rejected'] as const)('PIX %s com 7 dias e 1 min (PEN-04): "payment_lost"', (payment_status) => {
    const criado = new Date(AGORA.getTime() - (7 * DIA + 60 * 1000)).toISOString()
    expect(
      accountAttention([pedido('l1', { payment_status, paid_at: null, created_at: criado })], AGORA).map(
        (p) => p.kind,
      ),
    ).toEqual(['payment_lost'])
  })

  it('pago e em produção, entregue ou reembolsado: nada', () => {
    expect(
      accountAttention(
        [
          pedido('ok1'),
          pedido('ok2', { status: 'delivered' }),
          pedido('ok3', { payment_status: 'refunded' }),
        ],
        AGORA,
      ),
    ).toEqual([])
  })
})

describe('accountAttention — cancelado nunca gera pendência', () => {
  it.each([
    ['material', materialPendente('c1', { status: 'cancelled' })],
    ['PIX pendente', pedido('c2', { status: 'cancelled', payment_status: 'pending', paid_at: null })],
    ['PIX expirado', pedido('c3', { status: 'cancelled', payment_status: 'expired', paid_at: null })],
  ])('%s cancelado: nenhuma', (_n, o) => {
    expect(accountAttention([o], AGORA)).toEqual([])
  })
})

describe('accountAttention — a ordem (PEN-06) e o vazio (PEN-07)', () => {
  it('pagamento antes de material, e dentro de cada tipo a mais antiga primeiro', () => {
    const lista = [
      materialPendente('mat-novo', { created_at: haDias(1) }),
      pedido('pix-novo', { payment_status: 'pending', paid_at: null, created_at: haDias(1) }),
      materialPendente('mat-antigo', { created_at: haDias(5) }),
      pedido('exp-antigo', { payment_status: 'expired', paid_at: null, created_at: haDias(3) }),
      pedido('perdido', { payment_status: 'expired', paid_at: null, created_at: haDias(30) }),
    ]

    expect(accountAttention(lista, AGORA).map((p) => p.order.id)).toEqual([
      'perdido',
      'exp-antigo',
      'pix-novo',
      'mat-antigo',
      'mat-novo',
    ])
  })

  it('sem pendência, lista vazia — e sem pedidos também', () => {
    expect(accountAttention([pedido('ok')], AGORA)).toEqual([])
    expect(accountAttention([], AGORA)).toEqual([])
    expect(accountAttention(undefined, AGORA)).toEqual([])
  })
})
