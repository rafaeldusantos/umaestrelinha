# Checkout Mercado Pago (Bricks) — Context

**Gathered:** 2026-07-18
**Spec:** `.specs/features/02-checkout-mercado-pago/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Substituir o passo de pagamento mock do checkout da loja por pagamento real via **Mercado Pago
Checkout Bricks** (PIX + cartão de crédito, transparente — cliente não sai da loja), com backend
em edge function Supabase (`create-payment` + webhook idempotente), fluxo de pedido
`pending → approved/rejected/refunded/expired` e reflexo do status no backoffice.
Decisão de build vs. buy já tomada e documentada no plano aprovado
(`C:\Users\rafael.santos\.claude\plans\estou-desenvolvendo-essa-loja-golden-cloud.md`).

---

## Implementation Decisions

### Espera do PIX
- **Tela ao vivo**: após gerar o QR, a tela permanece aberta e transiciona sozinha para sucesso
  quando o webhook aprovar — via Supabase Realtime na linha do pedido (`orders`).
- QR real: `qr_code` (copia-e-cola) da API do MP + imagem gerada no front.

### Expiração do PIX
- QR expira em **30 minutos** (`date_of_expiration`).
- Pedido permanece `pending`; o cliente pode **gerar um novo QR** para o mesmo pedido.
- Pedidos `pending` com mais de **24h** são marcados `expired` (mecanismo definido no design).

### Cartão recusado
- Cliente **permanece na tela de pagamento** com motivo amigável da recusa
  (mapeamento de `status_detail` do MP).
- Pode **retentar no mesmo pedido**: outro cartão ou trocar para PIX.
- **Carrinho só é limpo após aprovação** (hoje limpa na criação do pedido — muda).

### Estoque
- **Baixa somente na aprovação** (efeito do webhook `approved`), uma única vez (idempotente).
- Disponibilidade é validada na criação do pedido (não bloqueia race curta — risco aceito).
- Pedido nunca pago não segura estoque. Floor 0 na baixa; discrepâncias aparecem no painel de
  alertas já existente (estoque crítico).

### Desconto PIX
- **Real e configurável**: aplicar `pix_discount_percent` de `store_settings` (infra já existe:
  `PaymentSettings` em `packages/supabase/src/types/settings.ts` + `usePaymentSettings()` em
  `@nanapin/core`). Default 5%, pode zerar.
- Base de cálculo: sobre `(subtotal − desconto de cupom)`; **frete fora** (assumption registrada
  na spec).

### Estorno
- **Escopo mínimo**: admin estorna pelo painel do Mercado Pago; nosso webhook detecta
  e marca o pedido como `refunded`, visível no backoffice. Sem botão de estorno na UI nesta fase.

### Agent's Discretion
- Mecanismo do expirador de 24h (pg_cron vs. verificação lazy) — decidir no design.
- Mapeamento exato de `status_detail` → mensagens amigáveis.
- Detalhes de UI dos Bricks (tema/estilo para casar com o design system `nana-*`).

### Declined / Undiscussed Gray Areas → Assumptions
Nenhuma área foi recusada — todas as 5 foram discutidas. Assumptions derivadas (base do desconto
PIX, limite de tentativas, e-mail transacional, guest checkout) estão na seção
Assumptions & Open Questions da spec.

---

## Specific References

- Mock atual a substituir: `apps/store/src/features/checkout/ui/PaymentStep.tsx` (coleta PAN/CVV
  em estado React — deve desaparecer por completo; PCI SAQ-A exige tokenização client-side do MP).
- Molde de edge function: `supabase/functions/melhor-envio/index.ts` (padrão action-based,
  service role, env secrets).
- Fluxo do pedido hoje: `apps/store/src/pages/CheckoutPage.tsx` cria pedido e limpa carrinho sem
  pagamento — será invertido.

---

## Deferred Ideas

- Botão "Estornar" no detalhe do pedido do backoffice (refund via API) — fase futura.
- E-mails transacionais (confirmação de pedido/pagamento) — não existe infra de e-mail hoje.
- Order bump / one-click upsell / recuperação avançada de carrinho — reavaliar quando conversão
  virar prioridade (nota do discovery).
