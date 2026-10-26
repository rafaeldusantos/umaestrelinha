import { describe, expect, it } from 'vitest'

import { customerOrdersCondition, directoryEmailCondition } from '../link.ts'

const ID = '00000000-0000-4000-c076-0000000d0001'

describe('directoryEmailCondition', () => {
  it('é email.ilike do exato, sem %', () => {
    expect(directoryEmailCondition('maria@x.com')).toBe('email.ilike."maria@x.com"')
    expect(directoryEmailCondition('Maria_X@a.com')).toBe('email.ilike."Maria\\\\_X@a.com"')
    expect(directoryEmailCondition('Maria_X@a.com')).not.toContain('%')
  })
})

describe('customerOrdersCondition (A10)', () => {
  it('liga pelo id OU pelo e-mail exato', () => {
    expect(customerOrdersCondition(ID, 'maria@x.com')).toBe(`customer_id.eq.${ID},customer_email.ilike."maria@x.com"`)
  })

  it('o par VROSA_RJ × VROSAXRJ: o "_" vai literal, não curinga', () => {
    const c = customerOrdersCondition(ID, 'VROSA_RJ@hotmail.com')
    expect(c).toBe(`customer_id.eq.${ID},customer_email.ilike."VROSA\\\\_RJ@hotmail.com"`)
    expect(c).not.toContain('%')
  })

  it('e-mails com _ % " \\ , ) saem escapados e entre aspas', () => {
    expect(customerOrdersCondition(ID, 'a%b@x.com')).toContain('"a\\\\%b@x.com"')
    expect(customerOrdersCondition(ID, 'a"b@x.com')).toContain('"a\\"b@x.com"')
    expect(customerOrdersCondition(ID, 'a\\b@x.com')).toContain('"a\\\\\\\\b@x.com"')
    expect(customerOrdersCondition(ID, 'a,b)@x.com')).toContain('"a,b)@x.com"')
  })

  it('id que não é uuid LANÇA', () => {
    for (const ruim of ['', 'x', 'a,customer_email.ilike.%', null, undefined])
      expect(() => customerOrdersCondition(ruim as string, 'a@b.com')).toThrow(/uuid/)
  })
})
