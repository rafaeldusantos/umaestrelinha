import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { mapDbToProduct, PRODUCT_CARD_SELECT } from '../lib/mapProduct'
import { listingWindow, ProductQueryError } from './useProducts'
import type { Product } from '@estrelinha/supabase/types'

/**
 * As peças da vitrine `/ofertas` — as marcadas na campanha de desconto EM VIGÊNCIA.
 *
 * A vitrine é DERIVADA das marcações, nunca uma linha em `categories` com vínculos gravados: o filtro
 * roda no servidor por um embed **aliased** da view `live_product_campaigns` com `!inner`, pela mesma razão do
 * alias da categoria (`PRODUCT_CARD_SELECT_BY_CATEGORY`): o embed completo da marcação, que o
 * mapeador lê para o preço e o selo, volta inteiro, e só `oferta` é recortado.
 *
 * O banco faz o resto: a view só entrega as marcações da campanha ligada dentro da vigência (relógio
 * do banco), também para a sessão de admin — a tabela crua de marcações, com essa sessão, entrega as
 * de toda campanha —, e `products` só entrega a peça ativa ao visitante. A loja não decide a vigência.
 */
export const PRODUCT_CARD_SELECT_BY_CAMPAIGN = `${PRODUCT_CARD_SELECT}, oferta:live_product_campaigns!inner(campaign_id)`

/** A coluna do embed aliased, para o `.eq()` da campanha. */
export const CAMPAIGN_FILTER_COLUMN = 'oferta.campaign_id'

/**
 * As peças da campanha `campaignId`, com o preço efetivo e a marca `campaign` do mapeador.
 *
 * Só fica a peça cuja `campaign` é ESTA campanha — o mapeador só marca a peça quando a campanha baixa
 * o preço dela. A peça marcada cujo "de/por" de hoje já é melhor que o desconto não ganha selo, e a
 * vitrine não a anuncia como oferta da campanha.
 *
 * `campaignId` ausente ⇒ consulta desligada: sem campanha em vigência não há o que pedir.
 */
export const useOfferProducts = (campaignId: string | null | undefined) =>
  useQuery({
    queryKey: ['products', 'campaign', campaignId ?? null],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await listingWindow(
        supabase.from('products').select(PRODUCT_CARD_SELECT_BY_CAMPAIGN).eq(CAMPAIGN_FILTER_COLUMN, campaignId!),
      )
      if (error) throw new ProductQueryError(`carregar as peças da campanha: ${error.message ?? 'erro desconhecido'}`)
      return (data ?? []).map(mapDbToProduct).filter(p => p.campaign?.id === campaignId)
    },
    enabled: !!campaignId,
  })
