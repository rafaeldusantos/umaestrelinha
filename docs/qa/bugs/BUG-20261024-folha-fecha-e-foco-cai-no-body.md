# BUG-20261024-folha-fecha-e-foco-cai-no-body: Ao fechar a folha do rastreio, o foco vai para o `<body>`

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md)
- **Impact (user-side):** Friction (acessibilidade — leitor de tela e teclado)
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack (e quem usa teclado)
- **Journey Step:** J-registrar-material-e-envio — folha do rastreio (Marcar como enviado / Informar / Alterar)
- **Scenarios:** MAD-acao-com-leitor-de-tela
- **Requirements:** MAA-35 (o foco não é roubado), charter CH-acoes-com-leitor-de-tela ("devolvido ao rodapé ao fechar")
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-acoes-do-pedido.md

## Summary

A folha é aberta corretamente com o foco no campo, mas ao fechar — por "Agora não", Escape, o voltar do
navegador ou depois de "Salvar" com sucesso — `document.activeElement` passa a ser o `<body>`. Quem usa leitor
de tela perde a posição: o próximo gesto recomeça do topo da página, longe do rodapé de onde a folha saiu.

Causa provável: `FolhaDoRastreio` usa `<Sheet open>` controlado, sem `SheetTrigger`; o Radix só devolve o foco
ao gatilho que ele conhece, e aqui não há gatilho registrado (o rodapé/cartão/"Informar" abrem por
`controle.abrir()`). Sem `onCloseAutoFocus` que aponte para o controle de origem, o foco cai no body. Depois do
sucesso, o controle de origem pode até ter mudado ("Informar" vira "Alterar"; o rodapé some), então o destino
precisa ser decidido (o rodapé se existir; senão o título do pedido ou a linha de Entrega).

## Reproduction

- **Charter:** CH-acoes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** `pnpm dev:mobile-adm` (:8084), Supabase local, 390×844

1. Abrir um pedido em separação (`P75-N2`).
2. Focar o rodapé "Marcar como enviado" e apertar Enter — o foco vai ao campo (ok).
3. Fechar por "Agora não" (ou Escape, ou voltar).
4. Ler `document.activeElement`.

**Expected:** o foco volta ao controle que abriu a folha (o rodapé), ou a um ponto estável perto dele.
**Actual:** `BODY` nos três modos de fechar; também depois de "Salvar" com sucesso em "Informar" (`P75-N3`
entregue).

## Fix

- **Task:** C03 em `.specs/features/75-mobile-adm-acoes-do-pedido/tasks.md` (conserto do QA).
- **Causa confirmada:** `<Sheet>` controlado, sem `SheetTrigger` e sem `onCloseAutoFocus`; o Radix tenta
  focar o gatilho que conhece, não há nenhum, e o foco cai no `<body>`.
- **Conserto** (`apps/mobile-adm/src/features/order-actions/ui/FolhaDoRastreio.tsx`): `onOpenAutoFocus`
  guarda quem tinha o foco ao abrir (o Radix o chama antes de mover o foco); `onCloseAutoFocus` devolve o
  foco a ele por qualquer caminho de fechar. Se ele saiu da tela (o rodapé some depois do envio), o foco
  vai ao título da página (`main h1`, com `tabindex="-1"`). `preventScroll: true` — a página não rola.
- **Testes:** `FolhaDoRastreio.test.tsx` +5 ("Agora não", Escape, voltar, depois de Salvar, e o controle
  que saiu da tela) — os 5 reprovavam antes com `expected <body …>`. Defeito reinjetado (M1) ⇒ 5 mortos
  por asserção; M2–M4 (sem ponto estável, sem guardar quem abriu, sem `isConnected`) também mortos;
  SHA-256 conferido em cada restauração.
- **Medido:** mobile-adm 1094/76, store 5885/320, backoffice 3696/212, todos verdes; `tsc` do
  mobile-adm 0.
- **Reteste:** repetir os passos de Reproduction em 390×844 (P75-N2, e "Informar" em P75-N3) e ler
  `document.activeElement` — esperado o rodapé/"Informar"→"Alterar", ou o título do pedido se o controle
  sumiu.


## Retest (2026-10-24, rodada 2)

Verificado em navegador real (Chromium via Playwright, 390×844, `pnpm dev:mobile-adm` do worktree, Supabase
local sem interceptar o banco). Detalhe e números em `reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md`.
