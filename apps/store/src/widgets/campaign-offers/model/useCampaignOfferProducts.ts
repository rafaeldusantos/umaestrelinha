import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { CAMPAIGN_OFFERS_PIECES } from '@estrelinha/core/home'
import type { Product } from '@estrelinha/supabase/types'
import {
  CAMPAIGN_FILTER_COLUMN,
  listingWindow,
  mapDbToProduct,
  PRODUCT_CARD_SELECT_BY_CAMPAIGN,
  ProductQueryError,
} from '@/entities/product'

/**
 * O `select` e o recorte são os da vitrine `/ofertas` (`useOfferProducts`): as peças que o bloco
 * mostra são as mesmas que a vitrine lista, só que as primeiras `CAMPAIGN_OFFERS_PIECES`. Escrever o
 * recorte de novo aqui seria um segundo dono de "quais peças estão em oferta".
 */
export const CAMPAIGN_OFFERS_SELECT = PRODUCT_CARD_SELECT_BY_CAMPAIGN

/**
 * Algumas peças da campanha em vigência, para a fileira do bloco "Joias em oferta" da Home.
 *
 * Quem decide "está valendo" é a RLS: `product_campaigns` só entrega à loja a marcação de peça ativa
 * numa campanha ligada e dentro do período. O recorte por `campaign_id` amarra a fileira à MESMA
 * campanha que o bloco mostra no título.
 *
 * Falha SOBE, nunca vira lista vazia: o bloco esconde só a fileira e mantém os cartões.
 *
 * Só ficam as peças cujo preço ESTA campanha baixa (`Product.campaign`) — a régua da vitrine: a
 * marcada cujo preço não muda não tem selo nem desconto para mostrar.
 */
export const useCampaignOfferProducts = (campaignId: string | null | undefined) =>
  useQuery({
    queryKey: ['products', 'campaign-offers', campaignId ?? null, CAMPAIGN_OFFERS_PIECES],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await listingWindow(
        supabase
          .from('products')
          .select(CAMPAIGN_OFFERS_SELECT)
          .eq(CAMPAIGN_FILTER_COLUMN, campaignId as string),
        CAMPAIGN_OFFERS_PIECES,
      )
      if (error) {
        throw new ProductQueryError(`carregar peças em oferta: ${error.message ?? 'erro desconhecido'}`)
      }
      return (data ?? []).map(mapDbToProduct).filter(p => p.campaign?.id === campaignId)
    },
    enabled: !!campaignId,
  })
