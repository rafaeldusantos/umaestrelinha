// Feature 71 · `VIS-10 (d)` — o canal de pedidos do Dashboard tem UM dono.
//
// Desde a feature `73` o hook mora em `@estrelinha/core/hooks/useOrdersRealtime.ts`, com o nome do
// canal por parâmetro: o app do ateliê abre o dele. Reexportado daqui com identidade provada por
// `toBe` (`reexportaDeCore.test.ts`); o nome do canal do PAINEL continua sendo deste arquivo.
//
// O segundo canal de `orders` (`useAdminOrders`, da lista de pedidos) é de outra tela e fica onde
// está — migrá-lo mudaria aquela tela sem pedido (design da `71`, seção 14).
export { useOrdersRealtime } from '@estrelinha/core/hooks/useOrdersRealtime'

/** O nome do canal do Dashboard. Um só, para o Dashboard não abrir dois. */
export const ORDERS_REALTIME_CHANNEL = 'admin-orders-realtime'
