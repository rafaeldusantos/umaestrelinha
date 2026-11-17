// "Esta seção está no ar?" — a pergunta que a linha responde no estado e a lista soma no cabeçalho.
//
// As duas leem esta resposta, e não cada uma a sua: com duas escritas, o cabeçalho contaria no ar o
// bloco que a linha diz não aparecer.
//
// Para quase todo tipo, no ar é estar ligada. O bloco "Joias em oferta" é a exceção: ligado, ele só
// aparece quando a campanha dele é a vigente, e quem diz isso é `campaignOffersShows` — a mesma regra
// que a loja usa. Aqui só se descobre qual campanha é a vigente, pelo relógio do painel.

import { campaignStatus } from '@estrelinha/core/campaigns'
import { campaignOffersShows, type HomeSection } from '@estrelinha/core/home'
import type { AdminCampaign } from '@/entities/campaign'

/**
 * As campanhas, como a lista as leu (`useCampaigns`), e o relógio do painel.
 *
 * `loading`/`error` existem porque "ainda não li as campanhas" não é "o bloco está sem campanha":
 * dizer a segunda enquanto a primeira é verdade mandaria a dona escolher de novo o que já escolheu.
 */
export interface CampanhasDaLista {
  campaigns: readonly AdminCampaign[]
  loading: boolean
  error: string | null
  now: number
}

/**
 * A campanha vigente pelo relógio do painel, ou `null` — o banco mantém uma ligada por vez, e é a
 * que a loja recebe de `live_campaigns`.
 */
const campanhaVigente = (campanhas: CampanhasDaLista): string | null =>
  campanhas.campaigns.find(c => campaignStatus(c, campanhas.now) === 'em-vigencia')?.id ?? null

/**
 * A seção está no ar? Desligada nunca está. O bloco "Joias em oferta" ligado só está quando a
 * campanha dele é a vigente; enquanto as campanhas não foram lidas (carregando ou com falha), a
 * resposta é não — a tela não afirma o que não conferiu.
 */
export const secaoNoAr = (section: HomeSection, campanhas: CampanhasDaLista | undefined): boolean => {
  if (!section.active) return false
  if (section.type !== 'campaign_offers') return true
  if (!campanhas || campanhas.loading || campanhas.error) return false
  return campaignOffersShows(section, campanhaVigente(campanhas))
}
