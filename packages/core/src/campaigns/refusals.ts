// Campanhas de desconto — as recusas do cadastro.
//
// Cada uma devolve `string | null` (o motivo, ou nada): `strictNullChecks` está desligado neste
// repositório, e união discriminada por booleano não estreita. A frase é a que a tela mostra — a
// tela não a reescreve.
//
// O banco tem a segunda linha de cada regra (os `check`, a constraint de exclusão, a chave composta
// e o gatilho do teto); estas existem para a dona ler o motivo ANTES de gravar.
//
// Folha alcançável pelo Deno: todo import é relativo com `.ts` explícito.

import { contrastRatio } from '../color/contrast.ts'
import {
  CAMPAIGN_BADGE_MAX,
  CAMPAIGN_CONTRAST_MIN,
  CAMPAIGN_HEX,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_PERCENTS_MAX,
  CAMPAIGN_PERCENT_MAX,
  CAMPAIGN_PERCENT_MIN,
} from './limits.ts'
import { instantMs } from './live.ts'
import { lastMinuteOf } from './end.ts'
import { campaignDayMonth, formatContrast } from './text.ts'
import type { CampaignIdentity } from './types.ts'

export function campaignNameRefusal(name: string): string | null {
  const limpo = (name ?? '').trim()
  if (limpo.length === 0) return 'Dê um nome à campanha.'
  if (limpo.length > CAMPAIGN_NAME_MAX) return `O nome cabe até ${CAMPAIGN_NAME_MAX} caracteres.`
  return null
}

export const CAMPAIGN_BADGE_TOO_LONG =
  `O selo cabe até ${CAMPAIGN_BADGE_MAX} caracteres no cartão do celular. Use uma forma curta do nome.`

export function campaignBadgeRefusal(badgeText: string): string | null {
  const limpo = (badgeText ?? '').trim()
  if (limpo.length === 0) return 'Escreva o texto do selo.'
  if (limpo.length > CAMPAIGN_BADGE_MAX) return CAMPAIGN_BADGE_TOO_LONG
  return null
}

/**
 * Fim antes do início, comparando data E hora. Os dois são instantes (`starts_at` e o `ends_at`
 * exclusivo): o fim que vale tem de ser depois do início. `null` em qualquer um ⇒ data incompleta.
 */
export function campaignWindowRefusal(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt || !endsAt) return 'Preencha a data e a hora do início e do fim.'
  if (instantMs(endsAt) <= instantMs(startsAt)) return 'O fim vem antes do início.'
  return null
}

const percentForaDaFaixa = (p: number): boolean =>
  !Number.isInteger(p) || p < CAMPAIGN_PERCENT_MIN || p > CAMPAIGN_PERCENT_MAX

export const CAMPAIGN_PERCENT_RANGE = `Use um número de ${CAMPAIGN_PERCENT_MIN} a ${CAMPAIGN_PERCENT_MAX}.`
export const CAMPAIGN_PERCENTS_FULL = `Até ${CAMPAIGN_PERCENTS_MAX} percentuais por campanha.`

/** Acrescentar um percentual à lista que a campanha já tem (o campo "Adicionar"). */
export function campaignPercentAddRefusal(percent: number, current: readonly number[]): string | null {
  if (percentForaDaFaixa(percent)) return CAMPAIGN_PERCENT_RANGE
  if (current.includes(percent)) return `${percent}% já está na campanha.`
  if (current.length >= CAMPAIGN_PERCENTS_MAX) return CAMPAIGN_PERCENTS_FULL
  return null
}

/** A lista inteira, como vai ser gravada. */
export function campaignPercentsRefusal(percents: readonly number[]): string | null {
  if (percents.length === 0) return 'Acrescente ao menos um percentual.'
  const fora = percents.find(percentForaDaFaixa)
  if (fora !== undefined) return CAMPAIGN_PERCENT_RANGE
  const repetido = percents.find((p, i) => percents.indexOf(p) !== i)
  if (repetido !== undefined) return `${repetido}% já está na campanha.`
  if (percents.length > CAMPAIGN_PERCENTS_MAX) return CAMPAIGN_PERCENTS_FULL
  return null
}

/** Tirar um percentual que peças usam. `usage` é quantas peças estão nele. */
export function campaignPercentRemovalRefusal(percent: number, usage: number): string | null {
  if (!usage) return null
  const pecas = usage === 1 ? '1 peça usa' : `${usage} peças usam`
  return `${pecas} ${percent}%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o ${percent}%.`
}

export const CAMPAIGN_COLOR_FORMAT = 'Use o formato #RRGGBB nas duas cores.'

/**
 * As duas cores do selo. Formato antes de contraste: com uma cor inválida não há o
 * que medir. Abaixo de 4,5:1, a recusa traz a razão medida ("3,2:1 Pouca diferença…").
 */
export function campaignColorsRefusal(band: string, accent: string): string | null {
  if (!CAMPAIGN_HEX.test(band ?? '') || !CAMPAIGN_HEX.test(accent ?? '')) return CAMPAIGN_COLOR_FORMAT
  const razao = contrastRatio(band, accent)
  if (razao >= CAMPAIGN_CONTRAST_MIN) return null
  return `${formatContrast(razao, CAMPAIGN_CONTRAST_MIN)} Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o mínimo é 4,5:1).`
}

/** O par serve: a frase verde da tela ("7,4:1 Contraste bom para ler o selo."), ou `null`. */
export function campaignColorsApproval(band: string, accent: string): string | null {
  if (campaignColorsRefusal(band, accent) !== null) return null
  return `${formatContrast(contrastRatio(band, accent), CAMPAIGN_CONTRAST_MIN)} Contraste bom para ler o selo.`
}

/**
 * Uma campanha em vigência por vez. Só duas LIGADAS conflitam, e os intervalos são
 * meio-abertos (`[starts_at, ends_at)`), como a constraint de exclusão do banco: uma que termina
 * às 00:00 e outra que começa às 00:00 não se cruzam.
 */
export function campaignOverlapRefusal(
  candidate: Pick<CampaignIdentity, 'starts_at' | 'ends_at' | 'active'> & { id?: string | null },
  others: readonly CampaignIdentity[],
): string | null {
  if (!candidate.active || !candidate.starts_at || !candidate.ends_at) return null
  const inicio = instantMs(candidate.starts_at)
  const fim = instantMs(candidate.ends_at)
  const outra = others.find(
    o => o.active && o.id !== candidate.id && instantMs(o.starts_at) < fim && inicio < instantMs(o.ends_at),
  )
  if (!outra) return null
  const periodo = `${campaignDayMonth(outra.starts_at)} a ${campaignDayMonth(lastMinuteOf(outra.ends_at))}`
  return `A vigência cruza a da campanha “${outra.name}” (${periodo}). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra.`
}

/** Campanha usada em pedido não é apagada. `orders` é quantas linhas de pedido a usam. */
export function campaignDeleteRefusal(orders: number): string | null {
  if (!orders) return null
  return 'Esta campanha já foi usada em pedido e não pode ser apagada. Para tirá-la da loja, encerre ou desligue.'
}
