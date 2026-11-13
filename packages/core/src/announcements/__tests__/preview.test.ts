import { describe, expect, it } from 'vitest'
import { ANNOUNCEMENT_PREVIEW_SOURCE, parseAnnouncementPreviewMessage } from '../index.ts'
import { PREVIEW_SOURCE } from '../../home/preview.ts'
import { MENU_PREVIEW_SOURCE } from '../../menu/preview.ts'

const aviso = { id: 'a', kind: 'text', highlight: 'Frete grátis', text: '', linkLabel: '', href: '' }

describe('o canal da prévia da faixa', () => {
  it('tem carimbo próprio, diferente do da Home e do menu', () => {
    expect(ANNOUNCEMENT_PREVIEW_SOURCE).not.toBe(PREVIEW_SOURCE)
    expect(ANNOUNCEMENT_PREVIEW_SOURCE).not.toBe(MENU_PREVIEW_SOURCE)
  })

  it('aceita o rascunho, já normalizado', () => {
    const mensagem = parseAnnouncementPreviewMessage(
      {
        source: ANNOUNCEMENT_PREVIEW_SOURCE,
        type: 'draft',
        announcements: { enabled: true, items: [aviso, { kind: 'video' }] },
      },
      0,
    )
    expect(mensagem).toEqual({
      source: ANNOUNCEMENT_PREVIEW_SOURCE,
      type: 'draft',
      announcements: { enabled: true, items: [aviso] },
    })
  })

  it('aceita "mostre o aviso N" com o índice dentro da lista', () => {
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index: 2 }, 3)).toEqual({
      source: ANNOUNCEMENT_PREVIEW_SOURCE,
      type: 'show',
      index: 2,
    })
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index: 0 }, 1)).not.toBeNull()
  })

  it.each([3, 5, -1, 1.5, '1', null, undefined])('recusa "mostre o aviso" com índice %j fora da lista de 3', index => {
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index }, 3)).toBeNull()
  })

  it('aceita o aperto de mão da loja', () => {
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'ready' }, 0)).toEqual({
      source: ANNOUNCEMENT_PREVIEW_SOURCE,
      type: 'ready',
    })
  })

  it('recusa a mensagem da Home e a do menu, mesmo com o mesmo `type`', () => {
    for (const source of [PREVIEW_SOURCE, MENU_PREVIEW_SOURCE]) {
      expect(parseAnnouncementPreviewMessage({ source, type: 'ready' }, 3)).toBeNull()
      expect(
        parseAnnouncementPreviewMessage({ source, type: 'draft', announcements: { enabled: true, items: [aviso] } }, 3),
      ).toBeNull()
      expect(parseAnnouncementPreviewMessage({ source, type: 'show', index: 0 }, 3)).toBeNull()
    }
  })

  it('recusa sem carimbo, tipo desconhecido, rascunho que não é objeto e lixo', () => {
    expect(parseAnnouncementPreviewMessage({ type: 'show', index: 0 }, 3)).toBeNull()
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'open' }, 3)).toBeNull()
    expect(parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'draft' }, 3)).toBeNull()
    expect(
      parseAnnouncementPreviewMessage({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'draft', announcements: 'x' }, 3),
    ).toBeNull()
    for (const lixo of [null, undefined, 'x', 3, []]) {
      expect(parseAnnouncementPreviewMessage(lixo, 3)).toBeNull()
    }
  })
})
