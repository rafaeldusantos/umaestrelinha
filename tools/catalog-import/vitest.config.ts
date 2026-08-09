import { defineConfig } from 'vitest/config'

// Runner do importador. Tudo aqui roda em Node: os mapeadores são puros e o layer de I/O recebe
// `fetch`, `sleep` e o client do Supabase por parâmetro (mesmo molde de AD-004). O único arquivo
// deliberadamente fora é `src/cli.ts`, que é wiring — está declarado na matriz de cobertura.
//
// `passWithNoTests` fica no default (false) de propósito: um glob quebrado tem de derrubar a suíte,
// não passar em verde lendo zero arquivo (L-021).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/*.test.ts'],
  },
})
