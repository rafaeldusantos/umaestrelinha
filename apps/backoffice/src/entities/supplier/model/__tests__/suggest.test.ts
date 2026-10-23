import { describe, expect, it } from 'vitest'
import { canCreateSupplier, findSupplierByName, suggestSuppliers, type Supplier } from '../suggest'

const S = (name: string, id = name): Supplier => ({ id, name })
const LISTA = [S('Ateliê Prata'), S('Resinas do Sul'), S('Prata Fina'), S('Casa da Resina'), S('Coração de Mãe')]

describe('suggestSuppliers (FOR-07)', () => {
  it('casa sem acento e sem maiúsculas', () => {
    expect(suggestSuppliers(LISTA, 'ATELIE').map(s => s.name)).toEqual(['Ateliê Prata'])
    expect(suggestSuppliers(LISTA, 'coracao').map(s => s.name)).toEqual(['Coração de Mãe'])
  })

  it('casa no meio do nome, e quem COMEÇA pelo termo vem primeiro', () => {
    expect(suggestSuppliers(LISTA, 'prata').map(s => s.name)).toEqual(['Prata Fina', 'Ateliê Prata'])
    expect(suggestSuppliers(LISTA, 'resin').map(s => s.name)).toEqual(['Resinas do Sul', 'Casa da Resina'])
  })

  it('termo vazio ou só espaço não sugere nada', () => {
    expect(suggestSuppliers(LISTA, '')).toEqual([])
    expect(suggestSuppliers(LISTA, '   ')).toEqual([])
  })

  it('no máximo 8 sugestões', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => S(`Fornecedor ${String(i).padStart(2, '0')}`))
    expect(suggestSuppliers(muitos, 'fornecedor')).toHaveLength(8)
  })
})

describe('findSupplierByName e canCreateSupplier (FOR-08, FOR-11)', () => {
  it('o mesmo nome com outra caixa, outro acento ou espaço sobrando é o MESMO fornecedor', () => {
    expect(findSupplierByName(LISTA, '  atelie   PRATA ')?.id).toBe('Ateliê Prata')
    expect(canCreateSupplier(LISTA, 'atelie prata')).toBe(false)
  })

  it('nome que só CONTÉM um existente é outro fornecedor, e pode ser criado', () => {
    expect(findSupplierByName(LISTA, 'Prata')).toBeNull()
    expect(canCreateSupplier(LISTA, 'Prata')).toBe(true)
  })

  it('nome vazio nem acha nem oferece criar', () => {
    expect(findSupplierByName(LISTA, ' ')).toBeNull()
    expect(canCreateSupplier(LISTA, ' ')).toBe(false)
  })
})
