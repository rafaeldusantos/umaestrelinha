# BUG-20261024-pagamento-por-cartao-aparece-como-card: O pedido pago com cartão na loja mostra "card" como forma de pagamento

- **Status:** fixed (retestado 2026-10-24, rodada 2)
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-ver-um-pedido, o detalhe do pedido (bloco Valores)
- **Scenarios:** MAD-pedido-abrir-e-entender
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-pedidos.md

## Summary

Todo pedido pago com cartão no checkout da própria loja grava `payment_method = 'card'` (é o valor que
`PaymentBlock` manda desde a `49`), e o mapa `PAYMENT_METHOD_LABELS` de `@estrelinha/core/orders` só
conhece `pix`, `credit_card` (pedidos importados da Nuvemshop), `boleto` e `manual`. Sem rótulo, o
detalhe do ateliê (`BlocoValores.tsx`, `?? pedido.payment_method`) desenha o valor cru: **"card"**, em
inglês e minúsculo, ao lado do selo do pagamento. No banco local são os pedidos `0174`, `0178`–`0182`
(todos os de cartão feitos pela loja nova). A loja já tem o rótulo certo noutro mapa
(`apps/store/src/entities/order/lib/paymentDelivery.ts`: `card: 'Cartão de crédito'`) — dois donos do
mesmo dado (o "defeito 01"), e o de `core` é o que está incompleto. O painel lê o mesmo mapa de `core`
(reexportado por `orderQuery.ts`) e mostra o mesmo "card".

## Reproduction

- **Charter:** CH-pedidos-achar-o-pedido-da-cliente · **Tour:** Paste Tour
- **Environment:** build servido em :4376, 390×844, Supabase local, conta `adri.qa@exemplo.invalid`

1. Aba Pedidos → buscar `#0174` → abrir o pedido.
2. Rolar até "Valores".

**Expected:** a forma de pagamento escrita para a Adri ("Cartão de crédito"), como a loja já escreve
para a cliente; valor desconhecido nunca vira texto técnico.
**Actual:** "card" (e, para qualquer valor fora do mapa, o valor cru do banco).

## Evidence

- evidence/2026-10-24-mobile-adm-pedidos/390-detalhe-0174-meio-card.png
- `select payment_method, count(*) from orders group by 1` ⇒ `card|6`, `credit_card|29`, `pix|…`

## Notes

Conserto provável: `card: 'Cartão de crédito'` no mapa de `core` (e a queda para um rótulo genérico em
vez do valor cru), com teste; decidir se o mapa da loja passa a reexportar o de `core` (dono único).
Muda o que o painel mostra para esses pedidos ("card" → "Cartão de crédito"): é conserto, mas toca a
regra `AD-056` de "o painel não muda" — registrar no handoff.

## Retest — 2026-10-24 (rodada 2)

- **Report:** reports/2026-10-24-mobile-adm-pedidos-reteste.md · build servido em :4377, 390×844, Supabase local.
- `#0174` ⇒ "Valores … Total R$ 277,25 / **Cartão de crédito** / Recusado"; `#P74-03` (`payment_method = 'cartao'`,
  fora do mapa) ⇒ "**Outra forma de pagamento**" (nunca o valor cru); `#P74-01` ⇒ "PIX". Pass.
- Evidence: evidence/2026-10-24-mobile-adm-pedidos/r2-390-detalhe-0174-cartao.png
- Painel não servido nesta rodada; ele reexporta o mapa de `core` (suíte do backoffice verde, 3671/210).
