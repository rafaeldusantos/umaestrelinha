# BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome: O botão de ação do cartão não diz de qual pedido é

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md)
- **Impact (user-side):** Friction (acessibilidade — leitor de tela)
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-registrar-material-e-envio — a lista "Aguardando material" / "Precisa de ação"
- **Scenarios:** MAD-acao-com-leitor-de-tela, MAD-acao-no-cartao-da-lista
- **Requirements:** MAA-36; expectativa do cenário: "O rodapé e o botão do cartão anunciam a ação e o pedido"
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-acoes-do-pedido.md

## Summary

Na lista, cada cartão com ação ganha um `<button>` cujo nome acessível é só o rótulo ("Recebi o material",
"Iniciar separação", "Marcar como enviado"), sem `aria-label`/`aria-describedby` com o número do pedido ou o
nome da cliente (`BotaoDaAcao.tsx`). No recorte "Aguardando material" são ~20 botões "Recebi o material"
idênticos: quem navega por botões no TalkBack ouve a mesma frase 20 vezes sem saber em qual pedido vai gravar.
O botão é irmão do link do cartão (decisão Q5), então o contexto do link não o nomeia.

## Reproduction

- **Charter:** CH-acoes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** `pnpm dev:mobile-adm` (:8084), Supabase local, 390×844

1. Início → "Aguardando material" (24 pedidos).
2. Ler a árvore de acessibilidade dos botões dos cartões.

**Expected:** "Recebi o material, pedido #P75-N1" (ou a ação com o pedido no nome/descrição).
**Actual:** 20+ botões com o nome "Recebi o material", sem o pedido.

## Fix

- **Task:** C04 em `.specs/features/75-mobile-adm-acoes-do-pedido/tasks.md` (`c04-botao-do-cartao-sem-o-pedido-no-nome`).
- **Causa:** o botão é irmão do link (Q5) e o nome do pedido só estava no `aria-label` do link; a função
  que o montava era privada de `LinhaDoPedido.tsx`.
- **Conserto:** `nomeDaLinha` virou dono único em `apps/mobile-adm/src/entities/order/model/nomeDaLinha.ts`
  (exportado pelo barrel de `entities/order`); `BotaoDaAcao.tsx` passou a ter
  `aria-label="<texto visível>, Pedido #0244, Marina Duarte"` — o rótulo visível primeiro (label in name),
  e na trava "Salvando…, Pedido #…".
- **Teste:** `apps/mobile-adm/src/pages/__tests__/acoesDoPedido.test.tsx` (+2, `<App />` real), reprovou
  antes; o defeito reinjetado (M1) e dois vizinhos (M2, M3) morreram por asserção, SHA-256 conferido.
- **Medido:** mobile-adm 1096/76, store 5885/320, backoffice 3696/212, `tsc` do mobile-adm 0.
- **Reteste:** pendente em navegador, 390×844, `/pedidos?bloco=aguardando`.

## Retest (2026-10-24, rodada 2)

Verificado em navegador real (Chromium via Playwright, 390×844, `pnpm dev:mobile-adm` do worktree, Supabase
local sem interceptar o banco). Detalhe e números em `reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md`.
