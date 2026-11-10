# 98 · O pagamento que falhou — Validation Report

**Date**: 2026-11-10 (rodada 4, depois das fix tasks 10–21: bugs da QA r1 e r2 e a decisão QA-P1)
**Run by**: Validation (Dev)
**Source**: `prd.md` + `spec.md` + `tasks/01..21`

---

## Test Results

Um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe. Nenhum timeout, nenhum skipped.

| Workspace | Arquivos | Passed / Failed / Skipped | Exit |
|---|---|---|---|
| core | 238 | 5718 / 0 / 0 | 0 |
| functions | 46 | 1669 / 0 / 0 | 0 |
| store | 382 | 7188 / 0 / 0 | 0 |
| backoffice | 297 | 5266 / 0 / 0 | 0 |
| mobile-adm | 175 | 2729 / 0 / 0 | 0 |

Rodada 4 (= rodada 3 nos tipos, lint e build; `mercado-pago` sobe no local, POST vazio → 400): tipos 0 (store) · 7 (backoffice, herdados) · 0 (mobile-adm) · core 11 (herdados); lint store 2/2 · backoffice 23/5 · mobile-adm 0/0; `pnpm build` exit 0. Uma migration nova (`20261119120000_98-desfazer-no-pago-duas-vezes.sql`), só no local; probe `probes/11-desfazer-pago-duas-vezes.sql`.

**Summary**: 22570 passed, 0 failed, 0 skipped out of 22570 total (rodada 4, os cinco workspaces remedidos)

Probes contra o Supabase local (functions servidas com chaves externas inválidas), todos exit 0:
`01-registrar.sql` 19 ok · `02-comprovante.sh` 6 · `03-duas-sessoes.sh` 3 · `04-desfazer.sql` 13 ·
`05-pagamento-a-mais.sql` 17 · `06-cobranca-fechada.sh` 15 · `07-preco-travado.sh` 21 · `08-meio-informado.sh` 7 ·
`09-link-de-cartao.sh` 35 · `10-cancelamento-automatico.sh` 22 · `supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql` 10.
`supabase migration up --local`: nada pendente.

## Build & Lint

**Build**: PASS — `pnpm build` exit 0 (3/3)
**Tipos**: store 0 · server 0 · mobile-adm 0 · backoffice 7 · core 11 — iguais à baseline (herdados: `ProposalStateBadge.test.tsx`; os 11 de `core`)
**Lint**: PASS — store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 (era 1/0)

## Acceptance Criteria Coverage

58 critérios (CA e RNF do `prd.md`): 57 COVERED, 1 só navegador (RNF-04, fica para o QA real-user).
Detalhe por critério no relatório da Validation (teste ou probe por CA); os pontos que pedem atenção:

| ID | Criterion | Test | Result | Status |
|---|---|---|---|---|
| RNF-07 | O registro manual não dispara o `purchase` do GA4 | probe `01-registrar.sql` › 1i (mutação vermelha) | PASS | COVERED (fix 09) |
| RNF-04 | Envio em 390 px (câmera, galeria), 44 px, sem rolagem lateral | `accept` em `AdminRecordPaymentPage.test.tsx`; layout não | — | só navegador (QA) |
| CA-03.9 | Os três caminhos para Pago abrem o registro | core `manualPayment.test.ts` (regra); página só pelo "Avançar mesmo assim" | PASS | COVERED — `AdminOrderPage.pagamento.test.tsx` › "Outro status" → Pago/Entregue (fix 09) |
| RNF-06 | Tom memorial | loja (informativo e pendência) | PASS | COVERED — e-mail `order_cancelled_unpaid`, `CARD_LINK_*` e `/pagar-com-cartao` em 5 situações (fix 09) |

**Coverage**: 57/58 critérios cobertos; o restante (RNF-04) é DEFERRED para o QA real-user (layout em navegador)

## Failures & Fix Tasks

### Failure 1: RNF-07 sem teste

**File**: — · **Classification**: test-missing
**Root cause**: nada recusa o registro manual reivindicar o `purchase` do GA4; hoje vale por construção (o `purchase` só sai pelo webhook, `supabase/functions/mercado-pago/handlers.ts › firePurchase`). · **Fix task**: 09

Junto, na mesma fix task (lacunas de cobertura, não defeito): a fiação do "Outro status" para a tela de registro pela página real (CA-03.9) e a régua de tom no e-mail novo e em `/pagar-com-cartao` (RNF-06).

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas)
- [x] Build e lint passam (0 erros novos)
- [x] Todo critério de aceite coberto, salvo RNF-04 (só navegador) — fica para o QA
- [x] Nenhum critério MISSING ou FAILING
- [x] Bugs da QA: BUG-001..009, 011, 012 resolved/cannot-reproduce (Gate 3 r2); BUG-010 e BUG-013 e a decisão QA-P1 com fix task `done` (19–21, revisões `serve`) — **aguardando reteste do QA r3**

Rodada 1: FAIL (RNF-07 sem teste) → fix task 09 (revisão `serve`) → rodada 2: PASS → QA r1 FAIL (12 bugs) → fix tasks 10–17 → rodada 3: PASS → QA r2 (10 resolved, BUG-010 still-open, BUG-013 novo, QA-P1 respondida) → fix tasks 18–21 → rodada 4: PASS.

**Para o QA real-user (só navegador)**: layout em 390 e 1440 da tela "Registrar pagamento", do bloco Pagamento e de `/pagar-com-cartao`; câmera e galeria; alvo de 44 px; o Brick real (precisa de chave pública do MP de teste).

**Deploy (não feito; só a pedido)**: migrations `20261112120000`…`20261119120000` → functions `mercado-pago`, `checkout`, `send-notification`, `cancel-unpaid-orders` (nova) → bundles. No hospedado: conferir `pg_cron` e `pg_net`; criar no Vault `cancel_unpaid_orders_url` e `cancel_unpaid_orders_key`; o e-mail `order_cancelled_unpaid` nasce desligado.
