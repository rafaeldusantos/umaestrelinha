// A tela "Loja ao vivo" (Fase 2): as linhas dos blocos acima de Acessos, a partir de `store_live`.
//
// **Nenhum número nasce aqui.** O total, o funil, os 30 minutos, as joias, o Guia, as faixas de origem
// e os aparelhos chegam contados do servidor; este arquivo só arruma em linhas e escreve as frases.
// Nenhum `new Date`/`Date.now`.
//
// Aqui o número É de pessoas (quem pulsou nos últimos `LIVE_WINDOW_MIN` minutos), como em
// `presence.ts`: o guarda de tom do app põe este arquivo na régua da presença.
//
// ⚠️ Alcançável pelo Deno: imports relativos com extensão explícita, e nada de pacote.

import { formatCount } from '../stats/labels.ts'
import { NOBODY_IN_STORE, type LiveFunnel, type StoreLive, type StoreLiveJewel } from './presence.ts'
import type { PresenceDevice, PresenceSource } from '../visits/presence.ts'

/** A frase de ninguém na loja dentro de um bloco da tela (com ponto, ao contrário do cartão). */
export const NOBODY_IN_STORE_LINE = `${NOBODY_IN_STORE}.`

/**
 * Ao lado do número grande. Escrito por extenso: a janela é `LIVE_WINDOW_MIN` (5), e o teste da tela
 * confere que a frase diz o mesmo número.
 */
export const LIVE_WINDOW_LINE = 'nos últimos 5 minutos'

export const LIVE_CHART_FROM = '30 min atrás'
export const LIVE_CHART_TO = 'agora'

// ---------------------------------------------------------------------------------------------
// O que estão fazendo
// ---------------------------------------------------------------------------------------------

export const DOING_TITLE = 'O que estão fazendo'
export const BOUGHT_LABEL = 'Compraram (últimos 30 min)'

export type LiveFunnelStage = Exclude<keyof LiveFunnel, 'total'>

export interface LiveFunnelRow {
  stage: LiveFunnelStage
  rotulo: string
  n: number
  /** A largura da barra, em %: `round(n ÷ max(1, total) × 100)`; com ninguém na loja, 0. */
  pct: number
}

const FUNNEL_LABELS: readonly { stage: LiveFunnelStage; rotulo: string }[] = [
  { stage: 'olhando', rotulo: 'Olhando joias' },
  { stage: 'sacola', rotulo: 'Com joia na sacola' },
  { stage: 'checkout', rotulo: 'No checkout' },
]

/** As três faixas do funil, na ordem da tela. Exclusivas: a soma delas é o total. */
export const liveFunnelRows = (agora: LiveFunnel): LiveFunnelRow[] =>
  FUNNEL_LABELS.map(({ stage, rotulo }) => ({
    stage,
    rotulo,
    n: agora[stage],
    pct: Math.round((agora[stage] / Math.max(1, agora.total)) * 100),
  }))

// ---------------------------------------------------------------------------------------------
// Joias sendo vistas agora
// ---------------------------------------------------------------------------------------------

export const WATCHING_TITLE = 'Joias sendo vistas agora'
export const GUIDE_LABEL = 'Guia de envio do material'
/** O teto de joias da lista (o banco já corta em 5; aqui é a garantia do desenho). */
export const WATCHING_MAX = 5

export type LiveWatchingRow =
  | { kind: 'joia'; id: string; nome: string; imagens: unknown; pessoas: number }
  | { kind: 'guia'; id: 'guia'; nome: string; pessoas: number }

/**
 * Até 5 joias e, com alguém nele, a linha do Guia — ordenadas juntas: mais pessoas primeiro, empate
 * por nome. Páginas que não são de joia nem do Guia não entram (o servidor já não as manda).
 */
export const liveWatchingRows = (joias: readonly StoreLiveJewel[], guia: number): LiveWatchingRow[] => {
  const linhas: LiveWatchingRow[] = joias
    .slice(0, WATCHING_MAX)
    .map((j) => ({ kind: 'joia' as const, id: j.id, nome: j.nome, imagens: j.imagens, pessoas: j.pessoas }))
  if (guia > 0) linhas.push({ kind: 'guia', id: 'guia', nome: GUIDE_LABEL, pessoas: guia })
  return linhas.sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// ---------------------------------------------------------------------------------------------
// De onde vieram
// ---------------------------------------------------------------------------------------------

export const SOURCES_TITLE = 'De onde vieram'

export const SOURCE_LABELS: Record<PresenceSource, string> = {
  instagram: 'Instagram',
  google: 'Google',
  whatsapp: 'WhatsApp',
  direto: 'Direto',
  outros: 'Outros',
}

/** A letra pequena sobre o "Direto" (`LAV-40`). */
export const DIRECT_NOTE =
  'Quem abre um link sem marcação de origem dentro do app do Instagram ou do WhatsApp conta como Direto.'

export interface LiveSourceRow {
  faixa: PresenceSource
  rotulo: string
  n: number
}

/** As faixas com alguém, na ordem fixa do servidor; faixa com zero some. */
export const liveSourceRows = (origens: StoreLive['origens']): LiveSourceRow[] =>
  origens.filter((o) => o.n > 0).map((o) => ({ faixa: o.faixa, rotulo: SOURCE_LABELS[o.faixa], n: o.n }))

// ---------------------------------------------------------------------------------------------
// No celular
// ---------------------------------------------------------------------------------------------

export const MOBILE_TITLE = 'No celular'
export const MOBILE_REST = 'o resto pelo computador ou tablet'

/**
 * `{ principal: '6 de 7', resto }` — `resto` só quando nem todos estão no celular. Com ninguém na
 * loja, `null` (o bloco diz `NOBODY_IN_STORE_LINE`). O total é o de "Agora na loja".
 */
export const liveMobileLine = (
  aparelho: Record<PresenceDevice, number>,
  total: number,
): { principal: string; resto: string | null } | null =>
  total > 0
    ? {
        principal: `${formatCount(aparelho.celular)} de ${formatCount(total)}`,
        resto: aparelho.celular < total ? MOBILE_REST : null,
      }
    : null
