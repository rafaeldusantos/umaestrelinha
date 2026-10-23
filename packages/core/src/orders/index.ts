// `@estrelinha/core/orders` — o vocabulário de um pedido que os três consumidores compartilham.
//
// O barrel existe para a loja e o painel importarem por nome. A edge function `send-notification`
// **não** passa por aqui: ela alcança o arquivo por caminho relativo, com extensão explícita, e é
// o arquivo que o guarda de alcance protege.
//
// Desde a feature `59` todo especificador deste diretório leva `.ts`, inclusive aqui: o
// diretório inteiro passa a ser alcançável pelo Deno, e `purity.test.ts` cobra isso.
export { formatOrderNumber, stripOrderNumberPrefix } from './format.ts'
export {
  SITUATION_LABELS,
  SITUATION_LABELS_BY_AUDIENCE,
  SITUATION_TONES,
  calendarParts,
  firstEventAt,
  formatShortDate,
  orderSituation,
  situationDetail,
  type Situation,
  type SituationAudience,
  type SituationInput,
  type SituationKey,
  type SituationTone,
  type StatusEvent,
} from './situation.ts'
export {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  type AdminOrderStatus,
  type AdminPaymentStatus,
} from './labels.ts'
export {
  REPIX_WINDOW_DAYS,
  pagamentoPerdido,
  podeGerarNovoPix,
  repixDeadline,
  type RepixInput,
} from './repix.ts'
export {
  JOURNEY_STEP_LABELS,
  orderJourney,
  type Journey,
  type JourneyInput,
  type JourneyStep,
  type JourneyStepKey,
  type JourneyStepState,
} from './journey.ts'
export { PARCEL_TRACKING_BASE_URL, parcelTrackingUrl } from './tracking.ts'
export {
  MATERIAL_NAO_SEGURA_LISTA,
  NEEDS_ACTION_BLOCKS,
  QUEUE_BLOCKS,
  needsActionOrFilter,
  needsActionRule,
  needsActionSqlPredicate,
  queueBlock,
  toPostgrestFilter,
  toSqlPredicate,
  type QueueBlock,
  type QueueBlockId,
  type QueueColumn,
  type QueueCond,
  type QueueRule,
} from './queue.ts'
