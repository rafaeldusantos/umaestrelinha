// Feature 61 — o registro das seções de `/admin/google` (`ANL-01`, `AD-046`).
//
// O contrato: duas seções, nesta ordem, com estes endereços, e o recorte do slug inválido num lugar
// só. Molde de `settingsSections.test.ts`.

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GOOGLE_SECTION,
  GOOGLE_ROOT,
  GOOGLE_SECTIONS,
  LEGACY_GOOGLE_SHOPPING_PATH,
  findGoogleSection,
  googleSectionPath,
} from '../googleSections'

describe('GOOGLE_SECTIONS — Analytics e Shopping (ANL-01)', () => {
  it('são duas, nesta ordem', () => {
    // Por extenso, e não derivado: a lista É a asserção.
    expect(GOOGLE_SECTIONS.map(s => s.slug)).toEqual(['analytics', 'shopping'])
    expect(GOOGLE_SECTIONS.map(s => s.label)).toEqual(['Analytics', 'Shopping'])
  })

  it('a rota-mãe abre Analytics, e Analytics é a primeira da fileira', () => {
    expect(DEFAULT_GOOGLE_SECTION).toBe('analytics')
    expect(GOOGLE_SECTIONS[0].slug).toBe(DEFAULT_GOOGLE_SECTION)
  })

  it('os slugs são únicos e em kebab-case', () => {
    const slugs = GOOGLE_SECTIONS.map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })
})

describe('os endereços', () => {
  it('a raiz é `/admin/google`, e cada seção mora debaixo dela', () => {
    expect(GOOGLE_ROOT).toBe('/admin/google')
    expect(googleSectionPath('analytics')).toBe('/admin/google/analytics')
    expect(googleSectionPath('shopping')).toBe('/admin/google/shopping')
  })

  it('o endereço antigo é o da feature 30, e NÃO está debaixo da raiz nova (ANL-02)', () => {
    // `/admin/google-shopping` começa com as mesmas letras de `/admin/google`, mas é outro segmento:
    // `isNavActive` não o marca como Google, e é por isso que ele precisa ser redirect explícito.
    expect(LEGACY_GOOGLE_SHOPPING_PATH).toBe('/admin/google-shopping')
    expect(LEGACY_GOOGLE_SHOPPING_PATH.startsWith(`${GOOGLE_ROOT}/`)).toBe(false)
  })
})

describe('findGoogleSection — o slug inválido tem um dono só', () => {
  it('acha as duas seções pelo slug', () => {
    expect(findGoogleSection('analytics')?.label).toBe('Analytics')
    expect(findGoogleSection('shopping')?.label).toBe('Shopping')
  })

  it.each([['xpto'], [''], [undefined], [null], ['Analytics'], ['google-shopping']])(
    'devolve null para %p',
    slug => {
      expect(findGoogleSection(slug as string | undefined | null)).toBeNull()
    },
  )
})
