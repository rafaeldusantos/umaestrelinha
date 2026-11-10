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
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
  manualPaymentAuthor,
  manualPaymentMethodLabel,
  type ManualPaymentMethod,
  type ManualPaymentVoice,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_FALLBACK,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_TONES,
  paymentMethodLabel,
  type AdminOrderStatus,
  type AdminPaymentStatus,
} from './labels.ts'
export {
  ARRANGE_PAYMENT_TITLE,
  CARD_CONTACT_TITLES,
  REPIX_WINDOW_DAYS,
  cardContactTitle,
  cartaoParaResolver,
  pagamentoACombinar,
  pagamentoPerdido,
  pagamentoSemCobrancaDaLoja,
  pedidoAguardaPagamento,
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
export {
  PARCEL_TRACKING_BASE_URL,
  TRACKING_CODE_MIN_LENGTH,
  normalizeMaterialTrackingCode,
  normalizeTrackingCode,
  parcelTrackingUrl,
  trackingCodeRefusal,
} from './tracking.ts'
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
export {
  DEFAULT_ORDER_SLICE,
  MATERIAL_QUEUE_STATES,
  ORDER_VIEWS,
  applyOrderSlice,
  isBlockSlice,
  viewPredicate,
  type OrderSlice,
  type OrderViewId,
  type SliceBuilder,
  type ViewPredicate,
} from './views.ts'
export { ORDER_SEARCH_COLUMNS, SEARCH_DEBOUNCE_MS, buildOrderSearchCondition } from './search.ts'
export {
  purchaseOrdinalLabel,
  queueSince,
  rowQueueAge,
  type RowQueueInput,
} from './row.ts'
export {
  rowSummary,
  type PrimaryActionId,
  type RowSummary,
  type RowSummaryInput,
} from './rowSummary.ts'
export {
  PICKUP_DONE_ACTION,
  PROXIMO,
  nextStep,
  type NextStep,
  type NextStepInput,
} from './nextStep.ts'
export {
  buildHistory,
  type HistoryEnvelopeInput,
  type HistoryEvent,
  type HistoryKind,
  type HistoryManualPaymentInput,
  type HistoryNoteRow,
  type HistoryNotificationRow,
  type HistoryStatusRow,
} from './history.ts'
export {
  shippingLine,
  shippingMethodLabel,
  type ShippingLineInput,
  type ShippingMethodInput,
} from './delivery.ts'
export {
  EMPTY_TITLE,
  ORDER_PAGE_SIZE,
  cursorFilter,
  emptyHint,
  isOrderId,
  listCountLine,
  sliceOrder,
  type OrderCursor,
} from './list.ts'
export { chargeMaterialText, chargeMaterialUrl, type ChargeMaterialInput } from './charge.ts'
export {
  ACTION_FAILED,
  COPY_FAILED,
  MATERIAL_IN_PRODUCTION,
  MATERIAL_TRACKING_SAVED,
  ORDER_CHANGED,
  PARTIAL_MATERIAL,
  PARTIAL_TRACKING,
  SAVING,
  TRACKING_COPIED,
  actionConfirmation,
  appPrimaryAction,
  canChargeMaterial,
  customerFirstName,
  customerFirstNameAfterDe,
  customerFirstNameMidSentence,
  shippedNoticeSent,
  trackingEdit,
  trackingSheet,
  type AppAction,
  type AppActionId,
  type AppActionInput,
  type AppActionPlan,
  type Confirmation,
  type ConfirmationAction,
  type ConfirmationInput,
  type TrackingSheet,
  type TrackingSheetContext,
  type TrackingSheetOrigin,
} from './appAction.ts'
export { catalogProductIds, itemPhoto } from './itemPhoto.ts'
export {
  ORDER_ADMIN_NOTE_MAX,
  adminNoteLength,
  adminNoteRefusal,
  normalizeAdminNote,
} from './adminNote.ts'
export { adminNoteAuthorLine, type AdminNoteAuthorInput } from './adminNoteAuthor.ts'
export {
  ORDER_DISCOUNT_LABELS,
  isDetailedOrder,
  orderSummary,
  type OrderDiscountKey,
  type OrderDiscountLine,
  type OrderRowPrice,
  type OrderSummary,
  type OrderSummaryInput,
  type OrderSummaryRowInput,
} from './summary.ts'
export {
  MANUAL_PAYMENT_HISTORY_NOTE,
  MANUAL_PAYMENT_NOTE_MAX,
  MANUAL_PAYMENT_UNDO_REASON_MAX,
  RECEIPTS_BUCKET,
  RECEIPT_CONTENT_TYPES,
  RECEIPT_LINK_SECONDS,
  RECEIPT_MAX_BYTES,
  RECEIPT_MAX_FILES,
  canRecordManualPayment,
  canUndoManualPayment,
  needsPaymentRecord,
  paidAtRefusal,
  reachedOnlyWhenPaid,
  receiptContentType,
  receiptExtension,
  receiptRefusal,
  undoReasonRefusal,
  type ManualPaymentOrderInput,
  type ReceiptFileInput,
} from './manualPayment.ts'
export {
  PAYMENT_ALERT_KINDS,
  PAYMENT_ALERT_LABELS,
  PAYMENT_NOT_RECORDED_LABEL,
  paymentFlags,
  paymentNotRecorded,
  type PaymentAlertInput,
  type PaymentAlertKind,
  type PaymentFlag,
} from './paymentAlerts.ts'
export {
  MATERIAL_EM_MAOS,
  UNPAID_CANCEL_DAYS,
  cancelledForNonPayment,
  unpaidCancelDeadline,
  unpaidCancelDue,
  unpaidCancelStart,
  type UnpaidCancelContext,
  type UnpaidCancelManualPayment,
  type UnpaidCancelOrder,
} from './unpaidCancel.ts'
