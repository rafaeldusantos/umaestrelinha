// `CLI-01`..`CLI-07`, `CLI-14` — a consulta da listagem de Clientes, expressa como dado.
//
// ---------------------------------------------------------------------------------------------
// O QUE ESTA TELA NÃO RESPONDIA
// ---------------------------------------------------------------------------------------------
// `AdminClientsPage` tinha 54 linhas e quatro colunas: nome, e-mail, contagem de pedidos e data de
// cadastro. **Nenhuma das três perguntas que fazem alguém abrir a tela** — quanto essa pessoa já
// gastou, quando comprou pela última vez, e se ela já confiou um material — tinha resposta.
//
// E `useAdminCustomers` lia `select('*, orders(count)')` **sem `range`**, herdando o teto de 1.000
// linhas do PostgREST em silêncio; o rodapé exibia `customers.length`, que é o número truncado.
//
// ---------------------------------------------------------------------------------------------
// A TELA LÊ `customer_list`, E NÃO `customers`
// ---------------------------------------------------------------------------------------------
// `public.customers` **não é a lista de clientes da loja**: aquela tabela só recebe linha do trigger
// de signup, então quem comprou como convidada nunca aparece nela. `customer_list` (feature 34) une
// cadastro e convidada e já traz o agregado junto — o que permite ordenar por "Gastou" no servidor.

export { pageRange, rangeLabel, escapeSearchTerm } from '@estrelinha/core/paging'
import { escapeSearchTerm } from '@estrelinha/core/paging'

export type CustomerViewId =
  | 'todas'
  | 'voltaram'
  | 'confiaram-material'
  | 'uma-vez'
  | 'sem-compra'
  | 'duplicadas'

/** `CLI-07` — as visões respondem perguntas de relacionamento, não recortes de coluna. */
export const CUSTOMER_VIEWS: { id: CustomerViewId; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'voltaram', label: 'Voltaram' },
  { id: 'confiaram-material', label: 'Confiaram material' },
  { id: 'uma-vez', label: 'Compraram uma vez só' },
  { id: 'sem-compra', label: 'Cadastro sem compra' },
  { id: 'duplicadas', label: 'Possíveis duplicadas' },
]

export type CustomerSortKey = 'spent' | 'ticket' | 'last' | 'orders' | 'name' | 'created'

export const CUSTOMER_SORT_COLUMN: Record<CustomerSortKey, string> = {
  spent: 'total_spent',
  ticket: 'avg_ticket',
  last: 'last_activity_at',
  orders: 'orders_paid',
  name: 'name',
  created: 'created_at',
}

export type AccountFilter = 'all' | 'conta' | 'convidada'
export type LastPurchaseFilter = 'all' | '30d' | '90d' | '180d+' | 'nunca'

export interface CustomerFilters {
  view: CustomerViewId
  account: AccountFilter
  lastPurchase: LastPurchaseFilter
  /** Vazio = qualquer. Casa contra `material_kinds` da view. */
  materialKinds: string[]
}

export interface CustomerQuery {
  page: number
  pageSize: number
  search: string
  filters: CustomerFilters
  sort: { key: CustomerSortKey; dir: 'asc' | 'desc' }
}

export const emptyCustomerFilters = (): CustomerFilters => ({
  view: 'todas',
  account: 'all',
  lastPurchase: 'all',
  materialKinds: [],
})

export const defaultCustomerQuery = (): CustomerQuery => ({
  page: 1,
  pageSize: 25,
  search: '',
  filters: emptyCustomerFilters(),
  // Por gasto, decrescente: quem já confiou mais é quem se quer reconhecer ao abrir a tela.
  sort: { key: 'spent', dir: 'desc' },
})

export const activeCustomerFilterCount = (filters: CustomerFilters, search = ''): number =>
  (filters.view !== 'todas' ? 1 : 0) +
  (filters.account !== 'all' ? 1 : 0) +
  (filters.lastPurchase !== 'all' ? 1 : 0) +
  (filters.materialKinds.length > 0 ? 1 : 0) +
  (search.trim() !== '' ? 1 : 0)

/** `CLI-01` — a busca alcança as quatro coisas que se tem em mãos ao procurar alguém. */
export const CUSTOMER_SEARCH_COLUMNS = ['name', 'email', 'phone', 'cpf'] as const

export const buildCustomerSearchCondition = (search: string): string | null => {
  const term = escapeSearchTerm(search)
  if (term === '') return null
  return CUSTOMER_SEARCH_COLUMNS.map(c => `${c}.ilike.%${term}%`).join(',')
}

export const CUSTOMER_SEARCH_DEBOUNCE_MS = 300

/**
 * Uma linha da view `customer_list`.
 *
 * ⚠️ **Não estende `DbCustomerStats`**, e a primeira versão estendia. Aquele tipo declara
 * `customer_id`, que é a chave de `customer_stats` — e `customer_list` **não tem essa coluna**: ela
 * expõe `id`, porque já é a pessoa, não o agregado dela. Conferido contra o `information_schema` do
 * banco local, e não contra a memória: tipo escrito à mão é afirmação, não verificação (`AD-012`).
 *
 * A lista abaixo é, campo a campo, o `select` da view.
 */
export interface CustomerListRow {
  id: string
  user_id: string | null
  name: string | null
  email: string
  cpf: string | null
  phone: string | null
  created_at: string | null
  has_account: boolean
  orders_paid: number
  orders_total: number
  total_spent: number
  /** `null`, e não `0`, para quem nunca teve pedido pago. */
  avg_ticket: number | null
  first_order_at: string | null
  last_order_at: string | null
  /** O último pedido de **qualquer** estado — é o "em aberto" da coluna Última compra. */
  last_activity_at: string | null
  orders_with_material: number
  material_kinds: string[]
  /** `CLI-14` — quantos cadastros compartilham este e-mail. `> 1` é duplicata **mostrada**. */
  same_email_count: number
}

export const CUSTOMER_LIST_SELECT = '*'

/**
 * O `label` da última compra.
 *
 * `CLI-05` — a contagem de pedidos deixa de misturar abandono com compra: `orders_paid` conta o que
 * virou dinheiro, e o pedido que ainda não virou aparece **aqui**, como "em aberto". Antes os dois
 * somavam na mesma coluna, e a tela dizia que alguém tinha 4 pedidos quando 3 eram Pix expirado.
 */
export const lastPurchaseLabel = (row: CustomerListRow): { text: string; open: boolean } => {
  if (!row.last_activity_at) return { text: 'Nunca comprou', open: false }

  const emAberto =
    row.last_order_at === null || new Date(row.last_activity_at) > new Date(row.last_order_at)

  return {
    text: new Date(row.last_activity_at).toLocaleDateString('pt-BR'),
    open: emAberto,
  }
}
