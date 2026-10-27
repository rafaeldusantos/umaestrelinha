# 82 · Baseline de entrada

Medida em 2026-10-26, árvore parada (só `.specs/features/82-*` não rastreado, nenhum código tocado),
um workspace por vez, `pnpm --filter @estrelinha/<ws> test --testTimeout=20000`, exit fora de pipe.

| Workspace | Testes / arquivos | Exit |
| --- | --- | --- |
| core | 4466 / 178 | 0 |
| mobile-adm | 2021 / 126 | 0 |
| store | 6013 / 326 | 0 |
| backoffice | 3916 / 225 | 0 |

Tipos (`npx tsc --noEmit -p …`): store 0 · backoffice 0 · mobile-adm 0 · `packages/core` **11** (herdados,
os mesmos da baseline do `CLAUDE.md`).

A tabela do `CLAUDE.md` da raiz dizia core 4461/177 · mobile-adm 2014/125 · store 6006/325 · backoffice
3915/225: envelhecida em +5/+1 · +7/+1 · +7/+1 · +1 pelo commit `744da7ea` (fotos das joias). Vale esta.

Banco local: a migration `20261027120000_inicio-fotos-das-joias` e a da `80` estão APLICADAS (o
`store_overview` tem `foto_do_pedido`, `suppliers` existe) mas **sem registro** em
`supabase_migrations.schema_migrations` — `supabase migration up` tentaria reaplicá-las. A da `82` é
aplicada por `psql` (é idempotente) e registrada à mão.
