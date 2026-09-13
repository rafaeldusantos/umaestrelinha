// `.ts` explícito de propósito (`CLAUDE.md`, medido na feature 33).
//
// Quem alcança este módulo de fora do Vite é a edge function `admin-users`, em Deno — que resolve
// por caminho relativo com extensão explícita **e resolve o grafo de tipos junto**. Um
// Um reexport deste módulo sem a extensão derruba o worker com `Failed resolving types` antes da
// primeira linha rodar, e nada no `pnpm test` acusaria: o vitest e o Vite resolvem as duas formas.
//
// ⚠️ **A frase acima não pode conter a forma literal do import sem extensão.** O bundler do
// `supabase start` varre dependências por texto e **não remove comentário**: com o exemplo escrito
// por extenso aqui, ele tentava montar um arquivo sem `.ts` que não existe e o start inteiro morria
// com `failed to read file: open packages/core/src/admin-users/refusals`. É o mesmo defeito que os
// guardas deste repositório combatem — casar **menção** em vez de **uso** —, desta vez dentro da
// ferramenta. Medido no merge da `48` com a `49`, em 2026-09-13.
//
// `__tests__/purity.test.ts` guarda isto, inclusive no grafo transitivo — um vizinho pode quebrar
// este módulo sem tocar nele.
export * from './refusals.ts'
