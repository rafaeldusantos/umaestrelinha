# 73 — Baseline de entrada (T01)

Medida em **2026-10-22**, branch `feat/73-mobile-adm-inicio` sobre `e9e68ed0`, com a árvore parada
(nenhum arquivo de código tocado; só `.specs/` e dois `tsbuildinfo` não rastreados). Um workspace por
vez, exit code capturado **fora de pipe** (saída redirecionada para arquivo, `$?` lido depois), e
`--testTimeout=20000` **sem o `--`** na loja e no painel.

## Suítes

| Workspace | Comando | Arquivos | Testes | Exit |
| --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | 138 | 3507 | 0 |
| mobile-adm | `pnpm --filter @estrelinha/mobile-adm test` | 26 | 267 | 0 |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 315 | 5748 | 0 |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 208 | 3653 | 0 |
| functions | `pnpm --filter @estrelinha/functions test` | 21 | 957 | 0 |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test` | 23 | 512 | 0 |
| **Total** | | **731** | **14644** | |

Bate **exatamente** a linha do `CLAUDE.md` raiz (14644 em 731).

## Tipos e lint

| Medida | Resultado |
| --- | --- |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` | 0 erros, exit 0 |
| `npx tsc --noEmit -p apps/mobile-adm/tsconfig.node.json` | 0 erros, exit 0 |
| `npx eslint .` em `apps/backoffice` | 23 erros / 5 warnings |
| `npx eslint .` em `apps/store` | 2 erros / 2 warnings |
| `npx eslint .` em `apps/mobile-adm` | 0 / 0 |

## R1 e R2 do design (§7) — a fila discorda de si mesma?

| | Consulta | Local (54442) | Produção (`hgkrsfpupypxtygjgthf`) |
| --- | --- | --- | --- |
| **R1** — pago com `material_status` nulo (entra em "Precisa de ação" e em nenhum bloco) | `select count(*) from public.orders where status='paid' and material_status is null` | **0** | **0** |
| **R2** — Pix pendente com o pedido fora de `pending` (conta no "Pix aguardando" sem recorte de `status`) | `select count(*) from public.orders where payment_method='pix' and payment_status='pending' and status<>'pending'` | **0** | **0** |
| (contexto) total de pedidos | `select count(*) from public.orders` | 54 | 45 |

Local por `supabase db query --local`; produção por `supabase db query --linked` (só `SELECT`),
depois de conferir `supabase/.temp/project-ref` = `hgkrsfpupypxtygjgthf`.

**Os quatro números são zero.** Hoje as duas formas não produzem número diferente em banco nenhum, e
por isso a T02 segue **preservando** as duas como estão (o bloco "Pago, a separar" com `in (…)` e a
união com `is null or in (…)`), sem unificar: mudar é comportamento do painel, e a decisão continua
sendo do usuário. A divergência fica declarada no código (`QUEUE_BLOCKS`, `unionRule`).
