# 72 — baseline de entrada

Medida em 2026-10-22, branch `feat/72-mobile-adm-fundacao` em `b6449bd2`, árvore parada (só `.specs/`
alterado), um workspace por vez, `--testTimeout=20000` sem o `--`, exit code fora de pipe.

| Medida | Valor |
| --- | --- |
| store | **5733/312**, exit 0 (a linha do `CLAUDE.md` dizia 5731: +2 do commit `214ae94d`) |
| backoffice | **3648/207**, exit 0 |
| tsc store · backoffice | 0 · 0 |
| lint backoffice | 23 erros / 5 warnings (store: ver `pnpm lint`, baseline 2/2) |

core, functions e catalog-import não são tocados por esta feature e não foram remedidos (a `72` não
mexe em `packages/core`).
