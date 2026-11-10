// Feature `75` · `AD-059` — o dono da escrita do pedido. Ver `types.ts`.

export type {
  AppActionOutcome,
  NotifyOptions,
  MaterialOutcome,
  MaterialTrackingOutcome,
  OrderWriteClient,
  OrderWriteDeps,
  PedidoDaAcao,
  WriteOutcome,
} from './types.ts'
export { triggerOrderNotification, triggerOrderNotificationReport, type NotifyReport } from './notify.ts'
export { writeOrderStatus, type WriteOrderStatusInput } from './status.ts'
export { writeTrackingCode, type WriteTrackingCodeInput } from './tracking.ts'
export { writeMaterialStatus, type WriteMaterialStatusInput } from './material.ts'
export { writeMaterialTracking, type WriteMaterialTrackingInput } from './materialTracking.ts'
export { runAppAction } from './appAction.ts'
export {
  ORDER_ADMIN_NOTE_COLUMNS,
  writeAdminNote,
  type AdminNoteOutcome,
  type AdminNoteRow,
  type WriteAdminNoteInput,
} from './adminNote.ts'
export {
  recordManualPayment,
  type ManualPaymentDeps,
  type ManualPaymentOutcome,
  type RecordManualPaymentInput,
  undoManualPayment,
  type UndoManualPaymentDeps,
  type UndoManualPaymentInput,
  type UndoManualPaymentOutcome,
} from './manualPayment.ts'
export { closeOrderCharge, type ChargeCloseOutcome } from './charge.ts'
