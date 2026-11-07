import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { buildOrderPayload, type OrderPayloadInput } from '../buildOrderPayload'

/**
 * As chaves que a loja manda no corpo do pedido × as colunas de `orders` que o `create-order` grava.
 *
 * Irmão de `chavesDoItemDoPedido.test.ts`, um nível acima: a function copia para `orders` só o que
 * está em `COLUNAS_DO_PEDIDO`. Uma chave nova na loja que a function não lista é DESCARTE SILENCIOSO
 * — o desconto casado que a tela mostrou nunca chegaria ao pedido, e a guarda do `create-payment`
 * mediria contra zero. Uma coluna listada que a loja nunca manda é lista morta.
 *
 * Fora da comparação, por construção: `items` (gravado em `order_items`, pelo guarda irmão) e os três
 * campos do GA (`idsDaMedicao`, que valida antes de gravar). `customer_id` e `client_request_id` não
 * são montados aqui — a `CheckoutPage` os acrescenta.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../../..')
const fonte = readFileSync(resolve(ROOT, 'supabase/functions/checkout/handlers.ts'), 'utf8')

const listaDe = (texto: string, nome: string): string[] | null => {
  const m = new RegExp(`const\\s+${nome}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`).exec(texto)
  if (!m) return null
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort()
}

const entrada = {
  items: [],
  pricingItems: [],
  bump: { enabled: false } as never,
  bumpProduct: null,
  lines: [],
  contact: { name: 'Marina', email: 'marina@exemplo.com', whatsapp: '11988887777' },
  address: { cep: '01310100', street: 'Rua', number: '1', complement: '', neighborhood: 'B', city: 'C', state: 'SP' },
  shipping: { serviceId: '1', serviceName: 'PAC', carrier: 'Correios', estimateMin: '', estimateMax: '' },
  paymentMethod: 'pix',
  payerDocument: '52998224725',
  totals: { subtotal: 10, couponDiscount: 0, shipping: 0, total: 10 },
  coupon: null,
  applied: [],
  promotionDiscount: 0,
  buyTogetherDiscount: 0,
  orderBumpDiscount: 0,
  materialStatus: 'nao_aplicavel',
} as OrderPayloadInput

const chavesDaLoja = (): string[] =>
  Object.keys(buildOrderPayload(entrada))
    .filter((k) => k !== 'items')
    .sort()

describe('as chaves do corpo do pedido batem com as colunas de `orders` do create-order', () => {
  it('âncora: a function foi lida e a lista tem as 28 colunas, com os três descontos por item', () => {
    expect(fonte).toContain('export async function createOrder')
    const colunas = listaDe(fonte, 'COLUNAS_DO_PEDIDO')
    expect(colunas).toHaveLength(28)
    expect(colunas).toEqual(
      expect.arrayContaining(['promotion_discount', 'buy_together_discount', 'order_bump_discount']),
    )
  })

  it('o corpo que a loja monta tem EXATAMENTE as colunas que a function grava, nos dois sentidos', () => {
    expect(chavesDaLoja()).toEqual(listaDe(fonte, 'COLUNAS_DO_PEDIDO'))
  })

  it('sensor — uma coluna a menos na function reprova (o desconto da loja seria descartado)', () => {
    const mutante = fonte.replace("  'buy_together_discount',\n", '')
    expect(mutante).not.toBe(fonte)
    expect(chavesDaLoja()).not.toEqual(listaDe(mutante, 'COLUNAS_DO_PEDIDO'))
  })

  it('sensor — uma coluna a mais na function reprova (lista morta)', () => {
    const mutante = fonte.replace("  'order_bump_discount',\n", "  'order_bump_discount',\n  'coluna_inventada',\n")
    expect(mutante).not.toBe(fonte)
    expect(chavesDaLoja()).not.toEqual(listaDe(mutante, 'COLUNAS_DO_PEDIDO'))
  })

  it('sensor — a constante renomeada reprova, em vez de virar lista vazia', () => {
    const mutante = fonte.replace('const COLUNAS_DO_PEDIDO', 'const OUTRA_LISTA')
    expect(listaDe(mutante, 'COLUNAS_DO_PEDIDO')).toBeNull()
  })
})
