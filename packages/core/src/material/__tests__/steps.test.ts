import { describe, expect, it } from 'vitest'

import { MATERIAL_STEPS, MATERIAL_USED_TITLE, materialProgress, materialSubline } from '../steps.ts'

/** Feature `74` (`MAP-23`, A22, A23): o bloco "Material afetivo" do detalhe. */
const estados = (material: string, status = 'paid') => materialProgress(material, status)?.passos.map((p) => p.estado)

describe('MATERIAL_STEPS — os quatro passos com os rótulos curtos (A22)', () => {
  it('Aguardando · A caminho · Recebido · Em produção', () => {
    expect(MATERIAL_STEPS.map((p) => p.label)).toEqual(['Aguardando', 'A caminho', 'Recebido', 'Em produção'])
    expect(MATERIAL_STEPS.map((p) => p.status)).toEqual([
      'aguardando_material',
      'material_enviado',
      'material_recebido',
      'em_producao',
    ])
  })
})

describe('materialProgress — o atual marcado, os anteriores feitos', () => {
  it.each([
    ['aguardando_material', ['atual', 'depois', 'depois', 'depois'], 'Aguardando material'],
    ['material_enviado', ['feito', 'atual', 'depois', 'depois'], 'Material a caminho'],
    ['material_recebido', ['feito', 'feito', 'atual', 'depois'], 'Material recebido'],
    ['em_producao', ['feito', 'feito', 'feito', 'atual'], 'Em produção'],
  ])('%s', (material, esperado, titulo) => {
    expect(estados(material)).toEqual(esperado)
    expect(materialProgress(material, 'paid')?.titulo).toBe(titulo)
  })

  it.each(['shipped', 'delivered'])('com o pedido `%s`: os quatro feitos e "Material usado na joia"', (status) => {
    for (const material of ['aguardando_material', 'material_recebido', 'em_producao']) {
      const p = materialProgress(material, status)
      expect(p?.titulo).toBe('Material usado na joia')
      expect(p?.passos.map((x) => x.estado)).toEqual(['feito', 'feito', 'feito', 'feito'])
    }
    expect(MATERIAL_USED_TITLE).toBe('Material usado na joia')
  })

  it.each(['nao_aplicavel', null, 'valor-estranho'])('sem material (%s) ⇒ null: o bloco não aparece', (material) => {
    expect(materialProgress(material, 'paid')).toBeNull()
  })
})

describe('materialSubline — a linha sob o título, contra o `lido_em` (A23)', () => {
  const agora = '2026-10-11T12:00:00.000000+00:00'
  const base = { material_tracking_code: null, material_received_at: null, created_at: '2026-10-01T12:00:00+00:00' }

  it('com o rastreio do envelope ⇒ "Rastreio do envelope: <código>"', () => {
    expect(materialSubline({ ...base, material_tracking_code: 'OY123BR', material_received_at: '2026-10-09T12:00:00+00:00' }, agora)).toBe(
      'Rastreio do envelope: OY123BR',
    )
  })

  it('sem rastreio, recebido ⇒ "Recebido há 2 dias"', () => {
    expect(materialSubline({ ...base, material_received_at: '2026-10-09T12:00:00+00:00' }, agora)).toBe('Recebido há 2 dias')
  })

  it('sem rastreio e sem recebimento ⇒ "Pedido feito há 10 dias"', () => {
    expect(materialSubline(base, agora)).toBe('Pedido feito há 10 dias')
  })

  it('rastreio só de espaços conta como ausente', () => {
    expect(materialSubline({ ...base, material_tracking_code: '  ' }, agora)).toBe('Pedido feito há 10 dias')
  })
})
