// Feature 42 — o vocabulário FECHADO das variáveis dos textos (`PNL-03`).
//
// A dona escreve `{{numero_pedido}}` e a function troca pelo valor na hora de enviar. O vocabulário
// é fechado porque variável desconhecida é o pior modo de falhar de um e-mail: `undefined` no meio
// da frase, na caixa de entrada de quem acabou de perder alguém. Por isso a recusa acontece nos DOIS
// lados — ao salvar (painel) e ao renderizar (function) —, e a lista tem UM dono, aqui.

import { type NotificationEvent, isMaterialEvent } from './events.ts'

/**
 * As doze variáveis (spec, AC 3 da história do painel). Nome em português e `snake_case`, porque é
 * a dona quem digita — não o código.
 */
export const NOTIFICATION_VARIABLES = [
  'saudacao',
  'primeiro_nome',
  'numero_pedido',
  'rastreio',
  'transportadora',
  'link_conta',
  'link_pedido',
  'link_pedido_admin',
  'link_guia_material',
  'endereco_atelie',
  'whatsapp_atendimento',
  'total',
] as const

export type NotificationVariable = (typeof NOTIFICATION_VARIABLES)[number]

/** Os valores resolvidos. Parcial porque nem todo evento tem rastreio ou transportadora. */
export type NotificationVars = Partial<Record<NotificationVariable, string>>

export const isNotificationVariable = (value: string): value is NotificationVariable =>
  (NOTIFICATION_VARIABLES as readonly string[]).includes(value)

/**
 * Um placeholder: `{{nome}}`, com espaço opcional por dentro. O nome é capturado como veio — sem
 * normalizar caixa —, porque `{{Nome}}` é erro da dona e a recusa tem de nomear o que ela digitou.
 */
const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g

/**
 * A saudação (`{{saudacao}}`) — a regra de `greet`/`greetCalm` que vivia em `templates.ts`.
 *
 * "Oi, Mariana! " nos eventos comuns; "Oi, Mariana. " nos de material, porque os outros e-mails
 * celebram um pedido feito ou uma joia postada, e este confirma que chegaram ao ateliê as cinzas de
 * alguém — "Oi, Mariana!" ali soa a festa. Sem nome, string vazia: o texto começa direto.
 *
 * É ela que faz os quatro textos legados serem defaults byte a byte.
 */
export function greeting(firstName: string, event: NotificationEvent): string {
  const nome = firstName.trim()
  if (nome === '') return ''
  return isMaterialEvent(event) ? `Oi, ${nome}. ` : `Oi, ${nome}! `
}

/**
 * Troca cada `{{variável}}` pelo valor. Variável conhecida sem valor vira `''` (o e-mail de
 * `order_paid` não tem rastreio, e o texto não pode carregar `{{rastreio}}` cru). Variável
 * DESCONHECIDA também sai como `''` — mas ela nunca deveria chegar aqui: `unknownVariables` acusa
 * antes, no painel e na function. Este é o comportamento fixado por teste, e não um `throw`, porque
 * o motor tem contrato de nunca lançar.
 *
 * **Não escapa HTML.** Escapar é do `layout.ts`, na composição — escapar aqui faria "Tom & Jerry"
 * virar "Tom &amp; Jerry" na versão texto.
 */
export function interpolate(text: string, vars: NotificationVars): string {
  return text.replace(PLACEHOLDER, (_m, nome: string) =>
    isNotificationVariable(nome) ? (vars[nome] ?? '') : '',
  )
}

/** As variáveis do texto que NÃO estão no vocabulário, sem repetição, na ordem em que aparecem. */
export function unknownVariables(text: string): string[] {
  const saida: string[] = []
  for (const m of text.matchAll(PLACEHOLDER)) {
    const nome = m[1]
    if (!isNotificationVariable(nome) && !saida.includes(nome)) saida.push(nome)
  }
  return saida
}

/** As variáveis conhecidas que o texto usa — o que a tela lista como "este texto precisa de". */
export function usedVariables(text: string): NotificationVariable[] {
  const saida: NotificationVariable[] = []
  for (const m of text.matchAll(PLACEHOLDER)) {
    const nome = m[1]
    if (isNotificationVariable(nome) && !saida.includes(nome)) saida.push(nome)
  }
  return saida
}

/**
 * `null` quando toda variável do texto é do vocabulário; senão, a recusa — nomeando a variável
 * (spec: "com a mensagem nomeando a variável"). Formato `string | null` de `menuTargetRefusal`.
 */
export function variablesRefusal(text: string): string | null {
  const desconhecidas = unknownVariables(text)
  if (desconhecidas.length === 0) return null
  const lista = desconhecidas.map((v) => `{{${v}}}`).join(', ')
  return desconhecidas.length === 1
    ? `Variável desconhecida: ${lista}. As disponíveis são ${NOTIFICATION_VARIABLES.map((v) => `{{${v}}}`).join(', ')}.`
    : `Variáveis desconhecidas: ${lista}. As disponíveis são ${NOTIFICATION_VARIABLES.map((v) => `{{${v}}}`).join(', ')}.`
}
