import { describe, expect, it } from 'vitest'
import {
  buildPurchaseBody,
  measurementProtocolUrl,
  purchaseDecision,
  syntheticClientId,
  type PurchaseDecision,
} from '../purchase.ts'

// CMP-02, CMP-04..06, CMP-08 — a compra que o servidor envia.

const LIGADO = { enabled: true, measurement_id: 'G-SQL517XDQZ' }
const DESLIGADO = { enabled: false, measurement_id: 'G-SQL517XDQZ' }

describe('purchaseDecision — a tabela completa', () => {
  const casos: [string, Parameters<typeof purchaseDecision>[0], PurchaseDecision][] = [
    ['ligado + chave + sem recusa', { settings: LIGADO, apiSecret: 'abc', declined: false }, 'send'],
    ['ligado + chave + recusou (CMP-04)', { settings: LIGADO, apiSecret: 'abc', declined: true }, 'skipped_declined'],
    ['desligado (CMP-06)', { settings: DESLIGADO, apiSecret: 'abc', declined: false }, 'skipped_disabled'],
    ['desligado E recusou — o motivo é o desligado', { settings: DESLIGADO, apiSecret: 'abc', declined: true }, 'skipped_disabled'],
    ['sem chave (CMP-06)', { settings: LIGADO, apiSecret: null, declined: false }, 'skipped_disabled'],
    ['chave só de espaço', { settings: LIGADO, apiSecret: '   ', declined: false }, 'skipped_disabled'],
    ['sem chave E recusou', { settings: LIGADO, apiSecret: undefined, declined: true }, 'skipped_disabled'],
    ['ID inválido', { settings: { enabled: true, measurement_id: 'GTM-K5N4XKF' }, apiSecret: 'abc', declined: false }, 'skipped_disabled'],
    ['configuração ausente (leitura falhou)', { settings: null, apiSecret: 'abc', declined: false }, 'skipped_disabled'],
  ]

  it.each(casos)('%s', (_rotulo, entrada, esperado) => {
    expect(purchaseDecision(entrada)).toBe(esperado)
  })

  it('os valores casam com o check da migration (sending/sent/failed são do servidor, não da decisão)', () => {
    const saidas = new Set(casos.map(([, e]) => purchaseDecision(e)))
    expect([...saidas].sort()).toEqual(['send', 'skipped_declined', 'skipped_disabled'])
  })
})

describe('syntheticClientId (CMP-05)', () => {
  it('é determinístico — o mesmo pedido produz o mesmo id', () => {
    const id = 'a3f1c2d4-0000-4000-8000-000000000042'
    expect(syntheticClientId(id)).toBe(syntheticClientId(id))
  })

  it('tem o formato do cookie _ga: <int>.<int>, sem zero', () => {
    for (const id of ['a', 'pedido-1', 'a3f1c2d4-0000-4000-8000-000000000042', '']) {
      const cid = syntheticClientId(id)
      expect(cid).toMatch(/^[1-9]\d*\.[1-9]\d*$/)
    }
  })

  it('pedidos diferentes produzem ids diferentes', () => {
    const ids = new Set(Array.from({ length: 200 }, (_, i) => syntheticClientId(`pedido-${i}`)))
    expect(ids.size).toBe(200)
  })
})

const PEDIDO = {
  id: 'a3f1c2d4-0000-4000-8000-000000000042',
  order_number: '0244',
  total: 349.8,
  shipping_cost: 24.9,
  discount: 15,
  coupon_code: 'AMOR10',
}
const ITENS = [
  { id: 'uuid-a', nuvemshop_id: 111, name: 'Pingente A', category: 'Pingentes', variant: 'Prata', price: 169.95, quantity: 2 },
]
const IDS = { clientId: '123456.789012', sessionId: '1728000000', storeHost: 'umaestrelinha.com.br', productionHost: 'umaestrelinha.com.br' }

describe('buildPurchaseBody (CMP-02)', () => {
  it('o corpo completo, campo a campo', () => {
    expect(buildPurchaseBody(PEDIDO, ITENS, IDS)).toEqual({
      client_id: '123456.789012',
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: '0244',
            value: 349.8,
            currency: 'BRL',
            shipping: 24.9,
            discount: 15,
            coupon: 'AMOR10',
            session_id: '1728000000',
            items: [
              {
                item_id: '111',
                item_name: 'Pingente A',
                item_brand: 'Uma Estrelinha',
                item_category: 'Pingentes',
                item_variant: 'Prata',
                price: 169.95,
                quantity: 2,
              },
            ],
          },
        },
      ],
    })
  })

  it('transaction_id é o order_number CRU, inclusive o legado', () => {
    expect(buildPurchaseBody(PEDIDO, ITENS, IDS).events[0].params.transaction_id).toBe('0244')
    expect(buildPurchaseBody({ ...PEDIDO, order_number: 'NS-169' }, ITENS, IDS).events[0].params.transaction_id).toBe('NS-169')
  })

  it('transaction_id NUNCA começa com # — o prefixo é apresentação, não chave', () => {
    // Recusa a volta de `formatOrderNumber` aqui: com ele, o GA4 guardaria `#0244` e o cruzamento
    // com `orders.order_number` exigiria tirar o prefixo em toda consulta.
    for (const numero of ['0244', 'NS-169', '0001']) {
      const id = buildPurchaseBody({ ...PEDIDO, order_number: numero }, ITENS, IDS).events[0].params.transaction_id
      expect(id.startsWith('#')).toBe(false)
      expect(id).toBe(numero)
    }
  })

  it('sem cupom e sem desconto, as chaves não aparecem', () => {
    const p = buildPurchaseBody({ ...PEDIDO, coupon_code: null, discount: 0 }, ITENS, IDS).events[0].params
    expect(p).not.toHaveProperty('coupon')
    expect(p).not.toHaveProperty('discount')
  })

  it('session_id só quando existe', () => {
    const p = buildPurchaseBody(PEDIDO, ITENS, { ...IDS, sessionId: null }).events[0].params
    expect(p).not.toHaveProperty('session_id')
  })

  it('CMP-05: sem client_id, usa o sintético DERIVADO DO PEDIDO', () => {
    expect(buildPurchaseBody(PEDIDO, ITENS, { ...IDS, clientId: null }).client_id).toBe(syntheticClientId(PEDIDO.id))
    expect(buildPurchaseBody(PEDIDO, ITENS, { ...IDS, clientId: '  ' }).client_id).toBe(syntheticClientId(PEDIDO.id))
  })

  it('CMP-08: traffic_type=internal SÓ em host interno', () => {
    expect(buildPurchaseBody(PEDIDO, ITENS, IDS).events[0].params).not.toHaveProperty('traffic_type')
    const homolog = buildPurchaseBody(PEDIDO, ITENS, { ...IDS, storeHost: 'umaestrelinha-store-five.vercel.app' })
    expect(homolog.events[0].params.traffic_type).toBe('internal')
  })

  it('EVT-14: nada de dado pessoal no corpo, mesmo com o pedido inteiro passado', () => {
    const pedidoInteiro = {
      ...PEDIDO,
      customer_name: 'Maria da Silva',
      customer_email: 'maria@exemplo.invalid',
      customer_phone: '51999990000',
      customer_document: '11111111111',
      address_street: 'Rua das Flores',
    }
    const itemComGravacao = { ...ITENS[0], engraving_text: 'Para sempre, Ana' }
    const corpo = JSON.stringify(
      buildPurchaseBody(
        pedidoInteiro,
        [itemComGravacao] as unknown as Parameters<typeof buildPurchaseBody>[1],
        IDS,
      ),
    )
    for (const proibido of ['Maria', 'maria@', '51999990000', '11111111111', 'Flores', 'Para sempre']) {
      expect(corpo).not.toContain(proibido)
    }
  })
})

describe('measurementProtocolUrl', () => {
  it('monta a URL do /mp/collect com ID normalizado e a chave codificada', () => {
    expect(measurementProtocolUrl(' g-sql517xdqz ', 'a b&c')).toBe(
      'https://www.google-analytics.com/mp/collect?measurement_id=G-SQL517XDQZ&api_secret=a%20b%26c',
    )
  })
})
