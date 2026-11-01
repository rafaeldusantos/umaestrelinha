# BUG-20261031-frete-antigo-depois-que-a-adri-atualiza: depois de "A Adri atualizou seu pedido", o frete cobrado é o da sacola antiga

- **Status:** verified (2026-11-01, navegador 390×844 local)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Cliente de luto pelo link
- **Journey Step:** J-concluir-pedido-montado, step "Concluir" (ramo editado com a página aberta)
- **Scenarios:** LOJA-montado-link-morto-ou-mudou
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

Com a página do link aberta e PAC escolhido (R$ 35,00 para 2 peças), a Adri acrescentou uma peça. Ao
concluir, a cliente recebe "A Adri atualizou seu pedido. Confira de novo antes de concluir." (certo) e
a página relê as peças. A lista de entrega passa a mostrar PAC a R$ 37,49 (cotação do pacote novo), mas
o Resumo e o botão continuam com "Frete · Correios PAC R$ 35,00". Na mesma tela, dois preços para o
mesmo PAC; o pedido nasce com o frete antigo.

## Reproduction

- **Charter:** CH-montado-link-que-mudou-ou-morreu · **Tour:** Multi-Tab Tour
- **Environment:** 390×844 (loja) + 1440 (painel), local

1. Abrir o link, preencher o CEP 01310-100 e escolher PAC.
2. No painel, Editar a proposta e subir a quantidade de uma peça; Salvar.
3. Na loja, tocar "Pagar"; recebe a frase de atualização.
4. Ler o Resumo e a lista de entrega; tocar "Pagar" de novo.

**Expected:** a entrega escolhida é recotada (ou desmarcada) e o total usa o frete do pacote novo.
**Actual:** Resumo "Frete · Correios PAC R$ 35,00", lista "Correios PAC … R$ 37,49"; pedido #0265 com `shipping_cost 35.00`.

## Evidence

- Resposta `melhor-envio?action=quote` depois da releitura: PAC `37.49`.
- `orders` #0265: `shipping_cost 35.00`, `total 1158.07`.

## Decision

- **Confirmada pelo usuário em 2026-10-31:** opção (a) — quando a página recebe "A Adri atualizou seu pedido", a entrega escolhida volta a "não escolhida" (serviço e preço cotado saem) e a cliente escolhe de novo; nenhum preço de frete aparece sem ser cotado para o pacote atual.

## Fix

- **Fix:** `apps/store/src/pages/ProposalCheckoutPage.tsx`, no ramo `ProposalChangedError` do `handleConfirm`: `useStore.getState().setShipping(null)` antes de `reler()`. Sem entrega o bloco deixa de estar completo e o fluxo (`resolveFlow`) o reabre sozinho; o Resumo volta a "a calcular" e o "Pagar" fica desabilitado até a escolha. Uma primeira versão também tirava "delivery" de `confirmed` e chamava `setEditing('delivery')`; o mutante que apagava as duas linhas sobreviveu (o fluxo já reabre o bloco), e elas saíram.
- **Regression test:** `apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx`, "a frase de atualização desfaz a entrega; o preço velho some e o pedido nasce com o frete novo" (pela página real sobre os blocos reais, PAC e SEDEX cotados; PAC R$ 35 escolhido; 409 `proposal_changed` com a cotação nova PAC 37,49): depois da frase, `shipping` nulo, nenhum "Frete · Correios PAC" e nenhum "R$ 35,00" na tela, "Pagar" desabilitado; escolhido o PAC de novo, o `create-order` sai com `{v:4, frete:37.49}` depois de `{v:3, frete:35}`. Vermelho antes do conserto (`shipping` continuava o PAC de 35).
- **Mutante:** o `setShipping(null)` apagado, reinjetado no arquivo real com SHA-256 conferido ⇒ morto por asserção pelo caso novo.
- **Limite declarado:** com UMA opção de envio na cotação nova, a pré-seleção de sempre do `DeliveryBlock` (opção única) a marca sozinha — sobre a cotação do pacote atual.

## Verification

- **Retested (2026-11-01, Chromium, 390×844, loja :8082 e functions locais; a edição pela `order-proposals?action=save` local, a mesma porta do painel):** P-0013 aberta, CEP 01310-100, PAC escolhido a **R$ 25,75** (Resumo "Frete · Correios PAC", "Pagar R$ 202,36 com PIX"). A proposta foi editada para quantidade 2 (versão 2). "Pagar" ⇒ "A Adri atualizou seu pedido. Confira de novo antes de concluir."; o rascunho com `shipping` nulo, o Resumo com "Frete a calcular", nenhum "Frete · Correios" na tela, nenhuma opção marcada, a lista com PAC **R$ 27,65** e SEDEX R$ 41,34, "Pagar R$ 353,21 com PIX" desabilitado; `scrollWidth` 390. Escolhido o PAC de novo: "Pagar R$ 380,86 com PIX" ⇒ `create-order` com `[{v:1, frete:25.75}, {v:2, frete:27.65}]` e o pedido **#0280** no banco com `shipping_cost 27.65`, `total 380.86` (P-0013 `completed`). Evidência: `evidence/2026-10-31-pedido-montado/a2-pac-escolhido.png`, `a3-entrega-desfeita.png`, `a4-pac-recotado.png`.
