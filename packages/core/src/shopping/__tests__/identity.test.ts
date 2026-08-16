import { describe, expect, it } from 'vitest'
import { publicProductId, publicVariantId } from '../identity'

/**
 * `GSH-01` (AC 2) e `GSH-02` (AC 3) — a identidade pública, que é o que preserva a indexação.
 *
 * O caso `1259936246` / `281745761` **não é inventado**: é uma oferta viva da conta Merchant Center
 * `685367464`, medida em 2026-08-16 pela URL
 * `merchants.google.com/mc/directoffers/edit?a=685367464&offerId=1259936246`, e conferida contra o
 * banco local — `product_variants.nuvemshop_id = 1259936246`, produto `nuvemshop_id = 281745761`,
 * slug `pulseira-7-nos-ajustavel-protecao-kabbalah`, `option_values {"Tamanho":"G"}`, R$ 19,90.
 *
 * Se estas asserções mudarem de valor, 3.233 ofertas viram catálogo novo no dia do cutover.
 */

const UUID_VARIACAO = 'dd0e2171-4d3d-4e20-a868-21e5223bd917'
const UUID_PRODUTO = '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93'

describe('publicVariantId — GSH-01 AC 2', () => {
  it('devolve o nuvemshop_id em decimal quando a variação veio do import', () => {
    expect(publicVariantId({ id: UUID_VARIACAO, nuvemshop_id: 1259936246 })).toBe('1259936246')
  })

  it('não prefixa nada — o Merchant Center indexou o número nu', () => {
    const id = publicVariantId({ id: UUID_VARIACAO, nuvemshop_id: 1259936246 })
    expect(id).not.toMatch(/[^0-9]/)
  })

  it('devolve o UUID quando nuvemshop_id é null (linha criada no admin)', () => {
    expect(publicVariantId({ id: UUID_VARIACAO, nuvemshop_id: null })).toBe(UUID_VARIACAO)
  })

  it('devolve o UUID quando o campo nem existe no objeto lido', () => {
    expect(publicVariantId({ id: UUID_VARIACAO })).toBe(UUID_VARIACAO)
  })

  it('emite DECIMAL, nunca notação científica — id grande vira oferta órfã em silêncio', () => {
    expect(publicVariantId({ id: UUID_VARIACAO, nuvemshop_id: 1e21 })).toBe(
      '1000000000000000000000',
    )
  })
})

describe('publicProductId — GSH-02 AC 3', () => {
  it('devolve o nuvemshop_id do produto, que é o item_group_id da oferta medida', () => {
    expect(publicProductId({ id: UUID_PRODUTO, nuvemshop_id: 281745761 })).toBe('281745761')
  })

  it('devolve o UUID quando o produto não veio do import', () => {
    expect(publicProductId({ id: UUID_PRODUTO, nuvemshop_id: null })).toBe(UUID_PRODUTO)
  })
})

describe('a identidade é UMA — o mesmo número no g:id e no ?variant=', () => {
  it('produto e variação não se confundem: são ids distintos da mesma peça', () => {
    const variante = { id: UUID_VARIACAO, nuvemshop_id: 1259936246 }
    const produto = { id: UUID_PRODUTO, nuvemshop_id: 281745761 }
    expect(publicVariantId(variante)).not.toBe(publicProductId(produto))
  })
})
