import { describe, expect, it } from 'vitest'
import {
  addBusinessDays,
  cheapestQuoteId,
  formatEstimate,
  quoteToEstimate,
  type ShippingQuote,
} from '../index'

// SHP-09: data = hoje + handling_days + delivery_range em dias úteis (seg–sex);
//         delivery_range ausente => delivery_time vale como min e max;
//         min ≠ max exibe a faixa, min = max exibe a data única.
// SHP-06: a opção mais barata é a que ganha "Grátis".
// Edge case da spec: handling_days = 0 não quebra o cálculo.

// Datas locais para evitar deriva de fuso. 2026-07-27 é uma segunda-feira.
const MON_JUL_27 = () => new Date(2026, 6, 27)
const WED_JUL_29 = () => new Date(2026, 6, 29)
const FRI_JUL_31 = () => new Date(2026, 6, 31)
const SAT_AUG_01 = () => new Date(2026, 7, 1)

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const quote = (over: Partial<ShippingQuote> = {}): ShippingQuote => ({
  id: 1,
  name: 'PAC',
  company: 'Correios',
  price: '18.90',
  delivery_time: 5,
  delivery_range: { min: 3, max: 5 },
  ...over,
})

describe('addBusinessDays', () => {
  it('days = 0 devolve a própria data de entrada', () => {
    expect(iso(addBusinessDays(MON_JUL_27(), 0))).toBe('2026-07-27')
  })

  it('days = 0 num sábado devolve o próprio sábado (sem normalizar)', () => {
    expect(iso(addBusinessDays(SAT_AUG_01(), 0))).toBe('2026-08-01')
  })

  it('pula sábado e domingo: sexta + 1 dia útil cai na segunda', () => {
    expect(iso(addBusinessDays(FRI_JUL_31(), 1))).toBe('2026-08-03')
  })

  it('sexta + 2 dias úteis cai na terça', () => {
    expect(iso(addBusinessDays(FRI_JUL_31(), 2))).toBe('2026-08-04')
  })

  it('quarta + 3 dias úteis atravessa o fim de semana e cai na segunda', () => {
    expect(iso(addBusinessDays(WED_JUL_29(), 3))).toBe('2026-08-03')
  })

  it('10 dias úteis a partir de segunda são exatamente 14 dias corridos', () => {
    expect(iso(addBusinessDays(MON_JUL_27(), 10))).toBe('2026-08-10')
  })

  it('sábado + 1 dia útil cai na segunda seguinte', () => {
    expect(iso(addBusinessDays(SAT_AUG_01(), 1))).toBe('2026-08-03')
  })

  it('não muta a data recebida', () => {
    const from = MON_JUL_27()
    addBusinessDays(from, 5)
    expect(iso(from)).toBe('2026-07-27')
  })
})

describe('quoteToEstimate', () => {
  it('soma handling_days + delivery_range em dias úteis', () => {
    // seg 27/07 + 2 (produção) + 3..5 (transporte) = 5..7 dias úteis => 03/08 a 05/08
    const estimate = quoteToEstimate(quote(), 2, MON_JUL_27())
    expect(iso(estimate.min)).toBe('2026-08-03')
    expect(iso(estimate.max)).toBe('2026-08-05')
  })

  it('delivery_range ausente usa delivery_time como min e max', () => {
    const estimate = quoteToEstimate(
      quote({ delivery_range: undefined, delivery_time: 5 }),
      2,
      MON_JUL_27(),
    )
    // 2 + 5 = 7 dias úteis a partir de seg 27/07 => 05/08 nos dois extremos
    expect(iso(estimate.min)).toBe('2026-08-05')
    expect(iso(estimate.max)).toBe('2026-08-05')
  })

  it('handling_days = 0 devolve hoje + delivery_range, sem quebrar', () => {
    const estimate = quoteToEstimate(quote({ delivery_range: { min: 1, max: 1 } }), 0, MON_JUL_27())
    expect(iso(estimate.min)).toBe('2026-07-28')
    expect(iso(estimate.max)).toBe('2026-07-28')
  })

  it('delivery_range com min = max devolve janela de um único dia', () => {
    const estimate = quoteToEstimate(quote({ delivery_range: { min: 4, max: 4 } }), 2, MON_JUL_27())
    // 2 + 4 = 6 dias úteis a partir de seg 27/07 => 04/08
    expect(iso(estimate.min)).toBe('2026-08-04')
    expect(iso(estimate.max)).toBe('2026-08-04')
  })

  it('usa o `today` recebido, nunca o relógio do sistema', () => {
    // qua 01/01/2020 + 2 + 3..5 dias úteis => 08/01/2020 a 10/01/2020
    const estimate = quoteToEstimate(quote(), 2, new Date(2020, 0, 1))
    expect(iso(estimate.min)).toBe('2020-01-08')
    expect(iso(estimate.max)).toBe('2020-01-10')
  })
})

describe('formatEstimate', () => {
  it('min ≠ max no mesmo mês devolve "entre 4 e 6 de agosto"', () => {
    expect(formatEstimate(new Date(2026, 7, 4), new Date(2026, 7, 6))).toBe('entre 4 e 6 de agosto')
  })

  it('min = max devolve "em 30 de julho"', () => {
    expect(formatEstimate(new Date(2026, 6, 30), new Date(2026, 6, 30))).toBe('em 30 de julho')
  })

  it('faixa que atravessa o mês nomeia os dois meses', () => {
    expect(formatEstimate(new Date(2026, 6, 30), new Date(2026, 7, 3))).toBe(
      'entre 30 de julho e 3 de agosto',
    )
  })
})

describe('cheapestQuoteId', () => {
  it('devolve o id do menor preço comparando como número, não como texto', () => {
    // ordenação textual colocaria "18.90" antes de "9.90"
    const id = cheapestQuoteId([
      quote({ id: 1, price: '18.90' }),
      quote({ id: 2, price: '9.90' }),
      quote({ id: 3, price: '24.50' }),
    ])
    expect(id).toBe(2)
  })

  it('lista vazia devolve null', () => {
    expect(cheapestQuoteId([])).toBeNull()
  })

  it('lista com uma única opção devolve o id dela', () => {
    expect(cheapestQuoteId([quote({ id: 7, price: '12.30' })])).toBe(7)
  })
})
