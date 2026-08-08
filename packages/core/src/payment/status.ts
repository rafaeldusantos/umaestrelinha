// Status de pagamento — domínio puro (roda em Node, Deno e browser; sem imports).
// PAY-04: mapa explícito de transições; approved nunca regride.
// PAY-02: mensagens amigáveis pt-BR mapeadas de status_detail do Mercado Pago.

// Espelha PaymentStatus de @estrelinha/supabase (duplicado aqui para o módulo ser
// autocontido — a edge function Deno importa este arquivo por caminho relativo).
export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'expired'
  | 'cancelled'

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled', 'expired'],
  rejected: ['pending', 'approved'],
  expired: ['approved'],
  approved: ['refunded'],
  refunded: [],
  cancelled: [],
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

// STA-01: UNIÃO dos dois vocabulários do MP, não substituição.
// `canceled` (Orders, um L) e `cancelled` (interno, dois L) diferem por uma letra, então as duas
// chaves precisam existir de todo modo; manter as legadas custa nada e faz o webhook degradar com
// sanidade em vez de logar desconhecido. Status fora do mapa → null (ignora e loga).
const MP_STATUS_MAP: Record<string, PaymentStatus> = {
  // --- API de Orders (/v1/orders) ---
  // Lista conferida na doc oficial de "Status da order" (online): created, processed, processing,
  // action_required, canceled, charged_back, expired, failed, refunded. `at_terminal` é do Point
  // presencial e NÃO ocorre em online.
  processed: 'approved',
  failed: 'rejected',
  canceled: 'cancelled',
  expired: 'expired',
  created: 'pending',
  // Cuidado com a homonímia: no Orders o status é `processing` (com status_detail `in_process`);
  // na Payments API `in_process` era o próprio status. São strings distintas e as duas precisam
  // estar no mapa — sem esta linha, uma order em processamento cairia em null e o webhook
  // ignoraria a transição, deixando o pedido preso.
  processing: 'pending',
  // PIX aguardando transferência (STA-02). O desvio de CARTÃO em action_required é decidido por
  // `resolveCardOutcome` (orders.ts), que conhece o método — este mapa não conhece.
  action_required: 'pending',
  // --- API de Pagamentos (/v1/payments), legado ---
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'refunded',
  pending: 'pending',
  in_process: 'pending',
}

/** Mapeia o status do Mercado Pago para o status interno. Desconhecido → null (ignorar). */
export function mapMpStatus(mpStatus: string): PaymentStatus | null {
  return MP_STATUS_MAP[mpStatus] ?? null
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a data de validade do cartão.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança (CVV) do cartão.',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
  cc_rejected_call_for_authorize: 'Autorize o pagamento junto à operadora do cartão.',
  cc_rejected_card_disabled: 'Cartão desativado. Entre em contato com a operadora.',
  cc_rejected_duplicated_payment:
    'Você já fez um pagamento com esse valor. Se precisar pagar de novo, use outro cartão.',
  cc_rejected_high_risk: 'Pagamento recusado pela análise de segurança. Tente outro método.',
  cc_rejected_max_attempts: 'Limite de tentativas atingido. Tente novamente mais tarde.',
  cc_rejected_other_reason: 'O cartão recusou o pagamento. Tente outro cartão.',
  // --- Vocabulário da API de Orders (D4) ---
  // Medido no T16: numa recusa de cartão o `status_detail` do payment é `rejected_by_issuer`, SEM o
  // prefixo `cc_`. A Assumption nº3 da spec ("a família cc_rejected_* se preserva") está refutada.
  rejected_by_issuer: 'O banco emissor recusou o pagamento. Tente outro cartão.',
}

const FALLBACK_MESSAGE = 'Pagamento recusado. Tente novamente ou use outro método de pagamento.'

/**
 * Ponte de vocabulário entre as duas APIs (D4): o Orders devolve `rejected_<motivo>` onde a Payments
 * API devolvia `cc_rejected_<motivo>`. Só a tradução do prefixo — nenhuma chave nova é inventada,
 * porque o único detalhe realmente OBSERVADO em sandbox é `rejected_by_issuer` (explícito acima).
 * Assim `rejected_insufficient_amount` reaproveita a mensagem já escrita, e um motivo que não tem
 * par cai no fallback em vez de mentir.
 */
const ORDERS_PREFIX = 'rejected_'
const PAYMENTS_PREFIX = 'cc_rejected_'

/** Mensagem amigável pt-BR para um status_detail do Mercado Pago. */
export function friendlyMessage(statusDetail: string | null | undefined): string {
  if (!statusDetail) return FALLBACK_MESSAGE
  const direct = FRIENDLY_MESSAGES[statusDetail]
  if (direct) return direct
  if (statusDetail.startsWith(ORDERS_PREFIX)) {
    const bridged = `${PAYMENTS_PREFIX}${statusDetail.slice(ORDERS_PREFIX.length)}`
    return FRIENDLY_MESSAGES[bridged] ?? FALLBACK_MESSAGE
  }
  return FALLBACK_MESSAGE
}
