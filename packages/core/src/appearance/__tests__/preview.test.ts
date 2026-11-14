import { describe, expect, it } from 'vitest'
import { ANNOUNCEMENT_PREVIEW_SOURCE } from '../../announcements/preview.ts'
import { PREVIEW_SOURCE } from '../../home/preview.ts'
import { MENU_PREVIEW_SOURCE } from '../../menu/preview.ts'
import { STYLE_PROFILE_PREVIEW_SOURCE, parseStyleProfilePreviewMessage } from '../preview.ts'

/**
 * O canal da prévia do perfil: o painel manda o perfil escolhido (ainda não salvo), a loja num iframe
 * veste a paleta. Convive na mesma janela com os canais da Home, do menu e da faixa — o carimbo é o
 * que separa um do outro.
 */
describe('parseStyleProfilePreviewMessage', () => {
  it.each(['padrao', 'black-friday'])('aceita o rascunho com o perfil %s', perfil => {
    expect(
      parseStyleProfilePreviewMessage({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: perfil }),
    ).toEqual({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: perfil })
  })

  it('aceita o ready', () => {
    expect(parseStyleProfilePreviewMessage({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' })).toEqual({
      source: STYLE_PROFILE_PREVIEW_SOURCE,
      type: 'ready',
    })
  })

  it('o carimbo é só deste canal', () => {
    expect([PREVIEW_SOURCE, MENU_PREVIEW_SOURCE, ANNOUNCEMENT_PREVIEW_SOURCE]).not.toContain(
      STYLE_PROFILE_PREVIEW_SOURCE,
    )
  })

  it.each([
    ['o da faixa de avisos', ANNOUNCEMENT_PREVIEW_SOURCE],
    ['o da Home', PREVIEW_SOURCE],
    ['o do menu', MENU_PREVIEW_SOURCE],
  ])('recusa um rascunho com o carimbo de outro canal — %s', (_nome, source) => {
    expect(parseStyleProfilePreviewMessage({ source, type: 'draft', profile: 'black-friday' })).toBeNull()
    expect(parseStyleProfilePreviewMessage({ source, type: 'ready' })).toBeNull()
  })

  it.each([
    ['desconhecido', 'natal'],
    ['ausente', undefined],
    ['nulo', null],
    ['de outro tipo', 1],
  ])('recusa o rascunho com perfil %s, em vez de vestir o Padrão por cima do escolhido', (_nome, profile) => {
    expect(
      parseStyleProfilePreviewMessage({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile }),
    ).toBeNull()
  })

  it.each([
    ['nulo', null],
    ['string', STYLE_PROFILE_PREVIEW_SOURCE],
    ['lista', [STYLE_PROFILE_PREVIEW_SOURCE]],
    ['sem carimbo', { type: 'draft', profile: 'black-friday' }],
    ['tipo desconhecido', { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'show', profile: 'black-friday' }],
  ])('recusa o que não é mensagem do canal — %s', (_nome, data) => {
    expect(parseStyleProfilePreviewMessage(data)).toBeNull()
  })

  it('devolve só os campos do contrato', () => {
    expect(
      parseStyleProfilePreviewMessage({
        source: STYLE_PROFILE_PREVIEW_SOURCE,
        type: 'draft',
        profile: 'black-friday',
        extra: 'x',
      }),
    ).toEqual({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: 'black-friday' })
  })
})
