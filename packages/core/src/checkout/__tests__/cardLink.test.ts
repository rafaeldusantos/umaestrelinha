import { describe, expect, it } from 'vitest'
import {
  CARD_LINK_CANCELLED,
  CARD_LINK_NOT_CARD,
  CARD_LINK_NOT_PAYABLE,
  CARD_LINK_PAID,
  CARD_LINK_PATH,
  cardLink,
  cardLinkRefusal,
  cardLinkSituation,
} from '../cardLink.ts'

const pendente = {
  payment_method: 'card',
  status: 'pending',
  payment_status: 'pending',
  paid_at: null,
}

describe('quem pode receber o link de pagamento por cartão', () => {
  it.each(['pending', 'rejected', 'expired'])('pedido de cartão com pagamento %s pode', (payment_status) => {
    expect(cardLinkRefusal({ ...pendente, payment_status })).toBeNull()
  })

  it('pedido feito com PIX não pode', () => {
    expect(cardLinkRefusal({ ...pendente, payment_method: 'pix' })).toBe(CARD_LINK_NOT_CARD)
  })

  it('pedido cancelado não pode, mesmo com o pagamento pendente', () => {
    expect(cardLinkRefusal({ ...pendente, status: 'cancelled' })).toBe(CARD_LINK_CANCELLED)
  })

  it('pedido já pago não pode — pela data do pagamento ou pelo pagamento aprovado', () => {
    expect(cardLinkRefusal({ ...pendente, paid_at: '2026-11-10T12:00:00Z' })).toBe(CARD_LINK_PAID)
    expect(cardLinkRefusal({ ...pendente, payment_status: 'approved' })).toBe(CARD_LINK_PAID)
  })

  it('pagamento em análise ou estornado não pode', () => {
    expect(cardLinkRefusal({ ...pendente, payment_status: 'in_process' })).toBe(CARD_LINK_NOT_PAYABLE)
    expect(cardLinkRefusal({ ...pendente, payment_status: 'refunded' })).toBe(CARD_LINK_NOT_PAYABLE)
  })
})

describe('a situação que o link mostra no lugar do pagamento', () => {
  it('pago e cancelado têm situação; o pedido pagável não tem', () => {
    expect(cardLinkSituation({ ...pendente, paid_at: '2026-11-10T12:00:00Z' })).toBe('paid')
    expect(cardLinkSituation({ ...pendente, status: 'cancelled' })).toBe('cancelled')
    expect(cardLinkSituation(pendente)).toBeNull()
  })

  it('cancelado depois de pago aparece como cancelado', () => {
    expect(cardLinkSituation({ ...pendente, status: 'cancelled', paid_at: '2026-11-10T12:00:00Z' })).toBe('cancelled')
  })
})

describe('o endereço do link', () => {
  it('leva o token no fragmento, nunca no caminho nem na query', () => {
    expect(CARD_LINK_PATH).toBe('/pagar-com-cartao')
    const url = new URL(cardLink('https://umaestrelinha.com.br/', 'abc_DEF-123'))
    expect(url.pathname).toBe('/pagar-com-cartao')
    expect(url.search).toBe('')
    expect(url.hash).toBe('#abc_DEF-123')
  })
})

describe('o tom das frases do link de cartão', () => {
  it('as recusas e situações não levantam a voz nem apressam', () => {
    const frases = [CARD_LINK_NOT_CARD, CARD_LINK_CANCELLED, CARD_LINK_PAID, CARD_LINK_NOT_PAYABLE]
    expect(frases.every(f => f.trim().length > 0)).toBe(true)
    for (const f of frases) {
      expect(f).not.toMatch(/!|urgente|últim|corra|agora mesmo|\p{Extended_Pictographic}/iu)
    }
  })
})
