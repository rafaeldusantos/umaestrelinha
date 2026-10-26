# BUG-20261026-fechar-do-modal-em-ingles: O botão de fechar dos modais se anuncia "Close"

- **Status:** open
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, modal de imagem
- **Scenarios:** PNL-variacoes-imagem-na-linha-e-envio
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

O X dos modais do painel (e da loja) tem o texto acessível "Close", em inglês, e mede 16 × 16. Leitor de tela anuncia "Close, botão" num painel em português.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Abrir o modal de imagem de uma variação → ler o nome acessível do X.

**Expected:** "Fechar", com alvo ≥ 44 px.
**Actual:** "Close", 16 × 16.

## Evidence

- relatório, sessão 1

## Decisão (escopo)

O texto mora no primitivo compartilhado `packages/ui/src/dialog.tsx` (e `sheet.tsx`), usado pelos três
apps; `AuthOverlay.test.tsx` e `MobileMenu.test.tsx` da loja citam "Close". O conserto é uma linha em cada
primitivo e duas asserções da loja — fora do escopo da 81, e mexe na loja. Recomendação: fazer numa
tarefa própria, junto com o alvo de 44 px do X.
