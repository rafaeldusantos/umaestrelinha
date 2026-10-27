// Feature `75` · `AD-059` — o dono da escrita do pedido. Ver `types.ts`.

export type {
  AppActionOutcome,
  MaterialOutcome,
  MaterialTrackingOutcome,
  OrderWriteClient,
  OrderWriteDeps,
  PedidoDaAcao,
  WriteOutcome,
} from './types.ts'
export { triggerOrderNotification } from './notify.ts'
export { writeOrderStatus, type WriteOrderStatusInput } from './status.ts'
export { writeTrackingCode, type WriteTrackingCodeInput } from './tracking.ts'
export { writeMaterialStatus, type WriteMaterialStatusInput } from './material.ts'
export { writeMaterialTracking, type WriteMaterialTrackingInput } from './materialTracking.ts'
export { runAppAction } from './appAction.ts'
