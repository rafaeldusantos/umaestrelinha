# 87 — Baseline de entrada

Medida em 2026-10-29 sobre `bcc11ce1`, árvore limpa, um workspace por vez, `--testTimeout=20000` sem
`--`, exit code fora de pipe.

| Medida | Valor |
| --- | --- |
| core | **4918/190**, exit 0 (`rendition.test.ts` com 37 casos — a edição da task 01 não entrou) |
| store | **6219/333**, exit 0 |
| backoffice | **4491/243**, exit 0 — o `CLAUDE.md` dizia 4474: a linha estava velha pelo commit `bcc11ce1` (filtro de categoria e fornecedor no servidor), não por esta feature |
| tipos | store 0 · backoffice 0 · core 11 (herdados) |
| lint | store 2/2 · backoffice 23/5 |

Functions, mobile-adm e catalog-import não são tocados por esta feature.
