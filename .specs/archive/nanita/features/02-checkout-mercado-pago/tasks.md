# Checkout Mercado Pago (Bricks) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/02-checkout-mercado-pago/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute.
> Guidelines found: `CLAUDE.md` (comando `pnpm test` = vitest via Turbo), `apps/store/vitest.config.ts`
> (jsdom, globals, `src/**/*.{test,spec}.{ts,tsx}`). Nenhum threshold de cobertura — strong
> defaults aplicados. Só existe um `example.test.ts` — os padrões abaixo são o alvo, não o piso atual.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio de pagamento (`packages/core/src/payment/`: pricing, status map/transições, assinatura webhook) | unit (vitest, node) | Todos os branches; 1:1 com ACs de cálculo/transição/assinatura; todo edge case listado na spec tem teste | `packages/core/src/payment/__tests__/*.test.ts` | `pnpm --filter @nanapin/core test` |
| UI do checkout (PaymentStep, CardPaymentBrick, PixPayment, fluxo CheckoutPage) | unit (vitest jsdom, SDK MP e supabase mockados) | Estados principais por AC de UI: toggle por settings, recusa mantém passo, QR expirado→regenerar, aprovação→sucesso, ordem dos passos | `apps/store/src/**/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Edge function `mercado-pago` (orquestração Deno: fetch MP, auth, persistência) | manual/sandbox | Roteiro de verificação: happy+erro por action; webhook simulado com assinatura HMAC válida/inválida | — | roteiro na seção Verificação do design/spec |
| SQL (migrations, RPC `apply_payment_approval`, RLS) | manual via Supabase local | RPC 2x = no-op (estoque 1x); RLS: anon bloqueado, cliente só vê os próprios, admin vê tudo | — | `supabase db reset` + scripts SQL do roteiro |
| Tipos / config / backoffice badge | none | — (build gate only) | — | `pnpm build` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com unit tests em um workspace | `pnpm --filter <workspace> test` |
| Full | Tarefas que tocam mais de um workspace | `pnpm test` (turbo, todos) |
| Build | Fim de fase / tarefas só de tipos, config ou SQL | `pnpm build && pnpm test` |

> `pnpm lint` falha por erros pré-existentes (`no-explicit-any` nos hooks admin — ver CLAUDE.md);
> não é gate. Código novo não deve adicionar erros novos de lint.

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Domínio compartilhado (packages)

```
T1 → T2 → T3 → T4
```

### Phase 2: Banco (migrations)

```
T5 → T6 → T7
```

### Phase 3: Edge function

```
T8 → T9 → T10
```

### Phase 4: Store (front)

```
T11 → T12 → T13 → T14 → T15 → T16 → T17
```

### Phase 5: Backoffice + fechamento

```
T18 → T19
```

---

## Task Breakdown

### T1: Tipos de pagamento compartilhados

**What**: `PaymentStatus` union + campos de pagamento em `Order` + contratos do create-payment.
**Where**: `packages/supabase/src/types/index.ts` (modify)
**Depends on**: None
**Reuses**: interfaces `Order` existentes
**Requirement**: PAY-01 (tipos), base para todos

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `PaymentStatus`, campos (`payment_status`, `mp_payment_id`, `mp_status_detail`, `paid_at`, `pix_discount`) e contratos `CreatePaymentRequest/Response` exportados
- [x] `pnpm build` sem erros TS

**Tests**: none (tipos) · **Gate**: build
**Commit**: `feat(types): payment status e contratos mercado pago`

---

### T2: Pricing de pagamento (desconto PIX + total server-side) + setup vitest do core

**What**: `calculateOrderTotals({items, shipping, couponDiscount, pixDiscountPercent, method})` puro
(base PIX = subtotal − cupom, frete fora; erro se total < R$ 0,01) + vitest config/script em
`packages/core`.
**Where**: `packages/core/src/payment/pricing.ts` + `__tests__/pricing.test.ts` + `packages/core/package.json`/`vitest.config.ts`
**Depends on**: T1
**Reuses**: padrão de exports por subpath do package.json do core
**Requirement**: PAY-03, PAY-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Casos: sem cupom, com cupom, cupom freeShipping+PIX, pix 0%, pix 5%, arredondamento a 2 casas, total < 0,01 lança erro
- [x] Gate: `pnpm --filter @nanapin/core test` passa
- [x] Test count: ≥ 8 testes novos (11)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): pricing de pagamento com desconto pix`

---

### T3: Mapa de status MP + guard de transições + mensagens pt-BR

**What**: `mapMpStatus(mp)`, `canTransition(from, to)` (mapa PAY-04, approved nunca regride),
`friendlyMessage(status_detail)`.
**Where**: `packages/core/src/payment/status.ts` + `__tests__/status.test.ts`
**Depends on**: T1
**Reuses**: —
**Requirement**: PAY-04, PAY-02 (mensagens)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Todos os pares do mapa de transições testados (permitidos e negados), 1:1 com PAY-04
- [x] `approved→pending/rejected` nega; `expired→approved` permite; `rejected→pending` permite
- [x] Gate: `pnpm --filter @nanapin/core test` passa
- [x] Test count: ≥ 12 testes novos (50)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): mapa de status e transicoes de pagamento`

---

### T4: Validação de assinatura de webhook (HMAC)

**What**: `buildManifest({dataId, requestId, ts})` (template oficial, lowercase, partes ausentes
removidas) + `validateWebhookSignature(header, manifest, secret)` via WebCrypto (`crypto.subtle`,
funciona em Node ≥20 e Deno).
**Where**: `packages/core/src/payment/webhookSignature.ts` + `__tests__/webhookSignature.test.ts`
**Depends on**: T1
**Reuses**: —
**Requirement**: PAY-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Manifest: com/sem `data.id`, com/sem `x-request-id`, id alfanumérico → lowercase
- [x] Assinatura válida passa; inválida/ausente/ts adulterado falham
- [x] Gate: `pnpm --filter @nanapin/core test` passa
- [x] Test count: ≥ 8 testes novos (12)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(core): validacao hmac de webhook mercado pago`

---

### T5: Migration — schema de pagamento em orders

**What**: Colunas `payment_status` (CHECK + default `pending`), `mp_payment_id` (+index),
`mp_status_detail`, `paid_at`, `pix_discount`; backfill legado → `approved`.
**Where**: `supabase/migrations/<ts>_orders_payment_schema.sql`
**Depends on**: T1
**Reuses**: padrão idempotente (`if not exists`/`do $$`) das migrations existentes
**Requirement**: PAY-12 (persistência), base PAY-04

**Tools**: MCP: NONE · Skill: `supabase` (consulta de sintaxe se necessário)

**Done when**:
- [x] Aplicada sem erro no Postgres local (via psql em transação validada; CLI supabase indisponível p/ `db reset`)
- [x] Pedidos legados ficam `approved`; novos default `pending`
- [x] `pnpm build` ok

**Tests**: manual (roteiro SQL) · **Gate**: build
**Commit**: `feat(db): schema de pagamento em orders`

---

### T6: Migration — endurecer RLS

**What**: `DROP POLICY "Allow all orders"/"Allow all order_items"`; criar
`users insert own order items` (INSERT authenticated com order em pedidos próprios).
**Where**: `supabase/migrations/<ts>_orders_rls_hardening.sql`
**Depends on**: T5
**Reuses**: políticas escopadas existentes (`20260414121021_*.sql:204-215`) — permanecem
**Requirement**: PAY-10

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Roteiro SQL: anon não lê orders; cliente A não lê pedido do cliente B; cliente cria pedido+itens próprios; admin lê tudo (validado via psql local em transação)
- [x] Aplicada sem erro no Postgres local; insert de pedido+itens do cliente autenticado funciona sob as policies escopadas

**Tests**: manual (roteiro SQL) · **Gate**: build
**Commit**: `feat(db): endurece rls de orders e order_items`

---

### T7: Migration — RPC `apply_payment_approval` + Realtime + expirador

**What**: RPC transacional idempotente (guard `paid_at IS NULL`; baixa estoque `GREATEST(...,0)`;
incrementa cupom), `ALTER PUBLICATION supabase_realtime ADD TABLE orders`, job pg_cron horário
(pending>24h→expired) com fallback documentado se pg_cron indisponível.
**Where**: `supabase/migrations/<ts>_payment_approval_rpc.sql`
**Depends on**: T5
**Reuses**: função `has_role` como referência de estilo SQL
**Requirement**: PAY-07, PAY-08, PAY-11 (expirador), PAY-13 (publication)

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Roteiro SQL: chamar RPC 2x → estoque baixa 1x, cupom incrementa 1x, `paid_at` imutável (validado via psql local em transação)
- [x] Estoque 1 com qty 3 → stock 0 (floor)
- [x] Publication inclui orders; pg_cron verificado no local (preloaded, job agendado); fallback lazy documentado em comentário SQL da migration

**Tests**: manual (roteiro SQL) · **Gate**: build
**Commit**: `feat(db): rpc idempotente de aprovacao + realtime + expirador`

---

### T8: Edge function — esqueleto + auth do create-payment

**What**: `mercado-pago/index.ts` (roteamento por action, CORS, envs) + `config.toml`
`verify_jwt=false` + na action `create-payment`: auth manual (getUser), ownership
(customers.user_id), guard `payment_status ∈ {pending, rejected, expired}`.
**Where**: `supabase/functions/mercado-pago/index.ts`, `supabase/config.toml`
**Depends on**: T5
**Reuses**: esqueleto/headers/erros de `supabase/functions/melhor-envio/index.ts`
**Requirement**: PAY-10 (auth), base PAY-03/06/09

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Sem JWT → 401; JWT de outro usuário → 403; pedido `approved` → 409 (implementado; runtime local não exercitável — ver nota)
- [x] Verificação possível no ambiente: `deno check` (via Docker) OK + `pnpm build` OK. Curl local PENDENTE: stack Docker roda sem CLI supabase e o registry de functions do edge-runtime foi fixado no start (nova function → 404); exercitar com `supabase functions serve` quando a CLI estiver disponível

**Tests**: manual (curl local) · **Gate**: build
**Commit**: `feat(functions): esqueleto mercado-pago com auth`

---

### T9: Edge function — create-payment (cartão + PIX)

**What**: Recálculo server-side (importa `pricing.ts` do core por caminho relativo), POST
`/v1/payments` com `X-Idempotency-Key`/`external_reference`/`statement_descriptor`/`notification_url`;
cartão (repassa formData com amount substituído) e PIX (`date_of_expiration` +30min); persiste
`mp_payment_id`/`mp_status_detail`/`pix_discount`/`total`; resposta síncrona `approved` → RPC.
**Where**: `supabase/functions/mercado-pago/index.ts` (modify)
**Depends on**: T2, T7, T8
**Reuses**: `calculateOrderTotals` (T2), RPC (T7), `meFetch`-style helper
**Requirement**: PAY-03, PAY-06, PAY-09, PAY-14 (server), PAY-11 (30 min)

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Sandbox: cartão APRO aprova (RPC roda), OTHE recusa com `status_detail` persistido — implementado; verificação sandbox PENDENTE de ambiente (functions serve/CLI indisponível)
- [x] PIX cria e retorna `qr_code` + `expires_at` (+30min) — implementado (`date_of_expiration` com offset -03:00 explícito); verificação sandbox PENDENTE de ambiente
- [x] MP fora do ar → 502, pedido segue `pending` (fetch/5xx → 502 sem transição de status); verificação curl PENDENTE de ambiente
- [x] Total < R$0,01 → 422 (`calculateOrderTotals` lança → 422 antes de cobrar)
- [x] Verificação possível no ambiente: `deno check` (via Docker) OK — inclui o import relativo de `packages/core/src/payment/pricing.ts` — + `pnpm build` OK

**Tests**: manual/sandbox · **Gate**: build
**Commit**: `feat(functions): create-payment cartao e pix via /v1/payments`

---

### T10: Edge function — webhook

**What**: Action `webhook`: valida `x-signature` (lib T4) → 401 se inválida; `GET /v1/payments/{id}`;
localiza pedido por `external_reference` (fallback `mp_payment_id`); aplica transição via
`canTransition` (T3) + RPC p/ approved; grava `mp_status_detail` sempre; 200 rápido.
**Where**: `supabase/functions/mercado-pago/index.ts` (modify)
**Depends on**: T3, T4, T9
**Reuses**: `validateWebhookSignature` (T4), `mapMpStatus`/`canTransition` (T3), RPC (T7)
**Requirement**: PAY-04, PAY-05, PAY-07, PAY-12

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Webhook simulado (curl assinado com secret de teste): approved atualiza pedido + efeitos — implementado (RPC idempotente); curl assinado PENDENTE de ambiente (functions serve/CLI indisponível)
- [x] Mesmo webhook 3x → estado idêntico, estoque 1x — garantido pelo guard `paid_at is null` da RPC (validado no roteiro T7 via psql); reexecução via função PENDENTE de ambiente
- [x] Assinatura inválida → 401, nada muda (validação HMAC ocorre antes de qualquer acesso ao banco; lib coberta por unit tests do T4)
- [x] `refunded` no GET → pedido `refunded`; `approved` não regride (`mapMpStatus` + `canTransition`; segundo approved de outro pagamento → só loga e grava `mp_status_detail`)
- [x] Verificação possível no ambiente: `deno check` (via Docker) OK + `pnpm build` OK

**Tests**: manual (curl assinado) · **Gate**: build
**Commit**: `feat(functions): webhook idempotente mercado pago`

---

### T11: Store — bootstrap SDK MP + deps + envs

**What**: `pnpm add @mercadopago/sdk-react qrcode.react` no store; `initMercadoPago(VITE_MP_PUBLIC_KEY)`
no bootstrap; `.env.example` do store com `VITE_MP_PUBLIC_KEY`.
**Where**: `apps/store/src/main.tsx`, `apps/store/package.json`, `apps/store/.env.example`
**Depends on**: None (paralelo conceitual, roda após fase 3)
**Reuses**: bootstrap existente do `main.tsx`
**Requirement**: PAY-01 (pré-condição)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `pnpm dev:store` sobe sem erro com a env setada (init guardado por `if (import.meta.env.VITE_MP_PUBLIC_KEY)` — sem env também não quebra)
- [x] `pnpm build` ok

**Tests**: none (config) · **Gate**: build
**Commit**: `chore(store): sdk mercado pago e qrcode.react`

---

### T12: Store — hook `useCreatePayment`

**What**: Hook que invoca `mercado-pago?action=create-payment` com `idempotency_key = randomUUID()`
por tentativa; tipa request/response (T1); expõe estados loading/erro.
**Where**: `apps/store/src/features/checkout/api/useCreatePayment.ts` + `__tests__` co-locado
**Depends on**: T1, T9, T11
**Reuses**: padrão react-query de `useOrders.ts`; `supabase.functions.invoke`
**Requirement**: PAY-06 (client), PAY-09 (erro)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Unit (invoke mockado): sucesso PIX/cartão, erro 502 vira mensagem amigável, UUID novo por tentativa
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 4 testes novos (5)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): hook useCreatePayment`

---

### T13: Store — reordenar fluxo do checkout (Revisão → Pagamento)

**What**: `CheckoutPage`: passos `[Identificação, Endereço, Entrega, Revisão, Pagamento]`; sair da
Revisão cria pedido `pending` (guarda `order_id` no estado); remover `incrementCouponUsage`,
`clearCart/clearCoupon/markCartRecovered` da criação — movem para handler de sucesso; bloquear
confirmação sem `customer.id`; tela de sucesso sem promessa de e-mail.
**Where**: `apps/store/src/pages/CheckoutPage.tsx`, `apps/store/src/features/checkout/ui/ReviewStep.tsx` + teste
**Depends on**: T12
**Reuses**: `useCreateOrder`, `StepIndicator`
**Requirement**: PAY-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Unit (jsdom, mocks): ordem dos passos; confirmar Revisão chama createOrder 1x e avança; carrinho NÃO limpa na criação; limpa no sucesso
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 4 testes novos (6)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): fluxo pending->pagamento no checkout`

---

### T14: Store — CardPaymentBrick

**What**: Wrapper do `<CardPayment>`: `initialization.amount`, `customization`
(maxInstallments/minInstallments das settings, tema `customVariables` nana), `onSubmit`→T12,
recusa → `friendlyMessage` + permanece no passo, unmount limpo.
**Where**: `apps/store/src/features/checkout/ui/CardPaymentBrick.tsx` + teste (SDK mockado)
**Depends on**: T12, T3
**Reuses**: `usePaymentSettings`, `friendlyMessage` (T3), tokens nana
**Requirement**: PAY-01, PAY-02, PAY-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Zero inputs próprios de PAN/CVV no componente
- [x] Unit: recusa exibe mensagem mapeada e não navega; aprovado dispara onApproved
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 3 testes novos (6)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): card payment brick`

---

### T15: Store — PixPayment (QR + Realtime + regenerar)

**What**: Componente PIX: create-payment ao montar, QR via `qrcode.react` (`qr_code` texto), timer
30 min (reuso do padrão do mock), expirado → "Gerar novo código" (novo UUID), assinatura Realtime
(`UPDATE orders id=eq.<order_id>`) → `approved` → callback sucesso; linha de desconto PIX.
**Where**: `apps/store/src/features/checkout/ui/PixPayment.tsx` + teste (canal e timers mockados)
**Depends on**: T12, T2
**Reuses**: timer/copia-e-cola do mock atual, `usePaymentSettings`, preview de pricing (T2)
**Requirement**: PAY-11, PAY-13, PAY-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Unit: evento realtime `approved` chama onApproved; timer zerado mostra CTA regenerar que refaz create-payment; desconto some com percent=0
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 4 testes novos (7)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): pagamento pix com realtime`

---

### T16: Store — PaymentStep rewrite (remoção do mock)

**What**: Rewrite: toggle PIX/Cartão filtrado por `pix_enabled`/`card_enabled`, monta
`PixPayment`/`CardPaymentBrick`, remove TODO o mock (PAN/CVV/PIX_CODE/parcelas 1,99%); sucesso →
tela de sucesso real (limpa carrinho/cupom, `markCartRecovered`).
**Where**: `apps/store/src/features/checkout/ui/PaymentStep.tsx` (rewrite) + teste; `OrderSummary` (linha desconto PIX)
**Depends on**: T13, T14, T15
**Reuses**: T14, T15, `usePaymentSettings`
**Requirement**: PAY-01, PAY-16, PAY-14 (UI)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `grep` sem `PIX_CODE`/maskCard/maskCVV no store
- [x] Unit: `pix_enabled=false` esconde PIX; `card_enabled=false` esconde cartão
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 3 testes novos (7: 4 PaymentStep + 3 OrderSummary)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): payment step real com bricks`

---

### T17: Store — pagar PIX de pedido pendente na conta (P3)

**What**: Na listagem de pedidos da conta, pedidos `payment_status='pending'` ganham ação
"Pagar com PIX" que abre `PixPayment` com o `order_id`.
**Where**: página de pedidos da conta (`apps/store/src/pages/*` onde `useOrdersByCustomerId` é usado) + teste
**Depends on**: T15
**Reuses**: `PixPayment` (T15), `useOrdersByCustomerId`
**Requirement**: PAY-18

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Unit: pedido pending exibe CTA; approved não exibe
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 2 testes novos (2)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(store): pagar pedido pendente na conta`

---

### T18: Backoffice — payment_status na listagem e detalhe

**What**: Tipo `Order` admin + badge de `payment_status` (6 estados, cores) na `AdminOrdersPage` +
campos `mp_payment_id`/`mp_status_detail`/`paid_at` no `OrderDetailDialog`.
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrders.ts`,
`apps/backoffice/src/pages/admin/AdminOrdersPage.tsx`,
`apps/backoffice/src/features/order-management/ui/OrderDetailDialog.tsx`
**Depends on**: T1, T5
**Reuses**: padrão de badges existente do admin, tipos T1
**Requirement**: PAY-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Badge com cor distinta por estado; detalhe mostra os 3 campos novos (`useAdminOrders` já usa `DbOrder` com os campos do T1 — sem mudança lá)
- [x] `pnpm build` ok (backoffice roda `--passWithNoTests`)

**Tests**: none (matriz: badge/UI admin = build gate) · **Gate**: build
**Commit**: `feat(backoffice): payment status nos pedidos`

---

### T19: Fechamento — envs, docs e rastreabilidade

**What**: `.env.example` (edge secrets documentados), atualização do CLAUDE.md (função
mercado-pago, envs), STATE.md (handoff), spec.md (traceability → Implementing/Verified).
**Where**: `.env.example`, `CLAUDE.md`, `.specs/project/STATE.md`, `.specs/features/02-checkout-mercado-pago/spec.md`
**Depends on**: T18 (última)
**Reuses**: —
**Requirement**: transversal

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Gate Build completo: `pnpm build && pnpm test` verde (core 73, store 34, backoffice passWithNoTests)
- [x] Docs/rastreabilidade atualizados (`.env.example` raiz, CLAUDE.md, STATE.md Handoff, spec.md → Implementing)

**Tests**: none · **Gate**: build
**Commit**: `docs: checkout mercado pago — envs e rastreabilidade`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4          (domínio, 4 tasks)
Phase 2:  T5 ──→ T6 ──→ T7                 (banco, 3 tasks)
Phase 3:  T8 ──→ T9 ──→ T10                (edge fn, 3 tasks)
Phase 4:  T11 → T12 → T13 → T14 → T15 → T16 → T17   (store, 7 tasks)
Phase 5:  T18 ──→ T19                      (backoffice+docs, 2 tasks)
```

Total: **19 tasks** → empacota em ~3 batches (~7 tasks): [P1+P2]=7, [P3+P4 não cabe inteiro…] →
packing final decidido no Execute (fases inteiras, nunca divididas).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo de tipos | ✅ Granular |
| T2 | 1 módulo + setup de teste do mesmo pkg | ✅ Coeso |
| T3 | 1 módulo | ✅ Granular |
| T4 | 1 módulo | ✅ Granular |
| T5 | 1 migration | ✅ Granular |
| T6 | 1 migration | ✅ Granular |
| T7 | 1 migration (RPC+publication+cron são um deploy atômico) | ✅ Coeso |
| T8 | 1 arquivo (esqueleto+auth) | ✅ Coeso |
| T9 | 1 action | ✅ Granular |
| T10 | 1 action | ✅ Granular |
| T11 | bootstrap+deps+env (1 mudança de config) | ✅ Coeso |
| T12 | 1 hook | ✅ Granular |
| T13 | 1 fluxo de página | ✅ Coeso |
| T14 | 1 componente | ✅ Granular |
| T15 | 1 componente | ✅ Granular |
| T16 | 1 componente (rewrite) + linha no OrderSummary | ✅ Coeso |
| T17 | 1 ação de página | ✅ Granular |
| T18 | 1 entidade em 3 arquivos do mesmo slice | ✅ Coeso |
| T19 | docs | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | início P1 | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T2→T3 (ordem de fase; dep real T1, anterior) | ✅ |
| T4 | T1 | T3→T4 (idem) | ✅ |
| T5 | T1 | P1→P2 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T5 | T6→T7 (dep real T5, anterior) | ✅ |
| T8 | T5 | P2→P3 | ✅ |
| T9 | T2, T7, T8 | T8→T9 (T2/T7 em fases anteriores) | ✅ |
| T10 | T3, T4, T9 | T9→T10 (T3/T4 anteriores) | ✅ |
| T11 | — (após P3 por sequência) | P3→P4 | ✅ |
| T12 | T1, T9, T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T12, T3 | T13→T14 (deps anteriores) | ✅ |
| T15 | T12, T2 | T14→T15 (deps anteriores) | ✅ |
| T16 | T13, T14, T15 | T15→T16 | ✅ |
| T17 | T15 | T16→T17 (dep anterior) | ✅ |
| T18 | T1, T5 | P4→P5 | ✅ |
| T19 | T18 | T18→T19 | ✅ |

Nenhuma dependência aponta para fase posterior. ✅

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | tipos | none | none | ✅ |
| T2 | domínio pagamento | unit | unit | ✅ |
| T3 | domínio pagamento | unit | unit | ✅ |
| T4 | domínio pagamento | unit | unit | ✅ |
| T5 | SQL | manual | manual | ✅ |
| T6 | SQL | manual | manual | ✅ |
| T7 | SQL | manual | manual | ✅ |
| T8 | edge fn | manual/sandbox | manual | ✅ |
| T9 | edge fn | manual/sandbox | manual | ✅ |
| T10 | edge fn | manual/sandbox | manual | ✅ |
| T11 | config | none | none | ✅ |
| T12 | UI checkout (hook) | unit | unit | ✅ |
| T13 | UI checkout | unit | unit | ✅ |
| T14 | UI checkout | unit | unit | ✅ |
| T15 | UI checkout | unit | unit | ✅ |
| T16 | UI checkout | unit | unit | ✅ |
| T17 | UI checkout | unit | unit | ✅ |
| T18 | badge admin | none (build) | none | ✅ |
| T19 | docs | none | none | ✅ |

Nenhuma violação. ✅
