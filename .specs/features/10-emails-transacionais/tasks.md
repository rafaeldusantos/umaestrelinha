# 10-emails-transacionais Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

> ⚠️ **Override de projeto sobre commits.** O `CLAUDE.md` deste repositório determina:
> *"não criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a conclusão e
> gerar os commits completos da implementação de uma vez (isso sobrepõe o comportamento padrão de
> commits atômicos da Skill)."*
> Portanto: **não há commit por task.** Os gates por task seguem obrigatórios (teste tem de passar
> antes de a task fechar); só o commit é diferido. Commits agrupados no fim deste arquivo.

> ⚠️ **Sub-agents workers não são usados** nesta feature (restrição da sessão: não invocar o Agent
> tool sem pedido explícito do usuário). A verificação independente roda pelo *standalone fallback*
> de `validate.md` — passe de olhos frescos após a última task, incluindo checagem ancorada na spec e
> sensor de discriminação por mutação.

**Design:** `.specs/features/10-emails-transacionais/design.md`
**Status:** ✅ **T1–T11 fechadas.** Gate verde (1.002 testes), build exit 0, sensor de discriminação
**17/17 killed**. Relatório em `validation.md`. Falta: os **commits** e a execução do **roteiro manual**
do T11, que exige credencial real do Resend.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T1 | ✅ | `formatters/{price,date,index}.ts`; core 303→310; `pnpm build` exit 0 prova a resolução do subpath; teste estrutural garante `price.ts` sem imports |
| T2 | ✅ | `layout.ts` + `templates.ts`; 52 testes; escape provado como teste de **injeção** (`<img onerror>` neutralizado) |
| T3 | ✅ | `_shared/testing/fakes.ts` + `rpcByFn`; `md5sum` de `handlers.test.ts` **idêntico** ao baseline (reexport transparente); +5 testes |
| T4 | ✅ | `20260730120000_order_emails.sql`; IDM-01…06 provadas em transcript psql dentro de `ROLLBACK`; migration depois aplicada e sobreviveu ao `stop/start` |
| T5 | ✅ | `sender.ts`/`handlers.ts`/`index.ts` + 57 testes. Cada guard com status **e** asserção de zero chamadas externas (L-004); cada slug de erro do provedor com seu caso (L-006); precedência 403≻400 declarada e testada (L-005) |
| T6 | ✅ | 4 secrets + `[functions.send-email]` + `.env.example`. `supabase stop && supabase start`; probe: `send-email` 401/400, `mercado-pago` 400/400, **zero** `Module not found` |
| T7 | ✅ | Booleano da RPC capturado, `extractPixData` hoistado, 2 gatilhos, `try/catch` isolando; 15 testes. **Falso verde encontrado e consertado** — ver `validation.md` |
| T8 | ✅ | `sendOrderEmail.ts` + os dois escritores + erro exposto + dica inline; backoffice 62→85 |
| T9 | ✅ | Copy diferenciada por `paid_at`; o assert anti-e-mail foi **invertido**, não apagado |
| T10 | ✅ | CLAUDE.md (2 blocos), AD-005…AD-008, ponteiro *superseded* na 08, charter de QA, `BUG-20260730-separating-viola-check-do-banco.md` |
| T11 | ⚠️ | Roteiro escrito em `sender.ts` (8 itens). **Execução pendente** — exige credencial real do Resend. Fecha as 2 assumptions declaradas (status do sucesso, shape do erro) |

### Desvio registrado (T5)

`sender.test.ts` **não** foi escrito. Os testes de `handlers.test.ts` já asseveram cada pré-condição e
cada slug pelo caminho real; testar `preconditionFailure`/`classifyResendFailure` isolados duplicaria a
mesma cena em outra camada, o que o Check C manda remover. As mutações M1/M2/M4 confirmam que a
cobertura pelo handler discrimina.

## Gate Check Commands

| Nível | Comando |
| ----- | ------- |
| quick | `pnpm --filter @nanapin/functions test` **ou** `pnpm --filter @nanapin/core test` (o pacote da task) |
| full | `pnpm turbo run test --force` |
| build | `pnpm turbo run test --force && pnpm build` |

`pnpm lint` fica **fora do gate** por dívida pré-existente (`CLAUDE.md` → *Estado conhecido*).
Baseline a preservar (09): functions **81** · core **303** · backoffice **62** · store **372** = **818**.

## Execution Plan

| Task | Título | Depende de | Tests | Gate |
| ---- | ------ | ---------- | ----- | ---- |
| T1 | `01-formatters-price-split` | — | unit (core) | quick |
| T2 | `02-email-templates` | T1 | unit (functions) | quick |
| T3 | `03-shared-test-fakes` | — | unit (functions) | quick |
| T4 | `04-migration-order-emails` | — | psql (manual, transcrito) | build |
| T5 | `05-send-email-sender-and-handlers` | T2, T3, T4 | unit (functions) | full |
| T6 | `06-config-and-env` | T5 | runtime probe | build |
| T7 | `07-mercado-pago-triggers` | T5 | unit (functions) | full |
| T8 | `08-backoffice-shipped-trigger` | T5 | unit (backoffice) | full |
| T9 | `09-store-confirmation-copy` | — | unit (store) | full |
| T10 | `10-docs-specs-state` | T1–T9 | — | — |
| T11 | `11-roteiro-manual-resend` | T6 | manual | — |

---

### T1 — `01-formatters-price-split`

Quebrar `packages/core/src/formatters.ts` em `formatters/{price,date,index}.ts`. `price.ts` fica com
`formatPrice` e **sem nenhum import** (mesma regra de autocontenção de `payment/status.ts:5-6`);
`date.ts` mantém `formatRelativeDate` e o `date-fns`; `index.ts` reexporta os dois. O subpath
`"./formatters"` do `package.json` passa a apontar para o index → **zero mudança em call site**.

**Por quê:** `formatters.ts:1` importa `date-fns` por especificador nu; Deno não resolve sem import
map. Duplicar a formatação de dinheiro no e-mail criaria recibo divergente do checkout — a classe de
bug de L-007/BMP-04.

**Done when**
- `formatPrice` importável por caminho relativo `.ts` de dentro de uma edge function.
- Nenhum consumidor de `@nanapin/core/formatters` mudou.
- `price.ts` tem zero linhas de `import`.

**Tests:** `packages/core/src/__tests__/formatters.price.test.ts` — string BRL exata **incluindo o
codepoint do espaço** (`Intl.NumberFormat('pt-BR')` emite NBSP e o codepoint variou entre versões de
ICU; o ICU do Node/vitest e o do Deno não são o mesmo build, então asserção exata faz drift virar
teste vermelho em vez de glifo estranho no recibo); zero, centavos, milhar.

---

### T2 — `02-email-templates`

`layout.ts` (shell Nanita + `escapeHtml` + validação de `from`) e `templates.ts` (os três renders),
puros. Copiar as restrições de `supabase/templates/magic_link.html`: tudo inline, `<table>`, **sem
webfont** (as pilhas de fonte *são* a decisão de design, `:5-7`), card 560px,
`border:1px solid #FFD7E7`, `border-radius:24px`, header `#2B1622` com wordmark "Nanita"
32px/`#FF86B5`, rodapé "NanaPin — cole no peito, carrega no coração." Somar: variante `text` sempre,
CTA ≥44px, sem `background-image`.

**Done when:** TPL-01…TPL-08 e CFG-03 satisfeitas.

**Tests:** `send-email/__tests__/templates.test.ts` — invariantes de HTML; **escape** de
`customer_name`/`product_name`/`tracking_code` (injeção, não cosmética); `text` com `order_number` +
total; `STORE_PUBLIC_URL` com e sem barra final → href idêntico; CTA aponta `/conta`; nunca renderiza
rótulo "Rastreio:" vazio; `formatPrice` do core é a fonte do valor; `from` malformado rejeitado.

---

### T3 — `03-shared-test-fakes`

Mover `createFakeFetch`/`createFakeSupabase` para `supabase/functions/_shared/testing/fakes.ts`;
`mercado-pago/__tests__/fakes.ts` passa a reexportar e mantém `TEST_ENV`/`createDeps`. Adicionar
**`rpcByFn?: Record<string, {data,error}>`** com precedência sobre `rpc`.

**Por quê:** hoje `createFakeSupabase` devolve o mesmo resultado para **qualquer** nome de RPC
(`fakes.ts:188-191`), e o fluxo novo usa `claim_order_email` + `has_role` + `finish_order_email` no
mesmo caminho — sem discriminar por nome, o teste não consegue montar o cenário.

**Done when:** `mercado-pago/__tests__/handlers.test.ts` passa **byte-idêntico** (diff vazio);
`rpcByFn` discrimina dois nomes num fluxo.

**Tests:** um teste novo em `_shared/testing/__tests__/fakes.test.ts` provando a discriminação e a
precedência sobre `rpc`.

---

### T4 — `04-migration-order-emails`

Tabela `order_emails`, índice único **não parcial** `(order_id, type)`, RLS ligada com leitura admin
via `has_role` e **nenhuma** política de escrita, RPCs `claim_order_email`/`finish_order_email` com o
bloco `revoke`/`grant execute to service_role` copiado de `20260718235214:61-64`.

**Done when:** IDM-01…IDM-06 satisfeitas.

**Tests:** `supabase db reset` limpo + transcript psql em `validation.md` (o repo não tem pgTAP):
dois `claim` seguidos → segundo devolve `null`; `claim` após `finish(failed)` → id novo com
`attempts = 2`; `claim` após `finish(sent)` → `null`; `select` como `anon` → 0 linhas; `execute` da
RPC como `authenticated` → negado.

---

### T5 — `05-send-email-sender-and-handlers`

`sender.ts` (pré-condições, claim, render, POST com `AbortController`, finish, log) + `handlers.ts`
(CORS + `OPTIONS`, `?action=send`, auth admin via `rpc('has_role', …)` no client **service-role**,
allow-list de `type` **antes** de qualquer ida ao banco, respostas de chave única `error`) +
`index.ts` (wiring).

**Done when:** EML-01…EML-13, RSD-01, RSD-02, IDM-07, CFG-04 satisfeitas.

**Tests:** `send-email/__tests__/{handlers,sender}.test.ts`. Cada guard que retorna antes de chamada
externa tem teste asseverando **status + zero chamadas de saída** (L-004): 401, 403, 400 (type), 400
(uuid), 404, 422 por tipo. Mais: precedência 403-vence-400 (EML-02, L-005); `OPTIONS` → CORS; happy
path com `from`/`to`/`Idempotency-Key`/`provider_message_id`; **cada** slug do RSD-01 com seu status
(L-006); `already_sent` → zero `fetch`; `RESEND_DEV_REDIRECT_TO` → destinatário trocado + assunto
prefixado; 201 tratado como sucesso.

---

### T6 — `06-config-and-env`

`[edge_runtime.secrets]` + `[functions.send-email] verify_jwt = false` (com o comentário do teatro de
segurança) + `.env.example`.

**Done when:** CFG-01, CFG-02, CFG-05 satisfeitas.

**Verify:** `supabase stop && supabase start`; `deno check`; curl sem auth → 401; **worker sobe** —
é o alarme de `503 Module not found` de `handlers.ts:127-132` (o CLI bind-monta um arquivo por módulo
importado, calculado na subida do container; arquivo novo importado exige restart).

---

### T7 — `07-mercado-pago-triggers`

Capturar o booleano da RPC em `:490-506`, hoistar `extractPixData` acima do log, um bloco de e-mail
antes de `:522`, gatilho do webhook **dentro** do ramo `approved`, `try/catch` isolando. `Deps` ganha
`email: EmailEnv`.

**Done when:** TRG-01…TRG-11 satisfeitas.

**Tests:** em `mercado-pago/__tests__/handlers.test.ts`. Inclui obrigatoriamente: **`sender` lançando
→ PIX ainda 200 com `qr_code`** e webhook ainda `{received:true}` (TRG-06 — o `try/catch` é carga,
não decoração); webhook `refunded` com `applied=true` → **zero** e-mails (TRG-03); `qr_code` vazio →
zero (TRG-09).

---

### T8 — `08-backoffice-shipped-trigger`

Primeiro **expor o erro** de `updateStatus` (hoje descartado em `OrderDetailDialog.tsx:64-70`);
depois tentar o envio nos dois escritores; dica inline; toast de sucesso só com `sent: true`.

**Done when:** TRG-12…TRG-14, UX-01, UX-02 satisfeitas.

**Tests:** `shipped` com rastreio → invoke chamado; sem rastreio → invoke chamado e o 422 **não**
gera toast de erro; `addTrackingCode` em pedido já `shipped` → invoke; erro de banco → `toast.error`
(**esse teste falha hoje** — é o ponto).

---

### T9 — `09-store-confirmation-copy`

Copy honesta na `OrderConfirmationPage`, diferenciada por `paid_at`.

**Done when:** STO-01 satisfeita.

**Tests:** **inverter** o assert de `OrderConfirmationPage.test.tsx:185-190` (não apagar — o guard
segue valendo para a variante pendente); variante pendente não alega comprovante enviado; conferir em
390px.

---

### T10 — `10-docs-specs-state`

`CLAUDE.md` (seção Backend + o bullet de `:124-127`: Resend agora tem **dois** usos), AD-005…AD-008 em
`.specs/STATE.md`, ponteiro *superseded by* em `08-checkout-one-page/spec.md:66` (**não apagar**),
`must_try` novo no charter de QA, bug do `'separating'` em `docs/qa/bugs/`.

---

### T11 — `11-roteiro-manual-resend`

Bloco `ROTEIRO MANUAL` em comentário no `sender.ts`, no estilo de `handlers.ts:116-194`. Fecha as
duas assumptions declaradas: **o código HTTP real do sucesso** e **a shape JSON do erro**. Mais: texto
do 403 sandbox, `Idempotency-Key` honrado, PIX ponta-a-ponta → inbox → linha em `order_emails`, e o
par `shipped`→rastreio **e** rastreio→`shipped`. Renderização em Gmail mobile + Outlook web — nenhum
teste prova isso.

---

## Test Coverage Matrix

| Camada | Onde | Coverage Expectation |
| ------ | ---- | -------------------- |
| Domínio puro (`layout.ts`, `templates.ts`, `formatters/price.ts`) | `functions/send-email/__tests__/templates.test.ts`, `core/src/__tests__/formatters.price.test.ts` | Asserções 1:1 com as ACs TPL-*/CFG-03; cada edge case listado tem teste dedicado. Escape de HTML é teste de injeção. |
| I/O da function (`sender.ts`, `handlers.ts`) | `functions/send-email/__tests__/` | Happy path + **cada** guard com status **e** asserção negativa de chamada externa (L-004) + **cada** ramo de erro do provedor com seu slug (L-006) + precedência declarada (L-005). |
| Gatilhos (`mercado-pago/handlers.ts`) | `functions/mercado-pago/__tests__/handlers.test.ts` | Cada gatilho e cada não-gatilho asseverado por contagem de e-mails; isolamento de falha asseverado pela **resposta do pagamento**, não por ausência de throw. |
| UI (backoffice, store) | `apps/*/src/**/__tests__/` | Estado resultante (toast, texto), não contagem de chamada isolada. |
| Banco (`order_emails`, RPCs) | transcript psql em `validation.md` | Corrida de claim, retry após falha, grants, RLS. |

## Commits sugeridos (um lote no fim)

1. `refactor(core): separa formatPrice do date-fns para uso em edge function` — T1
2. `feat(functions): templates Nanita de e-mail transacional` — T2
3. `test(functions): compartilha os fakes e discrimina RPC por nome` — T3
4. `feat(db): order_emails com reivindicação atômica de envio` — T4
5. `feat(functions): edge function send-email sobre a API do Resend` — T5, T6, T11
6. `feat(payment): dispara e-mail de pedido recebido e pago` — T7
7. `feat(backoffice): avisa o cliente quando o pedido é enviado` — T8
8. `feat(store): confirmação passa a mencionar o e-mail` — T9
9. `docs(specs): registra a feature 10 e as decisões AD-005..AD-008` — T10
