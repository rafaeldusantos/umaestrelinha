import { describe, expect, it } from 'vitest'
import { ACAO_PRIMARIA, orderActionState, type OrderActionInput } from '../orderActionState'

// Feature 59 — `DET-02`: o estado do topo do detalhe, um por vez, na ordem
// cancelado → material a enviar → PIX pendente → PIX novo → pagamento perdido. As regras de cada
// estado têm dono (`podePagarComPix`, `podeGerarNovoPix`, `pagamentoPerdido`); aqui se prova a
// PRIORIDADE e a janela de 7 dias atravessando a decisão.

const CRIADO = '2026-10-04T15:00:00Z'
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const depois = (ms: number) => new Date(new Date(CRIADO).getTime() + ms)

const pedido = (extra: Partial<OrderActionInput> = {}): OrderActionInput => ({
  payment_method: 'pix',
  payment_status: 'approved',
  status: 'pending',
  paid_at: '2026-10-04T15:10:00Z',
  created_at: CRIADO,
  material_status: 'nao_aplicavel',
  ...extra,
})

const AGORA = depois(DIA)

describe('orderActionState — um estado por vez (DET-02)', () => {
  it('pago, em produção, sem material: nada pede ação', () => {
    expect(orderActionState(pedido(), AGORA)).toBeNull()
  })

  it('cancelado vence tudo — inclusive pago com material esperando', () => {
    expect(
      orderActionState(pedido({ status: 'cancelled', material_status: 'aguardando_material' }), AGORA),
    ).toBe('cancelled')
    // E o PIX pendente de um pedido cancelado não vira oferta de pagamento.
    expect(
      orderActionState(
        pedido({ status: 'cancelled', payment_status: 'pending', paid_at: null }),
        AGORA,
      ),
    ).toBe('cancelled')
  })

  it('pago e aguardando o material: "material"', () => {
    expect(orderActionState(pedido({ material_status: 'aguardando_material' }), AGORA)).toBe('material')
  })

  it('material já postado (`material_enviado`) não pede ação no topo', () => {
    expect(orderActionState(pedido({ material_status: 'material_enviado' }), AGORA)).toBeNull()
  })

  it('NÃO pago e aguardando material: pagar vem antes de postar — "pix_pending"', () => {
    expect(
      orderActionState(
        pedido({ payment_status: 'pending', paid_at: null, material_status: 'aguardando_material' }),
        AGORA,
      ),
    ).toBe('pix_pending')
  })

  it('PIX pendente: "pix_pending"; cartão pendente: nada', () => {
    expect(orderActionState(pedido({ payment_status: 'pending', paid_at: null }), AGORA)).toBe(
      'pix_pending',
    )
    expect(
      orderActionState(
        pedido({ payment_method: 'card', payment_status: 'pending', paid_at: null }),
        AGORA,
      ),
    ).toBeNull()
  })

  it.each(['expired', 'rejected'])('PIX %s dentro dos 7 dias: "repix"', (payment_status) => {
    expect(orderActionState(pedido({ payment_status, paid_at: null }), depois(6 * DIA + 23 * HORA))).toBe(
      'repix',
    )
  })

  it.each(['expired', 'rejected'])('PIX %s depois de 7 dias e 1 min: "payment_lost"', (payment_status) => {
    expect(
      orderActionState(pedido({ payment_status, paid_at: null }), depois(7 * DIA + 60 * 1000)),
    ).toBe('payment_lost')
  })

  it('cartão recusado: "payment_lost" — cartão não se refaz pela loja', () => {
    expect(
      orderActionState(pedido({ payment_method: 'card', payment_status: 'rejected', paid_at: null }), AGORA),
    ).toBe('payment_lost')
  })

  it('sem pedido: nada', () => {
    expect(orderActionState(null, AGORA)).toBeNull()
  })
})

describe('ACAO_PRIMARIA — os estados cujo botão é o cheio da tela (CNF-05)', () => {
  it('material, PIX pendente e PIX novo têm ação primária; cancelado e perdido, não', () => {
    expect([...ACAO_PRIMARIA].sort()).toEqual(['material', 'pix_pending', 'repix'])
  })
})
