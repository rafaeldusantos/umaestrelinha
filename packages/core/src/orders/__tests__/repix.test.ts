// `PEN-03`, `PEN-04`, `PEN-05` — até quando a tela oferece "Gerar novo PIX" para o mesmo pedido.
//
// Decisão do usuário (2026-10-04): até **7 dias corridos** depois de `created_at`; depois, o
// caminho é o WhatsApp — preço e prazo podem ter mudado. É regra de OFERTA, não de autorização: o
// servidor continua aceitando gerar o código (`RETRYABLE_STATUSES`), e o limite fica na tela.

import { describe, expect, it } from 'vitest'

import {
  REPIX_WINDOW_DAYS,
  cardContactTitle,
  cartaoParaResolver,
  pagamentoPerdido,
  pagamentoACombinar,
  pagamentoSemCobrancaDaLoja,
  pedidoAguardaPagamento,
  podeGerarNovoPix,
  repixDeadline,
} from '../repix'

const CRIADO = '2026-10-01T12:00:00Z'
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const depois = (ms: number) => new Date(new Date(CRIADO).getTime() + ms)

/** Um PIX que a loja cobrou (a order do Mercado Pago existe) e que expirou. */
const expirado = {
  payment_method: 'pix',
  payment_status: 'expired',
  status: 'pending',
  paid_at: null,
  created_at: CRIADO,
  mp_order_id: 'ORD01PIX',
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

  it('cartão recusado NÃO é perdido: é o informativo do cartão, desde o primeiro minuto', () => {
    // Antes o cartão recusado caía aqui ("retomar este pedido"). Ele passou a ter estado próprio —
    // o informativo para resolver o pagamento pelo WhatsApp (`cartaoParaResolver`) —, e as duas
    // famílias não podem se sobrepor.
    const recusado = { ...expirado, payment_method: 'card', payment_status: 'rejected', mp_order_id: 'ORD01' }
    expect(pagamentoPerdido(recusado, depois(HORA))).toBe(false)
    expect(cartaoParaResolver(recusado)).toBe(true)
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

describe('cartaoParaResolver — o informativo de WhatsApp do cartão', () => {
  const cartao = {
    payment_method: 'card',
    payment_status: 'rejected',
    status: 'pending',
    paid_at: null,
    created_at: CRIADO,
    mp_order_id: 'ORD01JQ',
  }

  it('cartão recusado mostra o informativo', () => {
    expect(cartaoParaResolver(cartao)).toBe(true)
  })

  it('cartão com tentativa de cobrança e sem resposta (pendente, com a order do Mercado Pago) mostra', () => {
    expect(cartaoParaResolver({ ...cartao, payment_status: 'pending' })).toBe(true)
  })

  it('cartão criado e nunca cobrado (pendente, sem a order do Mercado Pago) não mostra nada', () => {
    expect(cartaoParaResolver({ ...cartao, payment_status: 'pending', mp_order_id: null })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, payment_status: 'pending', mp_order_id: undefined })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, payment_status: 'pending', mp_order_id: '   ' })).toBe(false)
  })

  it('cartão expirado também mostra — a cobrança morreu sem resposta', () => {
    expect(cartaoParaResolver({ ...cartao, payment_status: 'expired' })).toBe(true)
  })

  it('o cartão da Nuvemshop (`credit_card`) é cartão também', () => {
    expect(cartaoParaResolver({ ...cartao, payment_method: 'credit_card' })).toBe(true)
  })

  it('cancelado, pago, aprovado ou estornado não mostram', () => {
    expect(cartaoParaResolver({ ...cartao, status: 'cancelled' })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, paid_at: '2026-10-01T13:00:00Z' })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, payment_status: 'approved' })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, payment_status: 'refunded' })).toBe(false)
  })

  it('PIX nunca é o informativo do cartão, nem com a order do Mercado Pago', () => {
    expect(cartaoParaResolver({ ...cartao, payment_method: 'pix' })).toBe(false)
    expect(cartaoParaResolver({ ...cartao, payment_method: 'pix', payment_status: 'pending' })).toBe(false)
  })

  it('o cartão nunca ganha PIX novo nem cai em "pagamento perdido" — a loja não troca o meio sozinha', () => {
    for (const payment_status of ['rejected', 'expired']) {
      const morto = { ...cartao, payment_status }
      for (const ms of [0, DIA, 7 * DIA + 60 * 1000, 30 * DIA]) {
        expect(podeGerarNovoPix(morto, depois(ms))).toBe(false)
        expect(pagamentoPerdido(morto, depois(ms))).toBe(false)
      }
    }
  })

  it('sem pedido, `false` — nunca um lançamento', () => {
    expect(cartaoParaResolver(null)).toBe(false)
    expect(cartaoParaResolver(undefined)).toBe(false)
  })
})

describe('pedidoAguardaPagamento — o pedido que a loja avançou não oferece pagar', () => {
  const pendente = { ...expirado, payment_status: 'pending' }

  it('pendente, não cancelado e sem `paid_at`: aguarda pagamento', () => {
    expect(pedidoAguardaPagamento(pendente)).toBe(true)
    expect(pedidoAguardaPagamento({ ...pendente, status: null })).toBe(true)
  })

  it.each(['paid', 'separating', 'shipped', 'delivered'])(
    'avançado à mão para %s sem pagamento: não aguarda — nada a pagar',
    (status) => {
      expect(pedidoAguardaPagamento({ ...pendente, status })).toBe(false)
    },
  )

  it('cancelado ou com `paid_at`: não aguarda', () => {
    expect(pedidoAguardaPagamento({ ...pendente, status: 'cancelled' })).toBe(false)
    expect(pedidoAguardaPagamento({ ...pendente, paid_at: CRIADO })).toBe(false)
  })

  it('PIX expirado num pedido avançado à mão: nem PIX novo, nem pagamento perdido', () => {
    const avancado = { ...expirado, status: 'separating' }
    expect(podeGerarNovoPix(avancado, depois(DIA))).toBe(false)
    expect(pagamentoPerdido(avancado, depois(30 * DIA))).toBe(false)
  })

  it('cartão recusado num pedido avançado à mão: sem informativo', () => {
    expect(
      cartaoParaResolver({ ...expirado, payment_method: 'card', payment_status: 'rejected', status: 'shipped', mp_order_id: 'O1' }),
    ).toBe(false)
  })
})

describe('cardContactTitle — o título do informativo do cartão', () => {
  const cartao = {
    payment_method: 'card',
    payment_status: 'rejected',
    status: 'pending',
    paid_at: null,
    created_at: CRIADO,
    mp_order_id: 'ORD01JQ',
  }
  const ESPERA = 'O pagamento com cartão ainda não foi confirmado'
  const FALHOU = 'O pagamento com cartão não foi concluído'

  it('cobrança pendente, sem resposta do meio de pagamento: ainda não foi confirmado', () => {
    expect(cardContactTitle({ ...cartao, payment_status: 'pending' })).toBe(ESPERA)
    expect(cardContactTitle({ ...cartao, payment_status: 'pending', mp_status_detail: 'in_process' })).toBe(ESPERA)
  })

  it.each(['in_process', 'pending_review_manual'])(
    'cobrança expirada pelo relógio da loja com o meio de pagamento ainda analisando (%s): ainda não foi confirmado',
    (detalhe) => {
      expect(cardContactTitle({ ...cartao, payment_status: 'expired', mp_status_detail: detalhe })).toBe(ESPERA)
    },
  )

  it('recusado: não foi concluído — inclusive com um detalhe de desafio', () => {
    expect(cardContactTitle(cartao)).toBe(FALHOU)
    expect(cardContactTitle({ ...cartao, mp_status_detail: 'pending_challenge' })).toBe(FALHOU)
    expect(cardContactTitle({ ...cartao, mp_status_detail: 'cc_rejected_other_reason' })).toBe(FALHOU)
  })

  it('expirado sem análise em curso: não foi concluído', () => {
    expect(cardContactTitle({ ...cartao, payment_status: 'expired' })).toBe(FALHOU)
    expect(cardContactTitle({ ...cartao, payment_status: 'expired', mp_status_detail: '' })).toBe(FALHOU)
  })
})

describe('pagamentoSemCobrancaDaLoja — o pedido gravado fora da loja, que a loja nunca cobrou', () => {
  // O pedido importado ou gravado direto no banco: o pagamento morreu sem nenhuma cobrança feita pela
  // loja — nem a order do Mercado Pago, nem o pagamento dela, nem a proposta montada pelo painel.
  const foraDaLoja = { ...expirado, mp_order_id: null, mp_payment_id: null }

  it('PIX expirado ou recusado sem cobrança da loja: não oferece PIX novo, em toda a janela', () => {
    for (const payment_status of ['expired', 'rejected']) {
      for (const ms of [0, DIA, 7 * DIA, 30 * DIA]) {
        expect(podeGerarNovoPix({ ...foraDaLoja, payment_status }, depois(ms))).toBe(false)
      }
    }
  })

  it('é o estado "a Adri combina o pagamento", e nunca o pagamento perdido', () => {
    for (const ms of [0, DIA, 7 * DIA + 60 * 1000, 30 * DIA]) {
      expect(pagamentoACombinar(foraDaLoja)).toBe(true)
      expect(pagamentoPerdido(foraDaLoja, depois(ms))).toBe(false)
    }
    expect(pagamentoSemCobrancaDaLoja(foraDaLoja)).toBe(true)
  })

  it('sem a coluna da order (undefined) ou com espaço é igual a sem cobrança', () => {
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, mp_order_id: undefined })).toBe(true)
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, mp_order_id: '  ' })).toBe(true)
  })

  it('o par: PIX que a loja cobrou (a order, ou só o pagamento) continua oferecendo PIX novo', () => {
    expect(pagamentoSemCobrancaDaLoja(expirado)).toBe(false)
    expect(podeGerarNovoPix(expirado, depois(DIA))).toBe(true)
    const soPagamento = { ...foraDaLoja, mp_payment_id: 'PAY01' }
    expect(pagamentoSemCobrancaDaLoja(soPagamento)).toBe(false)
    expect(podeGerarNovoPix(soPagamento, depois(DIA))).toBe(true)
    expect(pagamentoACombinar(expirado)).toBe(false)
  })

  it('o par: o pedido montado pelo painel tem o preço da proposta — continua oferecendo', () => {
    const montado = { ...foraDaLoja, proposal_id: 'prop-1' }
    expect(pagamentoSemCobrancaDaLoja(montado)).toBe(false)
    expect(podeGerarNovoPix(montado, depois(DIA))).toBe(true)
  })

  it('o par: a cobrança travada pelo servidor conta como cobrança da loja', () => {
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, charge_locked: true })).toBe(false)
  })

  it('pendente não é pagamento morto: segue a primeira cobrança de sempre', () => {
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, payment_status: 'pending' })).toBe(false)
    expect(pagamentoACombinar({ ...foraDaLoja, payment_status: 'pending' })).toBe(false)
  })

  it('cancelado, pago ou avançado à mão: nada a combinar', () => {
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, status: 'cancelled' })).toBe(false)
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, paid_at: CRIADO })).toBe(false)
    expect(pagamentoSemCobrancaDaLoja({ ...foraDaLoja, status: 'separating' })).toBe(false)
  })

  it('o cartão sem cobrança da loja continua sendo o informativo do cartão, não um segundo estado', () => {
    const cartao = { ...foraDaLoja, payment_method: 'card', payment_status: 'rejected' }
    expect(pagamentoSemCobrancaDaLoja(cartao)).toBe(true)
    expect(cartaoParaResolver(cartao)).toBe(true)
    expect(pagamentoACombinar(cartao)).toBe(false)
  })
})
