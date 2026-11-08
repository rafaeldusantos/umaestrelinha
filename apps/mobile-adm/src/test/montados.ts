/**
 * As fixturas dos pedidos montados: o que a function `order-proposals` devolve na `list` e no
 * `get`, na forma do contrato (`handlers.ts`). Dado sintético — e-mail em `@exemplo.invalid`.
 */
export const AGORA = '2026-11-07T12:00:00.000Z'
export const ID_ABERTO = 'cccccccc-0000-4000-8000-000000000001'
export const ID_PEDIDO = 'ffffffff-0000-4000-8000-000000000262'

export const montadoNaLista = (over: Record<string, unknown> = {}) => ({
  id: ID_ABERTO,
  number: 'P-0042',
  status: 'open',
  version: 1,
  expires_at: '2026-11-12T15:00:00Z',
  viewed_at: null,
  order_id: null,
  order_number: null,
  customer_name: 'Marina Duarte',
  customer_email: 'marina@exemplo.invalid',
  items_total: 412.5,
  created_at: '2026-11-05T12:00:00Z',
  state: 'open',
  lines: [
    { product_name: 'Pingente Estrela', product_image: 'https://img/p1.webp', variant_label: 'Prata', quantity: 1 },
    { product_name: 'Corrente', product_image: null, variant_label: null, quantity: 1 },
  ],
  lines_count: 2,
  ...over,
})

export const evento = (kind: string, created_at: string, channel: string | null = null) => ({
  kind,
  channel,
  actor: 'u-adri',
  actor_email: 'adri@exemplo.invalid',
  created_at,
})

export const leituraDoMontado = (over: { proposal?: Record<string, unknown>; state?: string; actions?: Record<string, unknown>; token?: string | null } = {}) => {
  const state = over.state ?? 'open'
  const aberta = state === 'open' || state === 'viewed'
  return {
    proposal: {
      id: ID_ABERTO,
      number: 'P-0042',
      status: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'open',
      version: 1,
      expires_at: '2026-11-12T15:00:00Z',
      viewed_at: null,
      order_id: null,
      order_number: null,
      customer_name: 'Marina Duarte',
      customer_email: 'marina@exemplo.invalid',
      customer_phone: '(51) 99999-0000',
      customer_document: '12345678909',
      address_zip: '91240010',
      address_street: 'Rua das Flores',
      address_number: '10',
      address_complement: 'Apto 2',
      address_neighborhood: 'Centro',
      address_city: 'Porto Alegre',
      address_state: 'RS',
      subtotal: 412.5,
      promotion_discount: 0,
      coupon_code: null,
      coupon_discount: 0,
      manual_discount: 0,
      items_total: 412.5,
      admin_note: null,
      created_at: '2026-11-05T12:00:00Z',
      items: [
        { position: 0, product_name: 'Pingente Estrela', product_image: 'https://img/p1.webp', variant_label: 'Prata', quantity: 2, unit_price: 150, engraving_text: null },
        { position: 1, product_name: 'Corrente', product_image: null, variant_label: null, quantity: 1, unit_price: 112.5, engraving_text: null },
      ],
      events: [evento('created', '2026-11-05T12:00:00Z')],
      ...(over.proposal ?? {}),
    },
    state,
    actions: {
      edit: aberta,
      renew: state === 'expired',
      renewLabel: state === 'expired' ? 'Renovar prazo' : null,
      cancel: aberta,
      duplicate: true,
      viewOrder: state === 'completed',
      ...(over.actions ?? {}),
    },
    token: over.token === undefined ? (aberta ? 'tok-aberto' : null) : over.token,
  }
}
