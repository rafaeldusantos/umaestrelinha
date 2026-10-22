/**
 * Feature 71 · task 04 — `VIS-42`/`VIS-43`: o parâmetro que tira um navegador da contagem tem UM
 * dono. A loja o LÊ (`readOptOutParam`) e o painel o ESCREVE (`optOutHref`, no menu da conta);
 * os dois apps não se importam, e duas grafias do parâmetro produziriam um link que a loja não
 * reconhece — sem nada quebrar.
 */
import { describe, expect, it } from 'vitest'

import { OPT_OUT_PARAM, optOutHref, readOptOutParam } from '../optOut.ts'

describe('OPT_OUT_PARAM', () => {
  it('é `nao-contar`', () => {
    expect(OPT_OUT_PARAM).toBe('nao-contar')
  })
})

describe('optOutHref — o link que o painel abre', () => {
  it('ligar ⇒ `/?nao-contar=1` na origem da loja', () => {
    expect(optOutHref('https://loja', true)).toBe('https://loja/?nao-contar=1')
  })

  it('desligar ⇒ `/?nao-contar=0`', () => {
    expect(optOutHref('https://loja', false)).toBe('https://loja/?nao-contar=0')
  })

  it('o link que o painel escreve é o que a loja lê', () => {
    expect(readOptOutParam(new URL(optOutHref('https://loja', true)).search)).toBe('on')
    expect(readOptOutParam(new URL(optOutHref('https://loja', false)).search)).toBe('off')
  })
})

describe('readOptOutParam — o que a loja lê', () => {
  it('`?nao-contar=1` ⇒ on', () => {
    expect(readOptOutParam('?nao-contar=1')).toBe('on')
  })

  it('`?nao-contar=0` ⇒ off', () => {
    expect(readOptOutParam('?nao-contar=0')).toBe('off')
  })

  it('ausente ⇒ null', () => {
    expect(readOptOutParam('')).toBeNull()
    expect(readOptOutParam('?a=1')).toBeNull()
  })

  it('outro valor ⇒ null (nunca liga nem desliga por acidente)', () => {
    expect(readOptOutParam('?nao-contar=sim')).toBeNull()
    expect(readOptOutParam('?nao-contar=')).toBeNull()
    expect(readOptOutParam('?nao-contar=2')).toBeNull()
  })

  it('o parâmetro no meio de outros é lido', () => {
    expect(readOptOutParam('?a=1&nao-contar=1&b=2')).toBe('on')
    expect(readOptOutParam('?a=1&nao-contar=0&b=2')).toBe('off')
  })

  it('aceita a busca sem o `?` da frente', () => {
    expect(readOptOutParam('nao-contar=1')).toBe('on')
  })
})
