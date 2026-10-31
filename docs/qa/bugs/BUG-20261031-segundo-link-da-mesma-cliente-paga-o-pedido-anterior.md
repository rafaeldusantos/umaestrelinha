# BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior: o segundo pedido montado para a mesma cliente leva ao pagamento do pedido anterior

- **Status:** verified
- **Impact (user-side):** Blocks-Completion
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Cliente com conta pelo link
- **Journey Step:** J-concluir-pedido-montado, step "Concluir"
- **Scenarios:** LOJA-montado-cliente-com-conta; LOJA-montado-concluir-sem-conta-pix
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

A cliente concluiu um pedido montado (P-0002 → pedido #0264, R$ 939,12, PIX pendente). Na mesma aba
(mesma sessão do navegador), abriu um SEGUNDO link que a Adri montou para ela (P-0008, R$ 191,82). A
página mostra o pedido novo e o botão "Pagar R$ 191,82 com PIX", mas tocar nele leva à tela de PIX do
pedido ANTERIOR (#0264, R$ 939,12). Nenhum pedido novo é criado; a proposta P-0008 continua Aberta.
Voltar devolve ao checkout de P-0008, e tocar de novo repete. A cliente não consegue concluir o pedido
novo nessa aba — e pode pagar o antigo achando que é o novo.

## Reproduction

- **Charter:** CH-montado-cliente-que-ja-tem-conta · **Tour:** Back-Button Tour
- **Environment:** 390×844, Chromium, sessão anônima, loja :8082 local

1. Abrir o link de uma proposta e concluí-la com PIX (fica em `/pedido/<A>/pagamento`).
2. Na mesma aba, abrir o link de outra proposta para o MESMO e-mail.
3. Escolher entrega e tocar "Pagar … com PIX".

**Expected:** `create-order` com o token novo, pedido novo, PIX do valor novo.
**Actual:** nenhuma chamada a `create-order`; vai `get-order` + `create-payment` do pedido <A> e a tela mostra "PEDIDO #0264 · R$ 939,12".

## Evidence

- Requisições da aba: `get-proposal`, `quote`, `get-order`, `create-payment` (sem `create-order`).
- `sessionStorage['estrelinha-proposal-checkout'].state.orderId` = `13098d02…` (o pedido anterior) com a proposta nova na tela.
- Banco: P-0008 `open`, `order_id` nulo; pedidos de `marta.qa89@exemplo.invalid`: só #0264 e #0267.
- Observação de leitura (não é conserto): `ProposalCheckoutPage.tsx:211` só refaz o estado quando o e-mail muda; com o mesmo e-mail, o `orderId` da conclusão anterior sobrevive.

## Fix

- **Fix:** T30 da feature 89 (working tree, sem commit): o rascunho da proposta ganhou `scope` (o id da proposta), persistido; a página semeia quando `scope` difere da proposta aberta, não mais quando o e-mail muda.
- **Regression test:** `apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx` (+2: o 2º link cria pedido novo; o F5 da mesma proposta mantém o que a cliente editou).

## Verification

- **Retested:** 2026-10-31, em navegador (Chromium, loja :8082 e painel :8083 locais, functions servidas) · **Report:** reports/2026-10-31-pedido-montado-reteste.md
- **Result:** 390×844, contexto anônimo novo. Helena concluiu P-0010 com PIX (pedido #0268, R$ 722,08). Na mesma aba, saindo da tela de PIX, abriu o link de P-0011 (mesmo e-mail): o rascunho veio com `orderId` nulo e `scope` da proposta nova. "Pagar R$ 191,82 com PIX" chamou `create-order` (com `proposal_token`, `client_request_id` novo), depois `get-order` e `create-payment` do pedido NOVO; a tela mostrou "PEDIDO #0269". Banco: P-0011 `completed` → #0269, R$ 191,82. A aba original da Marta (do QA, com P-0008 aberta) repetida: "Pagar" criou o pedido #0270 (R$ 191,82), P-0008 `completed`. Canário: em P-0012, o número trocado para 777 sobrevive ao F5 (`scope` igual, `orderId` nulo).
