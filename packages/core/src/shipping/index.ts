export * from './estimate'
// `.ts` explícito de propósito (`CLAUDE.md`, medido na feature 33): sem a extensão, o módulo só é
// alcançável por quem resolve como o Vite. `./estimate` acima não a tem por herança — e também
// importa um alias `@estrelinha/*` —, então o barrel inteiro ainda não atravessa o Deno; o que este
// arquivo garante é que `freeShipping` não seja o motivo quando isso for consertado.
export * from './freeShipping.ts'
