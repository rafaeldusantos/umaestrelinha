import { describe, expect, it } from 'vitest'
import { QUOTE_FALLBACK, type QuoteLine, toQuoteProducts } from '../quotePayload.ts'

// O dono único do corpo de `melhor-envio?action=quote`.
//
// A régua que importa é o `insurance_value`: ele é **por unidade**, porque a API já multiplica por
// `quantity`. Medido contra o sandbox em 2026-09-05, mesma origem/destino, 15×6×15, 0,3 kg,
// seguro R$ 146 por unidade:
//
//   qty 1 → PAC R$ 23,28 · qty 2 → R$ 28,94 · qty 4 → R$ 34,47
//
// O crescimento com a quantidade prova que a multiplicação é da API. A fórmula que o backoffice
// usava (`unit_price * quantity`) segurava a carga pelo QUADRADO da quantidade — e o sensor no fim
// deste arquivo assere que ela **reprova** na mesma régua, para que a asserção não passe a valer
// para qualquer implementação.

const linha = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  id: 'prod-1',
  unitPrice: 12.9,
  quantity: 1,
  ...over,
})

describe('toQuoteProducts — forma da lista', () => {
  it('devolve um entry por linha, com a quantidade de cada uma', () => {
    const payload = toQuoteProducts([
      linha({ id: 'prod-1', quantity: 2 }),
      linha({ id: 'prod-2', quantity: 3 }),
    ])

    expect(payload).toHaveLength(2)
    expect(payload[0]).toMatchObject({ id: 'prod-1', quantity: 2 })
    expect(payload[1]).toMatchObject({ id: 'prod-2', quantity: 3 })
  })

  it('lista vazia devolve lista vazia', () => {
    expect(toQuoteProducts([])).toEqual([])
  })

  it('entrada nula não estoura — devolve lista vazia', () => {
    expect(toQuoteProducts(null as unknown as QuoteLine[])).toEqual([])
  })
})

describe('toQuoteProducts — dimensões reais x fallback', () => {
  it('envia as medidas REAIS quando o produto as tem', () => {
    const [p] = toQuoteProducts([
      linha({ dimensions: { width_cm: 25, height_cm: 7, length_cm: 30, weight_kg: 0.85 } }),
    ])

    expect(p).toMatchObject({ width: 25, height: 7, length: 30, weight: 0.85 })
  })

  it('sem dimensões, os quatro campos caem no padrão', () => {
    const [p] = toQuoteProducts([linha({ dimensions: null })])

    expect(p).toMatchObject({
      width: QUOTE_FALLBACK.width,
      height: QUOTE_FALLBACK.height,
      length: QUOTE_FALLBACK.length,
      weight: QUOTE_FALLBACK.weight,
    })
  })

  it.each([
    ['width_cm', 'width', QUOTE_FALLBACK.width],
    ['height_cm', 'height', QUOTE_FALLBACK.height],
    ['length_cm', 'length', QUOTE_FALLBACK.length],
    ['weight_kg', 'weight', QUOTE_FALLBACK.weight],
  ] as const)('%s ausente cai no padrão sem arrastar os outros', (campo, saida, padrao) => {
    const completo = { width_cm: 25, height_cm: 7, length_cm: 30, weight_kg: 0.85 }
    const [p] = toQuoteProducts([linha({ dimensions: { ...completo, [campo]: null } })])

    expect(p[saida]).toBe(padrao)
    // A vizinha que impede o teste de passar com um fallback aplicado EM BLOCO: os outros três
    // campos têm de continuar reais.
    const outros = (['width', 'height', 'length', 'weight'] as const).filter((c) => c !== saida)
    for (const c of outros) expect(p[c]).not.toBe(QUOTE_FALLBACK[c])
  })

  it('zero é medida inválida e cai no padrão — 0 cm de largura não é uma caixa', () => {
    const [p] = toQuoteProducts([
      linha({ dimensions: { width_cm: 0, height_cm: 0, length_cm: 0, weight_kg: 0 } }),
    ])

    expect(p).toMatchObject({
      width: QUOTE_FALLBACK.width,
      height: QUOTE_FALLBACK.height,
      length: QUOTE_FALLBACK.length,
      weight: QUOTE_FALLBACK.weight,
    })
  })

  it('o padrão é aplicado POR ITEM: o item com medidas mantém as suas', () => {
    const payload = toQuoteProducts([
      linha({ id: 'com-dim', dimensions: { width_cm: 25, weight_kg: 0.85 } }),
      linha({ id: 'sem-dim' }),
    ])

    expect(payload[0]).toMatchObject({ id: 'com-dim', width: 25, weight: 0.85 })
    expect(payload[1]).toMatchObject({ id: 'sem-dim', width: 11, weight: 0.1 })
  })
})

describe('toQuoteProducts — insurance_value é POR UNIDADE (a régua)', () => {
  it('com quantidade 1, é o preço da linha', () => {
    const [p] = toQuoteProducts([linha({ unitPrice: 34.5, quantity: 1 })])

    expect(p.insurance_value).toBe(34.5)
  })

  it('com quantidade 4, CONTINUA sendo o preço unitário — a API é quem multiplica', () => {
    const [p] = toQuoteProducts([linha({ unitPrice: 34.5, quantity: 4 })])

    expect(p.insurance_value).toBe(34.5)
    expect(p.quantity).toBe(4)
    // A asserção que nomeia o defeito: 138 seria o valor da fórmula do backoffice.
    expect(p.insurance_value).not.toBe(34.5 * 4)
  })

  it('a quantidade não contamina nenhum outro campo do payload', () => {
    const [um] = toQuoteProducts([linha({ unitPrice: 34.5, quantity: 1, dimensions: { weight_kg: 0.3 } })])
    const [quatro] = toQuoteProducts([linha({ unitPrice: 34.5, quantity: 4, dimensions: { weight_kg: 0.3 } })])

    expect(quatro.weight).toBe(um.weight)
    expect(quatro.insurance_value).toBe(um.insurance_value)
    expect(quatro).not.toEqual(um) // só `quantity` difere
  })

  it('é o preço DA LINHA, não o do produto — com grade os dois divergem', () => {
    // `unitPrice` é o campo que o `cartStore` usa no `subtotal()` justamente por isso.
    const [p] = toQuoteProducts([linha({ unitPrice: 18.4 })])

    expect(p.insurance_value).toBe(18.4)
  })
})

describe('sensor — a fórmula antiga reprova nesta régua', () => {
  /** Exatamente o que `MelhorEnvioTab.tsx` fazia antes de 2026-09-05. */
  const formulaAntiga = (linhas: QuoteLine[]) =>
    linhas.map((l) => ({ ...l, insurance_value: l.unitPrice * l.quantity }))

  it('a implementação antiga inflaria o seguro com a quantidade', () => {
    const entrada = [linha({ unitPrice: 34.5, quantity: 4 })]

    const antiga = formulaAntiga(entrada)[0].insurance_value
    const atual = toQuoteProducts(entrada)[0].insurance_value

    expect(antiga).toBe(138)
    expect(atual).toBe(34.5)
    // Sem esta linha o teste acima passaria para as duas fórmulas se `quantity` fosse 1.
    expect(antiga).not.toBe(atual)
  })

  it('com quantidade 1 as duas coincidem — por isso o defeito passou despercebido', () => {
    const entrada = [linha({ unitPrice: 34.5, quantity: 1 })]

    expect(formulaAntiga(entrada)[0].insurance_value).toBe(toQuoteProducts(entrada)[0].insurance_value)
  })
})
