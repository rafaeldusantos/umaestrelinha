// Feature 71 · `VIS-33` — a resposta de `public.store_movement()`.
//
// Desde a feature `73` o tipo mora em `@estrelinha/core/stats` (`movement.ts`): o app do ateliê lê o
// mesmo bloco (`AD-056`). Reexportado daqui para os chamadores de antes não mudarem.
export type { MovementPeriod, MovementPeriodKey, StoreMovement } from '@estrelinha/core/stats'
