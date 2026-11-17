// A campanha que já tem outro bloco "Joias em oferta".
//
// Duas perguntas, uma resposta: o seletor do editor desabilita a campanha usada dizendo qual bloco a
// tem, e a gravação que colide no índice "um bloco por campanha" (duas abas, duas gravações) é
// recusada com a MESMA frase. A frase é de `core` (`campaignOffersTakenText`); aqui só se acha o
// outro bloco — a posição dele na lista da Home e o título com que ele aparece.

import {
  CAMPAIGN_OFFERS_CAMPAIGN_INDEX,
  campaignOffersTakenText,
  campaignOffersTitle,
  orderSections,
  type HomeSection,
} from '@estrelinha/core/home'

/**
 * As campanhas que OUTRO bloco "Joias em oferta" já usa → a frase que diz qual bloco.
 *
 * @param sections as seções da Home (a ordem é refeita por `orderSections`)
 * @param selfId o bloco em edição — a campanha dele não conta como tomada
 * @param campaignName o nome de uma campanha pelo id (o recuo do título do outro bloco)
 */
export const campaignsTaken = (
  sections: readonly HomeSection[],
  selfId: string,
  campaignName: (campaignId: string) => string,
): Map<string, string> => {
  const tomadas = new Map<string, string>()
  orderSections([...sections]).forEach((s, indice) => {
    if (s.id === selfId || s.type !== 'campaign_offers' || !s.campaign_id) return
    tomadas.set(
      s.campaign_id,
      campaignOffersTakenText(indice + 1, campaignOffersTitle(s.config, campaignName(s.campaign_id))),
    )
  })
  return tomadas
}

/**
 * A gravação bateu no índice "um bloco por campanha"? Pelo código e pelo NOME do índice: outro
 * `23505` segue com a mensagem do banco (`AD-029`).
 */
export const isCampaignCollision = (erro: { message?: string; code?: string } | null | undefined): boolean =>
  !!erro && erro.code === '23505' && (erro.message ?? '').includes(CAMPAIGN_OFFERS_CAMPAIGN_INDEX)

/** A frase da colisão, com o bloco que já tem a campanha — ou `null` quando ele não está na lista. */
export const campaignCollisionText = (
  sections: readonly HomeSection[],
  selfId: string,
  campaignId: string,
  campaignName: (campaignId: string) => string,
): string | null => campaignsTaken(sections, selfId, campaignName).get(campaignId) ?? null
