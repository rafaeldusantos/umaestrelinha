// "Em que pé está este pedido?" — o selo da situação, com UM dono (feature `59`, `SIT-01..13`).
//
// Nenhuma coluna sozinha responde a pergunta. Pagar **não** muda `orders.status` (só
// `payment_status`), o material tem a própria máquina (`material_status`), e o envio é `status`.
// A conta antiga lia só `status`, conhecia 5 dos 6 valores e mandava o resto para o padrão — um
// pedido pago aparecia "Pendente". A régua abaixo junta as três colunas, e **a primeira regra que
// casar vence**, na ordem escrita na spec.
//
// Mora em `core` porque três telas da loja a leem (a lista da conta, o detalhe e as pendências) e
// porque o segundo consumidor fora da loja é previsível (o e-mail, o painel "o que a cliente vê").
// Escrita duas vezes, ela divergiria sem nada quebrar — que é o defeito que abriu esta feature.
//
// ⚠️ Este arquivo NÃO importa nada, de propósito: o diretório é alcançado pelo Deno por caminho
// relativo (via `format.ts`), e zero import é a forma de não ter como errar a extensão.

export type SituationKey =
  | 'cancelled'
  | 'delivered'
  | 'shipped'
  | 'refunded'
  | 'awaiting_material'
  | 'in_production'
  | 'pix_expired'
  | 'payment_rejected'
  | 'awaiting_payment'

/** A família de cor do selo. As cores em si são tokens da loja; aqui mora só a classificação. */
export type SituationTone = 'neutral' | 'done' | 'progress' | 'wait' | 'alert'

export interface SituationInput {
  status: string | null
  payment_status: string | null
  material_status?: string | null
  delivery_estimate_max?: string | null
}

export interface Situation {
  key: SituationKey
  label: string
  tone: SituationTone
}

export interface StatusEvent {
  status: string
  at: string
}

export const SITUATION_LABELS: Record<SituationKey, string> = {
  cancelled: 'Cancelado',
  delivered: 'Entregue',
  shipped: 'A caminho',
  refunded: 'Reembolsado',
  awaiting_material: 'Aguardando seu material',
  in_production: 'Em produção',
  pix_expired: 'PIX expirado',
  payment_rejected: 'Pagamento recusado',
  awaiting_payment: 'Aguardando pagamento',
}

/**
 * A régua dos selos do Paper: areia para o que terminou sem joia (cancelado, reembolsado), verde-
 * musgo para entregue, serenity para o que anda, ouro claro para o que espera, rosa-terra para
 * pagamento com problema.
 */
export const SITUATION_TONES: Record<SituationKey, SituationTone> = {
  cancelled: 'neutral',
  refunded: 'neutral',
  delivered: 'done',
  shipped: 'progress',
  in_production: 'progress',
  awaiting_material: 'wait',
  awaiting_payment: 'wait',
  pix_expired: 'alert',
  payment_rejected: 'alert',
}

/** Os vocabulários do banco (`orders_status_check` e `orders_payment_status_check`). */
const STATUSES = ['pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['pending', 'approved', 'rejected', 'refunded', 'expired', 'cancelled']

/** Os dois estados do material em que a joia espera a cliente. */
const MATERIAL_PENDENTE = ['aguardando_material', 'material_enviado']

/**
 * Valor presente e fora do vocabulário. **Ausência não é "fora do vocabulário"**: `null` é coluna
 * não preenchida, e as regras seguem normalmente; só um texto que o banco não conhece manda o
 * pedido para o padrão (`SIT-10`).
 */
const foraDoVocabulario = (valor: unknown, vocabulario: string[]): boolean =>
  valor !== null && valor !== undefined && !(typeof valor === 'string' && vocabulario.includes(valor))

const chaveDa = (o: SituationInput | null | undefined): SituationKey => {
  if (!o) return 'awaiting_payment'
  // SIT-10: valor desconhecido nunca vira uma situação otimista — cai no padrão, e nada lança.
  if (foraDoVocabulario(o.status, STATUSES) || foraDoVocabulario(o.payment_status, PAYMENT_STATUSES)) {
    return 'awaiting_payment'
  }

  if (o.status === 'cancelled') return 'cancelled'
  if (o.status === 'delivered') return 'delivered'
  if (o.status === 'shipped') return 'shipped'
  if (o.payment_status === 'refunded') return 'refunded'
  if (o.payment_status === 'approved') {
    return MATERIAL_PENDENTE.includes(o.material_status ?? '') ? 'awaiting_material' : 'in_production'
  }
  if (o.payment_status === 'expired') return 'pix_expired'
  if (o.payment_status === 'rejected') return 'payment_rejected'
  return 'awaiting_payment'
}

/** O selo de um pedido: chave, rótulo e tom, sempre da MESMA chave. */
export function orderSituation(o: SituationInput): Situation {
  const key = chaveDa(o)
  return { key, label: SITUATION_LABELS[key], tone: SITUATION_TONES[key] }
}

// ---------------------------------------------------------------------------------------------
// Datas curtas — "8 out"
// ---------------------------------------------------------------------------------------------

/** Sem ponto: `Intl` em pt-BR escreve "out.", e o desenho pede "8 out". */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * O fuso da loja. Fixo, e não o do aparelho: a mesma entrega não pode ter "dia 12" num celular e
 * "dia 13" noutro, e o teste não pode depender da máquina que o roda.
 */
const FUSO = 'America/Sao_Paulo'

/** Dia, mês (1–12) e ano de uma data do banco, no fuso da loja. `null` quando ilegível. */
export function calendarParts(
  valor: string | null | undefined,
): { day: number; month: number; year: number } | null {
  if (typeof valor !== 'string' || valor.trim() === '') return null
  const texto = valor.trim()

  // Coluna `date` (`delivery_estimate_*`): é um DIA, não um instante. `new Date('2026-10-08')` é
  // meia-noite UTC — que em Porto Alegre ainda é o dia 7. Lido direto da string, não há fuso.
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (soData) {
    return { year: Number(soData[1]), month: Number(soData[2]), day: Number(soData[3]) }
  }

  const instante = new Date(texto)
  if (Number.isNaN(instante.getTime())) return null
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instante)
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  return { year: parte('year'), month: parte('month'), day: parte('day') }
}

/** `"8 out"` — dia e mês abreviado, sem ponto. `null` quando a data é vazia ou ilegível. */
export function formatShortDate(valor: string | null | undefined): string | null {
  const p = calendarParts(valor)
  if (!p || p.month < 1 || p.month > 12) return null
  return `${p.day} ${MESES[p.month - 1]}`
}

/** O primeiro registro de um status no histórico, pela data — não pela ordem do array. */
export function firstEventAt(events: StatusEvent[] | null | undefined, status: string): string | null {
  let primeiro: { at: string; t: number } | null = null
  for (const e of events ?? []) {
    if (!e || e.status !== status) continue
    const t = new Date(e.at).getTime()
    if (Number.isNaN(t)) continue
    if (!primeiro || t < primeiro.t) primeiro = { at: e.at, t }
  }
  return primeiro?.at ?? null
}

/**
 * O complemento de data do selo (`SIT-12`), já com o separador: `" · chega até 8 out"` para "A
 * caminho" com previsão, `" em 12 ago"` para "Entregue" com o registro da entrega. `null` em
 * qualquer outro caso — nunca uma data inventada a partir de `updated_at` (`L-017`).
 */
export function situationDetail(
  o: SituationInput,
  events: StatusEvent[] | null | undefined,
): string | null {
  const key = chaveDa(o)
  if (key === 'shipped') {
    const ate = formatShortDate(o.delivery_estimate_max)
    return ate ? ` · chega até ${ate}` : null
  }
  if (key === 'delivered') {
    const em = formatShortDate(firstEventAt(events, 'delivered'))
    return em ? ` em ${em}` : null
  }
  return null
}
