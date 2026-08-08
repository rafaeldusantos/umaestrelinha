// Validação de assinatura de webhook do Mercado Pago — domínio puro.
// Usa WebCrypto (globalThis.crypto.subtle): funciona em Node ≥ 20 e Deno, sem imports.
// PAY-05: webhook com x-signature inválida ou ausente é rejeitado.

export interface ManifestParts {
  dataId?: string | null
  requestId?: string | null
  ts?: string | null
}

/** Template do manifest com o `id` já resolvido. Partes ausentes são removidas. */
function manifestWith(dataId: string | null | undefined, parts: ManifestParts): string {
  let manifest = ''
  if (dataId) manifest += `id:${dataId};`
  if (parts.requestId) manifest += `request-id:${parts.requestId};`
  if (parts.ts) manifest += `ts:${parts.ts};`
  return manifest
}

/**
 * Monta o manifest do template oficial do MP:
 * `id:<data.id lowercase>;request-id:<x-request-id>;ts:<ts>;`
 * Partes ausentes são removidas do template.
 */
export function buildManifest(parts: ManifestParts): string {
  return manifestWith(parts.dataId?.toLowerCase(), parts)
}

/**
 * Manifests candidatos para a MESMA notificação, na ordem de tentativa: primeiro com o `data.id`
 * **como recebido**, depois com ele em minúsculas (o template oficial). Ids numéricos produzem os
 * dois manifests idênticos e a lista tem 1 elemento.
 *
 * Por que existe (D2, medido no T16): o exemplo oficial do MP lowercaseia o `data.id`, mas o id do
 * exemplo é **numérico** — ali o lowercase é no-op. No tópico `order` o id vem em MAIÚSCULAS
 * (`ORDTST01KYMAZV96DKQHXSZB5FG0K86E`), então lowercasear muda a string, o HMAC deixa de bater e
 * as notificações reais caíram 8/8 em 401.
 *
 * Não afrouxa segurança: os dois candidatos derivam do **dado recebido** (nenhum campo novo entra
 * no manifest) e cada um continua exigindo um HMAC válido produzido com o segredo. Quem não tem o
 * segredo não ganha nada com uma segunda tentativa.
 */
export function buildManifestCandidates(parts: ManifestParts): string[] {
  const asReceived = manifestWith(parts.dataId, parts)
  const lowercased = buildManifest(parts)
  return asReceived === lowercased ? [asReceived] : [asReceived, lowercased]
}

/** Extrai `ts` e `v1` do header `x-signature` (formato `ts=...,v1=...`). */
export function parseXSignature(
  header: string | null | undefined,
): { ts: string | null; v1: string | null } | null {
  if (!header) return null
  const entries: Record<string, string> = {}
  for (const part of header.split(',')) {
    const [key, ...rest] = part.split('=')
    if (key && rest.length > 0) entries[key.trim()] = rest.join('=').trim()
  }
  const ts = entries['ts'] ?? null
  const v1 = entries['v1'] ?? null
  if (!ts && !v1) return null
  return { ts, v1 }
}

const encoder = new TextEncoder()

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/**
 * Valida o `x-signature` do webhook: HMAC-SHA256(secret, manifest) em hex
 * deve bater com o `v1` do header. Header ausente/malformado → false.
 */
export async function validateWebhookSignature(
  header: string | null | undefined,
  manifest: string,
  secret: string,
): Promise<boolean> {
  const parsed = parseXSignature(header)
  if (!parsed?.v1 || !secret || !manifest) return false

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  return toHex(signature) === parsed.v1.toLowerCase()
}
