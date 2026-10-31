// `MON-02`, `MON-03`, `MON-04` — a cliente da proposta (feature 89, T12).
//
// O dublê registra tabela, `select` e cada filtro: a régua é a condição EXATA de
// `buildCustomerSearchCondition` (o mesmo dono da listagem de Clientes), não "chamou `.or`".

import { describe, expect, it } from 'vitest'
import { buildCustomerSearchCondition, directoryEmailCondition } from '@estrelinha/core/customers'
import { criarDuble } from '@/test/dubleSupabase'
import {
  ADDRESS_COLUMNS,
  CUSTOMER_PICK_COLUMNS,
  CUSTOMER_PICK_LIMIT,
  gravarEnderecoDaCliente,
  lerClientePorEmail,
  lerClientes,
  lerEnderecosDaCliente,
} from '../useCustomerSearch'

const FICHA = '11111111-1111-4111-8111-111111111111'
const CONVIDADA = '22222222-2222-4222-8222-222222222222'

const linhas = [
  { id: FICHA, name: 'Ana Souza', email: 'ana@x.invalid', phone: '51999990000', cpf: '11122233344', has_account: true },
  { id: CONVIDADA, name: 'Bia Lima', email: 'bia@x.invalid', phone: null, cpf: null, has_account: false },
]

describe('lerClientes (MON-02)', () => {
  it('lê customer_list com a condição EXATA do dono da busca, ordenada e com teto', async () => {
    const duble = criarDuble(() => ({ data: linhas }))
    await lerClientes('ana', duble)
    const [r] = duble.calls
    expect(r.table).toBe('customer_list')
    expect(r.select).toEqual([CUSTOMER_PICK_COLUMNS])
    expect(r.filters).toEqual([
      { method: 'or', args: [buildCustomerSearchCondition('ana')] },
      { method: 'order', args: ['name'] },
      { method: 'order', args: ['id'] },
      { method: 'limit', args: [CUSTOMER_PICK_LIMIT] },
    ])
  })

  it('a convidada aparece, SEM ficha; a cliente com ficha traz o id de customers', async () => {
    const clientes = await lerClientes('a', criarDuble(() => ({ data: linhas })))
    expect(clientes.map((c) => [c.name, c.fichaId])).toEqual([
      ['Ana Souza', FICHA],
      ['Bia Lima', null],
    ])
  })

  it('termo vazio não consulta', async () => {
    const duble = criarDuble(() => ({ data: linhas }))
    expect(await lerClientes('   ', duble)).toEqual([])
    expect(duble.calls).toHaveLength(0)
  })

  it('falha de leitura lança (a tela diz "não consegui", nunca "nenhuma cliente")', async () => {
    await expect(lerClientes('ana', criarDuble(() => ({ error: { message: 'caiu' } })))).rejects.toThrow('caiu')
  })
})

describe('lerClientePorEmail (MON-03)', () => {
  it('compara o e-mail EXATO, sem caixa e sem espaço nas pontas', async () => {
    const duble = criarDuble(() => ({ data: [linhas[0]] }))
    const achada = await lerClientePorEmail('  ANA@X.invalid ', duble)
    expect(duble.calls[0].filters[0]).toEqual({ method: 'or', args: [directoryEmailCondition('ana@x.invalid')] })
    expect(achada?.fichaId).toBe(FICHA)
  })

  it('a ficha vence a linha de convidada do mesmo e-mail', async () => {
    const achada = await lerClientePorEmail('x@x.invalid', criarDuble(() => ({ data: [linhas[1], linhas[0]] })))
    expect(achada?.id).toBe(FICHA)
  })

  it('e-mail inválido não consulta; nada encontrado é null', async () => {
    const duble = criarDuble(() => ({ data: [] }))
    expect(await lerClientePorEmail('ana@', duble)).toBeNull()
    expect(duble.calls).toHaveLength(0)
    expect(await lerClientePorEmail('nova@x.invalid', duble)).toBeNull()
  })
})

describe('lerEnderecosDaCliente (MON-02: o padrão primeiro)', () => {
  it('lê addresses da ficha, pede o padrão na frente, e garante a ordem mesmo se o banco não garantir', async () => {
    const duble = criarDuble(() => ({
      data: [
        { id: 'e1', cep: '90000000', street: 'Rua A', number: '1', complement: null, neighborhood: 'B', city: 'POA', state: 'RS', is_default: false },
        { id: 'e2', cep: '90000001', street: 'Rua B', number: '2', complement: null, neighborhood: 'B', city: 'POA', state: 'RS', is_default: true },
      ],
    }))
    const enderecos = await lerEnderecosDaCliente(FICHA, duble)
    const [r] = duble.calls
    expect(r.table).toBe('addresses')
    expect(r.select).toEqual([ADDRESS_COLUMNS])
    expect(r.filters).toEqual([
      { method: 'eq', args: ['customer_id', FICHA] },
      { method: 'order', args: ['is_default', { ascending: false }] },
      { method: 'order', args: ['created_at', { ascending: true }] },
    ])
    expect(enderecos.map((e) => e.id)).toEqual(['e2', 'e1'])
  })
})

describe('gravarEnderecoDaCliente (MON-04)', () => {
  it('grava em addresses, com só dígitos no CEP e a UF em caixa alta', async () => {
    const duble = criarDuble(() => ({}))
    const erro = await gravarEnderecoDaCliente(
      FICHA,
      { cep: '90000-000', street: ' Rua A ', number: '10', complement: '', neighborhood: 'Centro', city: 'Porto Alegre', state: 'rs' },
      { padrao: true },
      duble,
    )
    expect(erro).toBeNull()
    expect(duble.calls[0].table).toBe('addresses')
    expect(duble.calls[0].insert).toEqual({
      customer_id: FICHA,
      label: 'Casa',
      cep: '90000000',
      street: 'Rua A',
      number: '10',
      complement: null,
      neighborhood: 'Centro',
      city: 'Porto Alegre',
      state: 'RS',
      is_default: true,
    })
  })

  it('sem ficha válida não grava', async () => {
    const duble = criarDuble(() => ({}))
    expect(await gravarEnderecoDaCliente('x', { cep: '', street: '', number: '', complement: null, neighborhood: '', city: '', state: '' }, { padrao: false }, duble)).toBe('A ficha da cliente não existe mais.')
    expect(duble.calls).toHaveLength(0)
  })

  it('erro do banco volta como frase', async () => {
    const duble = criarDuble(() => ({ error: { message: 'recusado' } }))
    expect(await gravarEnderecoDaCliente(FICHA, { cep: '1', street: 'a', number: '1', complement: null, neighborhood: 'b', city: 'c', state: 'd' }, { padrao: false }, duble)).toBe('recusado')
  })
})
