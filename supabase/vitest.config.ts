import { defineConfig } from 'vitest/config'

// Runner do layer de I/O da edge function. `handlers.ts` roda aqui porque não importa `Deno` nem
// `esm.sh` — tudo entra por `Deps` (AD-004). O `index.ts` (wiring com Deno.serve) fica de fora:
// é o único pedaço sem teste, e a matriz de cobertura declara isso.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['functions/**/__tests__/*.test.ts'],
    // Os guardas que varrem o repositório pela AST (`pushSoNoMotor`, `claudeSoNaPorta`,
    // `wiringResolve`) leem centenas de arquivos de `apps/` e `packages/` e, no runner de 2 vCPUs
    // do CI, passaram dos 5 s padrão (run 40626253288) — reprovação por TEMPO, não por asserção.
    // É o mesmo teto que a loja e o painel já usam (`--testTimeout=20000`).
    testTimeout: 20000,
  },
})
