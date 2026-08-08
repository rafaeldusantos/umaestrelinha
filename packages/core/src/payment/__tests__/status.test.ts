import { describe, expect, it } from 'vitest'
import {
  canTransition,
  friendlyMessage,
  mapMpStatus,
  type PaymentStatus,
} from '../status'

// PAY-04 (spec, P1 Backend AC3): mapa de transições de payment_status.
//   pending  → approved | rejected | cancelled | expired
//   rejected → pending | approved   (nova tentativa)
//   expired  → approved             (pagou no limite)
//   approved → refunded
//   Fora do mapa: ignorado (approved nunca regride).

const ALL: PaymentStatus[] = [
  'pending',
  'approved',
  'rejected',
  'refunded',
  'expired',
  'cancelled',
]

// Derivado da spec (PAY-04), NÃO da implementação.
const ALLOWED: Array<[PaymentStatus, PaymentStatus]> = [
  ['pending', 'approved'],
  ['pending', 'rejected'],
  ['pending', 'cancelled'],
  ['pending', 'expired'],
  ['rejected', 'pending'],
  ['rejected', 'approved'],
  ['expired', 'approved'],
  ['approved', 'refunded'],
]

describe('canTransition (PAY-04)', () => {
  it.each(ALLOWED)('permite %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  const denied = ALL.flatMap((from) => ALL.map((to) => [from, to] as const)).filter(
    ([from, to]) => !ALLOWED.some(([f, t]) => f === from && t === to),
  )

  it.each(denied)('nega %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('approved nunca regride para pending nem rejected', () => {
    expect(canTransition('approved', 'pending')).toBe(false)
    expect(canTransition('approved', 'rejected')).toBe(false)
  })

  it('expired → approved permite (pagou no limite)', () => {
    expect(canTransition('expired', 'approved')).toBe(true)
  })

  it('rejected → pending permite (nova tentativa)', () => {
    expect(canTransition('rejected', 'pending')).toBe(true)
  })
})

describe('mapMpStatus (MP → interno)', () => {
  // Vocabulário legado da API de Pagamentos — segue mapeado (STA-01: união, não substituição).
  it.each([
    ['approved', 'approved'],
    ['rejected', 'rejected'],
    ['cancelled', 'cancelled'],
    ['refunded', 'refunded'],
    ['charged_back', 'refunded'],
    ['pending', 'pending'],
    ['in_process', 'pending'],
  ] as const)('mapeia %s → %s', (mp, internal) => {
    expect(mapMpStatus(mp)).toBe(internal)
  })

  // STA-01/STA-02: vocabulário da API de Orders. A lista vem da doc oficial de "Status da order"
  // (online): created, processed, processing, action_required, canceled, charged_back, expired,
  // failed, refunded. Todos os 9 têm mapeamento — nenhum status real cai em null.
  it.each([
    ['created', 'pending'],
    ['processed', 'approved'],
    ['processing', 'pending'],
    ['action_required', 'pending'],
    ['canceled', 'cancelled'],
    ['charged_back', 'refunded'],
    ['expired', 'expired'],
    ['failed', 'rejected'],
    ['refunded', 'refunded'],
  ] as const)('Orders: mapeia %s → %s', (mp, internal) => {
    expect(mapMpStatus(mp)).toBe(internal)
  })

  it('nenhum status real de order online cai em null (cobertura da lista oficial)', () => {
    const OFICIAIS = [
      'created', 'processed', 'processing', 'action_required',
      'canceled', 'charged_back', 'expired', 'failed', 'refunded',
    ]
    for (const status of OFICIAIS) {
      expect(mapMpStatus(status)).not.toBeNull()
    }
  })

  it('status desconhecido do MP → null (transição ignorada)', () => {
    expect(mapMpStatus('in_mediation')).toBeNull()
    expect(mapMpStatus('')).toBeNull()
  })

  it('at_terminal → null: é status de order do Point (presencial), não de online', () => {
    expect(mapMpStatus('at_terminal')).toBeNull()
  })
})

describe('friendlyMessage (PAY-02, mensagens pt-BR)', () => {
  const fallback = friendlyMessage('algo_desconhecido')

  it('cc_rejected_insufficient_amount → saldo insuficiente', () => {
    expect(friendlyMessage('cc_rejected_insufficient_amount')).toMatch(/[Ss]aldo insuficiente/)
  })

  it('detalhes conhecidos têm mensagem específica (diferente do fallback)', () => {
    for (const detail of [
      'cc_rejected_bad_filled_security_code',
      'cc_rejected_bad_filled_date',
      'cc_rejected_call_for_authorize',
      'cc_rejected_card_disabled',
      'cc_rejected_max_attempts',
      'cc_rejected_high_risk',
    ]) {
      expect(friendlyMessage(detail)).not.toBe(fallback)
    }
  })

  it('detalhe desconhecido, null ou ausente → fallback genérico', () => {
    expect(fallback.length).toBeGreaterThan(0)
    expect(friendlyMessage(null)).toBe(fallback)
    expect(friendlyMessage(undefined)).toBe(fallback)
  })

  // STA-03: cartão em `action_required` fora do `waiting_transfer` é tratado como recusa (AD-003) e
  // a AC exige "uma mensagem que instrua a trocar de meio". Nenhum desses detalhes tem chave própria
  // e nenhum começa com `rejected_`, então todos caem no fallback — que por isso NÃO é livre: é a
  // única instrução que a cliente recebe nesse caminho. Trocá-lo por "Erro." satisfaria
  // `fallback.length > 0` acima e violaria STA-03.
  it.each([['pending_challenge'], ['pending_capture'], ['pending_review_manual']])(
    'STA-03: %s instrui a usar outro método de pagamento',
    (detail) => {
      expect(friendlyMessage(detail)).toBe(fallback)
      expect(fallback).toMatch(/use outro método de pagamento/i)
    },
  )

  // STA-04 reescrito (D4): o vocabulário do Orders NÃO é a família `cc_rejected_*`. Medido no T16:
  // o cartão recusado devolve `rejected_by_issuer`, que caía no fallback genérico.
  describe('vocabulário da API de Orders (STA-04, D4)', () => {
    it('rejected_by_issuer → mensagem específica sobre o banco emissor, não o fallback', () => {
      const message = friendlyMessage('rejected_by_issuer')
      expect(message).not.toBe(fallback)
      expect(message).toMatch(/emissor/i)
    })

    it('rejected_insufficient_amount reaproveita a mensagem de cc_rejected_insufficient_amount', () => {
      expect(friendlyMessage('rejected_insufficient_amount')).toBe(
        friendlyMessage('cc_rejected_insufficient_amount'),
      )
      expect(friendlyMessage('rejected_insufficient_amount')).not.toBe(fallback)
    })

    it.each([
      ['rejected_bad_filled_security_code'],
      ['rejected_call_for_authorize'],
      ['rejected_card_disabled'],
    ])('a ponte por prefixo vale para %s (mesma mensagem do par cc_)', (detail) => {
      expect(friendlyMessage(detail)).toBe(friendlyMessage(`cc_${detail}`))
      expect(friendlyMessage(detail)).not.toBe(fallback)
    })

    it('rejected_* sem par conhecido → fallback (a ponte não inventa mensagem)', () => {
      expect(friendlyMessage('rejected_motivo_que_ninguem_mediu')).toBe(fallback)
    })
  })
})
