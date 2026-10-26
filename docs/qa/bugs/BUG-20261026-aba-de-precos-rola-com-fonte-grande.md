# BUG-20261026-aba-de-precos-rola-com-fonte-grande: Com a fonte do celular a 200 %, a aba de preços rola para o lado

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, toda a aba
- **Scenarios:** PNL-variacoes-fonte-grande-e-390
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Com a fonte do sistema a 200 % em 390, a página do produto passa a rolar na horizontal: a aba "Preços & variações 1", "Adicionar opção", "Ir para a grade", os seletores do "Preencher coluna" e o rótulo "Comprimento" ficam mais largos que a coluna.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. 390 × 844, fonte do documento a 200 %.
2. Produto com opções → aba Preços & variações.

**Expected:** nenhuma rolagem horizontal do body (OPV-28).
**Actual:** `scrollWidth` 466 (e 429 só pela aba), `scrollX` 76.

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-fonte-200-390.png` (antes) · `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-reteste-fonte-200-390.png` (depois)

## Fix

- **Root cause:** `whitespace-nowrap` do `<Button>` e do `TabsTrigger` e larguras fixas em rem (`w-36`, `w-44`) sem teto; quase tudo é anterior à 81 — só "Adicionar opção" é texto desta feature.
- **Fix commit:** working tree, sem commit (`OptionsEditor.tsx`, `PricingTab.tsx`, `GridToolbar.tsx`, `AdminProductFormPage.tsx`).
- **Regression test:** token exato em `OptionsEditor.test.tsx`, `tabs/PricingTab.test.tsx` (2), `GridActions.test.tsx` e `AdminProductFormPage.variacoes.test.tsx` — os cinco reprovaram antes.

## Verification

- **Retested:** 2026-10-26 · 390 a 100/130/200 %: `scrollWidth` 390 nos três, `scrollX` 0.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.
