# 79 — Aviso de pedido no celular · Design

**Spec**: `.specs/features/79-mobile-adm-aviso-de-pedido/spec.md` (aprovada na revisão r2). O
orquestrador lê esta pasta como `81-79-mobile-adm-aviso-de-pedido`, um link simbólico para ela.
**Status**: Draft
**Decisões ativas respeitadas**: `AD-004` (lógica em `handlers.ts`, `index.ts` só fiação), `AD-005`
(o motor roda in-process na `mercado-pago`), `AD-008` (o motor nunca lança, orçamento compartilhado),
`AD-017` (migration aplicada é imutável), `AD-032` (gatilho → eventos em `core`), `AD-034` (nada de
`service_role` em `apps/**`), `AD-056` (Android, mesmas contas, `has_role`, offline só casca),
`AD-058`/`AD-059` (o app lê com papel conferido e escreve por uma porta só). Nenhuma é substituída.
Decisão nova: `AD-062` (no fim).

---

## 1. Abordagens consideradas (Complex)

As três entregam o mesmo escopo. **Escolhida: A.**

| | Como o push sai | A favor | Contra |
| --- | --- | --- | --- |
| **A (escolhida)** | **Dentro do motor** (`dispatch.ts`), como um ramo próprio para os eventos `owner_*`, com o envio injetado (`PushSender`), e uma **edge function nova** como a porta das inscrições | Mesma memória de "já avisei?" (`claim_order_notification`), mesmo orçamento, mesmo "nunca lança"; chega pelo webhook sem salto a mais (`AD-005`) | O motor ganha um segundo formato de entrega (N aparelhos por evento), que o `NotificationProvider` de um destinatário não descreve |
| B | Gatilho no banco sobre `order_notifications` (`pg_net`) chama uma function de push | Desacoplado do motor | Só dispara se a linha de **e-mail** nascer, e ela não nasce com o e-mail desligado (`MAN-06` falharia); mais uma peça assíncrona sem orçamento |
| C | O motor faz `fetch` para uma function de push | Isola a dependência nova | Auth interna inventada e um segundo cold start no caminho do PIX — exatamente o que `AD-005` recusou |

**Por que o push não é um `NotificationProvider`**: o provider recebe UMA mensagem renderizada para UM
`to` (`providers/types.ts`). O push é um evento → N aparelhos, cada um com desfecho próprio (entregue,
expirada, falhou), e a linha de `order_notifications` resume os N. Forçá-lo na interface faria o
motor reivindicar uma linha por aparelho ou esconder N desfechos atrás de um. Ele vira um ramo do
motor com interface própria, e o `NotificationProvider` continua sendo o ponto de extensão de canais
de destinatário único (o WhatsApp da `43`).

---

## 2. Arquitetura

```mermaid
graph TD
  subgraph Celular["Celular (apps/mobile-adm)"]
    T[AvisosPage /avisos] --> H[usePushNoAparelho]
    H --> PM[PushManager do navegador]
    H --> P[portaDeAvisos.ts<br/>a única chamada à function]
    M[AccountMenu · Sair] --> PA[pararAvisosDesteAparelho]
    PA --> P
    SW[sw-avisos.js<br/>push · notificationclick] -->|abre /pedidos/:id| APP[app]
  end
  P -->|functions.invoke 'atelie-avisos'| F[edge function atelie-avisos<br/>requireAdmin]
  F --> DB[(push_subscriptions<br/>sem policy de cliente)]
  F -->|test| WP
  MP[mercado-pago · webhook / create-payment] -->|dispatchTrigger in-process| D[dispatch.ts]
  SN[send-notification · notify] --> D
  D -->|e-mail, como hoje| R[Resend]
  D -->|owner_*: deliverPush| DP[send-notification/push.ts]
  DP --> DB
  DP -->|claim/finish channel='push'| ON[(order_notifications)]
  DP --> WP[PushSender<br/>@negrel/webpush]
  WP -->|POST cifrado + VAPID| FCM[serviço de push<br/>fcm.googleapis.com]
  FCM --> SW
  C[core/notifications/push.ts<br/>eventos, textos, validação] -.-> DP
  C -.-> F
  C -.-> H
```

**O fluxo de um pedido pago**: o webhook aprova → `dispatchTrigger('payment_approved')` → eventos
`[order_paid|material_instructions, owner_order_paid]` (inalterado) → para `owner_order_paid`, o
motor faz o e-mail como hoje e, **em seguida**, `deliverPush`: lê as inscrições com o evento ligado,
descarta as de conta sem papel, reivindica `(pedido, evento, 'push')`, manda para cada aparelho em
paralelo dentro do que sobra do orçamento, apaga as `410`, fecha a linha com o resumo.

---

## 3. Reuso

| O que existe | Onde | Como a `79` usa |
| --- | --- | --- |
| A memória "já avisei?" | `claim_order_notification`/`finish_order_notification` (migration `42`), índice único `(order_id, event, channel)` | `channel = 'push'`, uma linha por pedido × evento — é `MAN-05` sem código novo de dedupe |
| O gatilho → eventos | `core/notifications/triggers.ts` | Intocado: os quatro `owner_*` já nascem lá |
| As pré-condições de estado | `core/notifications/precondition.ts` | Extraída a parte de **estado** (`orderStateFailure`), sem o contato de e-mail (`MAN-06`); `preconditionFailure` passa a chamá-la e devolve o mesmo que hoje |
| Quem é admin | `_shared/auth.ts` (`requireAdmin`, `has_role`) | A porta usa `requireAdmin`; o motor chama a RPC `has_role` por dono de inscrição (`MAN-18`) |
| CORS e resposta | `_shared/http.ts` | Reexportado pela porta (o guarda `http.test.ts` recusa uma quinta declaração) |
| Número e valor | `core/orders/format.ts` (`formatOrderNumber`, sem import) e `core/formatters/price.ts` (`formatPrice`, sem import) | Os textos do aviso (`MAN-08`), alcançáveis pelo Deno |
| Nomes dos eventos | `NOTIFICATION_EVENT_NAMES` (`core/notifications/catalog.ts`) | Rótulos dos interruptores (`MAN-40`) |
| O histórico | `core/orders/history.ts` (`buildHistory`, `rotuloDoCanal`) | Canal `Celular`, título de falha próprio e sem `emailType` (sem "Reenviar") |
| Molde de function admin | `supabase/functions/admin-users/` | Estrutura da porta (`index.ts` fiação, `handlers.ts` com deps injetadas, `route` por `?action=`) |
| Limitador | `_shared/rateLimit.ts` | **Não** serve para o teste de 30 s: é memória do worker, e a spec pede "por conta"; o teto mora numa tabela por conta (`push_test_claims`, §4.4) |
| O service worker | `pwa.config.ts` (`generateSW`) | Ganha `workbox.importScripts` com um arquivo estático; o precache e a ausência de `runtimeCaching` não mudam |
| A porta de escrita do app | `features/order-actions/api/gravarAcao.ts` + `escritaSoPelaPorta.test.ts` | Molde: uma porta nova, como **entrada literal** do guarda |

---

## 4. Componentes

### 4.1 `packages/core/src/notifications/push.ts` (novo, alcançável pelo Deno)

Todo import relativo com `.ts`; nenhum import de pacote. Reexportado pelo barrel de `notifications`.

- `PUSH_EVENTS: readonly NotificationEvent[]` — os quatro `owner_*`, na ordem de `NOTIFICATION_EVENTS`.
- `isPushEvent(e): boolean`.
- `pushMessage(event, order: { id; order_number; total }): { title; body; url; tag }` — a tabela de
  `MAN-08` por extenso; `url = /pedidos/<id>`; `tag = pedido-<id>-<event>` (o Android substitui um aviso
  de mesma tag em vez de empilhar duas cópias, se algum dia chegarem duas).
- `PUSH_TEST_MESSAGE = { title: 'Avisos ligados', body: 'É assim que os pedidos vão chegar.', url: '/', tag: 'teste' }` (`MAN-31`).
- `pushEndpointRefusal(endpoint: string): string | null` — `null` ou um slug (`not_https`,
  `host_not_allowed`, `invalid_url`). Lista literal de hosts (§7, R2).
- `pushKeysRefusal(p256dh: string, auth: string): string | null` — base64url; `p256dh` decodifica em 65
  bytes começando com `0x04`, `auth` em 16.
- `pushEventsRefusal(events: unknown): string | null` — array sem repetição, subconjunto de `PUSH_EVENTS`.
- `PUSH_SUBSCRIPTION_LIMIT = 10`, `PUSH_TEST_COOLDOWN_MS = 30_000`.
- Vereditos como `string | null`, pelo `strictNullChecks: false` (CLAUDE.md).

`settings.ts`: `NOTIFICATION_CHANNELS` ganha `'push'` (e o `check` do banco junto). Quem já filtra
canal continua filtrando: a porta `send` do `send-notification` passa a recusar `channel = 'push'`
com 400 (`MAN-38`: push não se reenvia).

`precondition.ts`: `orderStateFailure(event, order)` — as regras de estado de hoje, sem a linha
`blank(ctx.ownerEmail)`; `preconditionFailure` = `orderStateFailure(...) ?? contato` — saída idêntica
para todo caso de hoje, e `precondition.test.ts` sem asserção tocada.

`orders/history.ts`: `rotuloDoCanal('push') = 'Celular'`; linha de push `failed` → título
`O aviso no celular não chegou.`, detalhe `e.error`, e **sem** `emailType`/`emailChannel` (é isso que
tira o "Reenviar" do `OrderHistory` do painel, que só o desenha com `ev.emailType`). Linha `sent` →
`<rótulo do evento> (Celular)`, como as outras; quando `provider_message_id` é `push:X/Y` com X < Y, o
detalhe diz `Entregue a X de Y aparelhos` (`MAN-09`). `HistoryNotificationRow` ganha
`provider_message_id?`, e os leitores do painel e do app passam a pedi-lo no `select` — conferir cada
leitura (o painel já o lê em `useAdminOrder.ts:38`; o app, a confirmar na task).

### 4.2 Motor — `supabase/functions/send-notification/push.ts` (novo) e `dispatch.ts`

```ts
// O envio de UM aviso para UM aparelho. Implementação real só no index.ts (jsr); nos testes, dublê.
export interface PushSender {
  send(sub: { endpoint: string; p256dh: string; auth: string },
       message: { title: string; body: string; url: string; tag: string },
       ctx: { timeoutMs: number }): Promise<PushOutcome>
}
export type PushOutcome =
  | { kind: 'sent' }
  | { kind: 'gone'; http: number }          // 404/410 → apagar (MAN-04)
  | { kind: 'failed'; reason: string; http?: number }  // 429, 5xx, rede, timeout (MAN-07)

export async function deliverPush(deps: NotificationDeps, event, order, deadline): Promise<SendResult>
```

Passos de `deliverPush`, na ordem (cada um com o seu caso de teste):

1. `deps.push` ausente → `skipped: 'no_provider'` (`MAN-37`; o e-mail segue).
2. Lê `push_subscriptions` com `events @> {event}` (service role; `select` nomeia as colunas).
3. Dono de cada inscrição: `has_role(_user_id, 'admin')` **uma vez por usuário distinto**; `false` →
   apaga as inscrições dele (`MAN-18`); erro da RPC → **não** envia para aquele usuário e **não**
   apaga (instabilidade não vira permissão nem destruição; log `admin_check_failed`).
4. Endpoint reprovado por `pushEndpointRefusal` → apaga a linha, não envia (`MAN-25`, segunda volta).
5. Zero elegíveis → `skipped: 'no_device'`, **sem** claim (`MAN-20`).
6. `claim_order_notification(order, event, 'push')`; `null` → `already_sent` (`MAN-05`).
7. Orçamento < `MIN_SEND_MS` → `finish(..., 'budget_exhausted')` (`MAN-19`).
8. `Promise.allSettled` dos envios, cada um com `timeoutMs = restante`. `gone` → apaga a linha;
   `sent` → `last_used_at = now()`.
9. `finish`: **≥1 entregue → `p_error = null`** (a linha fica `sent`, terminal para o `claim`) e
   `provider_message_id = 'push:<entregues>/<total>'`; **zero → `p_error`** com o resumo dos motivos
   (`failed`, reivindicável de novo). O resumo "a X de Y" de uma entrega parcial mora em
   `provider_message_id`, **nunca** em `error`: `finish_order_notification` (migration `42`) grava
   `failed` sempre que `p_error` não é nulo, e uma linha `failed` com aparelhos que JÁ receberam seria
   reivindicada pela retentativa do webhook e mandaria o aviso de novo a eles (`MAN-01`, `MAN-05`).
   Emenda de `MAN-09` na spec, no mesmo movimento.
10. Log: `{ action, order_id, event, channel: 'push', status, entregues, total, hosts: [...] }` — só o
    **host** de cada endpoint (`MAN-26`).

**Corrida de dois `claim` sobre a mesma linha `failed`/`pending`** (duas entregas do webhook ao mesmo
tempo, depois de uma falha total): o `claim` da `42` aceita de novo uma linha não `sent`, então as duas
podem enviar. Quem segura a duplicata **na tela** é a `tag` (`pedido-<id>-<event>`): o Android
substitui o aviso de mesma tag em vez de empilhar. O dado (`order_notifications`) fica com a última
escrita. Aceito e declarado — o mesmo vale hoje para o e-mail.

**Exceção dentro do ramo push** (bug nosso): `forEvent` envolve `deliverPush` num `try/catch` próprio e
devolve `{ ok: false, channel: 'push', reason: 'unexpected_error' }`, para o relatório do gatilho não ser
descartado pelo `catch` de `run` (que zera `results`).

`dispatch.ts`:

- `NotificationDeps` ganha `push?: { sender: PushSender }`.
- `forEvent(…, options)` vira **duas metades independentes**:
  1. **Metade e-mail** (`forEmail`) = o corpo de `forEvent` de hoje, **na mesma ordem**:
     `invalid_from` → `preconditionFailure` (estado **e** contato) → `no_provider` → canais. Cada saída
     cedo encerra **só** esta metade, com o mesmo `SendResult` de hoje — inclusive quando
     `invalid_from` e uma falha de estado acontecem juntas (sai `invalid_from`, como hoje).
  2. **Metade push**, só quando chamado por gatilho (`dispatchTrigger`) e `isPushEvent(event)`:
     `orderStateFailure` **por conta própria** (a pré-condição de estado, sem o contato) → falhou,
     `{ ok: false, channel: 'push', precondition }`; senão `deliverPush`. Roda **qualquer que tenha
     sido o desfecho do e-mail** — remetente malformado, sem provedor de e-mail, e-mail desligado ou
     sem endereço (`MAN-06`).
  O estado é conferido duas vezes para os eventos `owner_*` (uma por metade) — função pura, sem custo
  —, e é isso que mantém a metade e-mail idêntica à de hoje em **todo** caso, combinação de falhas
  inclusive.
  A porta do reenvio (`dispatchEvent`) nunca chega à metade push — push perdido não volta (Out of
  Scope, `MAN-38`). Para todo evento sem push (os treze da cliente) a saída de `forEvent` é a de hoje,
  elemento por elemento; `dispatch.test.ts` sem asserção tocada é a régua.
- Ordem: o e-mail do evento antes do push do evento (o push é o último a gastar orçamento).

Fiação — **três** pontos, e o do meio é o que importa (o webhook do PIX):
1. `send-notification/index.ts`: `deps.push = createWebPushSender(...)`.
2. `mercado-pago/handlers.ts`: o tipo `Deps` ganha `push?: NotificationDeps['push']`, e **`fireTrigger`
   repassa** `push: deps.push` no objeto que monta para `dispatchTrigger` (hoje ele monta só
   `supabase, fetch, env, providers` — `handlers.ts:98-103`; sem o repasse, o push morre no caminho
   principal da feature com tudo verde).
3. `mercado-pago/index.ts`: `push: createWebPushSender(...)` nas `deps`.

`createWebPushSender({ keys: Deno.env.get('VAPID_KEYS'), subject: Deno.env.get('VAPID_SUBJECT') })` devolve
`undefined` quando qualquer env falta.

A prova do ponto 2 é **de comportamento**, não de texto: um caso em `mercado-pago/__tests__/handlers.test.ts`
entrega o webhook de pagamento aprovado com um `PushSender` dublê nas `Deps` e uma inscrição na fixtura, e
assere que o dublê foi chamado com o aviso de `owner_order_paid`; o par sem `push` nas `Deps` assere zero
chamadas e o e-mail intacto. O mesmo para `create-payment` → `owner_order_received`. `createWebPushSender` mora em
`supabase/functions/_shared/webPush.ts` — **o único arquivo que importa
`jsr:@negrel/webpush@0.5.0`**, importado só pelos `index.ts` (vitest nunca o carrega; `wiringResolve`
continua lendo os `index.ts`). Ele traduz `PushMessageError.isGone()` → `gone`, outro status → `failed`,
e o tempo esgotado (`Promise.race`) → `failed: 'timeout'`.

### 4.3 A porta — edge function `atelie-avisos` (nova)

`verify_jwt = false` no `config.toml` (mesma razão da `admin-users`); `requireAdmin` de `_shared/auth.ts`
em **toda** ação. `index.ts` só fiação; `handlers.ts` com `{ supabase, sender?, vapidPublicKey? }`
injetados. Corpo JSON, `?action=`:

| Ação | Entrada | Saída | Regras |
| --- | --- | --- | --- |
| `config` | — | `{ applicationServerKey }` | 503 `push_unconfigured` sem VAPID. **A chave pública sai do mesmo secret que assina** — não há segunda cópia dela numa env do app (defeito 01) |
| `status` | `{ endpoint }` | `{ subscribed, events }` | `subscribed` só se a linha é **do chamador**; endpoint de outra conta → `false` (`MAN-36`) |
| `subscribe` | `{ endpoint, keys: { p256dh, auth } }` | `{ events }` | `MAN-25`; upsert por `endpoint`: dono novo → `user_id` = chamador e `events` = os quatro (A5, A8); mesmo dono → mantém `events`; depois, despejo além de 10 por `last_used_at` (`MAN-28`) |
| `events` | `{ endpoint, events }` | `{ events }` | `pushEventsRefusal`; só a linha do chamador (404 `not_found` caso contrário) (`MAN-14`) |
| `unsubscribe` | `{ endpoint }` | `{ ok: true }` | Apaga a linha do chamador; ausente também é `ok` (idempotente) (`MAN-15`, `MAN-30`) |
| `test` | `{ endpoint }` | `{ ok: true }` | Linha do chamador; o teto de 30 s **por conta** é decidido por **uma** RPC atômica, `claim_push_test(p_user_id uuid, p_endpoint text) returns boolean` (`security definer`, `search_path = ''`, `execute` só a `service_role`), na ordem: (1) `pg_advisory_xact_lock(hashtext(p_user_id::text))`; (2) `p_endpoint` é uma inscrição **daquela conta**? Se não, `false` sem consumir o teto (a porta já respondeu 404 antes); (3) **confere**: a linha da conta em `push_test_claims` com `last_test_at > now() - interval '30 seconds'` → `false` sem gravar; (4) **grava**: upsert por `user_id` em `push_test_claims` com `now()` e devolve `true`. O teto é da **conta**, fora da inscrição — ver §4.4 (conserto do probe da T26). `false` por cooldown → 429 `cooldown` (`MAN-33`). Ler e depois gravar pelo PostgREST deixaria duas chamadas quase simultâneas passarem. `gone` → apaga e 410 (`MAN-31`, `MAN-32`) |

Erros: 400 corpo/validação (slug), 401/403 do `requireAdmin`, 404, 429, 503, 500 `db_error` — o
corpo nunca ecoa o endpoint.

### 4.4 Banco — migration `20261026120000_79-avisos-no-celular.sql`

```sql
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,   -- MAN-29
  endpoint      text not null unique,                                        -- MAN-27
  p256dh        text not null,
  auth          text not null,
  events        text[] not null default array['owner_order_received','owner_order_paid',
                  'owner_payment_rejected','owner_material_incoming'],
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  constraint push_subscriptions_events_check check (events <@ array[ ...os quatro... ]::text[])
);
create index if not exists push_subscriptions_user_id on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- nenhuma policy (MAN-23): só a service role (porta e motor) lê e grava
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

-- o teto do aviso de teste: uma linha por CONTA, fora da inscrição (MAN-33)
create table if not exists public.push_test_claims (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  last_test_at  timestamptz not null
);
alter table public.push_test_claims enable row level security;
-- nenhuma policy, os mesmos privilégios de push_subscriptions
revoke all on public.push_test_claims from public, anon, authenticated;
grant select, insert, update, delete on public.push_test_claims to service_role;

-- trava → o aparelho é da conta? → confere → grava (upsert por user_id), atômico por conta
create or replace function public.claim_push_test(p_user_id uuid, p_endpoint text) returns boolean
  language plpgsql security definer set search_path = '' as $$ … $$;
revoke all on function public.claim_push_test(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_push_test(uuid, text) to service_role;

-- o canal novo na memória de envio (recriada, AD-017: a 42 não é editada)
alter table public.order_notifications drop constraint if exists order_notifications_channel_check;
alter table public.order_notifications add constraint order_notifications_channel_check
  check (channel in ('email', 'whatsapp', 'push'));
```

Sem escrita de dado. `PUSH_EVENTS` ↔ o `default` e o `check` são cópia deliberada com guarda que lê
os dois (§6).

**Por que o teto mora numa tabela própria, e não na inscrição** (conserto do probe da T26). A
primeira forma gravava o instante do teste em `push_subscriptions.last_test_at`, na linha do aparelho
testado, e conferia "alguma linha da conta testou há menos de 30 s?". Só que a própria ação `test`
apaga essa linha quando o serviço de push responde "gone" (`MAN-31`, `MAN-35`) — e o teto ia junto: o
teste seguinte noutro aparelho da mesma conta saía na hora (medido: 410/200 em vez de 429,
`probes/probe-03.md`). O teto é uma propriedade da **conta**, não do aparelho, então ele mora numa
linha **por conta** (`push_test_claims`, chave `user_id`), que nenhuma limpeza de inscrição toca e que
cai com a conta (`on delete cascade`). Ganhos de passagem: a troca de dono de um endereço (`MAN-27`)
não tem mais teto para zerar (a porta deixou de gravar `last_test_at: null` no `subscribe`), e a
inscrição não carrega coluna que só um caminho lê. A conferência "o aparelho é da conta?" vem antes
do teto, para um endpoint alheio nunca consumi-lo. Provado em `probes/05-teto-do-teste.ts` (reprova
com a regra antiga, passa com a nova) e no `03-porta.ts` (a porta servida dá 429).

### 4.4.1 Secrets e configuração (`MAN-42`)

| Onde | O quê |
| --- | --- |
| `supabase/config.toml` `[edge_runtime.secrets]` | `VAPID_KEYS = "env(VAPID_KEYS)"` e `VAPID_SUBJECT = "env(VAPID_SUBJECT)"`, com comentário (sem eles, `functions serve` local nunca tem provedor de push) |
| `.env.example` da raiz | As duas linhas, vazias, e como gerar: um script Deno de uma linha que chama `generateVapidKeys({ extractable: true })` + `exportVapidKeys` da mesma lib e imprime o JSON — escrito em `supabase/CLAUDE.md`, não versionado como arquivo executável. `VAPID_SUBJECT=mailto:<e-mail da loja>` |
| `.github/workflows/supabase-deploy.yml`, passo "conferir secrets" | **Fora da lista obrigatória**, com o motivo no comentário (precedente de `MELHOR_ENVIO_ENV`): sem as duas, o push degrada para `no_provider` (`MAN-37`) e nenhum e-mail ou pagamento muda — o modo de falha barato. O passo ganha um `::warning::` quando faltam |
| `supabase/CLAUDE.md` | A ordem de publicação: **migration** (push sozinho: o `check` de canal e a tabela) → **secrets** (`supabase secrets set --env-file` de um diretório **sem `.env`**, `BL-044`, conferindo `{"count":2}`) → **functions** (`atelie-avisos` nova + `send-notification` e `mercado-pago` republicadas) → **bundle do app** |
| `apps/mobile-adm/vercel.json` | `sw-avisos.js` entra na exclusão do `rewrite` (senão vira o `index.html`) e ganha `Cache-Control: no-cache` como o `sw.js`; `vercelConfig.test.ts` estendido |
| `CLAUDE.md` da raiz e handoff do `STATE.md` | A ordem acima e as pendências de operação (gerar e gravar as chaves) no fecho da feature |

### 4.5 O app

- `features/push-notifications/api/portaDeAvisos.ts` — **o único arquivo do app que chama
  `functions.invoke`**, e só com o nome literal `'atelie-avisos'`. Funções: `lerConfig`, `lerStatus`,
  `inscrever`, `gravarEventos`, `desinscrever`, `testar`. **Tradução de erro, no molde de
  `gravarAcao.ts`** (L-047, `BL-048`). O status HTTP da function **não** decide recusa: 401 é "sem
  sessão", e o 403 de `requireAdmin` (`_shared/auth.ts:59-75`) sai também quando `has_role` **falha** —
  lê-lo como "não é admin" traria de volta a recusa falsa que a `72` fechou. E o erro de
  `functions.invoke` não carrega `code: '42501'`, então `isAccessDenied` nunca o reconheceria. A regra:
  - resposta 2xx → o dado;
  - erro de rede (`FunctionsFetchError`, sem status) → **falha** (`{ tipo: 'falhou' }`), nunca recusa;
  - 401 ou 403 → **pergunta à mesma RPC da leitura**, `conferirPapel()` (`shared/api/lerComPapel.ts:62`):
    ela lança `42501` → a porta **relança a recusa no formato único do app**
    (`{ code: ACCESS_DENIED_CODE }`, o mesmo `recusa()` de `gravarAcao.ts`, levado para um helper
    compartilhado em `shared/api/` em vez de copiado); ela resolve (papel de pé) → **falha**, não recusa;
    ela erra por rede/5xx → **falha**;
  - 4xx de validação/`cooldown`/`not_found` → o slug do corpo, para a tela escolher a frase;
  - 5xx → falha.
  Casos obrigatórios (L-047, L-065): 403 com `conferirPapel` respondendo o instante ⇒ **não** é recusa;
  403 com `conferirPapel` em `42501` ⇒ recusa; 401 idem; `FunctionsFetchError` ⇒ falha, sem chamar
  `conferirPapel`; `conferirPapel` sem rede ⇒ falha. Mais o mutante "403 ⇒ recusa direta" morto por
  asserção.
- `features/push-notifications/model/usePushNoAparelho.ts` — a máquina da tela:
  `sem-suporte` (sem `serviceWorker`/`PushManager`/`Notification`) · `bloqueado`
  (`Notification.permission === 'denied'`) · `desligado` · `ativando` · `ligado(events)` ·
  `erro(mensagem)`. Ao montar: `registration.pushManager.getSubscription()` → sem inscrição =
  `desligado`; com inscrição → `lerStatus` → `subscribed: false` = `desligado` (`MAN-36`).
  `ativar()` roda **dentro do toque**: `Notification.requestPermission()` → `lerConfig` →
  `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `inscrever`. Falha na
  porta → `subscription.unsubscribe()` (não deixar inscrição órfã no navegador) e `erro` (`MAN-16`).
  Interruptor → `gravarEventos` otimista, volta em caso de falha, `aria-busy` enquanto grava (`MAN-41`).
- `features/push-notifications/model/pararAvisosDesteAparelho.ts` — `desinscrever` + `unsubscribe()`;
  devolve `'sem-inscricao' | 'parado' | 'falhou'`. Usado pela tela e pelo `AccountMenu`.
- `pages/AvisosPage.tsx` em `/avisos`, dentro do bloco do `RequireAdmin`. Textos exatos da spec
  (`MAN-12`, `MAN-13`, `MAN-16`, `MAN-32`, `MAN-33`). Os quatro interruptores como linhas inteiras
  tocáveis (`<label>` envolvendo o `Switch`, linha com `min-h-12`, a linha é o alvo — `SWITCH_TAP_44`
  é do painel e não é importado), rótulo e nome acessível = `NOTIFICATION_EVENT_NAMES[event]`.
- `widgets/account-menu`: item "Avisos neste celular" (link para `/avisos`) e o `sair` novo:
  `pararAvisosDesteAparelho()` → `'falhou'` mostra a frase de `MAN-30` com "Sair mesmo assim" e
  "Tentar de novo" dentro do próprio painel; os outros dois desfechos → `signOut()` como hoje.
- `public/sw-avisos.js` (JS estático, carregado por `workbox.importScripts: ['sw-avisos.js']`):
  - `push`: `event.data.json()` → `showNotification(title, { body, tag, icon: '/icons/icon-192.png',
    data: { url } })` — sempre mostra, inclusive com o app em primeiro plano (`MAN-22`).
  - `notificationclick`: `url` só se for caminho interno (`/` sem `//`, senão `/`); procura janela do
    app (`clients.matchAll({ type: 'window', includeUncontrolled: true })`). Janela achada →
    `focus()` e `navigate(url)`; **`navigate()` rejeita numa janela que este worker não controla**
    (`includeUncontrolled` a devolve, mas ela não é navegável por ele) → o `catch` cai em
    `clients.openWindow(url)`. Sem janela → `clients.openWindow(url)` (`MAN-03`). O teste do `vm`
    (R10) cobre os três: janela controlada, janela que rejeita `navigate`, nenhuma janela.
  - **Sem** `fetch`, **sem** cache, **sem** acesso à sessão.
- `@estrelinha/auth` (A17): `RequireAdmin` passa `state={{ from: pathname + search }}` no `Navigate`
  (aditivo; o login do painel não lê `state`, conferido em `AdminLoginPage.tsx:42`).
  `apps/mobile-adm/src/pages/LoginPage.tsx` navega para `destinoDepoisDoLogin(location.state)`:
  aceita só caminho interno (começa com `/`, não com `//`), senão `/` (`MAN-21`).

### 4.6 Emendas à spec que este design faz (L-046)

Aplicadas na `spec.md` no mesmo movimento:

- **`MAN-24`/`MAN-42`**: a chave pública **não** entra no app por env (`VITE_VAPID_PUBLIC_KEY`): o app a
  lê da porta (`config`), derivada do mesmo secret que assina. Secrets: `VAPID_KEYS` (o JSON JWK de
  `exportVapidKeys`, as duas metades) e `VAPID_SUBJECT` (`mailto:`). Uma env pública no app seria a
  segunda cópia da chave e divergiria na primeira rotação.
- **`MAN-35`**: o service worker **não** consegue regravar sozinho — ele não tem a sessão (o token mora
  no `localStorage` da página, inalcançável pelo worker), e a porta exige `requireAdmin`. Nova
  redação: a inscrição antiga devolve 410 no envio seguinte e é apagada (`MAN-04`); a tela mostra
  `desligado` ao abrir (`MAN-36`); ativar de novo regrava.

---

## 5. Erros

| Cenário | Tratamento | O que ela vê |
| --- | --- | --- |
| Push service 404/410 | Linha apagada, segue para os outros | Nada (o aparelho expirado não recebe) |
| 429/5xx/rede/timeout num aparelho | Linha mantida, `failed` naquele, segue | Histórico: `entregue a X de Y aparelhos` no detalhe |
| Todos falham | `order_notifications.failed` | Histórico: "O aviso no celular não chegou." sem "Reenviar" |
| VAPID ausente no servidor | `no_provider` no motor; `config` 503 | Tela: "Não consegui ativar os avisos. Tente de novo." |
| `has_role` erra no envio | Não envia, não apaga aquele dono | Nada; log `admin_check_failed` |
| Porta responde 401/403 e `conferirPapel` devolve `42501` | A recusa de acesso da `72` (`{ code: ACCESS_DENIED_CODE }`) | A tela de acesso |
| Porta responde 401/403 e o papel está de pé (ou `conferirPapel` falha por rede/5xx) | Falha comum, nunca recusa (§4.5) | A frase de erro da ação ("Não consegui ativar os avisos. Tente de novo.") |
| Rede caída ao ativar | Inscrição do navegador desfeita | `MAN-16` |
| `requestPermission` negado | Nada gravado | `MAN-12` |
| Sair com a porta falhando | Pergunta no menu | `MAN-30` |
| Exceção no ramo push | O `try/catch` próprio em volta de `deliverPush` (§4.2) devolve `{ channel: 'push', reason: 'unexpected_error' }`; o relatório do gatilho fica inteiro. O `catch` de `run` continua só como última rede | O e-mail do evento já saiu antes |

---

## 6. Guardas (novos e estendidos)

| Guarda | Mudança |
| --- | --- |
| **novo** `pushSubscriptionsSchema.test.ts` (store `shared/lib/__tests__`) | Uma régua por comando (`L-033`): RLS ligada, **zero** `create policy`, `revoke` de `public/anon/authenticated`, `grant` só a `service_role`, `on delete cascade`, `unique` em `endpoint`, o `default` e o `check` de `events` **iguais a `PUSH_EVENTS`** (importado), o `check` de canal com `push`; nada de escrita de dado. `mutar()` que lança |
| `orderNotificationsSchema` | Passa a ler o `check` de canal **vigente** (o da `79`), com a metade que prova que o da `42` não é mais o vigente (molde da `57`). (`storeSettingsDefaults` não lê o `check` de canal e não muda) |
| `chaveDeServidorForaDoNavegador` | Régua nova: `VAPID_KEYS` e `privateKey` de JWK (`"d":`) em `apps/**` reprovam; sensor e inverso |
| `escritaSoPelaPorta` + `leituraSoComPapel` (app) | `portaDeAvisos.ts` entra como importador do client, e `functions.invoke` passa a ser aceito **só** nele e **só** com o literal `'atelie-avisos'` |
| `marcacaoSoPorAcao` (loja) | `claim_push_test` entra na lista literal de RPCs, com o `it.each` que confere o `create function` na migration. As que o ramo push chama (`has_role`, `claim_order_notification`, `finish_order_notification`) já estão nela (conferido: linhas 165–169) |
| `rotasSobGuarda` (app) | `/avisos` dentro do bloco |
| `abasSaoAsRotas` (app) | Lista literal nova `ROTAS_DA_CONTA = ['/avisos']`: rota de primeiro nível sem aba, aceita **só** por estar nela; sensor de uma rota fora dela |
| `vercelConfig` (app) | `sw-avisos.js` fora do `rewrite` e com `no-cache` |
| `swSemDadosDaLoja` (app) | Continua sem `runtimeCaching`; ganha régua de que `importScripts` é exatamente `['sw-avisos.js']` e de que `public/sw-avisos.js` não contém `fetch(` nem `caches` |
| `wiringResolve` (functions) | Âncora derivada: o diretório novo entra sozinho; `_shared/webPush.ts` importado com `.ts` |
| `http.test.ts` (functions) | A porta reexporta `corsHeaders` (`toBe`) |
| `denoReach` (core notifications) | `push.ts` e o grafo dele com `.ts` explícito |
| **novo** `pushSoNoMotor.test.ts` (functions `_shared/__tests__`) | `jsr:@negrel/webpush` importado **só** por `_shared/webPush.ts`, e este **só** pelos `index.ts`; `push_subscriptions` citada só pelo motor (`push.ts`) e pela porta |
| `tomMemorial`/`semPessoas`-like | Os textos de `pushMessage` sem `!`, sem emoji (asserção em `push.test.ts` com a régua de `notificationCopyRefusal`) |

---

## 7. Riscos e preocupações

| # | Preocupação | Onde | Impacto | Mitigação |
| --- | --- | --- | --- | --- |
| R1 | `@negrel/webpush` **não foi revisado por especialista em cripto** (dito no README) e o último release (0.5.0) tem ~1 ano | dependência nova | Cifra errada = aviso que não abre ou inseguro | Isolado em **um** arquivo (`_shared/webPush.ts`) atrás de `PushSender`; versão fixada; a prova no Android real é critério de sucesso; trocar de lib não toca o motor. **Não verificado**: o edge runtime da Supabase resolve `jsr:` em produção — conferir com `supabase functions serve` e `functions deploy` na prova (a Supabase usa `jsr:` nos próprios exemplos, mas este repositório nunca usou) |
| R2 | A lista de hosts de push (A10) é **suposição**: o Chrome no Android usa `fcm.googleapis.com`; **não sei** o host do Samsung Internet nem de outros navegadores Chromium | `core/notifications/push.ts` | Navegador fora da lista não consegue ativar | Recusa clara na tela (`MAN-16`); o host real é medido na prova no Android e anotado; acrescentar host é uma linha + teste |
| R3 | O motor não aborta o `fetch` da lib (ela não aceita `signal`) | `_shared/webPush.ts` | Um POST lento continua no ar depois do `timeout` | `Promise.race` devolve `failed: timeout` no prazo; o POST órfão é inofensivo (o push já foi reivindicado); orçamento respeitado |
| R4 | `forEvent` é o coração de todo e-mail da loja | `dispatch.ts:419` | Refatorar a pré-condição pode mudar um desfecho de e-mail | `preconditionFailure` mantém a saída idêntica; **nenhuma** asserção de `dispatch.test.ts`/`precondition.test.ts` é tocada; o ramo push só roda em `dispatchTrigger` e para `isPushEvent` |
| R5 | Três pontos de fiação do motor (`send-notification/index.ts`, `mercado-pago/index.ts` **e** o `fireTrigger` de `mercado-pago/handlers.ts`) | os três | Esquecer o repasse no `fireTrigger` = push morto no webhook do PIX com o guarda de texto verde | Prova de **comportamento** pelo handler real (§4.2, "Fiação"); `pushSoNoMotor.test.ts` cobre só o que vitest não alcança: `createWebPushSender(` nos dois `index.ts` |
| R6 | O webhook pode chegar antes de qualquer inscrição existir → `no_device` sem claim → uma retentativa posterior, com aparelho já ativado, entrega um aviso velho | `MAN-20` | Aviso de um pagamento de minutos atrás | Aceito: é o comportamento que a spec escolheu (A15) |
| R7 | `has_role` por usuário a cada envio | `deliverPush` | Uma RPC por dono (1–2 contas) | Barato; feito uma vez por usuário distinto |
| R8 | O teste do botão não tem `order_notifications` | porta `test` | Teste não aparece no histórico | É o que a spec pede (`MAN-31`) |
| R9 | O jsdom não tem `PushManager`/`Notification` | testes do app | Prova só por dublê | Dublê com os estados reais (`granted`/`denied`/`default`, `getSubscription` nulo/existente, `subscribe` que lança); a prova em Chrome e no Android fecha (Success Criteria) |
| R10 | `sw-avisos.js` é JS sem tipo, fora de toda suíte | `apps/mobile-adm/public/` | Erro de digitação mata o toque no aviso | Teste que carrega o arquivo num `vm` com `self`/`clients` falsos e dispara `push` e `notificationclick` |
| R11 | Mudança no `@estrelinha/auth` alcança o painel e a loja | `RequireAdmin.tsx:74` | Navegação do painel mudar | Aditiva (`state` a mais); suíte do painel e da loja sem asserção tocada; caso novo no app prova o retorno ao pedido |

---

## 8. Decisões técnicas

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Biblioteca | `jsr:@negrel/webpush@0.5.0` | RFC 8291/8292 sobre WebCrypto, lista Deno; `npm:web-push` depende de `crypto.createECDH` do Node, cuja compatibilidade no edge runtime **não verifiquei** |
| Formato da chave | `VAPID_KEYS` = saída de `exportVapidKeys` (JWK) | É o que `importVapidKeys` aceita; a pública para o navegador sai de `exportApplicationServerKey` |
| Porta das inscrições | Edge function, não RPC | O teste precisa da chave privada e o `config` da pública; uma porta só para tudo |
| Ramo push no motor | Fora do `NotificationProvider` | Um evento → N aparelhos (§1) |
| Push no reenvio | Nunca | Out of Scope; `dispatchEvent` não chega ao ramo |
| SW | `generateSW` + `importScripts` | Mantém o precache e os guardas da `72`; `injectManifest` reescreveria o SW inteiro |
| Teto do teste | Tabela `push_test_claims`, uma linha por conta | "Por conta" sobrevive a worker reciclado (o limitador em memória não) **e** à inscrição apagada por "gone" (a coluna na inscrição não — conserto do probe da T26) |

### AD-062 (projeto)

**O aviso no celular é um canal do motor de notificações, só para os eventos da dona, por aparelho
inscrito.** Inscrições em `push_subscriptions`, sem policy de cliente, gravadas só pela function
`atelie-avisos` (`requireAdmin`); envio só dentro de `dispatchTrigger`, depois do e-mail do mesmo
evento, com a memória `order_notifications (…, channel = 'push')`; a biblioteca de Web Push mora num
arquivo só. Gravado em `.specs/STATE.md`.
