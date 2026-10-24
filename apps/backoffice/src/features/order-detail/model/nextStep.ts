// `PED-29` — "Próximo passo: X", com o motivo quando há pendência, e **sem bloquear**.
//
// Desde a feature `74` a regra mora em `@estrelinha/core/orders` (`nextStep.ts`): o detalhe do app do
// ateliê diz o mesmo próximo passo, e duas escritas divergiriam sem nada quebrar. Este arquivo
// REEXPORTA por referência (`regrasDoPedidoNoCore.test.ts`, `toBe`), para os chamadores de antes não
// mudarem. O `DbOrder` que o painel passa satisfaz a entrada estrutural (`NextStepInput`).

export { PICKUP_DONE_ACTION, nextStep, type NextStep } from '@estrelinha/core/orders'
