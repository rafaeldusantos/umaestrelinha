# Context — Checkout One-Page

Decisões da cliente/lojista capturadas no discovery. Data: 2026-07-27.

## Origem do discovery

Desenho no Paper, arquivo **Nanapin**, página **Home**:

| Board | Tela |
| ----- | ---- |
| `04 · Checkout Desktop — Uma página` | One-page de 3 blocos + resumo fixo + order bump + CTA + faixa de confiança |
| `05 · Checkout Desktop — PIX gerado` | Valor, contador, QR, copia-e-cola, escuta ativa, saída para a conta |
| `06 · Checkout Desktop — Pedido confirmado` | Mascote `wink`, timeline de 4 estágios, ações, upsell pós-compra |
| `07 · Checkout Mobile — Uma página` | Barra de resumo colapsável no topo + blocos + CTA fixo no rodapé |

Boards `08`–`11` (conta: pedidos, rastreio, favoritos) **não** entram nesta feature — viram a
`09-conta-cliente`.

## Benchmark que definiu o padrão

| Plataforma | O que foi aproveitado |
| ---------- | --------------------- |
| Nuvemshop / Nuvem Pago | Checkout transparente (nunca sair da loja) e dados salvos para compra rápida |
| Shopify | O **critério**, não o formato: one-page converte melhor em AOV baixo + SKU simples + recompra alta; multi-step ganha em AOV alto e primeira compra. O perfil da loja (pins de R$ 9–30, impulso, colecionadora recorrente) cai no primeiro caso |
| CartPanda | Order bump imediatamente antes do CTA (~+14% de ticket) e upsell 1-clique **depois** do pagamento |

## Decisões

### 1. Guest checkout — **não**

Login segue obrigatório, como já é hoje. Motivo: guest checkout exigiria pedido sem
`orders.customer_id`, RLS por e-mail/token, vínculo retroativo do pedido ao criar conta e revisão do
`useOrdersByCustomerId` — cerca de uma fase extra de trabalho para uma loja de volume baixo.

**Consequência que o board não previu:** a faixa "Já comprou aqui? Entre e preenchemos tudo" do board
`04` fica sem função — com login obrigatório a cliente já está autenticada ao chegar no checkout.
A faixa **sai do checkout**; o atalho de login (código de 6 dígitos + Google) permanece no overlay de
`features/auth`, que já guarda `returnTo=/checkout`. Registrado na spec como CHK-02.

### 2. Order bump — **um produto fixo em `store_settings.checkout`**

`order_bump_enabled` + `order_bump_product_id` + `order_bump_discount_percent`, editados na tela de
Configurações do backoffice. Sem tabela nova, sem motor de regras, sem RLS nova.

Descartado: tabela `order_bumps` com condições (categoria no carrinho, subtotal mínimo, prioridade,
múltiplas ofertas) — mais poderoso, ~2 fases extra, e o ganho depende de um catálogo maior do que o
atual.

## Defeitos que o discovery revelou no código atual

Não são melhorias de UI — são falhas que a spec passa a cobrir:

1. **Frete cobrado ≠ frete cotado.** `features/checkout/ui/ShippingStep.tsx:20-22` lista três opções
   fixas: o PAC usa `default_shipping_cost` das settings, SEDEX e Jadlog têm preço **literal**
   (`18.90`, `12.90`), e os **três prazos são strings fixas** (`'6-10 dias úteis'`). Enquanto isso
   `features/shipping-calc/ui/ShippingCalc.tsx:35` já chama `melhor-envio?action=quote` de verdade na
   página de produto. A cliente vê cotação real no produto e paga valor e prazo inventados no checkout.
2. **CPF coletado e descartado.** `CustomerStep` pede CPF; `CheckoutPage.handleConfirm` não o passa ao
   `createOrder`; `supabase/functions/mercado-pago/index.ts:211-215` monta o PIX com
   `payer: { email, first_name }` — **falta `identification` e `last_name`**, que a API do Mercado
   Pago exige para PIX no Brasil.
3. **`addresses` existe e está ociosa.** Tabela criada na migration inicial com RLS de SELECT e
   INSERT, nunca lida nem escrita pela loja — o endereço é redigitado a cada compra. Falta ainda a
   policy de UPDATE. `customers` tem o mesmo problema: só SELECT + INSERT, então
   `packages/auth/src/AuthContext.tsx:160-164` já tenta atualizar `customers.name` e falha em silêncio.
4. **CEP do pedido nunca gravado.** `AddressStep.tsx:42` não devolve o `cep`; `orders.address_zip` fica
   nulo e `features/order-management/ui/MelhorEnvioTab.tsx:71` estoura TypeError ao cotar etiqueta de
   um pedido criado pela loja.
5. **Passo "Revisão" sem informação nova.** Quinto passo que apenas reapresenta o que foi digitado
   (`features/checkout/ui/ReviewStep.tsx:22-92`).
6. **Recálculo server-side descarta o `unit_price` do cliente.** `mercado-pago/index.ts:110-125` faz
   `priceById.get(i.product_id) ?? Number(i.unit_price)` a partir de `products.base_price` — correto
   como antifraude (PAY-03), mas significa que **qualquer desconto de item calculado no cliente é
   exibido e não cobrado**. É por isso que o preço do order bump precisa ser server-side (BMP-04).

## Infra que já existe e será reaproveitada

| Recurso | Situação |
| ------- | -------- |
| `melhor-envio?action=quote` | Retorna `company`, `name`, `price`, `delivery_time`, `delivery_range` — pronto |
| `order_status_history` | Existe (será a fonte da timeline de eventos na `09`) |
| `orders.shipping_carrier` / `tracking_code` / `melhor_envio_*` | Colunas já criadas |
| `customers.cpf` | Coluna já existe |
| `store_settings.payment` | `pix_enabled`, `pix_discount_percent`, `card_enabled`, `max_installments`, `min_installment_value` |
| `store_settings.shipping` | `free_shipping_threshold`, `default_shipping_cost`, `origin_zip` — falta `handling_days` |
| Motor de pagamento da `02` | Webhook assinado, mapa de transições, idempotência, `apply_payment_approval`, Realtime, Brick de cartão, desconto PIX |

## Referências consultadas

- [Nuvemshop — checkout transparente](https://www.nuvemshop.com.br/funcionalidades/checkout-transparente)
- [Shopify — one-page checkout](https://www.shopify.com/enterprise/blog/one-page-checkout)
- [One-page vs multi-step: quando cada um ganha](https://cartylabs.com/blog/one-page-vs-multi-step-checkout/)
- [Cartpanda — Order Bump](https://cartpanda.com/checkout/order-bump)
- [Mercado Pago — integrar PIX (`payer.identification`)](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix)
