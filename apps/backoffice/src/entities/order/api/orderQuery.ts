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

import { queueAge, type QueueAge } from '@estrelinha/core/material'
import type { PaymentStatus } from '@estrelinha/supabase/types'

export { pageRange, rangeLabel, escapeSearchTerm } from '@estrelinha/core/paging'
import { escapeSearchTerm } from '@estrelinha/core/paging'

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
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  refunded: 'Estornado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

/** Os meios de pagamento, para chip e CSV. `payment_method` é texto livre no banco. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
  manual: 'Manual',
}

/** Os estados de material que **são fila** — `nao_aplicavel` não é, e é a maioria silenciosa. */
export const MATERIAL_QUEUE_STATES = [
  'aguardando_material',
  'material_enviado',
  'material_recebido',
  'em_producao',
] as const

/**
 * Os estados de material que **não seguram** a separação: o pedido pode andar.
 *
 * Exportado porque o contador do tile e o predicado da visão precisam ser a MESMA lista. Quando
 * eram duas, o tile "Pago, a separar" dizia 3 e o clique trazia 4 — dois pedidos que ainda
 * esperavam o envelope contavam como prontos para separar.
 */
export const MATERIAL_NAO_SEGURA_LISTA = ['nao_aplicavel', 'material_recebido', 'em_producao']
const MATERIAL_NAO_SEGURA = MATERIAL_NAO_SEGURA_LISTA

export type OrderViewId =
  | 'precisa-acao'
  | 'tudo'
  | 'fila-material'
  | 'a-separar'
  | 'em-transito'
  | 'concluidos'

/**
 * As visões cobrem **perguntas**, não colunas — `PED-14`.
 *
 * `Precisa de ação` é a padrão porque a tela abre para responder "o que eu devo a alguém hoje?".
 * Abrir em `Tudo` põe 148 linhas na frente de quem tem 12 para resolver.
 */
export const ORDER_VIEWS: { id: OrderViewId; label: string }[] = [
  { id: 'precisa-acao', label: 'Precisa de ação' },
  { id: 'tudo', label: 'Tudo' },
  { id: 'fila-material', label: 'Fila de material' },
  { id: 'a-separar', label: 'A separar' },
  { id: 'em-transito', label: 'Em trânsito' },
  { id: 'concluidos', label: 'Concluídos' },
]

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
  pageSize: 25,
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

/**
 * As cinco colunas que a busca alcança.
 *
 * Antes eram duas (`order_number`, `customer_name`). Faltavam justamente as que se tem em mãos
 * quando se está procurando: o e-mail que a cliente mandou no WhatsApp, e **os dois rastreios** —
 * o do envelope que ela postou e o da joia que saiu daqui.
 */
export const ORDER_SEARCH_COLUMNS = [
  'order_number',
  'customer_name',
  'customer_email',
  'tracking_code',
  'material_tracking_code',
] as const

/** O `or=(…)` da busca, ou `null` quando não há termo. */
export const buildOrderSearchCondition = (search: string): string | null => {
  const term = escapeSearchTerm(search)
  if (term === '') return null
  return ORDER_SEARCH_COLUMNS.map(coluna => `${coluna}.ilike.%${term}%`).join(',')
}

/** `PED-10` — o debounce da busca, em ms. Mora aqui para a tela e o teste lerem o mesmo número. */
export const SEARCH_DEBOUNCE_MS = 300

// -------------------------------------------------------------------------------------------
// Visões — o predicado de cada uma
// -------------------------------------------------------------------------------------------

const naoSeguraLista = MATERIAL_NAO_SEGURA.join(',')

/**
 * `Precisa de ação` é a **união dos três tiles acionáveis**, e nada mais:
 *
 *   1. esperando o envelope chegar (ninguém pode fazer nada até lá);
 *   2. pago, com o material resolvido, esperando separação;
 *   3. enviado **sem rastreio** — a cliente não recebeu o aviso, e é falha silenciosa.
 *
 * O Pix aguardando fica **de fora de propósito**: ele expira sozinho e não é fila. Somá-lo faria a
 * Adri olhar 19 pendências e achar que deve algo a alguém.
 */
const PRECISA_ACAO_OR = [
  'material_status.eq.aguardando_material',
  `and(status.eq.paid,or(material_status.is.null,material_status.in.(${naoSeguraLista})))`,
  'and(status.eq.shipped,tracking_code.is.null)',
].join(',')

export interface ViewPredicate {
  /** Um `or=(…)`, quando a visão não é expressável por igualdade simples. */
  or?: string
  /** `column -> valores` para um `.in()`. */
  in?: Record<string, string[]>
}

export const viewPredicate = (view: OrderViewId): ViewPredicate | null => {
  switch (view) {
    case 'tudo':
      return null
    case 'precisa-acao':
      return { or: PRECISA_ACAO_OR }
    case 'fila-material':
      return { in: { material_status: [...MATERIAL_QUEUE_STATES] } }
    case 'a-separar':
      return { in: { status: ['paid', 'separating'] } }
    case 'em-transito':
      return { in: { status: ['shipped'] } }
    case 'concluidos':
      return { in: { status: ['delivered', 'cancelled'] } }
  }
}

// -------------------------------------------------------------------------------------------
// Os quatro contadores do topo — PED-12
// -------------------------------------------------------------------------------------------

export type QueueTileId = 'aguardando' | 'a-separar' | 'sem-rastreio' | 'pix-aguardando'

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

export const QUEUE_TILES: QueueTile[] = [
  {
    id: 'aguardando',
    label: 'Aguardando material',
    hint: 'Ninguém pode fazer nada até o envelope chegar',
    // O único que ACUMULA, e por isso o único com acento. Ele carrega a idade do mais antigo, que
    // é o que transforma "5 pedidos" em "5 pedidos, e um deles há 9 dias".
    accent: true,
    apply: f => ({ ...f, view: 'tudo', materialStatuses: ['aguardando_material'], semRastreio: false }),
  },
  {
    id: 'a-separar',
    label: 'Pago, a separar',
    hint: 'Material já recebido ou não exigido',
    accent: false,
    // Aplica EXATAMENTE o que conta: pago **e** com o material resolvido. Usar a visão
    // `a-separar` (que inclui `separating`) faria o clique trazer mais linhas que o número.
    apply: f => ({
      ...f,
      view: 'tudo',
      statuses: ['paid'],
      materialStatuses: [...MATERIAL_NAO_SEGURA_LISTA],
      semRastreio: false,
    }),
  },
  {
    id: 'sem-rastreio',
    label: 'Enviado sem rastreio',
    hint: 'A cliente não foi avisada da postagem',
    accent: false,
    apply: f => ({ ...f, view: 'em-transito', materialStatuses: [], semRastreio: true }),
  },
  {
    id: 'pix-aguardando',
    label: 'Pix aguardando',
    // A frase existe para dizer que **não é fila**. Sem ela, quatro números lado a lado sugerem
    // quatro dívidas — e esta expira sozinha.
    hint: 'Expiram sozinhos — nada a fazer',
    accent: false,
    apply: f => ({
      ...f,
      view: 'tudo',
      paymentMethods: ['pix'],
      paymentStatuses: ['pending'],
      materialStatuses: [],
      semRastreio: false,
    }),
  },
]

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
 * Desde quando este pedido espera — a data que alimenta `queueAge`.
 *
 * Enquanto o envelope não chegou, o relógio corre desde a compra: é quando a cliente foi orientada
 * a mandar. Depois que chega, corre desde o recebimento — porque aí a espera é de outra coisa (a
 * bancada), e continuar contando desde a compra faria um pedido recém-recebido nascer vermelho.
 */
export const queueSince = (row: Pick<AdminOrderRow, 'created_at' | 'material_received_at'>): string =>
  row.material_received_at ?? row.created_at

/** A idade da linha na fila, ou `null` quando o pedido não espera material nenhum. */
export const rowQueueAge = (
  row: Pick<AdminOrderRow, 'created_at' | 'material_received_at' | 'material_status'>,
  now?: Date,
): QueueAge | null => {
  if (!row.material_status || row.material_status === 'nao_aplicavel') return null
  return queueAge(queueSince(row), now)
}

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

/**
 * A ordinal da compra, em texto: `1ª compra`, `3ª compra`.
 *
 * Aparece ao lado do nome porque muda o tom de tudo: alguém na terceira compra já confiou duas
 * vezes, e saber isso antes de escrever a mensagem importa num negócio memorial.
 */
export const purchaseOrdinalLabel = (n: number | null | undefined): string | null =>
  !n || n < 1 ? null : `${n}ª compra`
