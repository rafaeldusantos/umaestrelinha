# Promoções: desconto progressivo por quantidade — Validation

**Date**: 2026-08-03
**Spec**: `.specs/features/17-promocoes-desconto-progressivo/spec.md`
**Diff range**: nenhum — **a feature está inteiramente na árvore de trabalho**. HEAD é `5614bd2`
(anterior ao início da 17). A superfície verificada é `git status --short` + `git diff HEAD` dos
21 arquivos rastreados, mais 14 caminhos não rastreados (lista completa em "Diff Surface").
**Verifier**: sub-agente independente (author ≠ verifier). Nenhuma correção aplicada — só as
7 mutações do sensor, todas revertidas verbatim.

## Verdict

| Pass | Data | Verdict | Resumo |
|---|---|---|---|
| **1** | 2026-08-03 | ❌ **FAIL** | 23/24 ACs, gate na baseline, sensor 8/8 killed — mas 1 blocker de dinheiro (edge case de preço por variação não implementado, virando 422 espúrio pela guarda nova) + 2 spec-precision gaps + 1 info |
| **2** | 2026-08-03 | ✅ **PASS** | Os 4 gaps fechados e **verificados por sensor próprio**. Gate 2848 (+10), lint e tipos na baseline. Sensor 7/7 killed, incluindo a mutação que reverte o fix do gap 1 e a que agora derruba `displayedEqualsCharged` |

**Verdict final: ✅ PASS.**

O corpo abaixo preserva a auditoria da pass 1 **como ela foi escrita** (é o registro de por que a
feature não passou de primeira). A pass 2 está na seção "Pass 2 — Re-verificação", no fim, com o
estado atual de cada gap.

---

## Task Completion

| Task | Status | Notas |
|---|---|---|
| T1–T4 (dado) | ✅ Done | Três migrations presentes; verificadas por probe HTTP próprio (abaixo) |
| T5–T7 (regra pura) | ✅ Done | `pricing.ts` +350 linhas; 54 testes em `progressive.test.ts` |
| T8–T9 (servidor) | ✅ Done | `handlers.ts` +162 linhas; 20 testes novos em `handlers.test.ts` |
| T10–T13 (loja) | ✅ Done | `usePromotions.ts`, `useCartPromotion.ts`, `CartDrawer`, `OrderSummary`, `useCheckoutTotals` |
| T24 (Phase 4b) | ✅ Done | `useOrders.ts` + `CheckoutPage.tsx` gravam o par; provado nos dois níveis |
| T14–T19 (admin) | ✅ Done | `AdminPromotionsPage`, slice `promotion-form`, grupo `Descontos` |
| T20–T23 (P2/P3) | ✅ Done | Pausar, duplicar, convite de faixa, três cartões |
| Verifier | ✅ Este documento | — |

---

## Gate Check (medido pelo Verifier, não relatado pelo implementador)

| Métrica | Baseline (fecho da 16, corrigida no `tasks.md`) | **Medido agora** | Delta |
|---|---|---|---|
| `@nanapin/core` | 645 | **756** | +111 |
| `@nanapin/store` | 789 | **836** | +47 |
| `@nanapin/backoffice` | 910 | **997** | +87 |
| `@nanapin/functions` | 232 | **249** | +17 |
| **Total** | 2576 | **2838** | **+262** |
| Lint | 30 err / 9 warn (bo 28/7 · store 2/2) | **30 err / 9 warn** (bo 28/7 · store 2/2) | **0 novo** |
| `tsc --noEmit` store | 0 | **0** (exit 0) | 0 |
| `tsc --noEmit` backoffice | 0 | **0** (exit 0) | 0 |

- **Comando**: `npx turbo test --force` (o `pnpm test` inicial voltou 3 de 4 tarefas do cache
  do Turbo, o que **não** é medição — repetido com `--force`).
- **Resultado**: 2838 passed, 0 failed, 0 skipped. 161 arquivos de teste.
- **Test integrity**: nenhuma contagem caiu; nenhum teste pré-existente foi deletado nem enfraquecido
  (os 118 testes de `create-payment` que exercitam o caminho **sem** promoção seguem intactos e são a
  prova de não-regressão do bump e do cupom).
- **Skips**: nenhum.
- Nota de ambiente: uma execução de `@nanapin/store test` pode sair com código 1 sem falha reportada
  (flakiness de timer do `input-otp`, documentada). Não ocorreu nesta medição.

---

## Spec-Anchored Acceptance Criteria

### P1-A: A dona da loja define a regra

| Critério (WHEN → THEN) | Desfecho definido pela spec | `file:line` + asserção | Result |
|---|---|---|---|
| PRM-01 — abre `/admin/promocoes` ⇒ lista com 6 colunas, faixas resumidas, vigência, status, `created_at` desc | Colunas do board; `3 · 5 · 10 un`; ordem desc | `apps/backoffice/src/pages/admin/AdminPromotionsPage.test.tsx:158` (colunas na ordem), `:196` (`3 · 5 · 10 un` + `R$ 5,00 → R$ 4,20 /un`), `:239`/`:247` (vigência), `:262` (selo `Pausada`), `:181` (a tela não reordena) · ordenação: `packages/core/src/hooks/__tests__/usePromotionsAdmin.test.ts:181` — `expect(db.orders).toEqual([{ column: 'created_at', ascending: false }])` | ✅ |
| PRM-02 — salva nome + tipo + escopo com ≥1 categoria + ≥1 faixa ⇒ persiste as três tabelas e aparece na listagem sem recarregar | promoção + faixas + vínculos, **em transação** | `PromotionFormDialog.test.tsx:332` — `toHaveBeenCalledTimes(1)` **+** `:333` `toHaveBeenCalledWith(objectContaining({ name, scope: 'categories', category_ids: ['bottons'] }))` · uma chamada só: `usePromotionsAdmin.test.ts` (`upsert_promotion`) · invalidação das duas chaves: idem · **probe HTTP do Verifier**: `upsert_promotion` devolveu id e as 3 tabelas ficaram gravadas | ✅ |
| PRM-03 — `min_qty < 2` ⇒ recusa com "A faixa precisa começar em 2 unidades ou mais" e **não grava** | texto ao pé da letra + nada gravado | `PromotionFormDialog.test.tsx:398` + `apps/backoffice/src/features/promotion-form/model/schema.ts:19` (`MIN_QTY_TOO_LOW`), com `expect(mutations.create).not.toHaveBeenCalled()` em `:405` · **probe**: `23514 promotion_tiers_min_qty_check`, e `promotions?name=eq.VERIFIER probe C` voltou `[]` (nada meio-salvo) | ✅ |
| PRM-04 (AC 4) — duas faixas com o mesmo `min_qty` ⇒ recusa **nomeando** a quantidade, sem gravar | quantidade nomeada | `PromotionFormDialog.test.tsx:408` + `schema.ts:25` — `Já existe uma faixa a partir de ${minQty} unidades` · **probe**: `23505 Key (promotion_id, min_qty)=(…, 3) already exists` | ✅ |
| PRM-03 (AC 5) — `unit_price ≤ 0`, ou `percent` fora de 1–90 ⇒ mensagem **por campo** | erro por campo | `PromotionFormDialog.test.tsx:420` (`UNIT_PRICE_NOT_POSITIVE`), `:430` (`PERCENT_OUT_OF_RANGE`), path `['tiers', index, 'value']` em `schema.ts:77-90` · **probe**: trigger devolveu `Faixa percentual precisa estar entre 1 e 90: 95.00` | ✅ |
| PRM-04 — editor mostra o **total que a cliente paga** por faixa (`5 un` a `R$ 4,60` ⇒ `R$ 23,00`) e o % equivalente | R$ 23,00 exato | `apps/backoffice/src/features/promotion-form/model/tierPreview.test.ts:14` (R$ 23,00), `:22` (os três totais do board), `:49` (alternar tipo recalcula), `:61` (sem referência ⇒ `—`, nunca número inventado) · a prévia chama `tierUnitPrice` (`tierPreview.ts:40`), a **mesma** função do servidor | ✅ |
| PRM-05 — ligar `Vitrine do kit` numa segunda promoção ⇒ desliga a anterior na mesma transação, **no máximo uma** | exatamente uma marcada | Payload: `PromotionFormDialog.test.tsx:564` — `toHaveBeenCalledWith(objectContaining({ is_kit_showcase: true }))` · cópia nunca rouba a vitrine: `usePromotionsAdmin.test.ts:371` — `expect(payload.is_kit_showcase).toBe(false)` · RPC e não dois updates: `usePromotionsAdmin.test.ts:548` · **exclusividade provada por probe do Verifier**: duas gravações com `is_kit_showcase: true` deixaram **1** linha marcada (a segunda), garantida por `promotions_single_kit_showcase` | ✅ (exclusividade por probe + índice único, não por teste unitário — ver nota) |
| PRM-06 — RLS: leitura pública só de vigente; escrita anônima recusada | só `active` e vigente | **probe do Verifier**: anon viu 2 de 3 promoções (a pausada ficou fora); `POST /promotions` anon ⇒ `42501 new row violates row-level security policy` (http 401); `rpc/upsert_promotion` anon ⇒ `42501 permission denied for function` (http 401) · `20260803130000_promotions-progressive.sql:212-226` | ✅ |
| PRM-07 — `updated_at` por trigger | trigger, evidência da última escrita | **probe**: `created_at` 16:14:17 imutável, `updated_at` 16:14:35 → 16:15:25 após dois writes · `20260803130000:169-172` | ✅ |
| P1-A AC 8 — save falho ⇒ nada parcial, erro exibido | nada gravado + dialog aberto | `PromotionFormDialog.test.tsx:634` (erro mantém o dialog aberto e avisa), `:653` (sucesso fecha) · atomicidade da RPC provada pelo probe C acima | ✅ |

### P1-B: O servidor cobra a faixa

| Critério | Desfecho da spec | `file:line` + asserção | Result |
|---|---|---|---|
| PRM-08 — aplica a **maior** faixa com `min_qty ≤ n` a **todas** as unidades elegíveis | maior faixa | `packages/core/src/payment/__tests__/progressive.test.ts:104` — 7 un ⇒ `{ min_qty: 5, value: 4.6 }`; `:111` fronteiras exatas; `:117` acima da última fica na última; `:209` a faixa vale para todas as unidades (5 × 4,60 = 23) | ✅ |
| P1-B AC 2 — nenhuma faixa alcançada ⇒ lista **inalterada**, sem mutar o input | mesma lista, `applied` vazio | `progressive.test.ts:217` — `expect(result.items).toEqual(items)` + `applied` `[]`; `:231` não muta e é determinística | ✅ |
| P1-B AC 3 / A10 — `unit_price` de faixa acima do cheio ⇒ mantém o cheio | R$ 3,90 continua R$ 3,90 | `progressive.test.ts:169` — `expect(tierUnitPrice(3.9,'unit_price',4.6)).toBe(3.9)`; `:193` como propriedade; `:267` não entra em `applied` | ✅ |
| P1-B AC 4 — `percent` ⇒ `round2(cheio × (1 − pct/100))` **por item** | arredonda por item | `progressive.test.ts:179` — `perItem` 25,42 e `naiveTotal` 76,24 provados **diferentes** (o teste não é vácuo) | ✅ |
| PRM-14 — sobreposição: menor `unit_price`; empate por `created_at` mais antigo | menor preço, depois mais antiga | `progressive.test.ts:275` — vence `promo-barata` (4,50); `:286` empate ⇒ `promo-antiga` (`:302` `expect(applied).toEqual([{promotion_id:'promo-antiga',…}])`); `:305` ordem do array irrelevante; `pricing.ts:295` desempata por `id` | ✅ |
| PRM-11 — `create-payment` resolve elegibilidade **pela view** e cobra `calculateOrderTotals` com a promoção | view, não payload | `supabase/functions/mercado-pago/__tests__/handlers.test.ts:1428` (26,70 → 15,00, `total_amount '15.00'`), `:1442` (só o produto que a view devolve: 34,90), `:1452` (sem linha na view ⇒ 46,60, **nunca** "toda a loja"), `:1458` (faixa não alcançada), `:1466` (inativa/expirada/futura/sem faixas ⇒ 26,70) · `handlers.ts:474-506` filtra `active`+vigência no servidor | ✅ |
| PRM-12 — promoção deixou de valer entre pedido e pagamento ⇒ **422 `promotion_no_longer_valid`**, nenhuma order no MP, pedido segue pagável | 422 + code exato + zero fetch | `handlers.test.ts:1483` — `expect(response.status).toBe(422)`, corpo `toEqual({ error: 'A promoção deste pedido mudou…', code: 'promotion_no_longer_valid' })`, `expect(e.fetchDouble.calls).toHaveLength(0)`, `expect(updates.filter(u=>'total' in u.values)).toHaveLength(0)` · `:1503` igual passa · `:1508` melhorou cobra o melhor · `:1515` gravado 0 cobra o recalculado · `:1522` gravado absurdo ⇒ 422 sem cobrança · guarda em `handlers.ts:574` | ✅ |
| PRM-13 — log inclui `promotion_id` e `tier_min_qty`, molde de `bump_applied` | os dois campos | `handlers.test.ts:1533` — `expect(entry.promotion_id).toBe(PROMO_ID)`, `expect(entry.tier_min_qty).toBe(3)`, `expect(entry.promotions_applied).toBe(1)`; `:1546` par vazio sem promoção · `handlers.ts:786-790` | ✅ |
| P1-B AC 9 — promoção sem categoria vinculada ⇒ não desconta de ninguém | zero desconto | `handlers.test.ts:1452` (46,60) · `progressive.test.ts:74` (`eligibleProductIds: []` ⇒ 0 unidades) · **probe**: view devolveu `[]` para promoção sem vínculo | ✅ |

### P1-C: A loja mostra o mesmo número

| Critério | Desfecho da spec | `file:line` + asserção | Result |
|---|---|---|---|
| PRM-15 — gaveta exibe `Desconto progressivo −R$ X` **e o subtotal já descontado** | linha + subtotal descontado | `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx:224` — `expect(summaryValue('Desconto progressivo')).toBe('−R$ 11,70')`, `Total` `R$ 24,90` · **mas** `expect(summaryValue('Subtotal (3 itens)')).toBe('R$ 26,70')` = subtotal **cheio**, com o desconto em linha separada | ⚠️ Spec-precision gap (ver gap 2) |
| PRM-15 (AC 5) — faixa não alcançada ⇒ **nenhuma** linha (não anuncia −R$ 0,00) | linha ausente | `CartDrawer.test.tsx:236` e `:244` — `queryByText('Desconto progressivo')).not.toBeInTheDocument()`; `OrderSummary.test.tsx:321` idem | ✅ |
| PRM-16 — valor do CTA idêntico, **ao centavo**, ao que `create-payment` cobra para o mesmo pedido | mesmo centavo | Loja: `apps/store/src/features/checkout/model/__tests__/useCheckoutTotals.test.tsx:152` — subtotal 15, `promotionDiscount` 11.7, total 15 · Servidor: `handlers.test.ts:1428` — `total_amount '15.00'`, `promotion_discount: 11.7` · **mesma fixture** (3 × R$ 8,90, faixa `min_qty 3` a R$ 5,00), com referência cruzada escrita no topo do bloco (`useCheckoutTotals.test.tsx:121-126`) · invariante estrutural: os dois chamam `resolveOrderPricing` (`useCheckoutTotals.ts:143`, `handlers.ts:543`) | ⚠️ Spec-precision gap (ver gap 3) |
| PRM-17 — sem acumular ⇒ vence o **menor total final**, e o resumo **nomeia o descartado** com a frase da spec | frase literal | `apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx:328` — `toHaveTextContent('Cupom BEMVINDA não foi aplicado — a promoção Kit de bottons desconta mais')`, cupom mostra `Não aplicado`, total 15,00 · `:343` o inverso · `:355` sem escolha não há frase · decisão por total: `progressive.test.ts:529` (cupom `free_shipping` vence promoção que desconta mais dinheiro), `useCheckoutTotals.test.tsx` (`quote(24.8)` ⇒ `winner 'coupon'`; `quote(9.9)` ⇒ `winner 'promotion'`) | ✅ |
| PRM-18 — `stacks_with_coupon` ⇒ cupom incide sobre o subtotal já descontado, **duas** linhas | duas linhas, 19,55 no caso do AD-015 | `OrderSummary.test.tsx:366` — `summary-promotion` `−R$ 11,70` **e** `Cupom BEMVINDA` `−R$ 1,50`, total `R$ 13,50`, sem frase de descartado · `progressive.test.ts:556` — subtotal 23, cupom 3,45, total **19,55**, `winner 'both'` · `:572` stacks só quando **todas** as aplicadas acumulam | ✅ |

### P2-A / P2-B / P3-A

| Critério | Desfecho da spec | `file:line` + asserção | Result |
|---|---|---|---|
| PRM-19 — grupos na ordem `Dashboard` · `Vendas`(Pedidos, Carrinhos, Clientes) · `Descontos`(Cupons, Promoções) · `Catálogo` · `Loja` · rodapé `Configurações` | ordem exata | `apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts:33` — `toEqual([null,'Vendas','Descontos','Catálogo','Loja'])`; `:44` Vendas sem Cupons; `:51` Descontos `['/admin/cupons','/admin/promocoes']`; `:110` Configurações no rodapé | ✅ |
| PRM-20 — sequência das rotas de `App.tsx` casa com `navGroups`, e o teste existente é **atualizado**, não removido | par verificado | `navItems.test.ts:55` — lê `src/app/App.tsx` do disco (`:23-26`) e `expect(declared).toEqual(allItems.map(i => i.to))`; `:61` `/admin/promocoes` registrada. O teste foi **fortalecido**: antes era convenção em comentário, agora lê o arquivo | ✅ |
| PRM-21 — pausar para de aplicar em pedido novo e **não** altera pedido já pago | pedido pago intacto | `AdminPromotionsPage.test.tsx:382` — pausar manda `{ id, name, active: false }` **e nada mais**; `:390` **não** manda `tiers` nem `category_ids` (presente vazio apagaria); `:399` reativar; `:425` não carrega campo de pedido; `:447` falha da RPC avisa · pedido pago intacto: probe do lote 4 (registrado em `tasks.md`), + `useCartPromotion`/`isLive` filtram `active` | ✅ |
| PRM-22 — duplicar cria cópia **inativa** com faixas e categorias, nome sufixado `(cópia)` | `active:false`, `is_kit_showcase:false`, `(cópia)` | `usePromotionsAdmin.test.ts:369-371` (`is_kit_showcase` false), `AdminPromotionsPage.test.tsx:470` (nasce inativa, sem vitrine, nome sufixado), `:482` faixas e categorias vêm junto, `:495` cria e não manda o `id` da original, `:505` duplica a linha certa | ✅ |
| PRM-23 — "Falta 1 para cada botton sair a R$ 4,20", com `k` e o valor da **mesma função pura** | texto + valor da função pura | `CartDrawer.test.tsx` — `'Falta 1 para cada botton sair a R$ 5,00'` (singular), `'Faltam 2 … R$ 4,60'` (plural, faixa acima), `'Falta 1 … R$ 7,12'` (`percent`: `round2(8,90 × 0,80)`), some na última faixa, some na sacola vazia · `useCartPromotion.test.ts:145-198` (mesmos números no hook, incl. `:188` "usa o maior preço elegível") | ✅ |
| PRM-24 — listagem mostra promoções ativas, desconto concedido em 30 dias, itens por pedido com e sem promoção | três cartões, `—` sem amostra | `AdminPromotionsPage.test.tsx:542` (só o que a loja pratica conta como ativa), `:554` (desconto em reais com a janela nomeada), `:563` (compara os dois lados, 1 decimal), `:572` (`—`, nunca `R$ 0,00` nem `NaN`), `:581`, `:590`, `:596` · `usePromotions.ts:388-444` | ⚠️ SPEC_DEVIATION documentada (`promotion_discount > 0` em vez de `promotion_id is not null`) — **justificada**: `promotion_id` é `null` de propósito com duas promoções, e a AC da spec (P3-A) não nomeia coluna nenhuma. Aceita. |
| PRM-09 — `applyProgressiveDiscount` pura, sem mutar, nunca aumenta preço | pureza + A10 | `progressive.test.ts:231` (não muta, duas chamadas iguais), `:240` (item não elegível fica cheio), `:250` (`percent` por item), `:262` (`applied` nomeia par), `:314` (duas promoções em itens diferentes), `:338` (cada promoção conta as SUAS unidades) | ✅ |
| PRM-10 — view de elegibilidade com descendentes | roll-up por `parent_id` | **probe do Verifier**: produto ligado só a uma **filha** apareceu na view para promoção escopada no **pai** (`promotion_eligible_products?promotion_id=eq.A&product_id=eq.<prod>` ⇒ 1 linha); promoção sem vínculo ⇒ `[]`; apagar a categoria removeu o vínculo (`promotion_categories` de `[{…}]` para `[]`) · `20260803130100:51-63` | ✅ |

**Status**: 23/24 batendo o desfecho da spec · **2 spec-precision gaps** (PRM-15 subtotal, PRM-16
forma da prova) · 1 SPEC_DEVIATION aceita (PRM-24) · **1 edge case da spec não implementado**
(preço por variação — gap 1).

---

## Edge Cases

- [x] **promoção ativa e vigente mas sem faixas ⇒ nenhum desconto** — `progressive.test.ts:125`
      (`tiers: []` ⇒ `null`) · `handlers.test.ts:1470` (`['sem nenhuma faixa', {promotion_tiers: []}]`
      ⇒ 26,70) · `usePromotions.ts:73` (`isLive` descarta) · `handlers.ts:481`
- [x] **categoria apagada ⇒ vínculo cai por cascade; promoção sem vínculo para de descontar (nunca
      "toda a loja")** — **probe**: `promotion_categories` foi de `[{…}]` para `[]` ao apagar a
      categoria · `progressive.test.ts:74` · `handlers.test.ts:1452`
- [x] **cliente altera a sacola depois de o pedido nascer ⇒ servidor reconta dos itens
      persistidos** — `handlers.ts:320` lê `order_items` do banco; `pricingItems` sai dali e nunca do
      payload. Coberto pelos testes de `PAY-03` pré-existentes + as fixtures `order_items` dos
      testes novos
- [x] **contagem cai abaixo da faixa por remoção ⇒ gaveta recalcula no mesmo render** —
      `CartDrawer.test.tsx` "diminuir a quantidade abaixo da faixa remove a linha no mesmo render";
      e o inverso, "subir a quantidade até a faixa troca o convite pela linha de desconto"
- [x] **duas abas do admin ⇒ última escrita vence, `updated_at` como evidência** — **probe**:
      `updated_at` avançou duas vezes com `created_at` imóvel
- [x] **faixas gravadas fora de ordem ⇒ leitura ordena por `min_qty`** —
      `progressive.test.ts:130` (ordem irrelevante) e `:144` (não muta a lista) ·
      `usePromotions.ts:255` (`byMinQty` na leitura do admin)
- [x] **total abaixo de `MIN_ORDER_TOTAL` ⇒ lança como já lançava, checkout não cobra R$ 0** —
      `handlers.test.ts:662` (422 traduzido do throw) · `useCartPromotion.test.ts:257` ("cupom que
      come o subtotal inteiro não quebra a gaveta") · `useCheckoutTotals.ts:160` faz `catch`
- [ ] **item elegível com preço por variação ⇒ a faixa incide sobre o preço da VARIAÇÃO
      (`resolveItemPrice`), não sobre `base_price`** — ❌ **NÃO atendido no checkout**, e sem teste.
      Ver gap 1.

---

## Discrimination Sensor

**Profundidade**: P0-full (caminho de pagamento). 7 mutações de nível de comportamento, aplicadas
**no lugar com editor** (`git stash` proibido nesta execução — a árvore é a única cópia da feature),
cada uma revertida verbatim antes da seguinte.

| # | `file:line` | Mutação | Testes rodados | Killed? |
|---|---|---|---|---|
| 1 | `packages/core/src/payment/pricing.ts:315` | `perItemMin`: `other.unit_price < item.unit_price` → `>` (devolveria o **maior** preço; descontos passariam a compor, quebrando `AD-015`) | `core/src/payment` | ✅ **Killed** — 13 failed / 232 passed, em 2 arquivos |
| 2 | `pricing.ts:215` | `tierUnitPrice`: `round2(Math.min(fullPrice, discounted))` → `round2(discounted)` (a faixa poderia **aumentar** preço; A10) | `core/src/payment` | ✅ **Killed** — 3 failed |
| 3 | `pricing.ts:193` | `resolveProgressiveTier`: `best.min_qty >= tier.min_qty` → `<=` (escolheria a **menor** faixa alcançada) | `core/src/payment` | ✅ **Killed** — 10 failed |
| 4 | `pricing.ts:460` | `resolveOrderPricing`: `withPromotion.totals.total <= withCoupon.totals.total` → `>` (venceria o caminho **mais caro**) | `core/src/payment` | ✅ **Killed** — 4 failed |
| 5 | `supabase/functions/mercado-pago/handlers.ts:574` | Guarda de teto: `pricing.promotionDiscount < displayed` → `>` (cobraria mais caro em vez de devolver 422) | `@nanapin/functions` | ✅ **Killed** — 8 failed / 241 passed |
| 6 | `handlers.ts:501` | Elegibilidade: `scope: p.scope` → `scope: "all"` (ignoraria a view e descontaria de todo item) | `@nanapin/functions` | ✅ **Killed** — 2 failed (`escopo por categoria desconta SÓ o produto que a view devolve`, `… sem nenhuma linha na view não desconta de ninguém`) |
| 7 | `pricing.ts:174` | `countEligibleUnits`: `units + item.quantity` → `units + 1` (contaria produtos distintos; A7) | `core/src/payment` | ✅ **Killed** — 26 failed |
| 8 (extra) | `apps/store/src/pages/CheckoutPage.tsx:401` | `promotion_discount: promotionDiscount` → `0` (mataria a metade da loja do Success Criteria #3) | `store/src/pages/__tests__/CheckoutPage.test.tsx` | ✅ **Killed** — 2 failed |

**Resultado**: **8/8 killed, 0 survived** — PASS ✅

**Achado colateral do sensor (não é mutante sobrevivente, é forma da prova)**: na mutação 4 só
**um** arquivo falhou (`progressive.test.ts`). `displayedEqualsCharged.test.ts` **não** exercita
`resolveOrderPricing` — ele reconstrói os dois lados localmente (`storeTotals`/`serverTotals`,
`displayedEqualsCharged.test.ts:66` e `:82`) chamando `calculateOrderTotals` direto. Ver gap 3.

---

## Success Criteria da spec

| Critério | Verificação | Result |
|---|---|---|
| A regra do kit (3/5/10 sobre `Bottons`) é criada **pelo admin** e a loja pratica o preço sem deploy | **probe do Verifier**: `upsert_promotion` gravou promoção + 2 faixas + 1 vínculo; a view fez roll-up do pai para o produto da filha; `useActivePromotions` lê as mesmas colunas (`usePromotions.ts:43` ≡ `handlers.ts:477`) | ✅ |
| Em 5 bottons: gaveta, CTA, `orders.total` e `total_amount` no MP mostram **R$ 23,00** | O número 23,00 aparece por valor em `progressive.test.ts:487`, `displayedEqualsCharged.test.ts` (progressivo + cupom ⇒ 19,55 sobre subtotal 23) e `useCartPromotion.test.ts:88` (fixture equivalente 15,00). Os quatro lugares **não** são afirmados na mesma execução — a fixture do par loja↔servidor é 3 × R$ 8,90 ⇒ 15,00, não 5 × R$ 5,90 ⇒ 23,00 | ⚠️ equivalente provado, número literal do critério não |
| Promoção expirada entre pedido e pagamento devolve 422 e **nenhuma** order é criada no MP | **Alcançável ponta a ponta.** Metade da loja: `apps/store/src/pages/CheckoutPage.tsx:401` grava `promotion_discount` (teste `CheckoutPage.test.tsx` "promoção aplicada grava promotion_discount > 0…" ⇒ `payload.promotion_discount === 20`) e `apps/store/src/entities/order/api/useOrders.ts:157` o põe no `insert` (teste `useOrders.test.tsx:161` ⇒ `insertedOrder().promotion_discount === 11.7`). Metade do servidor: `handlers.ts:573-574` lê `order.promotion_discount` e compara (teste `handlers.test.ts:1483` ⇒ 422 + `fetchDouble.calls` vazio). Mutação 8 confirmou que a metade da loja é discriminada | ✅ |
| `displayedEqualsCharged.test.ts` cobre a promoção progressiva, incluindo o caso com cupom | `displayedEqualsCharged.test.ts:234` (progressivo puro ⇒ 21,85), `:248` (progressivo + cupom 15% ⇒ 19,55), `:265` (progressivo + bump no mesmo item ⇒ 49,15) | ✅ (literalmente atendido — mas ver gap 3 sobre o que o arquivo prova) |
| Probe HTTP prova que o editor grava as três tabelas (`AD-012`) | Probe do implementador registrado em `tasks.md` (contratos 1–10) **e reproduzido independentemente pelo Verifier** nesta sessão contra `http://127.0.0.1:54321` como `admin@nanapin.dev` | ✅ |
| Sem erro novo de lint ou de tipo | 30 err / 9 warn (idêntico) · `tsc` 0/0 nos dois apps | ✅ |

---

## Code Quality

| Princípio | Status |
|---|---|
| Minimum code | ✅ — `pricing.ts` recebe a regra ao lado de `applyOrderBump` em vez de módulo novo, com a razão registrada (grafo do Deno, `pricing/index.ts:228`) |
| Surgical changes | ✅ — 21 arquivos rastreados tocados, todos na cadeia da feature; nenhum teste pré-existente reescrito |
| No scope creep | ✅ — `Produtos` renderizado **desabilitado** com "em breve" (A8) em vez de implementado; `type` nasce com `check (type = 'progressive_qty')` (evita `AD-011`); `useSetKitShowcase` existe sem consumidor de UI e isso está declarado |
| Matches patterns | ✅ — RPC no molde de `claim_order_email`; hooks no molde de `useCoupons`; handler no molde `AD-004` (deps injetadas); view com `security_invoker` no molde de `category_product_counts` |
| Spec-anchored outcome check | ⚠️ — 2 spec-precision gaps flagged (PRM-15, PRM-16); 1 edge case não implementado |
| Per-layer Coverage Expectation | ✅ — domínio puro 1:1 com as ACs (54 testes); handler cobre sucesso + 4 estados de promoção inválida + 422 + log; migrations por probe HTTP conforme a matriz |
| Todo teste mapeia a AC / edge case / Done-when | ✅ — nenhum teste órfão encontrado nos 6 arquivos novos |
| Asserção de valor, não contagem de mock | ✅ — todo `toHaveBeenCalledTimes(1)` em `PromotionFormDialog.test.tsx` é acompanhado de `toHaveBeenCalledWith(objectContaining({…}))` (`:332`+`:333`, `:351`+`:352`, `:562`+`:564`, `:602`, `:614`); todo `not.toHaveBeenCalled()` é acompanhado da mensagem de erro esperada (`:309`+`:310`). `CheckoutPage.test.tsx` afirma o **payload**; `useOrders.test.tsx` afirma o objeto realmente inserido — as duas metades |
| Guidelines documentadas seguidas | ✅ — `CLAUDE.md` (baselines, gate "sem erros novos", `AD-012` probe HTTP em vez de inspeção de tipo, `AD-015` desconto por item nunca soma, `strictNullChecks: false` ⇒ veredito por `string \| null`), `.specs/STATE.md` (`AD-004`, `AD-012`) |

Ressalva de qualidade, não bloqueante: `handlers.ts:474-506` usa `any` nos rows de `promotions` e
`promotion_eligible_products` — consistente com o resto do arquivo e sem custo de lint (a edge
function não entra no `pnpm lint`), mas é a mesma classe de "tipo escrito à mão" que `AD-012` alerta.
Os probes do Verifier cobrem o risco.

---

## Tree Integrity

- **HEAD antes e depois**: `5614bd2cb82cb6ed94b58d0005fbe452b211d8be` (inalterado).
- **`git status --short`**: lista **idêntica** à do início — 21 `M` + 14 `??`, mesma ordem, mesmos
  caminhos. Nenhum `git stash`/`checkout`/`restore`/`reset`/`clean`/`commit` foi executado.
- **Sítios de mutação restaurados**, conferidos por grep linha a linha:
  `pricing.ts:174, 193, 215, 315, 460`; `handlers.ts:501, 574`; `CheckoutPage.tsx:401`.
- **Suíte completa depois de todas as mutações**: `npx turbo test --force` ⇒
  core 756 · functions 249 · backoffice 997 · store 836 = **2838 passed, 0 failed**.
- **Banco local**: as linhas de probe (`VERIFIER probe A/B/F`, `VERIFIER child`, `VERIFIER tmp cat`)
  foram apagadas; `promotions` voltou a **0** linhas, `categories?name=like.VERIFIER*` a `[]`.

---

## Diff Surface Coberta

Não há intervalo de commits. Superfície = 35 caminhos.

**Rastreados (`git diff HEAD`, 21)**: `.specs/BACKLOG.md` · `.specs/STATE.md` · `CLAUDE.md` ·
`apps/backoffice/src/app/App.tsx` · `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` +
`navItems.test.ts` · `apps/store/src/entities/order/api/useOrders.ts` +
`__tests__/useOrders.test.tsx` · `apps/store/src/features/checkout/model/useCheckoutTotals.ts` +
`__tests__/useCheckoutTotals.test.tsx` · `apps/store/src/features/checkout/ui/OrderSummary.tsx` +
`__tests__/OrderSummary.test.tsx` · `apps/store/src/pages/CheckoutPage.tsx` +
`__tests__/CheckoutPage.test.tsx` · `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` +
`__tests__/CartDrawer.test.tsx` · `packages/core/src/payment/pricing.ts` +
`__tests__/displayedEqualsCharged.test.ts` · `packages/supabase/src/types/index.ts` ·
`supabase/functions/mercado-pago/handlers.ts` + `__tests__/handlers.test.ts`

**Não rastreados (14)**: `supabase/migrations/20260803130000_promotions-progressive.sql` ·
`…130100_promotion-eligibility-and-order-columns.sql` · `…130200_promotion-write-rpcs.sql` ·
`packages/supabase/src/types/promotion.ts` · `packages/core/src/hooks/usePromotions.ts` +
`__tests__/usePromotions.test.ts` + `__tests__/usePromotionsAdmin.test.ts` ·
`packages/core/src/payment/__tests__/progressive.test.ts` ·
`apps/store/src/entities/cart/model/useCartPromotion.ts` +
`__tests__/useCartPromotion.test.ts` · `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx` +
`AdminPromotionsPage.test.tsx` · `apps/backoffice/src/features/promotion-form/**` (9 arquivos) ·
`.specs/features/17-promocoes-desconto-progressivo/**`

Todos lidos. Nenhum arquivo da superfície ficou sem inspeção.

---

## Ranked Gaps

### Gap 1 — BLOCKER: item com preço de variação produz 422 espúrio no pagamento

- **AC/critério**: edge case explícito da spec ("WHEN um item elegível tem preço por variação THEN a
  faixa SHALL incidir sobre o preço da **variação** resolvido por `resolveItemPrice`, não sobre
  `base_price`") + `PRM-12` + `PRM-16`.
- **Evidência (`file:line`)**:
  - `apps/store/src/features/checkout/model/useCheckoutTotals.ts:128` — `unit_price: item.product.price`
    (preço **base**). Pré-existente: `git show HEAD:…/useCheckoutTotals.ts:90` tem a mesma linha.
  - `apps/store/src/entities/cart/model/useCartPromotion.ts:151` — `unit_price: item.unitPrice`
    (preço **da variação**). Novo nesta feature.
  - `apps/store/src/entities/cart/model/cartStore.ts:121-123` — comentário do próprio projeto:
    *"Soma `unitPrice`, não `product.price`: com grade, os dois DIVERGEM"*.
  - `supabase/functions/mercado-pago/handlers.ts:377` — o servidor resolve por
    `resolveItemPrice(...)` com `price_source` congelado, ou seja, o **preço da variação**.
  - `apps/store/src/pages/CheckoutPage.tsx:401` — grava em `orders.promotion_discount` o
    `promotionDiscount` calculado a partir do preço **base**.
  - `supabase/functions/mercado-pago/handlers.ts:574` — a guarda compara o recalculado (variação)
    contra o gravado (base).
- **Consequência derivada dos códigos acima**: variação mais barata que o base (caso comum) ⇒ o
  desconto que a loja gravou é **maior** que o recalculado ⇒ `pricing.promotionDiscount <
  order.promotion_discount` ⇒ **422 `promotion_no_longer_valid` num pagamento legítimo**, e a
  cliente não consegue pagar por mais que recarregue. Variação mais cara ⇒ desconto exibido menor
  que o cobrado, sem 422, mas com "exibido ≠ cobrado" — exatamente o defeito que a feature existe
  para matar. Além disso a gaveta e o checkout passam a mostrar **descontos progressivos
  diferentes** para o mesmo carrinho.
- **Cobertura**: **zero**. Nenhum teste da feature põe `unitPrice ≠ product.price`:
  `useCheckoutTotals.test.tsx:150` usa `price: 8.9` **e** `unitPrice: 8.9` (a divergência fica
  invisível); `useCartPromotion.test.ts:58` faz `unitPrice: line.unitPrice ?? p.price` e nenhum caso
  passa o override. O edge case da spec não tem asserção em lugar nenhum.
- **A raiz é pré-existente** (feature 07 deixou `useCheckoutTotals` no `product.price`), mas a 17
  a tornou consequente ao introduzir a guarda de teto, e a spec da 17 listou o caso como AC. Não é
  "não regressão".
- **Fix sugerido**: `useCheckoutTotals.ts:128` passa a usar `item.unitPrice` (alinhando com
  `useCartPromotion` e com o servidor), mais um caso em `useCheckoutTotals.test.tsx` e um em
  `handlers.test.ts` com `price_source: 'variant'` e `variant.price ≠ base_price`, afirmando que os
  dois lados dão o **mesmo** `promotionDiscount` e que não há 422. Atenção: mexer nessa linha muda
  também `order_items.unit_price` (via `priced`, `CheckoutPage.tsx:323`) e o subtotal exibido — é
  correção de dinheiro, precisa de gate completo.

### Gap 2 — MINOR: `PRM-15` pede "o subtotal já descontado" na gaveta; a gaveta mostra o cheio

- **AC**: P1-C AC 1 — *"a gaveta SHALL exibir a linha `Desconto progressivo −R$ 21,50` **e o
  subtotal já descontado**"*.
- **Evidência**: `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx:220` exibe
  `formatPrice(subtotal)` — o `useCartStore.subtotal()` cheio. O teste **afirma** esse
  comportamento: `CartDrawer.test.tsx:224-229` ⇒ `Subtotal (3 itens)` = `R$ 26,70` (cheio),
  `Desconto progressivo` = `−R$ 11,70`, `Total` = `R$ 24,90`.
- **Contraste**: `OrderSummary.test.tsx:314` afirma o oposto para o checkout —
  `summary-subtotal` = `R$ 15,00` (**já descontado**). As duas superfícies leem a mesma regra e
  apresentam o subtotal de formas diferentes.
- Aritmeticamente o total está certo nas duas. É decisão de apresentação, não de dinheiro — mas a
  spec escolheu uma e a gaveta faz a outra, sem SPEC_DEVIATION registrado. Ou a gaveta passa a
  mostrar `totals.subtotal`, ou a AC é corrigida (nesse caso "cheio + linha de desconto" é a forma
  mais legível e a AC é que está errada).

### Gap 3 — MINOR: `displayedEqualsCharged.test.ts` não exercita `resolveOrderPricing`

- **Critério**: `PRM-16` ("exibido == cobrado ao centavo") e o Success Criteria #4.
- **Evidência**: `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts:66`
  (`storeTotals`) e `:82` (`serverTotals`) montam os dois caminhos **localmente**, chamando
  `calculateOrderTotals` + `resolveCouponDiscount` direto, e `:50` reimplementa `resolveChargedItems`
  (`chargedItems`). Nenhuma linha do arquivo importa `resolveOrderPricing` — que é a função que os
  dois lados de verdade chamam (`useCheckoutTotals.ts:143`, `handlers.ts:543`).
- **Provado empiricamente**: a mutação 4 do sensor (inverter a comparação promoção-vs-cupom em
  `pricing.ts:460`) derrubou **só** `progressive.test.ts`; `displayedEqualsCharged.test.ts` passou
  intacto. O arquivo que carrega o nome da invariante é cego à decisão central da feature.
- O par loja↔servidor está de fato provado — mas por **duas** asserções de constantes escritas à mão
  em arquivos diferentes (`useCheckoutTotals.test.tsx:152` ⇒ 15/11.7 e `handlers.test.ts:1428` ⇒
  `'15.00'`/11.7), ligadas por um comentário de referência cruzada
  (`useCheckoutTotals.test.tsx:121-126`). Se um lado mudar a fixture, o outro não cai.
- **Fix sugerido**: os helpers `storeTotals`/`serverTotals` passam a chamar `resolveOrderPricing`
  (é o que os dois lados fazem hoje), e a `Scenario` ganha `coupon` como `CouponRule` passado à
  função em vez de pré-resolvido. Assim o arquivo volta a ser sensor da invariante que nomeia.

### Gap 4 — INFO: o número literal do Success Criteria #2 não é afirmado ponta a ponta

- O critério pede R$ 23,00 nos quatro lugares (gaveta, CTA, `orders.total`, `total_amount` no MP)
  para 5 bottons. O par loja↔servidor foi provado com **outra** fixture (3 × R$ 8,90 ⇒ R$ 15,00);
  R$ 23,00 aparece isolado em `progressive.test.ts:487` e como subtotal em
  `displayedEqualsCharged.test.ts:248`. Equivalente, não idêntico. Sem consequência funcional —
  registrado para não ser lido como coberto ao pé da letra.

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
|---|---|---|
| PRM-01 … PRM-14 | Pending | ✅ Verified |
| PRM-15 | Pending | ⚠️ Verified com spec-precision gap (subtotal cheio na gaveta — gap 2) |
| PRM-16 | Pending | ⚠️ Verified com ressalva de forma da prova (gap 3) **e** furo de variação (gap 1) |
| PRM-17 … PRM-23 | Pending | ✅ Verified |
| PRM-24 | Pending | ✅ Verified com SPEC_DEVIATION aceita (`promotion_discount > 0`) |
| Edge case "preço por variação" | — | ❌ Needs Fix (gap 1) |

---

## Summary

**Overall**: ❌ **Not Ready** — pronto exceto o gap 1, que é caminho de dinheiro e bloqueia pagamento.

**Spec-anchored check**: 23/24 ACs batem o desfecho definido pela spec · 2 spec-precision gaps ·
1 SPEC_DEVIATION aceita · 1 edge case da spec não implementado.
**Sensor**: 8/8 mutações killed (0 survived).
**Gate**: 2838 passed · lint 30 err / 9 warn (baseline exata) · `tsc` 0/0.
**Tree integrity**: `git status --short` idêntico ao início; HEAD `5614bd2` intacto; suíte verde
depois das mutações.

**O que funciona bem**: a regra pura é o ponto forte — `resolveOrderPricing` como dono único da
decisão fez a superfície espelhada entre loja e servidor **encolher** em vez de crescer, e o sensor
confirmou que todas as sete decisões de dinheiro são discriminadas por teste. A guarda de teto
`PRM-12` é alcançável ponta a ponta (T24 fechou o buraco do plano). As migrations resistiram a probe
independente em todas as invariantes: atomicidade, vitrine única, RLS por papel, roll-up de
descendência, cascade de vínculo, `updated_at` por trigger. A decisão promoção-vs-cupom pelo **total
final** (e não pelo desconto) é a escolha certa e tem teste do caso que a justifica (cupom de frete
vencendo promoção que desconta mais dinheiro).

**Issues encontradas**:
1. **Gap 1 (Blocker)** — `useCheckoutTotals` calcula a faixa sobre `product.price` enquanto a gaveta
   e o servidor usam o preço da variação. Com a guarda nova, um item de grade em promoção gera 422
   espúrio. Corrigir `useCheckoutTotals.ts:128` e cobrir com teste em que `unitPrice ≠ product.price`.
2. **Gap 2 (Minor)** — a gaveta mostra o subtotal cheio onde `PRM-15` pede o descontado; o checkout
   mostra o descontado. Alinhar as duas ou corrigir a AC.
3. **Gap 3 (Minor)** — `displayedEqualsCharged.test.ts` não passa por `resolveOrderPricing`; fazer os
   dois helpers chamarem a função real.
4. **Gap 4 (Info)** — provar R$ 23,00 com a fixture de 5 bottons, para o Success Criteria #2 ficar
   afirmado ao pé da letra.

**Next steps**: gap 1 como fix task antes do commit de fecho (é dinheiro e é bloqueio de pagamento);
gaps 2–4 podem entrar no mesmo lote de correção. Depois, re-verificação dos itens tocados —
`useCheckoutTotals`, `CartDrawer`, `displayedEqualsCharged` — mais gate completo, já que gap 1 muda
`order_items.unit_price` e o subtotal exibido.

*(Fim da pass 1. O que segue é a re-verificação.)*

---
---

# Pass 2 — Re-verificação (iteração 2 de no máximo 3)

**Data**: 2026-08-03
**Verifier**: o mesmo sub-agente independente; nenhuma linha de produção escrita por ele.
**HEAD**: `5614bd2` (inalterado). A árvore segue sendo a única cópia da feature.
**Escopo**: os 4 gaps rankeados na pass 1, mais regressão do que já passava.

**Verdict da pass 2: ✅ PASS.** Os quatro gaps estão fechados, e — o que importa mais — **fechados de
forma discriminada**: reverter cada fix agora mata testes. Nenhum gap novo encontrado.

---

## Gate (medido nesta pass, `npx turbo test --force`)

| Métrica | Pass 1 | **Pass 2** | Delta | Baseline pré-feature |
|---|---|---|---|---|
| `@nanapin/core` | 756 | **759** | +3 | 645 |
| `@nanapin/store` | 836 | **841** | +5 | 789 |
| `@nanapin/backoffice` | 997 | **997** | 0 | 910 |
| `@nanapin/functions` | 249 | **251** | +2 | 232 |
| **Total** | 2838 | **2848** | **+10** | 2576 |
| Lint | 30 err / 9 warn | **30 err / 9 warn** (store 2/2 · bo 28/7) | 0 | 30 / 9 |
| `tsc` store / backoffice | 0 / 0 | **0 / 0** (exit 0 nos dois) | 0 | 0 / 0 |

Confere com o que o fix worker relatou. Nenhuma contagem caiu: os +3 de `core` são exatamente o
crescimento de `displayedEqualsCharged.test.ts` (16 → 19 casos), o que prova que o caso de 19,55 foi
**convertido no lugar** e não deletado.

### Uma falha intermitente, não identificada — registrada por honestidade

Na primeira execução completa desta pass, `@nanapin/store` reportou **1 failed / 840 passed**. Não
capturei o nome do teste (a saída estava filtrada por grep). Em **6 execuções forçadas subsequentes**
do mesmo workspace o resultado foi 841/841 limpo, sempre. Taxa observada: 1 em 7.

O ambiente documenta flakiness de timer do `input-otp` neste workspace, e essa é a hipótese mais
provável — **mas não a confirmei**, e não vou registrá-la como confirmada. Recomendação: rodar
`@nanapin/store` com a saída completa em arquivo algumas vezes para nomear o teste e, se for o
`input-otp`, estabilizá-lo com timers falsos. Não é bloqueio desta feature: nenhum dos 6 arquivos de
teste novos ou alterados falhou em nenhuma das 7 execuções.

---

## Estado de cada gap

### Gap 1 (era BLOCKER) — ✅ **FECHADO**

**O fix**: `apps/store/src/features/checkout/model/useCheckoutTotals.ts:149` passou de
`item.product.price` para `item.unitPrice`, com o porquê escrito nas linhas 139-148 (cita
`cartStore.ts:121`, `useCartPromotion.ts:151`, `handlers.ts:377` e o 422 de `handlers.ts:574`).
Os quatro lugares agora leem o mesmo preço por item. `bumpProduct.price` em `:155` continua sendo o
preço do produto — correto, porque o bump aponta para um `product_id` e nunca para uma variação
(`CheckoutPage.tsx:354`).

**Fix consequente, e necessário**: `apps/store/src/features/checkout/ui/OrderSummary.tsx:113` passou
de `item.product.price` para `item.unitPrice`. Sem isso as linhas de item deixariam de somar o
subtotal exibido — um resumo que não fecha é pior que o defeito original.

**Cobertura nova que DISTINGUE os dois preços** (a fixture antiga usava `price === unitPrice`, o que
tornava o campo errado indetectável):

| `file:line` | Asserção | O que prova |
|---|---|---|
| `useCheckoutTotals.test.tsx:234-241` | `subtotalBeforePromotion` 19.5 · `totals.subtotal` 15 · `promotionDiscount` **4.5** · `pricingItems` `[{unit_price: 6.5, quantity: 3}]` | O lado da loja incide sobre a variação (6,50), não sobre o base (8,90). Com o base seriam 11,70 |
| `useCheckoutTotals.test.tsx:244-253` | `totals.subtotal` 19.5 · `total` 19.5 · `promotionDiscount` 0 | O mesmo vale **sem** promoção — o defeito era do subtotal, não só da faixa |
| `handlers.test.ts:1571-1581` | cobra `'15.00'`, persiste `promotion_discount: 4.5`, **sem 422** | O lado do servidor recalcula 4,50 e o número que a loja grava **passa** pela guarda |
| `handlers.test.ts:1583-1596` | `promotion_discount: 11.7` ⇒ **422** + `fetchDouble.calls` `toHaveLength(0)` | O defeito **congelado**: o valor derivado do base ainda produz o 422, e o teste documenta que nenhum pedido chega mais assim |
| `useCartPromotion.test.ts:130-141` | `promotionDiscount` 4.5 · `subtotal` 15 · `applied` `[{…tier_min_qty: 3}]` | A gaveta concorda, na mesma fixture |
| `useCartPromotion.test.ts:210-219` | `nextTier` `{missing: 1, unitPrice: 3.9}` | O convite também parte da variação (40% de 6,50), não 5,34 do base |
| `OrderSummary.test.tsx:370-379` | `summary-subtotal` R$ 19,50 · `summary-promotion` −R$ 4,50 · `summary-total` R$ 15,00 | A tela renderiza os mesmos números |
| `CheckoutPage.test.tsx:860-861` | `payload.items[0].unit_price` **18.4** · `payload.subtotal` **18.4** | Ver a nota de escopo abaixo |

**Fixture do servidor conferida**: `handlers.test.ts:1429-1442` (`gradeItems`) tem `base_price: 8.9`
e `product_variants[0].price: 6.5` com `price_source: 'variant'` congelado — os dois preços
**divergem de propósito**, e o comentário em `:1426` diz exatamente isso. Sem essa divergência o teste
seria vácuo. O par loja↔servidor usa os mesmos números (6,50 / faixa 5,00 ⇒ 15,00 / desconto 4,50),
com referência cruzada escrita nos dois arquivos (`useCheckoutTotals.test.tsx:218-226` ↔
`handlers.test.ts:1561-1569`).

**Nota de escopo — o fix é mais largo que a promoção, e está certo assim.** As duas asserções em
`CheckoutPage.test.tsx:860-861` foram **acrescentadas** a um teste pré-existente que só verificava os
campos de snapshot da variação (`toMatchObject({variant_id, price_source, variant_label,
variant_options})`). Ele nunca afirmava `unit_price` — e é por isso que o defeito sobreviveu meses.
Consequência real: antes deste fix, um item de grade gravava o **base** em `order_items.unit_price` e
em `orders.subtotal`, e era esse número que o e-mail e o histórico do pedido mostravam (R$ 50,00 numa
linha de R$ 18,40). O fix corrige isso junto. É mudança de comportamento **fora** da promoção, e ela
é a correção certa (a gaveta já somava `unitPrice` desde sempre — `cartStore.ts:123` — e o servidor
sempre reprecificou pela variação), mas **precisa ser dita no commit de fecho**: pedidos de grade
passam a nascer com `subtotal` diferente do que nasciam ontem.

### Gap 2 (era MINOR) — ✅ **FECHADO**

O `OrderSummary` passou a exibir o subtotal **cheio** (`subtotalBeforePromotion`, novo campo do hook
em `useCheckoutTotals.ts:220`), depois a linha de desconto, depois o total descontado — a forma que a
gaveta já praticava. As duas superfícies agora coincidem em forma e em número.

**A AC foi corrigida, não contornada**: `spec.md` P1-C AC 1 foi reescrita com nota de correção datada,
e a razão é boa — o texto original ("a linha de desconto **e o subtotal já descontado**") é
autocontraditório: subtotal já líquido exibido ao lado de uma linha de desconto conta o desconto duas
vezes para quem lê. Emendar a AC é o desfecho correto aqui; o código estava mais certo que a spec.

**A mudança é de apresentação, não de dinheiro** — conferido asserção por asserção em
`OrderSummary.test.tsx`: `summary-subtotal` mudou de R$ 15,00 para R$ 26,70 (`:366`), e
`summary-total` continua **R$ 15,00** (`:367`), assim como nos casos de descartado (`:406` 15,00 ·
`:419` 6,70) e no de bump pré-existente (`:279-280` 112,45, intocado porque ali `promotionDiscount`
é 0). Nenhum total mudou.

`subtotalBeforePromotion = round2(totals.subtotal + promotionDiscount)` é reconstituição, não uma
segunda soma do carrinho — e tem de ser, porque `totals.subtotal` já inclui o bump e o carrinho não o
conhece (comentário em `:217-219`). Conferido nos dois ramos: quando o cupom vence,
`promotionDiscount` é 0 e a linha mostra o subtotal com bump; quando a promoção vence, devolve
exatamente `withoutPromotion`.

### Gap 3 (era MINOR) — ✅ **FECHADO, e provado empiricamente**

`displayedEqualsCharged.test.ts` agora importa **só** `resolveCouponDiscount` e `resolveOrderPricing`
(`:2-10`); o `chargedItems` local e os imports de `calculateOrderTotals`/`applyOrderBump`/
`applyProgressiveDiscount`/`perItemMin` desapareceram. Os dois espelhos (`storePricing:70`,
`serverPricing:90`) fazem a mesma chamada.

**Prova de que o arquivo deixou de ser cego** (mutação C do sensor desta pass): inverter
`pricing.ts:460` derruba agora **2 testes deste arquivo**, além dos 4 de `progressive.test.ts`. Na
pass 1 a mesma mutação passava por ele intacta. Foi exatamente para isso que o gap existia.

**Observação de forma, não gap**: os dois helpers ficaram byte-a-byte idênticos, então as asserções
`store.totals === server.totals`, `store.promotionDiscount === server.promotionDiscount`,
`store.winner === server.winner` e `store.applied === server.applied` (`:371-383`) passaram a ser
**tautológicas** — comparam uma função consigo mesma. O que carrega a discriminação são os pins de
valor (`:373` `toBe(total)`, `:384` `toBe(promotionDiscount)`, `:385` `toBe(winner)`), e esses são
reais. O arquivo mudou de natureza: antes provava "duas sequências parecidas concordam" (mirror real,
porém errado); agora prova "existe uma função só, e ela produz estes valores exatos". Isso é melhor,
e o próprio arquivo o declara em `:40-51` em vez de fingir o contrário. A assimetria que resta — a
montagem das **entradas**, carrinho vs `order_items` — é justamente onde o gap 1 vivia, e ela só é
pegável nos testes de cada lado, como o comentário em `:47-51` reconhece.

### Gap 4 (era INFO) — ✅ **FECHADO**

`displayedEqualsCharged.test.ts:253-271` acrescenta o Success Criteria #2 ao pé da letra: 5 × R$ 5,90
na faixa de 5 un a R$ 4,60 ⇒ `total: 23`, `promotionDiscount: 6.5`, `winner: 'promotion'`, afirmado
pelos dois lados do par. Aritmética conferida à mão: 5 × 5,90 = 29,50 cheio; 5 × 4,60 = 23,00;
29,50 − 23,00 = 6,50. ✅

---

## A mudança de expectativa dos 19,55 — auditada em detalhe

Pedido explícito do coordenador. **Veredito: a expectativa antiga estava ERRADA; foi corrigida, não
enfraquecida. Os 19,55 seguem afirmados, agora sob a precondição certa.**

**O que a versão da pass 1 afirmava**: caso `'progressivo + cupom percent 15% sobre o subtotal já
descontado · cartão'`, com `promotions: [KIT_5_A_460]` — e `KIT_5_A_460.stacks_with_coupon` é
**`false`** — esperando `total: 19.55`.

**Por que aquilo era inalcançável.** Os helpers antigos empilhavam **incondicionalmente**: passavam
`promotions` a `calculateOrderTotals` (aplicando a faixa) **e** `couponDiscount:
resolveCouponDiscount(round2(chargedSum(s)), s.coupon)` (aplicando o cupom sobre o subtotal já
descontado). `stacks_with_coupon` nunca era consultado, porque `resolveOrderPricing` nunca era
chamado. Daí 23,00 − 3,45 = 19,55.

O sistema real, para essa mesma fixture, calcula (`pricing.ts:433-462`):
- caminho promoção: subtotal 23,00 · total **23,00**
- caminho cupom: subtotal 29,50 · desconto `round2(29,50 × 0,15)` = 4,43 · total **25,07**
- `23,00 <= 25,07` ⇒ vence a promoção ⇒ **total 23,00**

Ou seja: 19,55 era um número que o sistema **nunca produz** para uma promoção que não acumula. O teste
afirmava o resultado empilhado de uma regra explicitamente marcada como não-empilhável — exatamente o
default que `AD-015` proíbe. Um teste que trava um comportamento proibido é pior que nenhum teste.

**O que a pass 2 tem** (`:287-307`): o mesmo cenário com `KIT_5_A_460_STACKS`
(`stacks_with_coupon: true`, `:134`), afirmando `total: 19.55`, `promotionDiscount: 6.5` e
`winner: 'both'`. Isso é `PRM-18` ao pé da letra ("o cupom SHALL incidir sobre o subtotal já
descontado"), e é o número que `CLAUDE.md` cita ao explicar por que empilhar não pode ser default.
Coincide com `progressive.test.ts:556-570`, que já afirmava subtotal 23 · cupom 3,45 · total 19,55 ·
`winner 'both'` para a variante que acumula.

**E o veredito não-empilhado passou a ser coberto nas duas direções**, o que antes não existia neste
arquivo: `:308-323` (promoção 23,00 vence cupom percent 10% de 26,55) e `:324-341` (cupom fixed 20 ⇒
9,50 vence a faixa de 23,00). É esse par que fez o arquivo sentir a inversão de `pricing.ts:460`.

**Saldo**: −1 asserção falsa, +3 asserções verdadeiras (23,00 do SC #2, e os dois lados do veredito
D2), e os 19,55 preservados com a precondição correta. Fortalecimento.

---

## Discrimination Sensor — pass 2

Ponderado no caminho **recém-coberto**, como pedido. Mutações no lugar com editor, revertidas
verbatim uma a uma; nenhum comando git.

| # | `file:line` | Mutação | Testes rodados | Killed? |
|---|---|---|---|---|
| **A** | `useCheckoutTotals.ts:149` | **Reverte o fix do gap 1**: `item.unitPrice` → `item.product.price` | `store/src/features/checkout` + `CheckoutPage.test.tsx` | ✅ **Killed** — 4 failed / 322 passed, em 3 arquivos: `OrderSummary` (variação), `useCheckoutTotals` (×2), `CheckoutPage` (`unit_price` da variação) |
| **B** | `useCheckoutTotals.ts:220` | **Reverte o fix do gap 2**: `round2(subtotal + promotionDiscount)` → `outcome.totals.subtotal` | `store/src/features/checkout` | ✅ **Killed** — 4 failed / 252 passed |
| **C** | `pricing.ts:460` | `resolveOrderPricing`: `<=` → `>` (vence o caminho mais caro) | `core/src/payment` | ✅ **Killed** — 6 failed: **2 em `displayedEqualsCharged.test.ts`** (na pass 1: zero) + 4 em `progressive.test.ts` |
| **D** | `pricing.ts:315` | `perItemMin` devolve o **maior** preço (descontos comporiam, `AD-015`) | `core/src/payment` | ✅ **Killed** — 15 failed (10 + 5) |
| **E** | `pricing.ts:215` | `tierUnitPrice` sem `Math.min` (faixa poderia aumentar preço, A10) | `core/src/payment` | ✅ **Killed** — 3 failed |
| **F** | `OrderSummary.tsx:113` | Linha de item volta a `item.product.price` | `store/src/features/checkout/ui` | ✅ **Killed** — 1 failed (o caso de variação) |
| **G** | `handlers.ts:574` | Guarda de teto: `<` → `>` (cobraria mais caro em vez de 422) | `@nanapin/functions` | ✅ **Killed** — 9 failed / 242 passed (pass 1: 8 — o teste novo do defeito congelado somou um) |

**Resultado: 7/7 killed, 0 survived.** As mutações A, B e F não existiam como alvo na pass 1 (o
código correto não estava lá); C provou a correção do gap 3; D, E e G confirmam que o que já passava
não regrediu.

---

## Verificações pontuais pedidas nesta pass

- **As duas superfícies concordam?** ✅ Sim, em forma e em número. Forma: as duas mostram subtotal
  cheio → linha `Desconto progressivo` → total descontado. Número: as duas montam `pricingItems` a
  partir de `item.unitPrice` (`useCartPromotion.ts:151`, `useCheckoutTotals.ts:149`) e chamam a mesma
  `resolveOrderPricing`; a fixture de variação afirma `promotionDiscount` **4.5** e subtotal cobrado
  **15** nas duas (`useCartPromotion.test.ts:137-139` ↔ `useCheckoutTotals.test.tsx:234-239`).
  Divergência remanescente, conhecida e documentada (`useCartPromotion.ts:135-137`): a gaveta calcula
  com `shipping: 0` porque não tem cotação, então um cupom `free_shipping` pode vencer no checkout e
  perder na gaveta. É deliberado — o veredito que a cliente paga é o do checkout — e não é gap.
- **A `PRM-15` emendada casa com o que o código renderiza?** ✅ Sim. Spec: subtotal cheio + linha de
  desconto + total descontado, "e o resumo do checkout SHALL usar a mesma forma". Código:
  `CartDrawer.tsx:220` (`formatPrice(subtotal)`, cheio) + linha em `:224-228` + total descontado;
  `OrderSummary.tsx:173` (`subtotalBeforePromotion`) + linha em `:191-199` + total descontado.
- **Gate por `turbo --force`, não `pnpm test`?** ✅ Sim, sete execuções forçadas ao todo.

---

## Tree Integrity — pass 2

- **HEAD**: `5614bd2cb82cb6ed94b58d0005fbe452b211d8be`, inalterado.
- **`git status --short`**: **35 entradas** no início e no fim desta pass — as mesmas 21 `M` + 14 `??`
  da pass 1. O fix worker alterou arquivos que já constavam da lista; **nenhum caminho novo**.
- **Adições autorizadas à lista de arquivos**: `.specs/lessons.json` e `.specs/LESSONS.md`, escritos
  pelo `scripts/lessons.py` da skill ao final desta pass, com autorização explícita do coordenador.
  São as **únicas** adições, e passam a lista de 35 para 37 entradas. `validation.md` não conta: mora
  dentro de `.specs/features/17-promocoes-desconto-progressivo/`, que já era `??`.
- **Nenhum** `git stash`/`checkout`/`restore`/`reset`/`clean`/`commit` executado em nenhuma das duas
  passes.
- **Sítios de mutação restaurados**, conferidos por grep: `pricing.ts:215, 315, 460` ·
  `useCheckoutTotals.ts:149, 220` · `OrderSummary.tsx:113` · `handlers.ts:574`.
- **Suíte completa depois das mutações**: core 759 · store 841 · backoffice 997 · functions 251 =
  **2848 passed**.

---

## Requirement Traceability — final

| Requirement | Pass 1 | **Final** |
|---|---|---|
| PRM-01 … PRM-14 | ✅ Verified | ✅ Verified |
| PRM-15 | ⚠️ spec-precision gap | ✅ **Verified** — AC emendada com nota; as duas superfícies alinhadas; fix discriminado (mutação B) |
| PRM-16 | ⚠️ ressalva de forma + furo de variação | ✅ **Verified** — variação coberta nos dois lados com a mesma fixture; `displayedEqualsCharged` agora passa por `resolveOrderPricing` (mutações A, C) |
| PRM-17 … PRM-23 | ✅ Verified | ✅ Verified |
| PRM-24 | ✅ Verified (SPEC_DEVIATION aceita) | ✅ Verified (SPEC_DEVIATION aceita) |
| Edge case "preço por variação" | ❌ Needs Fix | ✅ **Verified** — `useCheckoutTotals.test.tsx:227`, `handlers.test.ts:1571`, `useCartPromotion.test.ts:130`, `OrderSummary.test.tsx:370` |

**24/24 requirements verified.** 3 SPEC_DEVIATIONs documentadas e aceitas (`usePromotions.ts:377`
contagem por `promotion_discount > 0` · `AdminPromotionsPage.tsx:245` sem "Pausada em" ·
`20260803130200_promotion-write-rpcs.sql:45` duas statements em vez de uma). 1 AC emendada durante a
validação, com nota datada na spec (P1-C AC 1).

---

## Summary — final

**Overall**: ✅ **Ready.**

**Spec-anchored check**: 24/24 ACs batendo o desfecho da spec (era 23/24) · 0 spec-precision gaps
abertos (eram 2) · 3 SPEC_DEVIATIONs aceitas · 1 AC emendada com justificativa.
**Sensor**: pass 1 8/8 killed · pass 2 7/7 killed · **0 survived nas duas**.
**Gate**: 2848 passed · lint 30 err / 9 warn (baseline exata) · `tsc` 0/0.
**Tree integrity**: `git status --short` inalterado (35), mais as duas adições autorizadas do layer
de lições (37). HEAD `5614bd2`.

**O que ficou bom**: a feature acerta o que era mais difícil — um dono único para a decisão de preço
(`resolveOrderPricing`), com os dois chamadores reais convergindo nele, e agora com o arquivo que
carrega o nome da invariante de fato sensível a ela. O fix do gap 1 foi além do sintoma: alinhou os
**quatro** lugares que leem preço por item, o que corrigiu de passagem um defeito pré-existente em
`order_items.unit_price` que nenhum teste pegava. E a emenda da `PRM-15` é o desfecho maduro — a spec
estava errada e foi corrigida com nota, em vez de o código ser torcido para caber nela.

**O que fica pendente, sem bloquear**:
1. **Falha intermitente não identificada em `@nanapin/store`** (1 em 7 execuções). Nomear e
   estabilizar. Nenhum arquivo desta feature falhou em nenhuma execução.
2. **Comunicar no commit de fecho** que pedidos de item com grade passam a gravar
   `order_items.unit_price` e `orders.subtotal` pelo preço da variação — mudança correta, mas visível
   em e-mail e histórico.
3. As asserções tautológicas de `displayedEqualsCharged.test.ts:371-383` podem ser removidas em
   limpeza futura; os pins de valor ao lado delas é que fazem o trabalho.

**Next steps**: liberado para o commit único de fecho da feature (`CLAUDE.md` já atualizado com os
quatro eixos da sidebar). Atualizar as baselines de teste do `CLAUDE.md` para **core 759 · store 841 ·
backoffice 997 · functions 251 = 2848**, mantendo lint 30/9 e `tsc` 0/0.
