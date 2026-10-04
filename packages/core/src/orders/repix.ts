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
// Mora em `core` porque a conta e o detalhe do pedido fazem a mesma pergunta. Zero import, de
// propósito: o diretório é alcançado pelo Deno.

/** O limite, em dias corridos depois de `orders.created_at`. Decisão do usuário, 2026-10-04. */
export const REPIX_WINDOW_DAYS = 7

const DIA_MS = 24 * 60 * 60 * 1000

export interface RepixInput {
  payment_method: string | null
  payment_status: string | null
  status: string | null
  paid_at?: string | null
  created_at: string
}

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
  !!o && MORTOS.includes(o.payment_status ?? '') && o.status !== 'cancelled' && !o.paid_at

/**
 * `true` quando a tela deve oferecer "Gerar novo PIX": PIX expirado ou recusado, pedido não
 * cancelado nem pago, e `agora` até 7 dias depois de `created_at` (inclusive).
 */
export function podeGerarNovoPix(o: RepixInput | null | undefined, agora: Date): boolean {
  if (!pagamentoMorto(o) || o.payment_method !== 'pix') return false
  const prazo = repixDeadline(o)
  return prazo !== null && agora.getTime() <= prazo.getTime()
}

/**
 * `true` quando o pagamento morreu e a tela NÃO oferece refazê-lo: PIX fora da janela, ou cartão
 * recusado (cartão não se refaz pela loja — `AD-042`). É o estado "O pagamento não foi concluído",
 * com o WhatsApp no lugar do botão. Nunca verdadeira junto de `podeGerarNovoPix`.
 */
export function pagamentoPerdido(o: RepixInput | null | undefined, agora: Date): boolean {
  return pagamentoMorto(o) && !podeGerarNovoPix(o, agora)
}
