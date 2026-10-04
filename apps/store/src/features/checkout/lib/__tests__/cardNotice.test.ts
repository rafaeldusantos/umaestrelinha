import { describe, expect, it } from 'vitest'

import { DECLINED_TITLE, UNANSWERED_TITLE, declinedNotice, unansweredNotice } from '../cardNotice'

/**
 * O que o aviso do cartão pode AFIRMAR — board `58 M`.
 *
 * A régua inteira é uma assimetria: recusa respondida permite dizer "nada foi cobrado"; falta de
 * resposta NÃO permite. Um aviso que dissesse a mesma frase nos dois casos estaria certo na recusa
 * e afirmando o que a loja não mediu no timeout.
 */

describe('declinedNotice — o banco respondeu e recusou', () => {
  it('título fixo, motivo amigável e a linha do pedido com "nada foi cobrado"', () => {
    const aviso = declinedNotice('cc_rejected_insufficient_amount', '0244')

    expect(aviso.title).toBe(DECLINED_TITLE)
    expect(aviso.message).toBe('Saldo insuficiente no cartão.')
    expect(aviso.footer).toBe('Pedido #0244 · guardado, e nada foi cobrado')
  })

  it('sem número de pedido, ainda diz que nada foi cobrado — é verdade do mesmo jeito', () => {
    expect(declinedNotice('cc_rejected_other_reason').footer).toBe('Nada foi cobrado.')
  })

  it('o número já com `#` não ganha um segundo', () => {
    expect(declinedNotice(null, '#0244').footer).toBe('Pedido #0244 · guardado, e nada foi cobrado')
  })
})

describe('unansweredNotice — o banco não respondeu', () => {
  it('a mensagem é a do erro, e a linha do pedido NÃO fala de cobrança', () => {
    const aviso = unansweredNotice('O pagamento demorou demais para responder.', '0244')

    expect(aviso.title).toBe(UNANSWERED_TITLE)
    expect(aviso.message).toBe('O pagamento demorou demais para responder.')
    expect(aviso.footer).toBe('Pedido #0244 · continua guardado')
    expect(`${aviso.title} ${aviso.message} ${aviso.footer}`).not.toMatch(/cobrad/)
  })

  it('sem pedido, não há linha de baixo', () => {
    expect(unansweredNotice('Falhou.').footer).toBeNull()
  })
})
