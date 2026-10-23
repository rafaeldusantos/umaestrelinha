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
// ⚠️ O diretório é alcançado pelo Deno por caminho relativo (via `format.ts`): todo import daqui é
// relativo e com a extensão explícita, e todos são FOLHAS sem import: o dono de "este pedido é de
// retirada?" (`shipping/pickup.ts`, feature `63`), o fuso (`time/zone.ts`), e — desde o conserto
// do QA da `73` — o vocabulário do material (`material/material.ts`) e o do painel (`labels.ts`).
//
// **Dois públicos, uma régua** (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`). A CHAVE e o
// TOM são os mesmos para a loja e para o app do ateliê; só a PALAVRA muda. A loja fala com a cliente
// ("Aguardando seu material"); o ateliê lê o vocabulário que o painel já tinha ("Aguardando
// material", "Material a caminho", "Enviado", "Estornado"), e ali o selo distingue o envelope que
// ainda não saiu do que já foi postado — os dois são `awaiting_material` para a cliente.

import { MATERIAL_STATUS_LABELS } from '../material/material.ts'
import { isPickupOrder } from '../shipping/pickup.ts'
import { STORE_TIME_ZONE } from '../time/zone.ts'
import { ORDER_PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from './labels.ts'

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
  /** Feature 63: `'retirada'` é pedido de retirada no escritório (`isPickupOrder`). */
  shipping_service_id?: string | null
}

/** Para quem o selo fala. `'cliente'` é o padrão: a loja não passa nada e não muda. */
export type SituationAudience = 'cliente' | 'atelie'

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
 * As palavras do ATELIÊ por chave. **Nenhum literal novo**: cada uma vem de um vocabulário que já
 * tinha dono — o do material (`core/material`) e o das colunas do pedido (`labels.ts`, o mesmo que o
 * painel reexporta) —, e o que não muda entre os públicos é a palavra da cliente, por referência.
 * Sem pronome: "Aguardando material", nunca "seu".
 */
const ATELIE_LABELS: Record<SituationKey, string> = {
  ...SITUATION_LABELS,
  shipped: ORDER_STATUS_LABELS.shipped,
  refunded: ORDER_PAYMENT_STATUS_LABELS.refunded,
  awaiting_material: MATERIAL_STATUS_LABELS.aguardando_material,
  in_production: MATERIAL_STATUS_LABELS.em_producao,
}

/** O mapa dos rótulos, um por público — o único lugar onde a palavra de cada chave mora. */
export const SITUATION_LABELS_BY_AUDIENCE: Record<SituationAudience, Record<SituationKey, string>> = {
  cliente: SITUATION_LABELS,
  atelie: ATELIE_LABELS,
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

/**
 * RET-19 (feature 63): o rótulo de um pedido de retirada concluído. A CHAVE continua `delivered` (é
 * o mesmo estado, com o mesmo tom); só a palavra muda — "Entregue" diria que alguém levou a joia
 * até a cliente.
 */
export const PICKUP_DELIVERED_LABEL = 'Retirado'

/**
 * No ateliê, o estado do material diz mais que a chave: `awaiting_material` é tanto o envelope que
 * não saiu quanto o que está a caminho, e `in_production` inclui o material que acabou de chegar.
 * A palavra é a do próprio estado (`MATERIAL_STATUS_LABELS`). Fora desses dois casos, `null`.
 */
const palavraDoMaterial = (key: SituationKey, material: string | null | undefined): string | null => {
  if (key === 'awaiting_material' && material === 'material_enviado') return MATERIAL_STATUS_LABELS.material_enviado
  if (key === 'in_production' && material === 'material_recebido') return MATERIAL_STATUS_LABELS.material_recebido
  return null
}

/**
 * O selo de um pedido: chave, rótulo e tom, sempre da MESMA chave. `publico` escolhe só a palavra;
 * sem ele, é a da cliente — a loja nunca passa o argumento.
 */
export function orderSituation(o: SituationInput, publico: SituationAudience = 'cliente'): Situation {
  const key = chaveDa(o)
  const rotulos = SITUATION_LABELS_BY_AUDIENCE[publico] ?? SITUATION_LABELS
  const label =
    key === 'delivered' && isPickupOrder(o)
      ? PICKUP_DELIVERED_LABEL
      : (publico === 'atelie' ? palavraDoMaterial(key, o?.material_status) : null) ?? rotulos[key]
  return { key, label, tone: SITUATION_TONES[key] }
}

// ---------------------------------------------------------------------------------------------
// Datas curtas — "8 out"
// ---------------------------------------------------------------------------------------------

/** Sem ponto: `Intl` em pt-BR escreve "out.", e o desenho pede "8 out". */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * O fuso da loja. Fixo, e não o do aparelho: a mesma entrega não pode ter "dia 12" num celular e
 * "dia 13" noutro, e o teste não pode depender da máquina que o roda. O nome tem um dono só
 * (`core/time/zone.ts`, feature `71`).
 */
const FUSO = STORE_TIME_ZONE

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
