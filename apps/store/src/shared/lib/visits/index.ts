// O contador de visitas da loja (feature `71`): o marcador e o id do navegador, a decisão de contar
// e o envio. Quem monta é `app/VisitCounter.tsx`; quem apaga o id na recusa é
// `entities/cookie-consent`.
export {
  VISITOR_KEY,
  OPT_OUT_KEY,
  readMarker,
  markerAllowsCall,
  saveClock,
  ensureVisitorId,
  forgetVisitorId,
  setOptOut,
  isOptedOut,
  visitCounterState,
  resetVisitCounterForTests,
} from './visitor'
export type { VisitorMarker, MarkerRead } from './visitor'
export { visitRefusal } from './refusal'
export type { VisitContext } from './refusal'
export { postVisit } from './send'
export type { VisitResponse } from './send'
