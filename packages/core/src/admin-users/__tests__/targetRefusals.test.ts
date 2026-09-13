import { describe, expect, it } from 'vitest'
import {
  type AccountHistory,
  accountHistoryRefusal,
  lastAdminRefusal,
  selfTargetRefusal,
} from '../refusals.ts'

// `USR-14`, `USR-15`, `USR-32`, `USR-33` e `USR-34` da feature 48.

const ADRI = '11111111-1111-1111-1111-111111111111'
const ANA = '22222222-2222-2222-2222-222222222222'

/**
 * Fixture com os quatro campos **divergindo** (`L-013`).
 *
 * Com os quatro no mesmo número, ler o campo errado produziria a mesma frase e nada acusaria. Os
 * valores são primos entre si de propósito: 7, 3, 5, 2.
 */
const HISTORICO_CHEIO: AccountHistory = {
  pedidos: 7,
  notasDePedido: 3,
  mudancasDeStatus: 5,
  notasDeCliente: 2,
}

const VAZIO: AccountHistory = {
  pedidos: 0,
  notasDePedido: 0,
  mudancasDeStatus: 0,
  notasDeCliente: 0,
}

describe('selfTargetRefusal — USR-14 / USR-34', () => {
  it('recusa remover o próprio acesso', () => {
    expect(selfTargetRefusal(ADRI, ADRI, 'remover')).toBe(
      'Você não pode remover o seu próprio acesso. Peça a outra pessoa com acesso ao painel.',
    )
  })

  it('recusa apagar a própria conta, com texto PRÓPRIO da ação', () => {
    // As duas frases são distintas de propósito: "remover" tem saída (outra pessoa faz), "apagar"
    // não. Colapsá-las numa só faria a recusa de apagar sugerir um caminho que não existe.
    expect(selfTargetRefusal(ADRI, ADRI, 'apagar')).toBe(
      'Você não pode apagar a sua própria conta pelo painel.',
    )
  })

  it('as duas frases são diferentes entre si', () => {
    expect(selfTargetRefusal(ADRI, ADRI, 'remover')).not.toBe(selfTargetRefusal(ADRI, ADRI, 'apagar'))
  })

  it('deixa passar quando o alvo é outra pessoa', () => {
    expect(selfTargetRefusal(ADRI, ANA, 'remover')).toBeNull()
    expect(selfTargetRefusal(ADRI, ANA, 'apagar')).toBeNull()
  })

  it('id ausente em qualquer lado não vira recusa por coincidência de vazio', () => {
    // Sem os dois primeiros ramos, `'' === ''` acusaria "é você mesma" sempre que os dois ids
    // faltassem — e a ação correta seria barrada com a frase errada.
    expect(selfTargetRefusal('', '', 'remover')).toBeNull()
    expect(selfTargetRefusal(ADRI, '', 'remover')).toBeNull()
    expect(selfTargetRefusal('', ADRI, 'remover')).toBeNull()
  })
})

describe('lastAdminRefusal — USR-15 / USR-34', () => {
  it('recusa quando só existe um acesso', () => {
    expect(lastAdminRefusal(1)).toBe(
      'Este é o único acesso ao painel. Crie outro antes de remover este — sem nenhum, ninguém entra.',
    )
  })

  it('deixa passar com dois acessos — a borda', () => {
    expect(lastAdminRefusal(2)).toBeNull()
  })

  it('recusa com zero — estado impossível pelo trigger, alcançável por restore de backup', () => {
    expect(lastAdminRefusal(0)).toBe(
      'Este é o único acesso ao painel. Crie outro antes de remover este — sem nenhum, ninguém entra.',
    )
  })

  it.each([NaN, Infinity, undefined as unknown as number])(
    'contagem inválida (%p) RECUSA — falha de verificação fecha, nunca abre',
    valor => {
      expect(lastAdminRefusal(valor)).toBe(
        'Não foi possível confirmar quantos acessos existem. Tente de novo.',
      )
    },
  )
})

describe('accountHistoryRefusal — USR-32: nomeia o que bloqueia, com número', () => {
  it('deixa passar quando não há rastro nenhum', () => {
    expect(accountHistoryRefusal(VAZIO)).toBeNull()
  })

  it('nomeia PEDIDOS com o número certo', () => {
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: 7 })).toContain('7 pedidos')
  })

  it('nomeia NOTAS EM PEDIDOS com o número certo', () => {
    expect(accountHistoryRefusal({ ...VAZIO, notasDePedido: 3 })).toContain('3 notas em pedidos')
  })

  it('nomeia MUDANÇAS DE STATUS com o número certo', () => {
    expect(accountHistoryRefusal({ ...VAZIO, mudancasDeStatus: 5 })).toContain(
      '5 mudanças de status',
    )
  })

  it('nomeia NOTAS SOBRE CLIENTES com o número certo', () => {
    expect(accountHistoryRefusal({ ...VAZIO, notasDeCliente: 2 })).toContain(
      '2 notas sobre clientes',
    )
  })

  it('o texto MUDA com a contagem — não é frase fixa', () => {
    // Sem este caso, um `return 'esta conta tem histórico'` passaria em todos os quatro acima se
    // eles usassem `toBeTruthy`. É o que separa "nomeia" de "recusa".
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: 7 })).not.toBe(
      accountHistoryRefusal({ ...VAZIO, pedidos: 8 }),
    )
  })

  it('enumera os QUATRO juntos, na ordem, com vírgula e "e" no fim', () => {
    expect(accountHistoryRefusal(HISTORICO_CHEIO)).toBe(
      'Esta conta tem 7 pedidos, 3 notas em pedidos, 5 mudanças de status e 2 notas sobre clientes no histórico da loja, e apagá-la deixaria esses registros sem dono. Use “Remover do painel”: o acesso sai e o histórico fica.',
    )
  })

  it('oferece “Remover do painel” como saída — a metade acionável da recusa', () => {
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: 1 })).toContain('Remover do painel')
  })
})

describe('accountHistoryRefusal — singular e plural', () => {
  it.each([
    ['pedidos' as const, 1, '1 pedido'],
    ['notasDePedido' as const, 1, '1 nota em pedido'],
    ['mudancasDeStatus' as const, 1, '1 mudança de status'],
    ['notasDeCliente' as const, 1, '1 nota sobre cliente'],
  ])('%s no singular sai como "%s"', (campo, valor, esperado) => {
    expect(accountHistoryRefusal({ ...VAZIO, [campo]: valor })).toContain(esperado)
  })

  it('dois itens são ligados por "e", sem vírgula', () => {
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: 1, notasDeCliente: 2 })).toContain(
      '1 pedido e 2 notas sobre clientes',
    )
  })
})

describe('accountHistoryRefusal — entradas degeneradas', () => {
  it('contagem negativa não entra na frase', () => {
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: -3 })).toBeNull()
  })

  it('contagem não finita não entra na frase', () => {
    expect(accountHistoryRefusal({ ...VAZIO, pedidos: NaN })).toBeNull()
  })

  it('campo ausente é tratado como zero, sem lançar', () => {
    expect(accountHistoryRefusal({} as AccountHistory)).toBeNull()
  })
})
