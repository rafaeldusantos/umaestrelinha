// "Ainda dá para gerar um PIX novo para este pedido?" — a janela de 7 dias (feature `59`,
// `PEN-03..05`).
//
// **Irmã** de `podePagarComPix` (`entities/order/lib`), nunca alteração dele (`PEN-08`). Aquela
// pergunta é "o PIX deste pedido ainda está em aberto?" (`payment_status = 'pending'`); esta é "o
// PIX deste pedido morreu — expirado ou recusado — e ainda vale oferecer outro?". Juntar as duas
// num predicado só faria a régua dos 7 dias vazar para o pendente, ou o contrário.
//
// **É regra de OFERTA, não de autorização**, e a assimetria é deliberada: o servidor aceita gerar
// código para `expired`/`rejected` sem prazo (`RETRYABLE_STATUSES`), e a rota
// `/pedido/:id/pagamento` continua mais larga que as telas que levam até ela. Passados 7 dias,
// preço e prazo podem ter mudado — por isso a tela troca o botão pelo WhatsApp. Um relógio de
// aparelho errado desloca a oferta, e esse limite está aceito na spec.
//
// Mora em `core` porque a conta e o detalhe do pedido fazem a mesma pergunta. O único import é o
// recorte "o pedido já passou pelo Pago" (`manualPayment.ts`), com `.ts` explícito: o diretório é
// alcançado pelo Deno.
//
// A família tem quatro ramos que nunca se sobrepõem: PIX novo (dentro da janela),
// o informativo do CARTÃO (`cartaoParaResolver` — a loja não refaz cartão nem troca o meio sozinha;
// a cliente fala com a Adri pelo WhatsApp), o pagamento a combinar (`pagamentoACombinar` — o pedido
// gravado fora da loja, que ela nunca cobrou) e o pagamento perdido (PIX fora da janela, e os meios
// que não são PIX nem cartão). E nenhum deles existe num pedido que a loja já avançou à mão para
// Pago ou além (`pedidoAguardaPagamento`).

import { CARD_METHODS, cartaoExpiradoSemResposta } from './cardAttempt.ts'
import { reachedOnlyWhenPaid } from './manualPayment.ts'

/** O limite, em dias corridos depois de `orders.created_at`. Decisão do usuário, 2026-10-04. */
export const REPIX_WINDOW_DAYS = 7

const DIA_MS = 24 * 60 * 60 * 1000

export interface RepixInput {
  payment_method: string | null
  payment_status: string | null
  status: string | null
  paid_at?: string | null
  created_at: string
  /**
   * A tentativa de cobrança no Mercado Pago. Num pedido de cartão pendente, é ela que separa "a
   * cobrança foi feita e não teve resposta" (informativo) de "o pedido foi criado e nunca cobrado",
   * abandonado no checkout (nada a mostrar).
   */
  mp_order_id?: string | null
  /** O último detalhe do Mercado Pago — separa a cobrança ainda em análise da que falhou. */
  mp_status_detail?: string | null
  /** O pagamento dentro da order do Mercado Pago — também marca uma cobrança feita pela loja. */
  mp_payment_id?: string | null
  /** O pedido montado pelo painel: o preço é o da proposta, calculado pela loja. */
  proposal_id?: string | null
  /**
   * A cobrança travada na primeira cobrança (`order_charge_locks`). Só o servidor a lê (a tabela não
   * existe para a cliente); a tela não a passa.
   */
  charge_locked?: boolean
}

/**
 * O pedido ainda aguarda pagamento: não cancelado, sem `paid_at`, e não avançado à mão para Pago ou
 * além. É a condição comum de toda oferta de pagar — PIX pendente, PIX novo, o informativo do
 * cartão e o pagamento perdido.
 */
export const pedidoAguardaPagamento = (
  o: { status?: string | null; paid_at?: string | null } | null | undefined,
): boolean => !!o && o.status !== 'cancelled' && !o.paid_at && !reachedOnlyWhenPaid(o.status)

/** Os dois estados em que o pagamento morreu e pode ser refeito. */
const MORTOS = ['expired', 'rejected']

/** `created_at + 7 dias` — o "até 8 de outubro" da copy. `null` quando a data é ilegível. */
export function repixDeadline(o: Pick<RepixInput, 'created_at'> | null | undefined): Date | null {
  const t = new Date(o?.created_at ?? '').getTime()
  if (!o?.created_at || Number.isNaN(t)) return null
  return new Date(t + REPIX_WINDOW_DAYS * DIA_MS)
}

/** O pagamento morreu e o pedido segue de pé: a família das duas funções abaixo. */
const pagamentoMorto = (o: RepixInput | null | undefined): boolean =>
  pedidoAguardaPagamento(o) && MORTOS.includes(o.payment_status ?? '')

const preenchido = (v: string | null | undefined): boolean => (v ?? '').trim() !== ''

/**
 * `true` quando o pagamento morreu num pedido que a loja nunca cobrou: sem order nem pagamento do
 * Mercado Pago, sem proposta montada pelo painel e sem cobrança travada. É o pedido gravado fora da
 * loja (importado, ou escrito direto no banco): o total gravado nele não é um valor que a loja
 * calculou, e as policies de INSERT de `orders` seguem abertas (`BL-030`) — um pedido assim é
 * indistinguível de um forjado. A loja não oferece pagar de novo, e o servidor recusa a cobrança.
 */
export function pagamentoSemCobrancaDaLoja(o: RepixInput | null | undefined): boolean {
  if (!pagamentoMorto(o)) return false
  return (
    !preenchido(o.mp_order_id) &&
    !preenchido(o.mp_payment_id) &&
    !preenchido(o.proposal_id) &&
    o.charge_locked !== true
  )
}

/**
 * `true` quando a tela mostra que a Adri combina o pagamento, com o WhatsApp no lugar do botão e sem
 * o valor: o pagamento sem cobrança da loja (`pagamentoSemCobrancaDaLoja`) que não é de cartão — o
 * cartão tem o informativo próprio (`cartaoParaResolver`).
 */
export function pagamentoACombinar(o: RepixInput | null | undefined): boolean {
  return pagamentoSemCobrancaDaLoja(o) && !cartaoParaResolver(o)
}

/**
 * `true` quando a tela mostra o informativo do cartão — falar com a Adri pelo WhatsApp para resolver
 * o pagamento: cartão recusado ou expirado, ou pendente COM tentativa de cobrança (`mp_order_id`).
 * O cartão pendente sem tentativa é o pedido abandonado no checkout, e não aparece. A loja não
 * oferece, por conta própria, pagar de novo por cartão nem trocar o meio para PIX.
 */
export function cartaoParaResolver(o: RepixInput | null | undefined): boolean {
  if (!pedidoAguardaPagamento(o) || !CARD_METHODS.includes(o.payment_method ?? '')) return false
  if (MORTOS.includes(o.payment_status ?? '')) return true
  return o.payment_status === 'pending' && (o.mp_order_id ?? '').trim() !== ''
}

/**
 * `true` quando a tela deve oferecer "Gerar novo PIX": PIX expirado ou recusado, pedido não
 * cancelado nem pago, e `agora` até 7 dias depois de `created_at` (inclusive).
 */
export function podeGerarNovoPix(o: RepixInput | null | undefined, agora: Date): boolean {
  if (!pagamentoMorto(o) || o.payment_method !== 'pix' || pagamentoSemCobrancaDaLoja(o)) return false
  const prazo = repixDeadline(o)
  return prazo !== null && agora.getTime() <= prazo.getTime()
}

/**
 * `true` quando o pagamento morreu e a tela NÃO oferece refazê-lo: PIX fora da janela, ou um meio que
 * não é PIX nem cartão. É o estado "O pagamento não foi concluído", com o WhatsApp no lugar do botão.
 * Nunca verdadeira junto de `podeGerarNovoPix` nem de `cartaoParaResolver` — o cartão tem o
 * informativo próprio.
 */
export function pagamentoPerdido(o: RepixInput | null | undefined, agora: Date): boolean {
  return pagamentoMorto(o) && !podeGerarNovoPix(o, agora) && !cartaoParaResolver(o) && !pagamentoACombinar(o)
}

/** O título do pagamento a combinar (`pagamentoACombinar`), na conta e no detalhe do pedido. */
export const ARRANGE_PAYMENT_TITLE = 'O pagamento deste pedido é combinado comigo'

/** Os dois títulos do informativo do cartão. */
export const CARD_CONTACT_TITLES = {
  semResposta: 'O pagamento com cartão ainda não foi confirmado',
  naoConcluido: 'O pagamento com cartão não foi concluído',
} as const

/**
 * O título do informativo do cartão (`cartaoParaResolver`): "ainda não foi confirmado" enquanto o
 * meio de pagamento não deu a resposta final — a cobrança pendente, ou expirada só pelo relógio da
 * loja com o detalhe ainda em análise (`cartaoExpiradoSemResposta`) —; "não foi concluído" na recusa
 * e no expirado sem análise em curso.
 */
export function cardContactTitle(o: RepixInput | null | undefined): string {
  const semResposta = o?.payment_status === 'pending' || cartaoExpiradoSemResposta(o)
  return semResposta ? CARD_CONTACT_TITLES.semResposta : CARD_CONTACT_TITLES.naoConcluido
}
