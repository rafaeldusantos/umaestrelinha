# BUG-20261026-alvos-pequenos-no-editor-de-opcoes: No celular, remover um valor e mover uma opção pedem toque de 16 a 32 px

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, editar opções
- **Scenarios:** PNL-variacoes-fonte-grande-e-390
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

O "x" que remove um valor mede 16 × 16, as setas de mover a opção 24 × 24 e o remover da opção 32 × 32 — abaixo dos 44 px do projeto. Os chips ficam a 6 px uns dos outros, então um toque errado remove o valor vizinho, e remover um valor vendido pausa a variação.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. 390 × 844 → Preços & variações → medir os botões "Remover valor …", "Mover … para cima/baixo" e "Remover …".

**Expected:** alvos ≥ 44 px.
**Actual:** 16, 24 e 32 px. Anterior à 81 (`git show HEAD:…/OptionsEditor.tsx`); OPV-28 nomeia só o botão de imagem e o modal.

## Evidence

- medidas no relatório, sessão 1

## Decisão de desenho

Aumentar a área por pseudo-elemento (`SWITCH_TAP_44`) faria as áreas dos chips vizinhos se sobreporem.
Opções: chips maiores com o "x" de 44 px, ou um modo "editar valores" no celular. Precisa de desenho.
