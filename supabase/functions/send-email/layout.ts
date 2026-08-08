// Shell Nanita dos e-mails transacionais + helpers puros do envelope.
//
// Restrições copiadas de `supabase/templates/magic_link.html` (os templates de auth), porque são as
// mesmas caixas de entrada: tudo inline, layout em <table>, e SEM WEBFONT — Berkshire Swash / Fredoka
// / DM Sans não carregam em Gmail/Outlook, então o que renderiza é o fallback e a pilha de fontes
// É a decisão de design, não um detalhe. Sem <style>, sem <link>, sem background-image (Outlook).
//
// Módulo PURO: zero I/O, zero `Deno`. Roda no vitest (AD-002/AD-004).
import { formatPrice } from '../../../packages/core/src/formatters/price.ts'

/** Paleta Nanita (DESIGN.md). Glacê e framboesa NUNCA são texto sobre claro — contraste < 3:1. */
export const NANITA = {
  ink: '#2B1622',
  icing: '#FF86B5',
  jam: '#B0176B',
  plum: '#7A5C6B',
  sugar: '#FFEFF6',
  border: '#FFD7E7',
  white: '#FFFFFF',
} as const

const WORDMARK_FONT = "'Berkshire Swash',Georgia,'Times New Roman',serif"
const DISPLAY_FONT = "'Fredoka','Trebuchet MS',Verdana,sans-serif"
const BODY_FONT = "'DM Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const FOOTER = 'Nanita — cole no peito, carrega no coração.'

/**
 * Escapa TODO valor que vem de dado (nome do cliente, nome do produto, código de rastreio).
 * Não é cosmética: um produto chamado `Naruto <3` injetaria marcação no e-mail sem isso.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Junta a origem da loja com um caminho, normalizando a barra. `STORE_PUBLIC_URL` vem de env e
 * ninguém garante se termina em `/` — com e sem barra tem de gerar o MESMO href.
 */
export function storeLink(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

const BARE_EMAIL = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/

/**
 * CFG-03: um `RESEND_FROM` malformado é 422 em TODOS os e-mails — apagão silencioso, não falha
 * isolada. Por isso o formato é validado antes de qualquer envio, e aqui (puro) em vez de no I/O.
 * Aceita `e@x.com` e `Nome <e@x.com>`; display name com vírgula exige aspas (RFC 5322).
 */
export function isValidFrom(from: string): boolean {
  const angled = from.trim().match(/^(.*)<([^>]*)>$/)
  if (!angled) return BARE_EMAIL.test(from.trim())

  const [, rawName, email] = angled
  if (!BARE_EMAIL.test(email.trim())) return false

  const name = rawName.trim()
  if (name === '') return true
  if (name.includes(',') && !/^".*"$/.test(name)) return false
  return true
}

/**
 * Primeiro nome, para o cumprimento. `customer_name` é NOT NULL no banco, mas pode vir só com
 * espaços — devolve string vazia nesse caso, e quem chama omite o cumprimento em vez de "Oi, !".
 */
export function firstName(fullName: string): string {
  const trimmed = fullName.trim()
  return trimmed === '' ? '' : trimmed.split(/\s+/)[0]
}

/** Caixa de destaque (molde da caixa do código nos templates de auth). Conteúdo já escapado. */
export function highlightBox(label: string, value: string, hint?: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${NANITA.sugar};border:1px solid ${NANITA.border};border-radius:16px;margin:0 0 24px;">
  <tr>
    <td align="center" style="padding:20px;font-family:${BODY_FONT};">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${NANITA.plum};">${label}</div>
      <div style="margin-top:6px;font-family:${DISPLAY_FONT};font-size:26px;font-weight:600;letter-spacing:0.08em;color:${NANITA.jam};">${value}</div>${
        hint ? `\n      <div style="margin-top:6px;font-size:13px;color:${NANITA.plum};">${hint}</div>` : ''
      }
    </td>
  </tr>
</table>`
}

export interface EmailOrderItem {
  product_name: string
  size: string | null
  finish: string | null
  quantity: number
  unit_price: number
}

export interface EmailOrder {
  order_number: string
  customer_name: string
  customer_email: string
  subtotal: number
  shipping_cost: number | null
  discount: number | null
  pix_discount: number | null
  total: number
  tracking_code: string | null
  shipping_carrier: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  order_items: EmailOrderItem[]
}

/** "Tam. M · Fosco" — só os que existem, para nunca renderizar rótulo vazio. */
function variantLabel(item: EmailOrderItem): string {
  return [item.size && `Tam. ${item.size}`, item.finish].filter(Boolean).join(' · ')
}

export function itemsTable(items: EmailOrderItem[]): string {
  const rows = items
    .map((item) => {
      const variant = variantLabel(item)
      return `  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${NANITA.border};font-family:${BODY_FONT};font-size:14px;color:${NANITA.ink};">
      ${item.quantity}× ${escapeHtml(item.product_name)}${
        variant ? `<br><span style="font-size:12px;color:${NANITA.plum};">${escapeHtml(variant)}</span>` : ''
      }
    </td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid ${NANITA.border};font-family:${BODY_FONT};font-size:14px;color:${NANITA.ink};white-space:nowrap;">${formatPrice(
        item.unit_price * item.quantity,
      )}</td>
  </tr>`
    })
    .join('\n')

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
${rows}
</table>`
}

export function totalsTable(order: EmailOrder): string {
  const line = (label: string, value: string, strong = false) =>
    `  <tr>
    <td style="padding:4px 0;font-family:${BODY_FONT};font-size:${strong ? '16px' : '14px'};${
      strong ? `font-weight:700;color:${NANITA.ink};` : `color:${NANITA.plum};`
    }">${label}</td>
    <td align="right" style="padding:4px 0;font-family:${BODY_FONT};font-size:${strong ? '16px' : '14px'};${
      strong ? `font-weight:700;color:${NANITA.ink};` : `color:${NANITA.plum};`
    }white-space:nowrap;">${value}</td>
  </tr>`

  const lines = [line('Subtotal', formatPrice(order.subtotal))]
  if (order.shipping_cost != null) {
    lines.push(line('Frete', order.shipping_cost === 0 ? 'Grátis' : formatPrice(order.shipping_cost)))
  }
  if (order.discount) lines.push(line('Desconto', `−${formatPrice(order.discount)}`))
  if (order.pix_discount) lines.push(line('Desconto PIX', `−${formatPrice(order.pix_discount)}`))
  lines.push(line('Total', formatPrice(order.total), true))

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
${lines.join('\n')}
</table>`
}

/** Linhas de endereço já formatadas, sem entradas vazias. Reusado pelo HTML e pelo texto. */
export function addressLines(order: EmailOrder): string[] {
  const street = [order.address_street, order.address_number].filter(Boolean).join(', ')
  const cityState = [order.address_city, order.address_state].filter(Boolean).join(' - ')
  return [street, order.address_complement, order.address_neighborhood, cityState, order.address_zip]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
}

export function addressBlock(order: EmailOrder): string {
  const lines = addressLines(order)
  if (lines.length === 0) return ''

  return `<div style="font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${NANITA.plum};margin:0 0 24px;">
  <strong style="color:${NANITA.ink};">Entrega</strong><br>${lines.map(escapeHtml).join('<br>')}
</div>`
}

/**
 * CTA. Aponta para `/conta`, NUNCA para `/pedido/:id`: aquela rota é protegida por RLS
 * (`users read own orders`) e, aberta sem sessão — o caso comum de webview de Gmail/WhatsApp, com
 * ~90% do tráfego em celular —, renderiza "Pedido não encontrado". O alvo declara `min-height:44px`.
 */
export function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
  <tr>
    <td align="center" style="background:${NANITA.jam};border-radius:999px;">
      <a href="${href}" style="display:inline-block;min-height:44px;padding:14px 28px;font-family:${DISPLAY_FONT};font-size:16px;font-weight:600;line-height:20px;color:${NANITA.white};text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`
}

/** Envelope completo: fundo, card, header com wordmark, corpo, rodapé. */
export function emailShell(heading: string, lead: string, body: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${NANITA.sugar};padding:32px 12px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${NANITA.white};border:1px solid ${NANITA.border};border-radius:24px;">
        <tr>
          <td style="background:${NANITA.ink};padding:24px 32px;border-radius:24px 24px 0 0;">
            <span style="font-family:${WORDMARK_FONT};font-size:32px;line-height:1.1;color:${NANITA.icing};">Nanita</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:${BODY_FONT};">
            <h1 style="margin:0 0 8px;font-family:${DISPLAY_FONT};font-size:26px;font-weight:600;line-height:1.25;color:${NANITA.ink};">${heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${NANITA.plum};">${lead}</p>
${body}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${NANITA.plum};">
            ${FOOTER}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/** Versão texto — mandada explícita em vez de deixar o Resend derivar do HTML. */
export function textBody(heading: string, lead: string, order: EmailOrder, href: string, extra: string[] = []): string {
  const items = order.order_items.map((item) => {
    const variant = variantLabel(item)
    return `- ${item.quantity}x ${item.product_name}${variant ? ` (${variant})` : ''} — ${formatPrice(
      item.unit_price * item.quantity,
    )}`
  })

  const totals = [`Subtotal: ${formatPrice(order.subtotal)}`]
  if (order.shipping_cost != null) {
    totals.push(`Frete: ${order.shipping_cost === 0 ? 'Grátis' : formatPrice(order.shipping_cost)}`)
  }
  if (order.discount) totals.push(`Desconto: -${formatPrice(order.discount)}`)
  if (order.pix_discount) totals.push(`Desconto PIX: -${formatPrice(order.pix_discount)}`)
  totals.push(`Total: ${formatPrice(order.total)}`)

  const address = addressLines(order)

  return [
    heading,
    '',
    lead,
    '',
    `Pedido ${order.order_number}`,
    ...extra,
    '',
    ...items,
    '',
    ...totals,
    ...(address.length ? ['', 'Entrega:', ...address] : []),
    '',
    `Acompanhe em ${href}`,
    '',
    FOOTER,
  ].join('\n')
}
