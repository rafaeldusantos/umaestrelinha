# 88 — Baseline de entrada (T01)

Medida em 2026-10-29 com a árvore parada (só `.specs/` e o `CLAUDE.md` alterados, sem commit, por
outra sessão de planejamento), um workspace por vez, `pnpm --filter @estrelinha/<w> test
--testTimeout=20000` (sem o `--`), exit code capturado fora de pipe.

| Medida | Resultado | Exit |
| --- | --- | --- |
| core | **4924 / 190** | 0 |
| functions | **1230 / 33** | 0 |
| store | **6231 / 335** | 0 |
| backoffice | **4516 / 244** | 0 |
| mobile-adm | **2279 / 140** | 0 |
| tsc store · backoffice · mobile-adm · store server · catalog-import | **0 · 0 · 0 · 0 · 0** | 0 |
| tsc `packages/core` | **11** (herdados) | 2 |
| lint backoffice | **23 / 5** | 1 |
| lint store | **2 / 2** | 1 |
| lint mobile-adm | **0 / 0** | 0 |

**Divergência contra a tabela do `CLAUDE.md`: nenhuma.** Os cinco workspaces, os tipos e o lint
batem exatamente a linha de 2026-10-29 (store 6231/335 · backoffice 4516/244 · core 4924/190 ·
mobile-adm 2279/140 · functions 1230/33; lint 25/7). Logs em
`/private/tmp/claude-503/…/scratchpad/t01/` (efêmeros).
