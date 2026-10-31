# BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200: a proposta sem telefone rola de lado a 390 com fonte 200 %

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando uma venda
- **Journey Step:** J-montar-pedido-para-a-cliente, step "Página da proposta"
- **Scenarios:** PNL-montado-fonte-grande-e-teclado
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

Numa proposta de cliente sem telefone, o botão "Sem telefone — copie o link" não quebra linha: a 390
com a fonte a 200 % a página passa a rolar de lado (`scrollWidth` 526). A prova da 89 mediu 390 numa
proposta COM telefone.

## Reproduction

- **Charter:** CH-montado-fonte-grande-teclado-e-privacidade · **Tour:** Feature Tour
- **Environment:** 390×844, `html { font-size: 200% }`, painel :8083

1. Criar proposta para cliente nova sem telefone.
2. Abrir `/admin/pedidos/montados/:id` a 390 e subir a fonte a 200 %.

**Expected:** `scrollWidth` 390.
**Actual:** 526; o elemento além da borda é o botão "Sem telefone — copie o link" (`whitespace-nowrap`).

## Evidence

- docs/qa/evidence/2026-10-31-pedido-montado/s5-sem-telefone-390-200.png (gitignored)

## Fix

- **Fix:** T33: o botão "Sem telefone — copie o link" quebra linha (`whitespace-normal`, `h-auto`, `min-w-0`, `max-w-full`).
- **Regression test:** `apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx` (+1).

## Verification

- **Retested:** 2026-10-31, em navegador (Chromium, loja :8082 e painel :8083 locais, functions servidas) · **Report:** reports/2026-10-31-pedido-montado-reteste.md
- **Result:** Proposta nova P-0010 para cliente sem telefone, `/admin/pedidos/montados/:id` a 390×844: `scrollWidth` 390 a 100 %, 130 % e 200 % de fonte, nenhum elemento além da borda; o botão com `white-space: normal` (216×44, 263×75, 196×194). Captura `evidence/2026-10-31-pedido-montado/r4-sem-telefone-390-200.png`.
