// Os três e-mails transacionais. Funções PURAS: pedido + origem da loja → { subject, html, text }.
//
// Princípio de desenho (TPL-07): o e-mail é AUTOSSUFICIENTE. Número do pedido, itens, totais e
// endereço vão no corpo, e o link é secundário — porque `/pedido/:id` exige sessão e o CTA aponta
// para `/conta`. Quem abre no webview do Gmail sem sessão tem de conseguir ler tudo que importa.
//
// Convenção de escape (não afrouxe): título e lead são montados como TEXTO PURO e escapados por
// inteiro só na composição do HTML. A versão `text` recebe o original. Escapar cedo demais faria um
// cliente chamado "Tom & Jerry" virar "Tom &amp; Jerry" no e-mail em texto puro.
import {
  addressBlock,
  ctaButton,
  type EmailOrder,
  emailShell,
  escapeHtml,
  firstName,
  highlightBox,
  itemsTable,
  storeLink,
  textBody,
  totalsTable,
} from './layout.ts'

export type EmailType = 'order_received' | 'order_paid' | 'order_shipped'

/** Fonte única do allow-list — o handler valida `type` contra isto antes de tocar no banco. */
export const EMAIL_TYPES: readonly EmailType[] = ['order_received', 'order_paid', 'order_shipped']

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

const CTA_LABEL = 'Acompanhar em Minha conta'

function greet(order: EmailOrder): string {
  const name = firstName(order.customer_name)
  return name === '' ? '' : `Oi, ${name}! `
}

function commonBody(order: EmailOrder, href: string, prefix = ''): string {
  return [prefix, itemsTable(order.order_items), totalsTable(order), addressBlock(order), ctaButton(href, CTA_LABEL)]
    .filter((block) => block !== '')
    .join('\n')
}

function compose(
  order: EmailOrder,
  storeUrl: string,
  parts: { subject: string; heading: string; lead: string; prefix?: string; extra?: string[] },
): RenderedEmail {
  const href = storeLink(storeUrl, 'conta')
  return {
    subject: parts.subject,
    html: emailShell(
      escapeHtml(parts.heading),
      escapeHtml(parts.lead),
      commonBody(order, href, parts.prefix ?? ''),
    ),
    text: textBody(parts.heading, parts.lead, order, href, parts.extra ?? []),
  }
}

/**
 * PIX gerado, pagamento pendente. NÃO carrega QR nem copia-e-cola de propósito (TRG-11): a RTY-01
 * cancela a order anterior do MP a cada retentativa, então um código colado aqui nasce vencido — e o
 * Gmail remove `data:` URI em <img>. Este e-mail é RECIBO, não canal de pagamento.
 */
export function renderOrderReceived(order: EmailOrder, storeUrl: string): RenderedEmail {
  return compose(order, storeUrl, {
    subject: `Pedido ${order.order_number} recebido — aguardando o PIX`,
    heading: 'Recebemos seu pedido!',
    lead: `${greet(order)}Seu PIX foi gerado e o pedido está reservado por 30 minutos. Assim que o pagamento cair, a gente te avisa por aqui.`,
    extra: ['Status: aguardando pagamento do PIX (30 minutos)'],
  })
}

/** Pagamento aprovado. Disparado só quando a RPC aplicou a aprovação AGORA (`applied === true`). */
export function renderOrderPaid(order: EmailOrder, storeUrl: string): RenderedEmail {
  return compose(order, storeUrl, {
    subject: `Pagamento aprovado — pedido ${order.order_number}`,
    heading: 'Pagamento aprovado!',
    lead: `${greet(order)}Recebemos seu pagamento. Agora é com a gente — seu pedido entra na fila de produção.`,
    extra: ['Status: pagamento aprovado'],
  })
}

/**
 * Pedido postado. O código vai como TEXTO SELECIONÁVEL, sem link da transportadora:
 * `shipping_carrier` é texto livre digitado no backoffice (ou o `service` do Melhor Envio, que
 * devolve "PAC" e não uma transportadora), então mapear para URL produziria link errado.
 */
export function renderOrderShipped(order: EmailOrder, storeUrl: string): RenderedEmail {
  const carrier = (order.shipping_carrier ?? '').trim()
  const tracking = (order.tracking_code ?? '').trim()

  return compose(order, storeUrl, {
    subject: `Pedido ${order.order_number} enviado — código de rastreio`,
    heading: 'Seu pedido saiu para entrega!',
    lead: carrier
      ? `${greet(order)}Postamos seu pedido com ${carrier}. Use o código abaixo para acompanhar.`
      : `${greet(order)}Postamos seu pedido. Use o código abaixo para acompanhar.`,
    prefix: highlightBox(
      'Código de rastreio',
      escapeHtml(tracking),
      'Pode levar algumas horas até aparecer no site da transportadora.',
    ),
    extra: [`Código de rastreio: ${tracking}`, ...(carrier ? [`Transportadora: ${carrier}`] : [])],
  })
}

export function renderEmail(type: EmailType, order: EmailOrder, storeUrl: string): RenderedEmail {
  switch (type) {
    case 'order_received':
      return renderOrderReceived(order, storeUrl)
    case 'order_paid':
      return renderOrderPaid(order, storeUrl)
    case 'order_shipped':
      return renderOrderShipped(order, storeUrl)
  }
}
