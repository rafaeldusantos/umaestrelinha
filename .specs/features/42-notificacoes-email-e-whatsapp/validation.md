# 42 — Notificações por e-mail · Validation

**Date**: 2026-09-06
**Spec**: `.specs/features/42-notificacoes-email-e-whatsapp/spec.md`
**Diff range**: `master..feat/42-notificacoes-por-email` (Phase 0: T1–T4)
**Verifier**: **pendente** — este arquivo nasce na T4 com a evidência da base (FIX-05), escrita pelo
autor da fase (batch B1). O Verifier independente (autor ≠ verificador) roda depois da T24 e
sobrescreve as seções que lhe pertencem (ACs, sensor, gate). O que está aqui é medido, não
inferido — e o que não foi medido está marcado como pendente, com o comando de conferência.

---

## Evidência da base (FIX-05) — parcial

### O que travou a execução completa, e por quê

`RESEND_DEV_REDIRECT_TO` está **vazia** no `.env` da raiz (medido em 2026-09-06 antes de qualquer
probe). Com ela vazia, todo e-mail transacional disparado localmente vai para o **e-mail real da
cliente** do pedido — e os 35 pedidos do banco local são **clientes reais importados da Nuvemshop**
(feature `35`). Disparar `order_received` num pedido pendente mandaria "aguardando o PIX" para uma
pessoa de verdade, sobre um pedido de meses atrás. Por isso os passos 4, 5 e 8 do roteiro de
`sender.ts` **não foram executados** e o Supabase local **não foi reiniciado**. A decisão é do
risco listado em `design.md` → *Risks & Concerns* ("Envio local para cliente real do banco
importado"), e a mitigação escrita lá é exatamente esta: preencher a válvula antes do roteiro.

O que **não** depende da válvula — os probes 1–3 contra a API do Resend, com o sink de teste
`delivered@resend.dev` como destinatário — foi executado.

### Fato do FIX-01, remedido antes dos probes

`GET https://api.resend.com/domains` com a chave do `.env`:

| name | status | region | created_at |
| --- | --- | --- | --- |
| `loja.umaestrelinha.com.br` | `verified` | `sa-east-1` | 2026-08-11 23:44:28 UTC |

**Um** domínio na conta. O subdomínio `send.` que a documentação prescrevia até hoje nunca existiu
— o 403 de 2026-08-08 era isso, não DNS pendente.

### Probes 1–3 do roteiro de `sender.ts` (executados em 2026-09-06)

Destinatário: `delivered@resend.dev` (sink de teste do Resend). `from` do probe 1 = o `RESEND_FROM`
do `.env` local (`Adri - Uma Estrelinha<adri@loja.umaestrelinha.com.br>` — sem espaço antes do `<`;
o Resend aceitou). Uma `Idempotency-Key` nova por probe (`feat42-t4-probeN-<epoch>`). A chave não
foi copiada para arquivo nenhum.

| # | O que | Status HTTP | Corpo (shape) | Fecha |
| --- | --- | --- | --- | --- |
| 1 | sucesso, `from` = `RESEND_FROM` | **200** | `{"id":"689056ad-…"}` | **Assumption (A)** do roteiro: o código do sucesso é **200** (não 201). O código aceita qualquer 2xx, e está certo em aceitar |
| 2 | `from` = `onboarding@resend.dev`, `to` = o sink | **200** | `{"id":"05920ef7-…"}` | **Achado**: o sink `delivered@resend.dev` **não** dispara o 403 "só o dono da conta" do remetente compartilhado. Para reproduzir a shape do 403, ver 2b |
| 2b | `from` num domínio não verificado (`acesso@exemplo.invalid`) | **403** | `{"statusCode":403,"name":"validation_error","message":"The exemplo.invalid domain is not verified. Please, add and verify your domain on https://resend.com/domains"}` | **Assumption (B)**: a shape do erro é `statusCode` + `name` + `message`, e a **`message` ecoa dado da requisição** (aqui o domínio; no caso do destinatário não autorizado, o e-mail). É a razão de `sender.ts` logar só o slug e guardar o texto em `order_emails.error`, nunca no log |
| 3a | mesma chave + mesmo corpo do probe 1 | **200** | `{"id":"689056ad-…"}` — **o mesmo id** | Idempotency-Key honrado: nenhum segundo e-mail |
| 3b | mesma chave + corpo diferente | **409** | `{"statusCode":409,"name":"invalid_idempotent_request","message":"This idempotency key has been used with this HTTP method and endpoint within the last 24 hours, but the request body was modified and doesn't match the original request."}` | O 409 que `classifyResendFailure` precisa reconhecer (T10 o cobre por caso próprio) |

### Checklist — pendente do usuário (passos 4, 5 e 8 do roteiro)

Pré-requisito único: preencher `RESEND_DEV_REDIRECT_TO=<seu e-mail>` no `.env` da raiz e rodar
`supabase stop && supabase start` (**nunca** `--all`). Com a válvula preenchida, todo destinatário
é sequestrado para esse endereço e o assunto ganha o prefixo `[dev → <e-mail real>]`.

- [ ] **Passo 4 — PIX gera `order_received` (TRG-08).** Checkout na loja local → PIX → CTA.
      Esperado: e-mail "Pedido NP-… recebido — aguardando o PIX" na caixa do redirect. Conferir:
      ```sql
      select type, status, provider_message_id, attempts from order_emails where order_id = '…';
      ```
      Esperado: **uma** linha `order_received` / `sent` / id do provedor / `attempts = 1`.
- [ ] **Passo 4b — reemitir o PIX do MESMO pedido não cria linha nova (TRG-10).** Repetir a
      consulta acima: ainda **uma** linha, e nenhum e-mail novo na caixa.
- [ ] **Passo 5 — aprovação gera `order_paid` (TRG-01).** Pagar o PIX no sandbox do MP → webhook.
      Esperado: e-mail "Pagamento aprovado"; a consulta acima passa a ter **duas** linhas `sent`
      com `provider_message_id`. Reentregar o mesmo webhook → nenhum e-mail novo, ainda duas linhas.
- [ ] **Passo 8 — CTA deslogada.** Abrir o e-mail numa janela anônima e clicar em "Acompanhar em
      Minha conta". Esperado: `/conta` com o overlay de login — nunca "Pedido não encontrado".
- [ ] **Captura do Gmail no celular** (passo 7 do roteiro, renderização): card de 560px sem estourar,
      CTA com alvo de toque confortável. Citar o arquivo aqui.

**Done-when da T4 que ficaram em aberto por causa disso**: "`order_emails` local tem ≥ 2 linhas
`sent`" e "reemitir o PIX não cria linha nova". Os dois dependem dos passos acima.

---

## Gate Check (Phase 0)

Medido em 2026-09-06, ao fim da T4, **um workspace por vez** e com exit code capturado fora de pipe
(`… | sed … ; echo EXIT=${PIPESTATUS[0]}`). A baseline de comparação é a de `HEAD b6abe64`, que moveu
durante a fase (ver nota em `tasks.md` → *Baseline de entrada*).

| Medida | Baseline (HEAD `b6abe64`) | Após Phase 0 | Delta | Exit |
| --- | --- | --- | --- | --- |
| store | 2664 / 169 | **2670 / 170** | **+6** — `authSenderDomain.test.ts` (novo, 4) · `copyInstitucional.test.tsx` (+2) | 0 |
| backoffice | 2002 / 119 | **2004 / 119** | **+2** — `AdminSettingsPage.test.tsx` (ausência + sensor) | 0 |
| core | 1811 / 70 | 1811 / 70 | 0 (não tocado) | 0 |
| functions | 370 / 7 | 370 / 7 | 0 (`templates.test.ts` mudou 4 **strings** de fixture, nenhum caso) | 0 |
| catalog-import | 512 / 23 | 512 / 23 | 0 | 0 |
| lint | 27 / 5 | **27 / 5** (backoffice 25/4 · store 2/1) | 0 | — |
| tipos | 0 · 0 | **0 · 0** | 0 | 0 · 0 |
| `pnpm build` | — | 2 successful | — | 0 |
| `git diff --name-only master -- packages/core/src/payment supabase/functions/mercado-pago` | — | **vazio** | — | — |

**Nenhuma queda.** A única asserção existente reescrita foi em `NewsletterBanner.test.tsx:116`
(`/novidades da loja no seu e-mail/` → a frase nova), mudança de spec declarada (FIX-04) — o caso
não sumiu, mudou de valor esperado.

**Sensibilidade dos guardas novos, provada por injeção real** (e revertida):

| Guarda | Mutante | Resultado |
| --- | --- | --- |
| `authSenderDomain.test.ts` | arquivo `docs/__injecao_t1.md` com `admin_email = "acesso@<domínio antigo>"` | **reprova** a regra, nomeando `docs/__injecao_t1.md:2` |
| `AdminSettingsPage.test.tsx` (FIX-03) | `ToggleField` com o rótulo antigo reinjetado na aba Carrinho | **reprova** o caso de ausência (1 failed · 16 passed) |

---

## Probe da migration (T11) — `20260907120000_42-notificacoes.sql` no banco local

**Autor**: batch B2 (Phase 1a), 2026-09-07. **Método**: `AD-012` — tipo não é schema; o que prova a
migration é o banco respondendo. Aplicada **sem `db reset`** (o catálogo importado está lá), com
`npx supabase migration up --local`; leituras por REST/RPC com a service role do `.env` (`curl`) e
por `psql` dentro do contêiner (`docker exec supabase_db_uma-estrelinha-store psql`).

### Estado antes

- `select count(*) from order_emails` = **0** (a tabela nunca teve linha — FIX-05 segue pendente do
  usuário). Logo o "mesma contagem depois do rename" é 0 = 0, e a preservação de dado é provada só
  pela **forma** (rename, sem `drop table`/`delete`/`truncate` — asserção do guarda) e pelo próprio
  Postgres ter mantido `order_emails_pkey` e `order_emails_order_id_fkey` com os nomes antigos.
- `store_settings` tinha 8 chaves; **não** tinha `notifications`.
- **Achado fora da task**: a migration da `41` (`20260906120000`) estava **aplicada à mão e não
  registrada** em `supabase_migrations.schema_migrations` (`migration list --local` mostrava
  `remote: ""`; a coluna `image_mobile_url` e a função `guard_last_active_home_section` existiam). O
  `migration up` a reaplicou (ela é idempotente e não escreve dado — conferido por `grep` antes) e a
  registrou. Depois: `schema_migrations` termina em `20260906120000`, `20260907120000`.

### Aplicação

| Comando | Resultado |
| --- | --- |
| `npx supabase migration up --local` | `Applying migration 20260906120000_41-…`, `Applying migration 20260907120000_42-notificacoes.sql`, `Migrations applied`, exit 0 |
| reexecução do `.sql` inteiro via `psql -v ON_ERROR_STOP=1` (idempotência) | exit 0; `INSERT 0 0` na semente; só `NOTICE … already exists, skipping` / `does not exist, skipping`; `count(*)` continua 0; `store_settings` continua com **1** linha `notifications` |

### Forma (psql)

| O quê | Medido |
| --- | --- |
| `\d order_notifications` | colunas `id, order_id, event, status, attempts, provider_message_id, error, created_at, sent_at, channel (not null default 'email'), delivery_status` |
| `check` de `event` | os **15** de `NOTIFICATION_EVENTS`, na ordem |
| `check` de `channel` / `delivery_status` / `status` | `email\|whatsapp` · `null \| sent_to_server\|delivered\|read` · `pending\|sent\|failed` |
| índice único | `order_notifications_order_event_channel UNIQUE (order_id, event, channel)` — sem `where` |
| índice antigo `order_emails_order_type` | **não existe** |
| policy | `admin read order_notifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'))` — a única |
| `pg_class` | `order_notifications` relkind `r`; `order_emails` relkind **`v`** com `reloptions = {security_invoker=true}` |
| view | `select id, order_id, event AS type, status, attempts, provider_message_id, error, created_at, sent_at … where channel = 'email'` |
| ACL das 4 RPCs (`proacl`) | `{postgres=X, service_role=X}` nas quatro — `anon`/`authenticated` sem `execute` |
| `store_settings.notifications` | `jsonb_typeof = object`, **15** chaves em `events`, `post_delivery_days = 7` |

### Leituras por REST (service role)

| Chamada | Status |
| --- | --- |
| `GET /rest/v1/order_notifications?select=id,event,channel,status&limit=1` | **200** |
| `GET /rest/v1/order_emails?select=id,type,status&limit=1` (view) | **200** |
| `GET /rest/v1/store_settings?key=eq.notifications` | `{"post_delivery_days":7, events.order_paid.email.enabled: true}` |
| `GET …/order_emails` e `…/order_notifications` com a **anon key** do CLI | **200 `[]`** — a RLS vale pela view (`security_invoker`) e pela tabela |
| `POST /rest/v1/rpc/claim_order_notification` com a **anon key** | **401** `42501 permission denied for function claim_order_notification` |

### O ciclo das RPCs (pedido real `NS-161`, `c52e25b8-…`)

| # | Chamada | Resultado |
| --- | --- | --- |
| 1 | `rpc/claim_order_email {p_type: order_paid}` — a RPC **antiga**, delegando | `"3f06d109-…"` (uuid) |
| 2 | `rpc/claim_order_notification {owner_order_paid, email}` — a **nova** | `"2cc92da9-…"` (uuid) |
| 3 | mesmo par de (2) de novo, ainda `pending` | **o mesmo uuid**, `attempts = 2` |
| 4 | `rpc/finish_order_email (id1, null, 'probe')` | 204 → linha **`failed`**, `error = 'probe'` |
| 5 | `rpc/finish_order_notification (id2, 'probe-sent', null)` | 204 → linha **`sent`**, `provider_message_id = 'probe-sent'` |
| 6 | re-claim do `failed` (1) | **uuid de novo** (`3f06d109-…`) — retentável; a linha volta a `pending`, `error = null`, `attempts = 2` |
| 7 | re-claim do `sent` (2) | **`null`** — só `sent` é terminal (`AD-006`) |
| 8 | `GET order_notifications?order_id=eq.…` / `GET order_emails?order_id=eq.…` | as duas linhas, com `channel = email`; a view as expõe com `type` |
| 9 | `claim_order_notification {event: 'order_confirmed'}` (fora do `check`) | erro `23514 … violates check constraint "order_notifications_event_check"` — nenhuma linha |

**Limpeza**: as duas linhas de probe foram apagadas **pelos ids** (`delete … where id in (…) returning
event, status` → `order_paid|pending`, `owner_order_paid|sent`, `DELETE 2`), e não por `error = 'probe'`
como o roteiro previa — o passo 6 é justamente o que **limpa** o `error` ao reivindicar de novo, então
o filtro do roteiro deixaria a linha de `order_paid` para trás. `count(*)` = **0** ao fim.

### Guardas de disco correspondentes

- `apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts` — **35** casos, âncora dupla
  (arquivo lido **e** `check`/índice/view/semente encontrados), 12 sensores por mutação (evento a
  menos, evento a mais, índice parcial, `on conflict` sem canal, revoke de `anon` perdido, RPC antiga
  com corpo próprio, view sem `security_invoker`, view sem recorte de canal, upsert na semente,
  rename solto, `drop table`, grant a `anon` em LF e CRLF, `notify` ausente).
- `storeSettingsDefaults.test.ts` — bloco `notifications` (+7): `JSON.parse` do trecho
  `$notifications$ … $notifications$::jsonb` `toEqual(DEFAULT_NOTIFICATIONS)`, os 4 legados ligados e
  os 11 novos desligados **nos dois lados**, parser com sensor de chave ausente.
