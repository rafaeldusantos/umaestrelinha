// Extensão explícita, e ela é carregável, não cosmética.
//
// A edge function `send-notification` importa este módulo por caminho relativo, e o Deno resolve o
// grafo inteiro — inclusive o de tipos. Um reexport de `./events` sem o `.ts` passa no Vite e no
// vitest e derruba o worker com `Failed resolving types` antes da primeira linha rodar (lição da
// feature 33). `purity.test.ts` deste módulo lê o disco e recusa a volta.
//
// A frase acima NÃO pode grafar o reexport por extenso, com a palavra `from` e o caminho entre
// aspas: o scanner de imports do `supabase start` lê comentário como se fosse código, tenta abrir o
// caminho sem extensão e aborta a subida da stack INTEIRA — não a function, a stack. Medido em
// 2026-09-07, com a mensagem `failed to read file: open packages/core/src/notifications/events`.
export * from './events.ts'
export * from './precondition.ts'
export * from './triggers.ts'
export * from './variables.ts'
export * from './copy.ts'
export * from './settings.ts'
export * from './defaults.ts'
export * from './phone.ts'
export * from './sender.ts'
export * from './providers/types.ts'
export * from './providers/resend.ts'
