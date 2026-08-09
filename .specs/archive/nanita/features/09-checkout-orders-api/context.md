# 09-checkout-orders-api — Context

**Gathered:** 2026-07-28
**Spec:** `.specs/features/09-checkout-orders-api/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Trocar a API do Mercado Pago dentro de `supabase/functions/mercado-pago/index.ts` e de
`mapMpStatus` (`packages/core/src/payment/status.ts`), mais uma migration que adiciona
`orders.mp_order_id`. Herda da `08-checkout-one-page` a validação **runtime** pendente de PGD-04 e
BMP-04, para que o roteiro manual de 5 cenários em sandbox rode **uma única vez**, já na API nova.

Explicitamente fora: `pricing.ts`, `payer.ts`, Bricks/`CardPaymentBrick`, RPC
`apply_payment_approval`, schema restante e toda a UI do checkout.

> **Correção pós-T16:** `webhookSignature.ts` **saiu** da lista de "fora". A premissa que o colocava
> lá ("o manifest do Orders é idêntico") foi refutada em sandbox — 8/8 notificações reais em 401
> porque o `data.id` do tópico `order` é maiúsculo e o lowercase do template quebra o HMAC (D2). A
> mudança é aditiva (`buildManifestCandidates`); `buildManifest` segue intacto. Registrada na spec,
> em *Out of Scope* e em *Success Criteria*.

---

## Implementation Decisions

### Cartão que volta em `action_required` (3DS/challenge)

- `action_required` + `status_detail = waiting_transfer` → `pending`. É o PIX aguardando pagamento,
  caminho feliz.
- `action_required` com qualquer outro `status_detail`, em cartão → **tratado como recusa**:
  `payment_status = 'rejected'` e mensagem na tela instruindo trocar de cartão ou pagar com PIX.
- Racional: a loja não tem UI de desafio 3DS. Mapear para `pending` deixaria a cliente presa num
  pedido que só resolve quando o expirador de 24h passa — pior que uma recusa honesta. Como PAY-02
  permite repagar pedido `rejected`, ela continua no fluxo.
- Custo aceito e consciente: cartões que exigem 3DS não convertem no cartão. O PIX absorve.
- Implementar o challenge de verdade é **feature futura** (ver Deferred Ideas).

### Ids do Orders no banco

- Migration adiciona `mp_order_id text` **com índice** — é a chave do `GET /v1/orders/{id}` e o
  `data.id` que chega no webhook.
- `mp_payment_id` passa a guardar o id do payment interno. Formato **real medido em T16**:
  `PAY01KYMB0S2C8YD1XN4Q1BHXKGNK` — não `pay_01J…` como a spec supunha. A order é `ORDTST01K…`.
- Racional: o Orders tem dois ULIDs distintos e ambos têm uso real — a order para consultar e casar
  webhook, o payment para achar a transação no painel do MP e em conversa de suporte. Uma coluna
  nullable é preço baixo por isso.
- A RPC `apply_payment_approval(p_order_id, p_mp_payment_id, p_status_detail)` **não muda de
  assinatura**: continua recebendo o id do payment.
- Escolha limpa porque não há dado legado (ver abaixo) — nenhuma linha mistura formatos.

### Retentativa de pagamento

- Antes de criar a order nova, **cancelar a anterior** no MP (quando o pedido já tem `mp_order_id` e
  o `payment_status` está em `pending`/`rejected`/`expired`).
- Se o cancel falhar por qualquer motivo (não-2xx ou rede): **logar e prosseguir** criando a nova. A
  retentativa da cliente nunca é bloqueada por falha de limpeza.
- O guard reativo do webhook (segundo `approved` de outra order → registra e não reaplica efeitos)
  **permanece** como rede de segurança, agora em nível de order.
- Racional: fecha na origem a janela de "dois PIX pagáveis para o mesmo pedido", que hoje só tem
  tratamento reativo. É um ganho que a Payments API não permitia — o cancel é novo no Orders.

### Ausência de dados legados (fechada pelo usuário)

- Declaração do usuário: *"Não temos nada da API antiga, essa implementação é nova."*
- Consequência direta: **corte seco** para `type === "order"` no webhook. Sem handler dual-topic, sem
  janela de transição, sem migração de dados. Webhook com `type: "payment"` responde
  `{ received: true }` e não faz nada.
- Isso também removeu a restrição que empurraria a decisão de coluna para "preservar legibilidade de
  linhas antigas".

### Agent's Discretion

Nada foi delegado como "você decide" — as três gray areas apresentadas foram decididas
explicitamente, e a quarta foi fechada pela declaração do usuário sobre dados legados.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma gray area foi declinada. As incertezas remanescentes são **técnicas**, não de produto, e
estão registradas na tabela *Assumptions & Open Questions* da spec:

- Enum exato de `status` de order **online** (a lista pública encontrada é da doc do **Point** e
  inclui `at_terminal`, que não se aplica) → confirmar na implementação; `mapMpStatus` devolve `null`
  para desconhecido, então errar por omissão é seguro.
- Preservação da família `cc_rejected_*` em `status_detail` → confirmar no cenário de cartão recusado
  do sandbox.

---

## Specific References

Confirmado em pesquisa na doc oficial do MP (Knowledge Verification Chain, Step 4), e o que cada
achado implica:

- `payer` fica na **raiz da order**, com `email` / `first_name` / `last_name` /
  `identification { type, number }` — exatamente a forma que `buildPayer` já devolve. Por isso
  `payer.ts` entra na lista de "não muda" e PGD-04 se preserva por construção.
- `total_amount` e `transactions.payments[].amount` são **string** (`"200.00"`), não número. É a
  pegadinha mais provável da migração.
- `expiration_time` é **duração ISO-8601** na raiz da order (`"PT30M"`) — o que permite **apagar** o
  `pixExpirationISO`, a função que hoje monta timestamp com offset `-03:00` explícito
  (`index.ts:49-57`). Ganho líquido de simplicidade.
  > ⚠️ **PARCIALMENTE REFUTADO em T16.** O campo é aceito, mas o MP **ecoa a duração** em vez de
  > resolvê-la, e a expiração real da order saiu em **+24h** — ou seja, `"PT30M"` na raiz não foi
  > aplicado ao PIX. O `pixExpirationISO` foi apagado, mas voltou como `pixExpiresAt(now)` (puro,
  > relógio injetado) só para a tela ter um instante parseável. Onde a janela do PIX realmente se
  > configura segue **aberto** — é a metade pendente de D5.
- QR do PIX em `transactions.payments[0].payment_method.{ qr_code, qr_code_base64, ticket_url }`.
- O manifest da assinatura de webhook é **o mesmo** (`id:...;request-id:...;ts:...;` + HMAC-SHA256
  hex) — `webhookSignature.ts` sobrevive intacto, e com ele PAY-05.
  > ❌ **REFUTADO em T16 — foi o erro de premissa mais caro desta feature.** O *template* é o mesmo,
  > mas o `data.id` do tópico `order` é **maiúsculo** (`ORDTST01K…`) e `buildManifest` o passava por
  > `toLowerCase()` — inofensivo quando o id era numérico, fatal quando é alfanumérico. Resultado
  > medido: **8 de 8** notificações reais do MP rejeitadas com 401, enquanto um request que nós
  > mesmos assinávamos passava. Foi o que tirou `webhookSignature.ts` da fronteira de "não muda"
  > (correção: `buildManifestCandidates`, aditiva, com `buildManifest` intacto).
- `X-Idempotency-Key` segue sendo o header de idempotência.

Ambiente de sandbox já configurado nesta sessão:

- Usuário de teste `TESTUSER6808293123515525364` (`site_id: MLB`), confirmado via
  `GET /users/me` → `tags` inclui `test_user`. Credencial de usuário de teste tem prefixo
  `APP_USR-`, **não** `TEST-` — o prefixo não indica o modo, só o `/users/me` indica.
- Secrets no `.env` da **raiz**, resolvidos por `[edge_runtime.secrets]` do `supabase/config.toml`.
  Mudança de valor exige `supabase stop && supabase start`.
- Túnel cloudflared ativo, com a URL cadastrada **no painel** da aplicação do MP.
  > ❌ **`MERCADO_PAGO_NOTIFICATION_URL` foi REMOVIDA (D1).** A variável e o override existiram nesta
  > sessão para injetar `notification_url` no corpo, e a Orders API **recusa** essa propriedade
  > (schema fechado: HTTP 400 `additionalProperties '$.notification_url' not allowed`), derrubando
  > todo pagamento. Pior: era **desnecessária** — o T16 mediu que as notificações chegam normalmente
  > pela URL do painel. O destino da notificação passa a viver só lá.
- Painel do MP já configurado como **API de Orders**, o que torna o corte seco não só preferível como
  necessário: com o painel em Orders e o código em `/v1/payments`, nenhum pedido chegaria a
  `approved`.

---

## Deferred Ideas

- **D9 — chip do cupom exibe um centavo a menos que a linha de totais** (medido no T16, cenário 4):
  no resumo do pedido o chip mostra *"Desconto de R$ 0,73"* enquanto a linha logo abaixo mostra
  *"Cupom −R$ 0,74"*, mesma tela e mesmo cupom. **O total cobrado está correto** (`0,74`, via
  `round2`) — é divergência de **formatação no chip**, que arredonda por conta própria em vez de
  reusar o valor já resolvido por `resolveCouponDiscount`. Fica fora da 09 porque é UI da loja
  (`apps/store`), e esta feature é backend/domínio: entrar aí quebraria a fronteira verificável por
  diff. Correção esperada: o chip consumir o mesmo número que a linha de totais, nunca recalcular.
- **UI de challenge 3DS** — converteria os cartões que STA-03 hoje recusa. Feature própria: exige
  tela nova no checkout e um novo estado de pedido ("aguardando desafio").
- **Estorno via Orders** (`refund`) — a API expõe, o produto não tem fluxo. Quando houver política de
  devolução, é onde entra.
- **Webhooks de Reclamações e Contestações** — hoje deliberadamente não marcados no painel por
  ausência de handler. Um chargeback deveria sinalizar o pedido para o admin.
- **Split de meios de pagamento numa mesma order** — o principal atrativo do Orders que esta feature
  não usa. Só faz sentido se a loja passar a aceitar pagamento combinado.
