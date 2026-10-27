// `@estrelinha/core/stats` — os números da loja que o painel e o app do ateliê leem (feature `73`).
// Especificadores com `.ts` explícito, como o resto de `core` alcançável fora do Vite.
export type {
  MovementPeriod,
  MovementPeriodKey,
  StoreAccess,
  StoreAccessComparison,
  StoreAccessDay,
  StoreAccessTodayComparison,
  StoreAccessWeekDay,
  StoreAccessYesterdayComparison,
  StoreMovement,
} from './movement.ts'
export { turnDelayMs, type ServerClock } from './turn.ts'
export {
  OVERVIEW_KEYS,
  type OverviewDay,
  type OverviewJewel,
  type OverviewQueue,
  type OverviewRecentOrder,
  type StoreOverview,
} from './overview.ts'
export {
  greetingFor,
  isoWeekday,
  longDateLine,
  monthName,
  paidOrdersLabel,
  piecesLabel,
  relativeAge,
  storeHour,
  thousandsLabel,
  weekdayShort,
} from './labels.ts'
