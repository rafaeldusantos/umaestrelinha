import { describe, it, expect } from 'vitest'
import { resolveInstallments } from '../installments'

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
