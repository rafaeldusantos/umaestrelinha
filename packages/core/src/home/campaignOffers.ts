// O bloco "Joias em oferta" da Home — o que ele diz e para onde ele leva.
//
// O bloco não tem campo nenhum: o rótulo, o título e os percentuais são da campanha de desconto em
// vigência, e sem campanha ele não aparece. O que mora aqui são as frases e os endereços, para a
// loja e os testes lerem a mesma escrita.
//
// Tom: o bloco diz os percentuais e que o valor já aparece com o desconto. Nada de contagem
// regressiva, "últimas horas" ou escassez — quem diz até quando vale é a vitrine, por data.
//
// Todo import é relativo com `.ts` explícito, como o resto do módulo.

import { percentList, sortedPercents } from '../campaigns/text.ts'
import { OFFERS_PATH } from '../routes/routes.ts'

/** A vitrine da campanha em vigência — o endereço é de `core/routes`, aqui só se reexpõe. */
export const CAMPAIGN_OFFERS_PATH = OFFERS_PATH

/** O parâmetro da vitrine que recorta por percentual (`/ofertas?percentual=15`). */
export const CAMPAIGN_PERCENT_PARAM = 'percentual'

/** Quantas peças a fileira do bloco mostra — uma linha de quatro a partir do `md`. */
export const CAMPAIGN_OFFERS_PIECES = 4

/** O título da fileira de peças. */
export const CAMPAIGN_OFFERS_PIECES_TITLE = 'Algumas das peças em oferta'

/** O link da fileira para a vitrine inteira. */
export const CAMPAIGN_OFFERS_SEE_ALL = 'Ver todas'

/** A vitrine, ou a vitrine recortada num percentual. */
export const campaignOffersHref = (percent?: number | null): string =>
  typeof percent === 'number' ? `${CAMPAIGN_OFFERS_PATH}?${CAMPAIGN_PERCENT_PARAM}=${percent}` : CAMPAIGN_OFFERS_PATH

/** "Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto." */
export const campaignOffersIntro = (percents: readonly number[]): string =>
  `Peças selecionadas com ${percentList(percents)} de desconto. O valor de cada joia já aparece com o desconto.`

/** O nome acessível do cartão de um percentual. */
export const campaignPercentCardLabel = (percent: number): string =>
  `Ver as peças com ${percent}% de desconto`

/** Os cartões: um por percentual, em ordem crescente, cada um levando à vitrine recortada. */
export const campaignPercentCards = (
  percents: readonly number[],
): { percent: number; href: string; label: string }[] =>
  sortedPercents(percents).map(percent => ({
    percent,
    href: campaignOffersHref(percent),
    label: campaignPercentCardLabel(percent),
  }))
