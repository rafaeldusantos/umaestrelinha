// `PED-04`..`PED-10`, `PED-14`, `PED-18`, `PED-20` — a consulta da listagem de pedidos, expressa
// como dado.
//
// Molde de `productQuery.ts`: o filtro sai do `useMemo` sobre a página já carregada e vira uma
// DESCRIÇÃO que o hook traduz para o PostgREST. Separado do hook porque é a parte que pode errar
// **em silêncio** — uma visão filtrando a coluna errada não quebra nada, só mostra a lista errada —
// e porque é testável sem montar tela.
//
// As formas de filtro daqui foram conferidas contra o PostgREST local antes de escritas: `or=` com
// `and(...)` aninhado, `count` exato com `Range`, e `head=true` para contar sem carregar linha.

import {
  MATERIAL_NAO_SEGURA_LISTA,
  MATERIAL_QUEUE_STATES,
  ORDER_PAGE_SIZE,
  ORDER_PAYMENT_STATUS_LABELS,
  QUEUE_BLOCKS,
  type OrderViewId,
  type QueueBlockId,
} from '@estrelinha/core/orders'
import type { PaymentStatus } from '@estrelinha/supabase/types'

export { pageRange, rangeLabel, escapeSearchTerm } from '@estrelinha/core/paging'

/**
 * As seis visões, o predicado de cada uma, os estados que são fila de material e a busca (colunas,
 * condição e debounce) moram em `@estrelinha/core/orders` desde a feature `74` (`views.ts`,
 * `search.ts`): o app do ateliê abre a lista no mesmo recorte e busca nas mesmas colunas. Este
 * arquivo os REEXPORTA por referência (`regrasDoPedidoNoCore.test.ts`, `toBe`), para os chamadores
 * de antes não mudarem.
 */
export {
  MATERIAL_QUEUE_STATES,
  ORDER_VIEWS,
  ORDER_SEARCH_COLUMNS,
  SEARCH_DEBOUNCE_MS,
  buildOrderSearchCondition,
  viewPredicate,
  type OrderViewId,
  type ViewPredicate,
} from '@estrelinha/core/orders'

/**
 * A idade da linha na fila (`queueSince`, `rowQueueAge`) e a ordinal da compra
 * (`purchaseOrdinalLabel`) moram em `@estrelinha/core/orders` (`row.ts`) desde a feature `74` — a
 * linha do app do ateliê diz o mesmo. Reexportadas por referência.
 */
export { purchaseOrdinalLabel, queueSince, rowQueueAge } from '@estrelinha/core/orders'

// -------------------------------------------------------------------------------------------
// Vocabulários
// -------------------------------------------------------------------------------------------

/**
 * Os rótulos de `payment_status`, com **um dono só**.
 *
 * Estavam em três lugares no meio da feature 34 — o selo, o CSV e os chips —, cada um com a sua
 * cópia. Nenhuma das três quebraria nada ao divergir: o selo diria "Estornado", o CSV "Devolvido" e
 * o chip "estorno", e as três telas seguiriam verdes. É o defeito 01 em miniatura, pego antes de
 * custar. Quem precisa do mapa importa daqui.
 *
 * O vocabulário é fechado no banco (`orders_payment_status_check`), então `Record<PaymentStatus,…>`
 * é uma afirmação verificável: um estado novo no CHECK sem rótulo aqui não compila.
 *
 * Desde o conserto do QA da feature `73` o dono é `ORDER_PAYMENT_STATUS_LABELS`, em
 * `@estrelinha/core/orders` — o selo do app do ateliê diz "Estornado" com a mesma palavra. Este é
 * uma REFERÊNCIA ao de lá (`rotulosDoPainel.test.ts`, `toBe`).
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = ORDER_PAYMENT_STATUS_LABELS

/**
 * Os meios de pagamento, para chip e CSV. `payment_method` é texto livre no banco.
 *
 * Desde a feature `74` o dono é `@estrelinha/core/orders` (o detalhe do app do ateliê diz a mesma
 * palavra); reexportado por referência (`regrasDoPedidoNoCore.test.ts`, `toBe`).
 */
export { PAYMENT_METHOD_LABELS } from '@estrelinha/core/orders'

/**
 * Os estados de material que **não seguram** a separação: o pedido pode andar.
 *
 * Desde a feature `73` o dono é `@estrelinha/core/orders` (`queue.ts`, `AD-057`): o app do ateliê e
 * a RPC `store_overview` contam a mesma fila, e a lista não pode ter uma escrita por consumidor.
 * Reexportada daqui para os chamadores de antes não mudarem.
 */
export { MATERIAL_NAO_SEGURA_LISTA }

export type OrderSortKey = 'created' | 'total' | 'queue' | 'customer'

/**
 * A coluna do `order` do PostgREST para cada chave da tela.
 *
 * `queue` mapeia para `created_at` e **isso é uma aproximação declarada**: a idade que a tela pinta
 * sai de `queueSince` (que usa `material_received_at` depois que o envelope chega), e o banco não
 * tem uma coluna "entrou neste estado em". Para a fila — que é dominada por quem ainda espera — as
 * duas coincidem. Ordenar por `queue` numa lista de já-recebidos ordena por data do pedido, e é
 * isso que a coluna do cabeçalho diz.
 */
export const ORDER_SORT_COLUMN: Record<OrderSortKey, string> = {
  created: 'created_at',
  total: 'total',
  queue: 'created_at',
  customer: 'customer_name',
}

// -------------------------------------------------------------------------------------------
// A forma do filtro
// -------------------------------------------------------------------------------------------

export interface OrderFilters {
  view: OrderViewId
  statuses: string[]
  materialStatuses: string[]
  /** `payment_status` — aprovado, pendente, estornado… O que a tela chama de "situação do pagamento". */
  paymentStatuses: string[]
  /** `payment_method` — pix, cartão, boleto. Eixo DIFERENTE do de cima, e a tela nomeia os dois. */
  paymentMethods: string[]
  dateFrom: string | null
  dateTo: string | null
  /** `PED-12` — só o que ainda não tem rastreio de saída. É o tile "enviado sem rastreio". */
  semRastreio: boolean
}

export interface OrderQuery {
  page: number
  pageSize: number
  search: string
  filters: OrderFilters
  sort: { key: OrderSortKey; dir: 'asc' | 'desc' }
}

export const emptyOrderFilters = (): OrderFilters => ({
  view: 'precisa-acao',
  statuses: [],
  materialStatuses: [],
  paymentStatuses: [],
  paymentMethods: [],
  dateFrom: null,
  dateTo: null,
  semRastreio: false,
})

export const defaultOrderQuery = (): OrderQuery => ({
  page: 1,
  // O mesmo número da lista do app do ateliê (feature `74`): o dono é `core/orders/list.ts`.
  pageSize: ORDER_PAGE_SIZE,
  search: '',
  filters: emptyOrderFilters(),
  sort: { key: 'created', dir: 'desc' },
})

/**
 * `PED-04` — quantos filtros estão ativos.
 *
 * **A busca e a visão contam**, e é essa a correção. O "Limpar filtros" de antes ignorava
 * `statusFilter` e `materialFilter` tanto na limpeza quanto na condição que o exibia: com só a fila
 * de material ligada, o botão **não aparecia** e a Adri ficava com a lista filtrada sem caminho de
 * volta visível.
 *
 * A visão entra porque ela também esconde linhas — e `Precisa de ação`, que é a padrão, esconde
 * 136 dos 148 pedidos. Um "limpar" que a deixasse de pé mentiria sobre o que limpou.
 */
export const activeOrderFilterCount = (filters: OrderFilters, search = ''): number =>
  (filters.view !== 'precisa-acao' && filters.view !== 'tudo' ? 1 : 0) +
  (filters.statuses.length > 0 ? 1 : 0) +
  (filters.materialStatuses.length > 0 ? 1 : 0) +
  (filters.paymentStatuses.length > 0 ? 1 : 0) +
  (filters.paymentMethods.length > 0 ? 1 : 0) +
  (filters.dateFrom !== null || filters.dateTo !== null ? 1 : 0) +
  (filters.semRastreio ? 1 : 0) +
  (search.trim() !== '' ? 1 : 0)

/** O rótulo do botão, que diz **quantos** serão limpos — `PED-04`. */
export const clearFiltersLabel = (quantos: number): string =>
  quantos === 1 ? 'Limpar 1 filtro' : `Limpar os ${quantos}`

// -------------------------------------------------------------------------------------------
// Busca — PED-10
// -------------------------------------------------------------------------------------------

// As colunas, a condição e o debounce moram em `@estrelinha/core/orders` desde a feature `74`
// (`search.ts`) — o app do ateliê busca igual. Reexportados no topo deste arquivo.

// -------------------------------------------------------------------------------------------
// Os quatro contadores do topo — PED-12
// -------------------------------------------------------------------------------------------

/** Os ids dos blocos — o vocabulário é o de `QUEUE_BLOCKS`, em `core` (feature `73`). */
export type QueueTileId = QueueBlockId

export interface QueueTile {
  id: QueueTileId
  label: string
  /** A frase que diz **o que é aquilo**, e não o que a coluna se chama. */
  hint: string
  /** Só o primeiro carrega o acento — um acento por tela. */
  accent: boolean
  /** O filtro que o clique aplica. */
  apply: (filters: OrderFilters) => OrderFilters
}

/**
 * O filtro que o clique em cada bloco aplica na tela do painel. É estado DESTA tela, e por isso fica
 * aqui; o rótulo, a frase, o acento e a regra da contagem vêm de `QUEUE_BLOCKS` (feature `73`).
 */
const QUEUE_TILE_APPLY: Record<QueueBlockId, QueueTile['apply']> = {
  aguardando: f => ({ ...f, view: 'tudo', materialStatuses: ['aguardando_material'], semRastreio: false }),
  // Aplica EXATAMENTE o que conta: pago **e** com o material resolvido. Usar a visão `a-separar`
  // (que inclui `separating`) faria o clique trazer mais linhas que o número.
  'a-separar': f => ({
    ...f,
    view: 'tudo',
    statuses: ['paid'],
    materialStatuses: [...MATERIAL_NAO_SEGURA_LISTA],
    semRastreio: false,
  }),
  'sem-rastreio': f => ({ ...f, view: 'em-transito', materialStatuses: [], semRastreio: true }),
  'pix-aguardando': f => ({
    ...f,
    view: 'tudo',
    paymentMethods: ['pix'],
    paymentStatuses: ['pending'],
    materialStatuses: [],
    semRastreio: false,
  }),
}

export const QUEUE_TILES: QueueTile[] = QUEUE_BLOCKS.map(b => ({
  id: b.id,
  label: b.label,
  hint: b.hint,
  accent: b.accent,
  apply: QUEUE_TILE_APPLY[b.id],
}))

// -------------------------------------------------------------------------------------------
// A linha da listagem
// -------------------------------------------------------------------------------------------

export interface AdminOrderRow {
  id: string
  order_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  status: string
  payment_status: PaymentStatus
  payment_method: string
  total: number
  /** O rastreio **DE SAÍDA** (ateliê → cliente). Só aparece no bloco de entrega. */
  tracking_code: string | null
  /** O rastreio **DE ENTRADA** (cliente → ateliê). Só aparece no bloco de material. */
  material_tracking_code: string | null
  material_status: string
  material_received_at: string | null
  created_at: string
  notes: string | null
  /**
   * `PED-21` — a **quantidade** desta compra para esta pessoa: 1 = primeira, 3 = terceira.
   *
   * Vem da view `order_list`, calculada por window function particionada por cadastro **ou** por
   * e-mail normalizado — a mesma regra de vínculo do resto da feature. Calcular no cliente custaria
   * uma leitura por linha da página.
   */
  purchase_ordinal: number
  /**
   * `ESP-24` — o WhatsApp da cliente, **no próprio pedido**.
   *
   * Vive em `orders` e não em `customers` porque a maioria das compras é de **convidada**, que não
   * tem cadastro: por `AD-023` a pessoa é derivada dos pedidos, e derivar o telefone exigiria a
   * coluna existir aqui de qualquer forma. É snapshot — não acompanha edição do cadastro depois.
   *
   * Sem ele, `chargeMaterialUrl` cai no `wa.me` **sem número** e a cobrança de material abre o app
   * sem destinatário. Era o comportamento até a feature 35, para todo pedido de convidada.
   */
  customer_phone: string | null
}

/**
 * A relação que a listagem lê.
 *
 * É a view `order_list` (feature 34), e não a tabela: ela acrescenta `purchase_ordinal` e nada mais.
 * **Toda escrita continua indo para `orders`**, por RPC guardada ou `update` — a view é só leitura.
 */
export const ORDER_LIST_FROM = 'order_list'

/** As colunas da listagem, nomeadas — `select('*')` traria endereço e Melhor Envio em toda linha. */
export const ORDER_LIST_SELECT = [
  'id',
  'order_number',
  'customer_id',
  'customer_name',
  'customer_email',
  'status',
  'payment_status',
  'payment_method',
  'total',
  'tracking_code',
  'material_tracking_code',
  'material_status',
  'material_received_at',
  'created_at',
  'notes',
  'purchase_ordinal',
  // `ESP-24`. Vem da view `order_list`, que ganhou a coluna na migration da 35 — a view enumera
  // coluna a coluna, então acrescentar em `orders` não bastava.
  'customer_phone',
].join(', ')

/**
 * Na visão `Fila de material`, os quatro contadores do topo trocam para os quatro **estados** —
 * porque ali a pergunta deixou de ser "o que cobra?" e passou a ser "onde está cada envelope?".
 *
 * A ordem é a da máquina de estado, e não a de volume: a trilha lida da esquerda para a direita é o
 * que faz `Em produção` parecer o fim e `Aguardando` o começo.
 */
export const MATERIAL_TILES: QueueTile[] = [
  {
    id: 'aguardando',
    label: 'Aguardando material',
    hint: 'Ninguém pode fazer nada até o envelope chegar',
    accent: true,
    apply: f => ({ ...f, materialStatuses: ['aguardando_material'] }),
  },
  {
    id: 'a-separar',
    label: 'Material a caminho',
    hint: 'Rastreio informado pela cliente',
    accent: false,
    apply: f => ({ ...f, materialStatuses: ['material_enviado'] }),
  },
  {
    id: 'sem-rastreio',
    label: 'Material recebido',
    hint: 'Já está na bancada, esperando você',
    accent: false,
    apply: f => ({ ...f, materialStatuses: ['material_recebido'] }),
  },
  {
    id: 'pix-aguardando',
    label: 'Em produção',
    hint: 'Trabalho em andamento na bancada',
    accent: false,
    apply: f => ({ ...f, materialStatuses: ['em_producao'] }),
  },
]

/** O `material_status` que cada tile da fila representa, na mesma ordem de `MATERIAL_TILES`. */
export const MATERIAL_TILE_STATES: string[] = [...MATERIAL_QUEUE_STATES]
