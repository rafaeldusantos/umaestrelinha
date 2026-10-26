# 74 — Baseline de entrada

Medida em **2026-10-23**, worktree `store-74-mobile-adm-pedidos`, branch `feat/74-mobile-adm-pedidos`
sobre `775e407e` (merge da `73` em `feature/mobile-adm`), com a árvore parada: `git status` sem nada
em `apps/`, `packages/`, `supabase/` ou `tools/`. Só havia `.specs/` alterado (`STATE.md`, `spec.md`,
`design.md` e `tasks.md` da `74`). Um workspace por vez, exit code capturado **fora de pipe** (saída
redirecionada para arquivo e `$?` lido depois), e `--testTimeout=20000` **sem o `--`** nos seis.

## Suítes

| Workspace | Comando | Arquivos | Testes | Exit |
| --- | --- | --- | --- | --- |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 317 | 5815 | 0 |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 209 | 3648 | 0 |
| mobile-adm | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | 39 | 406 | 0 |
| core | `pnpm --filter @estrelinha/core test --testTimeout=20000` | 147 | 3846 | 0 |
| functions | `pnpm --filter @estrelinha/functions test --testTimeout=20000` | 21 | 957 | 0 |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test --testTimeout=20000` | 23 | 512 | 0 |
| **Total** | | **756** | **15184** | |

Bate **exatamente** com a linha *Testes* do `CLAUDE.md` raiz (15184 em 756, workspace por workspace).

## Tipos

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.node.json` | 0 | 0 |
| `tools/catalog-import/tsconfig.json` | 0 | 0 |
| `packages/core/tsconfig.json` | **11** (herdados) | 2 |

Os 11 de `packages/core` são os mesmos do `CLAUDE.md`, arquivo por arquivo: `home/__tests__/carousel` 5,
`pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2 e `packages/supabase/src/client.ts` 2.
Um erro de tipo novo em qualquer projeto acima, ou um 12º em `core`, é regressão da `74`.

## Lint (`npx eslint .` em cada app)

| App | Erros / warnings |
| --- | --- |
| store | 2 / 2 |
| backoffice | 23 / 5 |
| mobile-adm | 0 / 0 |
| **Total** | **25 / 7** |

Bate com a linha *Lint* do `CLAUDE.md` raiz.

## Leitura

A tabela do `CLAUDE.md` **não está envelhecida**: todas as medidas batem. O gate da `74` compara
contra estes números.

## Banco local (para os probes da T10)

Medido em 2026-10-23 contra `127.0.0.1:54442`, `public.orders`, com a regra de cada bloco escrita
por `toSqlPredicate(bloco.rule)` e a união por `needsActionSqlPredicate()` (os tradutores de `core`,
nunca uma cópia à mão) e as visões pelo predicado de `viewPredicate` do painel:

| Recorte | Pedidos |
| --- | --- |
| bloco `aguardando` | 18 |
| bloco `a-separar` | 0 |
| bloco `sem-rastreio` | 1 |
| bloco `pix-aguardando` | 0 |
| visão `precisa-acao` | 19 |
| visão `tudo` | 54 |
| visão `fila-material` | 19 |
| visão `a-separar` | 12 |
| visão `em-transito` | 4 |
| visão `concluidos` | 25 |

Dois blocos estão em **zero** no banco local: os probes da T10 precisam de fixturas que os povoem
(um pago com material resolvido; um Pix pendente), senão "a contagem é igual" seria verdade sobre
nada.
