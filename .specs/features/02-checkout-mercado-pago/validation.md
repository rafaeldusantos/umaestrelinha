# Checkout Mercado Pago (Bricks) — Validation

**Date**: 2026-07-18
**Spec**: `.specs/features/02-checkout-mercado-pago/spec.md`
**Diff range**: `refactor/monorepo-fsd..feat/checkout-mercado-pago` (19 commits, `8825712..92cfcee`, T1–T19)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T4 | ✅ Done | Domínio `packages/core/src/payment` + 73 unit tests |
| T5–T7 | ✅ Done | Migrations aplicadas/validadas via psql local; aplicar no hosted = pendência documentada |
| T8–T10 | ✅ Done (código) | Runtime da edge function NÃO exercitado (CLI supabase indisponível) — pendência honesta em tasks.md/STATE.md |
| T11–T17 | ✅ Done | Store: 33 unit tests novos (34 com example.test.ts) |
| T18 | ✅ Done | Badge backoffice — camada "none/build gate" na matriz |
| T19 | ✅ Done | `.env.example`, CLAUDE.md, STATE.md Handoff, traceability em `Implementing` |

---

## Spec-Anchored Acceptance Criteria (evidência-ou-zero)

Camadas conforme Test Coverage Matrix (tasks.md): domínio/UI = **unit**; edge function runtime, SQL e sandbox MP = **manual** (não contam como gap de teste automatizado se documentadas — estão).

### P1: Pagar com cartão de crédito

| AC | Spec-defined outcome | Evidência (file:line + assertion) | Result |
| -- | ------------------- | --------------------------------- | ------ |
| 1. Brick renderizado, zero inputs próprios de PAN/CVV | 0 inputs próprios no código da loja | `apps/store/src/features/checkout/ui/__tests__/CardPaymentBrick.test.tsx:57-59` — `expect(container.querySelectorAll('input').length).toBe(0)`; montagem por settings: `.../PaymentStep.test.tsx:51-58` — `expect(screen.getByTestId('card-brick')).toBeInTheDocument()`. Grep no store: zero ocorrências de `PIX_CODE/maskCard/maskCVV/cardNumber` (só comentário/teste) | ✅ PASS (render real do Brick = sandbox) |
| 2. Token → edge fn com `order_id`; sem PAN/CVV p/ supabase | payload contém `token` + `order_id`, nunca PAN | `CardPaymentBrick.test.tsx:88-92` — `expect(mutateAsync).toHaveBeenCalledWith({ order_id: 'order-1', method: 'card', card: expect.objectContaining({ token: 'tok_123', ... }) })`; `useCreatePayment.test.tsx:59-61` — `expect(body.card).toEqual(card)` (formData tokenizado, sem PAN). Inspeção de rede real = manual-pending | ✅ PASS (unit) + ⏳ manual-pending (sandbox) |
| 3. Amount recalculado server-side + `X-Idempotency-Key` ao MP | valor do pedido persistido, header enviado | Domínio: `packages/core/src/payment/__tests__/pricing.test.ts:8-144` (11 asserts de valor exato). Edge fn (`supabase/functions/mercado-pago/index.ts:161-167` recálculo; `:225` header) = camada manual da matriz | ✅ PASS (domínio) + ⏳ manual-pending (edge fn runtime) |
| 4. Aprovado → sucesso, carrinho limpo, `approved`+`paid_at` | clearCart 1x, tela sucesso, DB approved | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx:126-140` — `expect(clearCart).toHaveBeenCalledTimes(1)`, `expect(screen.getByText(/Pagamento confirmado/i))`, sem promessa de e-mail; `CardPaymentBrick.test.tsx:81-93` — `onApproved` 1x só quando `status==='approved'`. `paid_at`/RPC = manual (roteiro T7 via psql) | ✅ PASS (unit) + ⏳ manual-pending (DB/sandbox) |
| 5. Recusa → motivo amigável, permanece no passo, carrinho intacto, retentativa | mensagem mapeada de `status_detail`; sem navegação | `CardPaymentBrick.test.tsx:69-79` — `toHaveTextContent('Saldo insuficiente no cartão.')` (valor exato do mapa), `expect(onApproved).not.toHaveBeenCalled()`, Brick continua montado; carrinho intacto: `CheckoutPage.test.tsx:115-124` — `expect(clearCart).not.toHaveBeenCalled()`; mesma ordem sem recriar: `CheckoutPage.test.tsx:152-163` — `expect(createOrderMutateAsync).toHaveBeenCalledTimes(1)` | ✅ PASS |
| 6. Parcelamento limitado por `max_installments`/`min_installment_value` | floor(30/10)=3 < max 6 → 3 | `CardPaymentBrick.test.tsx:62-67` — `expect(capturedProps.customization.paymentMethods.maxInstallments).toBe(3)`; `initialization.amount` = 30 | ✅ PASS (opções vindas do MP = sandbox) |

### P1: Pagar com PIX

| AC | Spec-defined outcome | Evidência | Result |
| -- | ------------------- | --------- | ------ |
| 1. Pagamento com expiração 30 min + QR real do `qr_code` | QR gerado do copia-e-cola retornado | `PixPayment.test.tsx:74-86` — `expect(qr.getAttribute('data-value')).toBe('PIX-COPIA-E-COLA')`, `mutateAsync` 1x (guard StrictMode). `date_of_expiration` +30min: `index.ts:25,205` = manual-pending | ✅ PASS (unit) + ⏳ manual-pending |
| 2. Desconto PIX % sobre (subtotal − cupom), frete fora, idêntico UI/server | base 100→5 (não 6 c/ frete); base 80→4; total 86 | Server: `pricing.test.ts:33-44` — `expect(totals.pixDiscount).toBe(5)`, `:46-57` — `toBe(4)`/`toBe(86)`; UI idêntica: `OrderSummary.test.tsx:29-38` — `-R$ 4,00` e `R$ 86,00` (mesmos valores) | ✅ PASS |
| 3. Webhook aprova → tela transiciona via Realtime sem refresh | filtro na linha do pedido; só `approved` dispara | `PixPayment.test.tsx:88-105` — `expect(realtimeConfig).toEqual({ event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.order-1' })`; `pending` não chama, `approved` → `onApproved` 1x. E2E webhook→Realtime = sandbox | ✅ PASS (unit) + ⏳ manual-pending |
| 4. QR expirado → "gerar novo código" no MESMO pedido pending | CTA refaz create-payment | `PixPayment.test.tsx:107-119` — CTA `/gerar novo código/i`, `expect(mutateAsync).toHaveBeenCalledTimes(2)`, novo QR renderizado (mesmo `orderId` por closure) | ✅ PASS |
| 5. Pending > 24h → `expired` | job pg_cron/migration | Camada SQL manual — T7 done-when: pg_cron agendado no local, fallback documentado em comentário SQL | ⏳ manual-pending (documentado) |
| 6. `pix_enabled=false` → PIX não exibido | opção ausente | `PaymentStep.test.tsx:51-58` — `expect(screen.queryByRole('button', { name: /pix/i })).not.toBeInTheDocument()` + `queryByTestId('pix-payment')` ausente | ✅ PASS |

### P1: Backend confiável

| AC | Spec-defined outcome | Evidência | Result |
| -- | ------------------- | --------- | ------ |
| 1. Migration: colunas payment_status/mp_payment_id/mp_status_detail/paid_at | schema + backfill approved | Camada SQL manual — `supabase/migrations/20260718234043_orders_payment_schema.sql`; T5 validado via psql local | ⏳ manual-pending (hosted) |
| 2. Webhook assinatura inválida/ausente → 401, nada muda | HMAC inválido rejeitado | Lib (unit): `webhookSignature.test.ts:61-92` — válida `resolves.toBe(true)`; v1 errado/ausente/sem v1/ts adulterado/secret errado `resolves.toBe(false)` (referência independente via `node:crypto`). 401 da function (`index.ts:296-301`, antes de qualquer acesso a banco) = manual-pending (curl assinado) | ✅ PASS (domínio) + ⏳ manual-pending |
| 3. Consulta API + mapa de transições; approved nunca regride | mapa exato PAY-04 | `status.test.ts:26-48` — 8 pares permitidos `it.each(ALLOWED)... toBe(true)` + TODOS os 28 pares negados por matriz exaustiva derivada da spec `toBe(false)`; `:50-53` — `canTransition('approved','pending'/'rejected')` false; `mapMpStatus`: `:64-81` (7 mapeamentos + desconhecido→null). "Nunca confiar no payload" (`index.ts:307-321` GET /v1/payments) = manual-pending | ✅ PASS (domínio) + ⏳ manual-pending |
| 4. Webhook duplicado → estado/efeitos idênticos | idempotência | Guard `paid_at IS NULL` na RPC — roteiro T7 via psql (RPC 2x → estoque 1x); reexecução via function = manual-pending | ⏳ manual-pending (documentado) |
| 5. Estoque decrementa 1x, floor 0, paid_at gravado | GREATEST(...,0) | Roteiro T7 via psql (stock 1, qty 3 → 0) — camada SQL manual | ⏳ manual-pending (documentado) |
| 6. RLS: fim do Allow all; update de payment só service role | policies escopadas | Roteiro T6 via psql local — camada SQL manual; `supabase/migrations/20260718234512_orders_rls_hardening.sql` | ⏳ manual-pending (documentado) |
| 7. MP indisponível → erro amigável, pedido `pending`, retentável | mensagem exata + retry | `useCreatePayment.test.tsx:64-79` — `rejects.toThrow('Não foi possível iniciar o pagamento. Tente novamente.')` (mensagem do body 502); `:81-88` fallback; retry: `PixPayment.test.tsx:138-151` — alerta + "Tentar novamente" refaz (2x); `CardPaymentBrick.test.tsx:96-106` — permanece no passo. 502 server-side sem transição (`index.ts:229-232`) = manual-pending | ✅ PASS (client) + ⏳ manual-pending |

### P2: Backoffice

| AC | Evidência | Result |
| -- | --------- | ------ |
| 1. Badge de payment_status (6 estados) | Matriz: camada "none — build gate only". `apps/backoffice/src/entities/order/ui/PaymentStatusBadge.tsx` no diff; `pnpm build` verde | ✅ conforme matriz (sem teste exigido) |
| 2. Detalhe: mp_payment_id/mp_status_detail/paid_at | `OrderDetailDialog.tsx` +7 linhas; build verde | ✅ conforme matriz |
| 3. Estorno no painel MP → `refunded` via webhook | Sandbox — manual-pending (success criteria) | ⏳ manual-pending (documentado) |

### P3: Conta

| AC | Evidência | Result |
| -- | --------- | ------ |
| 1. Pedido `pending` em "meus pedidos" → gerar novo QR | `AccountPage.test.tsx:58-63` — `getAllByRole('button', { name: /pagar com pix/i })` `toHaveLength(1)` (approved NÃO exibe); `:65-72` — abre `PixPayment` com `data-order === 'order-pending'` | ✅ PASS |

**Status**: ✅ Todos os ACs de camada unit cobertos com assertion no valor definido pela spec; 0 gaps; pendências manuais documentadas (abaixo).

---

## Edge Cases (spec)

| Edge case | Camada | Evidência / Status |
| --------- | ------ | ------------------ |
| PIX pago depois com tela fechada | webhook/sandbox | ⏳ manual-pending (roteiro) |
| Corrida webhook × resposta síncrona | RPC idempotente | ⏳ manual-pending (guard `paid_at IS NULL`, roteiro T7 psql) |
| Oversell → floor 0 + alerta de estoque | SQL | ⏳ manual-pending (roteiro T7 psql: floor validado) |
| `pix_discount_percent = 0` → sem texto, total igual | unit | ✅ `pricing.test.ts:71-83` — `pix.total` === `card.total` (50); `PixPayment.test.tsx:129-136` — texto ausente; `OrderSummary.test.tsx:40-48` — sem linha, total R$ 90,00 |
| Total < R$ 0,01 → bloqueio com erro claro | unit (domínio) | ✅ `pricing.test.ts:111-133` — `toThrow(/0,01/)` (cupom e via PIX); boundary `:135-144` — 0,01 permitido. 422 na edge fn = manual |
| Troca de método após PIX; prevalece 1º approved, 2º sinalizado | unit (toggle) + edge fn | ✅ toggle: `PaymentStep.test.tsx:69-82`; `canTransition('approved', *)` negado: matriz exaustiva `status.test.ts:42-48`. Sinalização `mp_status_detail` (`index.ts:359-375`) = ⏳ manual-pending |
| Falha pós-criação no MP → reconciliação via `external_reference` | edge fn | ⏳ manual-pending (`index.ts:327-345` fallback implementado) |

---

## Discrimination Sensor (P0/full — 5 mutações, estado descartável, árvore restaurada)

| # | Mutação | File:line | Teste que matou | Killed? |
| - | ------- | --------- | --------------- | ------- |
| 1 | `canTransition`: `approved: ['refunded']` → `['refunded','pending']` (approved regride) | `packages/core/src/payment/status.ts:19` | `status.test.ts` — "nega approved → pending" + "approved nunca regride" (2 failed) | ✅ Killed |
| 2 | Base do desconto PIX passa a incluir frete (`+ input.shipping`) | `packages/core/src/payment/pricing.ts:37` | `pricing.test.ts` — "frete fora da base" + "base é (subtotal − cupom)" (2 failed) | ✅ Killed |
| 3 | `buildManifest` sem `.toLowerCase()` no data.id | `packages/core/src/payment/webhookSignature.ts:18` | `webhookSignature.test.ts` — "data.id alfanumérico → lowercase" (1 failed) | ✅ Killed |
| 4 | `useCreatePayment` reusa o MESMO UUID entre tentativas (módulo-level) | `apps/store/src/features/checkout/api/useCreatePayment.ts:38` | `useCreatePayment.test.tsx` — "gera idempotency_key NOVO a cada tentativa" (1 failed) | ✅ Killed |
| 5 | `PixPayment` dispara `onApproved` em QUALQUER UPDATE (não só approved) | `apps/store/src/features/checkout/ui/PixPayment.tsx:79-80` | `PixPayment.test.tsx` — "chama onApproved quando payment_status vira approved (PAY-13)" (1 failed) | ✅ Killed |

**Sensor depth**: P0-full (caminho crítico de pagamento)
**Result**: 5/5 killed — ✅ PASS. `git status` restaurado ao estado pré-validação (apenas `pnpm-workspace.yaml` modificado pré-existente + untracked de specs).

---

## Gate Check

- **Comando**: `pnpm build && pnpm test` (Build gate da tasks.md)
- **Build**: verde (turbo, store + backoffice, 0 erros TS)
- **Testes**: **107 passed, 0 failed, 0 skipped** — `@nanapin/core` 73 (3 files), `@nanapin/store` 34 (8 files, inclui `example.test.ts` pré-existente), `@nanapin/backoffice` 0 (`--passWithNoTests`, camada sem teste exigido pela matriz)
- **Test count antes da feature**: 1 (só `example.test.ts`) → **depois**: 107 → **delta**: +106. Nenhum teste removido/enfraquecido.
- Números batem com o claim do T19 (core 73, store 34).

---

## Payload/Conjunction Rule

Assertions de valor/estado (não só spies): payload do invoke com igualdade profunda (`useCreatePayment.test.tsx:35-41,59-61`), mensagem exata de recusa (`CardPaymentBrick.test.tsx:75`), valores monetários exatos UI+domínio (`OrderSummary.test.tsx:35-37`, `pricing.test.ts`), objeto de config do canal Realtime (`PixPayment.test.tsx:93-98`), matriz exaustiva de transições. ✅

Observação menor (não-gap): no teste de regeneração de QR (`PixPayment.test.tsx:107-119`) o payload da 2ª chamada não é re-assertado (só o count) — risco baixo, pois o componente tem um único caminho (`order_id` por closure) e a 1ª chamada é assertada com o valor.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / sem scope creep | ✅ (diff restrito ao escopo; mock antigo removido — grep sem `PIX_CODE`/mask) |
| Matches patterns (FSD, molde melhor-envio, react-query) | ✅ |
| Spec-anchored outcomes (valores assertados = spec) | ✅ |
| Per-layer Coverage Expectation (domínio 1:1 ACs; UI estados por AC) | ✅ |
| Todo teste mapeia para AC/edge case/done-when (sem unclaimed) | ✅ |
| Guidelines documentadas seguidas | ✅ CLAUDE.md + Test Coverage Matrix da tasks.md |

---

## Pendências manuais documentadas (honestas — tasks.md T8–T10 done-when + STATE.md Handoff)

1. Exercitar edge function localmente (`supabase functions serve`) — CLI supabase indisponível na máquina de execução (T8/T9/T10 marcam "PENDENTE de ambiente").
2. Roteiro sandbox MP: cartão APRO/OTHE, PIX QR real, webhook assinado (curl), reenvio 3x, estorno→refunded (success criteria da spec).
3. Aplicar migrations no Supabase hosted (validadas via psql local em transação).
4. Inspeção de rede: nenhuma request ao Supabase com PAN/CVV (sandbox).
5. Follow-up registrado: `orders.payment_method` gravado como `pix` na criação (método real escolhido depois) — STATE.md.

## Requirement Traceability

PAY-01…PAY-18: camadas unit → **Verified (unit)**; camadas edge fn/SQL/sandbox → **Implementing (manual-pending)**. spec.md permanece `Implementing` até o roteiro sandbox — coerente e honesto; a atualização do spec.md fica com o orquestrador (Verifier é read-only fora deste arquivo).

---

## Summary

**Overall**: ✅ PASS (unit/build scope) — pendências manuais de ambiente documentadas, não são gaps de teste automatizado.

**Spec-anchored check**: 14/14 ACs de camada unit com evidência file:line e valor da spec; 0 gaps; 9 ACs + 4 edge cases em camada manual/sandbox honestamente pendentes.
**Sensor**: 5/5 mutações mortas (P0-full).
**Gate**: `pnpm build && pnpm test` — 107 passed, 0 failed, 0 skipped (+106 vs. baseline).

**Lessons**: PASS limpo sem sobreviventes/gaps → nenhuma lesson a registrar (regra do validate.md).

**Next steps**: executar o roteiro sandbox/edge-runtime quando a CLI supabase estiver disponível; só então promover traceability a `Verified` integral.
