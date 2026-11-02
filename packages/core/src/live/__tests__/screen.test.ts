// A frase ao lado do número grande diz a janela por extenso (a régua de tom do app só aceita
// "últimos" seguido do número no MESMO literal). É uma segunda escrita de `LIVE_WINDOW_MIN`, e esta
// régua a compara com a constante: mudar a janela sem mudar a frase reprova aqui.
import { describe, expect, it } from 'vitest'
import { LIVE_WINDOW_MIN } from '../presence.ts'
import { LIVE_WINDOW_LINE } from '../screen.ts'

/** Os números escritos na frase. */
const numerosDa = (frase: string): number[] => [...frase.matchAll(/\d+/g)].map((m) => Number(m[0]))

/** A frase diz a janela, e só ela: um número, igual à constante, seguido de "minutos". */
const dizAJanela = (frase: string, janela: number): boolean =>
  numerosDa(frase).length === 1 && numerosDa(frase)[0] === janela && new RegExp(`(?<!\\d)${janela} minutos$`).test(frase)

describe('a frase da janela de "Agora na loja"', () => {
  it('diz exatamente `LIVE_WINDOW_MIN` minutos', () => {
    expect(dizAJanela(LIVE_WINDOW_LINE, LIVE_WINDOW_MIN)).toBe(true)
  })

  it('SENSOR — outra janela, dois números ou a unidade errada reprovam', () => {
    expect(dizAJanela('nos últimos 10 minutos', LIVE_WINDOW_MIN)).toBe(false)
    expect(dizAJanela(LIVE_WINDOW_LINE, LIVE_WINDOW_MIN + 1)).toBe(false)
    expect(dizAJanela('nos últimos 15 minutos', 5)).toBe(false)
    expect(dizAJanela('nos últimos 5 a 6 minutos', 5)).toBe(false)
    expect(dizAJanela('nos últimos 5 segundos', 5)).toBe(false)
  })
})
