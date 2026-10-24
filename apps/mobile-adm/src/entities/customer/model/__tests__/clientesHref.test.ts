// Feature `76` · T16 — os endereços da aba Clientes, por um dono só (`MAC-07`, `MAC-14`, `MAC-28`).
import { describe, expect, it } from 'vitest'
import { CUSTOMER_SLICES } from '@estrelinha/core/customers'

import { CLIENTES_PATH, clienteHref, clientesHref, lerRecorteDeClientes, recorteDeClientesDoEndereco } from '../clientesHref'

describe('clientesHref', () => {
  it('`todas` é o endereço limpo, sem query', () => expect(clientesHref('todas')).toBe('/clientes'))
  it('"Compraram mais de uma vez"', () => expect(clientesHref('recorrentes')).toBe('/clientes?recorte=recorrentes'))
  it('"Com pedido em aberto"', () => expect(clientesHref('em-aberto')).toBe('/clientes?recorte=em-aberto'))
  it('fora do vocabulário, lança — nunca um endereço que a lista não entende', () => {
    expect(() => clientesHref('inventado' as never)).toThrow()
    expect(() => clientesHref('' as never)).toThrow()
    expect(() => clientesHref(undefined as never)).toThrow()
  })
  it('o vocabulário vem de CUSTOMER_SLICES: âncora de três recortes, todos com endereço', () => {
    expect(CUSTOMER_SLICES.map((s) => s.id)).toEqual(['todas', 'recorrentes', 'em-aberto'])
    for (const s of CUSTOMER_SLICES) expect(() => clientesHref(s.id)).not.toThrow()
  })
  it('o caminho da aba', () => expect(CLIENTES_PATH).toBe('/clientes'))
})

describe('lerRecorteDeClientes / recorteDeClientesDoEndereco', () => {
  it('ida e volta, nos três recortes', () => {
    for (const s of CUSTOMER_SLICES) {
      const href = clientesHref(s.id)
      const search = href.includes('?') ? href.slice(href.indexOf('?')) : ''
      expect(recorteDeClientesDoEndereco(search)).toBe(s.id)
    }
  })
  it('valor fora do vocabulário ⇒ null na leitura, `todas` na página', () => {
    expect(lerRecorteDeClientes('?recorte=zzz')).toBeNull()
    expect(recorteDeClientesDoEndereco('?recorte=zzz')).toBe('todas')
  })
  it('ausente ou vazio ⇒ null / `todas`', () => {
    expect(lerRecorteDeClientes('')).toBeNull()
    expect(lerRecorteDeClientes('?outro=1')).toBeNull()
    expect(lerRecorteDeClientes('?recorte=')).toBeNull()
    expect(recorteDeClientesDoEndereco('')).toBe('todas')
  })
  it('`?recorte=todas` escrito à mão também é lido', () => expect(lerRecorteDeClientes('?recorte=todas')).toBe('todas'))
  it('o termo da busca não é lido do endereço (MAC-28)', () => {
    expect(lerRecorteDeClientes('?busca=ana&recorte=em-aberto')).toBe('em-aberto')
    expect(clientesHref('em-aberto')).not.toMatch(/busca|termo|q=/)
  })
})

describe('clienteHref', () => {
  const ID = '00000000-0000-4000-c076-000000000001'
  it('um uuid ⇒ /clientes/<uuid>', () => expect(clienteHref(ID)).toBe(`/clientes/${ID}`))
  it('um e-mail jamais vira endereço', () => expect(() => clienteHref('marina@exemplo.invalid')).toThrow())
  it('nome, telefone, vazio e ausente também lançam', () => {
    expect(() => clienteHref('Marina Duarte')).toThrow()
    expect(() => clienteHref('51998124471')).toThrow()
    expect(() => clienteHref('')).toThrow()
    expect(() => clienteHref(undefined as never)).toThrow()
    expect(() => clienteHref(`${ID}/../x`)).toThrow()
  })
})
