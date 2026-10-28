# BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco: Fechar o modal de imagem da variação joga o foco no topo da página

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack; Adri cadastrando peças (teclado)
- **Journey Step:** J-cadastrar-pecas-repetidas (modal "Imagem de <variação>"), canário da 85
- **Scenarios:** PNL-variacoes-imagem-na-linha-e-envio
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

Na aba Preços & variações, a Adri toca "Imagem de Prata 925", escolhe uma foto (ou só aperta Esc) e o modal fecha
com o foco no `<body>` — não volta ao botão da linha. Quem navega por teclado ou leitor recomeça do topo.

## Reproduction

- **Charter:** canário CH-variacoes-cadastrar-pecas-repetidas · **Tour:** —
- **Environment:** 1440×900, Chromium, pt-BR

1. Abrir uma peça com variações → Preços & variações.
2. "Imagem de Prata 925" → Esc (ou escolher "Imagem 2").

**Expected:** foco volta a "Imagem de Prata 925".
**Actual:** `document.activeElement` = BODY. **Anterior à 85:** igual no painel da `master` (:8083).

## Evidence

- Relatório, sessão 2 e canário (worktree :8093 e `master` :8083).
