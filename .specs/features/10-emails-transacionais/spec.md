# E-mails transacionais via API do Resend

**Criada:** 2026-07-30
**Escopo:** Large
**Antecessora:** `09-checkout-orders-api` (herda `Deps`/AD-004, a RPC `apply_payment_approval` e o
booleano `applied` como sinal de exatamente-uma-vez)
**Épico de origem:** E5 em `.specs/project/PRD-REVISAO.md:217-219` (P0)

## Problem Statement

O Resend já está no projeto, mas **só como relay SMTP do Supabase Auth**
(`supabase/config.toml:203-216`): quem envia é o GoTrue, e a única coisa que sai são os códigos de
login e de reset. **Não existe nenhuma chamada nossa à API do Resend** — zero `api.resend.com`, zero
e-mail transacional. Consequências medidas hoje:

- Quem paga por PIX e fecha a aba **não tem nenhum registro** da compra fora do banco. A tela de
  confirmação é a única prova, e ela mora numa rota que exige sessão.
- O admin marca um pedido como enviado e **o cliente não é avisado** — o código de rastreio fica só
  no backoffice.
- A loja foi obrigada a *não prometer* e-mail: `apps/store/src/pages/__tests__/OrderConfirmationPage.test.tsx:185-190`
  é um teste que **assegura a ausência** da promessa, e `08-checkout-one-page/spec.md:66` registra o
  débito.

Dois bloqueios técnicos concretos, que definem o formato da solução:

1. `RESEND_API_KEY` **não está** em `[edge_runtime.secrets]` (`config.toml:379-385`) — nenhuma edge
   function consegue ler a chave hoje.
2. `packages/core/src/formatters.ts:1` importa `date-fns` por **especificador nu**. Sem
   `deno.json`/import map no repo, `formatPrice` é inalcançável de dentro de uma edge function.

## Goals

- [ ] Três e-mails saindo de verdade: `order_received` (PIX criado), `order_paid` (pagamento
      aprovado), `order_shipped` (enviado com rastreio).
- [ ] **Nenhum e-mail duplicado**, sob duplo-clique no CTA, retentativa de PIX ou webhook reentregue.
- [ ] **Nenhum e-mail mentiroso**: o servidor relê o pedido e confere que o estado casa com o tipo.
- [ ] Falha de e-mail **nunca** altera a resposta do pagamento.
- [ ] Remetente configurável por env, e o feature **testável ponta-a-ponta em dev** sem verificar
      domínio no Resend.

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| E-mail de pagamento **recusado** | A loja já mostra `friendlyMessage` na tela com a cliente presente, e `rejected` é retentável (`RETRYABLE_STATUSES`). "Seu pagamento falhou" chegando depois de uma retentativa bem-sucedida é ticket de suporte autoinfligido. |
| Link de rastreio da transportadora | `shipping_carrier` é texto livre de um `<Input>` (`OrderDetailDialog.tsx:221`) ou o `service` do Melhor Envio (que devolve "PAC", não transportadora). Mapear texto livre para URL produz link errado. O código vai como **texto selecionável**. |
| QR / copia-e-cola do PIX dentro do e-mail | RTY-01 cancela a order anterior na retentativa (`handlers.ts:418-420`), então o código nasce vencido; e o Gmail remove `data:` URI em `<img>`. `order_received` é **recibo**, não canal de pagamento. |
| Fila de retentativa / reconciliação de linhas `pending` | Linha `failed` + linha de log greppável é toda a história de recuperação da v1. Reenvio é ação manual de admin. |
| `List-Unsubscribe` / opt-out | E-mail transacional é isento das regras de remetente em massa. Não adicionar link de descadastro em recibo de pagamento. |
| Newsletter, carrinho abandonado (E15/E18 do PRD) | Features próprias. `abandoned_carts` nem tem migration no repo. |
| Corrigir o status `'separating'` ilegal | Bug pré-existente descoberto durante o desenho (ver *Achados fora de escopo*). Vai para `docs/qa/bugs/`. |
| Migrar os e-mails de **auth** para a API HTTP | O SMTP do GoTrue funciona e é configuração versionada. Fora do caminho. |

---

## Assumptions & Open Questions

| Assumption / decisão | Default escolhido | Rationale | Confirmado? |
| -------------------- | ----------------- | --------- | ----------- |
| Endpoint e corpo do Resend | `POST https://api.resend.com/emails`; obrigatórios `from`, `to` (máx 50), `subject`; `html`/`text` opcionais individualmente | Lido na referência oficial em 2026-07-30 | **y** — doc |
| Código HTTP de sucesso | **Não documentado na página.** Aceitar **qualquer 2xx**, nunca `=== 200` | A página mostra o corpo `{ "id": "…" }` mas omite o status. Assumir 200 é uma aposta que quebra silenciosamente se for 201 | **declarado** — verificar no T11 |
| Shape JSON do erro | **Não documentada.** Ler `name` defensivamente, tolerar ausência | A página de erros lista status + `name` + mensagem, mas não a estrutura do JSON | **declarado** — verificar no T11 |
| Limite de taxa | **10 req/s por team** (padrão) | Página de introdução da API | **y** — doc |
| Restrição de destinatário em sandbox | `onboarding@resend.dev` → **403 `validation_error`**, *"You can only send testing emails to your own email address"* | Página de erros, verbatim. É o que `BUG-20260728` já registrou pelo lado do SMTP | **y** — doc |
| O "2/hora" do `config.toml:160-164` limita este feature | **NÃO.** É `[auth.rate_limit].email_sent`, limitador do **GoTrue**; chamada HTTP direta não passa por ele | Distinção lida no config e confirmada pela doc do Resend | **y** |
| `Idempotency-Key` é suportado neste endpoint | Sim — 1–256 chars, TTL 24h; 409 `invalid_idempotent_request` / `concurrent_idempotent_requests` | Referência do endpoint + página de erros | **y** — doc |
| `orders.customer_email` é sempre preenchido | Sim, `NOT NULL` desde `20260415090935:7,34` | Snapshot escrito no insert do pedido | **y** |
| `apply_payment_approval` **não** toca `orders.status` | Correto — escreve `payment_status`, `paid_at`, `mp_payment_id`, `mp_status_detail` | `20260718235214:24-32`, já anotado em `useOrder.ts:8-9`. Por isso `order_paid` usa `paid_at` | **y** |

**Open questions:** nenhuma. As duas lacunas de documentação do Resend (status de sucesso, shape do
erro) estão **declaradas como assumption** e têm verificação designada no T11 — não são incógnitas
silenciosas.

---

## User Stories

### P1: `order_paid` — a compra deixa rastro fora do banco ⭐ MVP

**User Story**: Como cliente que acabou de pagar, quero receber um e-mail com o meu pedido, para ter
prova da compra mesmo depois de fechar a aba.

**Why P1**: É o slice vertical — cobre a function, a idempotência, os templates e o gatilho de
pagamento. Os outros dois e-mails são variações de tipo sobre a mesma máquina.

**Acceptance Criteria**

Contrato e autorização da function:

1. **EML-01** — WHEN a function recebe `POST ?action=send` THEN ela SHALL aceitar **somente**
   `{ type, order_id }` do corpo, e SHALL ignorar qualquer `to`, `subject`, `html` ou `from`
   enviados pelo chamador. O destinatário SHALL vir de `orders.customer_email` lido com a chave
   service-role.
2. **EML-02** — A ordem de avaliação SHALL ser: **(a)** `OPTIONS` → CORS; **(b)** autorização;
   **(c)** validação de payload; **(d)** existência do pedido; **(e)** pré-condição de estado.
   WHEN duas condições de falha se aplicam THEN o SHALL vencer a que vem primeiro nessa ordem — um
   `type` inválido enviado por chamador não-admin responde **403**, não 400.
3. **EML-03** — WHEN o header `Authorization` está ausente, ou é a anon key, ou é um JWT que
   `getUser` rejeita THEN a function SHALL responder **401** `{ error }` e SHALL fazer **zero**
   chamadas ao Resend.
4. **EML-04** — WHEN o JWT é de usuário válido mas `has_role(uid,'admin')` é falso THEN a function
   SHALL responder **403** `{ error }` e SHALL fazer **zero** chamadas ao Resend.
5. **EML-05** — WHEN `type` não está em `{order_received, order_paid, order_shipped}` THEN a function
   SHALL responder **400** `{ error }`, **antes** de qualquer leitura no banco, com **zero**
   chamadas ao Resend e **zero** RPCs.
6. **EML-06** — WHEN `order_id` está ausente ou não casa com o formato uuid THEN a function SHALL
   responder **400** `{ error }` com zero chamadas ao Resend.
7. **EML-07** — WHEN `order_id` não existe em `orders` THEN a function SHALL responder **404**
   `{ error }` com zero chamadas ao Resend.
8. **EML-08** — WHEN `req.method === 'OPTIONS'` THEN a function SHALL responder **200** com
   `Access-Control-Allow-Origin: *`, sem tocar em nenhuma action.

Validação de estado (dirigida pelo banco, não pelo chamador):

9. **EML-09** — A function SHALL reler o pedido e SHALL exigir, por tipo:
   | `type` | pré-condição |
   | --- | --- |
   | `order_received` | `payment_status = 'pending'` **e** `mp_order_id IS NOT NULL` |
   | `order_paid` | **`paid_at IS NOT NULL`** |
   | `order_shipped` | `status = 'shipped'` **e** `coalesce(tracking_code,'') <> ''` |
10. **EML-10** — WHEN a pré-condição falha THEN a function SHALL responder **422** `{ error }`, SHALL
    **não** criar nem alterar linha em `order_emails` (a tentativa segue retentável) e SHALL fazer
    **zero** chamadas ao Resend.

Idempotência:

11. **IDM-01** — `order_emails` SHALL ter índice único **não parcial** sobre `(order_id, type)`.
12. **IDM-02** — WHEN `claim_order_email(order_id, type)` é chamada e não existe linha `sent` para o
    par THEN ela SHALL devolver o `id` da linha reivindicada, com `status = 'pending'`.
13. **IDM-03** — WHEN já existe linha com `status = 'sent'` para o par THEN `claim_order_email` SHALL
    devolver **zero linhas** (`null`), e a function SHALL responder **200**
    `{ sent: false, skipped: 'already_sent' }` com **zero** chamadas ao Resend.
14. **IDM-04** — WHEN a linha existente está em `failed` THEN `claim_order_email` SHALL reivindicá-la
    de novo, devolvendo o `id` e SHALL incrementar `attempts`.
15. **IDM-05** — `claim_order_email` e `finish_order_email` SHALL ser `security definer` com
    `execute` **revogado** de `public`/`anon`/`authenticated` e concedido **só** a `service_role`.
16. **IDM-06** — `order_emails` SHALL ter RLS habilitada, **nenhuma** política de escrita, e leitura
    apenas para admin via `has_role`. Um `select` como `anon` SHALL devolver 0 linhas.
17. **IDM-07** — A chamada ao Resend SHALL enviar o header
    `Idempotency-Key: order-email:<order_id>:<type>`.

Envio e resultado:

18. **EML-11** — WHEN o Resend responde **qualquer 2xx** THEN a function SHALL persistir
    `status = 'sent'`, `sent_at` e `provider_message_id` igual ao `id` do corpo, e SHALL responder
    **200** `{ sent: true, id }`.
19. **EML-12** — WHEN o Resend responde não-2xx ou a chamada falha na rede THEN a function SHALL
    persistir `status = 'failed'` com `error`, e SHALL responder **200**
    `{ sent: false, reason: <slug> }`. O status HTTP da *nossa* resposta é 200 porque a requisição do
    chamador foi bem-formada; o fracasso do provedor vai no corpo e no log.
20. **EML-13** — A function SHALL registrar uma linha de log JSON por evento com
    `{ action: "send-email", order_id, type, status }` e SHALL **nunca** registrar o endereço do
    destinatário nem o corpo cru do erro do Resend (a mensagem de 403 ecoa o e-mail do destinatário).

Mapeamento de erro do provedor (cada um com seu slug distinto — L-006):

21. **RSD-01** — `403` → `resend_forbidden`; `422` → `resend_invalid`; `401` →
    `resend_unauthorized`; `429` com `name = rate_limit_exceeded` → `resend_rate_limited`; `429` com
    `daily_quota_exceeded`/`monthly_quota_exceeded` → `resend_quota_exceeded`; `409` →
    `resend_duplicate`; `5xx` ou erro de rede → `resend_unavailable`.
22. **RSD-02** — A function SHALL **não** retentar em nenhum desses casos dentro da mesma requisição.

Templates (funções puras):

23. **TPL-01** — Cada render SHALL devolver `{ subject, html, text }`, com `text` não vazio.
24. **TPL-02** — O `html` SHALL conter **zero** `<link>`, `@font-face`, `<style>` e
    `background-image`, e todo estilo SHALL ser atributo `style=` inline.
25. **TPL-03** — Valores vindos de dados (`customer_name`, `product_name`, `tracking_code`) SHALL ser
    escapados: um produto chamado `Naruto <3 & cia` SHALL aparecer como `Naruto &lt;3 &amp; cia` e
    SHALL **não** introduzir tag nova no HTML.
26. **TPL-04** — Todo valor monetário SHALL ser formatado por `formatPrice` de `@nanapin/core` — a
    **mesma** função que o checkout usa, não uma cópia (L-007).
27. **TPL-05** — O `text` SHALL conter o `order_number` e o total formatado.
28. **TPL-06** — O CTA SHALL apontar para `<STORE_PUBLIC_URL>/conta` (não `/pedido/:id`, que exige
    sessão), e `STORE_PUBLIC_URL` com e sem barra final SHALL produzir href **idêntico**. O alvo de
    toque SHALL ter altura ≥ 44px.
29. **TPL-07** — O e-mail SHALL ser autossuficiente: `order_number`, linhas de item
    (`product_name`, `size`, `finish`, `quantity`, `unit_price`), subtotal, frete, descontos, total e
    endereço SHALL estar no corpo, sem depender do link.
30. **TPL-08** — O `html` SHALL usar a paleta Nanita de `supabase/templates/magic_link.html`
    (`#2B1622`, `#FF86B5`, `#B0176B`, `#7A5C6B`, `#FFEFF6`, `#FFD7E7`), o wordmark e o rodapé.

Gatilho de pagamento:

31. **TRG-01** — WHEN o webhook aplica uma aprovação (`target === 'approved'` **e** `applied === true`)
    THEN SHALL disparar `order_paid` exatamente uma vez.
32. **TRG-02** — WHEN `applied === false` (webhook duplicado, RPC no-op) THEN SHALL disparar
    **zero** e-mails.
33. **TRG-03** — WHEN a transição é não-aprovação (`refunded`, `expired`, `cancelled`) — casos em que
    `applied` também vira `true` — THEN SHALL disparar **zero** e-mails.
34. **TRG-04** — WHEN o cartão é aprovado de forma síncrona em `create-payment` THEN SHALL disparar
    `order_paid` exatamente uma vez, e **zero** `order_received`.
35. **TRG-05** — WHEN o cartão é recusado THEN SHALL disparar zero e-mails.
36. **TRG-06** — WHEN `sendOrderEmail` lança, estoura o timeout, ou o Resend cai THEN a resposta do
    pagamento SHALL ser **byte-idêntica** à baseline sem e-mail: PIX segue **200** com `qr_code`,
    webhook segue **200** `{ received: true }`.
37. **TRG-07** — A chamada de e-mail SHALL ser limitada por `AbortController` explícito, com budget
    **2500ms** a partir de `create-payment` (caminho com cliente esperando, teto de 15s no front) e
    **8000ms** a partir do `webhook`.

---

### P2: `order_received` — o PIX pendente deixa de ser invisível

**User Story**: Como cliente que gerou um PIX e saiu da tela, quero um e-mail confirmando que meu
pedido está reservado, para saber que não perdi a compra.

**Acceptance Criteria**

38. **TRG-08** — WHEN `method === 'pix'`, `syncStatus === 'pending'` **e** `qr_code` não é vazio
    THEN SHALL disparar `order_received` exatamente uma vez.
39. **TRG-09** — WHEN `qr_code` é vazio (o MP não devolveu QR) THEN SHALL disparar **zero** e-mails —
    prometer "seu PIX está pronto" sem QR é mentira.
40. **TRG-10** — WHEN o mesmo pedido gera um segundo PIX (retentativa RTY-01, que cria order nova no
    MP contra o **mesmo** `orders.id`) THEN SHALL disparar **zero** e-mails novos, porque
    `(order_id, 'order_received')` já foi reivindicado.
41. **TRG-11** — O e-mail `order_received` SHALL informar a janela de 30 minutos e SHALL **não**
    conter código PIX nem QR.

---

### P3: `order_shipped` — o cliente sabe que saiu, e com qual código

**User Story**: Como cliente, quero ser avisado quando meu pedido é postado, com o código de
rastreio, para poder acompanhar.

**Acceptance Criteria**

42. **TRG-12** — `status` e `tracking_code` são escritos por **caminhos diferentes e independentes**
    (`updateStatus` escreve status; `addTrackingCode` e a `melhor-envio` escrevem rastreio), em abas
    diferentes do dialog. Portanto **os dois** escritores SHALL tentar o envio depois de uma escrita
    bem-sucedida, e o e-mail SHALL sair de quem **completar o par** — em qualquer ordem.
43. **TRG-13** — WHEN o par está incompleto THEN a tentativa SHALL receber **422** e o backoffice
    SHALL tratá-lo como esperado: **nenhum** toast de erro.
44. **TRG-14** — WHEN o par já estava completo e o e-mail já saiu THEN a segunda tentativa SHALL ser
    no-op via `already_sent`, sem chamada ao Resend.
45. **UX-01** — WHEN o admin marca `shipped` sem código de rastreio THEN a UI SHALL exibir dica
    inline explicando que o e-mail só sai quando o código for salvo, e SHALL **não** bloquear o save.
46. **UX-02** — `updateStatus` hoje **descarta o erro** (`OrderDetailDialog.tsx:64-70`: o dialog
    fecha e o admin acha que salvou). Ele SHALL passar a surfaçar falha com `toast.error`, e SHALL
    exibir `toast.success('Cliente avisado por e-mail')` **somente** quando a resposta traz
    `sent: true`.

---

### P4: Configuração e honestidade da loja

**Acceptance Criteria**

47. **CFG-01** — `[edge_runtime.secrets]` SHALL declarar `RESEND_API_KEY`, `RESEND_FROM`,
    `STORE_PUBLIC_URL` e `RESEND_DEV_REDIRECT_TO`, resolvidos por `env()` do `.env` da raiz.
48. **CFG-02** — `[functions.send-email]` SHALL ter `verify_jwt = false`, com comentário registrando
    que `true` seria teatro de segurança (a anon key pública **é** um JWT válido e passaria) e que a
    autorização é manual e exige papel admin.
49. **CFG-03** — `RESEND_FROM` SHALL ter default `NanaPin <onboarding@resend.dev>` e SHALL ter o
    formato validado na camada pura: um `from` malformado é **422 em todos os e-mails**, ou seja
    apagão silencioso.
50. **CFG-04** — WHEN `RESEND_DEV_REDIRECT_TO` está definida THEN o destinatário SHALL ser substituído
    por ela e o assunto SHALL ser prefixado com o destinatário real; WHEN está vazia/ausente THEN o
    comportamento SHALL ser inalterado.
51. **CFG-05** — `STORE_PUBLIC_URL` SHALL ser a origem **da loja**, e o `.env.example` SHALL dizer
    isso explicitamente — toda outra env de URL do repo aponta para o Supabase.
52. **STO-01** — `OrderConfirmationPage` SHALL passar a mencionar o e-mail, diferenciado por
    `paid_at`: pago → informa que o comprovante foi enviado para o endereço; pendente → informa que
    o aviso vem quando o pagamento cair. A variante pendente SHALL **não** alegar comprovante
    enviado.

---

## Edge Cases

| Caso | Comportamento esperado | AC |
| ---- | ---------------------- | -- |
| Dois `create-payment` concorrentes (duplo toque) | Um e-mail. O `claim` é atômico: o segundo recebe `null`. | IDM-03 |
| Webhook reentregue pelo MP | Um e-mail. `applied === false` no segundo. | TRG-02 |
| PIX expira e a cliente refaz 3h depois | **Nenhum** e-mail novo. Aceito de propósito: o e-mail não carrega código de pagamento, então reenviar não agrega. | TRG-10 |
| Cartão aprovado *e* webhook do mesmo cartão | Um e-mail. Três travas: `paid_at IS NULL` na RPC, `applied`, `claim`. | TRG-01, TRG-04 |
| Resend fora do ar no meio do checkout | PIX responde 200 com QR; linha `failed`; log `resend_unavailable`. | TRG-06, RSD-01 |
| Chave do Resend inválida | Idem, `resend_unauthorized`. Pagamento intacto. | TRG-06 |
| Admin marca `shipped`, depois salva rastreio | E-mail sai na **segunda** ação. | TRG-12 |
| Admin salva rastreio, depois marca `shipped` | E-mail sai na **segunda** ação. | TRG-12 |
| Melhor Envio grava o rastreio e o admin marca `shipped` | E-mail sai no `updateStatus`. | TRG-12 |
| Produto chamado `Naruto <3` | Escapado, sem tag nova. | TPL-03 |
| `STORE_PUBLIC_URL` com barra final | href idêntico ao sem barra. | TPL-06 |
| E-mail aberto em webview sem sessão | CTA cai em `/conta` (com overlay de login), nunca em "Pedido não encontrado". | TPL-06 |
| Resend responde 201 em vez de 200 | Tratado como sucesso. | EML-11 |

---

## Success Criteria

- [ ] As 52 ACs rastreadas por `file:line` + expressão de asserção.
- [ ] Gate `pnpm turbo run test` verde, sem redução de contagem em nenhum pacote
      (baseline da 09: functions 81 · core 303 · backoffice 62 · store 372 = **818**).
- [ ] `deno check supabase/functions/send-email/index.ts` exit 0.
- [ ] Worker sobe depois de `supabase stop && supabase start` — o alarme de `503 Module not found`
      (`handlers.ts:127-132`) é o risco conhecido de arquivo importado novo.
- [ ] Roteiro manual do T11 executado: as duas lacunas de doc do Resend (status de sucesso, shape do
      erro) **medidas** e registradas em `validation.md`.
- [ ] Fronteira: nenhuma mudança em `pricing.ts`, `payer.ts`, `webhookSignature.ts`, Bricks, ou na
      aritmética de `calculateOrderTotals`.

## Achados fora de escopo (registrar, não consertar)

**`'separating'` é um status ilegal.** `useAdminOrders.ts:5` oferece `'separating'` no dropdown, mas
o CHECK do banco é `status IN ('pending','paid','shipped','delivered','cancelled')`
(`20260414121021:88`, nunca alterado por nenhuma migration). Selecionar "Em Separação" viola a
constraint, e o erro é **engolido** em `OrderDetailDialog.tsx:64-70`. A UX-02 desta feature conserta
o engolir do erro, o que **expõe** o bug — daí o registro em `docs/qa/bugs/`, não o conserto aqui.
