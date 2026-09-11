// Feature 42 — o renderizador de e-mail: TEXTO da dona + ESTRUTURA do código.
//
// Substitui `templates.ts`, que tinha as quatro mensagens escritas em prosa dentro de funções. A
// diferença não é de organização, é de dono: o assunto, o título, a abertura, as linhas extras e o
// rótulo do botão passam a vir de `store_settings.notifications` (a dona edita em
// `/admin/configuracoes` → Notificações); itens, totais, endereço, casca, cores e o DESTINO do botão
// continuam aqui, com um dono só (`render/layout.ts`).
//
// Prova de que a troca não mudou o que a cliente recebe: `__tests__/render.test.ts` compara a saída
// dos quatro e-mails legados, byte a byte, com fixtures congeladas a partir do `templates.ts`
// ANTES de ele ser apagado (`__tests__/fixtures/legacy-*`).
//
// CONVENÇÃO DE ESCAPE (não afrouxe): título e abertura são montados como TEXTO PURO — já
// interpolado — e escapados por inteiro só na composição do HTML. A versão `text` recebe o
// original. Escapar antes faria uma cliente chamada "Tom & Jerry" virar "Tom &amp; Jerry" no
// e-mail em texto puro.

import {
  type EmailFields,
  type NotificationEvent,
  type NotificationVars,
  EVENT_AUDIENCE,
  interpolate,
} from '../../../../packages/core/src/notifications/index.ts'
import {
  addressBlock,
  ctaButton,
  type EmailOrder,
  emailShell,
  escapeHtml,
  highlightBox,
  itemsTable,
  textBody,
  totalsTable,
} from './layout.ts'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/**
 * Os estados de material em que o pedido cancelado tem material da cliente em trânsito ou no
 * ateliê — e só neles o e-mail fala em devolver (spec, AC 6). Falar disso quando não há material
 * nenhum confundiria; calar quando há seria pior.
 */
const MATERIAL_A_DEVOLVER = ['material_enviado', 'material_recebido']

/**
 * Blocos FIXOS que entram acima da lista de itens, por evento. Não são editáveis: o destaque em
 * geleia é o desenho do código de rastreio, e o parágrafo de devolução é uma promessa da loja, não
 * uma frase de marketing.
 */
function fixedBlock(event: NotificationEvent, order: EmailOrder, vars: NotificationVars): string {
  if (event === 'order_shipped') {
    return highlightBox(
      'Código de rastreio',
      escapeHtml(vars.rastreio ?? ''),
      'Pode levar algumas horas até aparecer no site da transportadora.',
    )
  }

  if (event === 'order_cancelled' && MATERIAL_A_DEVOLVER.includes(String(order.material_status ?? ''))) {
    return `<p style="margin:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#54616B;">Se você já enviou o material, ele volta para você — a gente combina o endereço de devolução pelo WhatsApp.</p>`
  }

  return ''
}

/** As mesmas linhas, para a versão texto. */
function fixedTextLines(event: NotificationEvent, order: EmailOrder): string[] {
  if (event === 'order_cancelled' && MATERIAL_A_DEVOLVER.includes(String(order.material_status ?? ''))) {
    return ['Se você já enviou o material, ele volta para você — combinamos o endereço pelo WhatsApp.']
  }
  return []
}

/**
 * Para onde o botão aponta.
 *
 * Cliente: sempre `/conta`, NUNCA `/pedido/:id` — aquela rota exige sessão e, aberta no webview do
 * Gmail, renderiza "Pedido não encontrado" (é a razão de `ctaButton` existir com um destino só).
 * Dona: o pedido no painel, que é onde ela age. Em nenhum dos dois casos o destino é editável.
 */
function ctaHref(event: NotificationEvent, vars: NotificationVars): string {
  return EVENT_AUDIENCE[event] === 'owner' ? (vars.link_pedido_admin ?? '') : (vars.link_conta ?? '')
}

export function renderEmail(
  event: NotificationEvent,
  order: EmailOrder,
  fields: EmailFields,
  vars: NotificationVars,
): RenderedEmail {
  const subject = interpolate(fields.subject, vars)
  const heading = interpolate(fields.heading, vars)
  const lead = interpolate(fields.lead, vars)
  const extra = (fields.extra ?? []).map((linha) => interpolate(linha, vars))
  const label = interpolate(fields.cta_label, vars)
  const href = ctaHref(event, vars)

  const body = [
    fixedBlock(event, order, vars),
    itemsTable(order.order_items ?? []),
    totalsTable(order),
    addressBlock(order),
    ctaButton(href, label),
  ]
    .filter((bloco) => bloco !== '')
    .join('\n')

  return {
    subject,
    html: emailShell(escapeHtml(heading), escapeHtml(lead), body),
    text: textBody(heading, lead, order, href, [...extra, ...fixedTextLines(event, order)]),
  }
}
