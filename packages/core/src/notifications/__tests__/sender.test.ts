import { describe, expect, it } from 'vitest'

import { isValidFrom } from '../../../../../supabase/functions/send-notification/render/layout.ts'
import { DEFAULT_SENDER_FROM, senderFrom } from '../sender.ts'

/**
 * `senderFrom` — a composição do remetente dos transacionais (feature `52`, T8).
 *
 * A régua que importa não é "a string sai bonita": é que **tudo o que esta função produz passa em
 * `isValidFrom`**, que é a porta que o motor usa antes de enviar (`CFG-03`). Por isso quase todo
 * caso aqui assere o par — o formato **e** o veredito do validador real. Asserir só o formato
 * deixaria as duas funções divergirem sem nada quebrar, que é o defeito 01 no tamanho de uma
 * string.
 */
describe('senderFrom — o par com isValidFrom', () => {
  it('nome + endereço vira `Nome <e@x>` e passa no validador do motor', () => {
    const from = senderFrom('Adri - Uma Estrelinha', 'adri@loja.umaestrelinha.com.br')
    expect(from).toBe('Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>')
    expect(isValidFrom(from)).toBe(true)
  })

  it('sem nome, devolve o endereço nu — que também é remetente válido', () => {
    const from = senderFrom('', 'adri@loja.umaestrelinha.com.br')
    expect(from).toBe('adri@loja.umaestrelinha.com.br')
    expect(isValidFrom(from)).toBe(true)
  })

  it('apara espaço dos dois campos', () => {
    expect(senderFrom('  Adri  ', '  adri@loja.umaestrelinha.com.br  ')).toBe(
      'Adri <adri@loja.umaestrelinha.com.br>',
    )
  })

  it('nulo e indefinido são tratados como ausência, não como "null"', () => {
    expect(senderFrom(null, undefined)).toBe('')
    expect(senderFrom(undefined, 'adri@loja.umaestrelinha.com.br')).toBe(
      'adri@loja.umaestrelinha.com.br',
    )
  })
})

describe('senderFrom — o display name com caractere especial', () => {
  it('nome com VÍRGULA sai entre aspas, e é isso que o validador exige', () => {
    const from = senderFrom('Adri, da Uma Estrelinha', 'adri@loja.umaestrelinha.com.br')
    expect(from).toBe('"Adri, da Uma Estrelinha" <adri@loja.umaestrelinha.com.br>')
    expect(isValidFrom(from)).toBe(true)
  })

  it('o SENSOR da régua acima: sem as aspas, o validador do motor RECUSA', () => {
    // É o par que prova que a citação não é enfeite. Se `senderFrom` parar de citar, o motor passa
    // a recusar TODO envio com `invalid_from` — e este caso cai antes de isso chegar a produção.
    expect(isValidFrom('Adri, da Uma Estrelinha <adri@loja.umaestrelinha.com.br>')).toBe(false)
  })

  it('aspas e contrabarra dentro do nome são escapadas', () => {
    const from = senderFrom('Adri "da" \\Loja', 'adri@loja.umaestrelinha.com.br')
    expect(from).toBe('"Adri \\"da\\" \\\\Loja" <adri@loja.umaestrelinha.com.br>')
    expect(isValidFrom(from)).toBe(true)
  })

  it('nome com hífen NÃO ganha aspas — só os specials do RFC 5322 pedem', () => {
    expect(senderFrom('Adri - Uma Estrelinha', 'a@b.co')).toBe('Adri - Uma Estrelinha <a@b.co>')
  })
})

describe('senderFrom — o que ela RECUSA, e por quê', () => {
  it('endereço ausente devolve vazio, e o vazio reprova no motor', () => {
    expect(senderFrom('Uma Estrelinha', '')).toBe('')
    expect(isValidFrom('')).toBe(false)
  })

  /**
   * O caso que motivou o split. Alguém migra e cola o valor antigo — combinado — no campo do
   * ENDEREÇO. Sem esta recusa, a composição produziria `Nome <Nome <e@x>>` e o Resend devolveria
   * 422 em todo e-mail, que é o `BUG-20260728` de volta com outra roupa.
   */
  it('o valor ANTIGO combinado no campo do endereço devolve vazio', () => {
    expect(senderFrom('Uma Estrelinha', 'Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>')).toBe('')
    expect(senderFrom('', 'Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>')).toBe('')
  })

  it.each([
    ['sem arroba', 'adri.loja.com.br'],
    ['sem domínio de topo', 'adri@loja'],
    ['com espaço', 'adri @loja.com.br'],
    ['dois arrobas', 'adri@a@loja.com.br'],
    ['com vírgula', 'adri@loja,com.br'],
  ])('endereço %s devolve vazio', (_rotulo, endereco) => {
    expect(senderFrom('Uma Estrelinha', endereco)).toBe('')
  })
})

describe('DEFAULT_SENDER_FROM', () => {
  it('é o remetente de caixa-de-areia, e é válido — o problema dele não é o formato', () => {
    expect(DEFAULT_SENDER_FROM).toContain('onboarding@resend.dev')
    expect(isValidFrom(DEFAULT_SENDER_FROM)).toBe(true)
  })
})
