export { default as CheckoutSettingsCard, DISCOUNT_RANGE_MESSAGE } from './ui/CheckoutSettingsCard'
// Feature 55 — as tres secoes de formulario de `/admin/configuracoes`. Cada uma e AUTOCONTIDA, no
// molde que `CheckoutSettingsCard` ja usava: proprio estado, proprio salvamento, proprio estado de
// carga. Elas moram aqui, e nao no widget, porque `SalesSection` monta o `CheckoutSettingsCard` —
// mesmo slice. A quarta secao (Notificacoes) mora no widget, porque montaria outra feature.
export { default as StoreDataSection } from './ui/StoreDataSection'
export { default as SalesSection } from './ui/SalesSection'
export { default as ShippingMaterialSection } from './ui/ShippingMaterialSection'
