// Por que um aviso não pode ser salvo — e, por consequência, se a faixa existe.
//
// Uma régua só para os três leitores: o painel recusa por ela antes de gravar, e a loja e a função
// `api/page` perguntam "a faixa existe?" à mesma régua. Se o painel aceitasse o que a loja descarta,
// a dona veria um aviso salvo que a cliente nunca vê.

import { ctaHrefRefusal } from '../home/refusals.ts'
import { ordinal } from '../home/carousel.ts'
import {
  ANNOUNCEMENT_COMBINED_MAX,
  ANNOUNCEMENT_HIGHLIGHT_MAX,
  ANNOUNCEMENT_LIMIT,
  ANNOUNCEMENT_LINK_LABEL_MAX,
  ANNOUNCEMENT_TEXT_MAX,
  type Announcement,
  type AnnouncementSettings,
} from './types.ts'

const aparado = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '')

/**
 * Por que este aviso não pode ser salvo — ou `null` quando pode. `index` começa em zero.
 *
 * Devolve `string | null`, e não união discriminada por booleano: com `strictNullChecks: false` essa
 * união não estreita, e ler o motivo no ramo do `else` seria TS2339.
 *
 * A ordem das cobranças é a da tela: primeiro o que falta, depois o que passa do teto, o destino por
 * último. Texto: o trecho em destaque ou o texto (um dos dois basta); o rótulo só com destino; os
 * tetos por campo; o teto do conjunto. Imagem: as duas artes e a descrição. Destino vazio vale nos
 * dois — o aviso vira texto sem link; o preenchido passa pela régua do Banner principal.
 */
export const announcementRefusal = (
  item: Announcement | null | undefined,
  index: number,
): string | null => {
  const numero = `${ordinal(index + 1)} aviso`
  if (!item || typeof item !== 'object') return `${numero}: escolha o tipo — texto ou imagem.`

  const href = aparado(item.href)

  if (item.kind === 'text') {
    const destaque = aparado(item.highlight)
    const texto = aparado(item.text)
    const rotulo = aparado(item.linkLabel)

    if (destaque === '' && texto === '') {
      return `${numero}: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja.`
    }
    if (rotulo !== '' && href === '') {
      return `${numero}: Sem destino, o rótulo do link não aparece.`
    }
    if (destaque.length > ANNOUNCEMENT_HIGHLIGHT_MAX) {
      return `${numero}: o trecho em destaque passa de ${ANNOUNCEMENT_HIGHLIGHT_MAX} caracteres.`
    }
    if (texto.length > ANNOUNCEMENT_TEXT_MAX) {
      return `${numero}: o texto passa de ${ANNOUNCEMENT_TEXT_MAX} caracteres.`
    }
    if (rotulo.length > ANNOUNCEMENT_LINK_LABEL_MAX) {
      return `${numero}: o rótulo do link passa de ${ANNOUNCEMENT_LINK_LABEL_MAX} caracteres.`
    }
    if (destaque.length + texto.length + rotulo.length > ANNOUNCEMENT_COMBINED_MAX) {
      return (
        `${numero}: juntos, o trecho em destaque, o texto e o rótulo do link passam de ` +
        `${ANNOUNCEMENT_COMBINED_MAX} caracteres — no celular, o aviso não cabe em duas linhas.`
      )
    }
  } else if (item.kind === 'image') {
    if (aparado(item.imageDesktop) === '') {
      return `${numero}: envie a arte do computador.`
    }
    if (aparado(item.imageMobile) === '') {
      return `${numero}: envie a arte do celular.`
    }
    if (aparado(item.alt) === '') {
      return `${numero}: Descreva a arte: é o que o leitor de tela e o Google leem.`
    }
  } else {
    return `${numero}: escolha o tipo — texto ou imagem.`
  }

  if (href === '') return null
  const destino = ctaHrefRefusal(href)
  return destino ? `${numero}: ${destino}` : null
}

/** Por que esta faixa não pode ser salva — ou `null` quando pode. Lista vazia vale: a faixa some. */
export const announcementsRefusal = (
  settings: AnnouncementSettings | null | undefined,
): string | null => {
  const lista = settings?.items ?? []

  if (lista.length > ANNOUNCEMENT_LIMIT) {
    return `Cabem ${ANNOUNCEMENT_LIMIT} avisos na faixa, e há ${lista.length}. Remova os que sobram.`
  }

  for (let i = 0; i < lista.length; i += 1) {
    const motivo = announcementRefusal(lista[i], i)
    if (motivo) return motivo
  }

  return null
}

/**
 * A faixa existe? Só com o interruptor ligado **e** ao menos um aviso válido.
 *
 * Recebe o valor já normalizado (`normalizeAnnouncements`). Desligada, sem aviso ou só com avisos que
 * o painel recusaria: não existe, e o cabeçalho volta ao topo.
 */
export const announcementBarExists = (settings: AnnouncementSettings | null | undefined): boolean => {
  if (!settings || settings.enabled !== true) return false
  const lista = Array.isArray(settings.items) ? settings.items : []
  return lista.some((item, i) => announcementRefusal(item, i) === null)
}
