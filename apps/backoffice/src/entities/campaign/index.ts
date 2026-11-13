// As campanhas de desconto no painel. As telas importam DAQUI, nunca de caminho profundo.
//
// A escrita de `product_campaigns` mora só aqui (`setProductsCampaign`): o cadastro da peça e a
// edição em massa da lista de produtos chamam esta porta.
export * from './model/campaign'
export * from './api/campaignRead'
export * from './api/campaignWrite'
export { default as CampaignBadgeInline } from './ui/CampaignBadgeInline'
export { default as CampaignCardPreview } from './ui/CampaignCardPreview'
export { drawnColors, drawnBadgeText, PREVIEW_PIECE, PREVIEW_FALLBACK_PERCENT } from './ui/badgeColors'
export { default as CampaignStatusPill } from './ui/CampaignStatusPill'
