export { default as MelhorEnvioTab } from './ui/MelhorEnvioTab'
export { default as OrderCancelDialog } from './ui/OrderCancelDialog'
export { default as OrderMaterialCard } from './ui/OrderMaterialCard'
// `OrderDetailDialog` foi APAGADO na feature 34: o pedido é rota (`/admin/pedidos/:id`), pela mesma
// regra que já valia para cupom, promoção e produto — "editor é TELA, não modal".
