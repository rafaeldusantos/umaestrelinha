// A campanha de desconto numa linha da sacola.
//
// Nenhuma conta de preço mora aqui: o preço com a campanha é de `campaignUnitPrice`
// (`@estrelinha/core/campaigns`), o MESMO dono do mapeador da loja e das functions. Este arquivo só
// lê, do produto da linha, o preço de TABELA e o "de" daquela linha (`campaign.list_prices`) — a
// entrada que `resolveOrderPricing` precisa: preço cheio + a campanha. Reaplicar a campanha sobre o
// `unitPrice` (que já é o preço efetivo) daria desconto em dobro.
//
// `item.product.campaign` é o da hora em que a peça entrou na sacola, até a releitura do catálogo
// (`useCartCatalog`) trocá-lo pelo de agora — é ela que tira a campanha que acabou e põe a que
// começou.
import { campaignUnitPrice } from '@estrelinha/core/campaigns'
import type { PricingCampaign } from '@estrelinha/core/payment/pricing'
import type { ProductCampaign } from '@estrelinha/supabase/types'
import type { CartItem } from '../model/cartStore'

export interface CartLineCampaign {
  campaign: ProductCampaign
  /** O preço de tabela da linha (o da variação, quando ela tem preço próprio). */
  listPrice: number
  /** A entrada `campaign` de `resolveOrderPricing`. */
  pricing: PricingCampaign
}

/** A campanha da linha, com o preço de tabela dela — ou `null` sem campanha. */
export function cartLineCampaign(item: CartItem): CartLineCampaign | null {
  const campaign = item.product?.campaign
  if (!campaign || !campaign.list_prices) return null
  const daVariacao = item.variantId ? campaign.list_prices.variants?.[item.variantId] : undefined
  const tabela = daVariacao ?? { price: campaign.list_prices.price, compare_price: campaign.list_prices.compare_price }
  return {
    campaign,
    listPrice: tabela.price,
    pricing: { percent: campaign.percent, compare_price: tabela.compare_price },
  }
}

/** O nome da campanha em vigência com alguma peça da sacola (a que baixa o preço), ou `null`. */
export function cartCampaignName(items: readonly CartItem[]): string | null {
  for (const item of items) {
    const linha = cartLineCampaignPrice(item)
    if (linha) return linha.campaign.name || null
  }
  return null
}

/** O "de/por" da campanha na linha (por unidade), só quando a campanha baixa o preço dela. */
export function cartLineCampaignPrice(item: CartItem): { full: number; charged: number; campaign: ProductCampaign } | null {
  const linha = cartLineCampaign(item)
  if (!linha) return null
  const preco = campaignUnitPrice(linha.listPrice, linha.pricing.compare_price, linha.pricing.percent)
  if (!preco.discounted) return null
  return { full: preco.full, charged: preco.charged, campaign: linha.campaign }
}
