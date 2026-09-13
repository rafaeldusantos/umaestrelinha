// `.ts` explícito de propósito (`CLAUDE.md`, medido na feature 33).
//
// Quem alcança este módulo de fora do Vite é a edge function `admin-users`, em Deno — que resolve
// por caminho relativo com extensão explícita **e resolve o grafo de tipos junto**. Um
// `export * from './refusals'` sem `.ts` derruba o worker com `Failed resolving types` antes da
// primeira linha rodar, e nada no `pnpm test` acusaria: o vitest e o Vite resolvem as duas formas.
//
// `__tests__/purity.test.ts` guarda isto, inclusive no grafo transitivo — um vizinho pode quebrar
// este módulo sem tocar nele.
export * from './refusals.ts'
