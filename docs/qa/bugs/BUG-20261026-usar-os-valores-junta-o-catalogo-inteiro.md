# BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro: "Usar os N valores" acrescenta todos os valores do catálogo para aquele nome, não o conjunto que a peça usa

- **Status:** consertado (2026-10-26, decisão pela recomendação do QA — confirmar)
- **Impact (user-side):** Friction
- **Severity:** High · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, escolher nome sugerido
- **Scenarios:** PNL-variacoes-sugestao-de-nome-e-valores
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Ao escolher "Tamanho", o bloco "Valores usados em outros produtos" lista 50 valores (aro 9 a 26, 6mm, 45cm, P (0,8x0,9cm), G…) e o botão "Usar os 50 valores" criaria 50 linhas de escalas que não convivem numa peça. Com "Cor", 22. O objetivo da feature ("≤ 3 cliques por opção, sem digitar") não se cumpre quando o nome é genérico, que é o caso comum.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Novo produto → Adicionar opção → digitar "tam" → escolher "Tamanho".

**Expected:** um clique acrescenta o conjunto que as peças parecidas usam (ex.: "16, 17, 18" ou "45cm, 50cm").
**Actual:** "Usar os 50 valores" (união do catálogo inteiro). No banco local, os conjuntos mais comuns de Tamanho são "6mm, 8mm" (3), "16, 17, 18" (3), "45cm, 50cm" (3).

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-valores-sugeridos-390.png`

## Decisão para a dona / produto

A spec (OPV-19, A1/A2) pede exatamente o que está implementado; o defeito é da regra, não do código.
Opções: (1) sugerir **conjuntos** — os N conjuntos mais usados daquele nome, cada um com "Usar estes";
(2) manter a união mas sem o botão de "usar todos" acima de um teto (ex.: 8); (3) manter como está.
Recomendação: (1), que é a mesma leitura de `products.options`, sem tabela nova.

## Resolução

**Status: consertado** em 2026-10-26 — decidido pela recomendação do QA (opção 1), **a confirmar**.

- A regra mora em `apps/backoffice/src/entities/product/lib/optionLibrary.ts` (pura): cada entrada da
  biblioteca ganhou `sets` — o conjunto de valores de cada produto, agrupado pela dobra e sem ordem,
  ordenado pelo nº de produtos (empate pela primeira aparição) — e `suggestValueSets` devolve até 3
  (`OPTION_SET_LIMIT`), com o que ainda falta na opção. Mesma leitura de `products.options`, sem
  tabela nova.
- O editor (`OptionsEditor.tsx`) só desenha: "Conjuntos mais usados", um botão por conjunto com os
  valores e "em N produtos" ("em 1 produto"), que aplica o conjunto inteiro. O botão da união saiu.
- Testes vermelhos antes do código: `optionLibrary.test.ts` (fixture em que a ordem por contagem e a
  alfabética discordam) e `OptionsEditor.test.tsx`.
- Spec: A1, A2 e OPV-19/OPV-20 atualizadas.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.

Consequência medida e aberta como decisão: `BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto`.
