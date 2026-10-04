// `DET-03` — o botão "Acompanhar entrega" leva ao rastreio do pacote de SAÍDA (`orders.tracking_code`).
//
// ⚠️ O formato do link direto do Melhor Rastreio é premissa a confirmar em navegador (design.md):
// por isso o endereço mora numa constante só, e este teste prova a montagem, não o site.

import { describe, expect, it } from 'vitest'

import { PARCEL_TRACKING_BASE_URL, parcelTrackingUrl } from '../tracking'

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
