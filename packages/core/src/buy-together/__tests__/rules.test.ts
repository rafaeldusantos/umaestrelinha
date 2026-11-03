import { describe, expect, it } from 'vitest'
import {
  BUY_TOGETHER_ADDONS_MAX,
  BUY_TOGETHER_LIST_ITEMS_MAX,
  BUY_TOGETHER_LIST_NAME_MAX,
  addonCountRefusal,
  addonIsMainRefusal,
  addonRepeatedRefusal,
  listDeleteRefusal,
  listItemCountRefusal,
  listNameRefusal,
  listUsableRefusal,
} from '../index.ts'

// As frases são escritas por extenso de propósito: ler a constante aqui faria o teste concordar com
// qualquer texto.

describe('os tetos', () => {
  it('3 adicionais por joia, 12 peças por lista, 40 caracteres no nome', () => {
    expect(BUY_TOGETHER_ADDONS_MAX).toBe(3)
    expect(BUY_TOGETHER_LIST_ITEMS_MAX).toBe(12)
    expect(BUY_TOGETHER_LIST_NAME_MAX).toBe(40)
  })
})

describe('addonCountRefusal', () => {
  it('três adicionais passam; o quarto é recusado com o motivo', () => {
    expect(addonCountRefusal(3)).toBeNull()
    expect(addonCountRefusal(4)).toBe('Cada joia leva até 3 adicionais. Tire um para acrescentar outro.')
  })
})

describe('listItemCountRefusal', () => {
  it('doze peças passam; a 13ª é recusada sugerindo uma segunda lista', () => {
    expect(listItemCountRefusal(12)).toBeNull()
    expect(listItemCountRefusal(13)).toBe(
      'Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista.',
    )
  })
})

describe('listNameRefusal', () => {
  it('nome vazio ou só de espaços é recusado', () => {
    expect(listNameRefusal('')).toBe('Dê um nome à lista para salvar.')
    expect(listNameRefusal('   ')).toBe('Dê um nome à lista para salvar.')
  })

  it('40 caracteres passam (contados depois de aparar); 41 são recusados', () => {
    expect(listNameRefusal('a'.repeat(40))).toBeNull()
    expect(listNameRefusal(` ${'a'.repeat(40)} `)).toBeNull()
    expect(listNameRefusal('a'.repeat(41))).toBe('O nome da lista tem no máximo 40 caracteres.')
  })

  it('um nome comum passa', () => {
    expect(listNameRefusal('Correntes')).toBeNull()
  })
})

describe('listUsableRefusal', () => {
  it('lista sem peças não pode ser escolhida por um adicional', () => {
    expect(listUsableRefusal(0)).toBe('Esta lista ainda não tem peças. Acrescente ao menos uma antes de usá-la.')
    expect(listUsableRefusal(1)).toBeNull()
  })
})

describe('listDeleteRefusal', () => {
  it('lista sem uso pode ser apagada', () => {
    expect(listDeleteRefusal([])).toBeNull()
  })

  it('em uso, nomeia os produtos (singular)', () => {
    expect(listDeleteRefusal(['Pingente Estrela'])).toBe(
      'Esta lista está em uso em 1 joia (Pingente Estrela). Tire-a dela antes de excluir.',
    )
  })

  it('em uso em até três, nomeia todas', () => {
    expect(listDeleteRefusal(['A', 'B', 'C'])).toBe(
      'Esta lista está em uso em 3 joias (A, B, C). Tire-a delas antes de excluir.',
    )
  })

  it('acima de três, nomeia três e diz "e outras"', () => {
    expect(listDeleteRefusal(['A', 'B', 'C', 'D', 'E'])).toBe(
      'Esta lista está em uso em 5 joias (A, B, C e outras). Tire-a delas antes de excluir.',
    )
  })
})

describe('addonIsMainRefusal', () => {
  it('a joia não pode ser adicional dela mesma', () => {
    expect(addonIsMainRefusal('p1', 'p1')).toBe('Uma joia não pode ser adicional dela mesma.')
    expect(addonIsMainRefusal('p1', 'p2')).toBeNull()
  })
})

describe('addonRepeatedRefusal', () => {
  it('o produto já escolhido em outro adicional da mesma joia é recusado', () => {
    expect(addonRepeatedRefusal('p2', ['p3', 'p2'])).toBe('Esta peça já é outro adicional desta joia.')
    expect(addonRepeatedRefusal('p2', ['p3', 'p4'])).toBeNull()
    expect(addonRepeatedRefusal('p2', [])).toBeNull()
  })
})
