# BUG-20261031-trocar-variacao-solta-o-foco: "Trocar variação" pelo teclado deixa o foco no corpo da página

- **Status:** verified (2026-11-01, navegador 1440, só teclado)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando uma venda
- **Journey Step:** J-montar-pedido-para-a-cliente, step "Peças"
- **Scenarios:** PNL-montado-fonte-grande-e-teclado
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado-reteste.md

## Summary

Depois de escolher a variação de uma peça, a lista recolhe e aparece o botão "Trocar variação (108
opções)". Acionado com Enter, a lista volta a abrir, mas o botão some e o foco vai para o `<body>`. Quem
usa teclado ou leitor de tela fica sem saber onde está e precisa voltar a navegar até a lista. A parada
de Tab da lista reaberta está na variação escolhida (certo); só falta levar o foco até ela. Mesma
família de BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta.

## Reproduction

- **Environment:** 1440, Chromium, só teclado, painel :8083 local

1. `/admin/pedidos/montar`, acrescentar "Anel Afetivo Aliança com Coto Umbilical", escolher uma variação com setas + Enter.
2. Focar "Trocar variação (108 opções)" e apertar Enter.
3. Ler `document.activeElement`.

**Expected:** o foco na variação escolhida (a parada de Tab do grupo).
**Actual:** `BODY`; a lista está aberta com 108 opções e a escolhida com `tabIndex 0`.

## Evidence

- Medido no reteste: `activeElement` = `BODY` 400 ms depois do Enter; `[role=radio]` = 108, `tabIndex 0` e `aria-checked` na 6ª.

## Fix

- **Fix:** `apps/backoffice/src/entities/product/ui/VariantPicker.tsx` — o `radiogroup` ganhou `ref`, e um efeito sobre `aberta` leva o foco, depois do commit que abre a lista, à parada de Tab do grupo (`[role="radio"][tabindex="0"]`, a escolhida) por `devolverFoco` do dono único `apps/backoffice/src/shared/lib/foco.ts`. `aberta` só vira `true` pelo "Trocar variação", então não há outra marca de gesto.
- **Regression test:** `apps/backoffice/src/entities/product/ui/__tests__/VariantPicker.test.tsx` (+1, "\"Trocar variação\" pelo teclado leva o foco à variação escolhida, nunca ao <body>"): vermelho antes do conserto (`activeElement` = `BODY`), verde depois.
- **Mutante:** a chamada a `devolverFoco` apagada, reinjetada no arquivo real com SHA-256 conferido na restauração ⇒ morto por asserção pelo caso novo (1 de 14). Uma marca de "foi o gesto" escrita na primeira versão do conserto sobreviveu ao próprio mutante (era redundante: só o botão abre a lista) e foi removida, junto com um caso de teste que era verdadeiro nos dois mundos.

## Verification

- **Retested (2026-11-01, Chromium, 1440, painel :8083 local, só teclado):** `/admin/pedidos/montar`, "Aliança com Coto" + Tab + Enter ⇒ 108 `[role=radio]`; setas até a 6ª e Enter ⇒ foco na escolhida ("Prata 925 · Não · 14", `aria-checked=true`, `tabIndex 0`). Foco em "Trocar variação (108 opções)" e Enter ⇒ 400 ms depois `document.activeElement` é o `BUTTON role=radio aria-checked=true tabindex=0` da mesma variação (antes: `BODY`); o botão saiu e a lista tem 108 opções; o Tab seguinte sai do grupo para o campo seguinte (uma parada). Evidência: `evidence/2026-10-31-pedido-montado/a5-trocar-variacao-foco.png`. Relatório: `reports/2026-10-31-pedido-montado-reteste.md` (adendo).
