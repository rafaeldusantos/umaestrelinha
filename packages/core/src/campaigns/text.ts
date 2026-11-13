// Campanhas de desconto — os textos que dizem a campanha: vigência, estado, percentual, contraste,
// e a linha da vitrine.
//
// Tom: a vitrine diz ATÉ QUANDO vale, por data ("até 30 de novembro"). Nada de contagem
// regressiva, "últimas horas" ou escassez.
//
// Toda data aqui é de Brasília (`STORE_TIME_ZONE`), e todo fim mostrado é o ÚLTIMO MINUTO que vale
// (`lastMinuteOf`), nunca o `ends_at` exclusivo do banco.
//
// Folha alcançável pelo Deno: todo import é relativo com `.ts` explícito.

import { STORE_TIME_ZONE } from '../time/zone.ts'
import { lastMinuteOf } from './end.ts'
import { campaignStatus } from './status.ts'
import type { CampaignWindow, Instant } from './types.ts'

const PARTES = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const MES_POR_EXTENSO = new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIME_ZONE, day: 'numeric', month: 'long' })

const partes = (iso: string) => {
  const p = PARTES.formatToParts(new Date(iso))
  const v = (tipo: string): string => p.find(x => x.type === tipo)?.value ?? ''
  return { dia: v('day'), mes: v('month'), ano: v('year'), hora: v('hour'), minuto: v('minute') }
}

/** `'2026-11-13T03:00:00Z'` ⇒ `'13/11'`. */
export const campaignDayMonth = (iso: string): string => {
  const { dia, mes } = partes(iso)
  return `${dia}/${mes}`
}

/** `'2026-11-13T03:00:00Z'` ⇒ `'00:00'`. */
export const campaignHour = (iso: string): string => {
  const { hora, minuto } = partes(iso)
  return `${hora}:${minuto}`
}

/** "13/11 a 30/11/2026" — o fim é o último minuto que vale. Anos diferentes ⇒ os dois com ano. */
export function campaignPeriodLabel(campaign: Pick<CampaignWindow, 'starts_at' | 'ends_at'>): string {
  const inicio = partes(campaign.starts_at)
  const fim = partes(lastMinuteOf(campaign.ends_at))
  const comecoComAno = inicio.ano === fim.ano ? '' : `/${inicio.ano}`
  return `${inicio.dia}/${inicio.mes}${comecoComAno} a ${fim.dia}/${fim.mes}/${fim.ano}`
}

/** A frase do estado na edição: "em vigência até 30/11 às 23:59", "agendada — começa em…". */
export function campaignStatusLine(campaign: CampaignWindow, now: Instant): string {
  const ultimo = lastMinuteOf(campaign.ends_at)
  switch (campaignStatus(campaign, now)) {
    case 'em-vigencia':
      return `em vigência até ${campaignDayMonth(ultimo)} às ${campaignHour(ultimo)}`
    case 'agendada':
      return `agendada — começa em ${campaignDayMonth(campaign.starts_at)} às ${campaignHour(campaign.starts_at)}`
    case 'encerrada':
      return `encerrada em ${campaignDayMonth(ultimo)}`
    default:
      return 'desligada'
  }
}

/** O percentual do selo, com o sinal de menos tipográfico: `−20%`. */
export const campaignPercentBadge = (percent: number): string => `−${percent}%`

/** Os percentuais em ordem crescente, sem repetir. */
export const sortedPercents = (percents: readonly number[]): number[] =>
  [...new Set(percents)].sort((a, b) => a - b)

/** O maior percentual, ou `null` sem nenhum. */
export const highestPercent = (percents: readonly number[]): number | null =>
  percents.length === 0 ? null : Math.max(...percents)

/** `[10, 20, 15]` ⇒ `'10%, 15% e 20%'`. */
export function percentList(percents: readonly number[]): string {
  const itens = sortedPercents(percents).map(p => `${p}%`)
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** A linha da vitrine: "Peças com 10%, 15% e 20% de desconto até 30 de novembro." */
export function campaignShowcaseLine(percents: readonly number[], endsAt: string): string {
  return `Peças com ${percentList(percents)} de desconto até ${MES_POR_EXTENSO.format(new Date(lastMinuteOf(endsAt)))}.`
}

/** "9 peças", "1 peça", "nenhuma peça". */
export const campaignPiecesLabel = (n: number): string =>
  n === 0 ? 'nenhuma peça' : n === 1 ? '1 peça' : `${n} peças`

/**
 * A razão de contraste com uma casa e vírgula: `7,4:1`.
 *
 * Abaixo do mínimo, a casa é CORTADA e não arredondada: 4,47 sai "4,4:1". Arredondado, a tela
 * recusaria um par dizendo "4,5:1" — o próprio mínimo que ela pede.
 */
export function formatContrast(ratio: number, min = 4.5): string {
  const arredondado = Math.round(ratio * 10) / 10
  const valor = ratio < min && arredondado >= min ? Math.floor(ratio * 10) / 10 : arredondado
  return `${valor.toFixed(1).replace('.', ',')}:1`
}
