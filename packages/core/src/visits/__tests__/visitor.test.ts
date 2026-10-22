/**
 * Feature 71 · task 03 — o contrato do corpo da visita (`VIS-12`, `VIS-13`, `VIS-21`).
 *
 * A loja monta o corpo com `visitBody` e o servidor o recusa com `visitBodyRefusal` — as duas
 * pontas leem o MESMO contrato. O corpo é **exatamente** `{ id }`: a régua de chaves é igualdade,
 * nunca "contém `id`", porque uma chave a mais (`day`, `force`) é exatamente a forma de um cliente
 * tentar decidir o dia que o servidor existe para decidir.
 *
 * O veredito é `string | null` (e não união por booleano), porque `strictNullChecks` é `false`.
 */
import { describe, expect, it } from 'vitest'

import { isVisitorId, visitBody, visitBodyRefusal } from '../visitor.ts'

const V4 = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'

describe('isVisitorId — UUID v4', () => {
  it('aceita v4, inclusive em maiúsculas', () => {
    expect(isVisitorId(V4)).toBe(true)
    expect(isVisitorId(V4.toUpperCase())).toBe(true)
  })

  it.each([
    ['v1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
    ['v7', '01890a5d-ac96-774b-bcce-b302099a8057'],
    ['sem hífens', V4.replace(/-/g, '')],
    ['com espaço', ` ${V4}`],
    ['variante fora de 8/9/a/b', '3f2b8c1e-9a4d-4e6f-cb2a-1c3d5e7f9a0b'],
    ['vazio', ''],
  ])('recusa %s', (_nome, valor) => {
    expect(isVisitorId(valor)).toBe(false)
  })

  it('recusa o que não é texto', () => {
    expect(isVisitorId(null)).toBe(false)
    expect(isVisitorId(undefined)).toBe(false)
    expect(isVisitorId(42)).toBe(false)
  })
})

describe('visitBody — o corpo que a loja envia', () => {
  it('tem EXATAMENTE a chave `id` (igualdade, não "contém")', () => {
    expect(Object.keys(visitBody(V4))).toEqual(['id'])
    expect(visitBody(V4)).toEqual({ id: V4 })
  })

  it('o corpo que a loja monta é aceito pelo servidor', () => {
    expect(visitBodyRefusal(visitBody(V4))).toBeNull()
  })
})

describe('visitBodyRefusal — o que o servidor recusa', () => {
  it('aceita `{ id }` com v4, inclusive em maiúsculas', () => {
    expect(visitBodyRefusal({ id: V4 })).toBeNull()
    expect(visitBodyRefusal({ id: V4.toUpperCase() })).toBeNull()
  })

  it.each([
    ['null', null],
    ['array', [V4]],
    ['texto', V4],
    ['número', 1],
    ['ausente', undefined],
  ])('corpo que não é objeto (%s) ⇒ `json`', (_nome, corpo) => {
    expect(visitBodyRefusal(corpo)).toBe('json')
  })

  it.each(['force', 'day', 'dia', 'ate', 'debug'])('chave extra `%s` ⇒ `chave`', (chave) => {
    expect(visitBodyRefusal({ id: V4, [chave]: true })).toBe('chave')
  })

  it('id ausente ⇒ `id`', () => {
    expect(visitBodyRefusal({})).toBe('id')
  })

  it.each([
    ['v1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
    ['v7', '01890a5d-ac96-774b-bcce-b302099a8057'],
    ['sem hífens', V4.replace(/-/g, '')],
    ['com espaço', `${V4} `],
    ['número', 7],
  ])('id não-v4 (%s) ⇒ `id`', (_nome, id) => {
    expect(visitBodyRefusal({ id })).toBe('id')
  })
})
