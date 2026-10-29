# BUG-20261028-dialogos-animam-com-movimento-reduzido: com "reduzir movimento" ligado, os diálogos do painel e a folha da loja continuam animando

- **Status:** open
- **Impact (user-side):** Cosmetic
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando o menu; Cliente navegando pelo menu
- **Journey Step:** abrir o seletor/editor no painel; abrir a folha do menu na loja
- **Scenarios:** PNL-menu-movimento-reduzido
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Anterior à `86`** (primitivos compartilhados). Com `prefers-reduced-motion: reduce`: o `Dialog` do painel (seletor
e editor do menu) tem `animation: enter 0.15s` e `transition: all 0.2s`; a folha do menu da loja desliza com
`enter 0.5s`. O que a 86 desenhou (linhas, submenu) só tem transição de cor de 0.15 s. É a mesma família da dívida
"o resto do painel sem par `motion-reduce:`" do `CLAUDE.md`.

## Reproduction

- **Charter:** CH-menu-celular-fonte-grande-e-movimento · **Tour:** Feature Tour
- **Environment:** 390 × 844, `emulateMedia({ reducedMotion: 'reduce' })`

1. `/admin/menu` → Adicionar item; ler `getComputedStyle` do diálogo.
2. Loja → abrir o menu; ler a folha.

**Expected:** sem deslize/entrada (ou só esmaecer instantâneo).
**Actual:** painel `enter 0.15s` + `all 0.2s`; loja `enter 0.5s`.

## Evidence

- Relatório, sessão 8.
