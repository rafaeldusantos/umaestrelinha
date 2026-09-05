import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { lerClientes, lerVendas } from '../parse.ts'

/**
 * As fixtures reproduzem a FORMA do arquivo real, nunca o conteúdo.
 *
 * O arquivo exportado carrega CPF, telefone e endereço de 33 pessoas de verdade. Uma fixture com
 * dado real entra no git **para sempre**: some do working tree e continua no histórico, e a única
 * saída passa a ser reescrever a história do repositório.
 *
 * SPEC_DEVIATION: a spec (`ESP-30`) e o design pedem "um teste que assere que nenhum CPF do arquivo
 * real aparece em `src/__fixtures__/`".
 * Reason: aquele teste é **inimplementável sem cometer o próprio problema** — para comparar contra
 * os CPFs reais seria preciso tê-los no repositório, que é exatamente o que se quer evitar. E o
 * arquivo real mora em `~/Downloads`, fora do git, então o teste passaria em verde em qualquer
 * máquina que não o tivesse — um no-op disfarçado, a pior forma de guarda.
 * O que este arquivo faz no lugar é mais forte: em vez de provar a ausência de uma lista, prova a
 * **presença de um formato sintético declarado**. Dado real reprova por construção, sem precisar
 * ser conhecido.
 */

const vendas = lerVendas(fs.readFileSync(new URL('../../__fixtures__/vendas.csv', import.meta.url)))
const clientes = lerClientes(fs.readFileSync(new URL('../../__fixtures__/clientes.csv', import.meta.url)))

/** Domínio reservado pela RFC 2606 — não resolve, não entrega e não pode ser registrado. */
const DOMINIO_SINTETICO = /@exemplo\.invalid$/i

/** Documento sintético é um dígito repetido: `11111111111`. Nenhum CPF real tem essa forma. */
const DOCUMENTO_SINTETICO = /^(\d)\1{10}$|^(\d)\2{13}$/

/** Bloco reservado dos telefones da fixture. Nenhum número real da base cai nele. */
const TELEFONE_SINTETICO = /900000/

const emails = [...vendas.map(p => p.email), ...clientes.map(c => c.email)]
const documentos = [...vendas.map(p => p.documento), ...clientes.map(c => c.documento)]
  .filter((d): d is string => d !== null)
const telefones = [...vendas.map(p => p.telefone), ...clientes.map(c => c.telefone)]
  .filter((t): t is string => t !== null)

describe('âncora de contagem', () => {
  it('varreu e-mails, documentos e telefones das duas fixtures', () => {
    // Sem esta âncora, um seletor errado varre zero campo e o guarda vira um no-op verde (`L-021`).
    expect(emails.length).toBeGreaterThanOrEqual(13)
    expect(documentos.length).toBeGreaterThanOrEqual(10)
    expect(telefones.length).toBeGreaterThanOrEqual(10)
  })
})

describe('as fixtures são sintéticas por construção', () => {
  it('todo e-mail está no domínio reservado @exemplo.invalid', () => {
    const fora = emails.filter(e => !DOMINIO_SINTETICO.test(e))
    expect(fora).toEqual([])
  })

  it('todo documento é um dígito repetido', () => {
    const fora = documentos.filter(d => !DOCUMENTO_SINTETICO.test(d))
    expect(fora).toEqual([])
  })

  it('todo telefone está no bloco reservado da fixture', () => {
    const fora = telefones.filter(t => !TELEFONE_SINTETICO.test(t))
    expect(fora).toEqual([])
  })

  it('SENSOR: a régua reprova dado com a forma do real', () => {
    // Se estas três asserções passassem, o guarda estaria aceitando qualquer coisa.
    expect(DOMINIO_SINTETICO.test('alguem@gmail.com')).toBe(false)
    expect(DOCUMENTO_SINTETICO.test('01694988082')).toBe(false)
    expect(TELEFONE_SINTETICO.test('5551993913065')).toBe(false)
  })
})
