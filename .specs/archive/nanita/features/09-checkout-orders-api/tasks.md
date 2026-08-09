# 09-checkout-orders-api Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> ⚠️ **Override de projeto sobre commits.** O `CLAUDE.md` deste repositório determina:
> *"não criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a conclusão e
> gerar os commits completos da implementação de uma vez (isso sobrepõe o comportamento padrão de
> commits atômicos da Skill)."*
> Portanto: **não há commit por task.** Os gates por task continuam obrigatórios (teste tem de passar
> antes de a task fechar); só o commit é diferido. Commits agrupados no fim deste arquivo.

**Design**: `.specs/features/09-checkout-orders-api/design.md`
**Status**: In Progress — **T1–T18 executadas**. Verificação independente rodou e voltou ❌ FAIL por
lacuna de discriminação dos testes (3 mutantes sobreviventes no caminho do dinheiro); **T18 fechou as 6
lacunas** com mutação medida. Falta: **reexecução do roteiro de sandbox** (os fixes D1–D7 estão provados
por teste, mas os que dependem do MP de verdade só fecham numa nova passada de runtime) e os **commits**.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T1 | ✅ | `20260728120000_orders_mp_order_id.sql` aplicada; `information_schema` confirma `mp_order_id text` + `idx_orders_mp_order_id` |
| T2 | ✅ | `orders.ts` + 17 testes; `expiration` param e seu teste **removidos** no Check C (não mapeavam a nenhuma AC) |
| T3 | ✅ | `extractPixData`/`extractPaymentId` + 8 testes; 3 fallbacks sem lançar |
| T4 | ✅ | `MP_STATUS_MAP` união; `status.test.ts` 50→57, as 7 legadas intactas; `at_terminal → null` asseverado |
| T5 | ✅ | `resolveCardOutcome` + 7 testes; STA-03 asseverado **por valor** |
| **Gate Phase 1** | ✅ | `pnpm build` ✅ · flake destravado (ver abaixo) |
| T6 | ✅ | `handlers.ts` extraído. **Fidelidade provada**: `diff` do corpo transformado contra o do `HEAD` → 483 linhas idênticas, só `notification_url` (mudança anterior, já roteada por `deps.env`) difere. Probe de boot: 400/401 |
| T7 | ✅ | workspace `@nanapin/functions` + `fakes.ts` + 5 testes. `pnpm turbo run test --force` exit 0 com os 4 pacotes: functions **5** · core **279** · backoffice **62** · store **372** = **718** |
| **Gate Phase 2** | ✅ | `full` verde + probe de boot 400/401 — o `node_modules` do workspace novo **não** quebrou o bundle da function (risco retirado antes do T14) |
| T8 | ✅ | `POST /v1/orders` via `buildOrderPayload`; `pixExpirationISO` + `PIX_EXPIRATION_MINUTES` apagados; 4 testes (URL, envelope, `payment_method` por método, `X-Idempotency-Key`) |
| T9 | ✅ | `mp_order_id`/`mp_payment_id` persistidos, `extractPixData` na resposta, 502 em 5xx/rede/2xx-sem-id com asserção negativa, 400 repassando `message`; 9 testes |
| T10 | ✅ | `resolveCardOutcome` no cartão; `action_required` fora do `waiting_transfer` grava `payment_status='rejected'` e responde 200 `{status:'rejected'}`; 2 testes (com o contraste do PIX) |
| T11 | ✅ | `cancelPreviousOrder` como função separada, chamada após montar o payload; falha → `previous_order_cancel_failed` e prossegue; 5 testes |
| T12 | ✅ | webhook em `type==='order'` + `GET /v1/orders/{data.id}`; `type:'payment'` vira no-op; lookup nos 3 caminhos; 6 testes |
| T13 | ✅ | `duplicate_approved_other_order` sem reaplicar RPC, transições por `canTransition`, log com `mp_order_id`; 5 testes |
| **Gate Phase 3+4** | ✅ | `full` verde: functions **36** · core **279** · backoffice **62** · store **372** = **749** |
| T14 | ✅ | `supabase stop && supabase start` executado; probe de boot **400** (`action inválida`), não 503; `docker logs supabase_edge_runtime_nanapin-store` sem `Module not found` — os logs estruturados citados em `validation.md` (cenários 1–7) só existem porque o worker subiu |
| T15 | ✅ | Assumption nº1 **confirmada** na doc oficial *Status da order* (online) e marcada `y` na `spec.md`. Divergência encontrada e corrigida **com teste**: `processing` faltava no mapa (homonímia com o `in_process` da API antiga) e cairia em `null`, prendendo o pedido — `status.test.ts:81-103` cobre os 9 status oficiais + `at_terminal → null` |
| T16 | ⚠️ | Roteiro executado (`validation.md`, ~590 linhas de valores medidos). **Placar: 4 PASS · 2 FAIL · 1 não conclusivo**, e o achado principal foi um **bloqueador de produção** — `notification_url` no corpo ⇒ 400 em *todo* pagamento. 9 defeitos (D1–D9) registrados; D1–D4, D6–D8 corrigidos, D5 pela metade, D9 fora de escopo. Cenários 1 e 2 ficam com `[ ]` de propósito (ver o corpo da task) |
| **Rodada de fixes pós-T16** | ✅ | `full` verde: functions **47** · core **300** · backoffice **62** · store **372** = **781**. ACs ORD-06, ORD-07, STA-04 e WHK-02 reescritas com o medido |
| T17 | ✅ | Fronteira por diff verificada (2 exceções declaradas na `spec.md`, ver o corpo da task); `pnpm test` e `pnpm build` verdes |
| **Verificação independente** | ❌ → ✅ | Verifier (autor ≠ verificador) apontou **FAIL**: 24/24 ACs rastreadas com `file:line`, mas **3 de 10 mutações sobreviveram** no caminho do dinheiro + 8 ramos de guarda sem teste + 2 ACs se contradizendo. Relatório apendado em `validation.md` → *Verificação independente (Verifier)* |
| T18 | ✅ | Fechamento das 6 lacunas. **10 mutações aplicadas, 10 killed**; functions **47 → 81**, core **300 → 303**. Nenhuma linha de produção alterada (`md5sum` conferido) |

### Desvio de design registrado (T7)

O design punha o roteamento por `action` dentro do `Deno.serve` do `index.ts`. Isso o tornava
**não testável**, e o smoke test 1 de T7 (`action` inválida → 400) seria impossível de escrever.
Movido para `route(deps, req)` em `handlers.ts`; `index.ts` ficou com env + client + `Deno.serve`
— que é exatamente o alvo que o próprio design descrevia. `design.md` atualizado.

### ✅ RESOLVIDO — flake pré-existente em `apps/store`

**Conserto** (autorizado pelo usuário, fora do escopo original da 09):
`apps/store/src/test/setup.ts` ganhou um `afterAll` que cede ~100ms por **arquivo** de teste — não por
teste, o que custaria ~22s em vez de ~3,7s. Isso dá aos três timers vazados a chance de disparar
enquanto o jsdom ainda existe.

**Validação**: 5 rodadas `pnpm turbo run test --force` seguidas, todas exit 0, contra `1,1,0,0,1,0` nas
6 rodadas reais anteriores. Contagens preservadas: core **279** · backoffice **62** · store **372**.

**Registrado** como exceção explícita no critério de fronteira da `spec.md`. É setup de teste, não
código de produção da loja. Comentário no arquivo diz quando remover (quando o `input-otp` limpar os
timers no unmount).

<details><summary>Diagnóstico original</summary>

`pnpm test` alterna entre exit 0 e exit 1 **sem mudança de código**. 6 rodadas reais (cache do turbo
desligado com `--force`): `1, 1, 0, 0, 1, 0`.

- **Causa**: `input-otp` (`src/input.tsx:250`) agenda um `setTimeout` que chama um setter do React; ao
  disparar após o teardown do jsdom, `getCurrentEventPriority` acessa `window` e estoura
  `ReferenceError: window is not defined`. `apps/store/src/test/setup.ts` não tem `afterEach`/`cleanup`.
- **Não é desta feature**: o arquivo culpado **muda** entre rodadas (`AuthCodeStep.test.tsx` numa,
  `AuthResetCodeStep.test.tsx` noutra) — corrida, não determinismo. Só reproduz sob o paralelismo do
  turbo, nunca na loja isolada (3/3 verde). Nenhum caminho causal liga chaves de `MP_STATUS_MAP` a um
  timer vazado num input OTP. Origem provável: `eaf06dd feat(auth): reset de senha por código`.
- **Por que não é adiável**: os gates `full` de T7–T13 usam `pnpm test`. Um gate ~50% vermelho torna a
  verificação do resto da feature sem valor — não distingue regressão de sorte.

</details>

> **Decisões do usuário incorporadas nesta revisão:**
> 1. **Gap de teste do edge function: EXPANDIR.** O layer sai de `Tests: none` e ganha harness com
>    dependências injetadas. Custou +2 tasks e uma reordenação de fases.
> 2. **Sandbox (T16): eu conduzo com `playwright-cli`**, com fallback declarado para os cenários de
>    cartão se o iframe do Brick resistir à automação.
>
> **Por que as fases foram reordenadas:** extrair as costuras testáveis vem **antes** de reescrever a
> API. Na ordem inversa eu escreveria testes contra o `/v1/payments` que estou apagando, e os jogaria
> fora na task seguinte. Os 2 smoke tests da Phase 2 foram escolhidos justamente por serem verdadeiros
> **antes e depois** da migração (`action` inválida → 400; webhook sem assinatura → 401).

---

## Test Coverage Matrix

> Gerada de codebase + guidelines + spec — confirmar antes do Execute. **Guidelines encontradas:**
> `CLAUDE.md` (convenções do monorepo, comandos, dívida conhecida de `pnpm lint`),
> `packages/core/vitest.config.ts` (env `node`, include `src/**/*.{test,spec}.ts`),
> `apps/store/vitest.config.ts`, `turbo.json`, `pnpm-workspace.yaml`. **Sem thresholds de coverage e
> sem CI** (`.github/workflows` não existe) ⇒ **strong defaults aplicados**.
> Amostragem: `packages/core/src/payment/__tests__/{status,payer,pricing,orderBump,webhookSignature,displayedEqualsCharged}.test.ts`.
> Baseline: **240 testes / 15 arquivos** verdes em `@nanapin/core`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio puro de pagamento (`orders.ts`, `status.ts`) | unit | Todas as branches; 1:1 com as ACs da spec; todo edge case listado tem teste | `packages/core/src/payment/__tests__/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Handlers da edge function (`handlers.ts` — I/O com deps injetadas) | **integration** | Todo AC de I/O da spec: caminho felizes + **cada** caminho de erro (401/403/409/422/400/502) + idempotência | `supabase/functions/mercado-pago/__tests__/*.test.ts` | `pnpm --filter @nanapin/functions test` |
| Wiring da edge function (`index.ts` — `Deno.serve` + deps reais) | none — gate de runtime | Boot sem `BOOT_ERROR` + roteamento de `action` | — | probe de boot (T14) |
| Migration SQL (`supabase/migrations/*.sql`) | none — build gate | Aplica sem erro e é idempotente (`if not exists`) | — | `npx supabase migration up` |
| Loja (`apps/store/**`) | **n/a — não é tocada** | Ausência no `git diff` é o próprio critério | — | — |

> ✅ **O gap de T6–T11 da revisão anterior foi fechado.** O único `none` que sobra é o wiring do
> `index.ts`, e ele é legítimo: depois da extração da Phase 2 esse arquivo é ~20 linhas de
> `Deno.serve` + construção de deps reais, sem regra de negócio. O que era ponto cego virou
> `integration`.
>
> ⚠️ → ✅ **A *Coverage Expectation* da linha de handlers ficou `❌ não atendida` até o T18.** O
> Verifier mediu: caminhos felizes, 400 e 502 cobertos; **401** só na assinatura do webhook; e
> **nenhum** teste em 401 (create-payment), 403, 404, 409, 422 (×3) e 500 — 8 ramos de guarda, todos
> **anteriores** à chamada ao MP. T6 declarou "comportamento idêntico — movimentação, não reescrita",
> e movimentação sem teste dos ramos movidos é precisamente como comportamento desaparece em
> silêncio. Fechado no T18, com a asserção que o requisito realmente pede em cada um:
> `expect(fetchDouble.calls).toHaveLength(0)`.

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| **quick** | Tasks que só tocam domínio puro | `pnpm --filter @nanapin/core test` |
| **handlers** | Tasks que tocam `handlers.ts` | `pnpm --filter @nanapin/functions test` |
| **full** | Fim de fase / tasks que atravessam pacotes | `pnpm test` |
| **build** | Tasks de schema, workspace e config | `pnpm build && pnpm test` |
| **runtime** | Depois de mudar imports ou o workspace da edge function | `supabase stop && supabase start`, depois `curl -s -o /dev/null -w "%{http_code}" "<base>/functions/v1/mercado-pago"` ⇒ espera **400**, **não** 503 `BOOT_ERROR` |

> `pnpm lint` **não** entra em gate: já falha por `no-explicit-any` pré-existente nos hooks admin
> (CLAUDE.md → *Estado conhecido*). Lint fica escopado aos arquivos tocados.

---

## Execution Plan

Setas = **dependências reais**, não ordem de execução (é o que o cross-check valida).

### Phase 1: Domínio puro + schema (5)
```
T1 (isolada)     T2 ──→ T3     T4 ──→ T5
```
Execução: T1 → T2 → T3 → T4 → T5

### Phase 2: Costuras testáveis (2)
```
T6 ──→ T7
```
Execução: T6 → T7

### Phase 3: create-payment (4)
```
T2, T7 ──→ T8 ──→ T11
T1, T3, T8 ──→ T9 ──→ T10 ←── T5
```
Execução: T8 → T9 → T10 → T11

### Phase 4: webhook (2)
```
T1, T4, T7 ──→ T12 ──→ T13
```
Execução: T12 → T13

### Phase 5: Runtime + sandbox (4)
```
T13 ──→ T14 ──→ T15 ──→ T16 ──→ T17
```
Execução: T14 → T15 → T16 → T17

### Phase 6: Fechamento da verificação (1) — acrescentada depois do Verifier
```
T17 ──→ T18
```
Execução: T18. Nasceu do veredito ❌ FAIL da verificação independente: o código estava correto, faltava
a rede de teste que impede alguém de quebrá-lo. Só testes e specs — nenhuma linha de produção.

---

## Task Breakdown

### T1: Migration `orders.mp_order_id`

**What**: adicionar `mp_order_id text` + índice em `public.orders`.
**Where**: `supabase/migrations/<timestamp>_orders_mp_order_id.sql` (novo)
**Depends on**: None · **Reuses**: padrão `if not exists` de `20260718234043_orders_payment_schema.sql`
**Requirement**: PER-01 · **Tools**: MCP: NONE · Skill: `supabase-postgres-best-practices`

**Done when**:
- [x] `add column if not exists mp_order_id text` + `create index if not exists idx_orders_mp_order_id`
- [x] Comentário citando PER-01 e explicando os dois ULIDs do Orders (order vs payment)
- [x] Aplica sem erro; reaplicar é no-op

**Tests**: none (matriz: migration = build gate) · **Gate**: build

---

### T2: `formatAmount` + `buildOrderPayload`

**What**: módulo puro com serialização de valor e montagem do corpo do `POST /v1/orders`.
**Where**: `packages/core/src/payment/orders.ts` (novo) + `__tests__/orders.test.ts` (novo)
**Depends on**: None · **Reuses**: tipo `Payer` de `./payer.ts`; import com extensão `.ts` (`payer.ts:4`); estilo de `__tests__/status.test.ts`
**Requirement**: ORD-01, ORD-02, ORD-03, ORD-04 · **Tools**: NONE

**Done when**:
- [x] `formatAmount`: `48`→`"48.00"`, `48.5`→`"48.50"`, `0.01`→`"0.01"` (ORD-02)
- [x] `type: 'online'`, `processing_mode: 'automatic'`, `external_reference` = `orderId`, `expiration_time: 'PT30M'` (ORD-01)
- [x] `total_amount` **idêntico** a `transactions.payments[0].amount`, ambos string (ORD-02)
- [x] Cartão: `{ id, type: 'credit_card', token, installments }` (ORD-03)
- [x] PIX: `{ id: 'pix', type: 'bank_transfer' }` + **asserção negativa** de ausência de `date_of_expiration` (ORD-04)
- [x] `payer` na **raiz** da order, não dentro de `transactions`
- [x] Gate passa: `pnpm --filter @nanapin/core test`; total do pacote ≥ 240 + novos

**Tests**: unit · **Gate**: quick

---

### T3: `extractPixData` + `extractPaymentId`

**What**: leitura da resposta do MP — QR do PIX e id do payment interno.
**Where**: `packages/core/src/payment/orders.ts` + `__tests__/orders.test.ts` (modificar)
**Depends on**: T2 · **Reuses**: tipos `MpOrder` de T2
**Requirement**: ORD-06, PER-02 · **Tools**: NONE

**Done when**:
- [x] Lê `transactions.payments[0].payment_method.{qr_code,qr_code_base64}` (ORD-06)
- [x] Sem `qr_code` → `{ qr_code: '', qr_code_base64: null }` (edge case, asserção por valor)
- [x] `transactions` ausente ou `payments: []` → mesmo fallback, **sem lançar**
- [x] `extractPaymentId` → `transactions.payments[0].id`, e `null` quando ausente (PER-02)
- [x] Gate passa: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T4: `mapMpStatus` como união dos dois vocabulários

**What**: acrescentar as chaves do Orders sem remover as legadas.
**Where**: `packages/core/src/payment/status.ts` + `__tests__/status.test.ts` (modificar)
**Depends on**: None · **Reuses**: o `MP_STATUS_MAP` e a tabela `it.each` existentes
**Requirement**: STA-01, STA-02 · **Tools**: NONE

**Done when**:
- [x] Entram `processed`→`approved`, `failed`→`rejected`, `canceled`→`cancelled`, `expired`→`expired`, `created`→`pending`, `action_required`→`pending`
- [x] As 7 asserções legadas de `status.test.ts:65-75` **permanecem** verdes (união, não substituição)
- [x] `mapMpStatus('at_terminal')` → `null` (asserção explícita — é status do Point, não de online)
- [x] `canTransition` e `friendlyMessage` fora do diff além do mapa
- [x] Gate passa: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T5: `resolveCardOutcome` — a regra de STA-03

**What**: função pura que decide o desfecho de uma order de cartão.
**Where**: `packages/core/src/payment/orders.ts` + `__tests__/orders.test.ts` (modificar)
**Depends on**: T4 · **Reuses**: `mapMpStatus`
**Requirement**: STA-02, STA-03 · **Tools**: NONE

**Done when**:
- [x] `processed` → `{ status: 'approved' }`
- [x] `action_required` + `waiting_transfer` → `{ status: 'pending' }` (STA-02)
- [x] `action_required` + outro detail (ex.: `'pending_challenge'`) → `{ status: 'rejected' }` — asserção **por valor**, não "não é pending" (STA-03)
- [x] `failed` → `{ status: 'rejected' }` com `statusDetail` `cc_rejected_*` preservado (STA-04)
- [x] Desconhecido → `{ status: null }`
- [x] Gate passa: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T6: Extrair `handlers.ts` com dependências injetadas

**What**: mover `handleCreatePayment` e `handleWebhook` para um módulo que recebe `Deps`; `index.ts` fica só wiring. **Zero mudança de comportamento.**
**Where**: `supabase/functions/mercado-pago/handlers.ts` (novo) + `index.ts` (reduzir)
**Depends on**: None · **Reuses**: o corpo integral das duas funções, movido sem reescrita
**Requirement**: habilitador de AD-002 (não há AC própria — é refactor) · **Tools**: NONE

**Done when**:
- [x] `Deps = { supabase, fetch, env: { mpAccessToken, mpWebhookSecret, notificationUrl, supabaseUrl } }` — nenhum `Deno.env.get` nem import de `esm.sh` dentro de `handlers.ts` (é o que o torna testável em vitest, sem exigir Deno instalado)
      > ⚠️ **Forma final divergiu**: `Deps.env` ficou com **dois** campos (`mpAccessToken`, `mpWebhookSecret`). `notificationUrl` foi **removido** no T16/D1 — a Orders API valida o corpo por schema fechado e rejeita `notification_url`, que passou a viver só no painel; `supabaseUrl` nunca foi consumido pelos handlers. O critério que importa (zero `Deno.env`/`esm.sh` no módulo) está cumprido: `handlers.ts:29-39`.
- [x] `index.ts` reduzido a: ler env, criar client real, `Deno.serve`, rotear `action`
- [x] Comportamento idêntico — o diff de `handlers.ts` vs. o original é **movimentação**, não reescrita
- [x] `pricing.ts`, `payer.ts`, `webhookSignature.ts`, `status.ts` fora do diff
- [x] Gate: `build`

**Tests**: none nesta task — a infraestrutura que os torna executáveis nasce em T7, que é a **primeira task onde eles podem rodar** (merge-forward, conforme *Resolving compilation dependencies*) · **Gate**: build

---

### T7: Workspace de teste `@nanapin/functions` + fakes + 2 smoke tests

**What**: dar ao layer de handlers um runner, fakes de `supabase`/`fetch`, e os dois primeiros testes.
**Where**: `supabase/package.json` (novo), `supabase/vitest.config.ts` (novo), `pnpm-workspace.yaml` (modificar), `supabase/functions/mercado-pago/__tests__/fakes.ts` (novo), `__tests__/handlers.test.ts` (novo)
**Depends on**: T6 · **Reuses**: env `node` e o padrão de `packages/core/vitest.config.ts`
**Requirement**: habilitador da linha `integration` da matriz · **Tools**: NONE

**Done when**:
- [x] Workspace declarado em `supabase/`, **não** em `supabase/functions/` — o `node_modules` não pode cair dentro do diretório que o edge runtime bind-monta
- [x] `pnpm-workspace.yaml` ganha `"supabase"`; `pnpm test` segue sendo `turbo run test` e passa a incluir o novo pacote
- [x] `fakeSupabase` cobre o que os handlers usam: `auth.getUser`, `from().select().eq().single()`, `.maybeSingle()`, `.update().eq()`, `.rpc()` — com registro das chamadas para asserção
- [x] `fakeFetch` permite roteirizar resposta por URL e **capturar o corpo enviado**
- [x] Smoke 1: `action` inválida → 400 `action inválida`
- [x] Smoke 2: webhook sem `x-signature` → 401 `Assinatura inválida`
- [x] Gate: `full` (prova que turbo enxergou o novo workspace)

**Tests**: integration · **Gate**: full

---

### T8: `create-payment` passa a `POST /v1/orders`

**What**: trocar endpoint e construção de corpo para `buildOrderPayload`; apagar `pixExpirationISO`.
**Where**: `supabase/functions/mercado-pago/handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T2, T7 · **Reuses**: `buildOrderPayload`; `calculateOrderTotals`, `buildPayer`/`mergePayer` inalterados
**Requirement**: ORD-01…ORD-05 · **Tools**: NONE

**Done when**:
- [x] `fetch` aponta para `${MP_BASE}/v1/orders`; teste assevera a **URL** chamada
- [x] `pixExpirationISO` e o uso de `PIX_EXPIRATION_MINUTES` como timestamp **removidos**; entra `ORDER_EXPIRATION = 'PT30M'`
- [x] Teste assevera o **corpo capturado** pelo `fakeFetch`: `type`, `processing_mode`, `external_reference`, strings de valor, `payment_method` por método (ORD-01…04)
- [x] Teste assevera o header `X-Idempotency-Key` (ORD-05)
- [x] `notification_url` e `statement_descriptor` seguem vindo de `Deps.env`/constante, fora do `OrderPayload`
      > ⚠️ **Revisto no T16 (D1/ORD-03)**: `notification_url` **saiu inteiramente** — corpo e `Deps.env` —, porque a Orders API o rejeita com `unsupported_properties`; `handlers.test.ts` trava as **7 chaves de raiz por igualdade** para o campo não voltar por herança. `statement_descriptor` segue constante, mas **dentro** de `transactions.payments[0].payment_method`, posição confirmada em runtime (cenário 2b).
- [x] Gate: `handlers`

**Tests**: integration · **Gate**: handlers

---

### T9: Persistência dos ids, resposta ao front e erros do MP

**What**: gravar os dois ULIDs, devolver o contrato atual, manter 502/400.
**Where**: `handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T1, T3, T8 · **Reuses**: `extractPixData`, `extractPaymentId`; o bloco de erro existente
**Requirement**: ORD-06, ORD-07, PER-02, PER-03, LOG-01 · **Tools**: NONE

**Done when**:
- [x] Sucesso grava `mp_order_id` (ULID) e `mp_payment_id` (`pay_…`) antes de responder (PER-02) — asseverado pelas chamadas registradas no `fakeSupabase`
      > Formatos **medidos** no T16 (D8): `ORDTST01K…` e `PAY01K…`, não `01J…`/`pay_…`. As fixtures carregam os reais, inclusive o caixa maiúsculo (que é o que derrubava a assinatura do webhook).
- [x] PIX responde `{ qr_code, qr_code_base64, expires_at }` — contrato idêntico ao atual (ORD-06)
- [x] MP 5xx / inalcançável / 2xx sem `id` → 502 **e nenhuma** escrita de `mp_order_id` (ORD-07, asserção negativa)
- [x] MP 4xx → 400 repassando `message` (ORD-07)
      > **Estendido em T16/D3 e precisado em T18**: 4xx que **traz order** (o 402 da recusa de cartão) é desfecho de **negócio**, não 400; 4xx sem order lê `errors[0].message` (o `message` da raiz é o formato da API antiga); 4xx **sem corpo parseável** é 502. Os três ramos têm teste.
- [x] RPC recebe o id do **payment** em `p_mp_payment_id` (PER-03)
- [x] Log inclui `mp_order_id`; `payer_cpf_present`/`bump_applied` booleanos; **CPF nunca logado** (LOG-01, asserção sobre o log capturado)
- [x] Gate: `handlers`

**Tests**: integration · **Gate**: handlers

---

### T10: Desvio de STA-03 no cartão

**What**: aplicar `resolveCardOutcome` e persistir `rejected` no `action_required` não-PIX.
**Where**: `handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T5, T9 · **Reuses**: `resolveCardOutcome`; fallback de `friendlyMessage` na loja
**Requirement**: STA-03 · **Tools**: NONE

**Done when**:
- [x] Cartão em `action_required` com detail ≠ `waiting_transfer` → grava `payment_status = 'rejected'` e responde `{ status: 'rejected', status_detail }` com HTTP 200
- [x] Teste do contraste: `waiting_transfer` **não** vira rejected (é o PIX)
- [x] `approved` síncrono continua chamando a RPC
- [x] `CardPaymentBrick.tsx` e `apps/store/src/**` ausentes do `git diff`
- [x] Gate: `handlers`

**Tests**: integration · **Gate**: handlers

---

### T11: `cancelPreviousOrder`

**What**: cancelar a order anterior antes de criar a nova, degradando em log se falhar.
**Where**: `handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T8 · **Reuses**: `log()`; o guard de `RETRYABLE_STATUSES` existente
**Requirement**: RTY-01, RTY-02, RTY-03 · **Tools**: NONE

**Done when**:
- [x] Função separada, chamada só com `mp_order_id` presente e `payment_status` ∈ `pending|rejected|expired` (RTY-01)
- [x] `POST /v1/orders/{id}/cancel` com `Authorization` e `X-Idempotency-Key` — asseverado pela URL capturada
- [x] Não-2xx (inclusive **4xx por order não-cancelável, que é resposta normal**: o MP só cancela em `created`/`action_required`) ou erro de rede → log `previous_order_cancel_failed` e **prossegue** criando a nova (RTY-02) — teste assevera que a order nova **foi** criada
- [x] Pedido sem `mp_order_id` → cancel **não** é chamado (asserção negativa)
- [x] Após criar, `mp_order_id` aponta para a nova (RTY-03)
- [x] Gate: `handlers`

**Tests**: integration · **Gate**: handlers

---

### T12: Webhook passa a `type === "order"`

**What**: trocar tópico e consulta, com lookup em dois caminhos.
**Where**: `handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T1, T4, T7 · **Reuses**: `buildManifest`/`validateWebhookSignature` **sem alteração**; `mapMpStatus`
**Requirement**: WHK-01, WHK-02, WHK-03 · **Tools**: NONE

**Done when**:
- [x] `type === 'order'` processado; **`type: 'payment'` → `{ received: true }` sem efeito** (corte seco, asserção explícita)
- [x] Consulta `GET ${MP_BASE}/v1/orders/{data.id}`; corpo da notificação nunca é fonte de verdade — teste com corpo mentiroso e resposta do GET divergente prova qual venceu
- [x] Assinatura inválida/ausente → 401 (asseverado com `fetchDouble.calls` vazio: rejeita **antes** de consultar o MP)
- [ ] ~~`webhookSignature.ts` ausente do diff (WHK-02)~~ — **NÃO cumprido, e de propósito.** O T16 mediu 8/8 notificações reais do MP em 401 com o segredo comprovadamente correto: o `data.id` do tópico `order` é MAIÚSCULO e o lowercase do template oficial derruba o HMAC (D2). Manter a fronteira significaria manter o webhook não-funcional em produção. A mudança é **aditiva** (`buildManifestCandidates` entrou; `buildManifest` e seus testes seguem intactos) e está declarada como exceção nos *Success Criteria* da `spec.md` e na AC WHK-02 — não escondida.
- [x] Lookup por `external_reference`, fallback por `mp_order_id`, nenhum → `{ received: true }` + `order_not_found` (WHK-03) — os três caminhos testados
- [x] Gate: `handlers`

**Tests**: integration · **Gate**: handlers

---

### T13: Transições, RPC e guard de order duplicada

**What**: manter transições guardadas e renomear o guard de segundo `approved`.
**Where**: `handlers.ts` + `__tests__/handlers.test.ts`
**Depends on**: T12 · **Reuses**: `canTransition`, RPC `apply_payment_approval`, a estrutura `applied`/`else`
**Requirement**: WHK-04, LOG-01 · **Tools**: NONE

**Done when**:
- [x] Alvo `approved` passa pela RPC; não-aprovação guardado por `canTransition` (WHK-04)
- [x] Segundo `approved` de **outra** order → grava `duplicate_approved_other_order`, **sem** reaplicar RPC nem regredir status (asserção de que `rpc` **não** foi chamada)
- [x] Webhook duplicado da **mesma** order → no-op (RPC devolve `false`, só `mp_status_detail` é gravado)
- [x] Log do webhook inclui `mp_order_id`
- [x] RPC sem mudança de assinatura nem de SQL
- [x] Gate: `full`

**Tests**: integration · **Gate**: full

---

### T14: 🧑 Restart do stack + probe de boot

**What**: recarregar bind mounts e provar que o worker sobe com os imports e o workspace novos.
**Where**: ambiente local
**Depends on**: T13 · **Reuses**: o diagnóstico do carry-forward #12
**Requirement**: pré-requisito de PGD-04/BMP-04 · **Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] `supabase stop && supabase start` (também recarrega `[edge_runtime.secrets]`)
- [x] Probe → **400** `action inválida`, não 503 `BOOT_ERROR`
- [x] `docker logs supabase_edge_runtime_nanapin-store` sem `Module not found`
- [x] **Verificação específica desta revisão**: o `node_modules` criado pelo workspace novo não quebrou o bundle da function (é o risco que motivou colocá-lo em `supabase/` e não em `supabase/functions/`)
- [x] Gate: `runtime`

**Tests**: none (wiring) · **Gate**: runtime

---

### T15: Fechar a assumption do enum de status

**What**: confirmar na doc o enum de `status` de order **online** e ajustar o mapa se divergir.
**Where**: `packages/core/src/payment/status.ts` + `__tests__/status.test.ts` (se houver ajuste) + `spec.md`
**Depends on**: T14 · **Reuses**: a união de T4
**Requirement**: STA-01 (fecha Assumption nº1) · **Tools**: NONE

**Done when**:
- [x] Página *Status da order* (online, não Point) citada na spec; Assumption marcada `Confirmado? y`
- [x] Status real fora do mapa é acrescentado **com teste**; `at_terminal` permanece fora
- [x] Se nada mudar, registrar "enum confirmado, mapa inalterado" — ausência de mudança é resultado, não silêncio
- [x] Gate: `quick`

**Tests**: unit (se o mapa mudar) · **Gate**: quick

---

### T16: 🧑 Roteiro de sandbox — 6 cenários no Orders

**What**: executar em sandbox os cenários herdados da 08, adaptados ao Orders, registrando o medido.
**Where**: `handlers.ts` (atualizar o roteiro no cabeçalho) + `.specs/features/09-checkout-orders-api/validation.md`
**Depends on**: T14, T15 · **Reuses**: roteiro de `index.ts:66-107`; ambiente já configurado (usuário de teste `TESTUSER6808293123515525364`, túnel cloudflared, `[edge_runtime.secrets]`)
**Requirement**: PGD-04, BMP-04, STA-04 · **Tools**: MCP: NONE · Skill: `playwright-cli`

**Done when**:
- [ ] **1. PIX com CPF** — 200 com `qr_code`; no painel do MP a order traz `payer.identification` e `first_name`/`last_name` de `customers.name` (PGD-04)
      > **Executado, resultado ❌ + ⏸️ (`validation.md` → cenário 1).** Duas coisas, independentes: (a) o `create-payment` respondeu **400** pelo bloqueador D1 (`notification_url`), já corrigido, mas **não reexecutado**; (b) a asserção "o painel traz `payer`" é **impossível nesta API** — o `POST` e o `GET /v1/orders/{id}` não devolvem `payer` (chaves de topo medidas), e o pagamento legado devolve o pagador anonimizado. A garantia de PGD-04 migrou para o **corpo enviado**, asseverado por valor em `handlers.test.ts` (T18), + o guard 422 do cenário 3.
- [ ] **2. Cartão com CPF divergente do Brick** — a order mostra o CPF de `customers`, não o do Brick (PGD-04)
      > **Executado, ⏸️ NÃO CONCLUSIVO** pelos mesmos dois motivos do item 1. Coberto por teste no lugar certo: `handlers.test.ts` assevera `call.body.payer` **inteiro** com `toEqual` no cartão (Brick manda `00000000191`, o corpo sai com `39053344705` e o nome de `customers.name`).
- [x] **2b. Descritor de fatura (ORD-03)** — na transação de cartão do painel, confirmar que
      **"NANAPIN" chegou** como `statement_descriptor`. É a única incerteza da feature sem fonte
      autoritativa (as páginas de referência do MP são SPA e dão 404 no fetch). Três desfechos:
      400 no cenário 2 ⇒ o campo não vai em `payment_method` e volta para a raiz; 2xx com o
      descritor visível ⇒ posição confirmada; 2xx sem o descritor ⇒ está sendo ignorado, e aí a
      pergunta é onde o MP realmente o aceita
- [x] **3. Pedido sem CPF** — 422 e **nenhuma order criada** no MP
- [x] **4. Bump exibido == cobrado, COM cupom `percent`** — rótulo do CTA == `orders.total` == `total_amount` no painel, até o centavo; `bump_applied: true` (BMP-04 — é onde a igualdade quebrou na 08; o cupom é **obrigatório** no cenário)
- [x] **5. Bump desligado** — preço cheio, `bump_applied: false`
- [x] **6. Cartão recusado** — confirma se `status_detail` segue em `cc_rejected_*` (fecha Assumption nº3; STA-04)
- [x] Webhook exercitado: order `processed` → `approved`, `paid_at` preenchido, estoque baixado **uma vez**; reenviar → no-op
- [x] Cada cenário com **valor medido** em `validation.md` (não "OK")
- [x] **Fallback declarado**: se o iframe do Brick resistir à automação, os cenários 2 e 6 voltam para o usuário com roteiro exato, e isso é registrado em `validation.md` — não silenciado
- [x] Gate: `runtime`

**Tests**: none (manual por natureza) · **Gate**: runtime

---

### T17: Fronteira por diff + gate final

**What**: provar por `git diff` que a feature não vazou; fechar com a suíte cheia.
**Where**: verificação + `tasks.md` (status)
**Depends on**: T16 · **Reuses**: os Success Criteria da spec
**Requirement**: Success Criteria · **Tools**: NONE

**Done when**:
- [x] `git diff --name-only` **não** contém `pricing.ts`, ~~`webhookSignature.ts`~~, `payer.ts`, `CardPaymentBrick.tsx`, nem nada sob `apps/store/src/`
      > Verificado pelo Verifier independente. **Duas exceções, ambas declaradas na `spec.md` → *Success Criteria*, não escondidas**: `webhookSignature.ts` (aditivo, D2 — sem isso o webhook fica não-funcional em produção) e `apps/store/src/test/setup.ts` (setup de teste, conserto de flake pré-existente que tornava o gate inútil). `pricing.ts`, `payer.ts` e `CardPaymentBrick.tsx` seguem intocados.
- [x] `pnpm test` verde; `@nanapin/core` **> 240** e `@nanapin/functions` com contagem registrada
- [x] `pnpm build` verde
- [x] Gate: `build`

**Tests**: none · **Gate**: build

---

### T18: Fechar as lacunas de discriminação do Verifier

**What**: cobrir com teste que **discrimina** os 3 mutantes que sobreviveram no caminho do dinheiro e os
8 ramos de guarda sem teste; precisar as 2 ACs que se contradiziam. **Nenhuma linha de produção mudou.**
**Where**: `supabase/functions/mercado-pago/__tests__/{handlers.test.ts,fakes.ts}`,
`packages/core/src/payment/__tests__/status.test.ts`, `spec.md` (ORD-07, STA-03), `tasks.md`, `STATE.md`
**Depends on**: T17 · **Reuses**: `paymentRows`/`paymentLists`, `captureLogs`, os valores medidos do T16
**Requirement**: BMP-04, PGD-04, ORD-07, STA-03 + Coverage Expectation da matriz · **Tools**: NONE

**Método**: cada teste novo foi provado por **mutação** — aplicada no arquivo de produção real, medida,
e revertida com `cmp` + `md5sum` conferidos contra a cópia de baseline no scratchpad. Teste que não fica
vermelho sob a mutação não fecha lacuna.

**Done when**:
- [x] **BMP-04 no handler** (mutante M6, `items: pricingItems` → `bumpedItems`, desconto do bump duas
      vezes): teste de integração com `store_settings.checkout` (bump on, 50%, produto **dentro** dos
      `order_items`) **+** cupom `percent` 10, asseverando `total_amount` **e** o `orders.total`
      persistido por valor exato — `R$ 16,18` (PIX) e `R$ 16,51` (cartão), os números do cenário 4 do
      T16. Sob a dupla aplicação viram `15,02`/`15,29`. ⇒ **M6 mata 3 testes**
- [x] **PGD-04 no PIX** (mutante M9, `payer: orderPayer` → `payer: { email }`): `call.body.payer` por
      `toEqual` completo, com `identification` e `first_name`/`last_name` derivados de `customers.name`
      — a fixture passou a ter `customers.name ≠ orders.customer_name` para a derivação ser observável.
      ⇒ **M9 mata 1 teste**; e ler o nome da coluna errada (M9b) mata 2
- [x] **Guard 422 de CPF** (mutante M10, `if (false)`): 6 casos (cpf `null`, DV inválido, dígitos iguais
      × PIX/cartão) ⇒ 422 por valor, log `missing_payer_cpf` com `payer_cpf_present: false`, CPF nunca
      logado, e **`expect(fetchDouble.calls).toHaveLength(0)`**. ⇒ **M10 mata 6 testes**
- [x] **8 ramos de guarda** da *Coverage Expectation* (401 sem header · 401 JWT rejeitado · 403
      ownership · 404 · 409 · 422 sem itens · 422 total < R$ 0,01 · 400 campos obrigatórios · 400 dados
      do cartão · 500 persistência), **todos** asseverando também que o MP não foi chamado.
      ⇒ **10 mutações, 10 killed** (18 testes vermelhos no total)
- [x] **ORD-07 precisado** (lacuna 5): AC reescrita em 3 desfechos mutuamente exclusivos; ramo novo
      `4xx sem corpo parseável ⇒ 502` com teste (`rawBody` entrou no `fakeFetch` para o ramo ser
      alcançável). ⇒ mutação "4xx sem corpo passa a 400 genérico" mata 1 teste
- [x] **STA-03 precisado** (lacuna 6): AC reescrita para descrever a corrente real
      (`status_detail → friendlyMessage → fallback instrucional`) e asseverada nas duas pontas.
      ⇒ `FALLBACK_MESSAGE = 'Erro.'` mata **3 em core e 3 em functions**
- [x] Nenhum teste enfraquecido, deletado ou pulado; nenhuma linha de produção alterada
      (`md5sum` de `handlers.ts` e `status.ts` idênticos ao baseline no fim)
- [x] Gate: `full` — `pnpm turbo run test --force` exit 0 · functions **81** (era 47) · core **303**
      (era 300) · backoffice **62** · store **372** = **818**

**Tests**: integration + unit · **Gate**: full

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1    T2 ─→ T3    T4 ─→ T5        (exec: T1→T2→T3→T4→T5)
Phase 2:  T6 ─→ T7                           (exec: T6→T7)
Phase 3:  T8 ─→ T9 ─→ T10    T8 ─→ T11       (exec: T8→T9→T10→T11)
Phase 4:  T12 ─→ T13                         (exec: T12→T13)
Phase 5:  T14 ─→ T15 ─→ T16 ─→ T17           🧑 humano no circuito
Phase 6:  T17 ─→ T18                         (acrescentada pelo Verifier)
```

**Packing para Execute**: 17 tasks ⇒ **batch 1 = Phases 1+2** (7) · **batch 2 = Phases 3+4** (6) ·
**batch 3 = Phase 5** (4). Passa de um batch, então o Execute deve **oferecer** sub-agentes — com a
**Phase 5 inline** (reinicia o stack do usuário, navegador e painel do MP).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo SQL | ✅ |
| T2 | 2 funções coesas, arquivo novo | ✅ (coeso) |
| T3 | 2 leitores coesos, mesmo arquivo | ✅ (coeso) |
| T4 | 1 mapa | ✅ |
| T5 | 1 função | ✅ |
| T6 | 1 refactor de movimentação, 2 arquivos | ⚠️ 2 arquivos por necessidade — extrair exige tocar origem e destino; é uma operação, não duas |
| T7 | 5 arquivos de infraestrutura | ⚠️ Coeso: é **um** harness. Dividir entregaria runner sem fake, ou fake sem runner — nenhum dos dois roda |
| T8 | 1 responsabilidade (payload/endpoint) | ✅ |
| T9 | 1 responsabilidade (saída e erros) | ✅ |
| T10 | 1 ramo de decisão | ✅ |
| T11 | 1 função | ✅ |
| T12 | 1 responsabilidade (entrada do webhook) | ✅ |
| T13 | 1 responsabilidade (transições) | ✅ |
| T14 | 1 verificação de ambiente | ✅ |
| T15 | 1 mapa + doc | ✅ |
| T16 | 6 cenários de **um** roteiro | ⚠️ Coeso por natureza — sessão única de sandbox; dividir exigiria reiniciar o ambiente por cenário |
| T17 | 1 verificação | ✅ |
| T18 | 1 responsabilidade (fechar as lacunas de discriminação) | ⚠️ Toca 3 arquivos de teste + 3 de spec, mas é **uma** operação: cada teste novo existe para matar um mutante específico, e dividir entregaria lacuna meio fechada |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| ---- | ------------------ | --------------- | ------ |
| T1 | None | isolada | ✅ |
| T2 | None | isolada | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | isolada | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | None | isolada (origem de Phase 2) | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T2, T7 | T2, T7 → T8 | ✅ |
| T9 | T1, T3, T8 | T1, T3, T8 → T9 | ✅ |
| T10 | T5, T9 | T9 → T10 ← T5 | ✅ |
| T11 | T8 | T8 → T11 | ✅ |
| T12 | T1, T4, T7 | T1, T4, T7 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T14, T15 | T15 → T16 (T14 transitivo) | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |

Nenhuma dependência aponta para fase posterior. ✅

---

## Test Co-location Validation

| Task | Layer criado/modificado | Matriz exige | Task diz | Status |
| ---- | ----------------------- | ------------ | -------- | ------ |
| T1 | Migration SQL | none (build gate) | none | ✅ |
| T2 | Domínio puro | unit | unit | ✅ |
| T3 | Domínio puro | unit | unit | ✅ |
| T4 | Domínio puro | unit | unit | ✅ |
| T5 | Domínio puro | unit | unit | ✅ |
| T6 | Handlers (movimentação) | integration | none — **merge-forward para T7** | ✅ (exceção documentada) |
| T7 | Handlers + infra | integration | integration | ✅ |
| T8 | Handlers | integration | integration | ✅ |
| T9 | Handlers | integration | integration | ✅ |
| T10 | Handlers | integration | integration | ✅ |
| T11 | Handlers | integration | integration | ✅ |
| T12 | Handlers | integration | integration | ✅ |
| T13 | Handlers | integration | integration | ✅ |
| T14 | Wiring / ambiente | none | none | ✅ |
| T15 | Domínio puro (se mudar) | unit | unit | ✅ |
| T16 | manual | none | none | ✅ |
| T17 | verificação | none | none | ✅ |
| T18 | Handlers + domínio puro | integration + unit | integration + unit | ✅ |

**A única exceção é T6**, e ela é a exceção que a própria referência prevê: o refactor de extração não
tem harness até T7 existir, então os testes vão para a **primeira task onde podem rodar**
(merge-forward), não para uma task de teste separada. T6 não produz comportamento novo — o diff é
movimentação, e T7 fecha na task seguinte, dentro da mesma fase.

---

## Commits sugeridos (agrupados — override do CLAUDE.md)

1. `refactor(payment): extrai handlers da edge function com deps injetadas` — T6
2. `test(payment): harness de teste da edge function com supabase e fetch fakes` — T7
3. `feat(payment): monta payload e desfecho da API de Orders como domínio puro` — T2, T3, T4, T5, T15
4. `feat(payment): migra a edge function mercado-pago para a API de Orders` — T1, T8, T9, T10, T11, T12, T13
5. `test(payment): fecha as lacunas de discriminação apontadas pelo Verifier` — T18 (só testes: `handlers.test.ts`, `fakes.ts`, `status.test.ts`)
6. `docs(specs): spec, design, tasks e validation da 09-checkout-orders-api` — `.specs/**`, T16, T18

---

## Tools confirmados

| Task | MCP | Skill |
| ---- | --- | ----- |
| T1 | NONE | `supabase-postgres-best-practices` |
| T14 | NONE | `supabase` |
| T16 | NONE | `playwright-cli` |
| Todas as outras | NONE | NONE |

> O MCP `supabase` **não está autenticado** nesta sessão não-interativa — autorizar exigiria
> `claude mcp` ou `/mcp` em sessão interativa. Por isso `MCP: NONE` em toda a feature; nada aqui
> depende dele.
