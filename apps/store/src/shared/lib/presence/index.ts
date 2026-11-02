// A presença na loja: o id e a origem (`presence.ts`) e o envio (`send.ts`). Quem monta é
// `app/PresencePing.tsx`; quem apaga na recusa de cookies é `entities/cookie-consent`.
export {
  PRESENCE_KEY,
  PRESENCE_SOURCE_KEY,
  captureLandingSource,
  ensurePresenceId,
  forgetPresence,
  landingSource,
  presenceState,
  resetPresenceForTests,
  savePresenceClock,
} from './presence'
export { postPresence } from './send'
export type { PresenceResponse } from './send'
