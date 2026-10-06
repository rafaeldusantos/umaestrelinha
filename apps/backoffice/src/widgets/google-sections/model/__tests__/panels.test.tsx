// Feature 61 — o par entre "quais seções do Google existem" e "o que cada uma desenha".
//
// Bidirecional, no molde de `widgets/settings-sections/model/__tests__/panels.test.tsx`: seção sem
// painel abre em branco; painel sem seção fica no bundle sem ninguém alcançar. O `tsc` pega só o
// primeiro sentido.

import { describe, expect, it } from 'vitest'
import { GOOGLE_SECTIONS } from '@/shared/lib/googleSections'
import { AnalyticsPanel } from '@/features/google-analytics'
import { GoogleShoppingPanel } from '@/features/google-shopping'
import { GOOGLE_PANELS } from '../panels'

const chavesDoMapa = Object.keys(GOOGLE_PANELS)
const slugsDoRegistro = GOOGLE_SECTIONS.map(s => s.slug)

/** A régua, extraída para a asserção e o sensor chamarem a MESMA função. */
const divergem = (slugs: string[], chaves: string[]) =>
  slugs.some(s => !chaves.includes(s)) || chaves.some(c => !slugs.includes(c))

describe('GOOGLE_PANELS — âncora', () => {
  it('o registro e o mapa não estão vazios, e têm o mesmo tamanho', () => {
    expect(slugsDoRegistro.length).toBeGreaterThan(0)
    expect(chavesDoMapa.length).toBe(slugsDoRegistro.length)
  })
})

describe('GOOGLE_PANELS — bidirecional (registro ↔ painéis)', () => {
  it('toda seção tem painel, e todo painel é uma seção', () => {
    expect(divergem(slugsDoRegistro, chavesDoMapa)).toBe(false)
  })

  it('cada seção monta o painel da SUA feature', () => {
    // Trocar os dois passaria por completude — as duas chaves existem, as duas têm painel.
    expect(GOOGLE_PANELS.analytics).toBe(AnalyticsPanel)
    expect(GOOGLE_PANELS.shopping).toBe(GoogleShoppingPanel)
  })

  it('nenhuma seção compartilha o painel de outra', () => {
    const paineis = slugsDoRegistro.map(slug => GOOGLE_PANELS[slug])
    expect(new Set(paineis).size).toBe(paineis.length)
  })

  it('SENSOR: a régua reprova nos DOIS sentidos', () => {
    expect(divergem([...slugsDoRegistro, 'ads'], chavesDoMapa)).toBe(true)
    expect(divergem(slugsDoRegistro, [...chavesDoMapa, 'ads'])).toBe(true)
  })
})
