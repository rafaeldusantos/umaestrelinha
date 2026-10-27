// Feature `75` · `AD-059` — os tipos do dono da escrita do pedido.
//
// `core/order-actions` é a ÚNICA escrita PostgREST de `orders` e `order_status_history` em
// `apps/*/src` e `packages/*/src` (menos o `cancelOrder` do painel), e a única sequência "RPC do
// material → aviso". O painel e o app do ateliê são os dois consumidores: escrita duas vezes, a
// mesma regra divergiria sem nada quebrar (o "defeito 01"). Quem guarda é
// `pedidoGravadoSoPeloDono.test.ts`, na suíte da loja.
//
// O client é INJETADO: este módulo não importa client nenhum (o de `@estrelinha/supabase` lança sem
// env no carregamento), e o único pacote que ele cita é o supabase-js, só em `import type`
// (`__tests__/purity.test.ts`).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationTrigger } from '../notifications/triggers.ts'
import type { AppActionId } from '../orders/appAction.ts'

/** A superfície do client que o dono usa: tabela, RPC e a function de notificação. */
export type OrderWriteClient = Pick<SupabaseClient, 'from' | 'rpc' | 'functions'>

/**
 * O que o dono recebe. `notify` é a FUNÇÃO notificadora; o booleano que decide se o aviso sai, na
 * entrada de cada escrita, chama-se `avisar`. Os dois nunca têm o mesmo nome.
 */
export interface OrderWriteDeps {
  client: OrderWriteClient
  notify: (orderId: string, trigger: NotificationTrigger) => Promise<boolean>
}

/**
 * O desfecho de uma escrita em `orders`. Discriminado por STRING: com `strictNullChecks: false`,
 * união por literal booleano não estreita.
 *
 * `nenhuma-linha` é o `update` que respondeu sem erro e não alterou nada — a RLS de quem não tem
 * papel, ou a guarda de status (`expectedFrom`/`statusIn`) de um pedido que mudou. Quem decide qual
 * dos dois é o chamador (o app reconfere o papel; o painel diz "Nenhum pedido foi alterado.").
 */
export type WriteOutcome =
  | { tipo: 'ok'; emailSent: boolean }
  | { tipo: 'nenhuma-linha' }
  | { tipo: 'falhou'; erro: unknown }

/** O desfecho da RPC `set_material_status`. `reason: null` ⇒ o painel traduz para `invalid_transition`. */
export type MaterialOutcome =
  | { tipo: 'ok'; status: string; emailSent: boolean }
  | { tipo: 'sem-papel' }
  | { tipo: 'material-recusado'; reason: string | null; status: string | null }
  | { tipo: 'falhou'; erro: unknown }

/**
 * O desfecho da RPC `set_material_tracking` (feature `82`). `recusado` são as recusas com motivo
 * (`empty_code`, `material_not_applicable`, ou `ok: false` sem motivo ⇒ `reason: null`);
 * `nao-permitido` é o `not_allowed`, que a RPC dá igual para "sem papel" e "pedido não existe".
 */
export type MaterialTrackingOutcome =
  | { tipo: 'ok'; status: string | null; emailSent: boolean }
  | { tipo: 'recusado'; reason: string | null }
  | { tipo: 'nao-permitido' }
  | { tipo: 'falhou'; erro: unknown }

/** O desfecho da ação do app (`runAppAction`). */
export type AppActionOutcome =
  /**
   * `materialPassou` (feature `82`, `ENV-08`): o código do envelope moveu o material de
   * `aguardando_material` para `material_enviado` nesta gravação. Só o `rastreio-do-material` o põe.
   */
  | { tipo: 'ok'; emailSent: boolean; materialMudou: boolean; materialPassou?: boolean }
  | { tipo: 'nenhuma-linha' }
  | { tipo: 'falhou'; erro: unknown }
  | { tipo: 'sem-papel' }
  | { tipo: 'material-recusado'; reason: string | null; status: string | null; to: string }
  | { tipo: 'parcial'; etapa: 'material' | 'rastreio'; causa: 'falhou' | 'nenhuma-linha' }
  /** Feature `82` (`ENV-09`): a RPC do código do envelope recusou com motivo — `materialTrackingRefusal`. */
  | { tipo: 'material-rastreio-recusado'; reason: string | null }
  /**
   * A retentativa (`PedidoDaAcao` com `espera`) achou a linha relida SEM a ação que ela reenvia: o
   * pedido mudou desde a falha (outra aba, o painel). Nada foi à rede — a linha relida já respondeu.
   */
  | { tipo: 'mudou' }

/**
 * O que o app pede: a ação primária do estado, ou o rastreio digitado na folha. É também a
 * "retentativa" que o app guarda no erro de um pedido.
 */
export type PedidoDaAcao =
  /**
   * `espera`: a ação que a RETENTATIVA reenvia (`MAA-40`: `'separar'`). Com ela, se a linha relida já
   * não oferece essa ação, nada vai à rede e o desfecho é `mudou` (QA C01). Sem ela, o toque normal.
   */
  | { tipo: 'primaria'; espera?: AppActionId }
  | { tipo: 'rastreio'; codigo: string; origem: 'acao' | 'entrega' }
  /** Feature `82` (`ENV-07`): o código do envelope DA CLIENTE, digitado na folha do bloco Material. */
  | { tipo: 'rastreio-do-material'; codigo: string }
  /** Feature `82` (`ENV-25`): "Colocar em produção" — só o material, de `material_recebido` a `em_producao`. */
  | { tipo: 'producao' }
