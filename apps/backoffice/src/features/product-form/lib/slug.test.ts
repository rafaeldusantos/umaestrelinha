import { describe, expect, it } from 'vitest'
import { firstFreeSlug, slugify, slugifyTyping } from './slug'

describe('slug', () => {
  it('troca espaços por hífen e remove acentos e símbolos', () => {
    expect(slugify('Colar Coração de Cinzas — 925!')).toBe('colar-coracao-de-cinzas-925')
  })
  it('ao digitar mantém o hífen final, mas na forma final o remove', () => {
    expect(slugifyTyping('botton ')).toBe('botton-')
    expect(slugify('botton ')).toBe('botton')
  })
  it('usa o primeiro sufixo livre', async () => {
    const taken = new Set(['a', 'a-2'])
    expect(await firstFreeSlug('a', async c => taken.has(c))).toBe('a-3')
    expect(await firstFreeSlug('b', async c => taken.has(c))).toBe('b')
  })
})
