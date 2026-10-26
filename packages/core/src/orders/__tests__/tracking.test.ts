// `DET-03` — o botão "Acompanhar entrega" leva ao rastreio do pacote de SAÍDA (`orders.tracking_code`).
//
// ⚠️ O formato do link direto do Melhor Rastreio é premissa a confirmar em navegador (design.md):
// por isso o endereço mora numa constante só, e este teste prova a montagem, não o site.

import { describe, expect, it } from 'vitest'

import {
  PARCEL_TRACKING_BASE_URL,
  TRACKING_CODE_MIN_LENGTH,
  normalizeTrackingCode,
  parcelTrackingUrl,
  trackingCodeRefusal,
} from '../tracking'

describe('parcelTrackingUrl', () => {
  it('monta o endereço do rastreio com o código', () => {
    expect(parcelTrackingUrl('QB123456789BR')).toBe(
      'https://www.melhorrastreio.com.br/rastreio/QB123456789BR',
    )
    expect(PARCEL_TRACKING_BASE_URL).toBe('https://www.melhorrastreio.com.br/rastreio/')
  })

  it('apara o espaço e passa o código para maiúsculas', () => {
    expect(parcelTrackingUrl('  qb123456789br \n')).toBe(
      'https://www.melhorrastreio.com.br/rastreio/QB123456789BR',
    )
  })

  it('vazio, só espaço ou ausente devolve null — o cartão não aparece', () => {
    expect(parcelTrackingUrl('')).toBeNull()
    expect(parcelTrackingUrl('   ')).toBeNull()
    expect(parcelTrackingUrl(null)).toBeNull()
    expect(parcelTrackingUrl(undefined)).toBeNull()
  })

  it('codifica o que não pode ir cru numa URL', () => {
    // Um código colado com barra ou `?` não pode virar outro caminho nem uma query.
    expect(parcelTrackingUrl('ab/12?x')).toBe(
      'https://www.melhorrastreio.com.br/rastreio/AB%2F12%3FX',
    )
  })
})

// Feature `75` (`MAA-12`, A8) — o código que a Adri digita no balcão do correio. A frase é escrita
// POR EXTENSO aqui, nunca lida da implementação: um teste que comparasse a constante com ela mesma
// passaria com a frase trocada.
describe('normalizeTrackingCode (MAA-12, A8)', () => {
  it('apara, tira os espaços internos e põe em maiúsculas', () => {
    expect(normalizeTrackingCode(' an 123 456 789 br ')).toBe('AN123456789BR')
  })

  it('tab e quebra de linha também saem — colar de um e-mail traz os dois', () => {
    expect(normalizeTrackingCode('\tan123\n456789br\r\n')).toBe('AN123456789BR')
  })

  it('o que não é espaço fica: hífen e dígitos de outras transportadoras', () => {
    expect(normalizeTrackingCode('jd-0001 2345')).toBe('JD-00012345')
  })

  it('vazio continua vazio', () => {
    expect(normalizeTrackingCode('')).toBe('')
    expect(normalizeTrackingCode('   ')).toBe('')
  })
})

describe('trackingCodeRefusal (MAA-12, A8)', () => {
  const FRASE = 'Confira o código — ele costuma ter 13 caracteres.'

  it('o mínimo é 8', () => {
    expect(TRACKING_CODE_MIN_LENGTH).toBe(8)
  })

  it('7 caracteres DEPOIS de normalizar é recusado com a frase', () => {
    expect(trackingCodeRefusal('ab12345')).toBe(FRASE)
    // 8 com espaço dentro vira 7: a contagem é do código normalizado, não do que foi digitado.
    expect(trackingCodeRefusal(' ab 12 345 ')).toBe(FRASE)
  })

  it('8 caracteres passa', () => {
    expect(trackingCodeRefusal('ab123456')).toBeNull()
    expect(trackingCodeRefusal(' ab 123 456 ')).toBeNull()
  })

  it('o código dos Correios passa', () => {
    expect(trackingCodeRefusal('AN123456789BR')).toBeNull()
  })

  it('sem formato imposto: Jadlog, Loggi e Melhor Envio passam', () => {
    expect(trackingCodeRefusal('10084512345678')).toBeNull() // Jadlog, só dígitos
    expect(trackingCodeRefusal('LGI-7Q2X9K4M')).toBeNull() // Loggi, com hífen
    expect(trackingCodeRefusal('ME2410AB34CD')).toBeNull() // Melhor Envio
  })

  it('vazio, só espaço, nulo ou ausente é recusado com a mesma frase', () => {
    expect(trackingCodeRefusal('')).toBe(FRASE)
    expect(trackingCodeRefusal('    ')).toBe(FRASE)
    expect(trackingCodeRefusal(null)).toBe(FRASE)
    expect(trackingCodeRefusal(undefined)).toBe(FRASE)
  })
})
