// `PED-23` / `D8` — o que cada linha diz quando não há espaço para uma tabela.
//
// Desde a feature `74` a regra mora em `@estrelinha/core/orders` (`rowSummary.ts`): a linha do app do
// ateliê diz a mesma frase, e duas escritas divergiriam sem nada quebrar. Este arquivo REEXPORTA por
// referência (`regrasDoPedidoNoCore.test.ts`, `toBe`), para os chamadores de antes não mudarem.

export { rowSummary, type PrimaryActionId, type RowSummary } from '@estrelinha/core/orders'
