# 96 · Layout da folha de separação, também em lote — Validation Report

**Date**: 2026-11-07
**Run by**: Validation (Dev)
**Source**: `.specs/work-items/96-layout-da-folha-de-separacao/plan.md`

---

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit capturado fora de pipe.

**Summary** (core): 5343 passed, 0 failed, 0 skipped — 216 arquivos, exit 0
**Summary** (backoffice): 5176 passed, 0 failed, 0 skipped — 286 arquivos, exit 0
**Summary** (mobile-adm): 2397 passed, 0 failed, 0 skipped — 151 arquivos, exit 0
**Summary** (store, pelos guardas que varrem `apps/**` e `packages/**`): 6961 passed, 0 failed, 0 skipped — 370 arquivos, exit 0

## Build & Lint

**Build** (backoffice): PASS — none · **Build** (mobile-adm): PASS — none
**Tipos** (contra o baseline da corrida, por arquivo e código): backoffice 7 = 7, todos pré-existentes em
`ProposalStateBadge.test.tsx` (anteriores a este WI; o `CLAUDE.md` registra 0 e está desatualizado) ·
mobile-adm 0 · core 11 = 11 (herdados) · store 0. Nenhum erro novo.
**Lint**: PASS pelo gate "sem regressão" — backoffice 23 erros / 5 warnings (= baseline); mobile-adm 0/0.

## Acceptance Criteria Coverage

| ID | Criterion | Test | Result | Status |
| -- | --------- | ---- | ------ | ------ |
| C-01 | foto em moldura fixa; sem foto, moldura vazia; imprimir depois das fotos | `features/pick-slip/__tests__/pickSlip.test.ts` (foto/moldura vazia) · `openPickSlips.test.ts` (print só depois de load/error, teto de 8 s) · `entities/order/api/pickSlipOrders.test.ts` (regra `itemPhoto`, rendição 112) | PASS | COVERED |
| C-02 | nome da cliente em destaque, linha própria | `pickSlip.test.ts` (recorte do `<header>`, `.cliente`) | PASS | COVERED |
| C-03 | data ao lado do número | `pickSlip.test.ts` (`<h1>` exato) · `core/time/__tests__/format.test.ts` (fuso da loja, meia-noite UTC) | PASS | COVERED |
| C-04 | quantidade em destaque | `pickSlip.test.ts` (`.qtd` 18px/700) | PASS | COVERED |
| C-05 | sem "Material esperado" | `pickSlip.test.ts` (caso invertido; "Material: cinzas" do item continua) | PASS | COVERED |
| C-06 | frete acima do endereço; retirada; sem frete, sem linha | `pickSlip.test.ts` (`it.each` PAC/SEDEX/retirada, ordem) · `core/orders/__tests__/delivery.test.ts` (`shippingMethodLabel`) | PASS | COVERED |
| C-07 | Recado e Observação na folha de um pedido e no lote | `pickSlip.test.ts` (lote de dois sem misturar) · `pickSlipOrders.test.ts` (observação lida; falha degrada) · `pages/admin/AdminOrderPage.observacao.test.tsx` (página real) | PASS | COVERED |
| C-08 | lote pela lista, documento único, teto de 10 com aviso | `pages/admin/AdminOrdersPage.folha.test.tsx` (barra e cabeçalho, sem seleção, 12→10 com aviso, falha, popup bloqueado, botão ocupado) | PASS | COVERED |

**Coverage**: 8/8 critérios cobertos (100%)

**Só a execução em navegador prova** (fica para a QA real-user): a impressão de fato esperando as fotos
depois de `document.write`, o popup não bloqueado num clique real, a leitura `.in` contra o PostgREST
local com a RLS de admin, e o layout impresso.

## Failures & Fix Tasks

nada

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas)
- [x] Build passa; tipos e lint sem erro novo contra o baseline
- [x] Todo critério de aceite das unidades de escopo que a fila cobre está COVERED
- [x] Nenhum critério está MISSING ou FAILING
- [x] Nenhum bug aberto da QA
