# BUG-20261026-conta-do-cruzamento-com-nome-vazio: Com o nome de uma opção apagado, o resumo diz "3 × 2 × 1 = 2 variações"

- **Status:** verified
- **Impact (user-side):** Cosmetic
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, renomear
- **Scenarios:** PNL-variacoes-nome-repetido-ou-vazio
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Apagar o nome de uma opção com valores (para trocá-lo) faz o resumo mostrar uma conta errada: os fatores incluem a opção sem nome, o resultado não.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Produto com Aro (3), Cor (2), Gravação (1).
2. Apagar o texto de "Nome da opção" do Aro.

**Expected:** "3 de 3 opções · 2 × 1 = 2 variações" (os fatores são as opções que entram no cruzamento).
**Actual:** "3 de 3 opções · 3 × 2 × 1 = 2 variações".

## Evidence

- relatório, sessão 1

## Fix

- **Root cause:** os fatores filtravam só "tem valores"; `cartesian` também exige nome. Anterior à 81.
- **Fix commit:** working tree, sem commit (`OptionsEditor.tsx`).
- **Regression test:** `OptionsEditor.test.tsx` › "opção com valores e sem nome fica fora dos fatores" — reprovou antes.

## Verification

- **Retested:** 2026-10-26 · em navegador: "3 de 3 opções · 2 × 1 = 2 variações" com o nome apagado; de volta, "3 × 2 × 1 = 6".

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.
