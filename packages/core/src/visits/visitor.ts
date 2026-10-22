// Feature 71 · VIS-12, VIS-13, VIS-21 — o contrato do corpo da visita.
//
// A loja monta o corpo com `visitBody`; a function `visit` o recusa com `visitBodyRefusal`. As duas
// pontas leem este arquivo, e o corpo é EXATAMENTE `{ id }`: o cliente nunca envia data — o dia é
// sempre decidido pelo banco (`store_day`).
//
// O veredito é `string | null`, no formato de `menuTargetRefusal`: com `strictNullChecks` em
// `false`, uma união discriminada por booleano não estreita.
//
// ⚠️ Este arquivo não importa nada: é folha alcançável pelo Deno.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** UUID v4, sem diferenciar maiúsculas. Qualquer outra coisa (v1, v7, sem hífen, com espaço) não. */
export function isVisitorId(s: unknown): boolean {
  return typeof s === 'string' && UUID_V4.test(s)
}

/** O corpo que a loja envia: só o id, nada mais. */
export function visitBody(id: string): { id: string } {
  return { id }
}

/**
 * `null` ⇒ aceito. Texto ⇒ o motivo da recusa:
 * - `'json'`: o corpo (já lido como JSON) não é um objeto;
 * - `'chave'`: há qualquer chave além de `id`;
 * - `'id'`: o `id` falta ou não é UUID v4.
 */
export function visitBodyRefusal(body: unknown): string | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return 'json'
  const chaves = Object.keys(body)
  if (chaves.some((k) => k !== 'id')) return 'chave'
  if (!isVisitorId((body as { id?: unknown }).id)) return 'id'
  return null
}
