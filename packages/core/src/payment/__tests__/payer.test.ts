import { describe, expect, it } from 'vitest'
import { buildPayer, mergePayer, splitName, type Payer } from '../payer'

// PGD-04: identification (CPF) + first_name/last_name derivados de customers.name, para PIX e
//         cartão; o CPF do pedido sobrescreve o que vier do CardPayment Brick.
// DOC-03: `identification.type` é CPF com 11 dígitos e CNPJ com 14.

const VALID_CPF = '529.982.247-25'
const VALID_CNPJ = '11.222.333/0001-81'

const orderPayer = (over: Partial<Payer> = {}): Payer => ({
  email: 'marina@exemplo.com',
  first_name: 'Marina',
  last_name: 'Yamashita',
  identification: { type: 'CPF', number: '52998224725' },
  ...over,
})

describe('splitName', () => {
  it('nome de dois tokens vira first + last', () => {
    expect(splitName('Marina Yamashita')).toEqual({ first: 'Marina', last: 'Yamashita' })
  })

  it('nome de token único repete o token em last', () => {
    expect(splitName('Marina')).toEqual({ first: 'Marina', last: 'Marina' })
  })

  it('nome composto: primeiro token é first, todo o resto é last', () => {
    expect(splitName('Ana Paula Souza Lima')).toEqual({ first: 'Ana', last: 'Paula Souza Lima' })
  })

  it('ignora espaços extras nas bordas e entre os tokens', () => {
    expect(splitName('  Marina   Yamashita  ')).toEqual({ first: 'Marina', last: 'Yamashita' })
  })

  it('nome vazio devolve first e last vazios', () => {
    expect(splitName('')).toEqual({ first: '', last: '' })
  })
})

describe('buildPayer', () => {
  it('devolve identification com type CPF e os 11 dígitos sem máscara', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: VALID_CPF })
    expect(payer.identification).toEqual({ type: 'CPF', number: '52998224725' })
  })

  it('monta email, first_name e last_name a partir dos dados do pedido', () => {
    const payer = buildPayer({
      name: 'Ana Paula Souza Lima',
      email: 'ana@exemplo.com',
      cpf: VALID_CPF,
    })
    expect(payer.email).toBe('ana@exemplo.com')
    expect(payer.first_name).toBe('Ana')
    expect(payer.last_name).toBe('Paula Souza Lima')
  })

  it('omite identification quando o dígito verificador do CPF não fecha', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: '529.982.247-26' })
    expect(payer.identification).toBeUndefined()
    expect(payer.first_name).toBe('Marina')
  })

  it('omite identification quando o CPF é vazio', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: '' })
    expect(payer.identification).toBeUndefined()
  })

  it('omite identification quando o CPF tem menos de 11 dígitos', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: '5299822472' })
    expect(payer.identification).toBeUndefined()
  })

  // DOC-03: quem compra com CNPJ informa o CNPJ no mesmo campo do pagador.
  it('devolve identification com type CNPJ e os 14 dígitos sem máscara', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: VALID_CNPJ })
    expect(payer.identification).toEqual({ type: 'CNPJ', number: '11222333000181' })
  })

  it('omite identification quando o dígito verificador do CNPJ não fecha', () => {
    const payer = buildPayer({
      name: 'Marina Yamashita',
      email: 'm@ex.com',
      cpf: '11.222.333/0001-82',
    })
    expect(payer.identification).toBeUndefined()
    expect(payer.first_name).toBe('Marina')
  })

  it('omite identification em comprimento intermediário entre CPF e CNPJ', () => {
    const payer = buildPayer({ name: 'Marina Yamashita', email: 'm@ex.com', cpf: '112223330001' })
    expect(payer.identification).toBeUndefined()
  })
})

describe('mergePayer', () => {
  it('o identification do pedido sobrescreve o que veio do Brick', () => {
    const merged = mergePayer(
      { email: 'brick@ex.com', identification: { type: 'CPF', number: '11144477735' } },
      orderPayer(),
    )
    expect(merged.identification).toEqual({ type: 'CPF', number: '52998224725' })
  })

  it('first_name e last_name do pedido vencem os do Brick', () => {
    const merged = mergePayer(
      { email: 'brick@ex.com', first_name: 'Fulana', last_name: 'De Tal' },
      orderPayer(),
    )
    expect(merged.first_name).toBe('Marina')
    expect(merged.last_name).toBe('Yamashita')
  })

  it('preserva os demais campos enviados pelo Brick', () => {
    const merged = mergePayer(
      { email: 'brick@ex.com', entity_type: 'individual', type: 'customer' },
      orderPayer(),
    )
    expect(merged.email).toBe('brick@ex.com')
    expect(merged.entity_type).toBe('individual')
    expect(merged.type).toBe('customer')
  })

  it('sem payer do Brick, devolve o pagador do pedido inteiro', () => {
    const merged = mergePayer(null, orderPayer())
    expect(merged).toEqual({
      email: 'marina@exemplo.com',
      first_name: 'Marina',
      last_name: 'Yamashita',
      identification: { type: 'CPF', number: '52998224725' },
    })
  })

  it('pedido sem identification preserva o identification do Brick', () => {
    const merged = mergePayer(
      { email: 'brick@ex.com', identification: { type: 'CPF', number: '11144477735' } },
      orderPayer({ identification: undefined }),
    )
    expect(merged.identification).toEqual({ type: 'CPF', number: '11144477735' })
  })
})
