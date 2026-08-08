// PMD-05 AC 6-8 — a regra de aplicação do estúdio, sem canvas.

import { describe, expect, it } from 'vitest'
import type { ProductImage } from '@nanapin/supabase/types'

import { applyPlan, estimateSeconds, type ApplyOpts } from './applyPlan'
import { buildAltText } from '@/features/product-form/lib/buildAltText'

const existing: ProductImage[] = [
  { url: 'https://cdn/foto-1.webp', alt: 'Foto na bancada', source: 'upload' },
  { url: 'https://cdn/foto-2.webp', alt: null, source: 'upload' },
]

const renders = [
  { url: 'https://cdn/render-mao.webp', label: 'Na mão' },
  { url: 'https://cdn/render-mesa.webp', label: 'Na mesa' },
]

const opts = (over: Partial<ApplyOpts> = {}): ApplyOpts => ({
  mode: 'append',
  firstAsPrimary: false,
  generateAlt: false,
  productName: 'Botton Sailor Moon',
  ...over,
})

describe('applyPlan — anexar × substituir (AC 6)', () => {
  it('`anexar` preserva as existentes, na ordem, e põe os renders no fim', () => {
    const result = applyPlan(existing, renders, opts({ mode: 'append' }))

    expect(result.map(i => i.url)).toEqual([
      'https://cdn/foto-1.webp',
      'https://cdn/foto-2.webp',
      'https://cdn/render-mao.webp',
      'https://cdn/render-mesa.webp',
    ])
    // O `alt` já cadastrado sobrevive — anexar não é reescrever.
    expect(result[0].alt).toBe('Foto na bancada')
  })

  it('`substituir` troca a galeria inteira pelos renders', () => {
    const result = applyPlan(existing, renders, opts({ mode: 'replace' }))

    expect(result.map(i => i.url)).toEqual([
      'https://cdn/render-mao.webp',
      'https://cdn/render-mesa.webp',
    ])
  })

  it('todo render entra com `source: mockup` — é o que acende o selo da galeria', () => {
    const result = applyPlan(existing, renders, opts())

    expect(result.filter(i => i.source === 'mockup').map(i => i.url)).toEqual([
      'https://cdn/render-mao.webp',
      'https://cdn/render-mesa.webp',
    ])
    expect(result.filter(i => i.source === 'upload')).toHaveLength(2)
  })

  it('sem renders, devolve a galeria como estava', () => {
    expect(applyPlan(existing, [], opts())).toEqual(existing)
  })
})

describe('applyPlan — 1ª como principal (AC 6)', () => {
  it('move o primeiro render para a posição 0 e mantém o resto na ordem', () => {
    const result = applyPlan(existing, renders, opts({ firstAsPrimary: true }))

    expect(result.map(i => i.url)).toEqual([
      'https://cdn/render-mao.webp',
      'https://cdn/foto-1.webp',
      'https://cdn/foto-2.webp',
      'https://cdn/render-mesa.webp',
    ])
  })

  it('desligado, as existentes seguem na frente', () => {
    const result = applyPlan(existing, renders, opts({ firstAsPrimary: false }))

    expect(result[0].url).toBe('https://cdn/foto-1.webp')
  })

  it('no `substituir` não muda nada — o primeiro render já é o índice 0', () => {
    const comFlag = applyPlan(existing, renders, opts({ mode: 'replace', firstAsPrimary: true }))
    const semFlag = applyPlan(existing, renders, opts({ mode: 'replace', firstAsPrimary: false }))

    expect(comFlag).toEqual(semFlag)
  })
})

describe('applyPlan — gerar alt-text (AC 6, A20)', () => {
  it('usa o MESMO template de PMD-01, com o rótulo do mockup', () => {
    const result = applyPlan([], renders, opts({ mode: 'replace', generateAlt: true }))

    expect(result[0].alt).toBe('Botton Sailor Moon · Na mão')
    expect(result[1].alt).toBe('Botton Sailor Moon · Na mesa')
    // A igualdade com `buildAltText` é a prova de que não há um segundo gerador de alt no projeto.
    expect(result[0].alt).toBe(buildAltText('Botton Sailor Moon', 'Na mão'))
  })

  it('desligado, os renders entram sem alt', () => {
    const result = applyPlan([], renders, opts({ mode: 'replace', generateAlt: false }))

    expect(result.map(i => i.alt)).toEqual([null, null])
  })

  it('produto sem nome não produz alt vazio — fica null', () => {
    const result = applyPlan([], renders, opts({ mode: 'replace', generateAlt: true, productName: '  ' }))

    expect(result.map(i => i.alt)).toEqual([null, null])
  })
})

describe('estimateSeconds — o `~Ys` do rodapé (AC 7)', () => {
  it('4 renders dão ~6 s, o número do artboard', () => {
    expect(estimateSeconds(4)).toBe(6)
  })

  it('cresce com a quantidade', () => {
    expect(estimateSeconds(1)).toBe(2)
    expect(estimateSeconds(2)).toBe(3)
    expect(estimateSeconds(8)).toBe(12)
  })

  it('sem render, sem espera', () => {
    expect(estimateSeconds(0)).toBe(0)
  })
})
