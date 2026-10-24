import { describe, expect, it } from 'vitest'

import { rowSummary, type RowSummaryInput } from '../rowSummary.ts'

/**
 * Feature `74` (`MAP-17`, `MAP-21`, `MAP-48`): a frase de cada linha. As frases esperadas abaixo
 * foram COPIADAS do disco do painel (`apps/backoffice/src/features/order-list/model/rowSummary.ts`,
 * no `775e407e`) antes da troca — mover não muda palavra.
 */
const linha = (o: Partial<RowSummaryInput>): RowSummaryInput => ({
  material_status: 'nao_aplicavel',
  status: 'paid',
  tracking_code: null,
  payment_method: 'credit_card',
  ...o,
})

describe('rowSummary — a frase de bloqueio, byte a byte a do painel', () => {
  it.each<[string, Partial<RowSummaryInput>, string, string, string]>([
    ['esperando o envelope', { material_status: 'aguardando_material' }, 'Esperando o envelope da cliente', 'registrar-recebimento', 'Recebi o material'],
    ['material a caminho', { material_status: 'material_enviado' }, 'Material a caminho', 'registrar-recebimento', 'Recebi o material'],
    ['enviado sem código', { status: 'shipped', tracking_code: null }, 'Sem código — a cliente não foi avisada', 'salvar-rastreio', 'Salvar rastreio'],
    ['pago, sem material', { status: 'paid' }, 'Pago, a separar', 'separar', 'Iniciar separação'],
    ['pago com material na bancada', { status: 'paid', material_status: 'material_recebido' }, 'Material na bancada', 'separar', 'Iniciar separação'],
    ['em separação', { status: 'separating' }, 'Em separação', 'marcar-enviado', 'Marcar como enviado'],
    ['pix pendente', { status: 'pending', payment_method: 'pix' }, 'Pix aguardando — expira sozinho', 'nenhuma', ''],
    ['pagamento pendente (outro meio)', { status: 'pending', payment_method: 'boleto' }, 'Pagamento pendente', 'nenhuma', ''],
  ])('%s', (_caso, o, blocker, action, actionLabel) => {
    expect(rowSummary(linha(o))).toEqual({ blocker, action, actionLabel })
  })

  it.each(['delivered', 'cancelled'])('`%s` ⇒ sem frase nenhuma', (status) => {
    expect(rowSummary(linha({ status, tracking_code: 'BR1' }))).toEqual({ blocker: '', action: 'nenhuma', actionLabel: '' })
  })

  it('enviado COM código ⇒ sem frase', () => {
    expect(rowSummary(linha({ status: 'shipped', tracking_code: 'BR123' })).blocker).toBe('')
  })

  it('o material vem antes do status: pago há dias esperando o envelope fala do envelope', () => {
    expect(rowSummary(linha({ status: 'paid', material_status: 'aguardando_material' })).blocker).toBe(
      'Esperando o envelope da cliente',
    )
  })
})
