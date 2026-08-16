import { describe, expect, it } from 'vitest'
import {
  availableValuesFor,
  canAddSelection,
  CARD_MAX_AXES,
  colorAxis,
  colorPreview,
  COLOR_SLOT_TIERS,
  COLOR_SLOTS_MAX,
  COLOR_THUMB_PX,
  findVariant,
  hasSellableGrid,
  initialSelection,
  needsProductPage,
  orderedOptions,
  PAGE_MAX_AXES,
  visibleOptions,
  type GridProduct,
} from '../variantSelection'
import type { OptionValues, ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// PST-05: seletores gerados de `products.options` na ordem de `position` — até 3 na página, 2 no
// card (A7). PST-08: disponibilidade respeita `stock_policy`. PST-10: variação ativa com `options`
// vazio é produto sem variação.

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (
  option_values: OptionValues,
  overrides: Partial<ProductVariant> = {},
): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values,
  name: null,
  sku: null,
  price: 4.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const grid = (over: Partial<GridProduct> = {}): GridProduct => ({
  options: [option('Tamanho', ['3,5 cm', '4,5 cm'], 0), option('Acabamento', ['Fosco', 'Brilhante'], 1)],
  variants: [],
  stock_policy: 'track',
  ...over,
})

describe('orderedOptions / visibleOptions — ordem e teto de eixos (PST-05 AC 1-2)', () => {
  it('ordena por position, não pela ordem do array', () => {
    const ordered = orderedOptions([
      option('Acabamento', ['Fosco'], 2),
      option('Tamanho', ['4,5 cm'], 0),
      option('Cor', ['Rosa'], 1),
    ])
    expect(ordered.map(o => o.name)).toEqual(['Tamanho', 'Cor', 'Acabamento'])
  })

  it('eixo sem valores é descartado — seria um seletor vazio', () => {
    expect(orderedOptions([option('Tamanho', [], 0), option('Cor', ['Rosa'], 1)])).toHaveLength(1)
  })

  it('empate de position resolve por nome, para a ordem não trocar entre renders', () => {
    const ordered = orderedOptions([option('Pack', ['2 un'], 0), option('Cor', ['Rosa'], 0)])
    expect(ordered.map(o => o.name)).toEqual(['Cor', 'Pack'])
  })

  it('a página mostra até 3 eixos', () => {
    const options = [
      option('Tamanho', ['4,5 cm'], 0),
      option('Acabamento', ['Fosco'], 1),
      option('Cor', ['Rosa'], 2),
      option('Pack', ['2 un'], 3),
    ]
    expect(visibleOptions(options, PAGE_MAX_AXES).map(o => o.name)).toEqual([
      'Tamanho',
      'Acabamento',
      'Cor',
    ])
  })

  it('o card mostra 2 eixos — os dois primeiros por position', () => {
    const options = [
      option('Cor', ['Rosa'], 2),
      option('Tamanho', ['4,5 cm'], 0),
      option('Acabamento', ['Fosco'], 1),
    ]
    expect(visibleOptions(options, CARD_MAX_AXES).map(o => o.name)).toEqual([
      'Tamanho',
      'Acabamento',
    ])
  })

  it('com 3 eixos o card leva para a página do produto; com 2, não', () => {
    expect(
      needsProductPage([
        option('Tamanho', ['4,5 cm'], 0),
        option('Acabamento', ['Fosco'], 1),
        option('Cor', ['Rosa'], 2),
      ]),
    ).toBe(true)
    expect(
      needsProductPage([option('Tamanho', ['4,5 cm'], 0), option('Acabamento', ['Fosco'], 1)]),
    ).toBe(false)
  })
})

describe('hasSellableGrid — PST-10', () => {
  it('eixo + linha ativa com preço = vendido por variação', () => {
    expect(
      hasSellableGrid({ options: [option('Tamanho', ['4,5 cm'], 0)], variants: [variant({})] }),
    ).toBe(true)
  })

  it('variação ativa com options VAZIO é tratada como produto sem variação (PST-10)', () => {
    expect(hasSellableGrid({ options: [], variants: [variant({})] })).toBe(false)
  })

  it('eixo cadastrado mas grade toda pausada não é vendável por variação', () => {
    expect(
      hasSellableGrid({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { is_active: false })],
      }),
    ).toBe(false)
  })

  it('eixo cadastrado mas linha ativa SEM preço não é vendável — cair nela seria undercharge', () => {
    expect(
      hasSellableGrid({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { price: null })],
      }),
    ).toBe(false)
  })
})

describe('findVariant — a linha que casa com a escolha', () => {
  it('casa todos os eixos escolhidos', () => {
    const alvo = variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })
    const variants = [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }), alvo]
    expect(findVariant(variants, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })?.id).toBe(alvo.id)
  })

  it('combinação que não existe na grade devolve null, não a primeira linha', () => {
    const variants = [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' })]
    expect(findVariant(variants, { Tamanho: '5,5 cm', Acabamento: 'Fosco' })).toBeNull()
  })

  it('seleção vazia devolve null — sem escolha não há linha', () => {
    expect(findVariant([variant({ Tamanho: '4,5 cm' })], {})).toBeNull()
  })
})

describe('availableValuesFor — disponibilidade por eixo (PST-08 / AC 16)', () => {
  it('track com stock 0: o valor sai da lista de disponíveis', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { stock: 5 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 }),
      ],
    })
    const disponiveis = availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })
    expect([...disponiveis]).toEqual(['3,5 cm'])
  })

  it('backorder com stock 0: o valor continua disponível (AC 7)', () => {
    const product = grid({
      stock_policy: 'backorder',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: -3 })],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
  })

  it('none com stock 0: o valor continua disponível (AC 6)', () => {
    const product = grid({
      stock_policy: 'none',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 })],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
  })

  it('linha pausada é indisponível em qualquer política — is_active vence a política', () => {
    const product = grid({
      stock_policy: 'none',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { is_active: false })],
    })
    expect(availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' }).size).toBe(0)
  })

  it('a disponibilidade de um eixo depende do OUTRO eixo escolhido', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 7 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Brilhante' }, { stock: 0 }),
      ],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
    expect(availableValuesFor(product, 'Tamanho', { Acabamento: 'Brilhante' }).size).toBe(0)
  })
})

describe('initialSelection — a combinação que já vem escolhida', () => {
  it('começa na primeira linha DISPONÍVEL por position, não na primeira do array', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { position: 1, stock: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Brilhante' }, { position: 0, stock: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { position: 2, stock: 9 }),
      ],
    })
    expect(initialSelection(product, PAGE_MAX_AXES)).toEqual({
      Tamanho: '4,5 cm',
      Acabamento: 'Fosco',
    })
  })

  it('grade toda esgotada cai na primeira linha existente — seletor não abre vazio', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { position: 0, stock: 0 }),
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { position: 1, stock: 0 }),
      ],
    })
    expect(initialSelection(product, PAGE_MAX_AXES)).toEqual({
      Tamanho: '4,5 cm',
      Acabamento: 'Fosco',
    })
  })

  it('produto sem eixo devolve seleção vazia — não há o que escolher', () => {
    expect(initialSelection(grid({ options: [] }), PAGE_MAX_AXES)).toEqual({})
  })

  it('no card, a seleção cobre só os 2 primeiros eixos', () => {
    const product = grid({
      options: [
        option('Tamanho', ['4,5 cm'], 0),
        option('Acabamento', ['Fosco'], 1),
        option('Cor', ['Rosa'], 2),
      ],
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' })],
    })
    expect(Object.keys(initialSelection(product, CARD_MAX_AXES))).toEqual(['Tamanho', 'Acabamento'])
  })
})

describe('canAddSelection — o que pode entrar no carrinho (AC 16)', () => {
  it('combinação com stock 0 e policy track NÃO entra no carrinho', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })

  it('combinação com saldo entra', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 2 })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(true)
  })

  it('linha sem preço não entra — o servidor recusaria com 422', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { price: null })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })

  it('combinação inexistente não entra', () => {
    const product = grid({ variants: [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' })] })
    expect(canAddSelection(product, { Tamanho: '5,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })
})

/** As três faixas, lidas da fonte — nomeá-las à mão criaria um segundo dono do mesmo número. */
const [VAGAS_2, VAGAS_3, VAGAS_4] = COLOR_SLOT_TIERS.map(t => t.slots)

// COR-10..COR-16 — a regra pura da fileira de cor do card. Quem a desenha é `ui/ColorPreview.tsx`, e
// a prova de superfície está em `ui/__tests__/ProductCardSurface.test.tsx`.

/** Uma peça com eixo de cor de verdade: as três cores mais comuns do catálogo importado. */
const cores = (values: string[], position = 0): ProductOption => option('Cor', values, position)

const comCor = (values: string[], over: Partial<GridProduct> = {}): GridProduct => ({
  options: [cores(values)],
  variants: values.map(v => variant({ Cor: v }, { image_url: `${v}.webp` })),
  stock_policy: 'track',
  ...over,
})

describe('colorAxis — qual eixo é o de cor (COR-10)', () => {
  it('acha o eixo `Cor` entre os outros do produto', () => {
    expect(
      colorAxis([option('Modelo', ['Coração'], 0), cores(['Prata 925', 'Folheado a Ouro'], 1)])?.name,
    ).toBe('Cor')
  })

  it('produto sem eixo de cor devolve null', () => {
    expect(colorAxis([option('Tamanho', ['45 cm'], 0), option('Modelo', ['Gota'], 1)])).toBeNull()
  })

  it('o casamento é exato — `Cor do quadrinho` NÃO é o eixo de cor da peça', () => {
    // Quatro produtos do catálogo têm esse eixo, e ele é a cor de um acessório. Casar por prefixo
    // os arrastaria para a placa sem ninguém decidir isso.
    expect(colorAxis([option('Cor do quadrinho', ['Preto', 'Branco'], 0)])).toBeNull()
  })

  it('o nome vem digitado à mão no painel, então caixa e espaço não decidem nada', () => {
    expect(colorAxis([option(' COR ', ['Prata 925', 'Folheado a Ouro'], 0)])?.name).toBe(' COR ')
  })
})

describe('colorPreview — quando NÃO há placa (COR-10)', () => {
  it('eixo de cor com um valor só: sem placa — não há escolha a mostrar', () => {
    expect(colorPreview(comCor(['Prata 925']), {}, VAGAS_4)).toBeNull()
  })

  it('produto sem grade vendável: sem placa', () => {
    expect(
      colorPreview({ options: [], variants: [], stock_policy: 'track' }, {}, VAGAS_4),
    ).toBeNull()
  })

  it('produto com grade e SEM eixo de cor: sem placa', () => {
    const semCor = grid({ variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })] })
    expect(colorPreview(semCor, {}, VAGAS_4)).toBeNull()
  })
})

describe('colorPreview — quantas vagas, e o contador na última (COR-16)', () => {
  it('as faixas são 2/3/4 vagas, com piso em 162/213/264px de CARD', () => {
    // Não é preferência: `n` miniaturas medem `51n − 6` (45px do desktop + gap 6) e precisam caber
    // em `card − 66` (inset 14 + botão "+" de 38 + folga 14). Errar o piso devolve a sobreposição
    // que a medição de 2026-08-15 encontrou.
    expect(COLOR_SLOT_TIERS.map(t => [t.minCardPx, t.slots])).toEqual([
      [162, 2],
      [213, 3],
      [264, 4],
    ])
    expect(COLOR_SLOTS_MAX).toBe(4)
  })

  it('o piso é dimensionado pelo lado MAIOR da miniatura, não pelo do celular', () => {
    // A miniatura cresce por VIEWPORT e as vagas por largura de CARD — eixos diferentes. Um card de
    // 220px aparece nas duas larguras de miniatura, então dimensionar pelo lado de 40 deixaria o
    // desktop estourando exatamente onde a conta dissesse que cabe.
    expect(COLOR_THUMB_PX).toEqual({ base: 40, desktop: 45 })
    for (const { minCardPx, slots } of COLOR_SLOT_TIERS) {
      expect((COLOR_THUMB_PX.desktop + 6) * slots - 6).toBeLessThanOrEqual(minCardPx - 66)
    }
  })

  it('2 vagas: 3 cores saem como 1 miniatura e `+2` — a faixa mais estreita', () => {
    const preview = colorPreview(comCor(['Prata', 'Ouro', 'Ródio']), {}, VAGAS_2)
    expect(preview?.thumbs.map(t => t.value)).toEqual(['Prata'])
    expect(preview?.overflow).toBe(2)
  })

  it('duas cores — o mínimo que acende a placa — saem as duas, sem contador', () => {
    const preview = colorPreview(comCor(['Prata 925', 'Folheado a Ouro']), {}, VAGAS_4)
    expect(preview?.thumbs.map(t => t.value)).toEqual(['Prata 925', 'Folheado a Ouro'])
    expect(preview?.overflow).toBe(0)
  })

  it('3 cores em 3 vagas: as três aparecem e o contador não existe', () => {
    const preview = colorPreview(comCor(['Ouro', 'Ouro Branco', 'Ródio']), {}, VAGAS_3)
    expect(preview?.thumbs.map(t => t.value)).toEqual(['Ouro', 'Ouro Branco', 'Ródio'])
    expect(preview?.overflow).toBe(0)
  })

  it('5 cores em 4 vagas: 3 miniaturas e `+2` — o contador OCUPA a última vaga', () => {
    const preview = colorPreview(
      comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']),
      {},
      VAGAS_4,
    )
    expect(preview?.thumbs.map(t => t.value)).toEqual(['Prata', 'Ouro', 'Ouro Branco'])
    expect(preview?.overflow).toBe(2)
  })

  it('4 cores em 3 vagas: 2 miniaturas e `+2` — a mesma peça encolhe no celular', () => {
    const preview = colorPreview(
      comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio']),
      {},
      VAGAS_3,
    )
    expect(preview?.thumbs.map(t => t.value)).toEqual(['Prata', 'Ouro'])
    expect(preview?.overflow).toBe(2)
  })
})

describe('colorPreview — a foto de cada cor (COR-15)', () => {
  it('cada vaga traz a foto da SUA cor', () => {
    const preview = colorPreview(comCor(['Prata', 'Ouro']), {}, VAGAS_4)
    expect(preview?.thumbs.map(t => t.imageUrl)).toEqual(['Prata.webp', 'Ouro.webp'])
  })

  it('cor sem foto vem com `imageUrl` null — nunca a foto de outra cor', () => {
    // 193 das 3.245 variações do catálogo real não têm foto: é caminho normal, não borda.
    const product: GridProduct = {
      options: [cores(['Prata', 'Ouro'])],
      variants: [
        variant({ Cor: 'Prata' }, { image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro' }, { image_url: null }),
      ],
      stock_policy: 'track',
    }
    const preview = colorPreview(product, {}, VAGAS_4)

    expect(preview?.thumbs[1].imageUrl).toBeNull()
    expect(preview?.thumbs.map(t => t.imageUrl)).toEqual(['prata.webp', null])
  })

  it('com dois eixos, a foto da cor é a da primeira LINHA daquela cor que tenha foto', () => {
    // A grade repete a cor uma vez por tamanho, e nem toda linha traz foto. Parar na primeira linha
    // da cor devolveria `null` para uma cor que tem foto na linha seguinte.
    const product: GridProduct = {
      options: [cores(['Prata', 'Ouro']), option('Tamanho', ['45 cm', '50 cm'], 1)],
      variants: [
        variant({ Cor: 'Prata', Tamanho: '45 cm' }, { position: 0, image_url: null }),
        variant({ Cor: 'Prata', Tamanho: '50 cm' }, { position: 1, image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro', Tamanho: '45 cm' }, { position: 2, image_url: 'ouro.webp' }),
      ],
      stock_policy: 'track',
    }

    expect(colorPreview(product, {}, VAGAS_4)?.thumbs.map(t => t.imageUrl)).toEqual([
      'prata.webp',
      'ouro.webp',
    ])
  })
})

describe('colorPreview — a cor escolhida (COR-14)', () => {
  it('a vaga da cor em `selected` vem `active`, e só ela', () => {
    const preview = colorPreview(
      comCor(['Prata', 'Ouro', 'Ródio']),
      { Cor: 'Ouro' },
      VAGAS_4,
    )
    expect(preview?.thumbs.map(t => t.active)).toEqual([false, true, false])
  })

  it('sem cor escolhida, nenhuma vaga fica ativa', () => {
    const preview = colorPreview(comCor(['Prata', 'Ouro']), {}, VAGAS_4)
    expect(preview?.thumbs.map(t => t.active)).toEqual([false, false])
  })
})
