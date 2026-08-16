// Feature 31 — os vídeos de preparo, como dado.
//
// São os vídeos que a Adri já gravou e publicou no canal da loja. O board `5MC-0` desenhava três
// vagas com desenho no lugar da capa; aqui são **cinco vídeos reais**, e a capa é a do próprio
// YouTube.

import type { MaterialKind } from '@estrelinha/core/material'

export interface VideoDePreparo {
  /** O id do YouTube. É ele que monta capa, player e o link de fallback — nunca a URL inteira. */
  id: string
  titulo: string
  descricao: string
  /** O material que este vídeo ensina, quando é um do catálogo. Liga a ficha ao vídeo. */
  kind?: MaterialKind
  /**
   * A duração, quando conhecida.
   *
   * **Vazio hoje, e de propósito.** O board mostra `1:48`, `2:05` e `1:32` nas capas, mas aqueles
   * números são de vagas de desenho — os vídeos de verdade são outros, e o repositório não tem como
   * medi-los (a API do YouTube exigiria chave). Escrever uma duração aproximada seria a loja mentir
   * um número exato; a legenda some quando o campo está vazio, e volta sozinha quando a dona
   * preencher.
   */
  duracao?: string
}

/**
 * Na ordem do board: os três materiais que mais geram dúvida primeiro, os outros dois depois.
 */
export const VIDEOS_DE_PREPARO: readonly VideoDePreparo[] = [
  {
    id: 'H4XRcc0ZoUA',
    titulo: 'Como enviar leite materno',
    descricao: 'Quanto tirar, qual frasco escolher e como vedar para nada vazar no caminho.',
    kind: 'leite_materno',
  },
  {
    id: '05giQozXsUY',
    titulo: 'Como enviar cinzas de cremação',
    descricao: 'Como separar a quantidade, fechar o recipiente e o que retorna com a joia.',
    kind: 'cinzas',
  },
  {
    id: '5uxMagYpWD4',
    titulo: 'Como enviar cabelos',
    descricao: 'O jeito certo de amarrar a mecha — e por que fita adesiva nunca deve ser usada.',
    kind: 'cabelo',
  },
  {
    id: 'SibX5kt8xRA',
    titulo: 'Como enviar os pelinhos do seu pet',
    descricao: 'Como recolher, amarrar e embalar os pelos para eles não se perderem no caminho.',
    kind: 'pelo_pet',
  },
  {
    id: '6mLwmo9GYQE',
    titulo: 'Como enviar coto umbilical',
    descricao: 'O que fazer com a presilha e como identificar o saquinho antes de postar.',
    kind: 'coto_umbilical',
  },
]

/**
 * A capa, servida pelo YouTube.
 *
 * `hqdefault` (480×360) e não `maxresdefault`: a versão máxima **não existe** para todo vídeo, e
 * quando falta o YouTube devolve uma imagem cinza de 120px em vez de um 404 — o card ficaria com uma
 * capa borrada e nada acusaria. `hqdefault` existe para todos.
 */
export const videoCapa = (id: string): string => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/**
 * O player, no domínio sem cookie.
 *
 * `youtube-nocookie.com` não grava cookie de rastreio até o play começar, e o iframe só é montado
 * quando a cliente abre o vídeo (`VideoLightbox`) — quem apenas passa pela página não carrega script
 * nenhum do YouTube. `rel=0` evita o mosaico de "vídeos relacionados" de outros canais no fim, que
 * numa página sobre cremação pode terminar em qualquer coisa.
 */
export const videoEmbed = (id: string): string =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`

/** O link de fora — o destino de "abrir no YouTube" e o fallback de quem bloqueia o iframe. */
export const videoUrl = (id: string): string => `https://youtu.be/${id}`

/** O vídeo de um material, quando existe. É o que acende o botão "ver o vídeo" dentro da ficha. */
export const videoDoMaterial = (kind: MaterialKind): VideoDePreparo | null =>
  VIDEOS_DE_PREPARO.find(video => video.kind === kind) ?? null
