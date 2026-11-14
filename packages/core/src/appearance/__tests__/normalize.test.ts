import { describe, expect, it } from 'vitest'
import { normalizeAppearance, styleProfileOf } from '../normalize.ts'

/**
 * A leitura do perfil de estilo gravado na chave `appearance` de `store_settings`. Sem migration: a
 * ausência da linha é o Padrão, e qualquer valor que não seja um dos dois perfis também — a loja
 * nunca quebra nem escolhe um perfil que a dona não escolheu.
 */
describe('styleProfileOf', () => {
  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['string desconhecida', 'natal'],
    ['string vazia', ''],
    ['grafia com maiúscula', 'Black-Friday'],
    ['número', 1],
    ['booleano', true],
    ['objeto', { profile: 'black-friday' }],
    ['lista', ['black-friday']],
  ])('%s vira padrao', (_nome, valor) => {
    expect(styleProfileOf(valor)).toBe('padrao')
  })

  it.each(['padrao', 'black-friday'])('%s passa como está', perfil => {
    expect(styleProfileOf(perfil)).toBe(perfil)
  })
})

describe('normalizeAppearance', () => {
  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['string', 'black-friday'],
    ['número', 42],
    ['lista', [{ profile: 'black-friday' }]],
    ['objeto sem profile', { perfil: 'black-friday' }],
    ['profile desconhecido', { profile: 'natal' }],
    ['profile nulo', { profile: null }],
    ['profile de outro tipo', { profile: 7 }],
  ])('%s vira o Padrão', (_nome, valor) => {
    expect(normalizeAppearance(valor)).toEqual({ profile: 'padrao' })
  })

  it.each(['padrao', 'black-friday'])('o perfil %s gravado passa', perfil => {
    expect(normalizeAppearance({ profile: perfil })).toEqual({ profile: perfil })
  })

  it('devolve só o perfil — chave estranha gravada não atravessa', () => {
    expect(normalizeAppearance({ profile: 'black-friday', cor: '#000' })).toEqual({
      profile: 'black-friday',
    })
  })
})
