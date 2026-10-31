# BUG-20261031-trocar-variacao-solta-o-foco: "Trocar variação" pelo teclado deixa o foco no corpo da página

- **Status:** open
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
