// Feature 57 (`AVD-08`, `AVD-09`) — o endereço que recebe os avisos internos.
//
// A regra é pequena e por isso é perigosa: ela cabe numa linha, e uma linha é exatamente o tamanho
// de código que se reescreve em vez de importar. Os casos abaixo medem a REGRA, e
// `ownerEmailComDonoUnico.test.ts` (na suíte da loja) recusa a segunda escrita dela.

import { describe, expect, it } from 'vitest'

import { ownerContactMissing, resolveOwnerEmail } from '../owner.ts'

describe('resolveOwnerEmail — a queda (`AVD-08`)', () => {
  it('com o campo de avisos preenchido, é ele que vale', () => {
    expect(resolveOwnerEmail({ email: 'contato@loja.com', notifications_email: 'adri@loja.com' })).toBe(
      'adri@loja.com',
    )
  })

  it('sem o campo de avisos, cai no e-mail de contato', () => {
    // É o estado de TODA loja no dia do deploy desta feature: a migration semeia `''`, e nada muda
    // de comportamento. Se esta linha quebrar, o deploy silencia os avisos de quem já os recebia.
    expect(resolveOwnerEmail({ email: 'contato@loja.com', notifications_email: '' })).toBe(
      'contato@loja.com',
    )
  })

  it('com o campo AUSENTE (banco que ainda não recebeu a migration), cai no de contato', () => {
    // A origem é uma linha de `jsonb`: num banco anterior à 57 a chave simplesmente não existe. O
    // fallback é o que faz esse caso funcionar sem tratamento especial — e sem ele o deploy do
    // código antes da migration deixaria a loja sem destinatário nenhum.
    expect(resolveOwnerEmail({ email: 'contato@loja.com' })).toBe('contato@loja.com')
  })

  it('só espaço no campo de avisos conta como vazio', () => {
    // O modo de falha real: ela abre o campo, dá um espaço sem querer e salva. Sem o `trim`, o
    // destinatário passa a ser " " e o envio falha no provedor, longe da tela onde se consertaria.
    expect(resolveOwnerEmail({ email: 'contato@loja.com', notifications_email: '   ' })).toBe(
      'contato@loja.com',
    )
  })

  it('apara o que devolve, venha de onde vier', () => {
    expect(resolveOwnerEmail({ email: '  contato@loja.com  ' })).toBe('contato@loja.com')
    expect(resolveOwnerEmail({ email: '', notifications_email: ' adri@loja.com ' })).toBe('adri@loja.com')
  })

  it('os dois vazios devolvem string vazia — nunca `null`, nunca `undefined`', () => {
    // Quem chama pergunta "para onde mando?" e trata o vazio como "não mando". Um `null` a mais no
    // caminho seria um segundo jeito de escrever a mesma ausência.
    expect(resolveOwnerEmail({ email: '', notifications_email: '' })).toBe('')
    expect(resolveOwnerEmail({})).toBe('')
    expect(resolveOwnerEmail(null)).toBe('')
    expect(resolveOwnerEmail(undefined)).toBe('')
  })

  it('aceita `null` nos campos, que é o que o jsonb devolve para uma chave nula', () => {
    expect(resolveOwnerEmail({ email: null, notifications_email: null })).toBe('')
    expect(resolveOwnerEmail({ email: 'contato@loja.com', notifications_email: null })).toBe(
      'contato@loja.com',
    )
  })
})

describe('ownerContactMissing', () => {
  it('é verdadeiro só quando NÃO há para onde mandar', () => {
    expect(ownerContactMissing({ email: '', notifications_email: '' })).toBe(true)
    expect(ownerContactMissing({})).toBe(true)
    expect(ownerContactMissing({ email: 'contato@loja.com' })).toBe(false)
    expect(ownerContactMissing({ email: '', notifications_email: 'adri@loja.com' })).toBe(false)
  })

  it('é a MESMA régua de `resolveOwnerEmail`, nunca uma segunda comparação', () => {
    // Se ela divergisse, o painel avisaria "nenhum e-mail cadastrado" enquanto o motor mandaria o
    // aviso — ou o contrário. A propriedade é medida, não suposta.
    const casos = [
      { email: 'a@b.com', notifications_email: '' },
      { email: '', notifications_email: 'c@d.com' },
      { email: '  ', notifications_email: '  ' },
      { email: null, notifications_email: undefined },
      {},
    ]

    for (const caso of casos) {
      expect(ownerContactMissing(caso), JSON.stringify(caso)).toBe(resolveOwnerEmail(caso) === '')
    }
  })
})
