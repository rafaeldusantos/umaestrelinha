// Feature 72, T07 — a cópia do lockup negativo da splash É o SVG-fonte, byte a byte.
//
// Cópia deliberada com guarda (consequência 3 do "defeito 01"): o SVG-fonte mora em `.specs/brand`,
// fora de qualquer `src/`, e o app precisa importá-lo com `?raw`. Uma correção de traço no fonte que
// não chegasse à cópia faria a splash desenhar a marca antiga, sem nada quebrar.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const FONTE = resolve(__dirname, '../../../../../../.specs/brand/uma-estrelinha/uma-estrelinha-lockup-negativo.svg')
const COPIA = resolve(__dirname, '../assets/uma-estrelinha-lockup-negativo.svg')

const iguais = (a: Buffer, b: Buffer) => a.equals(b)

describe('o lockup da splash é o SVG-fonte', () => {
  const fonte = readFileSync(FONTE)
  const copia = readFileSync(COPIA)

  it('âncora — os dois arquivos foram lidos e são o lockup negativo', () => {
    expect(fonte.length).toBeGreaterThan(5000)
    expect(fonte.toString('utf8')).toMatch(/^<svg[\s\S]*aria-label="Uma Estrelinha"/)
    // Negativo: o traço é on-primary (#F7F3EC), para o fundo primary-strong.
    expect(fonte.toString('utf8')).toContain('stroke="#F7F3EC"')
  })

  it('a cópia é igual ao fonte, byte a byte', () => {
    expect(iguais(copia, fonte)).toBe(true)
  })

  it('SENSOR — um byte trocado reprova', () => {
    const alterada = Buffer.from(copia)
    alterada[alterada.length - 2] = alterada[alterada.length - 2] ^ 1
    expect(iguais(alterada, fonte)).toBe(false)
  })
})
