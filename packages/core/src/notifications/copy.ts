// Feature 42 — a régua de tom dos textos, com UM dono (`PNL-04`), e os limites de tamanho (`PNL-09`).
//
// "O registro do negócio é sensível e memorial" não é tom de marketing — é restrição de produto, e
// aqui ela vira função. O painel chama para recusar ao salvar; a function chama para recusar ao
// renderizar. Duas cópias divergiriam, e uma aceitaria o que a outra recusa.
//
// O que se avalia é o TEXTO DO TEMPLATE, com os placeholders dentro — nunca o texto resolvido. Um
// `{{saudacao}}` que vira "Oi, Ana! " num evento comum não é a dona pondo exclamação; é a regra da
// saudação, que já decide sozinha quando o ponto substitui o `!` (ver `greeting`).

import { type NotificationEvent, isMaterialEvent } from './events.ts'
import type { EmailFields, NotificationChannel } from './settings.ts'

/**
 * Urgência fabricada — a lista que `orderList.test.ts` já cobrava do rascunho de cobrança, agora
 * como regra. Casada sem distinguir caixa e com as formas sem acento, porque é assim que se digita
 * no celular.
 */
export const URGENCY_TERMS = [
  'últimas unidades',
  'ultimas unidades',
  'corra',
  'só hoje',
  'so hoje',
  'restam',
  'aproveite',
  'imperdível',
  'imperdivel',
  'urgente',
  'não perca',
  'nao perca',
  'contagem regressiva',
] as const

/**
 * Palavra inteira, para "socorra" e "corramos" não caírem junto. Grupo à esquerda em vez de
 * lookbehind: o painel roda no navegador da dona, e lookbehind com `\p{L}` ainda derruba Safari
 * antigo na carga do módulo — o que apagaria a aba inteira, não só a régua.
 */
const URGENCY = new RegExp(`(?:^|[^\\p{L}])(${URGENCY_TERMS.join('|')})(?!\\p{L})`, 'iu')

/**
 * Emoji, pela propriedade Unicode — uma lista à mão envelhece. Cobre o par substituto inteiro, o
 * que `[…]` não faria (e é por isso que `no-misleading-character-class` recusa a classe).
 */
const EMOJI = /\p{Extended_Pictographic}/u

/** O que `post_delivery_care` não pode carregar: oferta, cupom, venda cruzada (PDC-01). */
const SALES = /cupom|desconto|oferta|%/i

export interface CopyContext {
  event: NotificationEvent
  channel: NotificationChannel
}

/**
 * `null` quando o texto passa; senão, o motivo — a frase que o painel mostra inline e que a
 * function devolve no 422. Formato `string | null` de `menuTargetRefusal`.
 *
 * A ordem das réguas é a ordem em que se explica: urgência, emoji, exclamação, venda.
 */
export function notificationCopyRefusal(text: string, ctx: CopyContext): string | null {
  const termo = text.match(URGENCY)?.[1]
  if (termo) return `Urgência fabricada não entra num texto desta loja: "${termo}".`

  const emoji = text.match(EMOJI)?.[0]
  if (emoji) return `Emoji não entra num texto desta loja: "${emoji}".`

  if (text.includes('!!')) return 'Exclamação dupla não entra num texto desta loja.'

  if (isMaterialEvent(ctx.event) && text.includes('!')) {
    return 'Texto sobre o material não leva exclamação — é a confirmação de que chegou o que sobrou de alguém.'
  }

  if (ctx.event === 'post_delivery_care') {
    const venda = text.match(SALES)?.[0]
    if (venda) return `O e-mail de pós-entrega não vende nada: "${venda}".`
  }

  return null
}

/**
 * Os limites de tamanho, lidos pelo painel (contador e recusa) e pela function (recusa).
 *
 * `subject` em 120 porque o Gmail do celular corta perto de 40 e o resto vira "…" — mas cortar a dona
 * em 40 seria recusar assunto legítimo; 120 é o teto do que faz sentido escrever. `lead` em 600 é
 * um parágrafo. `extra` são as linhas da versão texto: 5 × 160.
 */
export const COPY_LIMITS = {
  subject: 120,
  heading: 80,
  lead: 600,
  extraLines: 5,
  extraLine: 160,
  ctaLabel: 40,
} as const

/**
 * `null` quando todo campo cabe; senão, qual estourou e por quanto. O `channel` entra na assinatura
 * porque a feature 43 tem limites próprios de WhatsApp — hoje só `email` existe.
 */
export function limitsRefusal(fields: Partial<EmailFields>, _channel: NotificationChannel = 'email'): string | null {
  const excesso = (rotulo: string, valor: string | undefined, limite: number): string | null =>
    (valor ?? '').length > limite
      ? `${rotulo} tem ${(valor ?? '').length} caracteres; o limite é ${limite}.`
      : null

  const subject = excesso('O assunto', fields.subject, COPY_LIMITS.subject)
  if (subject) return subject
  const heading = excesso('O título', fields.heading, COPY_LIMITS.heading)
  if (heading) return heading
  const lead = excesso('O texto principal', fields.lead, COPY_LIMITS.lead)
  if (lead) return lead
  const cta = excesso('O rótulo do botão', fields.cta_label, COPY_LIMITS.ctaLabel)
  if (cta) return cta

  const extra = fields.extra ?? []
  if (extra.length > COPY_LIMITS.extraLines) {
    return `As observações têm ${extra.length} linhas; o limite é ${COPY_LIMITS.extraLines}.`
  }
  for (const [i, linha] of extra.entries()) {
    const estouro = excesso(`A observação ${i + 1}`, linha, COPY_LIMITS.extraLine)
    if (estouro) return estouro
  }

  return null
}
