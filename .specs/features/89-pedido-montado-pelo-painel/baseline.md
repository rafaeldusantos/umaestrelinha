# 89 — Baseline de entrada (T01)

Medida em 2026-10-31 com a árvore parada sobre `e5fd174c` (master). `git status` idêntico antes e
depois da medição: só os três arquivos de spec da `89` (`spec.md` modificado, `design.md` e `tasks.md`
novos) — nenhum código fora do commit.

## Testes

Um workspace por vez, `pnpm --filter @estrelinha/<ws> test --testTimeout=20000` (sem o `--`), exit
capturado fora de pipe.

| Workspace | Testes / arquivos | Exit | Tabela do `CLAUDE.md` |
| --- | --- | --- | --- |
| core | **4994/192** | 0 | 4994/192 — bate |
| functions | **1250/34** | 0 | 1250/34 — bate |
| store | **6275/336** | 0 | 6275/336 — bate |
| backoffice | **4744/257** | 0 | **4746/257 — diverge em −2** |
| mobile-adm | **2281/140** | 0 | 2281/140 — bate |

catalog-import não foi medido (a `89` não o toca; a tabela registra 512/23).

**Divergência**: o backoffice mede **4744**, dois a menos que os 4746 escritos no `CLAUDE.md`
(conserto do reteste da `88`). Mesmo número de arquivos (257), todos verdes, nenhum `skip`/`todo` no
resumo. A causa não foi investigada (fora de escopo de T01); a hipótese é que os commits
`a5d6e10e`/`358334d6`/`9da41ded` (mesmo carimbo de 2026-10-30 13:51) não correspondem exatamente à
árvore medida em 4746. **O gate da `89` usa 4744 como entrada do backoffice**, conforme o tasks.md
("baseline de entrada sobrescreve a tabela do `CLAUDE.md` se divergir").

## Tipos

`npx tsc --noEmit -p <projeto>`:

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |
| `packages/core/tsconfig.json` | **11** (herdados) | 2 |
| `tools/catalog-import/tsconfig.json` | 0 | 0 |

Os 11 de core, por arquivo — idênticos aos herdados registrados no `CLAUDE.md`:
`home/__tests__/carousel` 5 · `pickHomeBanners` 1 · `pickHomeCollections` 1 ·
`sitemap/__tests__/urls` 2 · `packages/supabase/src/client.ts` 2.

## Lint

`npx eslint .` dentro de cada app:

| App | Erros / warnings | Exit |
| --- | --- | --- |
| backoffice | **23/5** | 1 |
| store | **2/2** | 1 |
| mobile-adm | **0/0** | 0 |

Total **25/7** — bate com o `CLAUDE.md`.

## Supabase local

- API `:54441` responde (`curl /rest/v1/` → 200).
- Postgres `:54442` aceita conexão; `supabase_migrations.schema_migrations` tem **76** linhas, igual
  aos **76** arquivos em `supabase/migrations/` (nenhuma pendente no local antes da `89`).
- 12 containers `uma-estrelinha-store` de pé; CLI 2.121.0. Não foi preciso `supabase start`.
