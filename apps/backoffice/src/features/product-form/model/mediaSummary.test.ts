// RES-03, RES-04, RES-09, ZOM-04 — o recorte das imagens do Resumo.
//
// Os números vêm da spec (`no máximo 7`, `N = total − 8`, `mais de 48px`). O teste lê a constante
// E crava o literal: só a constante mediria o código contra ele mesmo.

import { describe, expect, it } from 'vitest'
import type { ProductImage } from '@estrelinha/supabase/types'
import { SUMMARY_THUMB_LIMIT, SWIPE_PX, summaryThumbs } from './mediaSummary'

const images = (n: number): ProductImage[] =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://cdn/foto-${i + 1}.webp`,
    alt: null,
    source: 'upload' as const,
  }))

describe('constantes da spec', () => {
  it('RES-04: no máximo 7 miniaturas; ZOM-04: o gesto troca acima de 48px', () => {
    expect(SUMMARY_THUMB_LIMIT).toBe(7)
    expect(SWIPE_PX).toBe(48)
  })
})

describe('summaryThumbs', () => {
  it.each([
    // total, miniaturas, rest
    [0, 0, 0],
    [1, 0, 0],
    [2, 1, 0],
    [8, 7, 0],
    [9, 7, 1],
    [28, 7, 20],
  ])('%i imagens ⇒ %i miniaturas e "+%i"', (total, thumbs, rest) => {
    const list = images(total)
    const result = summaryThumbs(list)
    expect(result.main).toBe(total === 0 ? null : list[0])
    expect(result.thumbs).toHaveLength(thumbs)
    expect(result.thumbs.length).toBeLessThanOrEqual(SUMMARY_THUMB_LIMIT)
    expect(result.rest).toBe(rest)
  })

  it('RES-04: as miniaturas são as imagens 2 a 8, na ordem', () => {
    const list = images(28)
    expect(summaryThumbs(list).thumbs.map(i => i.url)).toEqual(
      list.slice(1, 8).map(i => i.url),
    )
  })

  it('RES-09: o "+N" começa na 9ª imagem (rest = total − 8)', () => {
    const list = images(12)
    const { thumbs, rest } = summaryThumbs(list)
    expect(1 + thumbs.length + rest).toBe(12)
    expect(rest).toBe(12 - 8)
  })
})
