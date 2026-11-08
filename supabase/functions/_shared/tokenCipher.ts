// A cifra do token do link do pedido montado (AES-GCM, Web Crypto) — o mesmo código no Deno e no
// vitest, sem dependência.
//
// O banco guarda o hash do token (é por ele que a `checkout` abre a proposta) e, com a chave
// configurada, a CIFRA do token: com ela a `order-proposals` devolve ao painel e ao app o link de uma
// proposta aberta, sem precisar gerar um novo para copiar. A chave mora num secret OPCIONAL
// (`PROPOSAL_TOKEN_KEY`, 32 bytes em base64): sem ela a cifra não existe e tudo segue como antes — só
// o hash, e "Gerar link novo" para mandar de novo.
//
// Formato gravado: `v1.` + base64url(iv de 12 bytes ‖ texto cifrado com a etiqueta). O prefixo deixa
// trocar o formato depois sem confundir uma cifra antiga com uma nova.
//
// Nada daqui registra log: a cifra e o token não saem desta porta para lugar nenhum além do banco e
// da resposta autenticada da function.

export interface TokenCipher {
  encrypt(token: string): Promise<string>
  /** O token, ou `null` quando a cifra não é desta chave, está corrompida ou é de outro formato. */
  decrypt(cipher: string | null | undefined): Promise<string | null>
}

const PREFIXO = 'v1.'
const IV_BYTES = 12

const paraBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const deBase64 = (texto: string): Uint8Array | null => {
  try {
    const normal = texto.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4))
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

/**
 * A cifra a partir do valor do secret. Ausente, vazio ou fora de 32 bytes ⇒ `null`: sem chave
 * utilizável, a function segue com o comportamento de antes. Nunca lança.
 */
export async function createTokenCipher(rawKey: string | null | undefined): Promise<TokenCipher | null> {
  const texto = (rawKey ?? '').trim()
  if (!texto) return null
  const bytes = deBase64(texto)
  if (!bytes || bytes.length !== 32) return null
  let chave: CryptoKey
  try {
    chave = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
  const codificar = new TextEncoder()
  const decodificar = new TextDecoder()
  return {
    async encrypt(token: string): Promise<string> {
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
      const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, codificar.encode(token)))
      const junto = new Uint8Array(iv.length + cifrado.length)
      junto.set(iv, 0)
      junto.set(cifrado, iv.length)
      return PREFIXO + paraBase64Url(junto)
    },
    async decrypt(cipher: string | null | undefined): Promise<string | null> {
      if (typeof cipher !== 'string' || !cipher.startsWith(PREFIXO)) return null
      const junto = deBase64(cipher.slice(PREFIXO.length))
      if (!junto || junto.length <= IV_BYTES) return null
      try {
        const claro = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: junto.slice(0, IV_BYTES) },
          chave,
          junto.slice(IV_BYTES),
        )
        return decodificar.decode(claro)
      } catch {
        return null
      }
    },
  }
}
