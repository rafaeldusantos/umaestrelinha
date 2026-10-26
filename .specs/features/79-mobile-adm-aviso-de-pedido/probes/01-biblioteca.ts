// Feature 79, T02 — o probe da biblioteca de Web Push (TQ2: o risco vem primeiro).
//
// Roda com: deno run --no-lock --allow-net --allow-env --allow-read --allow-write=<arquivo-de-saida> 01-biblioteca.ts [--sonda=<url>]
//
// Prova, contra um servidor HTTP local que captura o pedido:
//   (1) chaves geradas com `generateVapidKeys({ extractable: true })`, exportadas e REIMPORTADAS;
//   (2) uma inscrição sintética (par ECDH P-256 e `auth` de 16 bytes) gerada aqui;
//   (3) `pushTextMessage` sai contra o servidor local;
//   (4) `Content-Encoding: aes128gcm`, `Authorization: vapid t=…, k=…` (com a assinatura ES256 do JWT
//       conferida contra `k`) e `TTL`, e o corpo DECIFRADO (RFC 8291 + RFC 8188, só WebCrypto) de volta
//       ao JSON enviado;
//   (5) 410 vira `PushMessageError` com `isGone() === true`; 429 (e 404) com `isGone() === false`.
// O passo (6) — o mesmo import dentro de uma function servida — é feito pela function de sonda
// temporária, chamada pela URL de `--sonda`.
//
// Nenhuma chave é impressa: a saída mostra só formas e tamanhos. Com `--gravar-env=<arquivo>`, o JSON
// exportado é gravado no arquivo indicado (o `.env` da raiz, gitignored).

import {
  ApplicationServer,
  exportApplicationServerKey,
  exportVapidKeys,
  generateVapidKeys,
  importVapidKeys,
  PushMessageError,
} from 'jsr:@negrel/webpush@0.5.0'

const subtle = crypto.subtle
const enc = new TextEncoder()
const dec = new TextDecoder()

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string): Uint8Array => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0))
}
const concat = (...partes: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of partes) {
    out.set(p, i)
    i += p.length
  }
  return out
}
const hkdf = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> => {
  const chave = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, chave, bytes * 8))
}

const resultados: { passo: string; ok: boolean; detalhe: string }[] = []
const registra = (passo: string, ok: boolean, detalhe: string) => {
  resultados.push({ passo, ok, detalhe })
  console.log(`${ok ? 'ok  ' : 'FALHOU'} — ${passo}: ${detalhe}`)
}

// ---------------------------------------------------------------- (1) chaves
const geradas = await generateVapidKeys({ extractable: true })
const exportadas = await exportVapidKeys(geradas)
const json = JSON.stringify(exportadas)
const reimportadas = await importVapidKeys(JSON.parse(json), { extractable: true })
const pubGerada = await exportApplicationServerKey(geradas)
const pubReimportada = await exportApplicationServerKey(reimportadas)
registra(
  '1 chaves geradas, exportadas (JWK) e reimportadas',
  pubGerada === pubReimportada && fromB64url(pubGerada).length === 65 && typeof exportadas.privateKey.d === 'string',
  `JSON de ${json.length} caracteres com publicKey/privateKey (kty=${exportadas.publicKey.kty}, crv=${exportadas.publicKey.crv}); applicationServerKey igual antes/depois: ${pubGerada === pubReimportada}; ${fromB64url(pubGerada).length} bytes`,
)

// ---------------------------------------------------------------- (2) inscrição sintética
const ua = (await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
const uaPublicRaw = new Uint8Array(await subtle.exportKey('raw', ua.publicKey))
const authSecret = crypto.getRandomValues(new Uint8Array(16))
registra(
  '2 inscrição sintética',
  uaPublicRaw.length === 65 && uaPublicRaw[0] === 0x04 && authSecret.length === 16,
  `p256dh ${uaPublicRaw.length} bytes (0x${uaPublicRaw[0].toString(16).padStart(2, '0')}), auth ${authSecret.length} bytes`,
)

// ---------------------------------------------------------------- servidor que captura
interface Captura {
  headers: Record<string, string>
  corpo: Uint8Array
}
const capturas: Captura[] = []
let proximoStatus = 201
const servidor = Deno.serve({ port: 0, hostname: '0.0.0.0', onListen: () => {} }, async (req) => {
  capturas.push({ headers: Object.fromEntries(req.headers), corpo: new Uint8Array(await req.arrayBuffer()) })
  return new Response(null, { status: proximoStatus })
})
const porta = (servidor.addr as Deno.NetAddr).port
const endpoint = `http://127.0.0.1:${porta}/push/P79-sintetica`

const as = await ApplicationServer.new({ contactInformation: 'mailto:P79@exemplo.invalid', vapidKeys: reimportadas })
const assinante = as.subscribe({ endpoint, keys: { p256dh: b64url(uaPublicRaw), auth: b64url(authSecret) } })

// ---------------------------------------------------------------- (3) envio
const mensagem = { title: 'Pedido #0244 pago', body: 'R$ 189,00', url: '/pedidos/P79', tag: 'pedido-P79-owner_order_paid' }
const textoEnviado = JSON.stringify(mensagem)
let erroEnvio: unknown = null
try {
  await assinante.pushTextMessage(textoEnviado, { ttl: 3600 })
} catch (e) {
  erroEnvio = e
}
registra('3 pushTextMessage contra o servidor local', erroEnvio === null && capturas.length === 1, `capturas: ${capturas.length}; erro: ${erroEnvio === null ? 'nenhum' : String(erroEnvio)}`)

// ---------------------------------------------------------------- (4) cabeçalhos e decifração
const cap = capturas[0]
const authz = cap?.headers['authorization'] ?? ''
const mAuth = authz.match(/^vapid t=([^,]+), k=([A-Za-z0-9_-]+)$/)
registra(
  '4a Content-Encoding',
  cap?.headers['content-encoding'] === 'aes128gcm',
  `Content-Encoding: ${cap?.headers['content-encoding']}`,
)
registra('4b TTL', cap?.headers['ttl'] === '3600', `TTL: ${cap?.headers['ttl']}`)
let jwtOk = false
let jwtDetalhe = 'cabeçalho Authorization fora da forma `vapid t=…, k=…`'
if (mAuth) {
  const [h, p, s] = mAuth[1].split('.')
  const k = fromB64url(mAuth[2])
  const chaveK = await subtle.importKey('raw', k, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const assinaturaOk = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chaveK, fromB64url(s), enc.encode(`${h}.${p}`))
  const claims = JSON.parse(dec.decode(fromB64url(p)))
  const header = JSON.parse(dec.decode(fromB64url(h)))
  jwtOk =
    assinaturaOk &&
    header.alg === 'ES256' &&
    claims.aud === `http://127.0.0.1:${porta}` &&
    claims.sub === 'mailto:P79@exemplo.invalid' &&
    claims.exp > Date.now() / 1000 &&
    mAuth[2] === pubGerada
  jwtDetalhe = `Authorization: vapid t=<JWT ${header.alg}>, k=<${k.length} bytes>; assinatura ES256 válida contra k: ${assinaturaOk}; aud=${claims.aud}; sub=${claims.sub}; exp em ${Math.round(claims.exp - Date.now() / 1000)} s; k == applicationServerKey: ${mAuth[2] === pubGerada}`
}
registra('4c Authorization VAPID', jwtOk, jwtDetalhe)

const decifrar = async (corpo: Uint8Array): Promise<{ texto: string; rs: number; idlen: number; cifrado: number }> => {
  const salt = corpo.slice(0, 16)
  const rs = new DataView(corpo.buffer, corpo.byteOffset + 16, 4).getUint32(0)
  const idlen = corpo[20]
  const asPublicRaw = corpo.slice(21, 21 + idlen)
  const cifrado = corpo.slice(21 + idlen)
  const asPublic = await subtle.importKey('raw', asPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asPublic }, ua.privateKey, 256))
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublicRaw)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const chave = await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const claro = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, chave, cifrado))
  let fim = claro.length - 1
  while (fim >= 0 && claro[fim] === 0) fim--
  if (claro[fim] !== 0x02) throw new Error(`delimitador do último registro inesperado: 0x${claro[fim]?.toString(16)}`)
  return { texto: dec.decode(claro.slice(0, fim)), rs, idlen, cifrado: cifrado.length }
}

let textoDecifrado = ''
let decifraDetalhe = ''
try {
  const corpo = cap.corpo
  const d = await decifrar(corpo)
  textoDecifrado = d.texto
  decifraDetalhe = `corpo ${corpo.length} bytes; rs=${d.rs}; idlen=${d.idlen}; cifrado ${d.cifrado} bytes; decifrado == enviado: ${textoDecifrado === textoEnviado}; JSON: ${textoDecifrado}`
} catch (e) {
  decifraDetalhe = `falhou: ${String(e)}`
}
registra('4d corpo decifrado (RFC 8291/8188, WebCrypto) de volta ao JSON enviado', textoDecifrado === textoEnviado, decifraDetalhe)

// ---------------------------------------------------------------- (5) 410, 429, 404
const tentar = async (status: number): Promise<{ classe: string; gone: boolean | null; http: number | null }> => {
  proximoStatus = status
  try {
    await assinante.pushTextMessage('{}', {})
    return { classe: 'sem erro', gone: null, http: null }
  } catch (e) {
    if (e instanceof PushMessageError) return { classe: 'PushMessageError', gone: e.isGone(), http: e.response.status }
    return { classe: String(e), gone: null, http: null }
  }
}
const r410 = await tentar(410)
registra('5a 410 → PushMessageError, isGone() === true', r410.classe === 'PushMessageError' && r410.gone === true, JSON.stringify(r410))
const r429 = await tentar(429)
registra('5b 429 → PushMessageError, isGone() === false', r429.classe === 'PushMessageError' && r429.gone === false, JSON.stringify(r429))
const r404 = await tentar(404)
registra(
  '5c 404 → PushMessageError, isGone() === false (achado: a lib só chama 410 de gone; o 404 é do adaptador)',
  r404.classe === 'PushMessageError' && r404.gone === false && r404.http === 404,
  JSON.stringify(r404),
)

// ---------------------------------------------------------------- (6) a function servida
const sonda = Deno.args.find((a) => a.startsWith('--sonda='))?.slice('--sonda='.length)
if (sonda) {
  const anon = Deno.env.get('P79_ANON') ?? ''
  capturas.length = 0
  proximoStatus = 201
  const destino = `http://host.docker.internal:${porta}/push/P79-sonda`
  const res = await fetch(sonda, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${anon}`, apikey: anon },
    body: JSON.stringify({ endpoint: destino, p256dh: b64url(uaPublicRaw), auth: b64url(authSecret), mensagem: textoEnviado }),
  })
  const corpo = await res.text()
  const capturou = capturas.length
  const decSonda = capturou === 1 ? (await decifrar(capturas[0].corpo).catch((e) => ({ texto: String(e) }))).texto : ''
  registra(
    '6 o mesmo import dentro de uma function servida (functions serve)',
    res.status === 200 && capturou === 1 && capturas[0]?.headers['content-encoding'] === 'aes128gcm' && decSonda === textoEnviado,
    `HTTP ${res.status}; resposta: ${corpo}; pedidos que a function mandou ao servidor do probe: ${capturou}; Content-Encoding: ${capturas[0]?.headers['content-encoding']}; corpo decifrado == enviado: ${decSonda === textoEnviado}`,
  )
}

// ---------------------------------------------------------------- gravar as chaves de dev
const gravar = Deno.args.find((a) => a.startsWith('--gravar-env='))?.slice('--gravar-env='.length)
if (gravar) {
  const atual = await Deno.readTextFile(gravar).catch(() => '')
  if (/^VAPID_KEYS=/m.test(atual)) {
    console.log('VAPID_KEYS já existe no arquivo; nada gravado.')
  } else {
    const bloco = `\n# Feature 79 — Web Push (chaves de DEV, geradas pelo probe 01; nunca as de produção)\nVAPID_KEYS='${json}'\nVAPID_SUBJECT=mailto:contato@exemplo.invalid\n`
    await Deno.writeTextFile(gravar, atual + bloco)
    console.log('VAPID_KEYS e VAPID_SUBJECT gravados no arquivo indicado.')
  }
}

await servidor.shutdown()
const falhas = resultados.filter((r) => !r.ok)
console.log(falhas.length === 0 ? 'TODOS OS PASSOS OK' : `${falhas.length} PASSO(S) FALHARAM`)
Deno.exit(falhas.length === 0 ? 0 : 1)
