// Feature `74` (`MAP-01`, `MAP-02`, `MAP-07`, `MAP-47`, `AD-058`) — "em qual recorte este pedido
// está?", com UM dono para o painel e para o app do ateliê.
//
// As seis visões e o predicado de cada uma moravam em `apps/backoffice/src/entities/order/api/
// orderQuery.ts` e subiram BYTE A BYTE: o app do ateliê abre a lista no mesmo recorte que o painel,
// e duas escritas de "o que é a fila de material" divergiriam sem nada quebrar (o defeito 01). O
// painel reexporta por referência (`regrasDoPedidoNoCore.test.ts`, `toBe`).
//
// O que NASCE aqui é o recorte como DADO (`OrderSlice`: uma visão OU um bloco da fila da `73`) e o
// único tradutor dele para um builder (`applyOrderSlice`). O builder é ESTRUTURAL — `or` e `in`, nada
// mais —, porque este diretório não importa o supabase-js (`purity.test.ts`). O `applyView` do painel
// delega a ele: "como um `ViewPredicate` vira filtro" tem uma escrita só.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { needsActionOrFilter, queueBlock, toPostgrestFilter, type QueueBlockId } from './queue.ts'

/** Os estados de material que **são fila** — `nao_aplicavel` não é, e é a maioria silenciosa. */
export const MATERIAL_QUEUE_STATES = [
  'aguardando_material',
  'material_enviado',
  'material_recebido',
  'em_producao',
] as const

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

/**
 * `Precisa de ação` é a **união dos três tiles acionáveis**, e nada mais:
 *
 *   1. esperando o envelope chegar (ninguém pode fazer nada até lá);
 *   2. pago, com o material resolvido, esperando separação;
 *   3. enviado **sem rastreio** — a cliente não recebeu o aviso, e é falha silenciosa.
 *
 * O Pix aguardando fica **de fora de propósito**: ele expira sozinho e não é fila. Somá-lo faria a
 * Adri olhar 19 pendências e achar que deve algo a alguém.
 *
 * Desde a feature `73` a união é montada por `needsActionOrFilter()`, a partir da mesma regra que
 * conta cada bloco — o app do ateliê e a RPC `store_overview` leem a mesma.
 */
const PRECISA_ACAO_OR = needsActionOrFilter()

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
// O recorte como dado — feature `74`
// -------------------------------------------------------------------------------------------

/**
 * Qual recorte a lista mostra: uma das seis visões OU um bloco da fila (`QUEUE_BLOCKS`, `AD-057`).
 *
 * O bloco não é "a visão de nome parecido" (A3): a visão "A separar" inclui `separating`, o bloco
 * "Pago, a separar" não — e o número da Início é o do bloco.
 */
export type OrderSlice = { visao: OrderViewId } | { bloco: QueueBlockId }

/** A5: `/pedidos` sem parâmetro (ou com valor fora do vocabulário) abre em "Precisa de ação". */
export const DEFAULT_ORDER_SLICE: OrderSlice = { visao: 'precisa-acao' }

/** O pedaço do builder do PostgREST que um recorte usa. Estrutural: nenhum import do supabase-js. */
export interface SliceBuilder<B> {
  or(filtro: string): B
  in(coluna: string, valores: readonly string[]): B
}

/** É um bloco? Por `in`, que estreita com `strictNullChecks` desligado. */
export const isBlockSlice = (slice: OrderSlice): slice is { bloco: QueueBlockId } => 'bloco' in slice

/**
 * Aplica o recorte ao builder — a única tradução de `OrderSlice` para filtro.
 *
 * Visão: o `or` do predicado (quando há) ANTES de cada `in`, na ordem de `Object.entries` — a mesma
 * sequência que o `applyView` do painel sempre fez, e que `useAdminOrderList.test.ts` registra.
 * Bloco: `or(toPostgrestFilter(queueBlock(id).rule))` — a mesma forma que conta o bloco no painel e
 * na Início.
 */
export const applyOrderSlice = <B extends SliceBuilder<B>>(builder: B, slice: OrderSlice): B => {
  if (isBlockSlice(slice)) return builder.or(toPostgrestFilter(queueBlock(slice.bloco).rule))

  const predicado = viewPredicate(slice.visao)
  if (!predicado) return builder

  let q = builder
  if (predicado.or) q = q.or(predicado.or)
  for (const [coluna, valores] of Object.entries(predicado.in ?? {})) q = q.in(coluna, valores)
  return q
}
