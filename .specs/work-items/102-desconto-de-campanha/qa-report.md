# WI 102 · Campanhas de desconto — Validation Report

**Date**: 2026-11-13
**Run by**: Validation (Dev), fechamento da corrida por ondas do orquestrador
**Source**: `prd.md` + `spec.md` + os `Pronto quando` de `tasks/01`–`09`
**Repositório**: `.` (monorepo), worktree `store__feature-102`, branch local `feature/102`, 9 commits (`b67eca0d`…`a1c6ea53`) sobre `eceb80c2`

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit capturado fora de pipe. Logs em
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/eaef95c3-de46-4d2e-b865-767f3ea6589c/scratchpad/wi/102/val/`.

| Workspace | Arquivos | Testes | Exit | Leitura |
| --- | --- | --- | --- | --- |
| core | verde | verde | 0 | — |
| functions | verde | verde | 0 | — |
| mobile-adm | verde | verde | 0 | — |
| store | 399/399 | **7374/7374** | 1 | 0 teste reprovado; o exit vem de **um** `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` (sem teste associado). Repetiu igual na segunda execução isolada. É a contenção do worker que o `CLAUDE.md` já registra (2026-11-09), com a máquina em load average 83 (outras sessões no ar) |
| backoffice (1ª) | 304/306 | 5353/5355 | 1 | `AdminCampaignFormPage.test.tsx` ("o banco recusando o percentual em uso (23503)") e `AdminOrdersPage.aviso.test.tsx` (lote de 60, `Test timed out in 45000ms`) |
| backoffice (2ª, sozinha) | 305/306 | 5354/5355 | 1 | só o lote de 60 de `AdminOrdersPage.aviso.test.tsx`, de novo por **timeout de 45 s**, nunca por asserção |
| os 2 arquivos do painel, isolados | 2/2 | **48/48** | 0 | `AdminCampaignFormPage` e `AdminOrdersPage.aviso` passam sozinhos |

**Summary**: nenhum teste reprova por asserção. As três ocorrências são de contenção: o RPC do worker, e o teto de 45 s do caso de 60 pedidos, que o `CLAUDE.md` já registra como o caso mais lento do painel. Esse caso passa isolado, e o WI não tocou o caminho dele: `git diff eceb80c2..HEAD` está vazio para `AdminOrdersPage.tsx`, para o teste, para `entities/order/api` e para `core/order-actions`. O `AdminCampaignFormPage` é da T01 e passa isolado. A falha dele na suíte cheia foi `getByRole` antes de a carga terminar, sob a mesma contenção.

## Build & Lint

**Build**: PASS
- A primeira execução de `pnpm build` falhou com `[vite:build-html] URI malformed` em `apps/store/index.html`. A causa é que `%VITE_SUPABASE_URL%` não estava definida: o worktree não tem `apps/*/.env`, que é gitignored. É ambiente, não código.
- Com as variáveis públicas do Supabase local na linha de comando, sem segredo, os três apps compilam: `Tasks: 3 successful, 3 total`. A loja leva 16,8 s, o painel 27,6 s e o mobile-adm 7,9 s.

**Tipos** (`npx tsc --noEmit -p …`): nenhum erro novo. A fila não deixou baseline de tipos, e a comparação foi feita contra a tabela de baselines do `CLAUDE.md`.

| Projeto | Erros | Leitura |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | 0 | — |
| `apps/store/tsconfig.server.json` | 0 | — |
| `apps/mobile-adm/tsconfig.app.json` | 0 | — |
| `apps/backoffice/tsconfig.app.json` | 7 | os 7 herdados, todos em `ProposalStateBadge.test.tsx` |
| `packages/core/tsconfig.json` | 11 | os 11 herdados, nos mesmos arquivos (`home/__tests__` 7, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2) |

**Lint** (`npx eslint .` por app): sem regressão.
- Loja: 2 erros e 2 avisos (`ShareButtons`, `ShippingCalc` e dois avisos de fronteira em `ProductInfo`), todos herdados.
- Painel: 23 erros e 5 avisos, igual ao baseline. `useAdminProducts.ts`, tocado pela T03, já estava na lista antes.
- Mobile-adm: 0 erros e 0 avisos.

## Prova contra o banco (AD-012)

`probes/05-sacola-e-checkout.sh`, da T05, nunca tinha rodado.

**Primeira execução:** saiu com 6 FALHAS, todas defeitos do próprio script:
- não havia peça sem variação no banco local, onde todas as 735 peças ativas têm grade;
- o `create-order` recusou o e-mail do probe;
- quatro linhas `ok` passaram sobre valores vazios.

**Correção:** devolvi o achado ao agente da T05 em `modo: corrigir`, e ele corrigiu só o probe.

**Segunda execução:** exit 0 e `falhas: 0`, contra as functions do worktree servidas com chaves externas inválidas e o banco local :54442. O que ficou provado:

- **Pedido em vigência (CA-13):**
  - o pedido nasce;
  - a linha marcada grava a campanha do servidor (`…|20`), e o id forjado no corpo é descartado;
  - a linha comum fica sem campanha;
  - `orders.campaign_discount` sai 58,78 = 293,90 × 20%.
- **Corpo forjado:** 422 `promotion_no_longer_valid`, com 0 pedidos gravados.
- **Depois do fim (CA-04):**
  - o pedido que ainda exibe a campanha recebe 422 e nada é gravado;
  - o pedido que não a exibe nasce sem campanha (`campaign_discount 0.00`).
- **Pago depois do fim (D-05, CA-16):**
  - subtotal 789,92 = 235,12 + 554,80;
  - o cupom de 10% desconta 55,48, só sobre a peça comum;
  - a campanha é preservada (58,78);
  - a linha regravada mantém a campanha e o preço (235,12).
- **Limpeza:** 0 campanha, 0 cupom e 0 pedido do probe.

**Encerramento:** o edge runtime que subi foi encerrado e conferido em `docker ps -a`.

Os probes 01 a 04 (T01 a T03) foram executados pelas próprias tarefas, como consta no `implement-log.md`.

## Acceptance Criteria Coverage

Os testes não citam os critérios pelo número. O rastreio vai do critério às tarefas que o declaram e de lá aos testes que elas escreveram. Cada revisão (`wi-impl-review`) conferiu a cobertura da sua tarefa, e as que pediram correção foram fechadas antes do commit.

| ID | Critério (resumo) | Tarefas | Prova | Status |
| --- | --- | --- | --- | --- |
| CA-01 | cadastrar a campanha, a lista mostra | 01, 02 | `AdminCampaign*Page.test.tsx`, `core/campaigns`, probes 01–02 | COVERED |
| CA-02 | recusas do cadastro | 01 | `core/campaigns/refusals`, a página e a migration (probe 01) | COVERED |
| CA-03 | 20% em R$ 209,90 em todas as superfícies | 04, 05, 09 | `campaignUnitPrice`, cartão, página, sacola, checkout, pedido montado | COVERED |
| CA-04 | antes e depois da vigência: preço de sempre | 04, 05, 06, 08 | a RLS por `now()`, `isCampaignLive`, probe 05 (depois do fim) | COVERED |
| CA-05 | cada variação sobre o próprio preço | 02, 04 | mapeador da loja, tabela por variação do painel | COVERED |
| CA-06 | o menor entre o "de/por" e a campanha (RN-06) | 01, 02, 04, 08 | `core/campaigns/price` (centavo, meio para cima), feed | COVERED |
| CA-07 | tirar ou encerrar devolve o preço de sempre | 02, 03, 04, 05 | porta `setProductsCampaign`, edição em massa, releitura da sacola | COVERED |
| CA-08 | tirar o percentual em uso é recusado com a contagem | 01 | FK composta `restrict` (probe 01), página (23503) | COVERED |
| CA-09 | a vitrine lista exatamente as peças da campanha | 06 | `useOfferProducts`, `OffersPage`, `servePage` (`offers`) | COVERED |
| CA-10 | feed com `sale_price` e `sale_price_effective_date` | 08 | `google-feed`, `shopping/xml`, `shoppingParity` | COVERED |
| CA-11 | miniaturas de cor acima da faixa | 04 | `ColorPreview` (`aboveBand`), cartão | COVERED (forma); medida de layout com a QA |
| CA-12 | outro nome e outro selo em todas as superfícies | 04, 06, 07 | selo, vitrine, bloco da Home | COVERED |
| CA-13 | o pedido guarda cobrado, cheio, campanha e percentual | 05 | migration da T05, `create-order`, probe 05 | COVERED |
| CA-14 | o selo com as duas cores cruzadas | 01, 04 | `core/campaigns/text` (contraste), `CampaignBand`/`CampaignBadgeInline` | COVERED |
| CA-15 | 390×844 e 1440×900, fonte a 200 %, sem rolagem horizontal | 01, 03, 04, 06, 07 | tokens de classe e alvo de 44 px nos testes; jsdom não mede layout | COVERED (forma); medida em navegador com a QA |
| CA-16 | cupom só na peça comum | 05, 09 | `couponRefusal`/`eligibleSubtotal`, probe 05 (55,48 = 10% de 554,80) | COVERED |
| CA-17 | promoção progressiva sem a peça de campanha | 05 | `resolveOrderPricing` (`hasCampaign` fora da faixa) | COVERED |

**Coverage**: 17/17 critérios cobertos (100%). CA-11 e CA-15 estão provados pela forma; a medida em viewport fica com a QA real-user, porque o jsdom devolve 0 para layout.

## Afirmações caducadas na corrida

Nenhuma. As nove tarefas registraram "Caducou: nada".

## Failures & Fix Tasks

Nenhuma fix task. Não houve reprovação por asserção, nem erro de tipo ou de lint novo. A falha do probe 05 era do próprio script; foi corrigida dentro da T05 e reexecutada com exit 0.

## Overall Verdict

**Status**: PASS

- [x] Nenhum teste reprova por asserção. As três ocorrências de exit 1 são contenção (o RPC do worker e o teto de 45 s), e os arquivos envolvidos passam isolados.
- [x] Build PASS, com as variáveis públicas do local. Tipos e lint sem regressão contra o baseline.
- [x] Todos os critérios de aceite estão cobertos, CA-11 e CA-15 pela forma.
- [x] Nenhum critério está MISSING ou FAILING.
- [x] Sem bugs da QA, porque a QA ainda não rodou.

**Pendências declaradas, que não reprovam**: a medida em navegador de CA-11 e CA-15 (390, 1440, fonte a 200 %), o CLS do bloco da Home (T07, premissa 6) e a conferência do selo contra o protótipo ficam para a QA real-user. As três migrations (`20261130120000`, `…130000` e `…140000`) estão aplicadas só no banco local.

---

# Re-Validation 2 — depois das fix tasks da QA (rodada 1)

**Date**: 2026-11-13 · **Escopo**: as fix tasks 10–15 (BUG-001…BUG-006), commits `6cce6713`, `1db4971b`, `7eabc5c0`, `b339f3ae`, `8271c871`, `36196100` sobre `a1c6ea53` · workspaces tocados: `apps/store` (14 arquivos), `apps/backoffice` (4), `packages/core` (2), `supabase/functions` (4) · logs em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/eaef95c3-de46-4d2e-b865-767f3ea6589c/scratchpad/wi/102/val2/`

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit fora de pipe.

| Workspace | Arquivos | Testes | Exit | Leitura |
| --- | --- | --- | --- | --- |
| core | 245/245 | **5865/5865** | 0 | — |
| functions | 49/49 | **1703/1703** | 0 | — |
| store | 402/402 | **7387/7387** | 1 | 0 teste reprovado; o exit vem de um `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`, sem teste associado — a mesma contenção da Validation 1 |
| backoffice | 305/306 | 5356/5357 | 1 | `AdminCampaignFormPage.test.tsx` › "tirar o 15% com 12 peças é recusado…" (`getByTestId('pilula-do-percentual')` antes de a carga terminar). **Isolado, duas execuções: 20/20, exit 0.** Máquina em load average 84–92 (outras sessões). Mesmo arquivo e mesmo sintoma da Validation 1 — contenção, não asserção |

## Build, tipos e lint

- **Build:** PASS nos três apps (`Tasks: 3 successful, 3 total`), com as variáveis públicas do Supabase local na linha de comando (o worktree não tem `.env`).
- **Tipos:** store 0 · store server 0 · mobile-adm 0 · backoffice 7 (herdados, `ProposalStateBadge.test.tsx`) · core 11 (herdados) — idênticos à Validation 1.
- **Lint:** store 2 erros / 2 avisos · backoffice 23 / 5 — iguais ao baseline.

## Bugs da QA

Os seis bugs da rodada 1 têm fix task `done` (10–15) e ficam **aguardando o reteste da QA** — não reprovam a Validation e seguem `open` até a rodada de confirmação.

| Bug | Fix task | Commit |
| --- | --- | --- |
| BUG-001 · critical | 10 | `6cce6713` |
| BUG-002 · high | 11 | `1db4971b` |
| BUG-003 · high | 12 | `8271c871` |
| BUG-004 · high | 13 | `7eabc5c0` |
| BUG-005 · medium | 14 | `b339f3ae` |
| BUG-006 · medium | 15 | `36196100` |

## Overall Verdict

**Status**: PASS — nenhum teste reprova por asserção (as duas ocorrências de exit 1 são contenção, e o arquivo do painel passa isolado); build PASS; tipos e lint sem regressão; os seis bugs com fix task `done`, aguardando o reteste.

---

# Re-Validation 3 — fix tasks 16–19 (QA rodada 2)

**Data:** 2026-11-13 · **HEAD:** `1f0d6dbb` · um workspace por vez, exit code capturado fora de pipe, `--testTimeout=20000` sem o `--`

| Gate | Resultado |
| --- | --- |
| Testes | core **5873/5873** (245) · functions **1705/1705** (49) · store **7394/7394** (402) · backoffice **5360/5360** (306) · mobile-adm **2734/2734** (176) — os cinco com exit 0 |
| Tipos | store 0 · `tsconfig.server.json` 0 · mobile-adm 0 · backoffice 7 e `packages/core` 11, herdados (iguais à baseline) |
| Lint | store 2 erros / 2 avisos · backoffice 23 / 5 · mobile-adm 0 / 0 — igual à baseline |
| Build | `pnpm build` com as variáveis públicas do Supabase local na linha de comando: Tasks 3 successful, 3 total |

| Bug · severidade | Fix task | Commit |
| --- | --- | --- |
| BUG-008 · high | 16 | `9f05e2b2` |
| BUG-002 · high (still-open) | 17 | `faec01fd` |
| BUG-007 · high | 19 | `39a59748` |
| BUG-009 · high | 18 | `1f0d6dbb` (defeito anterior ao WI, corrigido aqui por decisão de escopo registrada no `item.md`) |

Sem migration nova. Os quatro bugs seguem `open`/`still-open` até o reteste da rodada de confirmação da QA.

## Overall Verdict (Re-Validation 3)

**Status**: PASS — testes, build, tipos e lint sem regressão; as fix tasks 16–19 `done`, aguardando o reteste.
