import { describe, expect, it } from 'vitest'

import {
  ATALHOS_DE_MATERIAL,
  CARTOES_DE_MATERIAL,
  FICHAS_DE_MATERIAL,
  PREPARO_EM_CASA,
} from '../guide'

/**
 * `GAV-20` — **todo destino do guia tem um rótulo que cabe num chip.**
 *
 * `rotuloCurto` é um segundo rótulo no mesmo registro, e segundo rótulo envelhece: alguém renomeia a
 * ficha e o chip continua com o nome velho. O que este guarda impede é a falha que **importa** — a
 * entrada sem rótulo e a entrada com rótulo que não cabe —, e é o teto que obriga quem escreve um
 * título longo a declarar o curto.
 *
 * A queda para `titulo` (`rotuloCurto: x.rotuloCurto ?? x.titulo`) garante que entrada nova nunca
 * nasce vazia; o teto garante que ela não nasce ilegível. Sem o teto, o campo seria decoração: a
 * queda resolveria tudo em silêncio e um título de 25 caracteres viraria chip truncado sem nada
 * acusar.
 *
 * ÂNCORA DE CONTAGEM: `ATALHOS_DE_MATERIAL` é derivada de três listas. Se uma delas desaparecer do
 * mapa, a varredura passaria com menos entradas e ninguém veria.
 */

/** O teto, num lugar só — a asserção e o sensor leem o mesmo número. */
export const TETO_ROTULO_CURTO = 20

/** A régua, como predicado: asserção e sensor chamam a mesma função. */
export const rotuloCurtoCabe = (rotulo: string | undefined | null): boolean =>
  typeof rotulo === 'string' && rotulo.trim().length > 0 && rotulo.length <= TETO_ROTULO_CURTO

describe('rótulo curto dos atalhos — âncoras', () => {
  it('a lista derivada tem as três origens dentro', () => {
    // Sem isto, um mapa que perdeu `...PREPARO_EM_CASA` passaria com 8 entradas conformes.
    expect(ATALHOS_DE_MATERIAL).toHaveLength(
      FICHAS_DE_MATERIAL.length + CARTOES_DE_MATERIAL.length + PREPARO_EM_CASA.length,
    )
    expect(ATALHOS_DE_MATERIAL).toHaveLength(10)
  })

  it('a régua ACUSA rótulo ausente, vazio e longo demais', () => {
    expect(rotuloCurtoCabe(undefined)).toBe(false)
    expect(rotuloCurtoCabe('')).toBe(false)
    expect(rotuloCurtoCabe('   ')).toBe(false)
    // O título real que estoura o teto — 25 caracteres.
    expect(rotuloCurtoCabe('Unhas (humanas ou de pet)')).toBe(false)
  })

  it('a régua NÃO acusa rótulo que cabe', () => {
    expect(rotuloCurtoCabe('Unhas')).toBe(true)
    expect(rotuloCurtoCabe('Cinzas')).toBe(true)
    // Exatamente no teto continua valendo — a régua é `<=`, não `<`.
    expect(rotuloCurtoCabe('a'.repeat(TETO_ROTULO_CURTO))).toBe(true)
    expect(rotuloCurtoCabe('a'.repeat(TETO_ROTULO_CURTO + 1))).toBe(false)
  })
})

describe('rótulo curto dos atalhos', () => {
  it.each(ATALHOS_DE_MATERIAL.map(a => [a.anchor, a.rotuloCurto] as const))(
    '`%s` tem rótulo curto que cabe: %s',
    (_anchor, rotuloCurto) => {
      expect(rotuloCurtoCabe(rotuloCurto)).toBe(true)
    },
  )

  it('os dois rótulos curtos declarados são os que o desenho pediu', () => {
    const porAncora = new Map(ATALHOS_DE_MATERIAL.map(a => [a.anchor, a]))
    expect(porAncora.get('cinzas')?.rotuloCurto).toBe('Cinzas')
    expect(porAncora.get('unhas')?.rotuloCurto).toBe('Unhas')
  })

  it('quem não declara cai no título, e o título continua intacto', () => {
    const porAncora = new Map(ATALHOS_DE_MATERIAL.map(a => [a.anchor, a]))
    // `Placenta` não declara `rotuloCurto` — a queda tem de produzir o título.
    expect(porAncora.get('placenta')?.rotuloCurto).toBe('Placenta')
    expect(porAncora.get('placenta')?.rotulo).toBe('Placenta')
  })

  it('`rotulo` continua sendo o título COMPLETO — o guia não encolheu', () => {
    // A gaveta usa `rotuloCurto`; o seletor do guia usa `rotulo`. Se os dois virassem o mesmo
    // valor, o campo novo teria custado uma regressão na página que já existia.
    const porAncora = new Map(ATALHOS_DE_MATERIAL.map(a => [a.anchor, a]))
    expect(porAncora.get('cinzas')?.rotulo).toBe('Cinzas de cremação')
    expect(porAncora.get('unhas')?.rotulo).toBe('Unhas (humanas ou de pet)')
  })
})
