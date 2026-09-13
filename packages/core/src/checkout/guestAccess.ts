// A prova de que quem pede é dona do pedido, quando não há sessão nenhuma.
//
// `PED-05`/`PED-07`: a convidada fecha a compra sem conta na mão, então `create-payment` e a
// leitura de `/pedido/:id` não têm JWT para conferir. O que substitui o JWT é um token aleatório
// por pedido — uma capability, no molde do "link de acompanhamento" que qualquer loja emite.
//
// **O texto puro nunca toca o banco.** Grava-se o SHA-256 dele; o original vive só no navegador de
// quem comprou. Um dump do banco, portanto, não dá acesso a pedido nenhum.
//
// ⚠️ Zero import relativo, pelo mesmo motivo de `identity.ts`: este arquivo é resolvido por Deno
// por caminho, e lá todo especificador relativo precisa de `.ts` explícito — `import type`
// incluso. `denoReach.test.ts` mantém isso verdadeiro.

/** Dias de validade do acesso da convidada, contados da criação do pedido. */
export const GUEST_ACCESS_DAYS = 7

/** A linha de `orders` que responde "esta pessoa pode ver/pagar este pedido?". */
export interface GuestAccessRow {
  guest_access_hash: string | null
  guest_access_expires_at: string | null
}

/**
 * 32 bytes de `crypto.getRandomValues` em base64url — 43 caracteres, sem `=` de preenchimento.
 *
 * Base64**url** e não base64: o token viaja em corpo JSON hoje, mas nasce seguro para query string
 * e para `localStorage` sem escape. Síncrono de propósito — `getRandomValues` é síncrono, e
 * embrulhar em Promise só para "combinar" com o hash esconderia que aqui não há I/O.
 */
export function newAccessToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** SHA-256 em hex. É isto — e só isto — que vai para `orders.guest_access_hash`. */
export async function hashAccessToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token ?? ''))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Quando o acesso da convidada expira, a partir da criação do pedido. */
export function guestAccessExpiry(createdAt: Date): string {
  return new Date(createdAt.getTime() + GUEST_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Comparação de tempo constante.
 *
 * Com 256 bits de entropia um ataque de tempo não é o risco realista — quem atacasse precisaria
 * resolver uma pré-imagem, não adivinhar prefixo. Mas `===` sobre segredo é uma pergunta que volta
 * em toda revisão, e cinco linhas a encerram.
 */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * O veredito de posse: o token confere **e** o acesso ainda vale.
 *
 * Recusa por ausência é tão importante quanto recusa por divergência: pedido criado **com sessão**
 * não tem `guest_access_hash`, e sem o primeiro `if` um token vazio contra um hash vazio passaria.
 * É o buraco clássico deste padrão — a comparação está certa e o dado é que não existe.
 */
export async function accessGrant(
  row: GuestAccessRow,
  token: string,
  now: Date,
): Promise<boolean> {
  if (!row?.guest_access_hash) return false
  if (!token) return false

  const expira = row.guest_access_expires_at
  if (!expira) return false
  const limite = new Date(expira).getTime()
  if (Number.isNaN(limite) || limite <= now.getTime()) return false

  return iguaisEmTempoConstante(await hashAccessToken(token), row.guest_access_hash)
}
