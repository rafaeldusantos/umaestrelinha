import { describe, expect, it } from 'vitest'
import { PRODUCT_COVER_COLUMNS } from '../useProductCovers'

// A régua da capa (galeria → coluna antiga → nada) mora com o dono, em
// `packages/core/src/proposals/__tests__/photo.test.ts`; o reexporte é provado por identidade em
// `app/__tests__/regrasDaMontagemNoCore.test.ts`.

describe('useProductCovers — a capa da peça', () => {
  it('pede só a primeira URL da galeria, nunca o jsonb inteiro', () => {
    expect(PRODUCT_COVER_COLUMNS).toBe('id, image_url, capa:images->0->>url')
    expect(PRODUCT_COVER_COLUMNS).not.toMatch(/(^|[ ,])images([ ,]|$)/)
  })
})
