import { describe, expect, it } from 'vitest'
import { mapDbToProduct } from '../mapProduct'

// O preço efetivo da peça de campanha, entregue pelo mapeador.
//
// A marcação chega pelo embed `product_campaigns(percent, campaigns(...))`, que a RLS só preenche
// para a campanha EM VIGÊNCIA (ligada, `starts_at <= now() < ends_at`) e peça ativa. O mapeador não
// olha relógio: marcação presente com a campanha embutida é campanha valendo. Os valores esperados
// são os dos critérios de aceite (R$ 209,90 a 20% = R$ 167,92; R$ 259,90/R$ 239,90 a 10% = R$ 233,91).

const BLACK_FRIDAY = {
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-12-01T03:00:00Z',
}

const marca = (percent: number, campanha: Record<string, unknown> | null = BLACK_FRIDAY) => [
  { percent, campaigns: campanha },
]

describe('mapDbToProduct — o preço da campanha em vigência', () => {
  it('peça de R$ 209,90 marcada com 20%: cobra R$ 167,92 e o cheio é R$ 209,90', () => {
    const p = mapDbToProduct({ id: 'p1', base_price: 209.9, original_price: null, product_campaigns: marca(20) })
    expect(p.price).toBe(167.92)
    expect(p.compare_price).toBe(209.9)
    expect(p.campaign).toEqual({
      id: 'camp-bf',
      name: 'Black Friday',
      badge_text: 'Black Friday',
      band_color: '#161514',
      accent_color: '#C2A063',
      ends_at: '2026-12-01T03:00:00Z',
      percent: 20,
      list_prices: { price: 209.9, compare_price: null, variants: {} },
    })
  })

  it('sem marcação, o preço de sempre e nenhuma campanha', () => {
    const p = mapDbToProduct({ id: 'p1', base_price: 209.9, original_price: null, product_campaigns: [] })
    expect(p.price).toBe(209.9)
    expect(p.compare_price).toBeNull()
    expect(p.campaign).toBeNull()
  })

  it('o embed ausente (select que não o pede) é o mesmo que sem marcação', () => {
    const p = mapDbToProduct({ id: 'p1', base_price: 209.9, original_price: 259.9 })
    expect(p.price).toBe(209.9)
    expect(p.compare_price).toBe(259.9)
    expect(p.campaign).toBeNull()
  })

  it('a marcação cuja campanha a leitura pública não entregou (fora da vigência) não muda o preço', () => {
    const p = mapDbToProduct({ id: 'p1', base_price: 209.9, original_price: null, product_campaigns: marca(20, null) })
    expect(p.price).toBe(209.9)
    expect(p.compare_price).toBeNull()
    expect(p.campaign).toBeNull()
  })

  it('"de/por" com campanha: cobra o MENOR (R$ 233,91), "de" R$ 259,90 — nunca R$ 215,91', () => {
    const p = mapDbToProduct({ id: 'p1', base_price: 239.9, original_price: 259.9, product_campaigns: marca(10) })
    expect(p.price).toBe(233.91)
    expect(p.compare_price).toBe(259.9)
    expect(p.campaign?.percent).toBe(10)
  })

  it('campanha que não baixa o preço de hoje não marca a peça: sem selo, preço e "de" de sempre', () => {
    // 5% sobre o cheio de R$ 259,90 = R$ 246,91, acima dos R$ 199,90 de hoje.
    const p = mapDbToProduct({ id: 'p1', base_price: 199.9, original_price: 259.9, product_campaigns: marca(5) })
    expect(p.price).toBe(199.9)
    expect(p.compare_price).toBe(259.9)
    expect(p.campaign).toBeNull()
  })

  it('cada variação recebe o percentual sobre o PRÓPRIO preço', () => {
    const p = mapDbToProduct({
      id: 'p1',
      base_price: 100,
      original_price: null,
      product_campaigns: marca(20),
      product_variants: [
        { id: 'v1', price: 100, compare_price: null, is_active: true, position: 0, option_values: { Cor: 'Ouro' } },
        { id: 'v2', price: 150, compare_price: null, is_active: true, position: 1, option_values: { Cor: 'Prata' } },
      ],
    })
    expect(p.variants.map(v => [v.price, v.compare_price])).toEqual([
      [80, 100],
      [120, 150],
    ])
    // O preço de tabela de cada linha fica guardado — a sacola o passa a `resolveOrderPricing`
    // junto do percentual, e nunca reaplica a campanha sobre o preço efetivo.
    expect(p.campaign?.list_prices).toEqual({
      price: 100,
      compare_price: null,
      variants: { v1: { price: 100, compare_price: null }, v2: { price: 150, compare_price: null } },
    })
  })

  it('a variação com "de/por" cobra o menor entre o de hoje e o cheio com a campanha', () => {
    const p = mapDbToProduct({
      id: 'p1',
      base_price: 239.9,
      original_price: null,
      product_campaigns: marca(10),
      product_variants: [
        { id: 'v1', price: 239.9, compare_price: 259.9, is_active: true, position: 0, option_values: { Cor: 'Ouro' } },
      ],
    })
    expect(p.variants[0].price).toBe(233.91)
    expect(p.variants[0].compare_price).toBe(259.9)
  })

  it('a variação sem preço próprio continua sem preço — herda o da peça, já com a campanha', () => {
    const p = mapDbToProduct({
      id: 'p1',
      base_price: 209.9,
      original_price: null,
      product_campaigns: marca(20),
      product_variants: [{ id: 'v1', price: null, compare_price: null, is_active: true, position: 0, option_values: {} }],
    })
    expect(p.variants[0].price).toBeNull()
    expect(p.price).toBe(167.92)
  })

  it('sem campanha, as variações ficam como o banco as tem', () => {
    const p = mapDbToProduct({
      id: 'p1',
      base_price: 100,
      product_variants: [
        { id: 'v1', price: 150, compare_price: 180, is_active: true, position: 0, option_values: { Cor: 'Ouro' } },
      ],
    })
    expect(p.variants[0].price).toBe(150)
    expect(p.variants[0].compare_price).toBe(180)
  })
})

describe('mapDbToProduct — a peça sem grade com "de/por" na variação única', () => {
  // A forma do catálogo importado: o "de" mora na variação, e `original_price` é nulo.
  const PECA_DE_POR = {
    id: 'p-mc',
    base_price: 349.9,
    original_price: null,
    options: [],
    product_variants: [
      { id: 'v-mc', price: 349.9, compare_price: 374, is_active: true, position: 0, option_values: {} },
    ],
  }

  it('10%: o menor entre o "por" e o "de" com o desconto — R$ 336,60, "De" R$ 374,00, nunca R$ 314,91', () => {
    const p = mapDbToProduct({ ...PECA_DE_POR, product_campaigns: marca(10) })
    expect(p.price).toBe(336.6)
    expect(p.compare_price).toBe(374)
    expect(p.price).not.toBe(314.91)
    expect(p.variants[0].price).toBe(336.6)
    // O preço de tabela da peça leva o "de" da variação: é dele que a sacola parte.
    expect(p.campaign?.list_prices).toEqual({
      price: 349.9,
      compare_price: 374,
      variants: { 'v-mc': { price: 349.9, compare_price: 374 } },
    })
  })

  it('o par sem "de": R$ 385,00 a 20% continua R$ 308,00', () => {
    const p = mapDbToProduct({
      id: 'p-ma',
      base_price: 385,
      original_price: null,
      options: [],
      product_variants: [{ id: 'v-ma', price: 385, compare_price: null, is_active: true, position: 0, option_values: {} }],
      product_campaigns: marca(20),
    })
    expect(p.price).toBe(308)
    expect(p.compare_price).toBe(385)
  })

  it('sem campanha, o "de" da peça continua o que o banco tem', () => {
    const p = mapDbToProduct({ ...PECA_DE_POR, product_campaigns: [] })
    expect(p.price).toBe(349.9)
    expect(p.compare_price).toBeNull()
  })
})
