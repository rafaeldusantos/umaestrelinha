# BUG-20261028-voltar-depois-da-folha-perde-a-rolagem: na loja do celular, voltar depois de navegar pela folha do menu leva ao topo da página

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Cliente navegando pelo menu
- **Journey Step:** J-navegar-pelo-menu-da-loja, tocar um item na folha → voltar
- **Scenarios:** LOJA-menu-depois-de-gravar-390-e-1440
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Anterior à `86`** (a navegação da folha — `Link` com `onNavigate` — não mudou na 86). Em 390, a cliente rola a
Home até y = 1200, abre a folha, toca "Perguntas frequentes" e volta com o botão do navegador: a Home volta em y = 0.
Controles: tocar um link de peça na mesma posição e voltar restaura (1547); no computador, o mega menu restaura (1200).
A folha trava a rolagem enquanto está aberta, e a posição guardada é a da trava.

## Reproduction

- **Charter:** CH-menu-loja-depois-de-gravar · **Tour:** Back-Button Tour
- **Environment:** 390 × 844, loja dev :8082

1. Home, rolar até 1200; abrir o menu; tocar "Perguntas frequentes".
2. Voltar.

**Expected:** a Home volta na posição de antes.
**Actual:** `scrollY` 0 (10 leituras em 3 s).

## Evidence

- Relatório, sessão 5.
