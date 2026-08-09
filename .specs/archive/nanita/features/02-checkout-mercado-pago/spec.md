# Checkout Mercado Pago (Bricks) Specification

## Problem Statement

O passo de pagamento do checkout é 100% mock: coleta número de cartão/CVV em estado React
(violação PCI se fosse real), exibe um PIX hardcoded e cria pedidos sem nenhum pagamento.
A loja já vende (baixo volume) e precisa de pagamento real. O discovery aprovado decidiu:
construir com **Mercado Pago Checkout Bricks** (transparente, tokenização client-side → PCI SAQ-A),
em vez de terceirizar o checkout.

## Goals

- [ ] Cliente paga PIX ou cartão sem sair da loja, com confirmação real do Mercado Pago.
- [ ] Nenhum dado sensível de cartão (PAN/CVV) trafega para o Supabase — só o token do MP (SAQ-A).
- [ ] Pedido reflete o status real do pagamento (`pending → approved/rejected/refunded/expired`),
      de forma idempotente, inclusive no backoffice.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Boleto e wallet MP (cartões salvos / login MP) | Requisito declarado: só PIX + cartão, transparente |
| Botão "Estornar" no backoffice (refund via API) | Decisão do discuss: estorno pelo painel MP + webhook reflete |
| E-mails transacionais (confirmação de pedido/pagamento) | Sem infra de e-mail hoje; deferred |
| Order bump / upsell / one-click | Otimização de conversão futura (nota do discovery) |
| Guest checkout | Login continua obrigatório (comportamento atual mantido) |
| Antifraude adicional além do Device ID embutido no SDK do MP | Baixo volume; ferramentas nativas do MP bastam nesta fase |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Base do desconto PIX | `pix_discount_percent` sobre `(subtotal − desconto de cupom)`; frete fora | Prática comum; desconto não deve subsidiar frete | y (2026-07-18) |
| Limite de tentativas de pagamento | Sem limite na aplicação | Antifraude do MP governa recusas repetidas; baixo volume | n (default proposto) |
| Mecanismo do expirador de 24h | Decidido no design (pg_cron vs. lazy check) | Detalhe técnico, não comportamental | n (discrição do agente) |
| Copy da tela de sucesso | Remover promessa de "confirmação no e-mail" | Não há envio de e-mail implementado; não prometer o que não existe | n (default proposto) |
| Cupom `freeShipping` + PIX | Desconto PIX aplica normalmente sobre `(subtotal − 0)`, frete já zerado pelo cupom | Regras independentes que compõem | n (default proposto) |
| Moeda/locale | BRL, pt-BR | Loja brasileira | y (implícito) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Pagar com cartão de crédito (Bricks) ⭐ MVP

**User Story**: Como cliente, quero pagar com cartão sem sair da loja para concluir minha compra
com segurança e na hora.

**Why P1**: É o meio de maior ticket e o núcleo do valor da feature (checkout transparente real).

**Acceptance Criteria**:

1. WHEN o cliente chega ao passo Pagamento com `card_enabled=true` THEN o sistema SHALL
   renderizar o CardPayment Brick do Mercado Pago, e nenhum input próprio de PAN/CVV/validade
   SHALL existir no código da loja.
2. WHEN o Brick submete o pagamento THEN o token gerado no browser SHALL ser enviado à edge
   function `mercado-pago` (ação `create-payment`) com o `order_id`, e nenhuma requisição para
   `*.supabase.*` SHALL conter PAN ou CVV.
3. WHEN a edge function cria o pagamento THEN o valor cobrado SHALL ser recalculado no servidor
   a partir do pedido persistido (itens + frete − descontos), ignorando qualquer valor vindo do
   cliente, e o header `X-Idempotency-Key` SHALL ser enviado ao MP.
4. WHEN o pagamento é aprovado THEN o sistema SHALL exibir a tela de sucesso, limpar o carrinho
   e o pedido SHALL ficar `payment_status='approved'` com `paid_at` preenchido.
5. WHEN o pagamento é recusado THEN o sistema SHALL exibir motivo amigável (mapeado de
   `status_detail`), manter o cliente no passo de pagamento com o carrinho intacto, e permitir
   nova tentativa no mesmo pedido (outro cartão ou troca para PIX).
6. WHEN o cliente escolhe parcelamento THEN as opções exibidas SHALL vir do Mercado Pago,
   limitadas por `max_installments` e `min_installment_value` de `store_settings.payment`
   (substituindo o cálculo fixo de 1,99% a.m. do mock).

**Independent Test**: No sandbox do MP, aprovar uma compra com cartão de teste APRO e recusar com
cartão OTHE; verificar tela, `payment_status` e ausência de PAN no tráfego de rede.

---

### P1: Pagar com PIX ⭐ MVP

**User Story**: Como cliente, quero pagar com PIX e ver a confirmação na mesma tela, sem precisar
checar e-mail ou recarregar a página.

**Why P1**: PIX é o meio dominante no e-commerce BR e tem a menor taxa (0,99%).

**Acceptance Criteria**:

1. WHEN o cliente confirma pagamento via PIX THEN o sistema SHALL criar o pagamento na API do MP
   com expiração de 30 minutos (`date_of_expiration`) e exibir o QR code real (imagem gerada a
   partir do `qr_code` copia-e-cola retornado).
2. WHEN `pix_discount_percent > 0` THEN o total SHALL ser reduzido em
   `pix_discount_percent%` sobre `(subtotal − desconto de cupom)` — frete excluído — refletido
   identicamente na UI e no valor cobrado server-side.
3. WHEN o webhook confirma a aprovação THEN a tela aberta SHALL transicionar automaticamente
   para sucesso (sem refresh manual), via Supabase Realtime na linha do pedido.
4. WHEN o QR expira sem pagamento THEN a tela SHALL oferecer "gerar novo código", criando novo
   pagamento PIX para o MESMO pedido (que permanece `pending`).
5. WHEN um pedido fica `pending` por mais de 24h THEN o sistema SHALL marcá-lo
   `payment_status='expired'`.
6. WHEN `pix_enabled=false` nas settings THEN a opção PIX SHALL não ser exibida.

**Independent Test**: No sandbox, gerar QR, simular aprovação e ver a tela transicionar sozinha;
deixar expirar e regenerar o QR no mesmo pedido.

---

### P1: Backend de pagamento confiável (edge function + webhook + schema) ⭐ MVP

**User Story**: Como lojista, quero que o status dos pedidos reflita fielmente o Mercado Pago,
mesmo com webhooks duplicados, fora de ordem ou forjados, para confiar no meu painel.

**Why P1**: Sem isso, os outros P1 não são confiáveis — é a espinha dorsal.

**Acceptance Criteria**:

1. WHEN a migration roda THEN `orders` SHALL ter `payment_status`
   (`pending|approved|rejected|refunded|expired|cancelled`, default `pending`), `mp_payment_id`,
   `mp_status_detail` e `paid_at`.
2. WHEN um webhook chega com assinatura `x-signature` inválida ou ausente THEN a function SHALL
   responder 401 e não alterar nada.
3. WHEN um webhook válido chega THEN a function SHALL consultar o pagamento na API do MP pelo ID
   (nunca confiar no payload) e atualizar `payment_status` conforme o mapa de transições:
   `pending → approved|rejected|cancelled|expired`; `rejected → pending|approved` (nova tentativa);
   `expired → approved` (pagou no limite); `approved → refunded`. Transições fora do mapa SHALL
   ser ignoradas (`approved` nunca regride).
4. WHEN o mesmo webhook é entregue mais de uma vez THEN o estado final e os efeitos colaterais
   SHALL ser idênticos aos de uma única entrega (idempotência).
5. WHEN um pagamento é aprovado THEN o estoque (`stock`) dos itens do pedido SHALL ser
   decrementado exatamente uma vez, com floor 0, e `paid_at` gravado.
6. WHEN a política RLS atual `Allow all` de `orders`/`order_items` for substituída THEN clientes
   autenticados SHALL poder criar pedidos e ler apenas os próprios; alterações de
   `payment_status` SHALL ocorrer somente via service role (edge function).
7. WHEN a API do MP está indisponível na criação do pagamento THEN o sistema SHALL exibir erro
   amigável e o pedido SHALL permanecer `pending`, permitindo retentar.

**Independent Test**: Reenviar o mesmo webhook 3x (estoque baixa 1x); enviar webhook com
assinatura inválida (401, sem alteração); simular refund no painel sandbox e ver `refunded`.

---

### P2: Status de pagamento no backoffice

**User Story**: Como admin, quero ver o status de pagamento de cada pedido na listagem e no
detalhe para operar (produzir/enviar/estornar) com segurança.

**Why P2**: Operacional importante, mas a loja funciona sem isso no primeiro dia.

**Acceptance Criteria**:

1. WHEN a listagem de pedidos carrega THEN cada pedido SHALL exibir badge de `payment_status`
   com cores distintas (pending/approved/rejected/refunded/expired/cancelled).
2. WHEN o admin abre o detalhe do pedido THEN SHALL ver `payment_status`, `mp_payment_id`,
   `mp_status_detail` e `paid_at`.
3. WHEN um estorno é feito no painel do MP THEN o pedido SHALL aparecer como `refunded` no
   backoffice após o webhook (sem ação manual).

**Independent Test**: Aprovar um pedido sandbox e conferir badge; estornar no painel e conferir
`refunded`.

---

### P3: Robustez de expiração visível ao cliente

**User Story**: Como cliente, quero reencontrar um pedido PIX pendente na minha conta e concluir
o pagamento de lá.

**Why P3**: Conveniência; o fluxo principal já cobre regenerar QR na tela aberta.

**Acceptance Criteria**:

1. WHEN o cliente abre um pedido `pending` na área "meus pedidos" THEN SHALL poder gerar novo QR
   PIX de lá.

---

## Edge Cases

- WHEN o cliente fecha a tela do PIX e paga o QR depois (dentro dos 30 min) THEN o webhook SHALL
  aprovar o pedido normalmente e ele SHALL constar como pago na conta do cliente.
- WHEN o webhook `approved` chega antes da resposta síncrona do `create-payment` (corrida) THEN o
  estado final SHALL ser `approved` com efeitos aplicados uma única vez.
- WHEN o estoque disponível é menor que a quantidade vendida no momento da aprovação (janela de
  oversell) THEN a baixa SHALL aplicar floor 0 e o produto SHALL aparecer no alerta de estoque
  crítico existente.
- WHEN `pix_discount_percent = 0` THEN nenhum texto de desconto PIX SHALL aparecer e o total não
  muda entre métodos.
- WHEN o total com desconto PIX resulta em valor < R$ 0,01 THEN a criação de pagamento SHALL ser
  bloqueada com erro claro (pedido inválido).
- WHEN o cliente troca de método após gerar um PIX (vai para cartão) THEN o pagamento PIX anterior
  SHALL ser abandonado sem efeito (expira sozinho) e o cartão SHALL processar normalmente; se o
  PIX antigo for pago mesmo assim, prevalece o primeiro `approved` e o segundo SHALL ser
  sinalizado para atenção do admin (`mp_status_detail`).
- WHEN a edge function falha APÓS criar o pagamento no MP mas antes de gravar `mp_payment_id`
  THEN o webhook subsequente SHALL reconciliar o pedido via `external_reference` (order_id).

---

## Implicit-Requirement Dimensions Sweep (Large)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | PAY-03 (amount server-side), edge case de total mínimo |
| Failure / partial-failure | PAY-09 (MP indisponível), edge case de falha pós-criação (reconciliação via `external_reference`) |
| Idempotency / retry / duplicate | PAY-06 (X-Idempotency-Key), PAY-07 (webhook idempotente), PAY-08 (estoque 1x) |
| Auth boundaries & rate limits | PAY-10 (RLS + service role), assinatura de webhook (PAY-05). Rate limit: N/A because baixo volume + antifraude nativo do MP |
| Concurrency / ordering | Edge cases de corrida webhook×resposta síncrona e PIX pago após troca de método; mapa de transições (PAY-04) |
| Data lifecycle / expiry | PIX 30 min + regenerar; pending > 24h → `expired` (PAY-11) |
| Observability | `mp_status_detail` persistido + logs estruturados na edge function (PAY-12) |
| External-dependency failure | PAY-09; webhook inválido → 401 (PAY-05) |
| State-transition integrity | Mapa explícito de transições, `approved` nunca regride (PAY-04) |

---

## Requirement Traceability

| Requirement ID | Story | O quê | Status |
| -------------- | ----- | ----- | ------ |
| PAY-01 | P1 Cartão | CardPayment Brick, zero PAN/CVV próprio (SAQ-A) | Implementing |
| PAY-02 | P1 Cartão | Recusa → retentativa no mesmo pedido, carrinho intacto | Implementing |
| PAY-03 | P1 Cartão/PIX | Amount recalculado server-side do pedido persistido | Implementing |
| PAY-04 | P1 Backend | Mapa de transições de `payment_status`; approved não regride | Implementing |
| PAY-05 | P1 Backend | Webhook valida `x-signature`; consulta pagamento na API | Implementing |
| PAY-06 | P1 Backend | `X-Idempotency-Key` na criação de pagamento | Implementing |
| PAY-07 | P1 Backend | Webhook idempotente (dupla entrega sem efeito duplo) | Implementing |
| PAY-08 | P1 Backend | Baixa de estoque 1x na aprovação, floor 0 | Implementing |
| PAY-09 | P1 Backend | Falha do MP → erro amigável, pedido segue `pending` | Implementing |
| PAY-10 | P1 Backend | RLS: fim do `Allow all`; updates de pagamento só service role | Implementing |
| PAY-11 | P1 PIX | QR 30 min + regenerar; pending > 24h → expired | Implementing |
| PAY-12 | P1 Backend | `mp_status_detail` persistido + logs na edge function | Implementing |
| PAY-13 | P1 PIX | Tela ao vivo via Realtime (webhook → sucesso sem refresh) | Implementing |
| PAY-14 | P1 PIX | Desconto PIX configurável sobre (subtotal − cupom) | Implementing |
| PAY-15 | P1 Cartão | Parcelamento do MP limitado pelas settings | Implementing |
| PAY-16 | P1 Cartão/PIX | Carrinho limpa só após aprovação; fluxo pending→approved | Implementing |
| PAY-17 | P2 Backoffice | Badge + detalhe de payment_status; refunded via webhook | Implementing |
| PAY-18 | P3 Conta | Regenerar QR de pedido pending em "meus pedidos" | Implementing |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️ (mapeamento na fase Tasks)

---

## Success Criteria

- [ ] Compra sandbox com cartão APRO aprovada end-to-end: tela de sucesso + `approved` no backoffice.
- [ ] Compra sandbox PIX: QR real, aprovação transiciona a tela aberta sem refresh.
- [ ] Inspeção de rede: nenhuma requisição ao Supabase contém PAN/CVV (só token MP).
- [ ] Webhook reenviado 3x: estoque baixa exatamente 1x, estado final idêntico.
- [ ] Webhook com assinatura inválida: 401 e nenhum pedido alterado.
- [ ] Estorno no painel sandbox → pedido `refunded` no backoffice sem ação manual.
