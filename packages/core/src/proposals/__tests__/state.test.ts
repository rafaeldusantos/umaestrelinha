import { describe, expect, it } from 'vitest'
import { PROPOSAL_STATE_LABELS, proposalActions, proposalLinkValid, proposalState } from '../state.ts'

// LNK-04..06: o estado de cada proposta, e "expirada" derivada de expires_at.

const EXPIRA = '2026-11-07T12:00:00.000Z'
const limite = new Date(EXPIRA).getTime()
const em = (ms: number) => new Date(ms)
const aberta = { status: 'open' as const, expires_at: EXPIRA, viewed_at: null }

describe('proposalState — o relógio no limite de expires_at', () => {
  it('1 ms antes do prazo: aberta', () => {
    expect(proposalState(aberta, em(limite - 1))).toBe('open')
  })

  it('no instante exato do prazo: expirada (o mesmo lado de accessGrant)', () => {
    expect(proposalState(aberta, em(limite))).toBe('expired')
    expect(proposalLinkValid(EXPIRA, em(limite))).toBe(false)
    expect(proposalLinkValid(EXPIRA, em(limite - 1))).toBe(true)
  })

  it('vista pela cliente e ainda no prazo', () => {
    expect(proposalState({ ...aberta, viewed_at: '2026-11-01T10:00:00Z' }, em(limite - 1))).toBe('viewed')
  })

  it('vista mas vencida: expirada', () => {
    expect(proposalState({ ...aberta, viewed_at: '2026-11-01T10:00:00Z' }, em(limite + 1))).toBe('expired')
  })

  it('concluída e cancelada não expiram (fim de linha)', () => {
    expect(proposalState({ ...aberta, status: 'completed' }, em(limite + 1e9))).toBe('completed')
    expect(proposalState({ ...aberta, status: 'cancelled' }, em(limite + 1e9))).toBe('cancelled')
  })

  it('sem prazo ou prazo ilegível: expirada (nunca vale para sempre)', () => {
    expect(proposalState({ ...aberta, expires_at: null }, em(0))).toBe('expired')
    expect(proposalState({ ...aberta, expires_at: 'lixo' }, em(0))).toBe('expired')
  })
})

describe('rótulos (LNK-04)', () => {
  it('os cinco, palavra por palavra', () => {
    expect(PROPOSAL_STATE_LABELS).toEqual({
      open: 'Aberta',
      viewed: 'Aberta — vista pela cliente',
      completed: 'Concluída',
      expired: 'Expirada',
      cancelled: 'Cancelada',
    })
  })
})

describe('proposalActions (LNK-05, LNK-06, DUP-01)', () => {
  it.each(['open', 'viewed'] as const)('%s: edita, renova, cancela, duplica', (s) => {
    expect(proposalActions(s)).toEqual({ edit: true, renew: true, cancel: true, duplicate: true, viewOrder: false })
  })

  it('expirada: só renovar e duplicar', () => {
    expect(proposalActions('expired')).toEqual({ edit: false, renew: true, cancel: false, duplicate: true, viewOrder: false })
  })

  it('concluída: ver o pedido e duplicar', () => {
    expect(proposalActions('completed')).toEqual({ edit: false, renew: false, cancel: false, duplicate: true, viewOrder: true })
  })

  it('cancelada: só duplicar', () => {
    expect(proposalActions('cancelled')).toEqual({ edit: false, renew: false, cancel: false, duplicate: true, viewOrder: false })
  })
})
