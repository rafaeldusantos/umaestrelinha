// Feature `76` · `MAC-07`, `MAC-08`, `MAC-09`, `MAC-23` — os recortes da lista de clientes do app do
// ateliê, como DADO. O app e o painel perguntam "quem compraram mais de uma vez?" e a resposta é uma
// regra só (`RETURNING_CUSTOMER_RULE`): o painel a chama de "Voltaram", o app de "Compraram mais de
// uma vez" — o rótulo não é regra, o predicado é.
//
// O builder é ESTRUTURAL (`gte` só), como o `SliceBuilder` da `74`: este diretório não importa o
// supabase-js, e é alcançável por Node, Deno e navegador.

export type CustomerSliceId = 'todas' | 'recorrentes' | 'em-aberto'

/** Os recortes, na ordem do protótipo. */
export const CUSTOMER_SLICES: readonly { id: CustomerSliceId; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'recorrentes', label: 'Compraram mais de uma vez' },
  { id: 'em-aberto', label: 'Com pedido em aberto' },
]

export const DEFAULT_CUSTOMER_SLICE: CustomerSliceId = 'todas'

/** `col >= min`, sobre uma coluna de `customer_list`. */
export interface CustomerRule {
  col: 'orders_paid' | 'orders_open'
  min: number
}

/** "Voltaram" do painel: duas ou mais compras pagas. */
export const RETURNING_CUSTOMER_RULE: CustomerRule = { col: 'orders_paid', min: 2 }

/** "Com pedido em aberto": ao menos um (ver `open.ts` para o que é "em aberto"). */
export const OPEN_CUSTOMER_RULE: CustomerRule = { col: 'orders_open', min: 1 }

export const isCustomerSliceId = (value: unknown): value is CustomerSliceId =>
  typeof value === 'string' && CUSTOMER_SLICES.some((s) => s.id === value)

/** A regra do recorte, ou `null` para `todas`. Lança para id fora do vocabulário (fechado). */
export const customerSliceRule = (id: CustomerSliceId): CustomerRule | null => {
  if (id === 'todas') return null
  if (id === 'recorrentes') return RETURNING_CUSTOMER_RULE
  if (id === 'em-aberto') return OPEN_CUSTOMER_RULE
  throw new Error(`recorte de clientes desconhecido: ${String(id)}`)
}

/** Aplica o recorte à consulta. `todas` não chama nada; id desconhecido lança. */
export const applyCustomerSlice = <B extends { gte(col: string, value: number): B }>(
  builder: B,
  id: CustomerSliceId,
): B => {
  const rule = customerSliceRule(id)
  return rule === null ? builder : builder.gte(rule.col, rule.min)
}
