import { describe, expect, it } from 'vitest'
import { toImagePayload } from './imagePayload'
import type { ProductImage } from '@nanapin/supabase/types'

// VAR-11 AC 4: "o payload de `images` SHALL ser `jsonb` — SHALL não gravar `string[]` de volta".

const meta = (...images: ProductImage[]) => new Map(images.map(i => [i.url, i]))

describe('toImagePayload — VAR-11 AC 4', () => {
  it('grava objeto, nunca string, para URL que o formulário nunca viu antes', () => {
    expect(toImagePayload(['a.webp'], meta())).toEqual([
      { url: 'a.webp', alt: null, source: 'upload' },
    ])
  })

  it('preserva o alt cadastrado — um save que não tocou em imagem não pode zerá-lo', () => {
    const payload = toImagePayload(
      ['a.webp'],
      meta({ url: 'a.webp', alt: 'Botton Sailor Moon — Lua Prateada', source: 'upload' }),
    )
    expect(payload[0].alt).toBe('Botton Sailor Moon — Lua Prateada')
  })

  it('preserva a origem mockup — é o que alimenta o selo da galeria', () => {
    const payload = toImagePayload(
      ['render.webp'],
      meta({ url: 'render.webp', alt: null, source: 'mockup' }),
    )
    expect(payload[0].source).toBe('mockup')
  })

  it('a ordem é a da lista de URLs, não a do mapa — a primeira imagem é a principal', () => {
    const payload = toImagePayload(
      ['b.webp', 'a.webp'],
      meta(
        { url: 'a.webp', alt: 'primeira cadastrada', source: 'upload' },
        { url: 'b.webp', alt: 'segunda cadastrada', source: 'mockup' },
      ),
    )
    expect(payload.map(i => i.url)).toEqual(['b.webp', 'a.webp'])
  })

  it('URL removida da lista sai do payload, mesmo continuando no mapa', () => {
    const payload = toImagePayload(
      ['a.webp'],
      meta(
        { url: 'a.webp', alt: null, source: 'upload' },
        { url: 'removida.webp', alt: 'sobrou no mapa', source: 'upload' },
      ),
    )
    expect(payload).toEqual([{ url: 'a.webp', alt: null, source: 'upload' }])
  })

  it('produto sem imagem grava lista vazia, nunca null', () => {
    expect(toImagePayload([], meta())).toEqual([])
  })

  it('toda entrada do payload tem url, alt e source — o CHECK do jsonb é por objeto', () => {
    const payload = toImagePayload(['a.webp', 'b.webp'], meta())
    payload.forEach(image => {
      expect(Object.keys(image).sort()).toEqual(['alt', 'source', 'url'])
    })
  })
})
