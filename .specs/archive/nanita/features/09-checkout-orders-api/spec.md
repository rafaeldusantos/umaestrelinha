# Checkout — Migração para a API de Orders do Mercado Pago

**Criada:** 2026-07-28
**Escopo:** Large
**Antecessora:** `08-checkout-one-page` (herda a validação runtime pendente de PGD-04 e BMP-04)

## Problem Statement

A edge function `mercado-pago` integra via `POST /v1/payments` — a **API de Pagamentos**, que o painel
do Mercado Pago hoje rotula **"Versão anterior"** enquanto apresenta a **API de Orders** como
*"Recomendado / Mais flexível"* no momento da escolha de integração. A conta de sandbox já foi
configurada como Orders, e o handler atual descarta tudo que não é `type: "payment"`
(`index.ts:415`) — ou seja, painel e código contam histórias diferentes e **nenhum pedido chegaria a
`approved`**.

O momento é o certo porque a integração **nunca foi exercitada**: zero execuções em sandbox. O
artefato caro desta etapa é o roteiro manual de 5 cenários, com humano no meio — não o código.
Validar na API legada agora significaria rodar o sandbox **duas vezes**.

## Goals

- [ ] `create-payment` e `webhook` operando sobre `POST /v1/orders` e `GET /v1/orders/{id}`, com
      painel e código na mesma API.
- [ ] Contrato de resposta ao front **inalterado** (PIX devolve `qr_code`/`qr_code_base64`/
      `expires_at`; cartão devolve `status`/`status_detail`) — zero mudança em `apps/store`.
- [ ] PGD-04 e BMP-04 validados em sandbox **uma única vez**, já na API nova.
- [ ] Janela de "dois PIX pagáveis para o mesmo pedido" fechada proativamente, usando o cancel que a
      Payments API não oferecia.

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| UI de challenge 3DS | Cartão que exige desafio é tratado como recusa (STA-03). Converter esses cartões exige tela nova no checkout — feature própria. |
| Refund / estorno via Orders | Não existe fluxo de estorno no produto hoje; a API expõe, mas ninguém consome. |
| Múltiplas transações por order (split de meios) | Não é caso de uso da loja — é o principal atrativo do Orders que **não** vamos usar. |
| Boleto e débito virtual Caixa | O checkout oferece PIX e cartão; ampliar meios é decisão de produto, não desta migração. |
| Migração de dados legados / handler dual-topic | **Não há dados da API antiga** (confirmado pelo usuário). Corte seco. |
| Alterar `pricing.ts`, ~~`webhookSignature.ts`~~, `payer.ts`, Bricks ou UI do checkout | Fronteira da feature. São exatamente os módulos que a migração **não** deve tocar. **`webhookSignature.ts` saiu desta lista depois do T16** — ver *Success Criteria* para o motivo medido. |
| `.specs/features/08-*` (gaps SHP-06, ADR-02, BMP-04 aritmético) | Fecham na 08. Esta feature herda só a parte **runtime**. |

---

## Assumptions & Open Questions

| Assumption / decisão | Default escolhido | Rationale | Confirmado? |
| -------------------- | ----------------- | --------- | ----------- |
| Enum exato de `status` de order **online** | **CONFIRMADO** na doc oficial *Status da order*: `created`, `processed`, `processing`, `action_required`, `canceled`, `charged_back`, `expired`, `failed`, `refunded`. Todos os 9 mapeados; `at_terminal` **não** ocorre em online (é do Point) | A suposição sobre `at_terminal` se confirmou, mas a lista real trouxe **`processing`**, que não estava no mapa e cairia em `null` — o webhook ignoraria a transição e o pedido ficaria preso. A armadilha é homonímia: no Orders o status é `processing` com `status_detail: in_process`; na Payments API `in_process` era o próprio **status**. Strings distintas, ambas necessárias. `charged_back` já vinha coberto pelo vocabulário legado, e o destino (`refunded`) continua correto | **y** — T15 |
| `processing_mode` | `"automatic"` | O fluxo é de estágio único: cobra na hora do CTA. `manual` só serve para captura em etapas, que a loja não tem | y |
| Família `cc_rejected_*` de `status_detail` preservada no Orders | ~~Manter `FRIENDLY_MESSAGES` inalterado~~ → **mapa estendido + ponte por prefixo** | ❌ **REFUTADA no T16.** O valor observado na recusa (titular OTHE, cenário 6) foi **`rejected_by_issuer`** — sem o prefixo `cc_` —, e a chave não existia em `FRIENDLY_MESSAGES`, então `friendlyMessage` caía no fallback genérico. Os detalhes do caminho felizes (`accredited`, `waiting_transfer`) **são** os mesmos das duas APIs, o que fez a suposição parecer segura; a recusa é que fala outro dialeto. Correção: chave explícita `rejected_by_issuer` + ponte `rejected_<motivo>` → `cc_rejected_<motivo>` (D4) | **REFUTADA** — T16 |
| Local do `payer` no payload | Raiz da order | Confirmado na referência: `payer` root-level com `email`/`first_name`/`last_name`/`identification{type,number}` — exatamente a forma que `buildPayer` devolve | y |
| Dados legados da API antiga | Nenhum; corte seco | Declarado pelo usuário: "essa implementação é nova" | y |
| `expiration_time` | `"PT30M"` na raiz da order | Mantém os 30 min do `PIX_EXPIRATION_MINUTES` atual e fica dentro do limite do MP (30 min – 30 dias) | y |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Pagamento criado pela API de Orders ⭐ MVP

**User Story**: Como cliente da loja, quero pagar meu pedido por PIX ou cartão pela integração que o
Mercado Pago recomenda, para que o pagamento seja processado e confirmado de fato.

**Why P1**: Sem isso não há cobrança. É o slice vertical — CTA → order no MP → QR/aprovação na tela.

**Acceptance Criteria**:

1. **ORD-01** — WHEN `create-payment` monta o corpo THEN ele SHALL fazer `POST {MP_BASE}/v1/orders`
   com `type: "online"`, `processing_mode: "automatic"`, `external_reference` igual ao `order_id`
   (uuid do pedido) e `expiration_time: "PT30M"`.
2. **ORD-02** — WHEN o total recalculado é `totals.total` THEN `total_amount` e
   `transactions.payments[0].amount` SHALL ser a **string** desse valor com exatamente 2 casas
   decimais (ex.: `48` → `"48.00"`; `48.5` → `"48.50"`), e os dois campos SHALL ser idênticos entre si.
3. **ORD-03** — WHEN o método é `card` THEN `transactions.payments[0].payment_method` SHALL conter
   `{ id: <payment_method_id do Brick>, type: "credit_card", token: <token do Brick>, installments: <n>,
   statement_descriptor: "NANAPIN" }`, e o payload SHALL **não** ter `statement_descriptor` na raiz da
   order.
   > **Precisão corrigida durante o Execute.** A redação original omitia o `statement_descriptor`,
   > porque na Payments API ele ficava na **raiz** do payload e foi movido para lá por herança. Na
   > Orders a doc o lista como sub-campo de `payment_method`. Deixá-lo na raiz não quebraria teste
   > nenhum — o pedido seria criado normalmente e o texto simplesmente **sumiria da fatura do
   > cliente**, em silêncio. Como as páginas de referência do MP são SPA e devolvem 404 ao fetch,
   > isto não pôde ser confirmado em fonte autoritativa: **o cenário 2 do T16 tem item explícito
   > para conferir o descritor na transação do sandbox**. Só no cartão — `statement_descriptor` não
   > tem sentido em `bank_transfer` (PIX).
4. **ORD-04** — WHEN o método é `pix` THEN `transactions.payments[0].payment_method` SHALL conter
   `{ id: "pix", type: "bank_transfer" }` e o payload SHALL **não** conter `date_of_expiration`
   (a expiração passa a ser `expiration_time` na raiz, em duração ISO-8601).
5. **ORD-05** — WHEN a chamada é feita THEN ela SHALL enviar o header `X-Idempotency-Key` com a
   `idempotency_key` recebida do cliente, preservando PAY-06.
6. **ORD-06** — WHEN o método é `pix` e o MP responde 2xx THEN a resposta ao front SHALL manter o
   contrato atual: `{ qr_code, qr_code_base64, expires_at }`, com `qr_code` e `qr_code_base64` lidos de
   `transactions.payments[0].payment_method` e `expires_at` **calculado** como `now + ORDER_EXPIRATION`
   (`pixExpiresAt`), em ISO-8601 absoluto.
   > **Reescrito depois do T16 (D5).** A redação original mandava ler `expires_at` do
   > "`expiration_time` resolvido da order" — e o MP **não resolve**: ele **ecoa** a duração que
   > recebeu (`"PT30M"`, medido). `new Date("PT30M")` é `Invalid Date`, então o cronômetro do PIX na
   > tela recebia `NaN`. O campo passa a ser calculado do relógio do servidor, com a mesma janela que
   > vai em `expiration_time` (fonte única em `orders.ts`).
   > **Metade que fica aberta:** a expiração real no lado do MP saiu em **+24h**
   > (`transactions.payments[0].date_of_expiration`), isto é, o `expiration_time: "PT30M"` da raiz
   > **não foi aplicado** — onde o campo realmente vale para PIX segue indefinido, pendente de
   > consulta à doc. Consequência aceita: a tela conta 30 min enquanto o código segue pagável por mais
   > tempo. Direção segura — ninguém paga um código que a tela dizia válido.
7. **ORD-07** — A resposta do MP SHALL ser classificada em **três desfechos mutuamente exclusivos**,
   nesta ordem de precedência:
   - **(a) desfecho de negócio.** WHEN a resposta traz uma order resolvível — `id` na raiz **ou** em
     `data.id` — **e** o status HTTP é < 500 THEN o desfecho SHALL ser tratado como negócio, não como
     falha de transporte (inclusive em 4xx: a recusa de cartão chega em **402**):
     `mp_order_id`/`mp_payment_id`/`mp_status_detail` gravados e, no cartão, resposta **200** com
     `{ status, status_detail }` internos.
   - **(b) requisição rejeitada.** WHEN não é (a) **e** o MP responde 4xx **com corpo JSON parseável**
     THEN SHALL devolver **400** repassando a mensagem do MP (`errors[0].message`, ou `message` na
     raiz), caindo em `"Não foi possível criar o pagamento"` quando nenhuma das duas existir.
   - **(c) indisponibilidade.** Em **todos os demais** casos — rede inalcançável, 5xx (mesmo quando o
     corpo traz uma order), 2xx sem order, e 4xx **sem corpo parseável** — THEN SHALL devolver **502**
     com `"Não foi possível iniciar o pagamento. Tente novamente."`.

   Em (b) e (c) `mp_order_id` SHALL **não** ser gravado — id vazio no pedido é pior que pedir para
   tentar de novo.
   > **Estendido depois do T16 (D3).** Medido: o cartão recusado responde **HTTP 402** com a order em
   > `data.*`. A redação original só previa "4xx ⇒ 400 com `message`", e o resultado era duplo: a
   > cliente recebia um erro genérico (a mensagem nem está em `message`, está em `errors[0].message`)
   > e a order recusada ficava **órfã** — existindo no MP, sem `mp_order_id` no pedido. 5xx continua
   > sendo 502 mesmo com corpo, porque aí não se pode afirmar o desfecho.
   > **Contradição corrigida na rodada de fechamento do Verifier.** A redação anterior tinha duas
   > cláusulas incompatíveis: *"responde sem nenhuma order resolvível ⇒ 502"* e *"4xx sem order
   > resolvível ⇒ 400"*. O que desempata é a existência de **corpo parseável**, e essa era uma decisão
   > da implementação que a AC não dizia: sem mensagem do MP não há 400 informativo a dar, e um 4xx
   > opaco (página HTML de proxy/WAF na frente da API) é indistinguível de indisponibilidade. O ramo
   > passa a ter teste — `handlers.test.ts`, *"4xx com corpo NÃO-JSON e sem order → 502, não 400"*.

**Independent Test**: com um pedido válido em sandbox, acionar PIX e cartão; asseverar o corpo enviado
ao MP (endpoint, `type`, strings de valor) e que a tela recebe QR / aprovação sem mudança no front.

---

### P1: Status e webhook falando o vocabulário do Orders ⭐ MVP

**User Story**: Como lojista, quero que o pedido reflita o estado real do pagamento, para que estoque,
cupom e a tela de confirmação da cliente não mintam.

**Why P1**: É o que faz um pedido chegar a `approved`. Sem isso a cobrança acontece e o sistema não vê.

**Acceptance Criteria**:

1. **STA-01** — WHEN `mapMpStatus` recebe um status do Orders THEN SHALL mapear `processed` →
   `approved`, `failed` → `rejected`, `canceled` → `cancelled`, `refunded` → `refunded`, `expired` →
   `expired`, `created` → `pending`; WHEN recebe um status do vocabulário legado da Payments API
   (`approved`, `rejected`, `cancelled`, `pending`, `in_process`, `charged_back`) THEN SHALL **manter**
   o mapeamento atual — o mapa é a **união** dos dois vocabulários, não uma substituição; e WHEN o
   status é desconhecido THEN SHALL devolver `null` (webhook loga `unknown_mp_status` e não
   transiciona). Racional da união: `canceled`/`cancelled` diferem por uma letra e as duas chaves
   precisam existir de todo modo; manter as demais custa nada, não quebra as asserções já escritas em
   `status.test.ts` e faz o webhook degradar com sanidade em vez de logar desconhecido.
2. **STA-02** — WHEN o status é `action_required` e o `status_detail` é `waiting_transfer` THEN o
   status interno SHALL ser `pending` (é o PIX aguardando pagamento, caminho feliz).
3. **STA-03** — WHEN o método é `card` e a order volta `action_required` com `status_detail` diferente
   de `waiting_transfer` THEN o pedido SHALL receber `payment_status = 'rejected'` e a resposta ao
   front SHALL ser **200** com `{ status: 'rejected', status_detail }` — a loja não apresenta desafio
   3DS, e deixar o pedido em `pending` prenderia a cliente até o expirador de 24h (AD-003). O texto
   que a cliente lê SHALL sair de `friendlyMessage(status_detail)`; como nenhum detail de desafio
   (`pending_challenge`, `pending_capture`, `pending_review_manual`) tem chave própria nem casa com a
   ponte `rejected_*`, todos caem no `FALLBACK_MESSAGE` — que por isso **SHALL instruir o uso de outro
   meio de pagamento**, e não pode ser um erro genérico.
   > **Precisão corrigida na rodada de fechamento do Verifier.** A redação anterior era *"a resposta
   > SHALL trazer uma mensagem que instrua a trocar de meio"*, e a resposta não traz texto nenhum:
   > traz o `status_detail` que a **loja** traduz. A garantia real é a corrente
   > `status_detail → friendlyMessage → fallback instrucional`, e ela se cumpria por acidente —
   > nenhum teste ligava um detail de STA-03 ao texto, então trocar o `FALLBACK_MESSAGE` por `"Erro."`
   > passaria verde e violaria a AC. Agora as duas pontas da corrente têm teste (`status.test.ts` e
   > `handlers.test.ts`). A asserção é sobre a **instrução** (`/use outro método de pagamento/i`), não
   > sobre a cópia literal inteira: travar a frase toda tornaria qualquer ajuste de redação uma
   > quebra falsa.
4. **STA-04** — WHEN a order traz `status_detail` da família `cc_rejected_*` (vocabulário legado)
   THEN `friendlyMessage` SHALL continuar devolvendo a mensagem pt-BR correspondente; WHEN o
   `status_detail` é **`rejected_by_issuer`** THEN SHALL devolver mensagem específica sobre o banco
   emissor ter recusado, instruindo tentar outro cartão; WHEN o `status_detail` começa com
   `rejected_` e não tem chave própria THEN SHALL tentar `cc_rejected_<resto>` (**ponte por
   prefixo**) e, só na ausência de par, cair no fallback genérico; e WHEN o detalhe é o da recusa de
   cartão THEN ele SHALL ser lido de `transactions.payments[0].status_detail`, não da raiz da order.
   > **Reescrito depois do T16 (D4, D6) — a Assumption nº3 está REFUTADA.** O que se supôs foi "a
   > família `cc_rejected_*` se preserva no Orders"; o que se **mediu** foi `rejected_by_issuer` na
   > `transactions.payments[0]`, com a raiz trazendo o genérico `"failed"`. Duas correções distintas:
   > o **vocabulário** (chave explícita + ponte de prefixo, sem inventar chaves não observadas) e a
   > **posição de leitura** (o payment vence a raiz). A ponte existe para não chutar: só o
   > `rejected_by_issuer` foi observado, e os irmãos que os outros titulares de teste produzem
   > reaproveitam as mensagens já escritas em vez de virar fallback.
5. **WHK-01** — WHEN chega uma notificação THEN o handler SHALL processar `type === "order"` (e
   SHALL responder `{ received: true }` sem efeito para qualquer outro `type`), e SHALL consultar
   `GET {MP_BASE}/v1/orders/{data.id}` — nunca confiando no corpo da notificação.
6. **WHK-02** — WHEN a assinatura é validada THEN SHALL usar `validateWebhookSignature` (HMAC-SHA256
   hex) contra os manifests candidatos de `buildManifestCandidates` — `id:<data.id como recebido>;…`
   e depois `id:<data.id em minúsculas>;…`, ambos com `request-id:<x-request-id>;ts:<ts>;` —,
   aceitando no primeiro que casar; e assinatura inválida ou ausente SHALL responder 401.
   > **Reescrito depois do T16 (D2).** A redação original dizia "**sem alteração**" porque a premissa
   > era que o manifest do Orders é idêntico ao da Payments API. O sandbox **refutou**: 8 de 8
   > notificações reais responderam 401, com o segredo comprovadamente correto. Causa: `buildManifest`
   > lowerceia o `data.id` seguindo o exemplo oficial, cujo id é **numérico** (lowercase = no-op); no
   > tópico `order` o id é **maiúsculo** (`ORDTST01K…`) e lowercasear muda a string assinada.
   > `buildManifest` continua intacto (é o template documentado); o que entrou foi a lista de
   > candidatos. Não afrouxa a validação: os dois candidatos derivam do `data.id` recebido e cada um
   > exige HMAC válido com o segredo.
7. **WHK-03** — WHEN o pedido é localizado THEN SHALL ser por `external_reference` (uuid) e, na
   ausência, por `mp_order_id`; e WHEN nenhum casa THEN SHALL responder `{ received: true }` logando
   `order_not_found`.
8. **WHK-04** — WHEN o alvo é `approved` THEN os efeitos SHALL passar pela RPC `apply_payment_approval`
   (inalterada), e transições não-aprovação SHALL continuar guardadas por `canTransition`; WHEN chega
   um segundo `approved` de **outra** order THEN SHALL registrar `duplicate_approved_other_order` em
   `mp_status_detail` e **não** reaplicar efeitos nem regredir o status.

**Independent Test**: disparar a simulação de notificação do painel para uma order `processed` e
asseverar `payment_status = 'approved'`, `paid_at` preenchido, estoque baixado uma vez; repetir a
mesma notificação e asseverar no-op.

---

### P1: Rastreabilidade dos ids do Orders ⭐ MVP

**User Story**: Como lojista, quero achar no painel do Mercado Pago a transação de um pedido da loja,
para resolver suporte e conferir divergência de valor.

**Why P1**: `mp_order_id` é a chave do `GET /v1/orders/{id}` e do `data.id` do webhook — sem ela o
fallback de lookup do WHK-03 não existe.

**Acceptance Criteria**:

1. **PER-01** — WHEN a migration roda THEN `orders` SHALL passar a ter `mp_order_id text` com índice,
   guardando o ULID da order (ex.: `01JC1KVZ0WJY8Y4WA7MZAD5S2T`).
2. **PER-02** — WHEN a order é criada com sucesso THEN `mp_order_id` SHALL receber o id da order e
   `mp_payment_id` SHALL receber o id do payment interno (`transactions.payments[0].id`, ex.:
   `pay_01JC1KVZ...`), ambos gravados antes de qualquer retorno de sucesso ao cliente.
3. **PER-03** — WHEN `apply_payment_approval` é chamada THEN SHALL continuar recebendo o id do
   **payment** em `p_mp_payment_id` — a assinatura da RPC e o SQL não mudam.

**Independent Test**: criar um pagamento em sandbox e asseverar as duas colunas preenchidas com os
formatos esperados, e que o `GET /v1/orders/{mp_order_id}` responde 200.

---

### P2: Retentativa sem dois pagamentos vivos

**User Story**: Como cliente que teve o cartão recusado, quero tentar de novo sem correr o risco de
existirem dois PIX pagáveis para o mesmo pedido.

**Why P2**: Hoje a proteção é **reativa** (guard de segundo `approved` no webhook). O Orders expõe um
cancel que a Payments API não tinha, então dá para fechar a janela na origem — mas o guard reativo
continua sendo a rede de segurança, e por isso isto não bloqueia o MVP.

**Acceptance Criteria**:

1. **RTY-01** — WHEN `create-payment` roda para um pedido que já tem `mp_order_id` e cujo
   `payment_status` está em `pending`/`rejected`/`expired` THEN SHALL tentar cancelar a order anterior
   no MP **antes** de criar a nova.
2. **RTY-02** — WHEN o cancel falha (qualquer status não-2xx, ou rede) THEN o fluxo SHALL prosseguir
   criando a order nova, registrando `previous_order_cancel_failed` no log estruturado — a
   retentativa da cliente nunca é bloqueada por falha de limpeza.
3. **RTY-03** — WHEN a order nova é criada THEN `mp_order_id` SHALL passar a apontar para ela
   (a anterior deixa de ser referenciada pelo pedido).

**Independent Test**: pedido com PIX gerado e não pago → acionar cartão; asseverar chamada de cancel
na order anterior e `mp_order_id` atualizado.

---

### P1 herdados da 08 — validação runtime em sandbox ⭐ MVP

Herdados **com os IDs originais** para preservar a traceability da 08. A lógica de domínio dos dois já
está implementada e coberta por teste; o que falta é exclusivamente a prova em runtime, que a 08
deixou explicitamente pendente (`validation.md`, linha 414).

1. **PGD-04** (herdado) — WHEN `create-payment` monta o payload THEN ele SHALL incluir
   `payer.identification = { type: 'CPF', number: <11 dígitos> }` lido do servidor, `payer.first_name`
   e `payer.last_name` derivados de `customers.name`, **na raiz da order**, para PIX e cartão; e WHEN o
   payload do Brick já traz um `payer.identification` THEN o valor do servidor SHALL sobrescrevê-lo.
2. **BMP-04** (herdado) — WHEN `create-payment` recalcula o valor cobrado THEN SHALL aplicar o desconto
   do order bump **no servidor** via `calculateOrderTotals`, de forma que o valor cobrado seja
   **idêntico** ao exibido — incluindo o caso com cupom `percent`, que foi onde a igualdade quebrou na
   08 e por isso entra no roteiro obrigatoriamente.

**Independent Test**: os 5 cenários do roteiro de sandbox (ver `tasks.md`), executados uma única vez
contra a API de Orders.

---

## Edge Cases

- WHEN `calculateOrderTotals` devolve total < R$ 0,01 THEN SHALL devolver 422 antes de chamar o MP
  (comportamento atual preservado).
- WHEN o pedido não tem CPF válido THEN SHALL devolver 422 **antes** de qualquer escrita ou chamada ao
  MP (guard de PGD-04, inalterado).
- WHEN o MP responde 2xx mas sem `id` de order THEN SHALL tratar como indisponibilidade (502), nunca
  gravar id vazio.
- WHEN o MP responde 4xx **sem corpo JSON parseável** e sem order THEN SHALL tratar como
  indisponibilidade (502), não como requisição rejeitada — não há mensagem do MP para repassar num
  400 (ORD-07 (c)).
- WHEN o método é `pix` e a resposta não traz `qr_code` THEN SHALL devolver `qr_code: ""` e
  `qr_code_base64: null` (contrato atual), deixando a tela cair no estado de erro já existente.
- WHEN chega webhook com `type: "payment"` THEN SHALL responder `{ received: true }` sem efeito —
  corte seco, sem dados legados.

---

## Implicit-Requirement Dimensions Sweep

| Dimensão | Cobertura |
| -------- | --------- |
| Input validation & bounds | ORD-02 (string com 2 casas), ORD-05 (`idempotency_key` obrigatória), edge case de total < R$ 0,01 e de CPF ausente. Guards de `order_id`/`method` inalterados |
| Failure / partial-failure states | ORD-07 (502/400 e nenhuma escrita de `mp_order_id`), RTY-02 (cancel falho não bloqueia), persistência de `total` antes de cobrar preservada |
| Idempotency / retry / duplicate | ORD-05, RTY-01/02/03, WHK-04 (RPC idempotente + guard de segundo `approved`) |
| Auth boundaries & rate limits | **Inalterado** — auth manual por JWT, ownership via `customers.user_id` e guard de `payment_status` seguem como na 08 (PAY-10). **Rate limit: N/A because** o volume e a superfície não mudam com a troca de API |
| Concurrency / ordering | WHK-04 (segundo `approved` de outra order não regride nem reaplica), RPC transacional com guard `paid_at is null` |
| Data lifecycle / expiry | ORD-01 (`expiration_time: "PT30M"`), job `expire-pending-orders` de 24h inalterado |
| Observability | LOG-01: o log estruturado de `create-payment` e `webhook` SHALL passar a incluir `mp_order_id`, mantendo `bump_applied` e `payer_cpf_present` como booleanos e **nunca** registrando o CPF |
| External-dependency failure | ORD-07 (502 em 5xx/inalcançável), RTY-02 (degrada sem bloquear) |
| State-transition integrity | STA-01/02/03, WHK-04, `canTransition` inalterado |

---

## Requirement Traceability

| ID | Story | Tasks | Status |
| -- | ----- | ----- | ------ |
| ORD-01 … ORD-05 | P1 Order | T2, T8 | ✅ Verified |
| ORD-06 | P1 Order | T3, T9 | ✅ Verified (metade aberta declarada na AC: janela real do PIX no MP) |
| ORD-07 | P1 Order | T3, T9, T18 | ✅ Verified (AC reescrita em T18: 3 desfechos, ramo do corpo não parseável com teste) |
| STA-01, STA-02 | P1 Status/Webhook | T4, T5, T15 | ✅ Verified |
| STA-03 | P1 Status/Webhook | T5, T10, T18 | ✅ Verified (AC reescrita em T18: a corrente `status_detail → friendlyMessage` é asseverada) |
| STA-04 | P1 Status/Webhook | T5, T16 | ✅ Verified |
| WHK-01, WHK-02, WHK-03 | P1 Status/Webhook | T12 | ✅ Verified |
| WHK-04 | P1 Status/Webhook | T13 | ✅ Verified |
| PER-01 | P1 Rastreabilidade | T1 | ✅ Verified (build gate + `information_schema`; sem teste automatizado por decisão da matriz) |
| PER-02, PER-03 | P1 Rastreabilidade | T3, T9 | ✅ Verified |
| RTY-01, RTY-02, RTY-03 | P2 Retentativa | T11 | ✅ Verified (integration; runtime pendente de reexecução do sandbox) |
| LOG-01 | Observabilidade (sweep) | T9, T13 | ✅ Verified |
| PGD-04 (herdado 08) | P1 Sandbox | T16, T18 | ✅ Verified (T18 fechou o PIX por valor e o guard 422; runtime limitado — a API do MP não devolve `payer`) |
| BMP-04 (herdado 08) | P1 Sandbox | T16, T18 | ✅ Verified (T18 provou no **handler**, não no espelho: mutante de duplo desconto morre) |

**Coverage:** 24 requisitos, **24 mapeados** para tasks, **0 sem dono** ✅
T6, T7, T14 e T17 são habilitadores/verificação sem AC própria (extração, harness, probe de boot,
fronteira por diff) — declarados como tal em `tasks.md`, não contados como requisito órfão.

---

## Success Criteria

- [ ] Um pagamento PIX e um de cartão concluídos em sandbox via `/v1/orders`, com o pedido chegando a
      `approved` pelo webhook — a prova end-to-end que a 08 não conseguiu produzir.
- [ ] `git diff` da migração **não toca** `pricing.ts`, `payer.ts`, `CardPaymentBrick.tsx` nem nenhum
      arquivo de `apps/store/src` — a fronteira é verificável por diff.
      **`webhookSignature.ts` SAIU desta lista** (mudança registrada, não escondida): a premissa que o
      colocava aqui era *"o manifest do Orders é idêntico ao da Payments API"*, e o sandbox a
      **refutou** — 8 de 8 notificações reais em 401 com o segredo correto, porque o `data.id` do
      tópico `order` é maiúsculo e o lowercase do template quebra o HMAC (D2). Manter a fronteira
      significaria manter o webhook não-funcional em produção. A mudança é **aditiva**:
      `buildManifest` e seus testes seguem intactos, e o que entrou foi `buildManifestCandidates`.
      **Exceção única e autorizada**: `apps/store/src/test/setup.ts`. Não é código de produção nem da
      loja — é o setup de teste, alterado para consertar um flake **pré-existente** que tornava o gate
      `pnpm test` ~50% vermelho e portanto inútil como verificação desta feature. Causa: `input-otp@1.4.2`
      agenda três timers (0/10/50ms) num `useEffect` sem cleanup (`dist/index.mjs`), e o callback toca
      `window` depois do teardown do jsdom. Evidência: 6 rodadas reais antes → `1,1,0,0,1,0`;
      5 rodadas `--force` depois → `0,0,0,0,0`, com as contagens preservadas (core 279 · backoffice 62 ·
      store 372). Nenhum arquivo de produção da loja foi tocado.
- [ ] Cenário 4 do roteiro (bump + cupom `percent`) fecha com rótulo do CTA == `orders.total` ==
      `total_amount` no painel do MP, até o centavo.
- [ ] Cenário 3 (pedido sem CPF) devolve 422 e **nenhuma** order criada no MP.
- [ ] `pnpm test` verde, sem regressão nos testes de domínio existentes de `packages/core/src/payment`.
