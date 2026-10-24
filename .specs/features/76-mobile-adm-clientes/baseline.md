# 76 — Baseline de entrada (T01, `01-baseline-e-medicao`)

Medida em **2026-10-24**, worktree `store-76-mobile-adm-clientes`, branch `feat/76-mobile-adm-clientes`
sobre `146d1c8b` (merge da `75` em `feature/mobile-adm`), com a **árvore parada**: `git status` sem
nenhuma alteração em `apps/`, `packages/`, `supabase/` ou `tools/` (só `.specs/` — `STATE.md`,
`spec.md`, `context.md` — estava alterado). Um workspace por vez, exit code capturado **fora de pipe**
(saída redirecionada para arquivo, `$?` lido depois), `--testTimeout=20000` **sem o `--`** nos seis.
O worktree não tinha `node_modules`: `pnpm install --frozen-lockfile --prefer-offline` (nenhum arquivo
rastreado mudou). O `tsc -p apps/mobile-adm/tsconfig.node.json` deixou um `tsconfig.node.tsbuildinfo`
não rastreado, apagado (artefato da medição, não é da feature).

## Suítes

| Workspace | Comando | Arquivos | Testes | Exit |
| --- | --- | --- | --- | --- |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 320 | 5885 | 0 |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 212 | 3696 | 0 |
| mobile-adm | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | 76 | 1102 | 0 |
| core | `pnpm --filter @estrelinha/core test --testTimeout=20000` | 166 | 4219 | 0 |
| functions | `pnpm --filter @estrelinha/functions test --testTimeout=20000` | 21 | 957 | 0 |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test --testTimeout=20000` | 23 | 512 | 0 |
| **Total** | | **818** | **16371** | |

### Leitura

- A linha *Testes* do `CLAUDE.md` raiz (**15819 em 792**) está **envelhecida**: é a da entrada da `75`.
  A `75` fechou com 16316/818 (handoff do `STATE.md`) e a árvore de hoje mede **16371/818** — a
  diferença contra o handoff é **+55 testes, zero arquivos**: core 4206 → 4219 (+13) e mobile-adm 1060
  → 1102 (+42), nos arquivos já existentes (consertos do QA e do reteste da `75`, que entraram depois
  de o handoff ser escrito). Store (5885/320), backoffice (3696/212), functions e catalog-import batem
  o handoff. **O gate da `76` compara contra a tabela acima, não contra o `CLAUDE.md`**; a T33 corrige
  a linha do `CLAUDE.md` com esta medição.
- A suíte do painel (3696/212) é o número que **não pode mudar de arquivo e não pode ter asserção
  tocada** (`MAC-23`, `MAC-25`): a `76` só pode acrescentar casos nele (a reexportação por `toBe`).

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

Os 11 de `packages/core` são os do `CLAUDE.md`, arquivo por arquivo: `home/__tests__/carousel` 5,
`pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2 e
`packages/supabase/src/client.ts` 2. Um erro novo em qualquer projeto acima, ou um 12º em `core`, é
regressão da `76`.

## Lint (`npx eslint .` em cada app)

| App | Erros / warnings | Exit |
| --- | --- | --- |
| store | 2 / 2 | 1 |
| backoffice | 23 / 5 | 1 |
| mobile-adm | 0 / 0 | 0 |
| **Total** | **25 / 7** | |

Bate com a linha *Lint* do `CLAUDE.md` raiz. A meta do app do ateliê é **0/0**.

## O banco local (54441/54442) — o que a feature vai ler

Medido por `psql` read-only no container `supabase_db_uma-estrelinha-store`. São os números que as
fixturas da T08/T10/T30 e a prova em navegador (T32) esperam.

| Fato | Valor |
| --- | --- |
| `customer_list` | **48** linhas, 48 `id` distintos (9 com conta, 39 convidadas) |
| `orders` | **54**; `sum(orders_total)` de `customer_list` = 54 (todo pedido casa com uma pessoa) |
| `last_activity_at` nulo | **4** (cadastro sem pedido); **nenhuma** data repetida (empate de cursor: só por fixtura) |
| `same_email_count > 1` | 0 (a duplicata de A18 também só por fixtura) |
| Nome vazio ou nulo | 4 (a regra "nome ⇒ e-mail" aparece em dado real) |
| E-mail com `_` | 5, entre eles `VROSA_RJ@HOTMAIL.COM` (a fixtura do vínculo da A10 é `VROSAXRJ@…`) |
| Telefone preenchido | 44 de 48 |
| `status/payment_status` dos 54 pedidos | delivered/approved 24 · paid/approved 12 · pending/approved 4 · shipped/approved 4 · pending/expired 5 · pending/rejected 3 · pending/cancelled 1 · cancelled/cancelled 1 |
| Pessoas com pedido **em aberto** (Q2b: `approved` e `pending`/`paid`/`separating`/`shipped`) | **18** |
| `orders_paid >= 2` ("Compraram mais de uma vez") | **3** |

O **9** do Specify (os `pending` com pagamento `expired`/`rejected`/`cancelled`) é a razão da Q2b: com a
regra do rascunho essas 9 linhas deixariam a cliente "em aberto" para sempre.

## O PostgREST e o `ilike` — evidência da abertura do Design (a T02 prova de novo, com fixtura)

Medida com a sessão do admin do `seed.sql` contra `customer_list`, `or=(…)` na URL. É o que sustenta a
decisão de **aspas** e **escape** do Design (§4.2); o que não distingue (porque o banco não tem a
fixtura) está marcado.

| Padrão enviado | Linhas | Leitura |
| --- | --- | --- |
| `email.ilike.%vros_%` (sem escape) | 1 | `_` é curinga, como o Specify afirmou |
| `email.ilike."%vros\\_%"` (escapado, entre aspas) | **0** | o escape chega ao Postgres como literal |
| `email.ilike.%%%` | 48 | `%` solto é curinga |
| `email.ilike."%vrosa\\*rj%"` | 0 | `\*` não casa tudo (ambíguo: não distingue "literal" de "virou `\%`"; a T02 decide com uma fixtura com `*`) |
| `email.ilike."%a(b,c)%"` entre aspas | 0, sem erro | `(` e `,` não quebram o `or()` entre aspas (não prova casar; a T02 usa fixtura `P76 Ana (b, c)`) |
| `last_activity_at.lt."…",last_activity_at.is.null` | 18 | o cursor com nulos monta e executa |
| `and(last_activity_at.is.null,id.gt.0000…)` | 4 | o ramo do cursor sobre nulos |

## O edge runtime local

`docker ps` não mostra container de edge runtime (como na abertura da `75`). A `76` **não chama
nenhuma function**: nada aqui depende dele, e o Supabase local **não é reiniciado** (`supabase stop`
derrubaria as instâncias das outras sessões; o `project_id` é o mesmo no worktree e no checkout
principal).

## Pontos de comparação gravados antes de mover (T06, T07, T11, T12, `MAC-23`, `MAC-25`, `MAC-26`)

SHA-256 dos arquivos que a `76` toca **sem poder mudar a saída**. Medidos na abertura; a T07, a T11 e
a T12 comparam.

| Arquivo | SHA-256 |
| --- | --- |
| `apps/backoffice/src/entities/customer/api/customerQuery.ts` | `a23d7b39e8f7e37acaf6422e80e94e9368cf6988552f53730f6320952c5aec5c` |
| `apps/backoffice/src/entities/customer/api/useAdminCustomerList.ts` | `71af5ab08e906928872c29fd803ba5cf1a6f51c271525ded9e21c6866cc070d3` |
| `apps/mobile-adm/src/entities/order/api/useListaDePedidos.ts` | `7d101f17a6b7c5a595356ec99c926b6ed39285cd005e346c39eaca69453a61dd` |
| `apps/mobile-adm/src/entities/order/api/lerComPapel.ts` | `458520010e346877591ac9103184aca3239184ab4911f1b7950f66b25a877f79` |
| `apps/mobile-adm/src/widgets/order-detail/ui/BlocoCliente.tsx` | `d4089b5c5e4290c116600026c89bfccfd7f0af9604b5fba7c972b56f363e0715` |
| `apps/mobile-adm/src/features/order-search/ui/BuscaDePedidos.tsx` | `965879d884a3c727f8299c583b8f8b311c77321722f736b707d9287ebd7f3dc7` |

Esses seis são os arquivos que a `76` **move, extrai ou reexporta** (T06, T07, T11, T12, T13). A task
que mexe em um deles só fecha com o diff explicado linha a linha **e** a suíte do workspace verde sem
asserção tocada; os testes desses arquivos (`useListaDePedidos.test.ts`, `BlocoCliente.test.tsx`,
`BuscaDePedidos.test.tsx`, a suíte do painel) são o ponto de comparação de "saída idêntica".

Contagens de âncora lidas do disco (os guardas da `74`/`75` que a `76` amplia):
`leituraSoComPapel.test.ts` (4 importadores do client: `lerComPapel.ts`, os 2 hooks de pedido e
`gravarAcao.ts`; 7 chamadas `supabase.from(` nos 2 hooks), `abasSaoAsRotas.test.ts` (4 abas, 4 rotas de
primeiro nível, **1** subrota: `/pedidos/:id`), `rotasSobGuarda.test.ts` (exatamente 1 `</Route>`).
