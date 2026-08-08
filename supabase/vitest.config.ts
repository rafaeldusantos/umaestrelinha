import { defineConfig } from 'vitest/config'

// Runner do layer de I/O da edge function. `handlers.ts` roda aqui porque não importa `Deno` nem
// `esm.sh` — tudo entra por `Deps` (AD-004). O `index.ts` (wiring com Deno.serve) fica de fora:
// é o único pedaço sem teste, e a matriz de cobertura declara isso.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['functions/**/__tests__/*.test.ts'],
  },
})
