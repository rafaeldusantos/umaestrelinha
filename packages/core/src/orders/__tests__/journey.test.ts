// `DET-05..08` e `LIN-05` — as etapas do pedido e a data de cada uma, montadas num lugar só.
//
// A mesma função serve aos dois caminhos de leitura do detalhe: a cliente logada (eventos pela RPC
// `customer_order_events`) e a convidada (eventos pelo `checkout?action=get-order`). Escrita duas
// vezes, a mesma entrega teria uma data na conta e outra no link do e-mail.
//
// A regra de data é a que a spec escreve, e o ponto delicado é o negativo: **sem fonte, sem data** —
// nunca `updated_at`, que muda a cada ajuste do painel e mentiria sobre quando a etapa aconteceu
// (`L-017`).

import { describe, expect, it } from 'vitest'

import { orderJourney, type JourneyInput, type JourneyStep } from '../journey'
import type { StatusEvent } from '../situation'

const CRIADO = '2026-10-01T12:00:00Z'
const PAGO = '2026-10-01T12:05:00Z'

const pedido = (extra: Partial<JourneyInput> = {}): JourneyInput => ({
  status: 'pending',
  payment_status: 'pending',
  material_status: 'nao_aplicavel',
  created_at: CRIADO,
  paid_at: null,
  material_received_at: null,
  ...extra,
})

const etapas = (input: JourneyInput, eventos: StatusEvent[] = []): JourneyStep[] => {
  const j = orderJourney(input, eventos)
  if (j.kind !== 'steps') throw new Error(`esperava etapas, veio ${j.kind}`)
  return j.steps
}

const estados = (steps: JourneyStep[]) => steps.map((s) => `${s.key}:${s.state}`)

describe('orderJourney — as etapas (DET-05)', () => {
  it('sem material: cinco etapas, nesta ordem e com estes rótulos', () => {
    const steps = etapas(pedido())
    expect(steps.map((s) => s.label)).toEqual([
      'Pedido recebido',
      'Pagamento aprovado',
      'Em produção no ateliê',
      'A caminho',
      'Entregue',
    ])
  })

  it('com material: a etapa do ateliê entra entre pagamento e produção', () => {
    const steps = etapas(pedido({ material_status: 'aguardando_material' }))
    expect(steps.map((s) => s.key)).toEqual([
      'received',
      'paid',
      'material',
      'production',
      'shipped',
      'delivered',
    ])
    expect(steps[2].label).toBe('Material recebido no ateliê')
  })

  it('material ausente (`null`) é tratado como sem material', () => {
    expect(etapas(pedido({ material_status: null })).map((s) => s.key)).not.toContain('material')
  })
})

describe('orderJourney — o estado de cada etapa', () => {
  it('aguardando pagamento: recebido concluído, pagamento é o atual', () => {
    expect(estados(etapas(pedido()))).toEqual([
      'received:complete',
      'paid:current',
      'production:future',
      'shipped:future',
      'delivered:future',
    ])
  })

  it('pago sem material: produção é a atual', () => {
    expect(estados(etapas(pedido({ payment_status: 'approved', paid_at: PAGO })))).toEqual([
      'received:complete',
      'paid:complete',
      'production:current',
      'shipped:future',
      'delivered:future',
    ])
  })

  it('pago com material por chegar: o material é o atual', () => {
    const steps = etapas(
      pedido({ payment_status: 'approved', paid_at: PAGO, material_status: 'aguardando_material' }),
    )
    expect(estados(steps)).toEqual([
      'received:complete',
      'paid:complete',
      'material:current',
      'production:future',
      'shipped:future',
      'delivered:future',
    ])
  })

  it('material a caminho do ateliê ainda não é material recebido', () => {
    const steps = etapas(
      pedido({ payment_status: 'approved', paid_at: PAGO, material_status: 'material_enviado' }),
    )
    expect(steps.find((s) => s.key === 'material')?.state).toBe('current')
  })

  it('material recebido: produção passa a ser a atual', () => {
    for (const material_status of ['material_recebido', 'em_producao']) {
      const steps = etapas(
        pedido({ payment_status: 'approved', paid_at: PAGO, material_status }),
      )
      expect(steps.find((s) => s.key === 'material')?.state).toBe('complete')
      expect(steps.find((s) => s.key === 'production')?.state).toBe('current')
    }
  })

  it('separando continua com produção como atual', () => {
    const steps = etapas(pedido({ status: 'separating', payment_status: 'approved', paid_at: PAGO }))
    expect(steps.find((s) => s.key === 'production')?.state).toBe('current')
  })

  it('enviado: produção concluída, "Entregue" é a atual', () => {
    const steps = etapas(pedido({ status: 'shipped', payment_status: 'approved', paid_at: PAGO }))
    expect(estados(steps)).toEqual([
      'received:complete',
      'paid:complete',
      'production:complete',
      'shipped:complete',
      'delivered:current',
    ])
  })

  it('entregue: tudo concluído, nenhuma atual', () => {
    const steps = etapas(
      pedido({
        status: 'delivered',
        payment_status: 'approved',
        paid_at: PAGO,
        material_status: 'em_producao',
      }),
    )
    expect(steps.every((s) => s.state === 'complete')).toBe(true)
  })

  it('pedido importado entregue sem `paid_at` nem aprovação: as etapas anteriores também concluem', () => {
    // A Nuvemshop trouxe pedidos entregues com o pagamento em outro vocabulário. Uma etapa
    // posterior concluída implica as anteriores — senão "Entregue" apareceria com "Pagamento" atual.
    const steps = etapas(pedido({ status: 'delivered', payment_status: null }))
    expect(steps.every((s) => s.state === 'complete')).toBe(true)
  })

  it('só uma etapa é a atual, sempre', () => {
    for (const status of ['pending', 'paid', 'separating', 'shipped']) {
      const steps = etapas(pedido({ status, payment_status: 'approved', paid_at: PAGO }))
      expect(steps.filter((s) => s.state === 'current')).toHaveLength(1)
    }
  })
})

describe('orderJourney — a data de cada etapa vem da fonte dela (DET-06)', () => {
  const eventos: StatusEvent[] = [
    { status: 'separating', at: '2026-10-02T10:00:00Z' },
    { status: 'shipped', at: '2026-10-04T10:00:00Z' },
    { status: 'delivered', at: '2026-10-08T10:00:00Z' },
  ]

  it('recebido ← created_at, pago ← paid_at, material ← material_received_at', () => {
    const steps = etapas(
      pedido({
        status: 'delivered',
        payment_status: 'approved',
        paid_at: PAGO,
        material_status: 'em_producao',
        material_received_at: '2026-10-03T09:00:00Z',
      }),
      eventos,
    )
    const at = Object.fromEntries(steps.map((s) => [s.key, s.at]))
    expect(at).toEqual({
      received: CRIADO,
      paid: PAGO,
      material: '2026-10-03T09:00:00Z',
      production: '2026-10-02T10:00:00Z',
      shipped: '2026-10-04T10:00:00Z',
      delivered: '2026-10-08T10:00:00Z',
    })
  })

  it('dois registros `shipped`: vale o PRIMEIRO pela data, não pela posição', () => {
    const steps = etapas(pedido({ status: 'shipped', payment_status: 'approved', paid_at: PAGO }), [
      { status: 'shipped', at: '2026-10-06T10:00:00Z' },
      { status: 'shipped', at: '2026-10-04T10:00:00Z' },
    ])
    expect(steps.find((s) => s.key === 'shipped')?.at).toBe('2026-10-04T10:00:00Z')
  })

  it('sem fonte, sem data — e nunca `updated_at`', () => {
    const input = {
      ...pedido({ status: 'shipped', payment_status: 'approved' }),
      updated_at: '2026-10-09T10:00:00Z',
    } as JourneyInput
    const steps = etapas(input, [])
    const at = Object.fromEntries(steps.map((s) => [s.key, s.at]))
    expect(at).toEqual({
      received: CRIADO,
      paid: null,
      production: null,
      shipped: null,
      delivered: null,
    })
    expect(JSON.stringify(steps)).not.toContain('2026-10-09')
  })

  it('evento de status que não é etapa não vira data de etapa nenhuma', () => {
    const steps = etapas(pedido(), [{ status: 'paid', at: '2026-10-01T13:00:00Z' }])
    expect(steps.find((s) => s.key === 'paid')?.at).toBeNull()
  })

  it('eventos ausentes (`null`) não derrubam a montagem', () => {
    expect(etapas(pedido(), null as never)).toHaveLength(5)
  })
})

describe('orderJourney — cancelado (DET-08)', () => {
  it('vira `kind: cancelled` com a data do registro `cancelled`', () => {
    expect(
      orderJourney(pedido({ status: 'cancelled' }), [
        { status: 'cancelled', at: '2026-10-05T10:00:00Z' },
      ]),
    ).toEqual({ kind: 'cancelled', cancelledAt: '2026-10-05T10:00:00Z' })
  })

  it('sem registro no histórico, `cancelledAt` é null', () => {
    expect(orderJourney(pedido({ status: 'cancelled' }), [])).toEqual({
      kind: 'cancelled',
      cancelledAt: null,
    })
  })

  it('dois registros `cancelled`: vale o primeiro', () => {
    const j = orderJourney(pedido({ status: 'cancelled' }), [
      { status: 'cancelled', at: '2026-10-07T10:00:00Z' },
      { status: 'cancelled', at: '2026-10-05T10:00:00Z' },
    ])
    expect(j).toEqual({ kind: 'cancelled', cancelledAt: '2026-10-05T10:00:00Z' })
  })
})
