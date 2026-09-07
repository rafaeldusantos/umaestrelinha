// Extensão explícita, e ela é carregável, não cosmética.
//
// A edge function `send-notification` importa este módulo por caminho relativo, e o Deno resolve o
// grafo inteiro — inclusive o de tipos. Um `export * from './events'` sem `.ts` passa no Vite e no
// vitest e derruba o worker com `Failed resolving types` antes da primeira linha rodar (lição da
// feature 33). `purity.test.ts` deste módulo lê o disco e recusa a volta.
export * from './events.ts'
export * from './precondition.ts'
export * from './triggers.ts'
export * from './variables.ts'
export * from './copy.ts'
export * from './settings.ts'
export * from './defaults.ts'
export * from './phone.ts'
export * from './providers/types.ts'
export * from './providers/resend.ts'
