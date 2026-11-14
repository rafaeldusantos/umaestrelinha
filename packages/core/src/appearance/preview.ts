// O canal da prévia do perfil de estilo: o painel manda o perfil escolhido, a loja (num iframe) veste
// a paleta dele sem salvar nada.
//
// O genérico — o `?preview=1`, a regra de "só dentro de iframe", os quadros, a escala — é o de
// `core/home/preview.ts`, reusado como está. O que mora aqui é só a forma das mensagens, separada das
// da Home, do menu e da faixa pelo CARIMBO: as quatro chegam na mesma janela, e sem ele a mensagem de
// um canal viraria comando no outro. Quem valida a origem é cada ponta; aqui se valida a forma.

import { STYLE_PROFILES, type StyleProfile } from './types.ts'

/** O carimbo de toda mensagem deste canal. */
export const STYLE_PROFILE_PREVIEW_SOURCE = 'estrelinha-style-profile-preview'

/** Painel → loja: o perfil a vestir na prévia, no lugar do publicado. */
export interface StyleProfilePreviewDraftMessage {
  source: typeof STYLE_PROFILE_PREVIEW_SOURCE
  type: 'draft'
  profile: StyleProfile
}

/** Loja → painel: montei, pode mandar. O aperto de mão dos outros canais, com este carimbo. */
export interface StyleProfilePreviewReadyMessage {
  source: typeof STYLE_PROFILE_PREVIEW_SOURCE
  type: 'ready'
}

export type StyleProfilePreviewMessage = StyleProfilePreviewDraftMessage | StyleProfilePreviewReadyMessage

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * A mensagem, validada — ou `null`.
 *
 * O rascunho com perfil desconhecido é RECUSADO, e não normalizado para o Padrão: a leitura do banco
 * recua para o Padrão porque a loja precisa abrir com alguma paleta; na prévia, recuar vestiria o
 * Padrão por cima do perfil que a dona escolheu, e a prévia mostraria o que ela não pediu.
 */
export const parseStyleProfilePreviewMessage = (data: unknown): StyleProfilePreviewMessage | null => {
  if (!ehObjeto(data) || data.source !== STYLE_PROFILE_PREVIEW_SOURCE) return null

  switch (data.type) {
    case 'ready':
      return { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' }

    case 'draft': {
      const profile = data.profile
      if (typeof profile !== 'string' || !(STYLE_PROFILES as readonly string[]).includes(profile)) return null
      return { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: profile as StyleProfile }
    }

    default:
      return null
  }
}
