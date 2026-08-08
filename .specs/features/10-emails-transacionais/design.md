# Design — E-mails transacionais via API do Resend

**Spec:** `.specs/features/10-emails-transacionais/spec.md`

## Arquitetura

```
                       ┌──────────────────────────────────────────┐
   navegador admin ───▶│ send-email/handlers.ts                   │
   (session JWT)       │  CORS · ?action=send · auth ADMIN manual │
                       │  allow-list de type                      │
                       └───────────────┬──────────────────────────┘
                                       │ delega
   mercado-pago/handlers.ts            ▼
   (mesmo processo) ──────────▶┌────────────────────────────────────┐
                              │ send-email/sender.ts               │
                              │  sendOrderEmail(deps, {orderId,    │
                              │    type, timeoutMs}) — NUNCA lança │
                              └──┬──────────┬───────────┬──────────┘
                                 │          │           │
                    ┌────────────▼──┐  ┌────▼──────┐  ┌─▼─────────────────┐
                    │ relê o pedido │  │ templates │  │ POST api.resend   │
                    │ + pré-condição│  │  (puros)  │  │  .com/emails      │
                    │ + claim RPC   │  └───────────┘  │  AbortController  │
                    └───────────────┘                 └───────────────────┘
```

**Duas portas, um motor.** `sender.ts` é o motor e não sabe o que é HTTP. `handlers.ts` é a porta do
navegador (backoffice). A `mercado-pago` chama o motor **por import direto**, no mesmo processo.

### Por que import direto e não hop HTTP (AD-005)

Um `fetch` de function-para-function dentro do mesmo deploy custaria: um mecanismo de auth interna
inventado só para isso (comparar bearer com a service-role key — uma credencial de acesso **total** ao
banco usada como bearer do privilégio mais fraco do sistema), um **segundo cold start** no caminho do
PIX, e mais um `fetch` capaz de pendurar. O import relativo com extensão `.ts` é o padrão que
`mercado-pago/handlers.ts:7-26` já usa para `packages/core`. Com ele, a pergunta de auth interna
**deixa de existir**: a única porta autenticada da `send-email` é a de admin.

Contrapartidas aceitas e registradas:
- Consertar template exige redeploy das **duas** functions.
- Um `throw` dentro do módulo de e-mail cairia no catch de `route` (`handlers.ts:725-728`) e viraria
  **500 no pagamento**. Logo o `try/catch` em volta da chamada é **carga estrutural, não decoração**,
  e tem teste próprio (TRG-06).

## Componentes

| Arquivo | Responsabilidade | Puro? |
| ------- | ---------------- | ----- |
| `send-email/index.ts` | Wiring: `Deno.env`, `createClient`, `Deno.serve`. Nada mais. | não |
| `send-email/handlers.ts` | CORS, dispatch por `action`, auth admin, validação de payload, mapa de status HTTP. | não |
| `send-email/sender.ts` | Pré-condição de estado, claim, render, POST ao Resend, finish, log. **Nunca lança.** | não |
| `send-email/layout.ts` | Shell Nanita (`<table>`, inline, sem webfont) + `escapeHtml` + `formatFrom`. | **sim** |
| `send-email/templates.ts` | `renderOrderReceived/Paid/Shipped` → `{ subject, html, text }`. | **sim** |
| `_shared/testing/fakes.ts` | `createFakeFetch`, `createFakeSupabase` (+ `rpcByFn`). | teste |
| `packages/core/src/formatters/price.ts` | `formatPrice`, **sem nenhum import**. | **sim** |

### Contrato de dependências

`sender.ts` define o seu próprio recorte, para que `mercado-pago` não precise absorver env de e-mail
dentro de `env` (que é sobre o MP):

```ts
export interface EmailEnv {
  resendApiKey: string
  resendFrom: string          // default "NanaPin <onboarding@resend.dev>"
  storePublicUrl: string      // origem DA LOJA
  resendDevRedirectTo?: string
}
export interface EmailDeps {
  supabase: any               // service-role; `any` pelo mesmo motivo de handlers.ts:30-33
  fetch: typeof globalThis.fetch
  env: EmailEnv
}
```

A `Deps` da `mercado-pago` ganha **uma** chave nova, `email: EmailEnv`, e a chamada fica
`sendOrderEmail({ supabase: deps.supabase, fetch: deps.fetch, env: deps.email }, …)`.

### Resultado do `sendOrderEmail`

Discriminado, nunca exceção:

```ts
type SendResult =
  | { ok: true;  id: string }
  | { ok: false; skipped: 'already_sent' }
  | { ok: false; precondition: string }          // → 422 na porta HTTP
  | { ok: false; reason: string }                // slug do RSD-01
```

## Fluxo de dados — `sendOrderEmail`

1. **Relê** `orders` + `order_items` com service-role (`select('*, order_items(*)')`, o mesmo shape
   que `useOrder.ts:28-32` já usa).
2. **Pré-condição** por tipo (EML-09). Falha → sai **antes** do claim e antes de qualquer `fetch`.
3. **`claim_order_email(order_id, type)`** → `null` significa "já enviado", sai.
4. **Render** do template puro.
5. **POST** ao Resend com `AbortController` + `setTimeout` (não `AbortSignal.timeout`, pelo mesmo
   motivo já documentado em `useCreatePayment.ts`: fake timers controlam o primeiro, não o segundo).
6. **`finish_order_email(id, provider_message_id, error)`**.
7. **Log** JSON de uma linha, sem PII.

## Modelo de dados

```sql
create table public.order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('order_received','order_paid','order_shipped')),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts int not null default 1,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create unique index order_emails_order_type on public.order_emails (order_id, type);
```

`on delete cascade` é **escolha declarada**, não acidente: perde a auditoria se um pedido for
apagado, o que é aceitável porque nada no produto apaga pedido de fato (cancelar muda `status`).

### A reivindicação atômica (AD-006)

O caminho ingênuo — *checa → insere `pending` → envia → marca `sent`* com índice único **parcial**
`where status = 'sent'` — **não previne envio duplo**: dois chamadores passam a checagem, os dois
inserem `pending` (nenhuma constraint violada, porque nenhum está `sent`), os dois enviam, e o segundo
`update` falha **depois da entrega**. Resultado: e-mail duplicado *mais* linha de auditoria perdida.

```sql
-- claim_order_email: uma statement, sem corrida.
insert into public.order_emails (order_id, type, status)
values (p_order_id, p_type, 'pending')
on conflict (order_id, type) do update
  set status = 'pending', attempts = order_emails.attempts + 1, error = null
  where order_emails.status <> 'sent'
returning id;
```

O Postgres devolve **zero linhas** quando o `where` do `DO UPDATE` é falso — então "já enviado" e
"reivindicado por mim" se distinguem por ter ou não recebido um `id`, numa ida ao banco. E
`supabase-js` **não sabe expressar** esse `on conflict … where` (`.upsert()` não tem `where`): a RPC
não é preferência de estilo, é a única forma correta. Molde copiado de
`20260718235214_payment_approval_rpc.sql` — mesma estrutura `security definer` +
`revoke`/`grant to service_role`.

## Gatilhos

| Onde | Condição | Tipo | Budget |
| ---- | -------- | ---- | ------ |
| `createPayment`, após o log de `:511-520`, antes do return de `:522` | `approvalApplied` | `order_paid` | 2500ms |
| idem | `method==='pix' && syncStatus==='pending' && pix.qr_code` | `order_received` | 2500ms |
| `webhook`, **dentro** do ramo `approved` | `target==='approved' && applied` | `order_paid` | 8000ms |
| backoffice `updateStatus(id,'shipped')` | após update sem erro | `order_shipped` | — |
| backoffice `addTrackingCode` | após update sem erro | `order_shipped` | — |

Duas armadilhas que o desenho evita explicitamente:

- **O booleano da RPC é descartado hoje** no caminho síncrono de cartão (`handlers.ts:490-506` só
  olha `rpcError`). Sem capturá-lo, não há como distinguir "aprovou agora" de "já estava aprovado".
- **O gatilho do webhook não pode ficar depois de `:685`**: `applied` também vira `true` nas
  transições não-aprovadas de `:682`, então um webhook de `refunded` mandaria "pagamento aprovado".

## Alternativas descartadas

| Alternativa | Por que não |
| ----------- | ----------- |
| `EdgeRuntime.waitUntil` para não bloquear | Zero precedente no repo; só pode viver no `index.ts`, que é deliberadamente sem teste; **morre no recycle do worker** (`policy = "per_worker"`) deixando linha `pending` órfã; e quebraria as asserções síncronas dos 81 testes atuais. O `await` limitado é a mesma medicina que `BUG-20260728-edge-runtime-sem-dns` já ensinou: limite as chamadas de saída. |
| Trigger no Postgres com `pg_net` | Põe apresentação no banco, é o mais difícil de testar, e o repo não usa `pg_net` em lugar nenhum. |
| Templates em `packages/core/src/email/` | Consumidor único, para sempre. AD-002 existe para a conta de dinheiro que loja **e** servidor precisam calcular igual; HTML de e-mail não tem contraparte no browser. E colocar em `supabase/functions/**` custa **zero** config nova (o glob do `vitest.config.ts` já pega). Bundle size **não** é argumento: o Vite empacota só o que é importado. |
| Duplicar `formatBRL` no módulo de e-mail | Recibo mostrando moeda diferente do checkout é exatamente a classe de bug que L-007/BMP-04 documentam. Em vez de duplicar, quebra-se `formatters.ts` para que `formatPrice` fique importável do Deno. |
| CTA para `/pedido/:id` | Rota protegida por RLS (`users read own orders`); sem sessão renderiza "Pedido não encontrado" (`OrderConfirmationPage.tsx:42-64`). Com ~90% de tráfego mobile, webview de Gmail/WhatsApp sem localStorage é o caso **comum**, não a exceção. |
| `verify_jwt = true` na function | Teatro de segurança: a anon key pública **é** um JWT válido do projeto e passaria pelo gateway. A checagem que importa é papel admin, e ela só pode ser feita dentro do handler. |

## Decisões a registrar em STATE.md

- **AD-005** — E-mail transacional: porta HTTP separada para o backoffice, motor importado
  in-process pela `mercado-pago`.
- **AD-006** — Idempotência de efeito externo por RPC de claim atômico, não por índice parcial.
- **AD-007** — Contrato dirigido por estado: `{ type, order_id }` + releitura e pré-condição no
  servidor. O chamador nunca informa destinatário, conteúdo, nem afirma o estado.
- **AD-008** — Chamadas de saída não-críticas são `await` limitado por `AbortController`, nunca
  trabalho em background.
