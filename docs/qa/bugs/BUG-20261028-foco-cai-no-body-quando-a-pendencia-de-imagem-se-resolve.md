# BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve: Enviar a primeira foto pelo atalho do checklist e fechar o modal joga o foco no topo da página

- **Status:** fixed — retestado em navegador (2026-10-28, working tree, sem commit; `verified` depois do commit) · reteste em `reports/2026-10-28-backoffice-resumo-com-imagens-reteste.md`
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack; Adri cadastrando peças (teclado)
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, pendência "imagens" do checklist → modal Mídia → fechar
- **Scenarios:** PNL-midia-produto-sem-imagem; PNL-midia-teclado-e-leitor
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

Numa peça sem foto, a pessoa abre o modal Mídia pela pendência "Ao menos uma imagem" do Pronto para publicar,
envia a primeira foto e fecha com Esc. A pendência some (cumprida) e o foco vai para o `<body>`: o leitor volta ao
início da página e não há anel visível. Fechando sem enviar, o foco volta certinho à pendência.

## Reproduction

- **Charter:** CH-midia-produto-sem-imagem · **Tour:** Feature Tour
- **Environment:** 390×844, teclado, Chromium, pt-BR

1. `/admin/produtos/novo`; Tab até "Ao menos uma imagem — Envie ao menos uma imagem. Ir →" e Enter (abre o modal, foco dentro).
2. Enviar um PNG pelo modal; esperar "enviada".
3. Esc (ver também a observação do Esc duplo no relatório) e ler `document.activeElement`.

**Expected:** o foco vai para um lugar com sentido — "Editar mídia" ou a foto nova do Resumo (`MOD-06` + o conserto 2 da prova).
**Actual:** `document.activeElement === document.body`.

## Evidence

- Relatório, sessão 7: sem envio → foco na pendência; com envio → BODY.
- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-26-novo-depois-remover-390.png`

## Fix

- **Root cause:** o `onCloseAutoFocus` do `ProductMediaDialog` focava a origem guardada ao abrir, e a pendência "Ao menos uma imagem" já tinha saído do DOM (cumprida) — foco em nó desconectado cai no `<body>`.
- **Fix commit:** commit pendente (sem commit, regra do projeto) — aplicado na working tree: `features/product-form/ui/ProductMediaDialog.tsx` — se `origem.isConnected` é falso, o foco vai ao "Editar mídia" do Resumo, marcado por `MEDIA_FOCUS_FALLBACK_ATTR` (`ProductMediaSummary.tsx`).
- **Regression test:** `AdminProductFormPage.midia.test.tsx` › "o foco ao fechar o modal aberto pela pendência que deixou de existir" (página real: produto sem imagem, abrir pela pendência, enviar 1 foto, Esc ⇒ foco no "Editar mídia"; vermelho antes) e o par sem envio (foco volta à pendência).

## Reteste (2026-10-28) — passou

390×844, `/admin/produtos/novo` (sem salvar), bundle com `isConnected` e `MEDIA_FOCUS_FALLBACK_ATTR` conferido.

1. Foco por teclado na pendência "Ao menos uma imagem — Envie ao menos uma imagem. Ir →" (Shift+Tab/Tab) e Enter: o
   modal abre com o foco dentro.
2. PNG enviado pelo modal até "enviada"; Esc.
3. `document.activeElement` = botão **"Editar mídia · 1 sem descrição"**, `:focus-visible` verdadeiro; não é o `<body>`.
   A pendência saiu como botão (0 no DOM).

Par: peça nova recarregada, pendência → Enter → Esc sem enviar ⇒ o foco volta à **pendência** (`:focus-visible`).

O Esc duplo depois de `setInputFiles` continua no Playwright (o primeiro Esc não fechou; o segundo fechou) — é a
observação já aberta no relatório original, não este bug.

Evidência: `.playwright-mcp/85-reteste-03-foco-depois-da-pendencia-390.png`.
