// A faixa de avisos — a forma do que a dona grava em `store_settings['announcements']`, os tetos e as
// medidas. Três leitores a consultam: a loja (desenha), a função `api/page` (decide se a faixa existe
// antes de o React montar) e o painel (recusa e manda o rascunho à prévia). Por isso mora aqui, e não
// em nenhum dos três.
//
// Folha sem import: a função `api/page` empacota este módulo fora do Vite.

/**
 * Os tipos de aviso que a faixa conhece — o catálogo inteiro.
 *
 * O que NÃO está aqui é regra: a loja não tem aviso com relógio correndo, com estoque nem com número
 * de gente comprando. Um teste assere essa ausência; um tipo novo entra só por decisão de produto.
 */
export const ANNOUNCEMENT_KINDS = ['text', 'image'] as const

export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number]

/**
 * Aviso de texto: o trecho em destaque, o texto e o rótulo do link, nesta ordem na faixa.
 *
 * `href` vazio é aviso sem link — vira texto. Os campos são `string`, nunca `null`: texto vazio é a
 * ausência, e a recusa apara antes de contar.
 */
export interface TextAnnouncement {
  id: string
  kind: 'text'
  highlight: string
  text: string
  linkLabel: string
  href: string
}

/** Aviso de imagem: uma arte por dispositivo, a descrição e o destino (opcional). */
export interface ImageAnnouncement {
  id: string
  kind: 'image'
  imageDesktop: string
  imageMobile: string
  alt: string
  href: string
}

/** Discriminado por literal de STRING — `strictNullChecks: false` estreita esta forma. */
export type Announcement = TextAnnouncement | ImageAnnouncement

export interface AnnouncementSettings {
  enabled: boolean
  items: Announcement[]
}

/**
 * O padrão: desligada e sem avisos. Não há migration — a ausência da linha `announcements` É este
 * valor, e uma loja que nunca abriu a tela não ganha faixa nenhuma.
 */
export const DEFAULT_ANNOUNCEMENTS: AnnouncementSettings = { enabled: false, items: [] }

/** Quantos avisos cabem na faixa. Do sexto em diante, a leitura ignora. */
export const ANNOUNCEMENT_LIMIT = 5

/**
 * Os tetos do aviso de texto, por campo e no conjunto (destaque + texto + rótulo).
 *
 * O conjunto é o que cabe em duas linhas no celular de 390 px; os de campo impedem um só campo de
 * comer o aviso inteiro. São premissa a medir em navegador.
 */
export const ANNOUNCEMENT_HIGHLIGHT_MAX = 40
export const ANNOUNCEMENT_TEXT_MAX = 60
export const ANNOUNCEMENT_LINK_LABEL_MAX = 20
export const ANNOUNCEMENT_COMBINED_MAX = 90

/**
 * A altura da faixa — fixa, a mesma para todo aviso, para a troca não mexer na página.
 *
 * Em `rem`, para acompanhar a fonte do sistema. No celular, duas linhas de texto (18 px de entrelinha
 * cada) mais 16 px de recuo; no computador, 48 px. A loja a recebe por variável CSS.
 */
export const ANNOUNCEMENT_BAR_HEIGHT = {
  mobile: 'calc(2 * 1.125rem + 1rem)',
  desktop: '3rem',
} as const

/** As vagas da arte, em pixels do arquivo que a dona envia. A arte aparece inteira, sem corte. */
export const ANNOUNCEMENT_ART_SLOTS = {
  desktop: { width: 1440, height: 48 },
  mobile: { width: 780, height: 96 },
} as const
