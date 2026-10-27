# 83 — Baseline de entrada

Medida em **2026-10-26 (22:33 -03)**, worktree `store-83-loja-ao-vivo`, branch
`feature/83-loja-ao-vivo` sobre `744da7ea`, com a árvore parada (nenhum arquivo de código tocado; só
`.specs/features/83-loja-ao-vivo/` não rastreado). Um workspace por vez, na ordem abaixo, exit code
capturado **fora de pipe** (saída redirecionada para arquivo, `$?` lido depois), e
`--testTimeout=20000` **sem o `--`** em todos.

## Suítes

| Workspace | Comando | Arquivos | Testes | Exit | Duração |
| --- | --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test --testTimeout=20000` | 178 | 4466 | 0 | 7,7 s |
| functions | `pnpm --filter @estrelinha/functions test --testTimeout=20000` | 26 | 1105 | 0 | 2,6 s |
| mobile-adm | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | 126 | 2021 | 0 | 30,4 s |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 225 | 3916 | 0 | 50,0 s |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 326 | 6013 | 0 | 85,9 s |
| **Total (5)** | | **881** | **17521** | | |

`catalog-import` não foi medido (a `83` não o toca); a linha do `CLAUDE.md` raiz é 512/23.

**A linha do `CLAUDE.md` raiz está envelhecida** (core 4461/177 · mobile-adm 2014/125 · backoffice
3915/225 · store 6006/325): a diferença (+5/+1 · +7/+1 · +1/0 · +7/+1) é do commit `744da7ea`
("fotos das joias na Início…"), feito depois da última medição escrita lá. O gate da `83` compara
contra **esta** tabela, nunca contra a do `CLAUDE.md`.

## Tipos e lint

| Medida | Resultado |
| --- | --- |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p packages/core/tsconfig.json` | **11 erros, exit 2** — os herdados de sempre (`home/__tests__/carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2) |
| `npx eslint .` em `apps/mobile-adm` | **0 / 0**, exit 0 |
| `npx eslint .` em `apps/backoffice` | 23 erros / 5 warnings |
| `npx eslint .` em `apps/store` | 2 erros / 2 warnings |

## O que a `83` vai tocar, e o que precisa ficar idêntico

| Workspace | Esperado ao fechar |
| --- | --- |
| core | sobe (`core/live`, `counterNotes`, tipo e hook) |
| mobile-adm | sobe (tela, cartão, guardas, client real) |
| store | sobe (`visitasPorHoraSchema`, política) |
| backoffice | **+1 arquivo / +N casos** só do guarda `notasDoContadorNoCore`; o resto idêntico, sem asserção tocada |
| functions | **idêntico** (a function `visit` não muda) |

Logs da medição: fora do repositório (scratchpad da sessão), não versionados.
