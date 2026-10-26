// Conserto do QA da feature `73` — `BUG-20261022-situacao-fala-com-a-cliente-no-atelie`.
//
// O selo tem DOIS públicos e uma régua: a chave e o tom são os mesmos, só a palavra muda. Os
// rótulos esperados estão escritos por extenso — derivá-los de `SITUATION_LABELS_BY_AUDIENCE`
// provaria que o mapa é igual a si mesmo.
import { describe, expect, it } from 'vitest'
import { MATERIAL_STATUS_LABELS } from '../../material/material.ts'
import { ORDER_PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '../labels.ts'
import { SITUATION_LABELS, SITUATION_LABELS_BY_AUDIENCE, orderSituation, type SituationInput } from '../situation.ts'

const base = { status: 'pending', payment_status: 'pending', material_status: 'nao_aplicavel' }

/** Um caso por estado: o pedido, a chave, o tom, a palavra da cliente e a do ateliê. */
const CASOS: Array<[string, SituationInput, string, string, string, string]> = [
  ['cancelado', { ...base, status: 'cancelled' }, 'cancelled', 'neutral', 'Cancelado', 'Cancelado'],
  ['entregue', { ...base, status: 'delivered', payment_status: 'approved' }, 'delivered', 'done', 'Entregue', 'Entregue'],
  ['retirado', { ...base, status: 'delivered', payment_status: 'approved', shipping_service_id: 'retirada' }, 'delivered', 'done', 'Retirado', 'Retirado'],
  ['enviado', { ...base, status: 'shipped', payment_status: 'approved' }, 'shipped', 'progress', 'A caminho', 'Enviado'],
  ['estornado', { ...base, payment_status: 'refunded' }, 'refunded', 'neutral', 'Reembolsado', 'Estornado'],
  ['material não enviado', { ...base, payment_status: 'approved', material_status: 'aguardando_material' }, 'awaiting_material', 'wait', 'Aguardando seu material', 'Aguardando material'],
  ['material a caminho', { ...base, payment_status: 'approved', material_status: 'material_enviado' }, 'awaiting_material', 'wait', 'Aguardando seu material', 'Material a caminho'],
  ['material recebido', { ...base, payment_status: 'approved', material_status: 'material_recebido' }, 'in_production', 'progress', 'Em produção', 'Material recebido'],
  ['em produção', { ...base, payment_status: 'approved', material_status: 'em_producao' }, 'in_production', 'progress', 'Em produção', 'Em produção'],
  ['pago sem material', { ...base, payment_status: 'approved' }, 'in_production', 'progress', 'Em produção', 'Em produção'],
  ['PIX expirado', { ...base, payment_status: 'expired' }, 'pix_expired', 'alert', 'PIX expirado', 'PIX expirado'],
  ['pagamento recusado', { ...base, payment_status: 'rejected' }, 'payment_rejected', 'alert', 'Pagamento recusado', 'Pagamento recusado'],
  ['aguardando pagamento', base, 'awaiting_payment', 'wait', 'Aguardando pagamento', 'Aguardando pagamento'],
]

describe('orderSituation — os dois públicos lado a lado', () => {
  it.each(CASOS)('%s', (_nome, pedido, key, tone, cliente, atelie) => {
    expect(orderSituation(pedido, 'cliente')).toEqual({ key, tone, label: cliente })
    expect(orderSituation(pedido, 'atelie')).toEqual({ key, tone, label: atelie })
  })

  it('sem o argumento, é a voz da cliente — a loja não muda', () => {
    for (const [, pedido] of CASOS) {
      expect(orderSituation(pedido)).toEqual(orderSituation(pedido, 'cliente'))
    }
  })

  it('o PAR do material: não enviado e a caminho têm a MESMA chave e tom, e palavras diferentes no ateliê', () => {
    const naoEnviado = { ...base, payment_status: 'approved', material_status: 'aguardando_material' }
    const aCaminho = { ...base, payment_status: 'approved', material_status: 'material_enviado' }
    expect(orderSituation(naoEnviado, 'atelie').key).toBe(orderSituation(aCaminho, 'atelie').key)
    expect(orderSituation(naoEnviado, 'atelie').label).not.toBe(orderSituation(aCaminho, 'atelie').label)
    // Para a cliente, os dois continuam o mesmo selo (SIT-04, intocado).
    expect(orderSituation(naoEnviado).label).toBe(orderSituation(aCaminho).label)
  })

  it('nenhuma palavra do ateliê fala com a cliente: sem "seu", "sua" ou "você"', () => {
    for (const [, pedido] of CASOS) {
      expect(orderSituation(pedido, 'atelie').label).not.toMatch(/\b(seu|sua|seus|suas|você)\b/i)
    }
  })

  it('valor fora do vocabulário cai no padrão também no ateliê (SIT-10)', () => {
    expect(orderSituation({ ...base, status: 'arquivado', material_status: 'material_enviado' }, 'atelie')).toEqual({
      key: 'awaiting_payment',
      tone: 'wait',
      label: 'Aguardando pagamento',
    })
    expect(orderSituation(null as never, 'atelie').label).toBe('Aguardando pagamento')
  })
})

describe('o mapa dos públicos — um lugar, sem palavra nova', () => {
  it('a voz da cliente é SITUATION_LABELS, por referência', () => {
    expect(SITUATION_LABELS_BY_AUDIENCE.cliente).toBe(SITUATION_LABELS)
  })

  it('as palavras do ateliê vêm dos vocabulários que já tinham dono', () => {
    const a = SITUATION_LABELS_BY_AUDIENCE.atelie
    expect(a.shipped).toBe(ORDER_STATUS_LABELS.shipped)
    expect(a.refunded).toBe(ORDER_PAYMENT_STATUS_LABELS.refunded)
    expect(a.awaiting_material).toBe(MATERIAL_STATUS_LABELS.aguardando_material)
    expect(a.in_production).toBe(MATERIAL_STATUS_LABELS.em_producao)
    // As mesmas chaves dos dois lados.
    expect(Object.keys(a).sort()).toEqual(Object.keys(SITUATION_LABELS).sort())
  })

  it('os vocabulários do painel, por extenso', () => {
    expect(ORDER_STATUS_LABELS).toEqual({
      pending: 'Pendente',
      paid: 'Pago',
      separating: 'Em Separação',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    })
    expect(ORDER_PAYMENT_STATUS_LABELS).toEqual({
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Recusado',
      refunded: 'Estornado',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    })
  })
})
