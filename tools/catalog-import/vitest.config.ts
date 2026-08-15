import { defineConfig } from 'vitest/config'
import path from 'path'

const root = path.resolve(__dirname, '../..')

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
  resolve: {
    // Mesmo alias dos apps e do `packages/core`: o pacote é consumido como **source**, sem build
    // step. Feature 22 — o importador semeia o material afetivo com `inferMaterial`, a MESMA função
    // pura que a loja e o admin leem. Uma segunda cópia da regra aqui divergiria da primeira no
    // primeiro ajuste, e ninguém veria: o resultado só aparece meses depois, na fila da Adri.
    alias: {
      '@estrelinha/core': path.resolve(root, 'packages/core/src'),
    },
  },
})
