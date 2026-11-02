// O contrato do corpo do pulso de presença, e os três vocabulários que ele carrega.
//
// A loja monta o corpo com `presenceBody`; a function `visit` (ação `ping`) o recusa com
// `presenceBodyRefusal`. As duas pontas leem este arquivo, e o banco repete os três vocabulários nos
// `check` da tabela de presença — cópia deliberada, que o guarda de esquema da loja compara com as
// constantes daqui.
//
// O corpo é EXATAMENTE `{ id, page, product, cart, source }`: o id da presença (aleatório, diário,
// sem ligação com o id do contador), o tipo de página, o slug da joia (o servidor resolve o id), os
// itens da sacola e a faixa de origem. Nunca URL, referrer, IP ou user agent — o aparelho é
// calculado no servidor pelo user agent, que não é gravado.
//
// O veredito é `string | null`: com `strictNullChecks` em `false`, união por booleano não estreita.
//
// ⚠️ Este arquivo não importa nada: é folha alcançável pelo Deno.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** O formato dos slugs do catálogo: minúsculas, dígitos e hífen. */
const SLUG = /^[a-z0-9-]{1,200}$/

export const PRESENCE_PAGE_KINDS = ['joia', 'lista', 'sacola', 'checkout', 'guia', 'outra'] as const
export type PresencePageKind = (typeof PRESENCE_PAGE_KINDS)[number]

export const PRESENCE_SOURCES = ['instagram', 'google', 'whatsapp', 'direto', 'outros'] as const
export type PresenceSource = (typeof PRESENCE_SOURCES)[number]

export const PRESENCE_DEVICES = ['celular', 'computador', 'tablet'] as const
export type PresenceDevice = (typeof PRESENCE_DEVICES)[number]

/** O teto de itens da sacola que o pulso carrega. A loja corta antes de enviar. */
export const PRESENCE_CART_MAX = 99

export interface PresenceBody {
  id: string
  page: PresencePageKind
  product: string | null
  cart: number
  source: PresenceSource
}

const CHAVES = ['id', 'page', 'product', 'cart', 'source']

export function isPresenceSlug(s: unknown): boolean {
  return typeof s === 'string' && SLUG.test(s)
}

/** O corpo que a loja envia, com as cinco chaves e nada mais. */
export function presenceBody(b: PresenceBody): PresenceBody {
  return { id: b.id, page: b.page, product: b.product, cart: b.cart, source: b.source }
}

const inclui = (lista: readonly string[], v: unknown): boolean => typeof v === 'string' && lista.includes(v)

/**
 * `null` ⇒ aceito. Texto ⇒ o motivo:
 * - `'json'`: não é objeto; `'chave'`: chave além das cinco;
 * - `'id'`: não é UUID v4; `'pagina'`: tipo fora do vocabulário;
 * - `'joia'`: a chave falta, o slug é inválido, ou há slug fora da página de joia;
 * - `'sacola'`: não é inteiro entre 0 e o teto; `'origem'`: faixa fora do vocabulário.
 */
export function presenceBodyRefusal(body: unknown): string | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return 'json'
  if (Object.keys(body).some((k) => !CHAVES.includes(k))) return 'chave'
  const b = body as Record<string, unknown>
  if (typeof b.id !== 'string' || !UUID_V4.test(b.id)) return 'id'
  if (!inclui(PRESENCE_PAGE_KINDS, b.page)) return 'pagina'
  if (!('product' in b)) return 'joia'
  if (b.product !== null && (!isPresenceSlug(b.product) || b.page !== 'joia')) return 'joia'
  if (typeof b.cart !== 'number' || !Number.isInteger(b.cart) || b.cart < 0 || b.cart > PRESENCE_CART_MAX) {
    return 'sacola'
  }
  if (!inclui(PRESENCE_SOURCES, b.source)) return 'origem'
  return null
}
