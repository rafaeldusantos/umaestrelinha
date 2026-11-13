// O canal da prévia da faixa de avisos: o painel manda, a loja (num iframe) desenha.
//
// O genérico — o `?preview=1`, a regra de "só dentro de iframe", os dois quadros, a escala — é o de
// `core/home/preview.ts`, reusado como está. O que mora aqui é só a forma das mensagens, separada das
// da Home e do menu pelo CARIMBO: as três chegam na mesma janela, e sem ele a mensagem de um canal
// viraria comando no outro. Quem valida a origem é cada ponta; aqui se valida a forma.

import { normalizeAnnouncements } from './normalize.ts'
import { ANNOUNCEMENT_LIMIT, type AnnouncementSettings } from './types.ts'

/** O carimbo de toda mensagem deste canal. */
export const ANNOUNCEMENT_PREVIEW_SOURCE = 'estrelinha-announcements-preview'

/** Painel → loja: a faixa a desenhar, com o que a dona acabou de mexer (o rascunho substitui o publicado). */
export interface AnnouncementPreviewDraftMessage {
  source: typeof ANNOUNCEMENT_PREVIEW_SOURCE
  type: 'draft'
  announcements: AnnouncementSettings
}

/**
 * Painel → loja: mostre o aviso desta posição (começa em zero). Mensagem distinta do rascunho: abrir
 * um aviso no painel o põe na frente sem reenviar a lista, e em prévia a faixa não gira sozinha.
 */
export interface AnnouncementPreviewShowMessage {
  source: typeof ANNOUNCEMENT_PREVIEW_SOURCE
  type: 'show'
  index: number
}

/** Loja → painel: montei, pode mandar. O aperto de mão dos outros dois canais, com este carimbo. */
export interface AnnouncementPreviewReadyMessage {
  source: typeof ANNOUNCEMENT_PREVIEW_SOURCE
  type: 'ready'
}

export type AnnouncementPreviewMessage =
  | AnnouncementPreviewDraftMessage
  | AnnouncementPreviewShowMessage
  | AnnouncementPreviewReadyMessage

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * A mensagem, validada — ou `null`.
 *
 * `itemCount` é quantos avisos a faixa da loja tem agora: "mostre o aviso N" com N fora da lista é
 * recusado, em vez de desenhar uma faixa vazia. O rascunho chega normalizado pela mesma leitura do
 * banco, para a prévia não aceitar o que a loja publicada descartaria.
 */
export const parseAnnouncementPreviewMessage = (
  data: unknown,
  itemCount: number,
): AnnouncementPreviewMessage | null => {
  if (!ehObjeto(data) || data.source !== ANNOUNCEMENT_PREVIEW_SOURCE) return null

  switch (data.type) {
    case 'ready':
      return { source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'ready' }

    case 'draft':
      if (!ehObjeto(data.announcements)) return null
      return {
        source: ANNOUNCEMENT_PREVIEW_SOURCE,
        type: 'draft',
        announcements: normalizeAnnouncements(data.announcements),
      }

    case 'show': {
      const index = data.index
      const teto = Math.min(itemCount, ANNOUNCEMENT_LIMIT)
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= teto) return null
      return { source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index }
    }

    default:
      return null
  }
}
