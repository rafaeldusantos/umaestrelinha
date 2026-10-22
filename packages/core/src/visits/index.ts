// Feature 71 — a regra das visitas que a loja, a function `visit` e o painel compartilham.
// Especificadores com `.ts` explícito: o barril é alcançável pelo Deno (`denoReach.test.ts`).
export { BOT_SIGNATURES, isBotUserAgent } from './bots.ts'
export { isVisitorId, visitBody, visitBodyRefusal } from './visitor.ts'
export { OPT_OUT_PARAM, optOutHref, readOptOutParam } from './optOut.ts'
