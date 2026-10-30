# BUG-20261026-fechar-do-modal-em-ingles: O botão de fechar dos modais se anuncia "Close"

- **Status:** open
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, modal de imagem
- **Scenarios:** PNL-variacoes-imagem-na-linha-e-envio; PNL-menu-teclado-foco-e-nomes; PNL-aviso-teclado-e-leitor
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

## Re-found (2026-10-28)

Ciclo de QA da 85 (`reports/2026-10-28-backoffice-resumo-com-imagens.md`). O X do modal **Mídia** se anuncia
"Close" (agora com 44 × 44); o visualizador de zoom tem o "Fechar" certo, mas carrega também um botão "Close" de
0 × 0 do primitivo. O modal "Imagem de <variação>" segue com "Close".

## Re-found (2026-10-28, feature 86)

Ciclo de QA da 86 (`reports/2026-10-28-backoffice-menu-montado-pela-dona.md`). O X do seletor "Adicionar item ao menu" e do editor "Editar “…”" em `/admin/menu`
se anuncia "Close" e mede 16 × 16 (1440 e 390). Cenário acrescentado: PNL-menu-teclado-foco-e-nomes.

## Re-found (2026-10-30)

Nos diálogos novos da feature `88` — o de aviso (`NoticeDialog`), o do lote e o de cancelamento — o X
continua anunciando "Close" e mede 16 × 16 (21 × 21 a 130 %). Cenário: `PNL-aviso-teclado-e-leitor`.
Relatório: `reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`.

## Re-found (2026-10-30, reteste da 88)

- Adri despachando pedidos, Chromium 1440×900 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- O diálogo de aviso ("Mudar para Enviado"), o de cancelamento e o do lote ainda terminam com o botão "Close" (lido no `innerText` do diálogo). Fora do conserto do QA da 88, como o `tasks.md` declara.
