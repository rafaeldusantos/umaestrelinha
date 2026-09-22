import { describe, expect, it } from 'vitest'

import { orderPaymentPath, podePagarComPix, type PixPayableOrder } from '../podePagarComPix'

/**
 * "Este pedido ainda pode ser pago com PIX?" — `PIX-P3-01`, `PIX-P3-03`, `PIX-P3-04`.
 *
 * ---------------------------------------------------------------------------------------------
 * Por que este arquivo existe
 * ---------------------------------------------------------------------------------------------
 *
 * O módulo foi extraído **exatamente** por ser regra pura com dois leitores — `/pedido/:id` e a
 * lista de `/conta` — e nasceu **sem arquivo de teste**. As duas suítes de página cobrem
 * `payment_method`, `paid_at`, `cancelled` e `pending` contra `approved`, e **nenhuma cobre
 * `rejected` nem `refunded`**: alargar a comparação para `!== 'approved'` deixava as duas verdes
 * (mutante M12 da verificação independente).
 *
 * O comentário do próprio módulo diz que o literal `pending` é deliberado — *"anunciar o caminho de
 * pagamento de um pedido reembolsado ou estornado seria convidar a cliente a pagar duas vezes"* —, e
 * a afirmação não tinha asserção nenhuma. Comentário que afirma sensibilidade inexistente é pior que
 * comentário nenhum (`51`), porque encerra a investigação.
 *
 * ---------------------------------------------------------------------------------------------
 * A ASSIMETRIA com a rota, que este arquivo preserva de propósito
 * ---------------------------------------------------------------------------------------------
 *
 * `podePagarComPix` responde *"esta tela deve OFERECER o caminho de pagar?"*, e é estreita.
 * `orderPaymentPath` produz o endereço de uma rota cuja pergunta é outra — *"esta rota pode emitir
 * uma cobrança para este pedido?"* —, e lá a régua é **mais larga**: um pedido `rejected` não é
 * anunciado por tela nenhuma, e quem chegar nele pelo endereço tem de conseguir gerar um código
 * novo. Quem recusa na rota é `OrderPaymentPage` (`PIX-P1-06`: pago, cancelado ou cartão), e ela
 * **não** chama este predicado. Apertar a rota para casar com ele trancaria a cliente do lado de
 * fora do próprio pedido; afrouxar este predicado para casar com a rota faria a loja convidar quem
 * já foi reembolsado a pagar de novo.
 *
 * Os dois vereditos são medidos lado a lado no último bloco, para a divergência ser **declarada** em
 * vez de acidental.
 */

/** Um pedido pendente de PIX — a linha que a AC descreve. A partir dele, uma dimensão por vez. */
const pendenteDePix = (patch: Partial<PixPayableOrder> = {}): PixPayableOrder => ({
  payment_method: 'pix',
  payment_status: 'pending',
  status: 'pending',
  paid_at: null,
  ...patch,
})

describe('podePagarComPix — o pedido que a tela deve OFERECER pagar (PIX-P3-01)', () => {
  it('pendente, de PIX, não pago e não cancelado', () => {
    expect(podePagarComPix(pendenteDePix())).toBe(true)
  })

  it('a lista de `/conta` não traz `paid_at`, e a ausência não é um "não"', () => {
    // O campo é opcional de propósito: `undefined` é "não sei", e as duas telas leem tipos
    // diferentes do mesmo pedido. Sem este caso, `!order.paid_at` poderia virar
    // `order.paid_at === null` e a conta pararia de oferecer o caminho de volta a ninguém.
    const daConta: PixPayableOrder = {
      payment_method: 'pix',
      payment_status: 'pending',
      status: 'pending',
    }

    expect(podePagarComPix(daConta)).toBe(true)
  })
})

describe('podePagarComPix — o literal `pending` não é `!== approved` (PIX-P3-03)', () => {
  /**
   * **O conjunto inteiro, e não só o par fácil.**
   *
   * `approved` sozinho é verdadeiro nos dois mundos: `'approved' !== 'approved'` também é `false`.
   * Quem distingue a régua escrita da régua frouxa são `rejected`, `refunded` e `in_process` — os
   * três em que "não é aprovado" e "é pendente" discordam.
   */
  it.each([
    ['approved', 'já foi pago: um segundo QR seria uma segunda cobrança'],
    ['rejected', 'recusado não é pendente — a retentativa nasce de outro pedido'],
    ['refunded', 'reembolsado: convidar a pagar de novo é pedir o dinheiro de volta'],
    ['in_process', 'em análise: a cobrança já saiu e ainda não tem veredito'],
    ['cancelled', 'cancelado como status de pagamento também não é pendente'],
    ['', 'vazio não é pendente'],
  ])('`payment_status = %s` NÃO oferece o caminho — %s', (status) => {
    expect(podePagarComPix(pendenteDePix({ payment_status: status }))).toBe(false)
  })

  it('e `pending` continua sendo o único que oferece — o par que fecha a tabela', () => {
    // Sem ele, uma régua que recusasse TUDO passaria nos seis casos acima.
    expect(podePagarComPix(pendenteDePix({ payment_status: 'pending' }))).toBe(true)
  })

  it('`payment_status` ausente ou nulo não oferece nada', () => {
    expect(podePagarComPix(pendenteDePix({ payment_status: null }))).toBe(false)
    expect(podePagarComPix({ payment_method: 'pix', status: 'pending' })).toBe(false)
  })
})

describe('podePagarComPix — as outras três dimensões, uma por vez', () => {
  it('cartão nunca — o Brick vive no checkout, e o QR abriria uma segunda cobrança', () => {
    expect(podePagarComPix(pendenteDePix({ payment_method: 'card' }))).toBe(false)
  })

  it('método ausente ou nulo também não', () => {
    expect(podePagarComPix(pendenteDePix({ payment_method: null }))).toBe(false)
    expect(podePagarComPix({ payment_status: 'pending', status: 'pending' })).toBe(false)
  })

  it('pedido cancelado não — cobrar por ele seria cobrar por nada', () => {
    expect(podePagarComPix(pendenteDePix({ status: 'cancelled' }))).toBe(false)
  })

  it('outros `status` do pedido não interferem — só `cancelled` recorta', () => {
    // O par inverso. Sem ele, uma régua que exigisse `status === 'pending'` passaria no caso acima
    // e esconderia o botão de um pedido `paid` cujo pagamento ainda está pendente — que é o estado
    // real de um dos pedidos de produção (registrado no `design.md` desta feature).
    expect(podePagarComPix(pendenteDePix({ status: 'paid' }))).toBe(true)
    expect(podePagarComPix(pendenteDePix({ status: null }))).toBe(true)
  })

  it('pedido com `paid_at` não — é a mesma resposta por outro caminho', () => {
    expect(podePagarComPix(pendenteDePix({ paid_at: '2026-09-22T12:00:00Z' }))).toBe(false)
  })

  it('pedido ausente é `false`, nunca um lançamento', () => {
    // As duas telas chamam isto com o dado ainda carregando.
    expect(podePagarComPix(null)).toBe(false)
    expect(podePagarComPix(undefined)).toBe(false)
  })
})

describe('orderPaymentPath — o endereço, montado num lugar só (PIX-P3-04)', () => {
  it('é `/pedido/<id>/pagamento`', () => {
    expect(orderPaymentPath('ord-1')).toBe('/pedido/ord-1/pagamento')
  })

  it('o id entra inteiro, inclusive um UUID — que é o que a rota recebe de verdade', () => {
    expect(orderPaymentPath('9f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8')).toBe(
      '/pedido/9f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8/pagamento',
    )
  })

  it('é caminho absoluto — relativo mudaria de destino conforme a tela que linka', () => {
    expect(orderPaymentPath('ord-1').startsWith('/pedido/')).toBe(true)
    expect(orderPaymentPath('ord-1').endsWith('/pagamento')).toBe(true)
  })
})

describe('a assimetria entre a tela e a ROTA é declarada, não acidental', () => {
  /**
   * A régua da rota (`PIX-P1-06`, em `OrderPaymentPage`), escrita aqui como predicado **para ser
   * comparada** com a do botão. Ela não é importada porque não existe como função: ela é o `if` da
   * página, e é lá que ela tem asserção própria. O que este bloco prova é a **relação** entre as
   * duas, que nenhum dos dois arquivos pode provar sozinho.
   */
  const aRotaRecusa = (o: PixPayableOrder) =>
    !!o.paid_at || o.status === 'cancelled' || o.payment_method !== 'pix'

  it('o que a TELA oferece, a ROTA aceita — senão o botão levaria a um redirect', () => {
    const oferecido = pendenteDePix()

    expect(podePagarComPix(oferecido)).toBe(true)
    expect(aRotaRecusa(oferecido)).toBe(false)
  })

  it('mas a ROTA é mais LARGA: `rejected` e `refunded` não são anunciados e são pagáveis', () => {
    // É a assimetria inteira, num caso. Apertar a rota para casar com o botão trancaria a cliente
    // do lado de fora do próprio pedido; afrouxar o botão para casar com a rota convidaria quem já
    // foi reembolsado a pagar de novo.
    for (const status of ['rejected', 'refunded', 'in_process']) {
      const pedido = pendenteDePix({ payment_status: status })

      expect(podePagarComPix(pedido)).toBe(false)
      expect(aRotaRecusa(pedido)).toBe(false)
    }
  })

  it('e os três que a rota recusa não são oferecidos por tela nenhuma', () => {
    for (const pedido of [
      pendenteDePix({ paid_at: '2026-09-22T12:00:00Z' }),
      pendenteDePix({ status: 'cancelled' }),
      pendenteDePix({ payment_method: 'card' }),
    ]) {
      expect(aRotaRecusa(pedido)).toBe(true)
      expect(podePagarComPix(pedido)).toBe(false)
    }
  })
})
