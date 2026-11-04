import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ORDER_ADMIN_NOTE_MAX,
  adminNoteLength,
  adminNoteRefusal,
  normalizeAdminNote,
} from '../index.ts'

/**
 * A observação do pedido — o texto que só quem administra lê. O teto é o mesmo número do `check` da
 * migration (`char_length(btrim(note)) between 1 and 1000`), contado do MESMO jeito: texto aparado,
 * em pontos de código. Contar em unidades de UTF-16 recusaria na tela um texto com emoji que o
 * banco aceita.
 */

describe('o teto da observação', () => {
  it('é 1000 caracteres', () => {
    expect(ORDER_ADMIN_NOTE_MAX).toBe(1000)
  })

  it('aceita 1000 e recusa 1001', () => {
    expect(adminNoteRefusal('a'.repeat(1000))).toBeNull()
    expect(adminNoteRefusal('a'.repeat(1001))).toBe('A observação vai até 1000 caracteres.')
  })

  it('conta o texto aparado — espaço nas pontas não conta', () => {
    const texto = `   ${'a'.repeat(1000)}  \n`
    expect(adminNoteLength(texto)).toBe(1000)
    expect(adminNoteRefusal(texto)).toBeNull()
  })

  it('conta por ponto de código, como o `char_length` do banco', () => {
    // '𝒜' (letra matemática) é um ponto de código e duas unidades de UTF-16.
    const estrelas = '𝒜'.repeat(1000)
    expect(estrelas.length).toBe(2000)
    expect(adminNoteLength(estrelas)).toBe(1000)
    expect(adminNoteRefusal(estrelas)).toBeNull()
    expect(adminNoteRefusal(`${estrelas}a`)).not.toBeNull()
  })

  it('vazio é aceito — significa apagar a observação', () => {
    expect(adminNoteRefusal('')).toBeNull()
    expect(adminNoteRefusal('   \n ')).toBeNull()
    expect(normalizeAdminNote('   \n ')).toBe('')
  })

  it('normalizar apara as pontas e preserva o miolo', () => {
    expect(normalizeAdminNote('  Gravar  "Ana"\nna frente  ')).toBe('Gravar  "Ana"\nna frente')
  })

  it('valor ausente conta como vazio', () => {
    expect(normalizeAdminNote(null)).toBe('')
    expect(adminNoteLength(undefined)).toBe(0)
    expect(adminNoteRefusal(null)).toBeNull()
  })
})

describe('a folha da observação é alcançável pelo Deno', () => {
  it('não importa nada', () => {
    const fonte = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'adminNote.ts'), 'utf8')
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
    expect(codigo.length).toBeGreaterThan(100)
    expect(codigo).not.toMatch(/\bfrom\s+['"]|\bimport\s*\(|\bimport\s+['"]/)
  })
})
