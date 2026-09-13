import { describe, expect, it } from 'vitest'
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

const entrada = (over: Partial<OrderPayloadInput> = {}): OrderPayloadInput =>
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

describe('buildOrderPayload — o corpo do pedido', () => {
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
