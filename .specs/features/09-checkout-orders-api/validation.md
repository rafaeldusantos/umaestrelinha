# 09-checkout-orders-api — Validação de sandbox (T16)

**Executado:** 2026-07-28 · **Ambiente:** Supabase local (`http://127.0.0.1:54321`) + loja em
`http://127.0.0.1:8080` · **Conta MP:** usuário de teste `TESTUSER6808293123515525364` (`user_id`
`3573876960`, `site_id: MLB`) · **Túnel do webhook:**
`https://luggage-ips-storm-corn.trycloudflare.com/functions/v1/mercado-pago?action=webhook`

**Método:** loja dirigida por `playwright-cli`; verificação pela **API** do Mercado Pago
(`GET /v1/orders/{id}`), nunca pelo painel; banco por `psql`; log estruturado por
`docker logs supabase_edge_runtime_nanapin-store`.

> **Nenhum código de produção foi alterado para fazer cenário passar.** O único arquivo de produção
> tocado nesta task é o **cabeçalho de comentário** do roteiro em `handlers.ts`, que era entregável
> explícito do T16 (atualizar o vocabulário para o Orders).

---

## 🔧 Rodada de fixes (pós-T16)

Executada depois desta validação, sobre os defeitos medidos abaixo. **A evidência original foi
preservada intacta** — as anotações de fix são acréscimos, não reescritas do que se mediu.

| # | Fix aplicado | Onde | Prova |
| - | --- | --- | --- |
| D1 | `notification_url` fora do corpo; corpo é exatamente o de `buildOrderPayload` | `handlers.ts` | teste que trava as chaves de raiz por igualdade |
| D2 | `buildManifestCandidates`: valida o `data.id` **como recebido** e depois em minúsculas, aceitando o primeiro que casar. `buildManifest` intacto | `webhookSignature.ts` + `handlers.ts` | notificação assinada com id MAIÚSCULO sem lowercase → 200; 401s seguem 401 |
| D3 | Order resolvida da raiz **ou** de `data`; com order ⇒ desfecho de negócio (persiste ids + 200 no cartão). 502 só para rede/5xx/sem order; 4xx sem order ⇒ 400 com `errors[0].message` | `handlers.ts` | corpo 402 exato do cenário 6 ⇒ 200 `{rejected, rejected_by_issuer}` + `mp_order_id` gravado |
| D4 | Chave `rejected_by_issuer` + ponte `rejected_*` → `cc_rejected_*` | `status.ts` | `rejected_insufficient_amount` devolve a mesma mensagem de `cc_rejected_insufficient_amount` |
| D5 | `pixExpiresAt(now)` puro; `extractPixData` deixa de devolver `expiration_time` | `orders.ts` + `handlers.ts` | `pixExpiresAt(12:00Z)` → `12:30Z`; `"PT30M"` nunca chega ao `expires_at` · **metade ainda aberta, ver abaixo** |
| D6 | `resolveCardOutcome` prefere `transactions.payments[0].status_detail` | `orders.ts` | raiz `failed` + payment `rejected_by_issuer` ⇒ `rejected_by_issuer` |
| D7 | Handler grava `mp_order_id` no caminho `approved` (SQL da RPC **não** mudou) | `handlers.ts` | pedido com `mp_order_id` null ⇒ escrita asseverada |
| D8 | Formatos reais (`ORDTST01K…`/`PAY01K…`) em comentários e fixtures | migration, `orders.ts`, testes | só comentário/fixture, nenhuma lógica |
| D9 | **Não corrigido — fora de escopo** (UI da loja). Registrado em `context.md` → *Deferred Ideas* | `apps/store` | — |

**Gate:** `pnpm turbo run test --force` exit 0 · functions **47** (era 37) · core **300** (era 284) ·
backoffice **62** · store **372**. Nenhuma asserção existente foi enfraquecida; as que mudaram foram
as que codificavam o contrato **defeituoso** (`extractPixData` devolvendo o echo `expiration_time` e
os ids de fixture no formato errado), acompanhando a reescrita das ACs.

---

## ⛔ Bloqueador descoberto — `notification_url` não é aceito pela API de Orders

**Este é o achado principal do T16.** Toda chamada de `create-payment` falha, para PIX e para cartão.

| | |
| --- | --- |
| **Comando/ação** | Checkout na loja → CTA "Pagar … com PIX" |
| **Medido (loja)** | HTTP **400**, alerta na tela: *"Não foi possível criar o pagamento"* |
| **Medido (log)** | `{"action":"create-payment","order_id":"70eb87ff-…","status":"mp_rejected_request","mp_http":400}` |
| **Medido (MP, reproduzindo o mesmo corpo por curl)** | `{"errors":[{"code":"unsupported_properties","message":"Properties not supported","details":["additionalProperties '$.notification_url' not allowed"]}]}` |
| **Esperado** | 200/201 com a order criada |
| **Veredito** | ❌ **FAIL — bloqueia ORD-01…ORD-07, PER-02, PGD-04, BMP-04 em runtime** |

Origem: `handlers.ts` monta `payload = { ...orderPayload, notification_url: deps.env.notificationUrl }`.
A Orders API valida o corpo por schema fechado e recusa a propriedade. O mesmo corpo **sem**
`notification_url` é aceito (provado nos probes abaixo).

Nota de impacto operacional: **as notificações continuam chegando** mesmo sem `notification_url` no
corpo — a URL do túnel já está cadastrada no painel da aplicação, e o MP entregou 2 notificações por
order criada (evidência na seção do cenário 7). Ou seja, o campo no corpo não é só ilegal: é
desnecessário nesta conta.

### Segundo bloqueador (só sandbox): e-mail do pagador

| | |
| --- | --- |
| **Comando** | `POST /v1/orders` com `payer.email = "admin@nanapin.dev"` |
| **Medido** | `{"errors":[{"code":"invalid_email_for_sandbox","message":"Email format is invalid for sandbox environment, must contains '@testuser.com'."}]}` |
| **Veredito** | ⚠️ Restrição do sandbox, não defeito do código. Os cenários seguintes usaram `test_user_6808293123515525364@testuser.com` no bloco Contato |

### Terceiro achado de ambiente: BIN de cartão de teste

O Mastercard de teste `5031 4332 1540 6351` devolve `invalid_transaction_amount` **em qualquer
valor** (testado 14,55 e 100,00) — a busca `/v1/payment_methods/search?bins=503143` devolve
`{"paging":{"total":0}}` para esta conta. O Visa `4235 6477 2802 5682` (`id: "visa"`) funciona.

---

## Consequência do bloqueador sobre o roteiro

Como `create-payment` nunca chega a criar order, os cenários foram executados em **duas metades
declaradas**:

- **Metade loja→servidor** (real, pelo CTA): rótulo do CTA, `orders.*` persistido, log estruturado,
  guard de 422. Esta metade roda inteira, porque a função **persiste `total` e `pix_discount` antes**
  de chamar o MP.
- **Metade servidor→MP** (probe): o mesmo corpo que `buildOrderPayload` produz, enviado por `curl`
  **sem** `notification_url`, para responder as perguntas que só o MP responde (ORD-03, STA-04,
  formato dos ids, echo de `payer`, `expiration_time`).

Cada seção diz qual metade a evidência cobre.

---

## Cenário 1 — PIX com CPF (PGD-04)

**Preparo:** `update customers set name='Mariana Souza Lima', cpf='39053344705' where id='3bba57d5-3991-4a34-a2ee-a50c3bb51653';`
(o cliente `rafaeldusantos@gmail.com` não tinha senha e o OTP por e-mail está quebrado — ver
*Notas de ambiente*).

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| Rótulo do CTA | `Pagar R$ 14,55 com PIX` | — | — |
| `orders.total` (pedido `70eb87ff-8864-4565-9215-7fa2c8672cc4`) | `14.55` | == rótulo | ✅ |
| `orders.subtotal` / `shipping_cost` / `pix_discount` | `4.90` / `9.90` / `0.25` | — | ✅ |
| HTTP de `create-payment` | **400** | 200 com `qr_code` | ❌ |
| `orders.mp_order_id` | `null` | ULID da order | ❌ |
| `orders.mp_payment_id` | `null` | id do payment | ❌ |

**Probe servidor→MP** (mesmo corpo, sem `notification_url`, `external_reference: probe-a2`):

- **`mp_order_id` real:** `ORDTST01KYMAPS387GPYD6WV2YA8VEBJ`
- **`mp_payment_id` real:** `PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1`
- `status` / `status_detail`: `action_required` / `waiting_transfer` (STA-02 confirmado no runtime)
- `total_amount`: `"14.55"`; `transactions.payments[0].amount`: `"14.55"` (ORD-02 ✅)
- `qr_code`: **string de 177 caracteres**, começando `00020126580014br.gov.bcb.pix…` ✅
- `qr_code_base64`: presente ✅

**Veredito do cenário: ❌ FAIL pelo bloqueador.** A metade loja→servidor está correta; a criação da
order no MP nunca acontece pelo caminho de produção.

### PGD-04 — não é asseverável pela API (medido, não suposto)

O roteiro pedia conferir `payer.identification` na resposta do MP. **A resposta não tem `payer`:**

```
TOP KEYS: ['capture_mode','country_code','created_date','currency','expiration_time',
           'external_reference','id','integration_data','last_updated_date','processing_mode',
           'status','status_detail','total_amount','total_paid_amount','transactions','type','user_id']
has payer: False        ← tanto no POST quanto no GET /v1/orders/{id}
```

Tentativa de contorno pelo pagamento legado (`GET /v1/payments/170892698670`, id extraído do
`ticket_url`): responde 200, mas com o pagador **anonimizado**:

```json
"payer": {"email": null, "first_name": null, "last_name": null,
          "identification": {"number": null, "type": null}, "id": "3573589324"}
```

⇒ **PGD-04 fica sem prova de runtime possível nesta API.** A garantia continua sendo o domínio puro
(`buildPayer`/`mergePayer` + testes de `payer.ts`) e o guard 422 do cenário 3. Registrado como
limitação medida, não como pendência de execução.

### ORD-06 — defeito medido em `expires_at`

`expiration_time` na resposta do MP volta **como a duração que foi enviada**, não resolvida:

| Campo | Medido |
| --- | --- |
| `expiration_time` (raiz da order) | `"PT30M"` |
| `created_date` | `2026-07-28T12:20:32.506Z` |
| `transactions.payments[0].date_of_expiration` | `2026-07-29T12:20:32.850+00:00` (**+24h**, não +30min) |

`extractPixData` devolve esse valor como `expires_at`, e `PixPayment.tsx:72` faz
`new Date(pix.expires_at).getTime()` ⇒ `new Date("PT30M")` é **Invalid Date** ⇒ o cronômetro do PIX
recebe `NaN`. Além disso, `expiration_time: "PT30M"` **não encurtou** a expiração real do PIX, que
saiu em 24h. ❌ **ORD-06 tem defeito de contrato**; a fonte correta do timestamp é
`transactions.payments[0].date_of_expiration`.

#### 🔧 D5 — corrigido pela metade, e a outra metade fica declarada

**Corrigido:** `expires_at` deixou de ser o echo do MP. `extractPixData` não devolve mais
`expiration_time`, e o campo passa a vir de `pixExpiresAt(now)` (`orders.ts`, função pura, relógio
injetado) — ISO absoluto, derivado da **mesma** janela que vai em `expiration_time` (fonte única:
`ORDER_EXPIRATION_MINUTES`, do qual `ORDER_EXPIRATION = "PT30M"` é derivado). O contrato da loja
(`{ qr_code, qr_code_base64, expires_at }`) fica idêntico e o cronômetro volta a receber um número.

**Ainda ABERTO (pendente de consulta à doc):** *onde* a expiração do PIX é realmente configurada.
O `expiration_time: "PT30M"` na raiz da order **não foi aplicado** — a expiração real medida foi
`transactions.payments[0].date_of_expiration` = **+24h**. Não sabemos se o campo correto é
`date_of_expiration` dentro do payment (proibido pela ORD-04 atual), se PIX ignora
`expiration_time`, ou se a conta de sandbox força 24h. Enquanto isso:

> **Consequência aceita:** a tela conta 30 min enquanto o código segue pagável por mais tempo. É a
> direção segura da divergência — a cliente nunca vê "válido" para um código morto; o pior caso é um
> código que ainda funciona depois de a tela dizer que expirou, e o CTA de regerar já cobre isso.

### PER-01/PER-02 — formato dos ids diverge da spec

| | Spec supunha | Medido |
| --- | --- | --- |
| order | `01JC1KVZ0WJY8Y4WA7MZAD5S2T` | `ORDTST01KYMAPS387GPYD6WV2YA8VEBJ` |
| payment | `pay_01JC1KVZ…` | `PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1` |

Sem impacto funcional (as colunas são `text`), mas os comentários que citam `01J…`/`pay_…` estão
factualmente errados. O prefixo `ORDTST` provavelmente marca sandbox.

**🔧 D8 — corrigido.** Comentários e fixtures passaram a usar os formatos medidos
(`20260728120000_orders_mp_order_id.sql`, `orders.ts`, `handlers.ts` e os testes de `orders`/
`handlers`). O caixa **maiúsculo** deixou de ser detalhe cosmético no meio do caminho: é exatamente
o que derrubava a assinatura do webhook (D2), e as fixtures de teste agora carregam essa propriedade
em vez de esconder o defeito atrás de um id minúsculo inventado.

---

## Cenário 2 — Cartão com CPF divergente do Brick (PGD-04)

**Ação:** `create-payment` real (`curl` com o JWT da sessão da loja, pedido
`102e07d4-0be2-4317-855c-236d765cac0d`), `method: "card"`, token de cartão real
(`176f45de103b4600a8f27daba15fb34b`, Visa APRO) e `card.payer.identification.number = "12345678909"`
— **divergente** do `customers.cpf = '39053344705'`.

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| HTTP | **400** `{"error":"Não foi possível criar o pagamento"}` | 200 | ❌ bloqueador |
| CPF na order do MP | **não observável** | CPF de `customers` | ⏸️ |

**Veredito: ⏸️ NÃO CONCLUSIVO.** Dois motivos independentes: (1) o bloqueador impede a criação;
(2) mesmo sem ele, a API **não devolve `payer`** (seção acima), então a asserção como escrita no
roteiro é impossível. Sugestão para a spec: trocar a evidência de PGD-04 por asserção sobre o
**corpo enviado** (já coberta em `__tests__/handlers.test.ts`), não sobre a resposta do MP.

---

## Cenário 2b — `statement_descriptor` (ORD-03) ✅ **DESFECHO (b)**

**Comando:** `POST /v1/orders` com `transactions.payments[0].payment_method` contendo
`statement_descriptor: "NANAPIN"` (Visa APRO, `external_reference: probe-visa`).

**Medido — HTTP 2xx, `mp_order_id` `ORDTST01KYMAZV96DKQHXSZB5FG0K86E`:**

```json
"payment_method": {
  "id": "visa",
  "type": "credit_card",
  "token": "3af301ab5019e8e575ec7b98935a18fc",
  "statement_descriptor": "NANAPIN",
  "installments": 1,
  "installment_amount": "100.00",
  "transaction_security": {"validation": "never"}
}
```

O `GET /v1/orders/{id}` devolve o mesmo echo. Não houve 400 e o campo **não** foi descartado.

| Desfecho | Ocorreu? |
| --- | --- |
| (a) 400 — campo não aceito em `payment_method` | não |
| **(b) 2xx e o descritor aparece — posição confirmada** | **sim** ✅ |
| (c) 2xx e o descritor não aparece — ignorado | não |

**Veredito: ✅ PASS — ORD-03 confirmado.** A incerteza aberta da feature está fechada:
`statement_descriptor` pertence a `transactions.payments[0].payment_method`, e não à raiz da order.
(Prova de posição, não de fatura: o texto que o emissor imprime não é observável em sandbox.)

---

## Cenário 3 — Pedido sem CPF → 422 ✅

**Preparo:** `update customers set cpf=null where id='3bba57d5-…';`
**Ação:** `POST …?action=create-payment` com o JWT da sessão, pedido `102e07d4-…`, `method: "pix"`.

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| HTTP | **422** | 422 | ✅ |
| Corpo | `{"error":"Informe um CPF válido para pagar. O Mercado Pago exige o CPF do pagador para emitir o PIX e para processar o cartão."}` | mensagem de CPF obrigatório | ✅ |
| Log | `{"action":"create-payment","order_id":"102e07d4-…","status":"missing_payer_cpf","payer_cpf_present":false}` | CPF nunca logado | ✅ |
| `orders.mp_order_id` | `null` | `null` | ✅ |
| Order criada no MP | **nenhuma** (o `fetch` nem é alcançado — o guard antecede qualquer I/O) | nenhuma | ✅ |

**Veredito: ✅ PASS.** É o único cenário que o bloqueador não afeta, porque o guard roda antes da
chamada ao MP — e ele passa. Também é a evidência indireta mais forte de PGD-04 disponível:
CPF ausente ⇒ nada sai daqui.

---

## Cenário 4 — Bump exibido == cobrado, **com cupom `percent`** (BMP-04) ✅

**Preparo:** `store_settings.checkout = {"order_bump_enabled": true, "order_bump_product_id":
"ea3e07dd-2b07-48f0-bf8e-7e82075a6fa7" (Among Us, R$ 4,90, estoque 40), "order_bump_discount_percent": 50}`.
Carrinho: Gato Pão R$ 4,90. Bump marcado. Cupom **NANA10** (`percent`, 10) aplicado. Frete R$ 9,90.
Método PIX (`pix_discount_percent = 5`).

> Aritmética de risco escolhida de propósito: a base do cupom cai em **R$ 7,35** e 10% dá
> **0,735** — exatamente o meio centavo que quebrou a igualdade na 08.

| Fonte | Valor medido |
| --- | --- |
| **Rótulo do CTA (tela)** | **`Pagar R$ 16,18 com PIX`** |
| `orders.total` (`b86c38e5-2e60-4195-a298-d37c68adbde3`) | **`16.18`** |
| `orders.subtotal` | `7.35` (= 4,90 + 2,45 → bump aplicado no servidor) |
| `orders.discount` (cupom) | `0.74` |
| `orders.pix_discount` | `0.33` |
| `orders.shipping_cost` | `9.90` |
| **`total_amount` na API do MP** (`ORDTST01KYMBH5B06329YMT7BK7RP09S`) | **`"16.18"`** |
| `total_paid_amount` (valor efetivamente cobrado) | **`"16.18"`** |
| `transactions.payments[0].amount` | `"16.18"` |

**Rótulo == `orders.total` == `total_amount` == `total_paid_amount`, até o centavo. ✅**

`order_items` persistidos: `Gato Pão 1 × 4.90` e `Among Us 1 × 2.45` — e o servidor **ignorou** o
`2.45` do item, relendo `products.base_price = 4.90` e aplicando o bump ele mesmo (subtotal 7,35
comprova). É exatamente a regra do `CLAUDE.md`.

**Ressalvas honestas:**
1. A order no MP foi criada pelo **probe** (`external_reference` = o uuid do pedido real), porque o
   caminho de produção morre no bloqueador. O valor `16.18` enviado ao MP é o mesmo `orders.total`
   que a função persistiu — e `buildOrderPayload` serializa exatamente `formatAmount(totals.total)`,
   a mesma variável. A igualdade está provada nas três pontas; o que falta é o transporte.
2. **`bump_applied: true` não foi observado**: essa linha de log só é emitida **depois** da resposta
   2xx do MP, e o bloqueador desvia antes. O substituto medido é `orders.subtotal = 7.35` (com bump)
   contra `9.80` (sem bump, cenário 5) — evidência mais forte que o booleano, porque é o valor.

**Veredito: ✅ PASS para BMP-04** (a igualdade exibido == cobrado se sustenta, inclusive com cupom
percentual e arredondamento de meio centavo) · ⚠️ com a ressalva de transporte acima.

### 🐞 Paper cut de UI encontrado no caminho

No resumo do pedido, o chip do cupom exibe **"Desconto de R$ 0,73"** enquanto a linha de totais logo
abaixo exibe **"Cupom −R$ 0,74"** — mesma tela, mesmo cupom, um centavo de diferença. O total usa o
`0,74` (correto, `round2`). É divergência de formatação no chip, não de cobrança. Fora do escopo da
09; registrado para não se perder.

---

## Cenário 5 — Bump desligado ✅

**Preparo:** `order_bump_enabled = false`, mesmo produto (**Among Us**) no carrinho, agora como item
normal, junto de Gato Pão.

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| Oferta do bump na tela | **ausente** | ausente | ✅ |
| Rótulo do CTA | `Pagar R$ 19,21 com PIX` | — | — |
| `orders.total` (`102e07d4-0be2-4317-855c-236d765cac0d`) | `19.21` | == rótulo | ✅ |
| `orders.subtotal` | **`9.80`** (= 4,90 + 4,90, **preço cheio**) | preço cheio | ✅ |
| `order_items` | `Among Us 1 × 4.90`, `Gato Pão 1 × 4.90` | preço cheio | ✅ |
| `orders.pix_discount` | `0.49` | 5% de 9,80 | ✅ |
| `bump_applied: false` no log | **não observado** (mesma razão do cenário 4) | `false` | ⏸️ |

**Veredito: ✅ PASS** no que é mensurável (`subtotal` 9,80 vs 7,35 do cenário 4 é a prova por valor)
· ⏸️ o booleano do log fica pendente do desbloqueio.

---

## Cenário 6 — Cartão recusado (titular **OTHE**) — fecha a Assumption nº3

**Comando:** `POST /v1/orders` com token de cartão Visa gerado com `cardholder.name = "OTHE"`,
`external_reference: probe-othe`, R$ 100,00.

**Medido — HTTP `402`:**

```json
{"errors":[{"code":"failed","message":"The following transactions failed",
            "details":["PAY01KYMB0S2C8YD1XN4Q1BHXKGNK: rejected_by_issuer"]}],
 "data":{"id":"ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7",
         "status":"failed","status_detail":"failed",
         "transactions":{"payments":[{"id":"PAY01KYMB0S2C8YD1XN4Q1BHXKGNK",
             "status":"failed","status_detail":"rejected_by_issuer", …}]}}}
```

| Asserção | Medido | Esperado (spec) | Veredito |
| --- | --- | --- | --- |
| HTTP | **402** | 2xx com `{status:'rejected'}` | ❌ |
| `status` da order | `failed` | `failed` → `rejected` (STA-01) | ✅ mapa correto |
| `status_detail` da order (raiz) | **`"failed"`** | detalhe útil | ❌ genérico |
| `status_detail` do payment | **`"rejected_by_issuer"`** | família `cc_rejected_*` | ❌ |
| Order na raiz do corpo | **não** — vem em `data` | `mp.id` na raiz | ❌ |

### **Assumption nº3: REFUTADA**

`status_detail` observado: **`rejected_by_issuer`** — não é `cc_rejected_*`. `FRIENDLY_MESSAGES` não
tem essa chave, então `friendlyMessage` cai no fallback genérico. **STA-04 não se sustenta como
escrito**: o mapa precisa ganhar o vocabulário do Orders (`rejected_by_issuer`, e provavelmente os
irmãos que os outros titulares de teste produzem) ou passar a mapear por prefixo.

### 🐞 Dois defeitos derivados, medidos

1. **Recusa vira erro genérico.** Com HTTP 402, `handlers.ts` entra em `!mpRes.ok || !mp?.id`; como
   402 < 500 e o corpo existe, cai no ramo 4xx e responde **`400` com `mp.message`** — que na raiz
   é `undefined` (a mensagem está em `errors[0].message`) ⇒ a cliente recebe *"Não foi possível criar
   o pagamento"*. O contrato `{ status: 'rejected', status_detail }` de STA-03/STA-04 **nunca é
   emitido**, e `resolveCardOutcome` nunca roda no cartão recusado.
2. **A order recusada fica órfã.** Como o ramo de erro retorna antes de gravar, `mp_order_id` da
   order `ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7` não é persistido — e ela existe no MP.

Corolário para `resolveCardOutcome`: mesmo depois de tratar o 402, ele lê `order.status_detail`
(raiz), que na recusa é o inútil `"failed"`. O detalhe acionável vive em
`transactions.payments[0].status_detail`.

**Veredito: ❌ FAIL — Assumption nº3 refutada e dois defeitos de tratamento expostos.**

### 🔧 D3 + D4 + D6 — corrigidos (STA-04 reescrita na spec)

Os três defeitos deste cenário eram camadas do mesmo engano: supor que uma recusa chega como 2xx com
o vocabulário da API antiga na raiz da order.

- **D3 (transporte × negócio).** `handlers.ts` resolve a order de **qualquer** das duas posições
  (`mp.id` ou `mp.data.id`). Com order resolvida, o desfecho é de negócio: `mp_order_id`,
  `mp_payment_id` e `mp_status_detail` são persistidos — **acabou a order órfã** — e o cartão responde
  **200** com `{ status, status_detail }` internos. 502 fica para rede, 5xx e "nenhuma order
  resolvível"; 4xx sem order segue 400, agora lendo `errors[0].message` em vez do `message` da raiz,
  que no Orders **não existe**. Teste de regressão usa o **corpo 402 exato** medido acima.
- **D4 (vocabulário).** `status.ts` ganhou a chave `rejected_by_issuer` e uma **ponte por prefixo**:
  chave inexistente que começa com `rejected_` é tentada como `cc_rejected_<resto>`. Nenhuma outra
  chave foi inventada — só a medida e a ponte —, então os irmãos que os outros titulares de teste
  produzem reaproveitam mensagens já escritas, e um motivo sem par cai no fallback em vez de mentir.
- **D6 (posição de leitura).** `resolveCardOutcome` prefere
  `transactions.payments[0].status_detail` e cai para a raiz quando ausente.

Efeito combinado, verificado por teste: o mesmo 402 que devolvia *"Não foi possível criar o
pagamento"* agora devolve `{ status: 'rejected', status_detail: 'rejected_by_issuer' }`, que a tela
traduz para *"O banco emissor recusou o pagamento. Tente outro cartão."*

---

## Cenário 7 — Webhook ✅ (com um achado sério à parte)

### 7a. Notificações reais do MP: **8 de 8 rejeitadas por assinatura** ❌

O MP **entregou** notificações pelo túnel — 2 por order criada, correlacionadas ao segundo:

```
2026-07-28T12:20:34.957Z {"action":"webhook","status":"invalid_signature"}   ← probe-a2 (PIX)
2026-07-28T12:20:35.625Z {"action":"webhook","status":"invalid_signature"}
2026-07-28T12:25:32.129Z {"action":"webhook","status":"invalid_signature"}   ← probe-visa
2026-07-28T12:25:32.738Z {"action":"webhook","status":"invalid_signature"}
2026-07-28T12:26:02.726Z {"action":"webhook","status":"invalid_signature"}   ← probe-othe
2026-07-28T12:26:03.121Z {"action":"webhook","status":"invalid_signature"}
2026-07-28T12:26:25.725Z {"action":"webhook","status":"invalid_signature"}   ← order do pedido 70eb87ff
2026-07-28T12:26:26.070Z {"action":"webhook","status":"invalid_signature"}
```

Todas responderam **401**, nenhuma teve efeito. **O túnel foi descartado como suspeito**: um request
assinado com o segredo do `.env`, enviado **pela URL pública do túnel**, foi aceito
(`HTTP 200`, `applied:false` sobre uma order já aprovada). Logo o cloudflared preserva
`x-signature`, `x-request-id` e corpo.

⇒ Restam duas hipóteses, e desambiguar exige o painel:
**(i)** o `MERCADO_PAGO_WEBHOOK_SECRET` do `.env` ≠ o segredo da aplicação no painel do MP; ou
**(ii)** o MP assina o tópico `order` com um manifest diferente de
`id:<data.id minúsculo>;request-id:<x-request-id>;ts:<ts>;`.
`MERCADO_PAGO_WEBHOOK_SECRET` está carregado no edge runtime (64 caracteres, idêntico ao `.env`),
então "segredo ausente" está descartado.

#### 🔧 D2 — hipótese (i) eliminada, (ii) confirmada e corrigida

A conferência do painel fechou o **(i)**: o segredo cadastrado é **idêntico** ao do `.env`. Sobrou o
manifest, e a causa é visível nos próprios ids desta sessão: `buildManifest` faz
`parts.dataId.toLowerCase()`. Na Payments API o `data.id` era **numérico** (`170892698670`) e o
lowercase era **no-op** — foi por isso que a premissa "o manifest é o mesmo" passou pela revisão. No
Orders o id é **MAIÚSCULO** (`ORDTST01KYMAZV96DKQHXSZB5FG0K86E`), então lowercasear muda a string
assinada e o HMAC não bate. É consistente com 7b: quando **nós** assinamos, assinamos o manifest em
minúsculas — a mesma string que o código monta —, então batia.

**Fix:** `buildManifestCandidates(parts)` devolve os manifests distintos, **primeiro com o `dataId`
como recebido**, depois em minúsculas (dedup quando iguais — ids numéricos ⇒ 1 candidato). O handler
valida contra cada candidato e aceita no primeiro que casar. `buildManifest` **não** foi alterado: o
lowercase é o template documentado do tópico de pagamentos e o teste que o trava é legítimo.

Isso **não afrouxa segurança**: os dois candidatos derivam do `data.id` recebido — nenhum campo novo
entra no manifest — e cada um exige um HMAC válido produzido com o segredo. Assinatura ausente,
adulterada, com `ts` trocado ou de outro segredo continua falhando nos dois. Coberto por teste.

### 7b. Webhook assinado por nós: **PASS integral** ✅

Notificação `{"type":"order","action":"order.updated","data":{"id":"ORDTST01KYMB1FZ8MHS203YQ6A1TA2A3"}}`,
assinada com HMAC-SHA256 sobre `id:ordtst01kymb1fz8mhs203yq6a1ta2a3;request-id:…;ts:…;`.

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| HTTP | `200 {"received":true}` | 200 | ✅ |
| Lookup | por `external_reference` (o pedido tinha `mp_order_id` null) | WHK-03 caminho 1 | ✅ |
| Log | `{"action":"webhook","order_id":"70eb87ff-…","mp_order_id":"ORDTST01KYMB1FZ8MHS203YQ6A1TA2A3","mp_payment_id":"PAY01KYMB1FZP6XY5H2G9C1P7Z3CQ","status":"processed","applied":true}` | `applied:true`, log com `mp_order_id` (LOG-01) | ✅ |
| `orders.payment_status` | `approved` | `approved` | ✅ |
| `orders.paid_at` | `2026-07-28 12:28:12.62158+00` | preenchido | ✅ |
| `orders.mp_payment_id` | `PAY01KYMB1FZP6XY5H2G9C1P7Z3CQ` | id do payment (PER-03) | ✅ |
| `orders.mp_status_detail` | `accredited` | detalhe gravado | ✅ |
| `products.stock_total` (Gato Pão) | **50 → 49** | −1 exatamente | ✅ |

**Reenvio da mesma notificação** (novo `x-request-id`/`ts`, mesma order):

| Asserção | Medido | Esperado | Veredito |
| --- | --- | --- | --- |
| HTTP | `200 {"received":true}` | 200 | ✅ |
| Log | `…,"status":"processed","applied":false}` | no-op | ✅ |
| `paid_at` | `2026-07-28 12:28:12.62158+00` (**inalterado**) | inalterado | ✅ |
| `products.stock_total` | **49** (sem 2º decremento) | 49 | ✅ |

**Segunda passagem, pedido do cenário 4** (`b86c38e5-…` ↔ `ORDTST01KYMBH5B06329YMT7BK7RP09S`):
`applied:true`, `payment_status='approved'`, `paid_at=2026-07-28 12:35:09.879641+00`,
estoque **Gato Pão 49 → 48** e **Among Us 40 → 39** — os dois itens, uma vez cada. ✅

**Veredito: ✅ PASS para WHK-01/02/03/04, PER-03 e a idempotência da RPC** — com o handler
funcionando exatamente como projetado quando a assinatura confere · ❌ **FAIL na entrega real**,
por divergência de segredo/manifest (7a).

### Achado menor: o webhook não grava `mp_order_id`

Quando o pedido é localizado por `external_reference` e o alvo é `approved`, o caminho passa pela RPC
`apply_payment_approval`, que não escreve `mp_order_id`. Resultado medido: pedido `70eb87ff-…` ficou
`approved` com `mp_order_id` **null**. Hoje isso não aparece porque `create-payment` deveria ter
gravado antes — mas é justamente o fallback de WHK-03 que fica cego para a próxima notificação.

**🔧 D7 — corrigido no handler, sem tocar no SQL.** O `handlers.ts` grava `mp_order_id` no caminho
`approved` quando o valor do pedido difere do da notificação. A **RPC segue intacta** (assinatura e
corpo), o que preserva PER-03 e a idempotência provada em 7b; a escrita é condicional de propósito,
para não gerar update redundante no caso comum (o pedido já tem o id gravado por `create-payment`).
Teste assevera a escrita a partir de um pedido com `mp_order_id` null — o estado exato medido aqui.

---

## Placar

| Cenário | Veredito | Em uma linha |
| --- | --- | --- |
| 1 · PIX com CPF | ❌ FAIL | 400 do MP: `notification_url` não permitido; `mp_order_id`/`mp_payment_id` ficam null |
| 2 · Cartão, CPF divergente | ⏸️ NÃO CONCLUSIVO | bloqueado, **e** a API não devolve `payer` |
| 2b · `statement_descriptor` | ✅ PASS (b) | `"NANAPIN"` ecoado em `payment_method` — posição confirmada |
| 3 · Pedido sem CPF | ✅ PASS | 422, `missing_payer_cpf`, nenhuma order no MP |
| 4 · Bump + cupom `percent` | ✅ PASS | `R$ 16,18` == `16.18` == `"16.18"` == `"16.18"` cobrado |
| 5 · Bump desligado | ✅ PASS | subtotal `9.80` a preço cheio (vs `7.35` com bump) |
| 6 · Cartão recusado | ❌ FAIL | 402 + `rejected_by_issuer`; Assumption nº3 **refutada** |
| 7 · Webhook | ✅ PASS (assinado) / ❌ FAIL (entrega real) | efeitos e no-op corretos; 8/8 notificações do MP em 401 |

## Defeitos abertos por esta validação

| # | Severidade | Defeito | Evidência | Status |
| - | --- | --- | --- | --- |
| D1 | **bloqueante** | `notification_url` no corpo do `POST /v1/orders` ⇒ 400 em **todo** pagamento | `unsupported_properties … '$.notification_url' not allowed` | ✅ corrigido |
| D2 | **alta** | Notificações reais do MP rejeitadas (`invalid_signature`) — segredo do painel ou manifest do tópico `order` | 8/8 em 401; curl assinado pelo mesmo túnel = 200 | ✅ corrigido (manifest: id maiúsculo) |
| D3 | **alta** | Cartão recusado responde **402** com a order em `data.*`; handler devolve 400 genérico e nunca emite `{status:'rejected'}` | corpo do cenário 6 | ✅ corrigido |
| D4 | **alta** | `status_detail` de recusa é `rejected_by_issuer`, fora de `cc_rejected_*` ⇒ STA-04/`friendlyMessage` no fallback | cenário 6 | ✅ corrigido (chave + ponte de prefixo) |
| D5 | **média** | `expires_at` recebe `"PT30M"` ⇒ `new Date()` inválido no cronômetro do PIX; expiração real é +24h | cenário 1 | 🟡 metade corrigida (`expires_at` calculado) · **onde configurar a expiração real segue aberto** |
| D6 | **baixa** | `resolveCardOutcome` lê `status_detail` da raiz (`"failed"`); o detalhe útil está em `transactions.payments[0]` | cenário 6 | ✅ corrigido |
| D7 | **baixa** | Webhook não persiste `mp_order_id` no caminho `approved` | cenário 7b | ✅ corrigido (sem tocar na RPC) |
| D8 | **baixa** | Comentários citam ids `01J…`/`pay_…`; reais são `ORDTST01K…`/`PAY01K…` | cenário 1 | ✅ corrigido |
| D9 | **cosmético** | Chip do cupom mostra `R$ 0,73`, linha de totais `R$ 0,74` na mesma tela | cenário 4 | ⏭️ fora de escopo (UI da loja) — em `context.md` → *Deferred Ideas* |

**Ainda aberto depois da rodada de fixes:** a metade de D5 (onde o PIX aceita a janela de expiração —
o `expiration_time: "PT30M"` da raiz não foi aplicado e a real saiu em +24h) e a **reexecução do
roteiro em sandbox**: os fixes estão provados por teste, e os que dependem do MP de verdade
(notificação real chegando em 200, order de recusa não-órfã no painel, PIX end-to-end com D1 fora do
caminho) só fecham numa nova passada de runtime.

## Ids reais usados

| Uso | `mp_order_id` | `mp_payment_id` | `external_reference` |
| --- | --- | --- | --- |
| PIX (probe cenário 1) | `ORDTST01KYMAPS387GPYD6WV2YA8VEBJ` | `PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1` | `probe-a2` |
| Cartão APRO (2b) | `ORDTST01KYMAZV96DKQHXSZB5FG0K86E` | `PAY01KYMAZV9MY6S2FZAC6FASWTYG` | `probe-visa` |
| Cartão OTHE (6) | `ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7` | `PAY01KYMB0S2C8YD1XN4Q1BHXKGNK` | `probe-othe` |
| Aprovação webhook (7) | `ORDTST01KYMB1FZ8MHS203YQ6A1TA2A3` | `PAY01KYMB1FZP6XY5H2G9C1P7Z3CQ` | `70eb87ff-8864-4565-9215-7fa2c8672cc4` |
| Aprovação do bump (4/7) | `ORDTST01KYMBH5B06329YMT7BK7RP09S` | `PAY01KYMBH5BFMPK6472N1RGZ8ZFA` | `b86c38e5-2e60-4195-a298-d37c68adbde3` |

Pedidos na loja: `70eb87ff-…` (14,55 · approved) · `b86c38e5-…` (16,18 · approved) ·
`102e07d4-…` (19,21 · pending).

## Notas de ambiente

- **Login por OTP está quebrado no local.** `supabase/config.toml` tem `[auth.email.smtp]` apontando
  para o Resend, então o e-mail **não** cai no Mailpit: o `POST /auth/v1/otp` devolve **500** com
  `550 You can only send testing emails to your own email address (rafael@aproximma.com.br)`.
  Contorno usado: login **por senha** com a credencial de desenvolvimento documentada em
  `supabase/seed.sql:204` (`admin@nanapin.dev` / `admin123`), cujo `customers` recebeu
  `name='Mariana Souza Lima'` e `cpf='39053344705'`. Para voltar ao Mailpit basta comentar o bloco
  `[auth.email.smtp]` e reiniciar — o próprio arquivo documenta isso.
- **Melhor Envio indisponível** (`/functions/v1/melhor-envio?action=quote` → 500). O checkout caiu no
  fallback "Correios Frete padrão · R$ 9,90", que é o comportamento projetado. Não afeta os
  cenários.
- `store_settings.checkout` foi restaurado ao estado inicial
  (`{"order_bump_enabled": false, "order_bump_product_id": null, "order_bump_discount_percent": 50}`).
  `customers.cpf` do usuário de teste ficou preenchido de propósito (é pré-requisito do roteiro).
- Estoques após a sessão: **Gato Pão 48** (era 50), **Among Us 39** (era 40) — decrementos legítimos
  das duas aprovações.

## Impacto no traceability da spec

| Requisito | Status após T16 | Após a rodada de fixes |
| --- | --- | --- |
| ORD-01, ORD-02, ORD-04, ORD-05 | corpo correto — provado pelo probe, **não** pelo caminho de produção (D1) | corpo destravado (D1); runtime pendente de reexecução |
| ORD-03 | ✅ **confirmado em runtime** | ✅ inalterado |
| ORD-06 | ❌ `expires_at` inutilizável (D5) | 🟡 **AC reescrita**: `expires_at` calculado por `pixExpiresAt`; a janela real no MP segue aberta |
| ORD-07 | ❌ 402 não é tratado (D3) | ✅ **AC estendida**: order em `data` ⇒ desfecho de negócio; 502 só para transporte |
| STA-01 (`failed`→`rejected`) | ✅ o mapa está certo; o caminho não chega nele (D3) | ✅ o caminho chega nele agora |
| STA-02 (`action_required`+`waiting_transfer`) | ✅ observado no PIX real | ✅ inalterado |
| STA-03 | ⏸️ não exercitado (nenhuma order voltou `action_required` fora do PIX) | ⏸️ segue não exercitado em runtime |
| STA-04 | ❌ **Assumption nº3 refutada** (D4) | ✅ **AC reescrita** com o vocabulário medido + ponte de prefixo (D4) e a posição de leitura correta (D6) |
| WHK-01…WHK-04, PER-03 | ✅ com assinatura válida; ❌ na entrega real (D2) | ✅ **WHK-02 reescrita** (candidatos de manifest); entrega real pendente de reexecução |
| PER-01, PER-02 | ⏸️ colunas existem; nunca preenchidas por `create-payment` (D1) | ⏸️ pendente de runtime; a recusa também passa a preencher (D3) |
| PGD-04 | ⏸️ **não asseverável por esta API**; guard 422 ✅ (cenário 3) | ⏸️ inalterado — limitação medida da API, não pendência de execução |
| BMP-04 | ✅ **PASS** — igualdade até o centavo com cupom `percent` | ✅ inalterado |
| RTY-01…RTY-03 | ⏸️ não exercitado (nenhum pedido chegou a ter `mp_order_id`) | ⏸️ pendente de runtime |
| LOG-01 | ✅ nos caminhos alcançados | ✅ o webhook também persiste `mp_order_id` (D7) |

---
---

# Verificação independente (Verifier)

**Data:** 2026-07-28 · **Verifier:** sub-agente independente (autor ≠ verificador)
**Spec:** `.specs/features/09-checkout-orders-api/spec.md` (fonte de verdade)
**Superfície do diff:** working tree vs `HEAD` (`8184087`) + arquivos untracked — não há commits ainda
(override de commits do `CLAUDE.md`)
**Operating checklist:** `.claude/skills/tlc-spec-driven/references/validate.md`

> Esta seção foi **apendada**. Nada acima dela foi alterado: o relatório de sandbox do T16 contém
> evidência medida que não se reproduz sem rodar o sandbox de novo.

## Veredito

**❌ FAIL** — não por defeito de produção, mas por **lacuna de discriminação dos testes**: 3 de 10
mutações de comportamento injetadas no caminho do dinheiro **sobreviveram**. O código como está
escrito está correto; o que falta é a rede que impede alguém de quebrá-lo amanhã.

| Eixo | Resultado |
| --- | --- |
| Gate `pnpm turbo run test --force` | ✅ exit 0 — functions **47** · core **300** · backoffice **62** · store **372** = **781** |
| Gate `pnpm build` | ✅ exit 0 (2 tasks) |
| ACs com evidência `file:line` + valor | **24/24** rastreadas · **2 ⚠️ spec-precision gaps** |
| Sensor de discriminação | **10 mutações · 7 killed · 3 survived** ❌ |
| Fronteira por diff (Success Criteria) | ✅ `pricing.ts`, `payer.ts`, `CardPaymentBrick.tsx` e `apps/store/src/**` intocados (exceção autorizada: `test/setup.ts`) |
| Coverage Expectation da matriz (handlers) | ❌ **não atendida** — ver Lacuna 4 |

---

## Sensor de discriminação (P0 — caminho de pagamento)

Mutações aplicadas em **estado descartável** (cópia byte-exata em scratchpad, restaurada e conferida
por `md5sum` após cada rodada). `git status`, `git stash list` e os três hashes voltaram idênticos ao
baseline no fim — nenhuma mutação tocou a árvore real.

| # | Arquivo:linha | Mutação | Killed? |
| - | --- | --- | --- |
| M1 | `packages/core/src/payment/orders.ts:70` | `value.toFixed(2)` → `toFixed(1)` | ✅ Killed (core 5 falhas, functions 1) |
| M2 | `packages/core/src/payment/orders.ts:164` | `statusDetail !== WAITING_TRANSFER` → `===` | ✅ Killed (core 4, functions 1) |
| M3 | `packages/core/src/payment/webhookSignature.ts:46` | `buildManifestCandidates` devolve só o candidato minúsculo | ✅ Killed (core 1, functions 1) |
| M4 | `supabase/functions/mercado-pago/handlers.ts:482` | remove `mp_order_id: mpOrderId` do update de sucesso | ✅ Killed (functions 3) |
| M5 | `handlers.ts:448-449` | `mpRes.status >= 500` → `> 500` nos dois ramos | ✅ Killed (functions 1) |
| M6 | `handlers.ts:353` | `items: pricingItems` → `items: bumpedItems` (**desconto do bump aplicado duas vezes**) | ❌ **SURVIVED** — 47/47 e 300/300 verdes |
| M7 | `handlers.ts:387` | `payer: mergePayer(card.payer, orderPayer)` → `payer: card.payer` | ✅ Killed (functions 1) |
| M8 | `handlers.ts:413` | reintroduz `notification_url` na raiz do corpo | ✅ Killed (functions 2 — o lock de chaves de raiz **funciona**) |
| M9 | `handlers.ts:401` | PIX: `payer: orderPayer` → `payer: { email }` (perde `identification`/`first_name`/`last_name`) | ❌ **SURVIVED** — 47/47 verdes |
| M10 | `handlers.ts:252` | `if (!orderPayer.identification)` → `if (false)` (**apaga o guard 422 de PGD-04**) | ❌ **SURVIVED** — 47/47 verdes |

**Depth:** P0-full (10 mutações, acima do mínimo de 5). **Resultado: 7/10 — ❌ FAIL.**

As três sobreviventes têm **uma raiz comum**: `__tests__/handlers.test.ts` só exercita o handler com a
fixture `paymentRows()`, que tem `store_settings: null` e `coupon_id: null`, e **nenhum** teste entra
nos guards que antecedem a chamada ao MP. Tudo que acontece antes do `fetch` — CPF, itens, bump,
cupom, ownership, status — está fora do alcance da suíte.

---

## ACs — verificação spec-anchored (evidence-or-zero)

### P1 · Pagamento criado pela API de Orders

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **ORD-01** endpoint + envelope | `POST /v1/orders`, `type:"online"`, `processing_mode:"automatic"`, `external_reference`=uuid, `expiration_time:"PT30M"` | `handlers.test.ts:170-175` — `expect(call.url).toBe('https://api.mercadopago.com/v1/orders')`, `expect(call.body.type).toBe('online')`, `…processing_mode).toBe('automatic')`, `…external_reference).toBe(ORDER_ID)`, `…expiration_time).toBe('PT30M')` · `orders.test.ts:58-73` | ✅ PASS |
| **ORD-02** valores string 2 casas, idênticos | `48`→`"48.00"`, `48.5`→`"48.50"`; `total_amount` == `payments[0].amount` | `handlers.test.ts:177-178` — `expect(call.body.total_amount).toBe('48.00')` + `…payments[0].amount).toBe('48.00')` · `orders.test.ts:41-52, 77-89` — `expect(payload.total_amount).toBe(payload.transactions.payments[0].amount)` | ✅ PASS |
| **ORD-03** cartão: `payment_method` completo, `statement_descriptor` **não** na raiz | `{id, type:"credit_card", token, installments, statement_descriptor:"NANAPIN"}` | `handlers.test.ts:201-208` — `toEqual({id:'master',type:'credit_card',token:'card-token-xyz',installments:3,statement_descriptor:'NANAPIN'})`; `:263` — `expect(call.body).not.toHaveProperty('statement_descriptor')` · `orders.test.ts:96-108` | ✅ PASS |
| **ORD-04** PIX: `{id:"pix",type:"bank_transfer"}`, sem `date_of_expiration` | idem | `handlers.test.ts:180-184` — `toEqual({id:'pix',type:'bank_transfer'})` + `not.toHaveProperty('date_of_expiration')` · `orders.test.ts:115-125` | ✅ PASS |
| **ORD-05** `X-Idempotency-Key` do cliente | header == `idempotency_key` recebido | `handlers.test.ts:227` — `expect(call.headers['X-Idempotency-Key']).toBe('idem-abc')` | ✅ PASS |
| **ORD-06** PIX responde `{qr_code, qr_code_base64, expires_at}`, `expires_at` = `now + 30min` | `12:00Z` → `12:30:00.000Z` | `handlers.test.ts:324-328` — `resolves.toEqual({qr_code:'PIX-COPIA-E-COLA', qr_code_base64:'cXItYmFzZTY0', expires_at:'2026-07-28T12:30:00.000Z'})` com fake timers em 12:00Z; `:347-349` — `expect(body.expires_at).not.toBe('PT30M')` + `Number.isNaN(...) === false` · `orders.test.ts:209, 213-215, 222` | ✅ PASS |
| **ORD-06** edge: sem `qr_code` | `{qr_code:'', qr_code_base64:null}` | `orders.test.ts:173-179` + `:181-191` (3 formas degeneradas, `not.toThrow`) | ✅ PASS |
| **ORD-07a** 5xx / rede / 2xx-sem-order → 502, **nenhum** `mp_order_id` gravado | 502 + `"Não foi possível iniciar o pagamento. Tente novamente."` | `handlers.test.ts:352-379` — 4 casos (`500`, `networkError`, `201` sem id, `503` **com order em `data`**); `expect(response.status).toBe(502)`, mensagem por valor, `expect(supabase.updates.filter(u => 'mp_order_id' in u.values)).toHaveLength(0)` | ✅ PASS |
| **ORD-07b** 4xx sem order → 400 com mensagem do MP | `errors[0].message`, ou `message`, ou genérica | `handlers.test.ts:381-401` (`message` da raiz) · `:619-652` (`errors[0].message` = `'Properties not supported'`) · `:403-415` (`'Não foi possível criar o pagamento'`) | ✅ PASS |
| **ORD-07c/D3** order em `data` ⇒ negócio, não transporte | 200 `{status:'rejected', status_detail:'rejected_by_issuer'}` + ids persistidos | `handlers.test.ts:573-585` — `expect(response.status).toBe(200)` + `resolves.toEqual({status:'rejected', status_detail:'rejected_by_issuer'})` sobre o **corpo 402 exato** do T16; `:587-603` — `objectContaining({mp_order_id, mp_payment_id, mp_status_detail:'rejected_by_issuer', payment_status:'rejected'})`; `:605-617` — `expect(entry.mp_http).toBe(402)` | ✅ PASS |
| **D1** (não é AC; regressão do bloqueador) | corpo tem só as 7 chaves de raiz aceitas | `handlers.test.ts:252-263` — `expect(Object.keys(call.body).sort()).toEqual([...7 chaves])`, PIX e cartão. **Confirmado por M8**: reintroduzir `notification_url` quebra 2 testes | ✅ PASS |

### P1 · Status e webhook no vocabulário do Orders

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **STA-01** mapa = **união** dos dois vocabulários; desconhecido → `null` | 9 status do Orders + 7 legados; `at_terminal`→null | `status.test.ts:81-92` — `it.each` dos 9 (`processed`→`approved`, `processing`→`pending`, `canceled`→`cancelled`, …) com `expect(mapMpStatus(mp)).toBe(internal)`; `:95-103` — nenhum oficial cai em null; `:66-75` — os 7 legados **seguem** verdes; `:105-112` — `in_mediation`/`''`/`at_terminal` → null | ✅ PASS |
| **STA-02** `action_required` + `waiting_transfer` → `pending` | `pending` | `orders.test.ts:252-256` — `toEqual({status:'pending', statusDetail:'waiting_transfer'})` · `handlers.test.ts:502-519` (contraste PIX: nenhum update `payment_status:'rejected'`) | ✅ PASS |
| **STA-03a** cartão `action_required` ≠ `waiting_transfer` → `payment_status='rejected'` | `rejected`, por valor | `orders.test.ts:258-267` — `pending_challenge`/`pending_capture`/`null` → `toEqual({status:'rejected', statusDetail:detail})` · `handlers.test.ts:490-499` — 200 + `toEqual({status:'rejected', status_detail:'pending_challenge'})` + `updates.some(u => u.values.payment_status === 'rejected')` + `rpcs` vazio | ✅ PASS |
| **STA-03b** "a resposta SHALL trazer uma **mensagem que instrua a trocar de meio**" | mensagem acionável | — nenhum teste liga um detail de STA-03 (`pending_challenge`) ao texto de `friendlyMessage`. `status.test.ts:135-139` só assevera "cai no fallback" e `fallback.length > 0`, não o conteúdo | ⚠️ **Spec-precision gap** |
| **STA-04a** família `cc_rejected_*` preservada | mensagens pt-BR | `status.test.ts:118-133` (pré-existente, segue verde) | ✅ PASS |
| **STA-04b** `rejected_by_issuer` → mensagem do banco emissor | específica, ≠ fallback | `status.test.ts:144-148` — `expect(message).not.toBe(fallback)` + `expect(message).toMatch(/emissor/i)` | ✅ PASS |
| **STA-04c** ponte `rejected_<x>` → `cc_rejected_<x>`; sem par → fallback | mesma mensagem do par | `status.test.ts:150-155` — `toBe(friendlyMessage('cc_rejected_insufficient_amount'))`; `:157-164` — 3 irmãos, `toBe(friendlyMessage('cc_' + detail))`; `:166-167` — `rejected_motivo_que_ninguem_mediu` → `toBe(fallback)` | ✅ PASS |
| **STA-04d/D6** detail lido do **payment**, não da raiz | `rejected_by_issuer` vence `"failed"` | `orders.test.ts:277-294` — raiz `failed` + payment `rejected_by_issuer` ⇒ `toEqual({status:'rejected', statusDetail:'rejected_by_issuer'})`; `:296-304` — fallback para a raiz quando o payment não traz detail | ✅ PASS |
| **WHK-01** `type==="order"`; outros → `{received:true}` sem efeito; consulta `GET /v1/orders/{data.id}` | GET vence o corpo | `handlers.test.ts:832-834` — `expect(fetchDouble.calls[0].url).toBe('…/v1/orders/ORDTST01K…')`; `:846-850` — `type:'payment'` ⇒ 200 `{received:true}`, `calls`/`updates`/`rpcs` todos vazios; `:853-874` — corpo mente `failed`, GET diz `processed` ⇒ `rpcs[0].args.p_status_detail === 'accredited'` | ✅ PASS |
| **WHK-02/D2** `buildManifestCandidates`, aceita o 1º que casar | 2 candidatos derivados do `data.id` recebido | `webhookSignature.test.ts:59-63` — `toEqual([id como recebido, id minúsculo])`; `:65-68` — id numérico ⇒ 1 candidato; `:71-73` — o último candidato **é** `buildManifest` (template intacto) · `handlers.test.ts:950-968` — assinado com id MAIÚSCULO ⇒ 200 **e** `rpcs` com `apply_payment_approval`; `:970-984` — minúsculo também 200 | ✅ PASS |
| **WHK-02** não afrouxou a validação | 401 continua 401 | `handlers.test.ts:45-57` — sem `x-signature` ⇒ 401 **e `fetchDouble.calls` vazio**; `:59-69` — `v1=deadbeef` ⇒ 401; `:986-1001` — assinado com **outro segredo** ⇒ 401 nos dois candidatos, sem chamada ao MP · `webhookSignature.test.ts:108-134` (pré-existentes: `ts` adulterado, secret errado, sem `v1`, sem header) — **nenhuma enfraquecida**. Confirmado por M3: o candidato maiúsculo é load-bearing | ✅ PASS |
| **WHK-03** lookup por `external_reference`, fallback `mp_order_id`, nenhum → `order_not_found` | 3 caminhos | `handlers.test.ts:882-893` (fixture só responde a `eq === 'id'`) · `:901-920` (só a `eq === 'mp_order_id'`) · `:936-942` — 200 `{received:true}`, `updates`/`rpcs` vazios, log `order_not_found` com `mp_order_id` | ✅ PASS |
| **WHK-04** `approved` pela RPC; não-aprovação por `canTransition`; 2º `approved` de outra order → marcador, sem reaplicar | `duplicate_approved_other_order: <id> (<detail>)` | `handlers.test.ts:1017-1028` — `rpcs` `toEqual` com args completos + `updates` vazio; `:1043-1046` — `approved→canceled` só grava `mp_status_detail`; `:1066-1071` — `rpcs` vazio + `updates[0].values` `toEqual({mp_status_detail:'duplicate_approved_other_order: ORDTST01K… (accredited)'})`; `:1082-1085` — duplicado da mesma order ⇒ RPC `false` ⇒ só o detail | ✅ PASS |
| **D7** approved persiste `mp_order_id` (RPC intocada) | escrita quando o pedido tinha `null` | `handlers.test.ts:1102-1106` — `write.values.mp_order_id === MP_ORDER_ID`, `eq === ['id', ORDER_ID]` | ✅ PASS |

### P1 · Rastreabilidade dos ids

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **PER-01** `orders.mp_order_id text` + índice | coluna + índice, idempotente | `supabase/migrations/20260728120000_orders_mp_order_id.sql:23,25` — `add column if not exists mp_order_id text` / `create index if not exists idx_orders_mp_order_id`. Sem teste automatizado **por decisão declarada** na Test Coverage Matrix (`tasks.md:106`, "none — build gate"). Evidência de runtime: cenários 1 e 3 acima consultam a coluna por `psql` e recebem `null`, não erro | ✅ PASS |
| **PER-02** `mp_order_id` + `mp_payment_id` gravados **antes** de qualquer retorno de sucesso | `ORDTST01K…` / `PAY01K…` | `handlers.test.ts:294-301` — `expect(response.status).toBe(200)` e o update com `objectContaining({mp_order_id:'ORDTST01KYMAZV96DKQHXSZB5FG0K86E', mp_payment_id:'PAY01KYMAZV9MY6S2FZAC6FASWTYG'})`, `eq === ['id', ORDER_ID]`; `:591-602` cobre também o caminho recusado. `handlers.ts:479-487` é `await`-ado antes de `json(...)` (479 < 522/530). Confirmado por M4 | ✅ PASS |
| **PER-03** RPC recebe o id do **payment** em `p_mp_payment_id` | assinatura inalterada | `handlers.test.ts:438-447` — `expect(supabase.rpcs).toEqual([{fn:'apply_payment_approval', args:{p_order_id, p_mp_payment_id:'PAY01K…', p_status_detail:'accredited'}}])` (igualdade estrita, não `objectContaining` ⇒ arg extra quebra) · `:1017-1028` no webhook. Nenhuma migration nova toca `apply_payment_approval` | ✅ PASS |

### P2 · Retentativa

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **RTY-01** cancela a order anterior **antes** de criar a nova | `POST /v1/orders/{id}/cancel` precede o create | `handlers.test.ts:682-689` — `expect(cancelCall.url).toBe('…/ORDTST01KAAA…/cancel')`, método POST, `X-Idempotency-Key` presente, e `indexOf(cancelCall) < findIndex(create)` (**ordem asseverada**); `:719-731` — pedido sem `mp_order_id` ⇒ zero chamadas de cancel | ✅ PASS |
| **RTY-02** cancel falho não bloqueia; loga `previous_order_cancel_failed` | 200 + create acontece | `handlers.test.ts:706-715` — 409 e `networkError`: `response.status === 200`, o POST de create ocorre, log com `status === 'previous_order_cancel_failed'` e `mp_order_id` da **anterior** | ✅ PASS |
| **RTY-03** `mp_order_id` passa a apontar para a nova | novo id, ≠ antigo | `handlers.test.ts:742-743` — `toBe(MP_ORDER_ID)` **e** `not.toBe(OLD_MP_ORDER_ID)` | ✅ PASS |

### Observabilidade e herdados da 08

| Critério | Outcome definido na spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **LOG-01** log inclui `mp_order_id`; `bump_applied`/`payer_cpf_present` booleanos; CPF **nunca** | booleanos + ausência do CPF | `handlers.test.ts:459-462` — `entry.mp_order_id` por valor, `bump_applied === false`, `payer_cpf_present === true`, `expect(lines.join('\n')).not.toContain('39053344705')`; `:1122-1124` — webhook com `mp_order_id` + `applied === true` | ✅ PASS |
| **PGD-04a** CPF do **pedido** vence o do Brick (cartão) | `{type:'CPF', number:'39053344705'}` sobrescreve `'00000000191'` | `handlers.test.ts:210` — `expect(call.body.payer.identification).toEqual({type:'CPF', number:ORDER_CPF})` com o Brick mandando `00000000191` em `:127`; `:211` — `payer.email` do Brick preservado; `:212` — `payments[0]` sem `payer`. Confirmado por M7 (killed) | ✅ PASS |
| **PGD-04b** `payer` na **raiz** da order | raiz, não em `transactions` | `orders.test.ts:129-132` — `expect(payload.payer).toEqual(PAYER)`; `:134-137` — `payments[0]` sem `payer` | ✅ PASS |
| **PGD-04c** payload de **PIX** também leva `identification` + `first_name`/`last_name` do servidor | idem cartão | — nenhuma asserção sobre o conteúdo de `call.body.payer` no caminho PIX. O teste D1 (`:252-260`) só trava a **chave** `payer` entre as de raiz. **M9 sobreviveu**: trocar `payer: orderPayer` por `{ email }` mantém 47/47 verdes | ❌ **GAP** |
| **PGD-04d** guard 422 quando o CPF não é válido | 422 antes de qualquer escrita/chamada | Runtime: cenário 3 acima (medido — 422, `missing_payer_cpf`, nenhuma order no MP). Automatizado: **nenhum**. **M10 sobreviveu**: apagar o guard mantém 47/47 verdes | ⚠️ **Sem regressão automatizada** |
| **BMP-04** cobrado == exibido, inclusive cupom `percent` | igualdade até o centavo | Domínio (pré-existente da 08, **fora do diff da 09**): `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts:127-149` (bump + `percent` 10%) e `:193-199` — `expect(store.total).toBe(server.total)` **e** `toBe(87.33)`/`toBe(106.83)` + `expect(store).toEqual(server)`. Runtime: cenário 4 acima — `R$ 16,18` == `16.18` == `"16.18"` == `total_paid_amount "16.18"`. **Mas o `serverTotals` daquele teste é um espelho manual do handler, não o handler**; **M6 sobreviveu** | ⚠️ **GAP de discriminação** |

### Edge cases da spec

| Edge case | Evidência | Result |
| --- | --- | --- |
| total < R$ 0,01 → 422 antes do MP | `handlers.ts:360-362` traduz o throw de `calculateOrderTotals` em 422. Domínio coberto (`pricing.test.ts`); **a tradução no handler não tem teste** | ⚠️ Não coberto no handler |
| pedido sem CPF válido → 422 antes de escrita/MP | runtime (cenário 3); sem teste — ver PGD-04d / M10 | ⚠️ Sem regressão |
| 2xx sem `id` de order → 502, nunca id vazio | `handlers.test.ts:355` (`201`, `{status:'created'}`) + `:378` asserção negativa | ✅ |
| PIX sem `qr_code` → `''` / `null` | `orders.test.ts:173-191` | ✅ |
| webhook `type:"payment"` → `{received:true}` sem efeito | `handlers.test.ts:837-851` | ✅ |
| 4xx **com corpo não parseável** e sem order | cai em 502 (`handlers.ts:449`, ramo `!mpBody`). Nenhum teste; e a spec se contradiz aqui (ORD-07 diz 502 na 1ª cláusula e 400 na 2ª) | ⚠️ **Spec-precision gap** + ramo sem teste |

---

## Lacunas ranqueadas

### 1. BLOCKER — o desconto do order bump pode ser aplicado duas vezes sem nenhum teste vermelho
**AC:** BMP-04 · **Mutação:** M6 · `supabase/functions/mercado-pago/handlers.ts:353`

`calculateOrderTotals` chama `applyOrderBump` internamente (`pricing.ts:104`) e `applyOrderBump`
**não é idempotente** (`pricing.ts:96-99`). Trocar `items: pricingItems` por `items: bumpedItems` —
exatamente o erro que o `CLAUDE.md` documenta em prosa — cobra **metade** do desconto correto no item
do bump (4,90 → 2,45 → 1,23) e **quebra "exibido == cobrado"**, com 47/47 e 300/300 verdes.

Causa: `paymentRows()` (`handlers.test.ts:92-109`) tem `store_settings: null` e `coupon_id: null`, e
`displayedEqualsCharged.test.ts` é um **espelho** do handler (`serverTotals`, `:65-74`), então não
enxerga deriva do handler real. Agora que T6 tornou o handler testável, a prova pode sair do espelho.

**Fix:** um teste de `create-payment` com `store_settings.checkout` (bump on, 50%) + cupom `percent`,
asseverando `call.body.total_amount` **por valor** e `bump_applied: true` no log — o `bump_applied`
que o cenário 4 do sandbox não conseguiu observar.

### 2. MAJOR — PGD-04 no caminho PIX não tem asserção de valor
**AC:** PGD-04 · **Mutação:** M9 · `handlers.ts:401`

O cartão está bem coberto (`handlers.test.ts:210`, M7 killed). O **PIX** — o método em que o MP recusa
o pagamento sem pagador identificado, a razão de existir do AC — não tem nenhuma asserção sobre
`call.body.payer`. Trocar por `{ email }` passa: 47/47.

**Fix:** no teste ORD-01/ORD-04, asseverar `call.body.payer` com `toEqual({email, first_name:'Nana',
last_name:'Pin', identification:{type:'CPF', number:ORDER_CPF}})` — o que também fixa a derivação de
`first_name`/`last_name` a partir de `customers.name` (hoje indistinguível, porque a fixture repete o
mesmo nome em `customers.name` e em `orders.customer_name`).

### 3. MAJOR — o guard 422 de CPF pode ser apagado sem teste vermelho
**AC:** PGD-04 / Edge case · **Mutação:** M10 · `handlers.ts:252`

`if (false)` no lugar do guard: 47/47 verdes. O comportamento **está** provado em runtime (cenário 3,
medido), mas sem regressão automatizada — e é o defeito que a feature 08 veio corrigir.

**Fix:** teste com `customers.cpf = null` ⇒ 422, mensagem por valor, log `missing_payer_cpf` com
`payer_cpf_present: false`, e **`expect(fetchDouble.calls).toHaveLength(0)`** (o ponto do AC é que
nada sai antes do guard).

### 4. MAJOR — a Coverage Expectation declarada para o layer de handlers não foi atendida
`tasks.md:104` exige "caminho felizes + **cada** caminho de erro (401/403/409/422/400/502)".
Medido em `handlers.test.ts`: 400 e 502 cobertos; 401 **só** para assinatura de webhook. Sem nenhum
teste: **401** (create-payment sem JWT / JWT inválido, `handlers.ts:206,211`), **403** (ownership,
`:233`), **404** (pedido inexistente, `:218`), **409** (status não retentável, `:238`), **422** (CPF
`:260`, sem itens `:269`, total < 0,01 `:361`), **400** (dados do cartão incompletos `:381`) e
**500** (`persistError`, `:370`). São 8 ramos de guarda — todos anteriores à chamada ao MP — sem uma
única asserção. T6 declarou "comportamento idêntico — movimentação, não reescrita", e uma movimentação
sem teste dos ramos movidos é precisamente como comportamento desaparece em silêncio.

### 5. MINOR — spec-precision: ORD-07 se contradiz no 4xx-sem-order
A 1ª cláusula manda 502 para "responde sem nenhuma order resolvível"; a 2ª manda 400 para "4xx sem
order resolvível". A implementação decide por presença de corpo parseável (`handlers.ts:449`):
4xx **com** corpo ⇒ 400, 4xx **sem** corpo ⇒ 502. Escolha defensável, mas não é a spec — e o ramo
`4xx + corpo não-JSON` não tem teste. Reescrever a AC para dizer isso explicitamente.

### 6. MINOR — spec-precision: a "mensagem que instrua a trocar de meio" de STA-03 não é asseverada
`friendlyMessage('pending_challenge')` cai no `FALLBACK_MESSAGE`, que por sorte contém "use outro
método de pagamento" (`status.ts:84`) — mas nenhum teste liga um detail de STA-03 a esse texto, e
`status.test.ts:135-139` só verifica `fallback.length > 0`. Trocar o fallback por "Erro." não
quebraria nada e violaria STA-03.

### 7. Higiene do commit (não é AC — para o orquestrador, antes de commitar)
- `x.png` (raiz) e `.playwright-cli/` estão **untracked e não ignorados** — `git add -A` os arrasta
  para o commit da feature.
- `.mcp.json` ganhou o servidor `mercadopago` — mudança de tooling, sem relação com nenhuma AC.
- **`CLAUDE.md:147` continua dizendo que a edge function usa `/v1/payments`** — o próprio bloco
  editado neste diff. Depois de AD-001 isso está factualmente errado no arquivo de instruções.
- `tasks.md:18` diz "Phases 1–4 completas (T1–T13); falta Phase 5" e **todos** os checkboxes de
  "Done when" (T1–T17) seguem `[ ]`; `STATE.md` → *Handoff* aponta "batch 1 completo, próxima T8" e
  ainda lista `notification_url` como override pendente. A bookkeeping está ~9 tasks atrás do código.

---

## Code Quality

| Princípio | Status | Nota |
| --- | --- | --- |
| Minimum code | ✅ | `orders.ts` só expõe o que os handlers consomem; `MpOrder` declara apenas os campos lidos |
| Surgical changes | ✅ | `buildManifest` intacto; RPC, `pricing.ts` e `payer.ts` intocados |
| No scope creep | ⚠️ | `.mcp.json` (servidor MCP novo) não serve nenhuma AC |
| Matches patterns | ✅ | `Deps` injetadas seguem o molde `melhor-envio`; import relativo com `.ts` documentado |
| Spec-anchored outcome check | ⚠️ | 2 spec-precision gaps (lacunas 5 e 6) |
| Per-layer Coverage Expectation | ❌ | Lacuna 4 — 8 ramos de guarda do handler sem teste |
| Todo teste mapeia a uma AC / edge case / Done-when | ✅ | cada `describe`/`it` cita o ID (ORD-*, STA-*, WHK-*, PER-*, RTY-*, LOG-01, D1…D8). Nenhum teste órfão |
| Guidelines documentadas seguidas | ✅ | `CLAUDE.md` (monorepo; `pnpm lint` fora do gate por dívida pré-existente), `tasks.md` (matriz + gates) |
| Fronteira por diff (T17) | ✅ | `pricing.ts`, `payer.ts`, `CardPaymentBrick.tsx`, `apps/store/src/**` fora do diff — exceções `webhookSignature.ts` (D2) e `test/setup.ts` **declaradas e justificadas** na spec, não escondidas |

**Comentário de mérito:** três coisas aqui são melhores que o padrão e merecem registro — o teste que
trava as **chaves de raiz por igualdade** (`handlers.test.ts:252-260`), que M8 provou capturar a
regressão do `notification_url`; o uso do **corpo 402 literal medido em sandbox** como fixture
(`:533-555`) em vez de um corpo inventado; e o `signManifest` do teste (`:762-778`), que reimplementa
o HMAC **independentemente** de `webhookSignature.ts` em vez de chamar o código sob teste.

---

## Integridade dos testes

| Pacote | Antes da feature | Agora | Δ |
| --- | --- | --- | --- |
| `@nanapin/functions` | 0 (pacote não existia) | **47** | +47 |
| `@nanapin/core` | 284 | **300** | +16 |
| `@nanapin/backoffice` | 62 | **62** | 0 |
| `@nanapin/store` | 372 | **372** | 0 |
| **Total** | 718 | **781** | **+63** |

Nenhum teste `skip`. Nenhuma contagem caiu. As asserções alteradas em `orders`/`handlers`/`status`
foram as que codificavam o contrato **defeituoso** medido no T16 (`extractPixData` devolvendo o echo
de `expiration_time`; ids de fixture no formato inventado) — enfraquecimento **não** encontrado: as
substitutas são mais específicas (`toEqual` por valor, `expires_at` absoluto e ids reais).

## Estado da árvore de trabalho

`git status --porcelain`, `git stash list` e os `md5sum` de `orders.ts`, `webhookSignature.ts` e
`handlers.ts` conferidos **idênticos ao baseline** depois da última mutação. Nenhum arquivo de
produção ou de teste foi escrito por esta verificação — apenas esta seção apendada.

## Traceability sugerida (não aplicada — o Verifier não escreve na spec)

| Requisito | Status sugerido |
| --- | --- |
| ORD-01 … ORD-07, STA-01, STA-02, STA-04, WHK-01 … WHK-04, PER-01 … PER-03, RTY-01 … RTY-03, LOG-01 | ✅ Verified |
| STA-03 | ⚠️ Verified com spec-precision gap (a metade "mensagem") |
| PGD-04 | ❌ Needs Fix (PIX sem asserção de valor; guard 422 sem regressão) |
| BMP-04 | ❌ Needs Fix (discriminação: o mutante de duplo desconto sobrevive) |


---
---

# T18 — Fechamento das lacunas do Verifier

**Data:** 2026-07-28 · **Escopo:** só **testes e specs**. **Nenhuma linha de produção foi alterada** —
`md5sum` de `handlers.ts` (`5f30037d…`) e `status.ts` (`682b1615…`) conferidos idênticos ao baseline
depois da última mutação; `git stash list` vazio.

> Esta seção foi **apendada**. Nada acima dela foi alterado.

## Veredito da rodada

| Eixo | Antes (Verifier) | Depois (T18) |
| --- | --- | --- |
| Sensor de discriminação | 10 mutações · **7 killed · 3 survived** ❌ | as 3 sobreviventes **killed**, + 7 mutações novas · **10/10 killed** ✅ |
| Coverage Expectation (handlers) | ❌ 8 ramos de guarda sem teste | ✅ os 8 com teste, todos asseverando `fetchDouble.calls` vazio |
| ACs com spec-precision gap | 2 (ORD-07, STA-03) | 0 — as duas reescritas, com teste do ramo |
| Gate | functions 47 · core 300 · backoffice 62 · store 372 = **781** | functions **81** · core **303** · backoffice 62 · store 372 = **818**, exit 0 |

Nenhum teste foi enfraquecido, deletado ou pulado. Nenhuma contagem caiu.

## Método — mutação medida, não argumento

Para cada lacuna: (1) escrever o teste e vê-lo verde no código correto; (2) aplicar a mutação **no
arquivo de produção real**, rodar a suíte, registrar quais testes ficaram vermelhos; (3) restaurar da
cópia de baseline no scratchpad e conferir por `cmp` + `md5sum`. Teste que não fica vermelho sob a
mutação **não** fecha lacuna e não foi declarado fechado.

## Mutações e testes que morreram

| # | Arquivo:linha | Mutação | Testes vermelhos |
| - | --- | --- | --- |
| **M6** | `handlers.ts:353` | `items: pricingItems` → `items: bumpedItems` (**desconto do bump duas vezes**) | **3** ✅ killed |
| **M9** | `handlers.ts:401` | PIX `payer: orderPayer` → `payer: { email }` | **1** ✅ killed |
| M9b | `handlers.ts:248` | nome do pagador lido de `orders.customer_name` em vez de `customers.name` | **2** ✅ killed (bônus — fixa a fonte do nome) |
| **M10** | `handlers.ts:252` | `if (!orderPayer.identification)` → `if (false)` (**apaga o guard 422**) | **6** ✅ killed |
| G1 | `handlers.ts:206` | `if (!jwt)` → `if (false)` (401 sem header) | **1** ✅ killed |
| G2 | `handlers.ts:211` | guard de `auth.getUser` → `if (false)` (401 JWT rejeitado) | **1** ✅ killed |
| G3 | `handlers.ts:232` | guard de ownership → `if (false)` (403) | **2** ✅ killed |
| G4 | `handlers.ts:218` | guard de pedido inexistente → `if (false)` (404) | **1** ✅ killed |
| G5 | `handlers.ts:236` | guard de `RETRYABLE_STATUSES` → `if (false)` (409) | **3** ✅ killed |
| G6 | `handlers.ts:268` | guard de pedido sem itens → `if (false)` (422) | **1** ✅ killed |
| G7 | `handlers.ts:361` | 422 de total < R$ 0,01 → **400** (deriva de status) | **1** ✅ killed |
| G8 | `handlers.ts:380` | guard de dados do cartão → `if (false)` (400) | **4** ✅ killed |
| G9 | `handlers.ts:369` | `if (persistError)` → `if (false)` (500) | **1** ✅ killed |
| G10 | `handlers.ts:197` | guard de campos obrigatórios → `if (false)` (400) | **3** ✅ killed |
| L5 | `handlers.ts:449,456` | 4xx **sem corpo parseável** passa a 400 genérico em vez de 502 | **1** ✅ killed |
| L6 | `status.ts:84` | `FALLBACK_MESSAGE` → `'Erro.'` | **3** em core **+ 3** em functions ✅ killed |

## Lacuna 1 (BLOCKER) — BMP-04 agora é provado no handler, não no espelho

O `displayedEqualsCharged.test.ts` prova a **aritmética** (`serverTotals` é um espelho manual da
chamada), então era cego para deriva do handler. O teste novo entra pelo handler de verdade, com
`store_settings.checkout` (bump on, 50%, produto **dentro** dos `order_items`) **+** cupom `percent` 10
em `coupons`, e assevera três pontas por valor:

| Ponta | PIX | Cartão |
| --- | --- | --- |
| `total_amount` no corpo capturado pelo `fakeFetch` | `"16.18"` | `"16.51"` |
| `orders.total` persistido | `16.18` | `16.51` |
| `orders.pix_discount` persistido | `0.33` | `0` |
| `bump_applied` no log estruturado | `true` | `true` |

Os números são **os do cenário 4 deste relatório** — subtotal com bump `7,35`, cupom 10% = `0,735`,
exatamente o meio centavo que quebrou a igualdade na 08. Sob a dupla aplicação o item do bump cai
`4,90 → 2,45 → 1,23`, o subtotal vira `6,13` e o total vira **`15,02`** (PIX) / **`15,29`** (cartão):
valores diferentes, teste vermelho. Contraste por valor no mesmo arquivo: bump **desligado** ⇒ subtotal
`9,80` a preço cheio e total `18,28`, com `bump_applied: false` — o booleano que o bloqueador D1 impediu
de observar em runtime.

`order_items.unit_price` do item do bump está gravado **já descontado** (`2,45`) na fixture, como a loja
persistiu de verdade; `products.base_price` é `4,90`. É o que força o servidor a reler o preço cheio.

## Lacuna 2 (MAJOR) — PGD-04 no PIX, por valor

`call.body.payer` passou a ser asseverado com `toEqual` **completo** nos dois métodos. A fixture
`paymentRows()` passou a ter `customers.name = 'Mariana Souza Lima'` contra
`orders.customer_name = 'Nana Pin'`: com os dois nomes iguais, ler a coluna errada era indistinguível
(provado por M9b, que agora mata 2 testes).

## Lacuna 3 (MAJOR) — o guard 422 tem regressão automatizada

Seis casos: `customers.cpf` `null`, DV inválido (`39053344704`) e dígitos todos iguais
(`11111111111`), cruzados com PIX e cartão. Cada um assevera 422, a mensagem de CPF obrigatório **por
valor**, log `missing_payer_cpf` com `payer_cpf_present: false`, CPF nunca logado, e
`expect(fetchDouble.calls).toHaveLength(0)` — o ponto do AC é que nada sai antes do guard. Mais um teste
de contraste (CPF válido ⇒ 1 chamada ao MP), para o conjunto não passar por vacuidade.

## Lacuna 4 (MAJOR) — os 8 ramos de guarda

Cobertos num `describe` próprio, com um caso por ramo (e `it.each` onde o ramo tem variantes reais):
401 sem `Authorization` · 401 JWT rejeitado · 403 nas **duas** formas de não ser dono (`user_id`
divergente e pedido sem `customer_id`) · 404 · 409 (`approved`, `refunded`, `cancelled`) · 422 sem
itens · 422 total < R$ 0,01 (cupom `fixed` consumindo o subtotal) · 400 campos obrigatórios (3
variantes) · 400 dados do cartão (4 variantes) · 500 de persistência (`updateError` do fake). **Todos**
asseveram que o MP não foi chamado.

## Lacuna 5 (MINOR) — ORD-07 deixou de se contradizer

A AC tinha duas cláusulas incompatíveis para 4xx sem order (502 na 1ª, 400 na 2ª). Reescrita em **três
desfechos mutuamente exclusivos** — (a) order resolvível + HTTP < 500 ⇒ negócio; (b) 4xx com corpo JSON
parseável ⇒ 400 com a mensagem do MP; (c) todo o resto ⇒ 502 — que é o que a implementação já fazia. O
ramo (c) para `4xx sem corpo parseável` ganhou teste; `rawBody` entrou no `fakeFetch` porque por
`JSON.stringify` o ramo era **inalcançável** (é a única mudança de comportamento em `fakes.ts`).

## Lacuna 6 (MINOR) — STA-03 assevera o que a cliente lê

**Decisão:** asseverar a **instrução**, não a cópia literal. A resposta ao front não carrega texto: ela
carrega `status_detail`, e a loja o traduz com `friendlyMessage`. A AC foi reescrita para descrever essa
corrente, e o teste a fecha nas duas pontas — `handlers.test.ts` chama a **mesma** `friendlyMessage` que
a loja usa, sobre o `status_detail` que o handler devolveu, e `status.test.ts` trava o fallback no layer
onde ele vive. A asserção é `/use outro método de pagamento/i` sobre os três detalhes de desafio
(`pending_challenge`, `pending_capture`, `pending_review_manual`), não a frase inteira: travar a cópia
completa transformaria qualquer ajuste de redação numa quebra falsa, enquanto a instrução **é** a AC.
`FALLBACK_MESSAGE = 'Erro.'` — que antes passava verde — agora mata 6 testes.

## O que esta rodada NÃO fecha

- **Reexecução do sandbox.** Tudo aqui é prova de teste. Os fixes que dependem do MP de verdade
  (PIX/cartão end-to-end com D1 fora do caminho, notificação real em 200, order de recusa não órfã no
  painel) seguem pendentes de uma nova passada de runtime.
- **A metade aberta de D5**: onde a janela de expiração do PIX é realmente configurada no Orders.
- **PGD-04 por resposta do MP**: continua impossível — a API não devolve `payer`. A garantia é o corpo
  enviado (agora asseverado por valor) + o guard 422.

## Fronteira desta rodada

Arquivos tocados: `supabase/functions/mercado-pago/__tests__/{handlers.test.ts,fakes.ts}`,
`packages/core/src/payment/__tests__/status.test.ts`, `spec.md`, `tasks.md`, `.specs/STATE.md`
(seção `## Handoff` apenas) e este arquivo. `apps/store/**` e `apps/backoffice/**` intocados.


---
---

# Re-verificação independente (iteração 2)

**Data:** 2026-07-28 · **Verifier:** sub-agente independente, **fresco** (não escreveu o T18 e não
herdou o modelo mental de quem escreveu)
**Spec:** `.specs/features/09-checkout-orders-api/spec.md` (fonte de verdade)
**Superfície do diff:** working tree vs `HEAD` (`8184087`) + untracked — sem commits (override do `CLAUDE.md`)
**Operating checklist:** `.claude/skills/tlc-spec-driven/references/validate.md`
**Premissa de trabalho:** o relato do T18 foi tratado como **hipótese a refutar**, não como evidência.
Toda a cobertura foi re-derivada por leitura direta dos arquivos e **todas as mutações foram repetidas
por conta própria**, incluindo as 3 que sobreviveram na iteração 1.

> Esta seção foi **apendada**. Nada acima dela foi alterado — nem o relatório de sandbox do T16, nem a
> seção do Verifier da iteração 1, nem a do T18.

## Veredito

**❌ FAIL** — mas por um motivo **diferente** do da iteração 1, e com uma constatação importante a favor
do T18: **as 3 mutações que sobreviveram antes agora morrem de fato** (verificado por conta própria, não
aceito por relato). O que reprova esta rodada são **4 mutações novas, que ninguém tinha previsto**, no
mesmo caminho do dinheiro — duas delas violando exatamente a cláusula *"o valor cobrado seja idêntico ao
exibido"* de **BMP-04**.

O padrão estrutural é o **mesmo** que a Lacuna 1 da iteração 1 nomeou (*"o teste prova a aritmética num
espelho, não no handler"*). O T18 o fechou para o **order bump**, que era a instância citada; a **classe**
continua aberta em outros dois pontos onde a loja e o servidor mantêm a mesma regra em duas linhas
escritas à mão que precisam concordar.

| Eixo | Iteração 1 | T18 (relatado) | **Iteração 2 (medido por mim)** |
| --- | --- | --- | --- |
| Gate `pnpm turbo run test --force` | ✅ 781 | ✅ 818 | ✅ **exit 0 — 818** (functions **81** · core **303** · backoffice **62** · store **372**) |
| Sensor — as 3 sobreviventes da iteração 1 | ❌ 3 survived | ✅ killed | ✅ **killed, confirmado** (3 · 1 · 6 testes vermelhos) |
| Sensor — 5 mutações **novas**, inventadas nesta rodada | — | — | ❌ **4 survived / 1 killed** |
| Sensor — total desta rodada | — | — | **8 mutações · 4 killed · 4 survived** ❌ |
| Coverage Expectation da matriz (ramos de guarda) | ❌ | ✅ | ✅ **atendida** — cada ramo assevera `fetchDouble.calls` vazio |
| ACs com spec-precision gap | 2 (ORD-07, STA-03) | 0 | ✅ **0 — confirmo as duas reescritas** |
| Fronteira por diff (Success Criteria) | ✅ | ✅ | ✅ **exatamente as 2 exceções declaradas** |

---

## Gate

- **Comando:** `pnpm turbo run test --force` → **exit 0**, 4 tasks successful, 0 cached.
- **Contagens conferidas uma a uma:** `@nanapin/functions` **81** (1 arquivo) · `@nanapin/core` **303**
  (16 arquivos) · `@nanapin/backoffice` **62** (11) · `@nanapin/store` **372** (37) = **818**. Bate com o
  número declarado pelo T18.
- **Skips:** nenhum. `grep` por `.skip`/`.only`/`.todo`/`xit(`/`xdescribe(` nos dois diretórios de teste
  do diff → **zero ocorrências**.
- `pnpm lint` **não** foi executado (dívida pré-existente documentada em `CLAUDE.md`, fora do gate por
  decisão da `tasks.md`).

---

## Sensor de discriminação — parte 1: as 3 sobreviventes da iteração 1

Aplicadas no arquivo de produção real, em estado descartável (cópia byte-exata em scratchpad),
**restauradas e conferidas por `md5sum` na mesma invocação que as aplicou**.

| # | Arquivo:linha | Mutação | Resultado medido |
| - | --- | --- | --- |
| **R1** (era M6) | `handlers.ts:353` | `items: pricingItems` → `items: bumpedItems` (**desconto do bump duas vezes** — era o BLOCKER) | ✅ **KILLED** — 3 testes vermelhos em `handlers.test.ts` (BMP-04: PIX, cartão, cupom inválido) |
| **R2** (era M9) | `handlers.ts:401` | PIX: `payer: orderPayer` → `payer: { email: order.customer_email }` | ✅ **KILLED** — 1 teste (`PGD-04: o PIX leva payer completo na raiz`) |
| **R3** (era M10) | `handlers.ts:252` | `if (!orderPayer.identification)` → `if (false)` (**apaga o guard 422**) | ✅ **KILLED** — 6 testes (3 formas de CPF × 2 métodos) |

**Achado a favor do T18, e é o ponto central da Lacuna 1:** sob **R1**, `@nanapin/core` seguiu **303/303
verde** — isto é, `displayedEqualsCharged.test.ts` continua **cego** ao duplo desconto, e quem mata o
mutante é exclusivamente o teste novo **no handler**. A prova saiu do espelho de verdade. As contagens
vermelhas são idênticas às que o T18 declarou (3 · 1 · 6): o relato se sustentou sob repetição.

## Sensor de discriminação — parte 2: 5 mutações inventadas nesta rodada

Nenhuma destas aparece no relatório do T18 nem no da iteração 1. Todas no caminho do dinheiro de
`create-payment`.

| # | Arquivo:linha | Mutação | Resultado |
| - | --- | --- | --- |
| **V1** | `handlers.ts:312` | base do cupom ignora a quantidade: `reduce((s,i) => s + i.unit_price * i.quantity, 0)` → `reduce((s,i) => s + i.unit_price, 0)` | ❌ **SURVIVED** — 81/81 e 303/303 verdes |
| **V2** | `handlers.ts:354` | cupom `free_shipping` ignorado no servidor: `shipping: freeShipping ? 0 : Number(order.shipping_cost || 0)` → `shipping: Number(order.shipping_cost || 0)` | ❌ **SURVIVED** — 81/81 e 303/303 verdes |
| **V3** | `handlers.ts:324-329` | janela de validade e teto de uso do cupom apagados: `const valid = coupon && coupon.active && (valid_from…) && (valid_until…) && (max_uses…)` → `const valid = coupon && coupon.active` | ❌ **SURVIVED** — 81/81 e 303/303 verdes |
| **V4** | `handlers.ts:298` | oferta do bump ligada por ausência do flag: `order_bump_enabled === true` → `order_bump_enabled !== false` | ❌ **SURVIVED** — 81/81 verdes |
| **V5** | `handlers.ts:312` | base do cupom sobre o subtotal a **preço cheio**: `bumpedItems.reduce(…)` → `pricingItems.reduce(…)` | ✅ **KILLED** — 2 testes (BMP-04 PIX e cartão) |

**Sensor depth:** P0-full (8 mutações nesta rodada; 18 acumuladas na feature).
**Resultado desta rodada: 4/8 killed — ❌ FAIL.**

### Por que V1 e V2 são AC, e não preciosismo

`BMP-04` exige que *"o valor cobrado seja **idêntico** ao exibido"*. A loja e o servidor implementam essa
igualdade em **pares de linhas escritas à mão**, e V1 e V2 quebram um par cada:

| Regra | Linha da loja | Linha do servidor | Protegida? |
| --- | --- | --- | --- |
| base do cupom = subtotal com bump, **somando quantidade** | `useCheckoutTotals.ts:95-99` — `applyOrderBump(...).reduce((sum, item) => sum + item.unit_price * item.quantity, 0)` | `handlers.ts:312` | ❌ só a metade da loja |
| cupom `free_shipping` zera o frete | `useCheckoutTotals.ts:104` — `coupon?.freeShipping ? 0 : (shipping?.cost ?? 0)` | `handlers.ts:354` | ❌ só a metade da loja (+ o espelho) |

- **V1** faz o servidor calcular o desconto do cupom sobre um subtotal menor que o real sempre que algum
  item tem `quantity > 1`. Com a própria fixture `paymentRows()` (2 × R$ 24) e um cupom `percent` de 10%,
  o desconto correto é R$ 4,80 e o mutante desconta sobre R$ 2,40: a cliente paga **R$ 2,40 mais** do que
  o rótulo do CTA mostrou. Sobrevive porque **toda** fixture com cupom no `handlers.test.ts` usa
  `quantity: 1` (`bumpLists:854-863` e o caso de total < R$ 0,01, `:677`).
- **V2** faz o servidor cobrar o frete que a loja mostrou como grátis — a maior divergência absoluta das
  quatro. Sobrevive porque nenhum teste do handler usa cupom `free_shipping`: os únicos que existem estão
  em `displayedEqualsCharged.test.ts:163-178`, e ali quem zera o frete é o helper `shippingOf` (`:44`), um
  **espelho** do handler. É a Lacuna 1 da iteração 1 com outro nome de campo.

V3 e V4 são de menor severidade e **não** são ACs da 09 (lógica de cupom/settings pré-existente que o T6
**moveu** para `handlers.ts`), mas caem na mesma frase que a matriz de cobertura usou para reprovar a
iteração 1: *"movimentação sem teste dos ramos movidos é precisamente como comportamento desaparece em
silêncio"*. O T18 aplicou essa frase aos ramos de **erro**; ela vale igual para a lógica de **valor** que
veio na mesma mudança.

---

## ACs — verificação spec-anchored re-derivada (evidence-or-zero)

Citações **minhas**, obtidas por leitura direta dos arquivos nesta sessão (não copiadas do relatório
anterior). `file:line` + a expressão da asserção; sem citação = não coberto.

### P1 · Pagamento criado pela API de Orders

| Critério | Outcome da spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **ORD-01** | `POST /v1/orders`, `type:"online"`, `processing_mode:"automatic"`, `external_reference`=uuid, `expiration_time:"PT30M"` | `handlers.test.ts:186-191` — `expect(call.url).toBe(ORDERS_ENDPOINT)`, `call.body.type).toBe('online')`, `…processing_mode).toBe('automatic')`, `…external_reference).toBe(ORDER_ID)`, `…expiration_time).toBe('PT30M')` · `orders.test.ts:58-73` | ✅ PASS |
| **ORD-02** | string 2 casas; `total_amount` == `payments[0].amount` | `handlers.test.ts:193-194` — `toBe('48.00')` nos dois campos · `orders.test.ts:42-48, 77-89` — `expect(payload.total_amount).toBe(payload.transactions.payments[0].amount)` | ✅ PASS |
| **ORD-03** | `{id,type:'credit_card',token,installments,statement_descriptor:'NANAPIN'}`; **não** na raiz | `handlers.test.ts:244-251` — `toEqual({id:'master',type:'credit_card',token:'card-token-xyz',installments:3,statement_descriptor:'NANAPIN'})`; `:311` — `not.toHaveProperty('statement_descriptor')` · `orders.test.ts:96-109` | ✅ PASS |
| **ORD-04** | `{id:'pix',type:'bank_transfer'}`, sem `date_of_expiration` | `handlers.test.ts:196-200` — `toEqual({id:'pix',type:'bank_transfer'})` + `not.toHaveProperty('date_of_expiration')` · `orders.test.ts:115-125` | ✅ PASS |
| **ORD-05** | header == `idempotency_key` do cliente | `handlers.test.ts:275` — `expect(call.headers['X-Idempotency-Key']).toBe('idem-abc')` | ✅ PASS |
| **ORD-06** | `{qr_code, qr_code_base64, expires_at}`, `expires_at` = `now+30min` absoluto | `handlers.test.ts:372-376` — `resolves.toEqual({qr_code:'PIX-COPIA-E-COLA', qr_code_base64:'cXItYmFzZTY0', expires_at:'2026-07-28T12:30:00.000Z'})` com fake timers em 12:00Z; `:395-397` — `not.toBe('PT30M')` + `Number.isNaN(new Date(...)) === false` · `orders.test.ts:209-223` | ✅ PASS |
| **ORD-06** edge sem `qr_code` | `{qr_code:'', qr_code_base64:null}` | `orders.test.ts:173-191` (3 formas degeneradas, `not.toThrow`) | ✅ PASS |
| **ORD-07 (a)** order resolvível + HTTP<500 ⇒ negócio | 200 `{status:'rejected', status_detail:'rejected_by_issuer'}` + ids gravados, sobre o corpo 402 medido | `handlers.test.ts:1093-1105` — `toBe(200)` + `resolves.toEqual({status:'rejected', status_detail:'rejected_by_issuer'})`; `:1111-1122` — `objectContaining({mp_order_id, mp_payment_id, mp_status_detail:'rejected_by_issuer', payment_status:'rejected'})`; `:1135` — `expect(entry.mp_http).toBe(402)` | ✅ PASS |
| **ORD-07 (b)** 4xx com corpo JSON ⇒ 400 com msg do MP | `errors[0].message` / `message` / genérica | `handlers.test.ts:446-448` (`message` da raiz) · `:1168-1171` — `toEqual({error:'Properties not supported'})` (`errors[0].message`) · `:461-462` — `toEqual({error:'Não foi possível criar o pagamento'})` | ✅ PASS |
| **ORD-07 (c)** todo o resto ⇒ 502, sem gravar id | 502 + `"Não foi possível iniciar o pagamento. Tente novamente."` | `handlers.test.ts:400-426` — 4 casos (`500`, rede, `201` sem id, **`503` com order em `data`**): status, mensagem por valor e `expect(supabase.updates.filter(u => 'mp_order_id' in u.values)).toHaveLength(0)` | ✅ PASS |
| **ORD-07 (c)** ramo `4xx sem corpo parseável` (era a contradição) | 502, não 400 | `handlers.test.ts:468-498` — `rawBody` HTML em 403 ⇒ `toBe(502)`, mensagem por valor, nenhum `mp_order_id`, log `mp_unavailable` com `entry.mp_http === 403` | ✅ PASS — **contradição resolvida** |
| **D1** (regressão do bloqueador, não é AC) | corpo tem só as 7 chaves de raiz | `handlers.test.ts:300-311` — `expect(Object.keys(call.body).sort()).toEqual([...7])`, PIX **e** cartão | ✅ PASS |

### P1 · Status e webhook no vocabulário do Orders

| Critério | Outcome da spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **STA-01** união dos dois vocabulários; desconhecido → `null` | 9 do Orders + 7 legados; `at_terminal`→null | `status.test.ts:81-93` — `it.each` dos 9 com `expect(mapMpStatus(mp)).toBe(internal)` (inclui `processing`→`pending`, `canceled`→`cancelled`); `:95-103` nenhum oficial em null; `:66-76` os 7 legados; `:105-112` `in_mediation`/`''`/`at_terminal` → null | ✅ PASS |
| **STA-02** `action_required`+`waiting_transfer` → `pending` | `pending` | `orders.test.ts:252-256` — `toEqual({status:'pending', statusDetail:'waiting_transfer'})` · `handlers.test.ts:1022-1039` (contraste PIX: nenhum update `payment_status:'rejected'`) | ✅ PASS |
| **STA-03** cartão `action_required`≠`waiting_transfer` ⇒ `rejected` + 200 | `rejected`, por valor, sem efeitos | `handlers.test.ts:982-991` — `toBe(200)` + `resolves.toEqual({status:'rejected', status_detail:'pending_challenge'})` + `updates.some(u => u.values.payment_status === 'rejected')` + `rpcs` vazio | ✅ PASS |
| **STA-03** corrente `status_detail → friendlyMessage → instrução` | fallback **instrui** trocar de meio | `handlers.test.ts:1016-1018` — `expect(body).toEqual({status:'rejected', status_detail:<detail>})` **e** `expect(friendlyMessage(body.status_detail)).toMatch(/use outro método de pagamento/i)`, `it.each` dos 3 detalhes de desafio · `status.test.ts:149-150` — `toBe(fallback)` + `expect(fallback).toMatch(/use outro método de pagamento/i)` | ✅ PASS — ver julgamento abaixo |
| **STA-04** `cc_rejected_*` + `rejected_by_issuer` + ponte de prefixo + leitura do payment | mensagens pt-BR; payment vence a raiz | `status.test.ts:157-161` — `not.toBe(fallback)` + `toMatch(/emissor/i)`; `:163-168` e `:170-177` — `toBe(friendlyMessage('cc_'+detail))`; `:179-181` — sem par ⇒ `toBe(fallback)` · `orders.test.ts:277-294` — raiz `failed` + payment `rejected_by_issuer` ⇒ `toEqual({status:'rejected', statusDetail:'rejected_by_issuer'})`; `:296-304` fallback para a raiz | ✅ PASS |
| **WHK-01** `type==='order'`; outros sem efeito; `GET /v1/orders/{data.id}` | GET vence o corpo | `handlers.test.ts:1352-1354` — `expect(fetchDouble.calls[0].url).toBe('…/v1/orders/ORDTST01K…')`; `:1366-1370` — `type:'payment'` ⇒ 200 `{received:true}` com `calls`/`updates`/`rpcs` vazios; `:1392-1393` — corpo mente `failed`, GET diz `processed` ⇒ `rpcs[0].args.p_status_detail === 'accredited'` | ✅ PASS |
| **WHK-02** `buildManifestCandidates`, 1º que casar; inválida ⇒ 401 | 2 candidatos derivados do `data.id` recebido | `webhookSignature.test.ts:59-64` — `toEqual([<id recebido>, <id minúsculo>])`; `:66-70` numérico ⇒ 1; `:72-76` o último **é** `buildManifest` · `handlers.test.ts:1483-1487` — id MAIÚSCULO ⇒ 200 **e** RPC aplicada; `:1502-1503` minúsculo também; `:1519-1520` outro segredo ⇒ 401 sem chamada ao MP; `:57-60`, `:71-72` — sem header / `v1` errado ⇒ 401 e `calls` vazio | ✅ PASS |
| **WHK-03** `external_reference` → fallback `mp_order_id` → `order_not_found` | 3 caminhos | `handlers.test.ts:1402-1413` (fixture só responde a `eq[0]==='id'`) · `:1421-1440` (só a `eq[0]==='mp_order_id'`) · `:1456-1462` — 200 `{received:true}`, `updates`/`rpcs` vazios, log `order_not_found` com `mp_order_id` | ✅ PASS |
| **WHK-04** RPC no `approved`; `canTransition` no resto; 2º `approved` de outra order | marcador, sem reaplicar nem regredir | `handlers.test.ts:1537-1548` — `rpcs` `toEqual` com os 3 args + `updates` vazio; `:1563-1566` — `approved→canceled` grava só `mp_status_detail`; `:1586-1591` — `rpcs` vazio + `updates[0].values` `toEqual({mp_status_detail:'duplicate_approved_other_order: ORDTST01K… (accredited)'})`; `:1602-1605` — duplicado da mesma order ⇒ RPC `false` ⇒ só o detail | ✅ PASS |
| **D7** (não é AC) `approved` persiste `mp_order_id` | escrita quando era `null` | `handlers.test.ts:1622-1626` — `write.values.mp_order_id === MP_ORDER_ID`, `eq === ['id', ORDER_ID]` | ✅ PASS |

### P1 · Rastreabilidade dos ids

| Critério | Outcome da spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **PER-01** `orders.mp_order_id text` + índice | coluna + índice, idempotente | `supabase/migrations/20260728120000_orders_mp_order_id.sql:23-26` — `add column if not exists mp_order_id text` / `create index if not exists idx_orders_mp_order_id on public.orders(mp_order_id)`. Sem teste automatizado **por decisão declarada** na Test Coverage Matrix (`tasks.md:115`, "none — build gate"); evidência de runtime nos cenários 1 e 3 do T16 | ✅ PASS |
| **PER-02** os dois ids gravados antes de qualquer retorno de sucesso | `ORDTST01K…` / `PAY01K…` | `handlers.test.ts:342-349` — `toBe(200)` + `values` `objectContaining({mp_order_id:'ORDTST01KYMAZV96DKQHXSZB5FG0K86E', mp_payment_id:'PAY01KYMAZV9MY6S2FZAC6FASWTYG'})`, `eq === ['id', ORDER_ID]`; `:1111-1122` também no caminho recusado. Ordem: `handlers.ts:479-487` é `await`-ado antes de qualquer `json(...)` (linhas 526/530) | ✅ PASS |
| **PER-03** RPC recebe o id do **payment** | assinatura inalterada | `handlers.test.ts:521-530` — `expect(supabase.rpcs).toEqual([{fn:'apply_payment_approval', args:{p_order_id, p_mp_payment_id:'PAY01K…', p_status_detail:'accredited'}}])` (igualdade estrita: arg extra quebra) · `:1537-1548` no webhook. Nenhuma migration nova toca a RPC | ✅ PASS |

### P2 · Retentativa

| Critério | Outcome da spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **RTY-01** cancel **antes** do create | `POST /v1/orders/{id}/cancel` precede | `handlers.test.ts:1202-1209` — `toBe(CANCEL_URL)`, `method === 'POST'`, `X-Idempotency-Key` presente, e `indexOf(cancelCall)` `toBeLessThan` `findIndex(create)` (**ordem asseverada**); `:1250` — sem `mp_order_id` ⇒ zero cancels | ✅ PASS |
| **RTY-02** cancel falho não bloqueia | 200 + create ocorre + log | `handlers.test.ts:1226-1235` — 409 e rede: `toBe(200)`, o POST de create ocorre, log `previous_order_cancel_failed` com o `mp_order_id` da **anterior** | ✅ PASS |
| **RTY-03** `mp_order_id` passa a apontar para a nova | novo id ≠ antigo | `handlers.test.ts:1262-1263` — `toBe(MP_ORDER_ID)` **e** `not.toBe(OLD_MP_ORDER_ID)` | ✅ PASS |

### Observabilidade e herdados da 08

| Critério | Outcome da spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| **LOG-01** log traz `mp_order_id`; booleanos; CPF nunca | por valor + ausência do CPF | `handlers.test.ts:542-545` — `entry.mp_order_id` por valor, `bump_applied === false`, `payer_cpf_present === true`, `expect(lines.join('\n')).not.toContain(ORDER_CPF)`; `:1643-1644` webhook com `mp_order_id` + `applied === true`; `:781-785` — `payer_cpf_present === false` e nem o CPF sujo é logado | ✅ PASS |
| **PGD-04** cartão: CPF do pedido vence o do Brick | `{type:'CPF', number:'39053344705'}` sobre `'00000000191'` | `handlers.test.ts:254-259` — `expect(call.body.payer).toEqual({email:'brick@nanapin.test', first_name:'Mariana', last_name:'Souza Lima', identification:{type:'CPF', number:ORDER_CPF}})` com o Brick mandando `00000000191` (`:143`); `:260` — `payments[0]` sem `payer` | ✅ PASS |
| **PGD-04** **PIX** leva `identification` + nome do servidor | idem cartão, por valor | `handlers.test.ts:219-227` — `expect(call.body.payer).toEqual({email:'nana@nanapin.test', first_name:PAYER_FIRST_NAME, last_name:PAYER_LAST_NAME, identification:{type:'CPF', number:ORDER_CPF}})` + `payments[0]` sem `payer`. **Confirmado por R2 (killed)** | ✅ PASS — gap da iteração 1 **fechado** |
| **PGD-04** guard 422 quando o CPF não serve | 422 antes de escrita/MP | `handlers.test.ts:772-785` — `it.each` de 3 CPFs × 2 métodos: `toBe(422)`, mensagem **por valor**, `expect(fetchDouble.calls).toHaveLength(0)`, `expect(supabase.updates).toHaveLength(0)`, log `missing_payer_cpf` com `payer_cpf_present:false`; `:799-800` contraste (CPF válido ⇒ exatamente 1 chamada — o conjunto não passa por vacuidade). **Confirmado por R3 (killed)** | ✅ PASS — gap da iteração 1 **fechado** |
| **BMP-04** cobrado == exibido, com cupom `percent` | igualdade até o centavo, **no handler** | `handlers.test.ts:888-905` — `call.body.total_amount` `toBe('16.18')`/`'16.51'`, `payments[0].amount` idêntico, `persist.values` `toEqual({total:16.18, pix_discount:0.33})` (`toEqual` estrito), `entry.bump_applied === true`; `:918-926` contraste com bump desligado (`'18.28'`, `bump_applied:false`); `:953` cupom inválido (`'16.88'`). **Confirmado por R1 (killed, e o core seguiu verde — o espelho é cego)** | ⚠️ **PASS na instância do bump · GAP na cláusula "idêntico ao exibido"** — Lacunas 1 e 2 |

### Edge cases da spec

| Edge case | Evidência | Result |
| --- | --- | --- |
| total < R$ 0,01 ⇒ 422 antes do MP | `handlers.test.ts:683-688` — cupom `fixed` consumindo o subtotal ⇒ `toBe(422)`, mensagem por valor, `calls` e `updates` vazios | ✅ |
| pedido sem CPF válido ⇒ 422 antes de escrita/MP | `handlers.test.ts:772-785` (6 casos) | ✅ |
| 2xx sem `id` ⇒ 502, nunca id vazio | `handlers.test.ts:403` (`201`, `{status:'created'}`) + `:426` asserção negativa | ✅ |
| 4xx sem corpo parseável ⇒ 502 | `handlers.test.ts:468-498` | ✅ |
| PIX sem `qr_code` ⇒ `''`/`null` | `orders.test.ts:173-191` | ✅ |
| webhook `type:'payment'` ⇒ `{received:true}` sem efeito | `handlers.test.ts:1366-1370` | ✅ |

**Status:** **24/24 ACs rastreadas com `file:line` + valor · 0 spec-precision gaps · 1 AC (BMP-04) com
lacuna de discriminação remanescente.**

### Julgamento pedido: a decisão do T18 na Lacuna 6 (STA-03) é suficiente?

**Sim, e é a escolha certa** — com um detalhe que o próprio T18 subvendeu. Asseverar a **instrução**
(`/use outro método de pagamento/i`) em vez da cópia literal é proporcional: travar a frase inteira
transformaria revisão de redação em quebra falsa, e a AC pede uma instrução, não um texto. A asserção
discrimina o que importa — `FALLBACK_MESSAGE = 'Erro.'` mata 6 testes (medido no T18; a chave é que o
mesmo texto é asseverado nas duas pontas, `status.test.ts:150` e `handlers.test.ts:1018`).

O que o T18 não afirmou e eu verifiquei: a corrente **não** termina numa função de teste. A loja consome
exatamente esse campo em `apps/store/src/features/checkout/ui/CardPaymentBrick.tsx:56` —
`setErrorMessage(friendlyMessage(response.status_detail))` —, e `response.status_detail` é o campo que
`handlers.ts:530` emite. O teste em `handlers.test.ts:1018` liga então as duas pontas **reais** (handler →
a mesma função que a produção chama), não um espelho. É mais forte do que "asseverar a instrução".

### Julgamento pedido: BMP-04 é protegido no handler ou continua no espelho?

**No handler, de verdade — para a instância do bump.** Provado, não aceito: sob **R1** o `@nanapin/core`
(onde vive `displayedEqualsCharged.test.ts`) ficou **303/303 verde**, e os 3 vermelhos foram todos em
`handlers.test.ts`. O teste novo entra pelo `createPayment` real, com `store_settings.checkout` e cupom
`percent` vindos do dublê do Supabase, e assevera `total_amount` do corpo capturado, o `total` persistido
e `bump_applied` — três pontas por valor.

**Mas a cláusula "idêntico ao exibido" não está protegida como um todo:** V1 e V2 mostram outros dois pares
loja/servidor da mesma igualdade em que só a metade da loja tem guarda-corpo. Para `free_shipping`, o
espelho **cobre** (`displayedEqualsCharged.test.ts:163-178`) e o handler **não** — exatamente a assimetria
que a Lacuna 1 da iteração 1 descreveu.

### Julgamento pedido: os ramos de guarda asseveram que o MP não foi chamado?

**Sim, todos — verificado um por um por leitura, não por relato.** Cada caso do `describe`
*"create-payment — guards antes de qualquer chamada ao MP"* traz `expect(fetchDouble.calls).toHaveLength(0)`:

| Ramo | `file:line` da asserção negativa | Extra |
| --- | --- | --- |
| 401 sem `Authorization` | `handlers.test.ts:585` | + `updates` vazio (`:586`) |
| 401 JWT rejeitado | `:595` | + `updates` vazio (`:596`) |
| 403 ownership (2 variantes: `user_id` divergente e sem `customer_id`) | `:614` | + `updates` vazio (`:615`) |
| 404 pedido inexistente | `:624` | + `updates` vazio (`:625`) |
| 409 não retentável (3 variantes) | `:642` | + `updates` vazio (`:643`) |
| 422 sem itens | `:655` | + `updates` vazio (`:656`) |
| 422 total < R$ 0,01 | `:687` | + `updates` vazio (`:688`) |
| 400 campos obrigatórios (3 variantes) | `:703` | + `updates` vazio (`:704`) |
| 400 dados do cartão (4 variantes) | `:718` | + nenhum `mp_order_id` gravado (`:721`) |
| 500 falha de persistência | `:733` | — |
| 422 CPF (6 variantes, `describe` próprio) | `:775` | + `updates` vazio (`:776`) |

A Coverage Expectation da matriz para os ramos de erro está **atendida**. O caso do 400-do-cartão merece
registro positivo: em vez de copiar `updates.toHaveLength(0)` dos vizinhos, assevera o que é de fato
verdade naquele ramo — o `total` persistido é esperado (o guard vem depois do recálculo), a order no MP não.

---

## Fronteira por diff (Success Criteria)

`git diff --name-only HEAD` + `git ls-files --others --exclude-standard`:

| Arquivo proibido pela spec | No diff? |
| --- | --- |
| `packages/core/src/payment/pricing.ts` | ✅ **ausente** |
| `packages/core/src/payment/payer.ts` | ✅ **ausente** |
| `apps/store/src/features/checkout/ui/CardPaymentBrick.tsx` | ✅ **ausente** |
| produção de `apps/store/src/**` | ✅ **ausente** |
| produção de `apps/backoffice/**` | ✅ **ausente** (nenhum arquivo do app no diff) |

**Exceções encontradas: exatamente as 2 declaradas na `spec.md`** — `apps/store/src/test/setup.ts`
(conserto do flake pré-existente; único arquivo de `apps/store` tocado, e não é produção) e
`packages/core/src/payment/webhookSignature.ts` (premissa refutada em sandbox, D2; mudança **aditiva** —
`buildManifest` intacto, comprovado por `webhookSignature.test.ts:72-76`). **Nenhuma terceira exceção.**

Demais arquivos do diff, todos legítimos ou fora de AC: `status.ts`, `orders.ts`, `handlers.ts`,
`index.ts`, a migration, `supabase/{package.json,vitest.config.ts}`, `pnpm-workspace.yaml`,
`pnpm-lock.yaml`, `supabase/config.toml`, `.env.example`, `.gitignore`, `CLAUDE.md`, `.specs/**`.

---

## Integridade dos testes

| Pacote | Antes da feature | Iteração 1 | **Agora** | Δ total |
| --- | --- | --- | --- | --- |
| `@nanapin/functions` | 0 (pacote não existia) | 47 | **81** | +81 |
| `@nanapin/core` | 284 | 300 | **303** | +19 |
| `@nanapin/backoffice` | 62 | 62 | **62** | 0 |
| `@nanapin/store` | 372 | 372 | **372** | 0 |
| **Total** | 718 | 781 | **818** | **+100** |

Nenhuma contagem caiu, nenhum `skip`, nenhum `only`. Enfraquecimento de asserção **não** encontrado no
delta do T18: as adições são todas por valor (`toEqual` estrito em `persist.values`, `call.body.payer`
completo, mensagens de erro literais), e o único ajuste de comportamento em `fakes.ts` é aditivo
(`rawBody`, `FetchRoute:25`) e necessário — por `JSON.stringify` o ramo `!mpBody` era **inalcançável**.

## Code Quality

| Princípio | Status | Nota |
| --- | --- | --- |
| Minimum code | ✅ | nenhuma linha de produção mudou no T18; `MpOrder` segue declarando só o que é lido |
| Surgical changes | ✅ | `buildManifest`, RPC, `pricing.ts` e `payer.ts` intocados |
| No scope creep | ⚠️ | `.mcp.json` (servidor MCP novo) segue no diff sem servir nenhuma AC |
| Matches patterns | ✅ | `Deps` injetadas no molde `melhor-envio` |
| Spec-anchored outcome check | ✅ | **0** spec-precision gaps — ORD-07 e STA-03 reescritas e com teste do ramo |
| Coverage Expectation — ramos de **erro** | ✅ | os 11 casos acima, todos com asserção negativa sobre o `fetch` |
| Coverage Expectation — lógica de **valor** movida pelo T6 | ❌ | Lacunas 1–4: 4 mutações sobrevivem |
| Todo teste mapeia a AC / edge case / Done-when | ✅ | cada `describe`/`it` cita o ID (ORD-*, STA-*, WHK-*, PER-*, RTY-*, LOG-01, D1…D7) |
| Guidelines documentadas seguidas | ✅ | `CLAUDE.md` + `tasks.md` (matriz e gates); `pnpm lint` fora do gate por dívida declarada |

**Higiene de commit — reconferida (3 dos 4 itens da iteração 1 estão fechados):** `CLAUDE.md:148`
**corrigido** (descreve `/v1/orders` e diz explicitamente que `/v1/payments` não é usada em código novo);
`tasks.md` **atualizada** (103 "Done when" marcados, 3 abertos — os de sandbox); `.playwright-cli/`
**passou a ser ignorado**. Seguem abertos: **`x.png` na raiz, untracked e não ignorado** (`git add -A` o
arrasta para o commit) e o `.mcp.json`.

## Estado da árvore de trabalho

**Intacta, verificada por hash.** `md5sum` dos 9 arquivos de produção e de teste conferidos **idênticos**
ao baseline tomado no início desta sessão, depois da última mutação:

```
5f30037dbaa4512cd00b83f102621b58  supabase/functions/mercado-pago/handlers.ts
0ad709ab09f3141a61a6685bcb53dbad  supabase/functions/mercado-pago/index.ts
aa9dbb5ffc8cc0d90a7856e7001356ce  packages/core/src/payment/orders.ts
682b161560fd8846b348990d50d06b24  packages/core/src/payment/status.ts
9d21484ce8dd2fd98ebaf163118d5f4b  packages/core/src/payment/webhookSignature.ts
eaba3a442eabeb9a524e4b3dee4364e3  packages/core/src/payment/pricing.ts
374c9923f784f432bd835875ef16f519  packages/core/src/payment/payer.ts
ab9ebb1b85564da4209a73370eb0c567  supabase/functions/mercado-pago/__tests__/fakes.ts
2cfc2d6aa159a44599361e12f37d7e24  supabase/functions/mercado-pago/__tests__/handlers.test.ts
```

`git stash list` **vazio**; `git status --porcelain` idêntico ao do início da sessão. Cada mutação
restaurou por `cp` da cópia de baseline e conferiu o hash **na mesma invocação** que a aplicou — não houve
janela em que uma mutação sobrevivesse ao passo seguinte. Nenhum arquivo foi escrito por esta verificação
além desta seção apendada.

---

## Lacunas ranqueadas

### 1. MAJOR — o desconto do cupom ignora a quantidade, e nenhum teste fica vermelho
**AC:** BMP-04 (*"o valor cobrado seja idêntico ao exibido"*) · **Mutação:** V1 · `handlers.ts:312`

`const currentSubtotal = bumpedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)` → sem
`* i.quantity`: **81/81 e 303/303 verdes**. É o par server-side de `useCheckoutTotals.ts:95-99`, que soma
**com** quantidade. Divergindo, a base do cupom no servidor fica menor que a exibida e a cliente paga
**mais** do que o rótulo do CTA mostrou — com a própria fixture `paymentRows()` (2 × R$ 24) e um cupom
`percent` de 10%, **R$ 2,40 a mais**.

Sobrevive porque **toda** fixture com cupom no `handlers.test.ts` usa `quantity: 1` (`bumpLists:854-863` e
o caso de total < R$ 0,01, `:677`).

**Fix sugerido:** no `describe` de BMP-04, uma variante com `quantity: 2` num item **fora** da oferta do
bump (o bump exige `quantity === 1`, `pricing.ts:93`) + cupom `percent`, asseverando `total_amount` e o
`total` persistido por valor.

### 2. MAJOR — o cupom `free_shipping` só é honrado no espelho, não no handler
**AC:** BMP-04 · **Mutação:** V2 · `handlers.ts:354`

`shipping: freeShipping ? 0 : Number(order.shipping_cost || 0)` → `shipping: Number(order.shipping_cost || 0)`:
**81/81 e 303/303 verdes**. Par server-side de `useCheckoutTotals.ts:104`. Divergindo, a loja mostra frete
grátis e o servidor cobra o frete inteiro — a maior divergência absoluta das quatro.

Sobrevive porque nenhum teste do handler usa cupom `free_shipping`: os únicos que existem estão em
`displayedEqualsCharged.test.ts:163-178`, e ali quem zera o frete é o helper `shippingOf` (`:44`), um
**espelho** do handler. É a Lacuna 1 da iteração 1 com outro nome de campo — fechada para o bump, aberta
para o frete.

**Fix sugerido:** um caso com `coupons.type = 'free_shipping'` e `orders.shipping_cost > 0`, asseverando
que `total_amount` **não** inclui o frete e que o `total` persistido bate.

### 3. MINOR — a janela de validade e o teto de uso do cupom podem ser apagados inteiros
**AC:** nenhuma da 09 (lógica pré-existente **movida** pelo T6) · **Mutação:** V3 · `handlers.ts:324-329`

Reduzir `const valid = coupon && coupon.active && (valid_from…) && (valid_until…) && (max_uses…)` para
`const valid = coupon && coupon.active`: **81/81 e 303/303 verdes**. Todas as fixtures de cupom têm
`valid_from`, `valid_until` e `max_uses` em `null`, então as três cláusulas nunca são exercitadas. Cupom
expirado ou esgotado passaria a descontar no servidor.

**Fix sugerido:** 3 casos (`valid_until` no passado, `valid_from` no futuro, `used_count === max_uses`)
asseverando `total_amount` a preço cheio + log `coupon_invalid` — o log já existe (`handlers.ts:339`) e já
tem asserção no caso de cupom inativo (`handlers.test.ts:954`), então é extensão de um teste que existe.

### 4. MINOR — a oferta do bump liga por ausência do flag
**AC:** BMP-01/BMP-04 (tangencial) · **Mutação:** V4 · `handlers.ts:298`

`order_bump_enabled === true` → `!== false`: **81/81 verdes**. Com `store_settings.checkout` presente,
`order_bump_product_id` configurado e o flag **ausente**, o servidor aplicaria um desconto que a loja não
exibiu (cobrado **menos** que o exibido). Sobrevive porque as duas fixtures são explícitas (`true` em
`bumpEnv(true)`, `false` em `bumpEnv(false)`) e a de controle não tem `store_settings`.

**Fix sugerido:** um caso com `{ order_bump_product_id, order_bump_discount_percent }` e **sem** a chave
`order_bump_enabled`, asseverando preço cheio e `bump_applied: false`.

### 5. Higiene (não é AC — para o orquestrador, antes de commitar)
- **`x.png` na raiz** segue untracked e não ignorado: `git add -A` o inclui no commit da feature.
- **`.mcp.json`** (servidor `mercadopago`) segue no diff sem servir nenhuma AC — mudança de tooling.

---

## O que esta rodada NÃO cobre

- **Reexecução do sandbox.** Continua pendente, como o T18 já declarou. Tudo nesta seção é prova de teste;
  a prova end-to-end contra o MP de verdade (PIX e cartão com D1 fora do caminho, notificação real em 200,
  order de recusa não órfã no painel) não foi tentada aqui.
- **A metade aberta de D5** (onde a janela de expiração do PIX é realmente configurada no Orders).
- **PGD-04 pela resposta do MP**: segue impossível — a API não devolve `payer`. A garantia é o **corpo
  enviado** (agora asseverado por valor nos dois métodos, `handlers.test.ts:219-227` e `:254-259`) mais o
  guard 422. É o máximo obtenível, e está obtido.

## Traceability sugerida (não aplicada — o Verifier não escreve na spec)

| Requisito | Status sugerido |
| --- | --- |
| ORD-01 … ORD-07, STA-01 … STA-04, WHK-01 … WHK-04, PER-01 … PER-03, RTY-01 … RTY-03, LOG-01 | ✅ Verified |
| PGD-04 (herdado 08) | ✅ Verified — as duas lacunas da iteração 1 fechadas e reconfirmadas por mutação |
| BMP-04 (herdado 08) | ⚠️ **Verified na instância do bump · Needs Fix na cláusula "idêntico ao exibido"** (Lacunas 1 e 2) |
