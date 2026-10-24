# BUG-20261024-limpar-da-busca-deixa-o-foco-no-body: depois de "Limpar" no vazio da busca o foco cai no <body>

- **Status:** verified por teclado (reteste-3, 2026-10-24); por toque cai no bug do primeiro toque, aberto
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P4
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-achar-uma-cliente, passo "desfazer uma busca sem resultado"
- **Scenarios:** MAD-clientes-com-leitor-de-tela
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-reteste-1.md

## Summary

O reteste de `BUG-20261024-vazio-da-busca-nao-e-anunciado` (B09) confirmou o anúncio ("Nenhum resultado." e
"Busca e recorte desfeitos."). Mas o botão "Limpar" sai do DOM junto com o vazio, e o foco vai para o
`<body>`: quem navega por TalkBack recomeça do topo da página, depois de ouvir a frase. É a mesma família do
`BUG-20261024-ver-mais-pedidos-foco-cai-no-body` (B10), que foi consertado só nos pedidos da ficha.

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela (reteste) · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, build servido do worktree da `76`, Supabase local

1. Abrir /clientes, buscar `Telma Souza` (0 resultados).
2. Focar "Limpar" (Tab) e ativar com Enter.
3. Ler `document.activeElement`.

**Expected:** o foco vai ao campo "Buscar cliente" (onde a pessoa digita de novo).
**Actual:** `document.activeElement` é o `BODY`. O campo fica vazio e a lista volta com 25 linhas.

## Evidence

- Log do reteste (`activeElement` = `BODY:`), `docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-1/B02-vazio-telma-390.png` (fixtura: busca sem resultado).

## Retest (2026-10-24, rodada 3)

Focar "Limpar" e Enter: `document.activeElement` = `INPUT#busca-de-clientes`, campo vazio, 25 linhas, região viva "Busca e recorte desfeitos.". Por toque, o primeiro toque em "Limpar" não age (bug novo, mesma causa do chip).

## Re-found (2026-10-24, reteste-3)

Teclado: foco em "Limpar" + Enter, campo vazio e `activeElement` = `INPUT#busca-de-clientes`. Pass. Por toque, "Limpar" ainda não limpa no primeiro toque (ver o bug do primeiro toque, regressado).
