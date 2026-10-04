import { describe, it, expect } from 'vitest'
import {
  CARD_INSTALLMENTS_CEILING,
  cardInstallmentOptions,
  resolveInstallments,
} from '../installments'

// Promovido de `apps/store/src/features/checkout/model/` na aplicação dos boards de Produto: a
// página do produto mostra a mesma parcela e não pode importar de `features/`.

// Comportamento herdado do card de cartão em `PaymentBlock` (correções do ciclo de QA 2026-07-28),
// agora compartilhado com a sub-linha do resumo (RSM-06): os dois têm de dizer a MESMA parcela.

describe('resolveInstallments — valor da parcela no card de cartão', () => {
  it('divide o total pelo teto de parcelas quando o mínimo por parcela permite', () => {
    // 120 / 6 = 20, e 20 >= min_installment_value 10 → usa o teto.
    expect(resolveInstallments(120, 6, 10)).toEqual({ count: 6, value: 20 })
  })

  it('respeita min_installment_value: não promete parcela que o MP não oferece', () => {
    // 30 com mínimo de 10 só permite 3x — nunca 6x de R$ 5,00.
    expect(resolveInstallments(30, 6, 10)).toEqual({ count: 3, value: 10 })
  })

  it('arredonda a parcela em centavos', () => {
    const r = resolveInstallments(100, 3, 10)
    expect(r).toEqual({ count: 3, value: 33.33 })
  })

  it('nunca devolve menos de 1x, mesmo com total abaixo do mínimo', () => {
    expect(resolveInstallments(5, 6, 10)).toEqual({ count: 1, value: 5 })
  })

  it('total zero ou negativo não gera parcelamento', () => {
    expect(resolveInstallments(0, 6, 10)).toBeNull()
    expect(resolveInstallments(-1, 6, 10)).toBeNull()
  })

  it('min_installment_value zero ou ausente cai no teto de parcelas', () => {
    expect(resolveInstallments(120, 6, 0)).toEqual({ count: 6, value: 20 })
  })
})

// Tabela medida em 2026-10-04 contra a conta da loja (bandeira Mastercard, R$ 277,25): nenhuma
// parcela sem juros configurada no Mercado Pago, juros a partir de 2x.
const SEM_PROMOCAO = [
  { installments: 1, installment_rate: 0, installment_amount: 277.25, total_amount: 277.25 },
  { installments: 2, installment_rate: 9.64, installment_amount: 151.99, total_amount: 303.98 },
  { installments: 3, installment_rate: 11.23, installment_amount: 102.8, total_amount: 308.39 },
  { installments: 4, installment_rate: 11.36, installment_amount: 77.19, total_amount: 308.75 },
  { installments: 9, installment_rate: 19.69, installment_amount: 36.87, total_amount: 331.84000000000003 },
  { installments: 10, installment_rate: 20.65, installment_amount: 33.45, total_amount: 334.5 },
  { installments: 11, installment_rate: 20.66, installment_amount: 30.41, total_amount: 334.53 },
  { installments: 12, installment_rate: 22.11, installment_amount: 28.21, total_amount: 338.55 },
]

// A mesma conta depois de "Oferecer parcelamento sem juros" até 3x no painel do Mercado Pago.
const TRES_SEM_JUROS = SEM_PROMOCAO.map((c) =>
  c.installments <= 3
    ? { ...c, installment_rate: 0, installment_amount: Math.round((277.25 / c.installments) * 100) / 100, total_amount: 277.25 }
    : c,
)

describe('cardInstallmentOptions — as parcelas do caixa, pela tabela do Mercado Pago', () => {
  it('"sem juros" é o que o Mercado Pago diz: sem promoção, só o 1x é sem juros', () => {
    const opts = cardInstallmentOptions(277.25, SEM_PROMOCAO, 10)
    expect(opts.filter((o) => o.interestFree).map((o) => o.count)).toEqual([1])
    expect(opts.find((o) => o.count === 2)).toEqual({ count: 2, value: 151.99, total: 303.98, interestFree: false })
  })

  it('com parcelamento sem juros no Mercado Pago, as primeiras viram sem juros e o resto mantém os juros', () => {
    const opts = cardInstallmentOptions(277.25, TRES_SEM_JUROS, 10)
    expect(opts.filter((o) => o.interestFree).map((o) => o.count)).toEqual([1, 2, 3])
    expect(opts.find((o) => o.count === 3)).toEqual({ count: 3, value: 92.42, total: 277.25, interestFree: true })
    expect(opts.find((o) => o.count === 4)?.interestFree).toBe(false)
  })

  it('para em 10x, mesmo com o Mercado Pago oferecendo 12x', () => {
    expect(CARD_INSTALLMENTS_CEILING).toBe(10)
    const counts = cardInstallmentOptions(277.25, SEM_PROMOCAO, 10).map((o) => o.count)
    expect(Math.max(...counts)).toBe(10)
    expect(counts).not.toContain(11)
  })

  it('respeita a parcela mínima, pelo mesmo corte da vitrine', () => {
    // 277,25 com mínimo de R$ 70 → no máximo 3x.
    expect(cardInstallmentOptions(277.25, SEM_PROMOCAO, 70).map((o) => o.count)).toEqual([1, 2, 3])
    expect(resolveInstallments(277.25, 10, 70)?.count).toBe(3)
  })

  it('arredonda o total em centavos (o Mercado Pago devolve 331.84000000000003)', () => {
    expect(cardInstallmentOptions(277.25, SEM_PROMOCAO, 10).find((o) => o.count === 9)?.total).toBe(331.84)
  })

  it('ordena por quantidade e não repete linha', () => {
    const embaralhado = [SEM_PROMOCAO[2], SEM_PROMOCAO[0], SEM_PROMOCAO[2], SEM_PROMOCAO[1]]
    expect(cardInstallmentOptions(277.25, embaralhado, 10).map((o) => o.count)).toEqual([1, 2, 3])
  })

  it('o 1x existe sempre — inclusive com a tabela vazia (cartão que só aceita à vista)', () => {
    expect(cardInstallmentOptions(277.25, [], 10)).toEqual([
      { count: 1, value: 277.25, total: 277.25, interestFree: true },
    ])
  })

  it('valor zero não gera opção', () => {
    expect(cardInstallmentOptions(0, SEM_PROMOCAO, 10)).toEqual([])
  })
})
