// `PEN-03`, `PEN-04`, `PEN-05` — até quando a tela oferece "Gerar novo PIX" para o mesmo pedido.
//
// Decisão do usuário (2026-10-04): até **7 dias corridos** depois de `created_at`; depois, o
// caminho é o WhatsApp — preço e prazo podem ter mudado. É regra de OFERTA, não de autorização: o
// servidor continua aceitando gerar o código (`RETRYABLE_STATUSES`), e o limite fica na tela.

import { describe, expect, it } from 'vitest'

import { REPIX_WINDOW_DAYS, pagamentoPerdido, podeGerarNovoPix, repixDeadline } from '../repix'

const CRIADO = '2026-10-01T12:00:00Z'
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const depois = (ms: number) => new Date(new Date(CRIADO).getTime() + ms)

const expirado = {
  payment_method: 'pix',
  payment_status: 'expired',
  status: 'pending',
  paid_at: null,
  created_at: CRIADO,
}

describe('podeGerarNovoPix — a janela de 7 dias (PEN-05)', () => {
  it('a constante nomeada vale 7', () => {
    expect(REPIX_WINDOW_DAYS).toBe(7)
  })

  it('6 dias e 23 horas depois: oferece', () => {
    expect(podeGerarNovoPix(expirado, depois(6 * DIA + 23 * HORA))).toBe(true)
  })

  it('exatamente 7 dias depois: ainda oferece (o limite é "até")', () => {
    expect(podeGerarNovoPix(expirado, depois(7 * DIA))).toBe(true)
  })

  it('7 dias e 1 minuto depois: não oferece', () => {
    expect(podeGerarNovoPix(expirado, depois(7 * DIA + 60 * 1000))).toBe(false)
  })
})

describe('podeGerarNovoPix — quem entra na família (PEN-03)', () => {
  const agora = depois(DIA)

  it('PIX expirado e PIX recusado oferecem', () => {
    expect(podeGerarNovoPix(expirado, agora)).toBe(true)
    expect(podeGerarNovoPix({ ...expirado, payment_status: 'rejected' }, agora)).toBe(true)
  })

  it('cartão nunca oferece PIX novo', () => {
    // `/pedido/:id/pagamento` é só PIX por construção (`AD-042`): cartão recusado vai ao WhatsApp.
    expect(podeGerarNovoPix({ ...expirado, payment_method: 'card', payment_status: 'rejected' }, agora)).toBe(false)
  })

  it('cancelado nunca oferece', () => {
    expect(podeGerarNovoPix({ ...expirado, status: 'cancelled' }, agora)).toBe(false)
  })

  it('pago nunca oferece', () => {
    expect(podeGerarNovoPix({ ...expirado, paid_at: '2026-10-01T13:00:00Z' }, agora)).toBe(false)
  })

  it('pendente não é PIX NOVO — é "Pagar com PIX", de `podePagarComPix` (PEN-08)', () => {
    expect(podeGerarNovoPix({ ...expirado, payment_status: 'pending' }, agora)).toBe(false)
    expect(podeGerarNovoPix({ ...expirado, payment_status: 'approved' }, agora)).toBe(false)
  })

  it('`created_at` ilegível não oferece — sem data não há janela', () => {
    expect(podeGerarNovoPix({ ...expirado, created_at: '' }, agora)).toBe(false)
    expect(podeGerarNovoPix(null as never, agora)).toBe(false)
  })
})

describe('repixDeadline — o "até 8 de outubro" da copy', () => {
  it('é `created_at` + 7 dias', () => {
    expect(repixDeadline(expirado)?.toISOString()).toBe('2026-10-08T12:00:00.000Z')
  })

  it('sem `created_at` legível, `null`', () => {
    expect(repixDeadline({ ...expirado, created_at: 'ontem' })).toBeNull()
  })
})

describe('pagamentoPerdido — "O pagamento não foi concluído" (PEN-04)', () => {
  it('PIX expirado fora da janela', () => {
    expect(pagamentoPerdido(expirado, depois(7 * DIA + 60 * 1000))).toBe(true)
  })

  it('PIX expirado DENTRO da janela não é perdido — é PIX novo', () => {
    expect(pagamentoPerdido(expirado, depois(6 * DIA + 23 * HORA))).toBe(false)
  })

  it('cartão recusado é perdido desde o primeiro minuto', () => {
    expect(
      pagamentoPerdido({ ...expirado, payment_method: 'card', payment_status: 'rejected' }, depois(HORA)),
    ).toBe(true)
  })

  it('cancelado, pago e pendente não são perdidos', () => {
    const tarde = depois(30 * DIA)
    expect(pagamentoPerdido({ ...expirado, status: 'cancelled' }, tarde)).toBe(false)
    expect(pagamentoPerdido({ ...expirado, paid_at: CRIADO }, tarde)).toBe(false)
    expect(pagamentoPerdido({ ...expirado, payment_status: 'pending' }, tarde)).toBe(false)
  })

  it('as duas são mutuamente exclusivas em toda a janela — nunca as duas ofertas juntas', () => {
    for (const ms of [0, DIA, 6 * DIA + 23 * HORA, 7 * DIA, 7 * DIA + 60 * 1000, 20 * DIA]) {
      const agora = depois(ms)
      expect(podeGerarNovoPix(expirado, agora) && pagamentoPerdido(expirado, agora)).toBe(false)
      expect(podeGerarNovoPix(expirado, agora) || pagamentoPerdido(expirado, agora)).toBe(true)
    }
  })
})
