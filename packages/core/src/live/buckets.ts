// As faixas da presença: de onde a pessoa veio e em que aparelho ela está.
//
// `sourceBucket` roda na loja, no pouso (a primeira página da aba), e só a faixa sai do navegador;
// o servidor revalida a faixa contra o vocabulário. `deviceBucket` roda na function `visit`, com o
// user agent da requisição — que é lido e descartado, nunca gravado.
//
// Os vocabulários moram no contrato do corpo (`visits/presence.ts`), que o banco repete nos `check`.
//
// ⚠️ Alcançável pelo Deno: o único import é de tipo, por caminho relativo com extensão explícita.

import type { PresenceDevice, PresenceSource } from '../visits/presence.ts'

/** O host termina no domínio (`l.instagram.com` ⇒ `instagram.com`), nunca o contém por acaso. */
const ehDominio = (host: string, dominio: string): boolean => host === dominio || host.endsWith(`.${dominio}`)

const GOOGLE = /^(?:[a-z0-9-]+\.)*google\.(?:[a-z]{2,3})(?:\.[a-z]{2})?$/

function faixaDoHost(host: string): PresenceSource {
  if (ehDominio(host, 'instagram.com')) return 'instagram'
  if (GOOGLE.test(host)) return 'google'
  if (ehDominio(host, 'wa.me') || ehDominio(host, 'whatsapp.com')) return 'whatsapp'
  return 'outros'
}

const UTM: Record<string, PresenceSource> = { instagram: 'instagram', google: 'google', whatsapp: 'whatsapp' }

/**
 * A faixa de origem. `utm_source` vence o referrer; sem nenhum dos dois (ou com referrer ilegível),
 * `direto`. Quem chega por um link sem marcação aberto dentro do app do Instagram ou do WhatsApp
 * costuma vir sem referrer, e conta como `direto`.
 */
export function sourceBucket(referrer: string | null | undefined, utm: string | null | undefined): PresenceSource {
  const marca = typeof utm === 'string' ? utm.trim().toLowerCase() : ''
  if (marca !== '') return UTM[marca] ?? 'outros'

  const ref = typeof referrer === 'string' ? referrer.trim() : ''
  if (ref === '') return 'direto'
  let host: string
  try {
    host = new URL(ref).hostname.toLowerCase()
  } catch {
    return 'direto'
  }
  if (host === '') return 'direto'
  return faixaDoHost(host)
}

/**
 * O aparelho, pelo user agent. iPad e Android sem `Mobile` ⇒ tablet; iPhone, iPod, Android com
 * `Mobile` e os outros celulares ⇒ celular; o resto (e a ausência) ⇒ computador. Limite declarado: o
 * iPadOS que se anuncia como Mac conta como computador.
 */
export function deviceBucket(ua: string | null | undefined): PresenceDevice {
  const s = typeof ua === 'string' ? ua : ''
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(s)) return 'tablet'
  if (/Android/i.test(s) && !/Mobile/i.test(s)) return 'tablet'
  if (/iPhone|iPod|Android|Mobi|Windows Phone|BlackBerry/i.test(s)) return 'celular'
  return 'computador'
}
