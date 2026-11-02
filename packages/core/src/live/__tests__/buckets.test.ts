/**
 * As faixas de origem e de aparelho da presença. Só a FAIXA é guardada: o referrer, a URL de
 * origem e o user agent nunca saem desta função.
 */
import { describe, expect, it } from 'vitest'

import { deviceBucket, sourceBucket } from '../buckets.ts'

describe('sourceBucket — de onde a pessoa veio', () => {
  it.each([
    ['https://www.instagram.com/', 'instagram'],
    ['https://l.instagram.com/?u=https%3A%2F%2Fumaestrelinha.com.br', 'instagram'],
    ['https://www.google.com/', 'google'],
    ['https://www.google.com.br/search?q=joia', 'google'],
    ['https://shopping.google.com/', 'google'],
    ['https://wa.me/5551999999999', 'whatsapp'],
    ['https://api.whatsapp.com/send?phone=1', 'whatsapp'],
    ['https://web.whatsapp.com/', 'whatsapp'],
    ['https://www.facebook.com/', 'outros'],
    ['https://bing.com/', 'outros'],
  ])('referrer %s ⇒ %s', (referrer, faixa) => {
    expect(sourceBucket(referrer, null)).toBe(faixa)
  })

  it('sem referência nenhuma ⇒ direto', () => {
    expect(sourceBucket(null, null)).toBe('direto')
    expect(sourceBucket('', '')).toBe('direto')
    expect(sourceBucket('   ', undefined)).toBe('direto')
  })

  it('referrer ilegível ⇒ direto (nada a classificar)', () => {
    expect(sourceBucket('não é url', null)).toBe('direto')
  })

  it.each([
    ['instagram', 'instagram'],
    ['Instagram', 'instagram'],
    ['google', 'google'],
    ['whatsapp', 'whatsapp'],
    ['newsletter', 'outros'],
  ])('utm_source=%s ⇒ %s', (utm, faixa) => {
    expect(sourceBucket(null, utm)).toBe(faixa)
  })

  it('utm_source vence o referrer', () => {
    expect(sourceBucket('https://www.google.com/', 'instagram')).toBe('instagram')
    expect(sourceBucket('https://www.instagram.com/', 'newsletter')).toBe('outros')
  })

  it('um host que só CONTÉM o nome não é a rede (sufixo de domínio, não substring)', () => {
    expect(sourceBucket('https://fakeinstagram.com/', null)).toBe('outros')
    expect(sourceBucket('https://instagram.com.golpe.net/', null)).toBe('outros')
    expect(sourceBucket('https://notwa.me/', null)).toBe('outros')
  })
})

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  instagramApp:
    'Mozilla/5.0 (Linux; Android 13; moto g) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Instagram 300.0',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
}

describe('deviceBucket — o aparelho, pelo user agent', () => {
  it.each([
    ['iPhone', UA.iphone, 'celular'],
    ['Android de celular', UA.android, 'celular'],
    ['o app do Instagram no Android', UA.instagramApp, 'celular'],
    ['iPad', UA.ipad, 'tablet'],
    ['Android sem "Mobile"', UA.androidTablet, 'tablet'],
    ['Windows', UA.windows, 'computador'],
    ['Mac', UA.mac, 'computador'],
  ])('%s ⇒ %s', (_nome, ua, faixa) => {
    expect(deviceBucket(ua)).toBe(faixa)
  })

  it('sem user agent ⇒ computador (a faixa nunca falta)', () => {
    expect(deviceBucket(null)).toBe('computador')
    expect(deviceBucket('')).toBe('computador')
  })
})
