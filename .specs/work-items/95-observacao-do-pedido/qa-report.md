# 95 · Observação do pedido — Validation Report

**Date**: 2026-11-04
**Run by**: Validation (Dev)
**Source**: `.specs/work-items/95-observacao-do-pedido/plan.md`

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit fora de pipe:

| Workspace | Exit | Arquivos | Testes |
| --- | --- | --- | --- |
| core | 0 | 216 | 5334 |
| functions | 0 | 39 | 1460 |
| mobile-adm | 0 | 151 | 2397 |
| backoffice | 0 | 283 | 5133 |
| store | 0 | 370 | 6961 |

**Summary**: 21285 passed, 0 failed, 0 skipped out of 21285 total (1059 arquivos).

Contra a linha do fecho do WI-01 em `CLAUDE.md › Baselines` (store 6865/364 · backoffice 5043/280 · core 5310/213 · functions 1439/39 · mobile-adm 2365/148): **store +96/+6 · backoffice +90/+3 · core +24/+3 · functions +21/0 · mobile-adm +32/+3**. ⚠️ Essa linha não foi remedida na abertura deste WI (a `master` recebeu trabalho entre o WI-01 e este), então o delta é contra a linha escrita, não contra uma entrada medida.

Probes no banco local (transação desfeita), rodados pelos implementadores: `probes/01-observacao.sql` (9 `ok —`), `probes/02-gravacao-pelo-painel.mjs` (9 `ok —`), `probes/02-observacao-da-proposta.sql` (9 `ok —`).

## Build & Lint

**Build**: PASS — `pnpm build` exit 0.
**Tipos** (contra o baseline capturado no preflight da corrida, por arquivo e código): store 0 · mobile-adm 0 · backoffice 7 (os 7 de `ProposalStateBadge.test.tsx`, pré-existentes) · core 11 (herdados) — **0 novos**.
**Lint**: store 2/2 · backoffice 23/5 · mobile-adm 0/0 — iguais ao baseline (`CLAUDE.md › Baselines`), 0 novos.

## Acceptance Criteria Coverage

| ID | Criterion | Test | Result | Status |
| --- | --- | --- | --- | --- |
| C-01 | Observação na montagem; editar não sobe `version` nem muda o link; editável em qualquer status | `AdminProposalBuilderPage.test.tsx` (envia aparada, teto trava "Criar link", editar, duplicar não copia); `draft.test.ts` (igualdade de chaves); `order-proposals/__tests__/handlers.test.ts` › save/note (sem versão, sem `edited`, aberta/vista/expirada/cancelada); `AdminProposalPage.test.tsx` › a observação; `observacaoDaPropostaSchema.test.ts` (`admin_note` em `v_fora`); probe 02-proposta (save de conteúdo e `renew` não apagam nem sobem versão) | PASS | COVERED |
| C-02 | A observação passa ao pedido na conversão; a proposta concluída mostra e edita a do pedido | probe 02-proposta (cópia na mesma transação; sem nota não cria linha); `observacaoDaPropostaSchema.test.ts`; `AdminProposalPage.test.tsx` (concluída lê e grava `order_admin_notes`); `handlers.test.ts` › note recusa concluída (409) | PASS | COVERED |
| C-03 | Página do pedido mostra e edita em todo pedido e status, distinta do Recado e da Nota interna; falha de leitura ≠ "sem observação" | `AdminOrderPage.observacao.test.tsx` (entregue, cancelado, montado; três textos distintos; falha); `OrderAdminNoteCard.test.tsx` | PASS | COVERED |
| C-04 | A cliente nunca recebe a observação | probe 01 (anon e cliente dona não leem a tabela; `select *` em `orders`/`order_list` sem a nota); `observacaoForaDaLoja.test.ts`; `checkout/__tests__/proposal.test.ts` (`get-proposal` sem `admin_note`); `observacaoDoPedidoSchema.test.ts` (RLS, `revoke anon`, fora do Realtime) | PASS | COVERED |
| C-05 | Folha de separação de um pedido imprime a observação ao lado do Recado | `pickSlip.test.ts`; `AdminOrderPage.observacao.test.tsx` (a folha recebe `admin_note`) | PASS | COVERED |
| C-06 | App mostra, cadastra e edita; falha isolada; conta sem papel não vê nem grava; mesma regra de core | `observacaoDoPedido.test.tsx`, `usePedido.test.tsx`, `FolhaDaObservacao.test.tsx`, `observacaoComClientReal.test.tsx` (supabase-js real, 403 `42501`); guardas `escritaSoPelaPorta`, `leituraSoComPapel`, `movimentoDosPedidos` | PASS | COVERED |
| C-07 | Teto 1000 numa regra só em core, igual na tela, function e `check` | `core/orders/__tests__/adminNote.test.ts`; `core/order-actions/__tests__/adminNote.test.ts`; os dois guardas de schema (teto importado); `OrderAdminNoteCard.test.tsx` e `FolhaDaObservacao.test.tsx` (1000 `𝒜` aceitos, 1001 travam); `handlers.test.ts` (422 acima do teto) | PASS | COVERED |

**Coverage**: 7/7 critérios cobertos (100%).

Fora da fila (`plan.md › Fora do escopo`, não são critérios): folha em lote, export CSV, histórico de edições.

## O que nenhuma suíte prova (para o QA)

- Layout em 390×844 e 1440, fonte a 130 % e 200 %, alvo ≥ 44px: o card do pedido, os dois campos da proposta e o bloco e a folha do app (jsdom não mede layout).
- A ação `note` da function `order-proposals` servida: a function não sobe no edge runtime local (`supabase/CLAUDE.md › order-proposals`); provada por teste de unidade.
- Android real (teclado virtual, voltar fechando a folha, TalkBack).

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas)
- [x] Build e lint passam (0 erros novos)
- [x] Todo critério de aceite das unidades de escopo que a fila cobre está COVERED
- [x] Nenhum critério está MISSING ou FAILING
- [x] Nenhum bug aberto da QA (`qa/issues/` não existe)

**If PASS**: Implementação validada → `fase: done` · QA real-user oferecida
