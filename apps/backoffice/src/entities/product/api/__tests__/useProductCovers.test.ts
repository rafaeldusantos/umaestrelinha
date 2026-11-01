import { describe, expect, it } from 'vitest'
import { PRODUCT_COVER_COLUMNS, capaDaLinha } from '../useProductCovers'

describe('useProductCovers — a capa da peça', () => {
  it('pede só a primeira URL da galeria, nunca o jsonb inteiro', () => {
    expect(PRODUCT_COVER_COLUMNS).toBe('id, image_url, capa:images->0->>url')
    expect(PRODUCT_COVER_COLUMNS).not.toMatch(/(^|[ ,])images([ ,]|$)/)
  })

  it('a capa é a primeira da galeria; sem ela, a coluna antiga; sem as duas, nada', () => {
    expect(capaDaLinha({ capa: 'g.webp', image_url: 'antiga.jpg' })).toBe('g.webp')
    expect(capaDaLinha({ capa: null, image_url: 'antiga.jpg' })).toBe('antiga.jpg')
    expect(capaDaLinha({ capa: '  ', image_url: '' })).toBeNull()
    expect(capaDaLinha({ capa: null, image_url: null })).toBeNull()
  })
})
