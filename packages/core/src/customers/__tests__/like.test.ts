import { describe, expect, it } from 'vitest'

import { escapeLike, ilikeContains, ilikeExact } from '../like.ts'

describe('escapeLike', () => {
  it('escapa \\ % _ com uma barra', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('a\\b')).toBe('a\\\\b')
  })

  it('texto comum passa intacto', () => {
    expect(escapeLike('Maria Souza')).toBe('Maria Souza')
  })

  it('o asterisco vira "_" (probe da T02: o PostgREST o troca por % mesmo escapado)', () => {
    expect(escapeLike('star*x')).toBe('star_x')
  })

  it('o "_" que o asterisco produz NÃO é re-escapado (a ordem: escapa, depois troca)', () => {
    expect(escapeLike('a_b*')).toBe('a\\_b_')
  })
})

describe('ilikeContains — escapes em camadas, valor entre aspas', () => {
  it('envolve em %…% entre aspas', () => {
    expect(ilikeContains('Maria')).toBe('"%Maria%"')
  })

  it('o LIKE escapa primeiro, o PostgREST escapa o resultado (a ordem, com a\\_b"c)', () => {
    // a\_b"c  →(LIKE)→  a\\\_b"c ... passo a passo:
    // escapeLike('a\\_b"c') = a\\\_b"c   (o \ vira \\, o _ vira \_)
    // quote: cada \ e cada " do resultado ganham uma barra
    expect(ilikeContains('a\\_b"c')).toBe('"%a\\\\\\\\\\\\_b\\"c%"')
  })

  it('% e _ do termo chegam como literais', () => {
    expect(ilikeContains('100%')).toBe('"%100\\\\%%"')
    expect(ilikeContains('a_b')).toBe('"%a\\\\_b%"')
  })

  it('( ) , . ficam como texto dentro das aspas (nenhum vira espaço)', () => {
    expect(ilikeContains('Ana (b, c).')).toBe('"%Ana (b, c).%"')
  })

  it('aspas duplas do termo são escapadas', () => {
    expect(ilikeContains('"aspas"')).toBe('"%\\"aspas\\"%"')
  })
})

describe('ilikeExact — sem curinga, sem %', () => {
  it('não tem % e fica entre aspas', () => {
    expect(ilikeExact('Maria_X@a.com')).toBe('"Maria\\\\_X@a.com"')
    expect(ilikeExact('Maria_X@a.com')).not.toContain('%')
  })

  it('e-mail comum', () => {
    expect(ilikeExact('maria@x.com')).toBe('"maria@x.com"')
  })

  it('aspas e barras do e-mail são escapadas', () => {
    expect(ilikeExact('a"b@x.com')).toBe('"a\\"b@x.com"')
  })
})
