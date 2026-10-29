# 86 — Baseline de entrada (T01)

Medida em 2026-10-28, árvore principal (`master`, base `d101ca2f`), com a árvore parada — antes de
qualquer edição desta feature. Um workspace por vez, exit code capturado fora de pipe,
`--testTimeout=20000` **sem** o `--` antes (store e backoffice).

| Medida | Comando | Resultado | Exit |
| --- | --- | --- | --- |
| Testes core | `pnpm --filter @estrelinha/core test` | **4767 / 186** | 0 |
| Testes backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **4301 / 240** | 0 |
| Testes store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | **6176 / 330** | 0 |
| Tipos store | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | **0** | 0 |
| Tipos backoffice | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0** | 0 |
| Tipos core | `npx tsc --noEmit -p packages/core/tsconfig.json` | **11** (herdados) | 2 |
| Lint store | `npx eslint .` em `apps/store` | **2 erros / 2 warnings** | 1 |
| Lint backoffice | `npx eslint .` em `apps/backoffice` | **23 erros / 5 warnings** | 1 |

**Divergência com a tabela do `CLAUDE.md`: nenhuma.** As três contagens de teste batem a linha
*Testes* (store 6176/330 e backoffice 4301/240 do fecho da `85`; core 4767/186 do fecho da `84`), os
tipos batem (0 · 0 e core em 11) e o lint bate (store 2/2 · backoffice 23/5).
