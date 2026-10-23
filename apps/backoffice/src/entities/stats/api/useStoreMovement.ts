// Feature 71 · `VIS-04`, `VIS-10`, `VIS-33` — a leitura do bloco "Movimento da loja".
//
// Desde a feature `73` o hook, a chave e a conta da virada moram em `@estrelinha/core`
// (`hooks/useStoreMovement.ts` e `stats/turn.ts`): o app do ateliê lê o mesmo bloco (`AD-056`).
// Reexportados daqui, com identidade provada por `toBe` (`reexportaDeCore.test.ts`), para os
// chamadores de antes não mudarem.
export { STORE_MOVEMENT_KEY, useStoreMovement } from '@estrelinha/core/hooks/useStoreMovement'
export { turnDelayMs } from '@estrelinha/core/stats'
