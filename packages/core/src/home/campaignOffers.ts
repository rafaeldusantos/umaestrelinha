// O bloco "Joias em oferta" da Home — quando ele aparece, o que ele diz e para onde ele leva.
//
// Cada bloco tem a SUA campanha (`home_sections.campaign_id`), e a Home pode ter mais de um, no
// máximo um por campanha (o índice único parcial `CAMPAIGN_OFFERS_CAMPAIGN_INDEX`). O bloco aparece
// na loja só quando a campanha dele é a vigente que o banco entrega — a loja compara ids, nunca
// datas. O rótulo acima do título continua sendo o texto do selo da campanha; o título e a
// descrição são da dona (`config.title`, `config.subtitle`), com recuo para o nome da campanha e
// para a frase dos percentuais. As peças escolhidas são os itens da seção; sem nenhuma, a fileira
// mostra as primeiras da campanha.
//
// O que mora aqui são as regras e as frases, para a loja, o painel e os testes lerem a mesma
// escrita: mostra-se?, os recuos, os tetos, a recusa, a frase da campanha já usada, o motivo de não
// aparecer e o aviso de prévia da campanha agendada.
//
// Tom: o bloco diz os percentuais e que o valor já aparece com o desconto. Nada de contagem
// regressiva, "últimas horas" ou escassez — quem diz até quando vale é a vitrine, por data.
//
// Todo import é relativo com `.ts` explícito, como o resto do módulo.

import { campaignDayMonth, campaignHour, percentList, sortedPercents } from '../campaigns/text.ts'
import type { CampaignStatus } from '../campaigns/status.ts'
import { OFFERS_PATH } from '../routes/routes.ts'
import { ordinal } from './carousel.ts'
import { FEATURED_PRODUCTS_MAX } from './featured.ts'
import type { HomeSectionConfig, HomeSectionItem } from './types.ts'

/** A vitrine da campanha em vigência — o endereço é de `core/routes`, aqui só se reexpõe. */
export const CAMPAIGN_OFFERS_PATH = OFFERS_PATH

/** O parâmetro da vitrine que recorta por percentual (`/ofertas?percentual=15`). */
export const CAMPAIGN_PERCENT_PARAM = 'percentual'

/** Quantas peças a fileira mostra SEM peça escolhida — uma linha de quatro a partir do `md`. */
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

/** O nome do índice único parcial "um bloco por campanha" — o `23505` da colisão o nomeia. */
export const CAMPAIGN_OFFERS_CAMPAIGN_INDEX = 'home_sections_campaign_offers_campaign_idx'

/** O teto do título do bloco — cabe em 390 px sem cortar. Contado sem aparar. */
export const CAMPAIGN_OFFERS_TITLE_MAX = 60

/** O teto da descrição do bloco. Contado sem aparar. */
export const CAMPAIGN_OFFERS_DESCRIPTION_MAX = 160

/** Quantas peças a dona escolhe por bloco — o mesmo teto de "Produtos em destaque". */
export const CAMPAIGN_OFFERS_PIECES_MAX = FEATURED_PRODUCTS_MAX

/**
 * O bloco sem campanha — o que nunca teve e o que perdeu a dele (a campanha apagada zera
 * `campaign_id` pela FK). Uma frase só para os dois: depois do `set null` não há como distingui-los,
 * e a dona precisa fazer a mesma coisa nos dois casos.
 */
export const CAMPAIGN_OFFERS_NO_CAMPAIGN =
  'O bloco está sem campanha e não aparece na loja. Escolha uma campanha.'

/** A seção como estas regras a leem: só a campanha escolhida. */
export interface CampaignOffersSectionLike {
  campaign_id?: string | null
}

const vazio = (valor: string | null | undefined): boolean => (valor ?? '').trim() === ''

/**
 * O bloco aparece? — só quando a campanha dele é a vigente.
 *
 * `liveCampaignId` é o id que o banco entrega como vigente (`live_campaigns`), ou `null` sem
 * nenhuma. A decisão é por id, nunca por data: a hora do aparelho da cliente pode estar errada, e a
 * vigência é do relógio do banco.
 */
export const campaignOffersShows = (
  section: CampaignOffersSectionLike | null | undefined,
  liveCampaignId: string | null | undefined,
): boolean => {
  const escolhida = section?.campaign_id
  return !vazio(escolhida) && !vazio(liveCampaignId) && escolhida === liveCampaignId
}

const MOTIVO_POR_ESTADO: Record<Exclude<CampaignStatus, 'em-vigencia'>, string> = {
  agendada:
    'A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência.',
  encerrada: 'A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha.',
  desligada:
    'A campanha escolhida está desligada, e o bloco não aparece na loja enquanto ela não for ligada.',
}

/**
 * Por que o bloco não aparece na loja — ou `null` quando aparece.
 *
 * `status` é o estado da campanha escolhida (`campaignStatus`), ou `null` quando ela não está entre
 * as campanhas — apagada, que vale o mesmo que sem campanha. Quem chama só pergunta depois de ler as
 * campanhas: "ainda carregando" não é "sem campanha".
 */
export const campaignOffersHiddenReason = (
  campaignId: string | null | undefined,
  status: CampaignStatus | null | undefined,
): string | null => {
  if (vazio(campaignId) || !status) return CAMPAIGN_OFFERS_NO_CAMPAIGN
  if (status === 'em-vigencia') return null
  return MOTIVO_POR_ESTADO[status] ?? CAMPAIGN_OFFERS_NO_CAMPAIGN
}

/** O título do bloco: o da dona, ou o nome da campanha quando ele está vazio. */
export const campaignOffersTitle = (
  config: HomeSectionConfig | null | undefined,
  campaignName: string,
): string => (vazio(config?.title) ? campaignName : (config!.title as string))

/** A descrição do bloco: a da dona, ou a frase dos percentuais quando ela está vazia. */
export const campaignOffersDescription = (
  config: HomeSectionConfig | null | undefined,
  percents: readonly number[],
): string => (vazio(config?.subtitle) ? campaignOffersIntro(percents) : (config!.subtitle as string))

/**
 * Por que este bloco não pode ser salvo — ou `null` quando pode.
 *
 * As cobranças vêm em ordem: a campanha (sem ela o bloco não aparece), o título, a descrição, o teto
 * de peças com o número, e só então cada peça — o item órfão (a peça apagada do catálogo) e a
 * repetida, com o ordinal. Sem peça escolhida é permitido: a fileira mostra as primeiras da
 * campanha. Os comprimentos são contados sem aparar, como a loja os desenha.
 *
 * `string | null`, e não união discriminada por booleano: `strictNullChecks: false` não a estreita.
 */
export const campaignOffersRefusal = (
  campaignId: string | null | undefined,
  config: HomeSectionConfig | null | undefined,
  items: readonly Partial<HomeSectionItem>[] | null | undefined,
): string | null => {
  if (vazio(campaignId)) return CAMPAIGN_OFFERS_NO_CAMPAIGN

  const titulo = (config?.title ?? '').length
  if (titulo > CAMPAIGN_OFFERS_TITLE_MAX) {
    return `Cabem ${CAMPAIGN_OFFERS_TITLE_MAX} caracteres no título, e há ${titulo}. Encurte o título.`
  }

  const descricao = (config?.subtitle ?? '').length
  if (descricao > CAMPAIGN_OFFERS_DESCRIPTION_MAX) {
    return `Cabem ${CAMPAIGN_OFFERS_DESCRIPTION_MAX} caracteres na descrição, e há ${descricao}. Encurte a descrição.`
  }

  const lista = items ?? []
  if (lista.length > CAMPAIGN_OFFERS_PIECES_MAX) {
    return `Cabem ${CAMPAIGN_OFFERS_PIECES_MAX} peças neste bloco, e há ${lista.length}. Remova as que sobram.`
  }

  const vistos = new Set<string>()
  for (let i = 0; i < lista.length; i += 1) {
    const numero = ordinal(i + 1)
    const id = (lista[i].product_id ?? '').trim()
    if (id === '') {
      return `${numero} item: escolha a peça, ou remova esta linha. Ela perdeu o produto do catálogo.`
    }
    if (vistos.has(id)) {
      return `${numero} item: esta peça já está no bloco. Cada uma aparece uma vez.`
    }
    vistos.add(id)
  }

  return null
}

/**
 * A campanha que já tem outro bloco — no seletor (a opção desabilitada) e na recusa da colisão.
 *
 * @param position a posição do outro bloco na lista da Home, a partir de 1
 * @param title o título com que o outro bloco aparece (o da dona, ou o recuo)
 */
export const campaignOffersTakenText = (position: number, title: string): string =>
  `Esta campanha já está no ${ordinal(position)} bloco da Home, “${title}”. Cada campanha tem um bloco só.`

/**
 * O aviso da campanha agendada no editor: a prévia é a loja, e a loja só mostra o bloco a partir do
 * início da campanha. A data e a hora são de Brasília.
 */
export const campaignOffersScheduledPreviewNote = (startsAt: string): string =>
  `A campanha começa em ${campaignDayMonth(startsAt)} às ${campaignHour(startsAt)}. A prévia e a loja mostram o bloco a partir daí.`
