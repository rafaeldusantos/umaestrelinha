import { describe, it, expect } from 'vitest'
import { DEFAULT_BANNER_LAYOUT, HERO_ART_SLOT, layoutRatios, layoutSlots } from '../layout'
import { DEFAULT_HOME_COMPOSITION } from '../defaults'
import type { HomeBannerLayout } from '../types'

/**
 * As vagas da grade de banners (`HOME-22`, `HOME-26`, `HOME-27`) — emenda `E3`.
 *
 * Elas moram em `core` porque **duas telas leem a mesma medida**: a grade da loja, para saber
 * quantos banners desenhar e com que proporção, e o editor do painel, para dizer o tamanho
 * recomendado em pixels. Respondida em cada tela, "quantos banners cabem em `hero_pair`" divergiria
 * no primeiro ajuste.
 */

const razao = (layout: HomeBannerLayout, i: number) => {
  const slot = layoutRatios(layout)[i]
  return slot.width / slot.height
}

describe('layoutSlots — quantos banners cada arranjo desenha (HOME-22)', () => {
  it.each([
    ['single', 1],
    ['pair', 2],
    ['hero_pair', 3],
    ['quad', 4],
  ] as const)('`%s` tem %i vaga(s)', (layout, vagas) => {
    expect(layoutSlots(layout)).toBe(vagas)
  })

  it('a contagem é a da lista de proporções — nunca um segundo número', () => {
    // Se `layoutSlots` tivesse tabela própria, um arranjo novo entraria com contagem certa e
    // proporção faltando (ou o contrário), e a grade desenharia caixa sem medida.
    for (const layout of ['single', 'pair', 'hero_pair', 'quad'] as const) {
      expect(layoutSlots(layout)).toBe(layoutRatios(layout).length)
    }
  })

  it('a grade aceita no máximo 4 banners, que é o teto que a spec declara', () => {
    const maior = Math.max(
      ...(['single', 'pair', 'hero_pair', 'quad'] as const).map(l => layoutSlots(l)),
    )
    expect(maior).toBe(4)
  })
})

describe('layoutRatios — `hero_pair` é a grade de hoje (HOME-04)', () => {
  it('é o arranjo padrão, e é o que a composição semeada traz', () => {
    expect(DEFAULT_BANNER_LAYOUT).toBe('hero_pair')
    expect(DEFAULT_HOME_COMPOSITION.find(s => s.type === 'banner_grid')!.config.layout).toBe(
      'hero_pair',
    )
  })

  it('a 1ª vaga é a grande de hoje (588/510) e as outras duas são a faixa (588/243)', () => {
    // As medidas do desenho são a grade de hoje em dobro — densidade 2× para a arte não sair borrada
    // em tela retina. O que a loja usa é a RAZÃO, e ela é idêntica.
    expect(razao('hero_pair', 0)).toBeCloseTo(588 / 510, 5)
    expect(razao('hero_pair', 1)).toBeCloseTo(588 / 243, 5)
    expect(razao('hero_pair', 2)).toBeCloseTo(588 / 243, 5)
  })

  it('as três vagas saem em pixels, que é o que a dona precisa para reexportar', () => {
    expect(layoutRatios('hero_pair')).toEqual([
      { width: 1176, height: 1020 },
      { width: 1176, height: 486 },
      { width: 1176, height: 486 },
    ])
  })
})

describe('layoutRatios — os outros três arranjos', () => {
  it('`single` é uma vaga só, na proporção da grande', () => {
    expect(layoutRatios('single')).toEqual([{ width: 1176, height: 1020 }])
    expect(razao('single', 0)).toBeCloseTo(588 / 510, 5)
  })

  it('`pair` são duas vagas iguais', () => {
    expect(layoutRatios('pair')).toEqual([
      { width: 588, height: 510 },
      { width: 588, height: 510 },
    ])
  })

  it('`quad` são quatro vagas iguais', () => {
    expect(layoutRatios('quad')).toHaveLength(4)
    for (let i = 0; i < 4; i += 1) expect(razao('quad', i)).toBeCloseTo(588 / 510, 5)
  })
})

describe('layoutRatios — o que não pode acontecer', () => {
  it('arranjo desconhecido cai no padrão, e não em zero vaga', () => {
    // Uma grade com zero vagas apagaria os banners que a dona já subiu, e a Home perderia a seção
    // sem nada acusar. `config` vem de `jsonb`: valor gravado por uma versão mais nova é possível.
    expect(layoutSlots('mosaico_novo' as HomeBannerLayout)).toBe(3)
    expect(layoutRatios(null)).toEqual(layoutRatios('hero_pair'))
    expect(layoutRatios(undefined)).toEqual(layoutRatios('hero_pair'))
  })

  it('a medida devolvida é CÓPIA: mutar o retorno não contamina a tabela', () => {
    layoutRatios('hero_pair')[0].width = 1
    expect(layoutRatios('hero_pair')[0].width).toBe(1176)
  })
})

describe('HERO_ART_SLOT — a vaga da figura do hero', () => {
  it('tem a proporção que a loja desenha (`aspect-[350/260]`), em pixels de densidade 2×', () => {
    // A tela do painel não pode inventar o tamanho recomendado, e a loja não pode desenhar outra
    // proporção: o número mora aqui uma vez só. A tolerância é a mesma do aviso de proporção (2%),
    // que é o que separa divergência real de ruído de exportação.
    const desenho = 350 / 260
    expect(HERO_ART_SLOT.width / HERO_ART_SLOT.height).toBeCloseTo(desenho, 2)
    expect(HERO_ART_SLOT).toEqual({ width: 1200, height: 890 })
  })

  it('não é uma das vagas da grade de banners — são perguntas diferentes', () => {
    // A figura do hero é fotografia e aceita recorte; o banner de campanha tem texto dentro da arte
    // e por isso ganha aviso. Confundir as duas medidas devolveria aviso onde não cabe.
    for (const layout of ['single', 'pair', 'hero_pair', 'quad'] as HomeBannerLayout[]) {
      expect(layoutRatios(layout)).not.toContainEqual(HERO_ART_SLOT)
    }
  })
})
