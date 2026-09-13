import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH } from '../../constants.ts'
import { SAME_PASSWORD, authErrorMessage } from '../../auth/index.ts'
import { passwordChangeRefusal } from '../refusals.ts'

// `USR-11`, `USR-12` e `USR-23` da feature 48.
//
// Toda asserção é sobre o TEXTO. É ele que chega à pessoa, e é ele que diverge quando alguém
// reescreve uma frase num dos dois produtores.

const LONGA = 'senha-nova-123'

describe('passwordChangeRefusal — USR-23: o comprimento', () => {
  it('recusa senha curta NOMEANDO o mínimo, lido da constante', () => {
    const curta = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(passwordChangeRefusal({ current: 'atual-antiga', next: curta, confirm: curta })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })

  it('aceita senha exatamente no mínimo — a borda', () => {
    const minima = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(passwordChangeRefusal({ current: 'atual-antiga', next: minima, confirm: minima })).toBeNull()
  })

  it('senha nova vazia cai na régua do comprimento, não num ramo próprio', () => {
    expect(passwordChangeRefusal({ current: 'atual-antiga', next: '', confirm: '' })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })
})

describe('passwordChangeRefusal — USR-11: a confirmação', () => {
  it('recusa quando a confirmação diverge', () => {
    expect(
      passwordChangeRefusal({ current: 'atual-antiga', next: LONGA, confirm: 'senha-nova-124' }),
    ).toBe('A confirmação não confere com a senha nova')
  })

  it('recusa quando a confirmação está vazia', () => {
    expect(passwordChangeRefusal({ current: 'atual-antiga', next: LONGA, confirm: '' })).toBe(
      'A confirmação não confere com a senha nova',
    )
  })

  it('diferença de UM caractere no fim é recusa — a régua compara a string inteira', () => {
    expect(
      passwordChangeRefusal({ current: 'atual-antiga', next: LONGA, confirm: `${LONGA} ` }),
    ).toBe('A confirmação não confere com a senha nova')
  })
})

describe('passwordChangeRefusal — USR-12: igual à atual', () => {
  it('recusa com o texto exato da spec', () => {
    expect(passwordChangeRefusal({ current: LONGA, next: LONGA, confirm: LONGA })).toBe(
      'A senha nova precisa ser diferente da atual.',
    )
  })

  it('o texto é O MESMO que o GoTrue produziria por `same_password` — um dono só', () => {
    // O par que mata a divergência: se alguém reescrever a frase num dos dois lados, este caso
    // reprova. Sem ele, a mesma situação passaria a falar duas frases dependendo de a recusa ter
    // acontecido antes ou depois de sair da tela.
    const doServidor = authErrorMessage({ code: 'same_password', message: 'New password should be different' })
    const daTela = passwordChangeRefusal({ current: LONGA, next: LONGA, confirm: LONGA })

    expect(daTela).toBe(doServidor)
    expect(daTela).toBe(SAME_PASSWORD)
  })
})

describe('passwordChangeRefusal — a ordem quando duas recusas se aplicam (L-005)', () => {
  it('comprimento vence confirmação divergente', () => {
    // `abc` / `abd`: as duas regras se aplicam. Quem vence é a que a pessoa conserta olhando um
    // campo só — senão são dois vaivéns para um erro só.
    expect(passwordChangeRefusal({ current: 'atual-antiga', next: 'abc', confirm: 'abd' })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })

  it('comprimento vence igualdade com a atual', () => {
    const curta = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(passwordChangeRefusal({ current: curta, next: curta, confirm: curta })).toBe(
      `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
  })

  it('confirmação divergente vence igualdade com a atual', () => {
    expect(passwordChangeRefusal({ current: LONGA, next: LONGA, confirm: 'outra-coisa-1' })).toBe(
      'A confirmação não confere com a senha nova',
    )
  })
})

describe('passwordChangeRefusal — o caminho feliz', () => {
  it('devolve null com senha longa, confirmada e diferente da atual', () => {
    expect(
      passwordChangeRefusal({ current: 'atual-antiga', next: LONGA, confirm: LONGA }),
    ).toBeNull()
  })

  it('a senha ATUAL não é validada por comprimento — quem julga a atual é o servidor', () => {
    // USR-10 é do servidor: a senha atual errada volta como `invalid_credentials`. Validar o
    // comprimento dela aqui recusaria trocar a senha de quem tem uma senha antiga curta, criada
    // antes de o mínimo existir — e ela é justamente quem mais precisa trocar.
    expect(passwordChangeRefusal({ current: 'x', next: LONGA, confirm: LONGA })).toBeNull()
  })
})
