import { describe, expect, it } from 'vitest'

import { loc } from '../loc.ts'

// Requisito: idioma dos campos localizados — `pt` com fallback para o primeiro valor presente
// (assumption confirmada na spec da 21).
describe('loc', () => {
  it('devolve pt quando ele tem conteúdo', () => {
    expect(loc({ pt: 'Joias afetivas', es: 'Joyas' })).toBe('Joias afetivas')
  })

  it('cai para o primeiro idioma com conteúdo quando não há pt', () => {
    expect(loc({ es: 'Joyas afectivas' })).toBe('Joyas afectivas')
  })

  it('cai para outro idioma quando pt existe mas está vazio', () => {
    // É o caso real de `description` e `seo_title` no catálogo medido: a chave existe, o valor não.
    expect(loc({ pt: '   ', es: 'Joyas afectivas' })).toBe('Joyas afectivas')
  })

  it('devolve string vazia quando nenhum idioma tem conteúdo', () => {
    expect(loc({ pt: '', es: '' })).toBe('')
  })

  it('devolve string vazia para nulo, indefinido e vazio', () => {
    expect(loc(null)).toBe('')
    expect(loc(undefined)).toBe('')
    expect(loc('')).toBe('')
  })

  it('aceita a forma de string solta que a API também documenta', () => {
    expect(loc('Pingente afetivo')).toBe('Pingente afetivo')
  })

  it('aceita a forma de array, que `images[].alt` de fato devolve', () => {
    // Medido: `alt` volta ora como `{ pt: '...' }`, ora como `[]`, no mesmo catálogo.
    expect(loc([])).toBe('')
    expect(loc(['Pingente gota com cabelos'])).toBe('Pingente gota com cabelos')
  })
})
