// O rascunho da faixa de avisos, como a tela o edita.
//
// Cada aviso do rascunho carrega os campos dos DOIS tipos: trocar de "Texto" para "Imagem" e voltar
// não pode apagar o que a dona já escreveu. O que se grava (e o que vai à prévia) é só o do tipo
// escolhido — `paraGravar` monta o aviso de `core` campo a campo, e nada do outro tipo atravessa.
//
// Quem diz se um aviso pode ser salvo, e por quê, é `core/announcements` (`announcementRefusals`). Este
// arquivo só decide EM QUE CAMPO cada frase de `core` aparece; as frases, a ordem das cobranças e os
// tetos são de lá.

import {
  ANNOUNCEMENT_HIGHLIGHT_MAX,
  ANNOUNCEMENT_LINK_LABEL_MAX,
  ANNOUNCEMENT_TEXT_MAX,
  announcementRefusal,
  announcementRefusals,
  type Announcement,
  type AnnouncementKind,
  type AnnouncementSettings,
} from '@estrelinha/core/announcements'
import { ctaHrefRefusal } from '@estrelinha/core/home'

export interface AvisoRascunho {
  id: string
  kind: AnnouncementKind
  highlight: string
  text: string
  linkLabel: string
  href: string
  imageDesktop: string
  imageMobile: string
  alt: string
}

export interface FaixaRascunho {
  enabled: boolean
  items: AvisoRascunho[]
}

/** Os campos de um aviso que podem receber a recusa. */
export type CampoDoAviso = 'highlight' | 'text' | 'linkLabel' | 'href' | 'imageDesktop' | 'imageMobile' | 'alt'

let sequencia = 0

/** Um id novo para um aviso. O id só identifica o aviso dentro da lista; a loja não o mostra. */
export const novoIdDeAviso = (): string => {
  sequencia += 1
  const aleatorio =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${sequencia}`
  return `aviso-${aleatorio}`
}

/** O aviso que "+ Adicionar aviso" cria: de texto, vazio. */
export const avisoVazio = (id: string = novoIdDeAviso()): AvisoRascunho => ({
  id,
  kind: 'text',
  highlight: '',
  text: '',
  linkLabel: '',
  href: '',
  imageDesktop: '',
  imageMobile: '',
  alt: '',
})

/** O aviso gravado, aberto para edição. */
export const avisoDoGravado = (aviso: Announcement): AvisoRascunho =>
  aviso.kind === 'image'
    ? { ...avisoVazio(aviso.id), kind: 'image', imageDesktop: aviso.imageDesktop, imageMobile: aviso.imageMobile, alt: aviso.alt, href: aviso.href }
    : { ...avisoVazio(aviso.id), kind: 'text', highlight: aviso.highlight, text: aviso.text, linkLabel: aviso.linkLabel, href: aviso.href }

export const faixaDoGravado = (gravado: AnnouncementSettings): FaixaRascunho => ({
  enabled: gravado.enabled === true,
  items: gravado.items.map(avisoDoGravado),
})

/** O aviso, só com os campos do tipo escolhido — a forma de `core`. */
export const paraAviso = (r: AvisoRascunho): Announcement =>
  r.kind === 'image'
    ? { id: r.id, kind: 'image', imageDesktop: r.imageDesktop, imageMobile: r.imageMobile, alt: r.alt, href: r.href }
    : { id: r.id, kind: 'text', highlight: r.highlight, text: r.text, linkLabel: r.linkLabel, href: r.href }

/** O valor que vai para `store_settings['announcements']` — e para a prévia. */
export const paraGravar = (faixa: FaixaRascunho): AnnouncementSettings => ({
  enabled: faixa.enabled,
  items: faixa.items.map(paraAviso),
})

/** A recusa deste aviso, na frase de `core` — ou `null`. */
export const recusaDoAviso = (r: AvisoRascunho, indice: number): string | null =>
  announcementRefusal(paraAviso(r), indice)

/** Todas as recusas deste aviso, nas frases de `core`, na ordem da tela — vazia quando pode ser salvo. */
export const recusasDoAviso = (r: AvisoRascunho, indice: number): string[] =>
  announcementRefusals(paraAviso(r), indice)

/** As vagas do aviso de imagem, na ordem em que `core` cobra o que falta nelas. */
const CAMPOS_DA_IMAGEM = ['imageDesktop', 'imageMobile', 'alt'] as const

/**
 * Cada recusa no seu campo. No aviso de imagem `core` cobra juntas as vagas que faltam, uma frase por
 * vaga vazia e na ordem de `CAMPOS_DA_IMAGEM`; aqui elas só são casadas com as vagas, em ordem. O
 * destino continua sendo reconhecido pela frase da régua do Banner principal.
 */
export const recusasPorCampo = (
  r: AvisoRascunho,
  motivos: readonly string[],
): Partial<Record<CampoDoAviso, string>> => {
  const porCampo: Partial<Record<CampoDoAviso, string>> = {}
  const vazias: CampoDoAviso[] = r.kind === 'image' ? CAMPOS_DA_IMAGEM.filter(c => r[c].trim() === '') : []
  for (const motivo of motivos) {
    const campo = campoDaRecusa(r, motivo)
    const lugar = r.kind === 'image' && campo !== 'href' ? vazias.shift() ?? campo : campo
    if (lugar && porCampo[lugar] === undefined) porCampo[lugar] = motivo
  }
  return porCampo
}

/**
 * Em que campo a recusa aparece. A frase é de `core`; aqui só se escolhe o lugar dela na tela, pela
 * mesma pergunta que a frase responde (qual campo falta, qual passa do teto, ou o destino).
 */
export const campoDaRecusa = (r: AvisoRascunho, motivo: string | null): CampoDoAviso | null => {
  if (!motivo) return null
  const href = r.href.trim()
  const doDestino = href ? ctaHrefRefusal(href) : null
  if (doDestino && motivo.endsWith(doDestino)) return 'href'

  if (r.kind === 'image') {
    if (r.imageDesktop.trim() === '') return 'imageDesktop'
    if (r.imageMobile.trim() === '') return 'imageMobile'
    return 'alt'
  }

  // A ordem é a de `announcementRefusal`: o que falta, o rótulo sem destino, os tetos por campo, e o
  // teto do conjunto por último. Olhar noutra ordem poria a frase de `core` no campo errado.
  const destaque = r.highlight.trim().length
  const texto = r.text.trim().length
  const rotulo = r.linkLabel.trim().length
  if (destaque === 0 && texto === 0) return 'text'
  if (rotulo > 0 && href === '') return 'linkLabel'
  if (destaque > ANNOUNCEMENT_HIGHLIGHT_MAX) return 'highlight'
  if (texto > ANNOUNCEMENT_TEXT_MAX) return 'text'
  if (rotulo > ANNOUNCEMENT_LINK_LABEL_MAX) return 'linkLabel'
  return 'text'
}

/** A primeira linha do botão-resumo de um aviso. */
export const tituloDoAviso = (r: AvisoRascunho): string => {
  if (r.kind === 'image') return r.alt.trim() || 'Aviso de imagem'
  const partes = [r.highlight.trim(), r.text.trim()].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : 'Aviso de texto'
}

/** A segunda linha: o tipo e o destino. */
export const apoioDoAviso = (r: AvisoRascunho): string =>
  `${r.kind === 'image' ? 'Imagem' : 'Texto'} · ${r.href.trim() || 'sem link'}`

/** A lista com o aviso de `de` levado para `para`. Fora da lista, devolve a mesma. */
export const moverAviso = <T,>(lista: readonly T[], de: number, para: number): T[] => {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) return [...lista]
  const copia = [...lista]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}
