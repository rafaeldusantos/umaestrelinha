import { describe, expect, it } from 'vitest'
import { initialMaterialStatus } from '@estrelinha/core/material'
import { buildOrderItems, buildOrderPayload, type OrderPayloadInput } from '../buildOrderPayload'

/**
 * A montagem do pedido, agora fora do CTA (feature `49`, T10).
 *
 * Nenhuma regra mudou de lugar — estes casos existem porque, **dentro** de `handleConfirm`, nada
 * disso era exercível sem montar a página inteira, tokenizar um cartão e mockar o client. A feature
 * troca o caminho de gravação exatamente aqui; o que já estava certo precisa continuar certo.
 */

const produto = (over: Record<string, unknown> = {}) =>
  ({
    id: 'prod-1',
    name: 'Joia com cinzas',
    images: [{ url: 'https://cdn.test/joia.jpg', is_primary: true }],
    requires_material: true,
    material_kinds: ['cinzas'],
    ...over,
  }) as never

const item = (over: Record<string, unknown> = {}) =>
  ({
    product: produto(),
    size: '',
    finish: '',
    variantId: null,
    variantLabel: '',
    optionValues: {},
    unitPrice: 100,
    quantity: 1,
    engravingText: null,
    ...over,
  }) as never

/** Uma linha do pedido por item da entrada, ao preço da entrada (sem desconto nenhum). */
const linhasDe = (pricingItems: { unit_price: number; quantity: number }[]) =>
  pricingItems.map((p, index) => ({
    index,
    quantity: p.quantity,
    fullUnitPrice: p.unit_price,
    unitPrice: p.unit_price,
  }))

const entrada = (over: Partial<OrderPayloadInput> = {}): OrderPayloadInput => {
  const pricingItems = over.pricingItems ?? [{ product_id: 'prod-1', unit_price: 100, quantity: 1 }]
  return montar({ lines: linhasDe(pricingItems), ...over })
}

const montar = (over: Partial<OrderPayloadInput> = {}): OrderPayloadInput =>
  ({
    items: [item()],
    pricingItems: [{ product_id: 'prod-1', unit_price: 100, quantity: 1 }],
    bump: { enabled: false } as never,
    bumpProduct: null,
    contact: { name: 'Marina Yamashita', email: 'marina@exemplo.com', whatsapp: '11988887777' },
    address: {
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 12',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    shipping: {
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      estimateMin: '2026-09-20',
      estimateMax: '2026-09-24',
    },
    paymentMethod: 'pix',
    payerDocument: '529.982.247-25',
    totals: { subtotal: 100, couponDiscount: 0, shipping: 10, total: 110 },
    coupon: null,
    applied: [],
    promotionDiscount: 0,
    buyTogetherDiscount: 0,
    orderBumpDiscount: 0,
    materialStatus: 'aguardando_material',
    ...over,
  }) as OrderPayloadInput

describe('buildOrderItems — o snapshot do item (PST-03, MAT-05)', () => {
  it('item sem variação congela `price_source: base` e `variant_id: null`', () => {
    const [linha] = buildOrderItems(entrada())

    expect(linha.price_source).toBe('base')
    expect(linha.variant_id).toBeNull()
  })

  it('item COM variação congela `price_source: variant` e o rótulo legível', () => {
    // O par inverso. Sem ele, uma implementação que devolvesse sempre `base` passaria no primeiro.
    const [linha] = buildOrderItems(
      entrada({
        items: [item({ variantId: 'var-9', variantLabel: '4,5 cm · Fosco' })],
      }),
    )

    expect(linha.price_source).toBe('variant')
    expect(linha.variant_id).toBe('var-9')
    expect(linha.variant_label).toBe('4,5 cm · Fosco')
  })

  it('o material sai do snapshot do CARRINHO, nunca de releitura do catálogo (MAT-05)', () => {
    const [linha] = buildOrderItems(entrada())

    expect(linha.requires_material).toBe(true)
    expect(linha.material_kinds).toEqual(['cinzas'])
  })

  it('produto sem material entra com a exigência em falso', () => {
    const [linha] = buildOrderItems(
      entrada({
        items: [item({ product: produto({ requires_material: false, material_kinds: [] }) })],
      }),
    )

    expect(linha.requires_material).toBe(false)
    expect(linha.material_kinds).toEqual([])
  })

  it('`variant_options` vazio vira `null`, não um objeto vazio', () => {
    const [semOpcoes] = buildOrderItems(entrada())
    const [comOpcoes] = buildOrderItems(
      entrada({ items: [item({ optionValues: { Tamanho: 'P' } })] }),
    )

    expect(semOpcoes.variant_options).toBeNull()
    expect(comOpcoes.variant_options).toEqual({ Tamanho: 'P' })
  })

  it('a imagem é a PRIMÁRIA do produto', () => {
    const [linha] = buildOrderItems(entrada())

    expect(linha.product_image).toBe('https://cdn.test/joia.jpg')
  })
})

describe('buildOrderItems — o order bump (BMP-03)', () => {
  const comBump = () =>
    entrada({
      bumpProduct: produto({ id: 'bump-1', name: 'Porta-joias', images: [] }) as never,
      pricingItems: [
        { product_id: 'prod-1', unit_price: 100, quantity: 1 },
        { product_id: 'bump-1', unit_price: 40, quantity: 1 },
      ],
      bump: { enabled: true, product_id: 'bump-1', discount_percent: 50 } as never,
    })

  it('o bump entra como última linha, com quantidade 1', () => {
    const linhas = buildOrderItems(comBump())

    expect(linhas).toHaveLength(2)
    expect(linhas[1].product_id).toBe('bump-1')
    expect(linhas[1].quantity).toBe(1)
  })

  it('o bump nunca é peça de material, nem linha de grade', () => {
    // Declarado no código-fonte original para não passar batido: a oferta do lojista aponta para um
    // `product_id` avulso, fora do fluxo de curadoria.
    const [, bump] = buildOrderItems(comBump())

    expect(bump.requires_material).toBe(false)
    expect(bump.material_kinds).toEqual([])
    expect(bump.variant_id).toBeNull()
    expect(bump.price_source).toBe('base')
  })

  it('sem bump marcado, nenhuma linha extra aparece', () => {
    expect(buildOrderItems(entrada())).toHaveLength(1)
  })
})

describe('buildOrderItems — a marca "acompanha" do Compre Junto', () => {
  const LISTA = '7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b'
  const principal = item({ product: produto({ id: 'joia', name: 'Pingente', requires_material: false, material_kinds: [] }) })
  const adicional = (accompanies: unknown, over: Record<string, unknown> = {}) =>
    item({
      product: produto({ id: 'corrente', name: 'Corrente', requires_material: false, material_kinds: [] }),
      accompanies,
      ...over,
    })
  const conjunto = (items: unknown[]) =>
    entrada({
      items: items as never,
      pricingItems: items.map(() => ({ product_id: 'x', unit_price: 100, quantity: 1 })),
    })

  it('leva o principal e a lista da linha adicional ao payload; o principal vai sem marca', () => {
    const [p, a] = buildOrderItems(conjunto([principal, adicional([{ mainProductId: 'joia', listId: LISTA }])]))

    expect(a.accompanies_product_ids).toEqual(['joia'])
    expect(a.accompanies_list_ids).toEqual([LISTA])
    expect(p.accompanies_product_ids).toBeNull()
    expect(p.accompanies_list_ids).toBeNull()
  })

  it('a linha que acompanha dois principais leva os dois, alinhados com as listas', () => {
    const anel = item({ product: produto({ id: 'anel', name: 'Anel', requires_material: false, material_kinds: [] }) })
    const [, , a] = buildOrderItems(
      conjunto([
        principal,
        anel,
        adicional([
          { mainProductId: 'joia', listId: LISTA },
          { mainProductId: 'anel', listId: null },
        ]),
      ]),
    )

    expect(a.accompanies_product_ids).toEqual(['joia', 'anel'])
    expect(a.accompanies_list_ids).toEqual([LISTA, null])
  })

  it('a peça avulsa leva a lista nula', () => {
    const [, a] = buildOrderItems(conjunto([principal, adicional([{ mainProductId: 'joia', listId: null }])]))

    expect(a.accompanies_product_ids).toEqual(['joia'])
    expect(a.accompanies_list_ids).toEqual([null])
  })

  it('o principal que saiu da sacola não vai: a linha segue como peça comum', () => {
    const [a] = buildOrderItems(conjunto([adicional([{ mainProductId: 'joia', listId: LISTA }])]))

    expect(a.accompanies_product_ids).toBeNull()
    expect(a.accompanies_list_ids).toBeNull()
  })

  it('a marca não muda o preço da linha', () => {
    const semMarca = buildOrderItems(conjunto([principal, adicional(undefined)]))
    const comMarca = buildOrderItems(conjunto([principal, adicional([{ mainProductId: 'joia', listId: LISTA }])]))

    expect(comMarca[1].unit_price).toBe(semMarca[1].unit_price)
    expect(comMarca[1].price_source).toBe(semMarca[1].price_source)
  })

  it('o item do bump vai sem marca', () => {
    const linhas = buildOrderItems(
      entrada({
        items: [principal, adicional([{ mainProductId: 'joia', listId: LISTA }])] as never,
        bumpProduct: produto({ id: 'bump-1', name: 'Porta-joias', images: [] }) as never,
        pricingItems: [
          { product_id: 'joia', unit_price: 100, quantity: 1 },
          { product_id: 'corrente', unit_price: 50, quantity: 1 },
          { product_id: 'bump-1', unit_price: 40, quantity: 1 },
        ],
        bump: { enabled: true, product_id: 'bump-1', discount_percent: 50 } as never,
      }),
    )

    expect(linhas[2].product_id).toBe('bump-1')
    expect(linhas[2].accompanies_product_ids).toBeNull()
    expect(linhas[2].accompanies_list_ids).toBeNull()
  })

  it('o pedido do conjunto entra na fila de material se QUALQUER peça exige material — inclusive só o adicional', () => {
    const exige = item({
      product: produto({ id: 'pingente-cinzas', requires_material: true, material_kinds: ['cinzas'] }),
      accompanies: [{ mainProductId: 'joia', listId: null }],
    })
    const linhas = buildOrderItems(conjunto([principal, exige]))

    expect(initialMaterialStatus(linhas)).toBe('aguardando_material')
    expect(initialMaterialStatus(buildOrderItems(conjunto([principal, adicional(undefined)])))).toBe('nao_aplicavel')
  })
})

describe('buildOrderItems — o preço cheio e o cobrado de cada linha (desconto casado, bump, promoção)', () => {
  const principal = item({ product: produto({ id: 'joia', name: 'Pingente', requires_material: false, material_kinds: [] }), unitPrice: 300 })
  const correntes = item({
    product: produto({ id: 'corrente', name: 'Corrente', requires_material: false, material_kinds: [] }),
    unitPrice: 79,
    quantity: 2,
    accompanies: [{ mainProductId: 'joia', listId: null }],
  })

  it('a linha mista vira duas linhas: as unidades com o desconto casado e as a preço cheio', () => {
    const linhas = buildOrderItems(
      montar({
        items: [principal, correntes] as never,
        lines: [
          { index: 0, quantity: 1, fullUnitPrice: 300, unitPrice: 300 },
          { index: 1, quantity: 1, fullUnitPrice: 79, unitPrice: 71.1 },
          { index: 1, quantity: 1, fullUnitPrice: 79, unitPrice: 75.05 },
        ],
      }),
    )

    expect(linhas.map((l) => [l.product_id, l.quantity, l.unit_price, l.full_unit_price])).toEqual([
      ['joia', 1, 300, 300],
      ['corrente', 1, 71.1, 79],
      ['corrente', 1, 75.05, 79],
    ])
    // As duas linhas da mesma peça levam a mesma marca e o mesmo snapshot.
    expect(linhas[1].accompanies_product_ids).toEqual(['joia'])
    expect(linhas[2].accompanies_product_ids).toEqual(['joia'])
    expect(linhas[2].product_name).toBe('Corrente')
  })

  it('o bump grava o cobrado e o cheio', () => {
    const linhas = buildOrderItems(
      montar({
        items: [principal] as never,
        bumpProduct: produto({ id: 'bump-1', name: 'Porta-joias', images: [] }) as never,
        lines: [
          { index: 0, quantity: 1, fullUnitPrice: 300, unitPrice: 300 },
          { index: 1, quantity: 1, fullUnitPrice: 40, unitPrice: 20 },
        ],
      }),
    )

    expect(linhas[1]).toMatchObject({ product_id: 'bump-1', quantity: 1, unit_price: 20, full_unit_price: 40 })
  })
})

describe('buildOrderPayload — o corpo do pedido', () => {
  it('leva os descontos por tipo que a tela mostrou, ao lado da promoção', () => {
    const corpo = buildOrderPayload(entrada({ promotionDiscount: 3.95, buyTogetherDiscount: 7.9, orderBumpDiscount: 20 }))

    expect(corpo.promotion_discount).toBe(3.95)
    expect(corpo.buy_together_discount).toBe(7.9)
    expect(corpo.order_bump_discount).toBe(20)
  })

  it('o CEP vai com 8 dígitos, sem máscara (ADR-05)', () => {
    // Sem isto `orders.address_zip` fica com hífen e o backoffice estoura em `MelhorEnvioTab`.
    expect(buildOrderPayload(entrada()).address_zip).toBe('01310100')
  })

  it('telefone e documento são gravados — CSC-04', () => {
    // Até a feature `49` nenhum dos dois era enviado: pedido feito na loja nascia sem telefone e
    // sem documento, e só o importador da Nuvemshop preenchia as colunas.
    const corpo = buildOrderPayload(entrada())

    expect(corpo.customer_phone).toBe('11988887777')
    expect(corpo.customer_document).toBe('529.982.247-25')
  })

  it('o telefone vai só com dígitos, sem a máscara da tela', () => {
    // O par do caso acima, que entra com dígitos crus e por isso é verdadeiro nos DOIS mundos:
    // sem ele, apagar `stripPhone` do payload deixa a suíte verde e o banco passa a guardar duas
    // grafias do mesmo telefone. `normalizeBrPhone` (o link `wa.me`) tolera as duas; `customers.phone`,
    // que o próprio checkout semeia de volta no campo, não tem por que ficar com as duas.
    const pedido = entrada()
    pedido.contact.whatsapp = '(11) 98888-7777'

    expect(buildOrderPayload(pedido).customer_phone).toBe('11988887777')
  })

  it('o envio escolhido vira snapshot (SHP-07)', () => {
    const corpo = buildOrderPayload(entrada())

    expect(corpo.shipping_carrier).toBe('Correios')
    expect(corpo.shipping_method).toBe('PAC')
    expect(corpo.delivery_estimate_min).toBe('2026-09-20')
  })

  it('sem opção de envio, os campos ficam indefinidos em vez de vazios', () => {
    const corpo = buildOrderPayload(entrada({ shipping: null }))

    expect(corpo.shipping_service_id).toBeUndefined()
    expect(corpo.delivery_estimate_min).toBeUndefined()
  })

  it('UMA promoção aplicada grava o id; duas gravam `null` (PRM-12)', () => {
    // `orders.promotion_id` é FK única e não sabe dizer "duas" — a verdade de "quanto" fica em
    // `promotion_discount`. É a mesma regra que o servidor aplica.
    const uma = buildOrderPayload(entrada({ applied: [{ promotion_id: 'promo-1' }] }))
    const duas = buildOrderPayload(
      entrada({ applied: [{ promotion_id: 'promo-1' }, { promotion_id: 'promo-2' }] }),
    )
    const nenhuma = buildOrderPayload(entrada())

    expect(uma.promotion_id).toBe('promo-1')
    expect(duas.promotion_id).toBeNull()
    expect(nenhuma.promotion_id).toBeNull()
  })

  it('sem método escolhido, o pedido nasce como PIX', () => {
    expect(buildOrderPayload(entrada({ paymentMethod: null })).payment_method).toBe('pix')
  })

  it('o cupom aplicado vai com código e id', () => {
    const corpo = buildOrderPayload(entrada({ coupon: { id: 'cup-1', code: 'ESTRELA10' } }))

    expect(corpo.coupon_code).toBe('ESTRELA10')
    expect(corpo.coupon_id).toBe('cup-1')
  })

  it('o corpo carrega os itens montados', () => {
    expect(buildOrderPayload(entrada()).items).toHaveLength(1)
  })
})

// Feature 63 — o pedido de retirada no escritório (RET-07). Nenhum código novo no montador: o
// rascunho da retirada já carrega o que o pedido precisa, e estes casos fixam isso.
describe('buildOrderPayload — pedido de retirada (RET-07)', () => {
  const retirada = () =>
    buildOrderPayload(
      entrada({
        address: {
          cep: '91240-010',
          street: 'Rua Coronel Bordini',
          number: '120',
          complement: 'Casa 2',
          neighborhood: 'Auxiliadora',
          city: 'Porto Alegre',
          state: 'RS',
        },
        shipping: {
          serviceId: 'retirada',
          serviceName: 'Retirada no escritório',
          carrier: 'Uma Estrelinha',
          estimateMin: '',
          estimateMax: '',
        },
        totals: { subtotal: 100, couponDiscount: 0, shipping: 0, total: 100 },
      }),
    )

  it("grava `shipping_service_id: 'retirada'`, o método e frete zero", () => {
    const corpo = retirada()

    expect(corpo.shipping_service_id).toBe('retirada')
    expect(corpo.shipping_method).toBe('Retirada no escritório')
    expect(corpo.shipping_carrier).toBe('Uma Estrelinha')
    expect(corpo.shipping_cost).toBe(0)
    expect(corpo.total).toBe(100)
  })

  it('não leva prazo de transportadora: as duas datas ficam AUSENTES, não vazias', () => {
    const corpo = retirada()

    expect(corpo.delivery_estimate_min).toBeUndefined()
    expect(corpo.delivery_estimate_max).toBeUndefined()
  })

  it('o endereço da cliente continua no pedido (RET-09)', () => {
    const corpo = retirada()

    expect(corpo.address_street).toBe('Rua Coronel Bordini')
    expect(corpo.address_number).toBe('120')
    expect(corpo.address_complement).toBe('Casa 2')
    expect(corpo.address_zip).toBe('91240010')
    expect(corpo.address_city).toBe('Porto Alegre')
  })
})
