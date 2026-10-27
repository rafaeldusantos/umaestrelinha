// `DET-03` — o botão "Acompanhar entrega" leva ao rastreio do pacote de SAÍDA (`orders.tracking_code`).
//
// ⚠️ O formato do link direto do Melhor Rastreio é premissa a confirmar em navegador (design.md):
// por isso o endereço mora numa constante só, e este teste prova a montagem, não o site.

import { describe, expect, it } from 'vitest'

import {
  PARCEL_TRACKING_BASE_URL,
  TRACKING_CODE_MIN_LENGTH,
  normalizeMaterialTrackingCode,
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

  // QA da `82` (BUG-20261026-codigo-colado-leva-caractere-invisivel): colar do WhatsApp pode trazer
  // marcas invisíveis — o espaço de largura zero e as marcas de direção que o WhatsApp põe em volta de
  // números. `\s` não as pega; elas ficavam no código salvo, no link dos Correios e no que se copia.
  it.each([
    ['espaço de largura zero', 'AN123456789BR​', 'AN123456789BR'],
    ['marcas de direção em volta', '‪an123456789br‬', 'AN123456789BR'],
    ['marca da esquerda para a direita e BOM', '‎AN123﻿456789BR‏', 'AN123456789BR'],
    ['junção invisível e hífen suave', 'AN123⁠456­789BR', 'AN123456789BR'],
  ])('caractere invisível sai: %s', (_nome, colado, esperado) => {
    expect(normalizeTrackingCode(colado)).toBe(esperado)
  })

  it('o código só de caracteres invisíveis é vazio — a recusa do curto continua valendo', () => {
    expect(normalizeTrackingCode('​‪‬')).toBe('')
    expect(trackingCodeRefusal('AN12​​​​')).not.toBeNull()
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

// Feature `82`, Fase 5 (T19, `BUG-20261026-codigo-com-hifen-ou-espaco-gravado`, `BL-054`): o código do
// ENVELOPE da cliente tem uma forma só no banco, qualquer que seja o escritor (app, painel, loja). Além
// do que `normalizeTrackingCode` tira, saem o hífen e o ponto — a forma em que o código circula no
// WhatsApp. Sem formato imposto (a forma `AA000000000AA` não é exigida).
describe('normalizeMaterialTrackingCode (T19)', () => {
  it.each([
    ['hífen e ponto', 'AN-123.456.789-BR', 'AN123456789BR'],
    ['espaços e minúsculas', 'an 1234 5678 9br', 'AN123456789BR'],
    ['espaço de largura zero e marcas de direção', '\u202Aan\u200B123-456.789\u200Bbr\u202C', 'AN123456789BR'],
    ['tab e quebra de linha', '\tAN123\n456789BR ', 'AN123456789BR'],
    ['a forma do painel, com espaços', 'PN 1234 5678 9BR', 'PN123456789BR'],
  ])('%s ⇒ a forma única', (_nome, digitado, esperado) => {
    expect(normalizeMaterialTrackingCode(digitado)).toBe(esperado)
  })

  it('sem formato imposto: o código de outra transportadora passa, só sem hífen e ponto', () => {
    expect(normalizeMaterialTrackingCode('jd-0001.2345')).toBe('JD00012345')
  })

  it('vazio, nulo, ausente ou só separadores ⇒ vazio', () => {
    expect(normalizeMaterialTrackingCode('')).toBe('')
    expect(normalizeMaterialTrackingCode(null)).toBe('')
    expect(normalizeMaterialTrackingCode(undefined)).toBe('')
    expect(normalizeMaterialTrackingCode(' - . \u200B ')).toBe('')
  })

  it('`normalizeTrackingCode` (o rastreio de SAÍDA) fica intacto: o hífen continua', () => {
    expect(normalizeTrackingCode('AN-123.456.789-BR')).toBe('AN-123.456.789-BR')
  })
})
