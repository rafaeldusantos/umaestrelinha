# QA Run Report — 2026-10-27 — mobile-adm: Loja ao vivo (83) — reteste

- **Scope:** reteste em navegador dos dois bugs consertados depois da rodada `2026-10-27-mobile-adm-loja-ao-vivo.md`: o foco do "Tentar de novo" (`5b23601d`) e o arroba do rodapé da loja a 200 % (`49f8bbb5`). O terceiro bug (F5 e o período) não foi consertado e não foi retestado.
- **Cadence tier:** targeted
- **Build:** `49f8bbb5` (worktree `store-83-loja-ao-vivo`, branch `feature/83-loja-ao-vivo`) · **Environment:** build servido do mobile-adm (`pnpm --filter @estrelinha/mobile-adm build` + `vite preview` :8094) e `vite` da loja (:8095), os dois do worktree, contra o Supabase local (:54441). Login real com o admin do seed. Os dois servidores foram parados no fim.
- **Started:** 2026-10-27 03:08 (-03) · **Status:** closed

## Método

- Chromium pelo Playwright, 390×844 e 1440×900, `html { font-size }` a 100 % e 200 % (e 130 % na loja).
- O "Tentar de novo" só existe com a leitura falhando, então `/rest/v1/rpc/store_movement` foi **interceptada**: 500 na abertura; depois, com 1,5 s de atraso, 500 (nova falha) e a resposta real do banco (sucesso). Foco lido por `document.activeElement` 500 ms depois do Enter (durante a leitura) e depois da resposta.
- Nenhuma fixtura gravada no banco: o reteste não precisa de números, só da falha e do sucesso.

## Session Matrix & Results

| # | Charter | Bug | Persona | Status | Fix commit |
|---|---|---|---|---|---|
| 1 | CH-aovivo-com-rede-ruim | BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco | Equipe com TalkBack | Fixed (retestado) | `5b23601d` |
| 2 | CH-loja-politica-hora-cheia | BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 | Cliente | Fixed parcialmente (o rodapé passa; o cabeçalho segue) | `49f8bbb5` |

## Retestes

### 1 — O foco depois de "Tentar de novo"

| Viewport | Fonte | Durante a nova falha | Depois da nova falha | Durante o sucesso | Depois do sucesso | `scrollWidth` |
|---|---|---|---|---|---|---|
| 390×844 | 100 % | `H2` Acessos | `BUTTON` Tentar de novo | `H2` Acessos | `H2` Acessos, números na tela | 390 |
| 390×844 | 200 % | `H2` Acessos | `BUTTON` Tentar de novo | `H2` Acessos | `H2` Acessos, números na tela | 390 |
| 1440×900 | 100 % | `H2` Acessos | `BUTTON` Tentar de novo | `H2` Acessos | `H2` Acessos, números na tela | 1440 |
| 1440×900 | 200 % | `H2` Acessos | `BUTTON` Tentar de novo | `H2` Acessos | `H2` Acessos, números na tela | 1440 |

Em nenhuma das 16 leituras o foco caiu no `<body>` (antes do conserto: `BODY` nas três). Depois do sucesso o botão
some (0 "Tentar de novo"). **O par**: com os números na tela e o foco em "Ontem", a releitura de 15 s saiu (1
leitura em 16,5 s) e o foco **ficou** em "Ontem" — a releitura que a pessoa não pediu não mexe no foco.

### 2 — O arroba do rodapé a 200 %

Medido em `/politica-de-privacidade` e `/politicas-de-trocas-e-devolucoes`, com resultado idêntico nas duas:

| Viewport | Fonte | Arroba (x esq.–dir., altura) | Elementos do rodapé além da borda | `scrollWidth` | Quem passa da borda |
|---|---|---|---|---|---|
| 390 | 100 % | 62–328, 32 px | 0 | 390 | — |
| 390 | 130 % | 31–359, 83 px (quebra) | 0 | 390 | — |
| 390 | 200 % | 48–342, 128 px (quebra) | 0 | **434** | o grupo de ícones do **cabeçalho** (`flex shrink-0 items-center gap-2 md:gap-4`), até x = 426 |
| 1440 | 100 % | 587–853, 32 px | 0 | 1440 | — |
| 1440 | 130 % | 547–893, 42 px | 0 | 1440 | — |
| 1440 | 200 % | 454–986, 64 px | 0 | 1440 | — |

O rodapé está consertado: a 200 % em 390 o arroba ia até x = 461 e agora fica entre 48 e 342. A página **ainda
rola de lado a 390/200 %** (434), agora pelo cabeçalho da loja — achado no conserto, não consertado (decisão de
qual parte encolhe: logo, recuo do `container` ou ícones; mexe no chrome de toda página). A 130 % o arroba
quebra no meio da palavra (`overflow-wrap:anywhere`), o que é o custo aceito do conserto.

## What Was Fixed

| Bug | Commit | Prova |
|---|---|---|
| BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco | `5b23601d` | 3 casos pelo `<App />` real em `AoVivoPage.test.tsx` (vermelhos antes), 5 mutantes mortos por asserção, este reteste |
| BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 (o rodapé) | `49f8bbb5` | 1 caso de token exato em `Footer.test.tsx` (vermelho antes), 3 mutantes mortos por asserção, este reteste |

## Runtime Errors Observed

- Os 500 de `store_movement`, injetados de propósito. Nenhum outro erro de console no app nem na loja.

## Decisions for a Human

- **O cabeçalho da loja a 390/200 %** (`scrollWidth` 434): qual parte cede — o logo de 202 px (`shrink-0`), o recuo do `container` ou os ícones. Toca o chrome de toda página da loja; fora da `83`.
- **O F5 e o período escolhido na Loja ao vivo** (BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo): segue aberto. Se a decisão for manter o período escolhido, o conserto é `history.replaceState` na troca, guardando `doApp` e o estado do react-router (o mesmo mecanismo de `gravarPeriodoDoInicio`).

## Final Status

- **Matrix:** 2 linhas, 1 Fixed, 1 Fixed parcialmente. O bug do F5 continua `Blocked (human decision)` no relatório da rodada.
- **Prontidão:** o foco está de acordo com o cenário em 390 e 1440, a 100 e 200 %. O rodapé não passa mais da borda; a rolagem lateral restante a 390/200 % é do cabeçalho da loja, anterior à `83`.
