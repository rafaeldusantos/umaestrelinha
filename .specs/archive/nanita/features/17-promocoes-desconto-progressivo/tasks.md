# Promoções: desconto progressivo por quantidade — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow
and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth
for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> ### ⚠️ Override de projeto: commits
> A Critical Rule da skill diz **um commit atômico por task**. O `CLAUDE.md` deste projeto diz o contrário,
> e ele vence: *"não criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a
> conclusão e gerar os commits completos da implementação de uma vez"*.
> **Regra em vigor aqui (decidida em 2026-08-03):** **um único commit no fim da feature**. Nenhuma task
> commita, nenhuma fase commita, nenhum worker de lote commita — a árvore fica suja do T1 ao T23 e o
> orquestrador faz o commit depois do Verifier passar.
> O gate de teste por task **continua obrigatório**: o que muda é quando o `git commit` acontece, não
> quando o teste roda.
> **Consequência aceita:** sem checkpoint intermediário, não há `git revert` parcial — se a Phase 5
> quebrar algo da Phase 2, o desfazer é manual. O que segura a qualidade nesse arranjo é o gate por task
> mais o Verifier no fim, não o histórico.

---

**Design**: `.specs/features/17-promocoes-desconto-progressivo/design.md`
**Spec**: `.specs/features/17-promocoes-desconto-progressivo/spec.md`
**Status**: **Done** — 24/24 tasks + 4 fix tasks · Verifier **PASS** (2ª passada) · `validation.md` escrito

---

## Progresso

| Lote | Tasks | Status | Medido |
|---|---|---|---|
| 1 | T1–T7 (Phase 1 + 2) | ✅ **completo** — 2026-08-03 | core **702** (+57) · functions 232 · lint **30/9** · tsc **0/0** |
| 2a | T8–T9 (Phase 3) | ✅ **completo** — 2026-08-03, **inline** | functions **249** (+17) · lint 30/9 · tsc 0/0 |
| 2b | T10–T13 (Phase 4) | ✅ **completo** — 2026-08-03 | core **720** · store **823** · total **2702** · lint 30/9 · tsc 0/0 |
| 2c | **T24 (Phase 4b — nova)** | ✅ **completo** — 2026-08-03 (no lote 3) | store **829** (+6) |
| 3 | T14–T19 (Phase 5) | ✅ **completo** — 2026-08-03 | core **739** (+19) · backoffice **978** (+68) · store 829 · functions 249 · total **2795** · lint 30/9 · tsc 0/0 |
| 4 | T20–T23 (Phase 6) | ✅ **completo** — 2026-08-03 | core **756** (+17) · store **836** (+7) · backoffice **997** (+19) · functions 249 · total **2838** · lint 30/9 · tsc 0/0 |
| Verifier | independente, автоmático | ⬜ depois da T23 | — |

### Contratos confirmados no lote 4 (por probe)

8. **Pausar não toca pedido pago — provado, não argumentado.** Probe: promoção com 2 faixas e 1
   categoria + pedido `status='paid'`, `paid_at` preenchido, `promotion_discount = 11.70`; depois de
   `upsert_promotion { id, name, active: false }` a promoção fica `active = false`, as **2 faixas e a
   1 categoria seguem lá** (contrato 1 do lote 1 confirmado em uso real) e o pedido volta **idêntico
   campo a campo**, inclusive `updated_at`. `set_kit_showcase` não foi chamada em nenhum caminho novo.
9. **As RPCs recusam a service role.** `upsert_promotion` é `grant execute to authenticated`, e a
   service role **não é** `authenticated`: o probe com ela volta `42501 permission denied for function`.
   Probe de promoção entra com JWT do admin do seed (`admin@nanapin.dev` / `admin123`, via
   `/auth/v1/token?grant_type=password`) — anotado porque custou duas tentativas.
10. **A leitura dos cartões (PRM-24) existe e responde**: `orders?select=promotion_discount,order_items(quantity)&paid_at=gte.<30d>`
   devolve `promotion_discount` como número e `order_items` embutido (probe com dois pedidos pagos,
   um com desconto e um sem: soma 11,70 · 5 un com promoção · 2 un sem). Não há coluna de contagem de
   itens em `orders` — a média sai da soma de `order_items.quantity` por pedido.

### Contratos descobertos no lote 1 (vinculantes para os lotes seguintes)

1. **`upsert_promotion` trata chave ausente como "não mexer".** `tiers`/`category_ids` **presentes**
   substituem (inclusive vazio = limpar); **ausentes** preservam. Sem isso, a ação de pausar da T20
   (`{id, active:false}`) apagaria em silêncio todas as faixas e categorias. Provado por probe.
   **T14, T20 e T21 dependem deste contrato.**
2. **`resolveOrderPricing` recebe o frete cotado e zera ele mesmo** quando o cupom é `free_shipping`.
   A T13 tem de **remover** o `if (coupon?.freeShipping)` de `useCheckoutTotals`, senão o frete é
   zerado duas vezes.
3. **Falta o tipo de linha de `promotion_eligible_products`.** A T4 ficou nas quatro exportações que o
   design nomeia. T8 e T10 devem **acrescentá-lo** em `packages/supabase/src/types/promotion.ts` — ler
   a view como `any` custaria erro de lint contra a baseline.

### Contratos descobertos no lote 3 (vinculantes para o lote 4)

4. **`upsert_promotion` exige `name` em TODO payload, inclusive num patch parcial.** O corpo da RPC faz
   `name = payload->>'name'` **sem `coalesce`** e recusa nome vazio no topo. Logo, a ação de pausar da
   T20 precisa mandar `{ id, name, active: false }` — só `{ id, active: false }` volta com
   *"A promoção precisa de um nome"*. `useUpdatePromotion` já tipa `name` como obrigatório por isso.
5. **O editor NÃO chama `set_kit_showcase`.** `upsert_promotion` já desliga a vitrine anterior antes de
   escrever a linha (obrigatório: o índice único parcial recusaria o contrário). Provado por probe:
   duas gravações com `is_kit_showcase: true` deixam **exatamente uma** marcada. `useSetKitShowcase`
   segue sem consumidor de UI — é o caminho para trocar a vitrine **sem** abrir o editor (ação de linha
   da listagem, se a T20/T21 quiser).
6. **A prévia "Cliente paga" precisa de um preço de referência**, e ele é a **mediana** do `base_price`
   dos elegíveis (`useEligiblePreview`). `tierUnitPrice` é `min(cheio, faixa)`: sem o cheio, A10 não é
   aplicável e `% off` não tem sobre o quê incidir. Sem escopo escolhido a prévia mostra `—`, nunca um
   número inventado. Os totais do board (R$ 15/23/42) saem exatos; as porcentagens do board (−44/−48/
   −53) só saem com referência R$ 8,90 — com outro catálogo, outra porcentagem.
7. **O teste de ordem sidebar↔rotas agora LÊ `app/App.tsx` do disco** (`navItems.test.ts`, via
   `process.cwd()`), comparando a ordem textual das rotas `/admin/*` com `navGroups`. Antes era só
   convenção escrita em comentário. Mexer em grupo sem reordenar as rotas quebra ali.

### Correção de baseline (medida, não estimada)

`CLAUDE.md` e o Handoff do `STATE.md` dizem store **759** / backoffice **901**. A medição antes de
qualquer mudança do lote 1 deu store **789** / backoffice **910** — o commit `5614bd2` (barra de rodapé
da loja) entrou depois do fecho da 16 e trouxe testes. `core 645` e `functions 232` bateram.

| Métrica | Baseline **corrigida** |
|---|---|
| Testes | core **645** → agora 702 · store **789** · backoffice **910** · functions **232** |
| Lint | 30 err / 9 warn (confirmada) |
| `tsc` | store 0 · backoffice 0 (confirmada) |

`CLAUDE.md` é atualizado no commit de fecho da feature, não antes.

---

## Test Coverage Matrix

> Gerada do codebase + guidelines do projeto + spec — confirmar antes do Execute.
> **Guidelines encontradas**: `CLAUDE.md` (baselines de lint/tipo, "o gate é *sem erros novos*", tipo à mão
> não é verificação → probe HTTP), `.specs/STATE.md` (`AD-002`, `AD-004`, `AD-012`), `package.json` +
> `turbo.json` (comandos), e as suítes existentes de `packages/core/src/payment/__tests__/**` e
> `supabase/functions/mercado-pago/__tests__/handlers.test.ts` como piso de estilo e profundidade.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Domínio puro (`packages/core/src/payment/**`) | unit | **Todos os ramos; 1:1 com as ACs; toda edge case listada na spec.** Inclui propriedade "chamar duas vezes dá o mesmo" e "nunca aumenta preço" | `packages/core/src/payment/__tests__/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Hooks de dados (`packages/core/src/hooks/**`) | unit | Caminho de sucesso + erro + carregando; dublê do client Supabase | `packages/core/src/hooks/__tests__/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Edge function handler (`supabase/functions/mercado-pago/**`) | integration | Toda ação tocada: sucesso + cada edge case + caminho de erro (422). Deps injetadas por `Deps` (`AD-004`) | `supabase/functions/mercado-pago/__tests__/*.test.ts` | `pnpm --filter @nanapin/functions test` |
| Migration / view / RPC (`supabase/migrations/**`) | integration (**probe HTTP**) | `AD-012`: a prova de que grava é gravar. Probe contra o Supabase local exercitando escrita e leitura reais | sem arquivo de teste — evidência no `Done when` da task | `supabase db reset` + probe HTTP (PowerShell `Invoke-RestMethod`) |
| Componente/hook de admin (`apps/backoffice/src/**`) | unit | Toda AC da tela: estado vazio, carregando, erro de validação por campo, e o save chamando a mutação certa | `apps/backoffice/src/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Componente/hook de loja (`apps/store/src/**`) | unit | Toda AC da superfície: com desconto, sem desconto, e a frase do descartado | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Navegação (`navItems.ts` + `App.tsx`) | unit | O teste existente de ordem sidebar↔rotas, **atualizado** para o grupo novo — nunca removido | `apps/backoffice/src/**/__tests__/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Tipos / barrels (`packages/supabase/src/types/**`) | none | Gate de build apenas | — | `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |

## Gate Check Commands

> Geradas do codebase — confirmar antes do Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| **Quick** | Task com testes de um workspace só | `pnpm --filter <workspace> test` |
| **Full** | Task que atravessa workspaces (core + function, core + loja) | `pnpm test` |
| **Build** | Fecho de fase, e qualquer task de tipo/config | `pnpm test` · `pnpm lint` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |

**Baselines a comparar (de `CLAUDE.md` e do Handoff do `STATE.md`, fecho da 16):**

| Métrica | Baseline |
|---|---|
| Testes | core **645** · store **759** · functions **232** · backoffice **901** = **2537** |
| Lint | **30 err / 9 warn** (backoffice 28/7 · store 2/2) — gate é *sem erros novos* |
| `tsc --noEmit` | store **0** · backoffice **0** — **qualquer erro de tipo é novo** |

`pnpm build` **não** conta como prova de tipo: é `vite build` puro e o esbuild remove tipos sem checar.

## Ferramentas por fase (decidido em 2026-08-03)

| Fase | Skills | Notas de ambiente |
|---|---|---|
| Phase 1 (T1–T4) | `supabase` · `supabase-postgres-best-practices` | O **MCP do Supabase não está autenticado** nesta sessão: DDL e probes vão por CLI e HTTP, não por MCP. `supabase-postgres-best-practices` revisa a view recursiva e os índices **antes** de fechar a fase — ela roda no caminho do pagamento. |
| Phase 1 e Phase 5 (probes) | PowerShell `Invoke-RestMethod` | Exigência do `AD-012`. Contra `http://127.0.0.1:54321` com anon key **e** service role, provando leitura, escrita e o que a RLS recusa. Exige `supabase start` de pé — **se o banco não responder, é blocker, não é critério a marcar como feito**. |
| Phase 2–4 | NONE | Domínio puro e React: só vitest. |
| Phase 5 (T15–T19) | `playwright-cli` | Prova visual das telas de admin contra os boards `Promoções — listagem` e `Promoção — desconto progressivo (editor)`, com dados reais — o mesmo padrão da 16. |
| Phase 6 | NONE | — |

Nenhuma task usa MCP. `mcp__paper__*` fica disponível para reler medidas dos boards quando a tela divergir.

---

## Execution Plan

Fases ordenadas, sequenciais; tasks em ordem dentro da fase.

### Phase 1: Dado (banco e tipos)

```
T1 → T2 → T3 → T4
```

### Phase 2: A regra pura em core

```
T5 → T6 → T7
```

### Phase 3: O servidor cobra

```
T8 → T9
```

### Phase 4: A loja exibe

```
T10 → T11 → T12 → T13
```

### Phase 4b: O pedido registra o teto (task descoberta na execução)

```
T24
```

> **Por que ela não estava no plano.** O `design.md` grava `orders.promotion_id`/`promotion_discount`
> no `create-payment` e em nenhum outro lugar — mas a guarda de teto do `PRM-12` compara o recalculado
> contra o que a **loja gravou na criação do pedido**. Sem alguém escrevendo esse valor, a coluna fica
> no `default 0`, `pricing.promotionDiscount < 0` nunca é verdade, e a guarda existe morta. Achado
> pelo worker da Phase 4; a falha era do plano, não da execução.

### Phase 5: As telas do admin

```
T14 → T15 → T16 → T17 → T18 → T19
```

### Phase 6: P2 e P3

```
T20 → T21 → T22 → T23
```

---

## Task Breakdown

### T1: Migration — três tabelas, RLS e triggers

**What**: Cria `promotions`, `promotion_tiers` e `promotion_categories` com constraints, índices, RLS e os dois triggers (`updated_at` e validação de faixa).
**Where**: `supabase/migrations/20260803HHMMSS_promotions-progressive.sql`
**Depends on**: None
**Reuses**: `supabase/migrations/20260418113443_apply_coupons_schema.sql:178-232` (RLS com `has_role` + fallback, trigger de `updated_at`)
**Requirement**: PRM-03, PRM-06, PRM-07, e a base de PRM-05 (índice único parcial)

**Tools**: MCP: NONE (o MCP do Supabase não está autenticado nesta sessão) · Skill: `supabase`

**Done when**:
- [ ] As três tabelas existem com os `check` do design, incluindo `min_qty >= 2` e `unique (promotion_id, min_qty)`
- [ ] Índice único parcial `promotions_single_kit_showcase` recusa uma segunda vitrine (probe: dois `insert` com `is_kit_showcase = true` ⇒ o segundo falha)
- [ ] Trigger `validate_promotion_tier()` recusa `percent` fora de 1–90, com o motivo escrito em comentário na migration (`check` não alcança o `discount_kind` da tabela-mãe)
- [ ] RLS: leitura anônima devolve **só** promoção `active` e vigente; escrita anônima é recusada (probe com a anon key)
- [ ] `supabase db reset` roda limpo do zero
- [ ] Probe HTTP registrado no corpo da task (`AD-012`)

**Tests**: integration (probe HTTP) · **Gate**: build

---

### T2: Migration — view de elegibilidade e colunas espelho em `orders`

**What**: Cria a view recursiva `promotion_eligible_products` (`security_invoker = true`), as colunas `orders.promotion_id` / `orders.promotion_discount` e os índices de apoio.
**Where**: `supabase/migrations/20260803HHMMSS_promotion-eligibility-and-order-columns.sql`
**Depends on**: T1
**Reuses**: `20260801150000_categories-hierarchy-and-counts.sql` (view com `security_invoker`, `AD-012`); molde de coluna espelho de `coupon_id` em `orders`
**Requirement**: PRM-10, base de PRM-12

**Done when**:
- [ ] Probe: produto vinculado a uma **filha** de `Bottons`, com a promoção escopada em `Bottons`, **aparece** na view (roll-up por `parent_id`, A9)
- [ ] Probe: promoção sem nenhuma linha em `promotion_categories` devolve **zero** produtos (nunca "toda a loja")
- [ ] Probe: apagar a categoria vinculada remove o vínculo por `on delete cascade` e a promoção deixa de listar produtos
- [ ] `orders.promotion_discount` é `not null default 0`; `promotion_id` é `on delete set null` (apagar promoção não apaga histórico)
- [ ] Índices em `promotion_categories(category_id)` e conferência de que `product_categories(category_id)` já tem índice

**Tests**: integration (probe HTTP) · **Gate**: build

---

### T3: RPC de escrita atômica — `upsert_promotion` e `set_kit_showcase`

**What**: Duas funções SQL: uma grava promoção + faixas + categorias numa transação; a outra liga a vitrine desligando a anterior na mesma statement.
**Where**: `supabase/migrations/20260803HHMMSS_promotion-write-rpcs.sql`
**Depends on**: T2
**Reuses**: molde de `claim_order_email` / `increment_coupon_usage` (RPC `security definer` com `search_path` fixo e `revoke`/`grant` explícitos)
**Requirement**: PRM-02, PRM-05, PRM-08

**Done when**:
- [ ] `upsert_promotion(payload jsonb)` cria e atualiza, substituindo faixas e vínculos, **numa** transação
- [ ] Probe de falha: payload com faixa duplicada **não** deixa promoção meio-salva (nenhuma linha nova em nenhuma das três tabelas)
- [ ] `set_kit_showcase(id)` liga a nova e desliga a anterior na mesma statement; probe com duas promoções confirma exatamente uma marcada
- [ ] `revoke all from public` + `grant execute to authenticated`, e a RPC checa `has_role(auth.uid(),'admin')` internamente
- [ ] Probe HTTP de gravação registrado (`AD-012` — a prova de que grava é gravar)

**Tests**: integration (probe HTTP) · **Gate**: build

---

### T4: Tipos de domínio da promoção

**What**: `DbPromotion`, `DbPromotionTier`, `PromotionDiscountKind`, `PromotionScope`, exportados no barrel de types.
**Where**: `packages/supabase/src/types/promotion.ts` (+ `types/index.ts`)
**Depends on**: T3
**Reuses**: formato de `packages/supabase/src/types/coupon.ts`
**Requirement**: suporte a PRM-01…PRM-18

**Done when**:
- [ ] Tipos batem **coluna por coluna** com a migration da T1 (conferido contra o schema real, não contra memória — `AD-012`)
- [ ] `npx tsc --noEmit` nos dois apps segue em **0**

**Tests**: none (gate de build) · **Gate**: build

---

### T5: Resolução da faixa

**What**: `countEligibleUnits`, `resolveProgressiveTier` e `tierUnitPrice` — decidir qual faixa vale e que preço ela produz.
**Where**: `packages/core/src/payment/pricing.ts` (+ `__tests__/progressive.test.ts`)
**Depends on**: T4
**Reuses**: `round2` e o contrato de pureza de `applyOrderBump` (mesmo arquivo)
**Requirement**: PRM-08, A7, A10

**Done when**:
- [ ] Conta **unidades** (soma de `quantity`), não produtos distintos: 5 do mesmo produto alcança a faixa 5 (A7)
- [ ] Devolve a **maior** faixa com `min_qty ≤ n`; `null` quando nenhuma é alcançada
- [ ] Ordem das faixas na entrada é irrelevante (teste com lista fora de ordem)
- [ ] `unit_price`: nunca acima do preço cheio (A10 — botton de R$ 3,90 numa faixa de R$ 4,60 continua R$ 3,90)
- [ ] `percent`: `round2(cheio × (1 − pct/100))`, arredondando por item
- [ ] `scope: 'all'` ignora `eligibleProductIds`
- [ ] Gate: `pnpm --filter @nanapin/core test` · contagem de core ≥ **645 + novos**, sem deleção silenciosa

**Tests**: unit · **Gate**: quick

---

### T6: Aplicação do desconto e `perItemMin`

**What**: `applyProgressiveDiscount` (aplica a melhor faixa de cada promoção elegível) e `perItemMin` (por item vence o menor preço).
**Where**: `packages/core/src/payment/pricing.ts` (+ `__tests__/progressive.test.ts`)
**Depends on**: T5
**Reuses**: `applyOrderBump` como molde de pureza; `AD-015`
**Requirement**: PRM-09, PRM-14

**Done when**:
- [ ] Não muta a entrada; chamar duas vezes com o mesmo input dá o mesmo resultado
- [ ] Sem faixa alcançada ⇒ lista **inalterada**
- [ ] Sobreposição (D6): item elegível a duas promoções fica com o **menor** `unit_price`; empate resolve pelo `created_at` mais antigo
- [ ] `perItemMin` calcula bump e progressivo **a partir do preço cheio** e devolve o menor por índice — propriedade: **o resultado é o mesmo trocando a ordem dos argumentos** (`AD-015`)
- [ ] `applied[]` nomeia `promotion_id` + `tier_min_qty` de cada promoção que de fato alterou preço
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T7: `resolveOrderPricing` — promoção vs cupom, e a invariante estendida

**What**: `calculateOrderTotals` ganha `promotions?`; nasce `resolveOrderPricing` decidindo o menor total; `displayedEqualsCharged.test.ts` é estendido para os casos novos.
**Where**: `packages/core/src/payment/pricing.ts` (+ `__tests__/progressive.test.ts`, `__tests__/displayedEqualsCharged.test.ts`)
**Depends on**: T6
**Reuses**: `calculateOrderTotals`, `resolveCouponDiscount`, `displayedEqualsCharged.test.ts`
**Requirement**: PRM-16, PRM-17, PRM-18, `AD-015`

**Done when**:
- [ ] Assinatura de `calculateOrderTotals` **preservada** (`promotions` opcional): nenhum chamador atual muda de comportamento — provado por teste sem `promotions`
- [ ] Escolhe pelo **menor `totals.total`**, não pelo maior desconto; caso de cupom `free_shipping` vencendo uma promoção que desconta mais dinheiro tem teste
- [ ] Empate ⇒ promoção vence (não exige código digitado)
- [ ] `stacks_with_coupon = true` ⇒ um cálculo só, `winner = 'both'`
- [ ] `discarded` nomeia o descartado; `null` quando não houve escolha
- [ ] `displayedEqualsCharged` cobre: progressivo puro, progressivo + cupom, progressivo + bump no mesmo item
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T8: `create-payment` lê promoções e elegibilidade

**What**: Duas leituras novas (promoções vigentes com faixas; elegibilidade filtrada pelos produtos do pedido) montando `ProgressivePromotion[]`.
**Where**: `supabase/functions/mercado-pago/handlers.ts` (+ `__tests__/handlers.test.ts`)
**Depends on**: T7
**Reuses**: `Deps.supabase` (`AD-004`); o import relativo já existente de `payment/pricing.ts` — **nenhum arquivo novo no grafo do Deno**
**Requirement**: PRM-11

**Done when**:
- [ ] Filtra `active = true` e vigência cobrindo `now()` **no servidor**, nunca confiando no payload
- [ ] Elegibilidade vem da view, filtrada pelos `product_id` do pedido
- [ ] Promoção sem faixa alcançada não altera o total (teste com 2 unidades numa faixa que começa em 3)
- [ ] Zero promoção vigente ⇒ comportamento idêntico ao de hoje (teste de regressão do bump e do cupom)
- [ ] Gate: `pnpm --filter @nanapin/functions test` · contagem ≥ **232 + novos**

**Tests**: integration · **Gate**: quick

---

### T9: Guarda de teto, gravação no pedido e log

**What**: 422 `promotion_no_longer_valid` quando o recalculado seria **maior** que o exibido; gravação de `orders.promotion_id`/`promotion_discount` com os valores recalculados; log estruturado; roteiro manual de sandbox.
**Where**: `supabase/functions/mercado-pago/handlers.ts` (+ `__tests__/handlers.test.ts`)
**Depends on**: T8
**Reuses**: molde de guarda 422 de `missing_payer_cpf`; formato do `log()` e do roteiro manual em `handlers.ts:171`
**Requirement**: PRM-12, PRM-13

**Done when**:
- [ ] Recalculado **menor** que o registrado ⇒ **422**, corpo nomeando o motivo, e **nenhuma** order criada no MP (`orders.mp_order_id` continua `null`)
- [ ] Recalculado **igual ou maior** ⇒ cobra o recalculado, sem erro (promoção que melhorou deixa a cliente pagar menos)
- [ ] `orders.promotion_discount` gravado é sempre o **recalculado pelo servidor**, nunca o que veio do cliente (`PAY-03`)
- [ ] Teste de não-exploração: pedido com `promotion_discount` absurdamente alto ⇒ cobra o recalculado correto (não 422, não desconto forjado)
- [ ] `log()` inclui `promotion_id` e `tier_min_qty`
- [ ] Roteiro manual de sandbox acrescentado no comentário, no molde dos 6 cenários já documentados
- [ ] Gate: `pnpm test` (core + functions juntos)

**Tests**: integration · **Gate**: full

---

### T10: `useActivePromotions`

**What**: Hook que entrega as promoções vigentes já no formato `ProgressivePromotion`, com elegibilidade resolvida pela view.
**Where**: `packages/core/src/hooks/usePromotions.ts` (+ `__tests__/usePromotions.test.ts`)
**Depends on**: T7
**Reuses**: `useStoreSettings.ts:51` (`staleTime`, forma do hook); `useCoupons.ts` (formato de query)
**Requirement**: PRM-15 (dado), PRM-16

**Done when**:
- [ ] Uma leitura de `promotions` com `promotion_tiers` embutido + uma de `promotion_eligible_products`
- [ ] Erro ou carregando ⇒ devolve `[]` (a loja trata como "sem promoção": preço cheio, sem linha)
- [ ] `staleTime` igual ao de `useStoreSettings`, para o total não piscar entre renders
- [ ] **Nunca** usa `Product.category_links` (a lição do carrinho em `localStorage`)
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T11: `useCartPromotion`

**What**: Hook em `entities/cart` que aplica `resolveOrderPricing` sobre o carrinho e expõe o desconto e a próxima faixa.
**Where**: `apps/store/src/entities/cart/model/useCartPromotion.ts` (+ `__tests__/`)
**Depends on**: T10
**Reuses**: `resolveOrderPricing`, `useCartStore`, `useActivePromotions`
**Requirement**: PRM-15

**Done when**:
- [ ] Mora em `entities/cart` porque a gaveta é `widgets/` e o checkout é `features/` — camada abaixo das duas (mesmo raciocínio do `cartUiStore`)
- [ ] Devolve `promotionDiscount`, `applied[]`, `winner`, `discarded` e `nextTier` (`{ missing, unitPrice }` ou `null`)
- [ ] Carrinho vazio ⇒ desconto 0 e `nextTier` `null`
- [ ] Gate: `pnpm --filter @nanapin/store test` · contagem ≥ **759 + novos**

**Tests**: unit · **Gate**: quick

---

### T12: Linha de desconto na gaveta

**What**: A gaveta do carrinho exibe `Desconto progressivo −R$ X` e o subtotal já descontado.
**Where**: `apps/store/src/widgets/cart-drawer/**` (+ `__tests__/`)
**Depends on**: T11
**Reuses**: `useCartPromotion`; a estrutura de linhas de total que a gaveta já tem
**Requirement**: PRM-15

**Done when**:
- [ ] Com faixa alcançada, a linha aparece com o valor exato do hook
- [ ] Sem faixa alcançada, **nenhuma** linha aparece (a gaveta não anuncia desconto de R$ 0,00)
- [ ] Remover item que derruba a contagem abaixo da faixa recalcula e remove a linha no mesmo render
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit · **Gate**: quick

---

### T13: Checkout — total e a frase do descartado

**What**: `useCheckoutTotals` passa a chamar `resolveOrderPricing`; `OrderSummary` ganha a linha de desconto e a frase que nomeia o descartado.
**Where**: `apps/store/src/features/checkout/model/useCheckoutTotals.ts`, `features/checkout/ui/OrderSummary.tsx` (+ `__tests__/`)
**Depends on**: T12
**Reuses**: `resolveOrderPricing`; `useCheckoutTotals` como está (o comentário de espelhamento no topo é **atualizado**, não apagado)
**Requirement**: PRM-16, PRM-17, PRM-18

**Done when**:
- [ ] O valor do CTA é idêntico, ao centavo, ao que a T9 cobra para o mesmo pedido (teste com a mesma fixture nos dois lados)
- [ ] Cupom perdendo da promoção ⇒ frase nomeando o descartado ("Cupom BEMVINDA não foi aplicado — a promoção Kit de bottons desconta mais")
- [ ] `stacks_with_coupon` ⇒ duas linhas no resumo
- [ ] O comentário de espelhamento no topo do arquivo passa a apontar `resolveOrderPricing` como o ponto único
- [ ] Gate: `pnpm test`

**Tests**: unit · **Gate**: full

---

### T24: O pedido registra o desconto que a loja exibiu

**What**: `CreateOrderInput` ganha `promotion_id` e `promotion_discount`; o insert de `useCreateOrder` os grava; a `CheckoutPage` envia o que `useCheckoutTotals` já calculou.
**Where**: `apps/store/src/entities/order/api/useOrders.ts`, `apps/store/src/pages/CheckoutPage.tsx` (+ os testes dos dois)
**Depends on**: T13
**Reuses**: `useCheckoutTotals` (já devolve `promotionDiscount` e `applied`); a regra de `promotion_id` único do `handlers.ts` (null quando 0 ou mais de 1 promoção aplicou)
**Requirement**: PRM-12 — e o Success Criteria #3 da spec, que hoje só é provado no nível do handler

**Done when**:
- [ ] `CreateOrderInput` tem os dois campos e o `insert` os grava
- [ ] A `CheckoutPage` envia `promotionDiscount` e o `promotion_id` do `applied` **único** — `null` quando zero ou mais de um, **a mesma regra do servidor** (senão os dois discordam sobre qual campanha foi)
- [ ] Teste: pedido criado com promoção grava `promotion_discount > 0` no insert. **É este teste que torna a guarda do `handlers.ts` alcançável** — sem ele, `PRM-12` é código morto
- [ ] Teste: pedido sem promoção grava `0` e `null`
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit · **Gate**: quick

---

### T14: Hooks de CRUD de promoção

**What**: `useAdminPromotions`, `useCreatePromotion`, `useUpdatePromotion`, `useDeletePromotion`, `useSetKitShowcase` — gravando pelas RPCs da T3.
**Where**: `packages/core/src/hooks/usePromotions.ts` (+ `__tests__/`)
**Depends on**: T4, T10
**Reuses**: `useCoupons.ts` linha a linha, incluindo invalidação de query
**Requirement**: PRM-02, PRM-05, PRM-08

**Done when**:
- [ ] Gravação é **uma** chamada `upsert_promotion`, não três mutações encadeadas
- [ ] `useAdminPromotions` traz promoção pausada e expirada (o admin vê tudo; só o público é filtrado)
- [ ] Invalidação atinge tanto a query do admin quanto a de `useActivePromotions`
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit · **Gate**: quick

---

### T15: Listagem `/admin/promocoes`

**What**: A tela de listagem conforme o board `Promoções — listagem`: cabeçalho, tabela com as seis colunas, selo `vitrine do kit`, estados vazio e carregando.
**Where**: `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx` (+ `__tests__/`)
**Depends on**: T14
**Reuses**: `PageHeader`, `AdminTable`, `StatCard` de `shared/ui`; molde de `AdminCouponsPage`
**Requirement**: PRM-01

**Done when**:
- [ ] Colunas e resumo de faixas (`3 · 5 · 10 un` + `R$ 5,00 → R$ 4,20 /un`) como no board
- [ ] Ordenação por `created_at` desc
- [ ] Estado vazio com convite para criar; estado carregando sem layout shift
- [ ] Linha de promoção pausada em tom apagado, com o selo `Pausada`
- [ ] Gate: `pnpm --filter @nanapin/backoffice test` · contagem ≥ **901 + novos**

**Tests**: unit · **Gate**: quick

---

### T16: Dialog do editor — identidade e escopo

**What**: O dialog com nome, tipo (fixo em `progressive_qty`), e o seletor de escopo com chips de categoria e contagem de elegíveis.
**Where**: `apps/backoffice/src/features/promotion-form/**` (+ `__tests__/`)
**Depends on**: T15
**Reuses**: molde de dialog + `zodResolver` de `AdminCouponsPage.tsx:1-60`; `useCategories`
**Requirement**: PRM-02

**Done when**:
- [ ] Chips de categoria adicionam e removem; contagem de produtos elegíveis reflete a seleção (inclui subcategorias)
- [ ] Segmento **`Produtos`** renderizado **desabilitado** com rótulo "em breve" (A8) — a tela não promete o que a spec não cobre
- [ ] Escopo `Categorias` sem nenhuma categoria bloqueia o save com mensagem
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T17: Repetidor de faixas com prévia

**What**: As linhas de faixa (`a partir de` / valor / **cliente paga** calculado) com adicionar e remover, mais a validação `zod`.
**Where**: `apps/backoffice/src/features/promotion-form/**` (+ `__tests__/`)
**Depends on**: T16
**Reuses**: `useFieldArray` do react-hook-form; `formatPrice` de `@nanapin/core/formatters`; `tierUnitPrice` da T5 para a prévia — **a mesma função que o servidor usa**
**Requirement**: PRM-03, PRM-04

**Done when**:
- [ ] `min_qty < 2` ⇒ "A faixa precisa começar em 2 unidades ou mais", sem gravar
- [ ] `min_qty` duplicado ⇒ mensagem nomeando a quantidade, sem gravar
- [ ] `unit_price ≤ 0` ou `percent` fora de 1–90 ⇒ mensagem por campo
- [ ] "Cliente paga" vem de `tierUnitPrice`, não de conta reescrita na tela (senão a prévia mente)
- [ ] Alternar `Preço por unidade` ↔ `% off` recalcula a prévia das três faixas
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T18: Chaves, save e prova de gravação

**What**: Os switches (`Vitrine do kit`, `Acumula com cupom`, `Ativa`), a vigência, o wiring do save pela RPC, e o probe HTTP provando que a tela grava.
**Where**: `apps/backoffice/src/features/promotion-form/**` (+ `__tests__/`)
**Depends on**: T17
**Reuses**: `Switch` de `@nanapin/ui`; `useCreatePromotion`/`useUpdatePromotion`/`useSetKitShowcase` da T14
**Requirement**: PRM-05, PRM-08

**Done when**:
- [ ] Ligar `Vitrine do kit` numa segunda promoção desliga a primeira (via RPC), e a tela reflete
- [ ] Save falho não deixa a tela achando que salvou (nenhum fechamento otimista de dialog)
- [ ] **Probe HTTP** contra o Supabase local: criar a regra do kit **pela tela** e conferir as três tabelas (`AD-012` — o defeito do `PGRST204` só aparece no save)
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit + integration (probe) · **Gate**: build

---

### T19: Rota, grupo `Descontos` e o teste de ordem

**What**: Registra `/admin/promocoes`, move `Cupons` para o grupo novo `Descontos`, alinha a ordem das rotas em `App.tsx` e atualiza o teste que guarda o par — e o `CLAUDE.md`.
**Where**: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts`, `apps/backoffice/src/app/App.tsx`, o teste de ordem, `CLAUDE.md`
**Depends on**: T18
**Reuses**: o teste de ordem sidebar↔rotas existente — **atualizado, nunca removido**
**Requirement**: PRM-19, PRM-20

> **Nota de sequência**: `PRM-19`/`PRM-20` são P2 na spec, mas entram aqui porque registrar a rota dentro de
> `Vendas` para depois movê-la seria retrabalho puro — e o teste de ordem quebraria duas vezes.

**Done when**:
- [ ] Grupos na ordem: `Dashboard` · `Vendas` (Pedidos, Carrinhos abandonados, Clientes) · `Descontos` (Cupons, Promoções) · `Catálogo` · `Loja` · rodapé `Configurações`
- [ ] A sequência das rotas em `App.tsx` casa com `navGroups`, e o teste que guarda isso passa com o grupo novo
- [ ] `CLAUDE.md` passa a descrever **quatro** eixos, com a razão de `Cupons` ter saído de `Vendas`
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: build

---

### T20: Pausar pela listagem

**What**: Ação rápida de pausar/reativar na linha da tabela, com a prova de que pausar não altera pedido pago.
**Where**: `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx` (+ `__tests__/`)
**Depends on**: T19
**Reuses**: `useUpdatePromotion`
**Requirement**: PRM-21

**Done when**:
- [ ] Pausar para de aplicar em pedido novo e **não** mexe em pedido já pago (teste com `paid_at` preenchido)
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T21: Duplicar promoção

**What**: Ação de duplicar criando cópia inativa com faixas e categorias.
**Where**: `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx`, `packages/core/src/hooks/usePromotions.ts` (+ `__tests__/`)
**Depends on**: T20
**Reuses**: `upsert_promotion` (a cópia é um upsert com `id` novo)
**Requirement**: PRM-22

**Done when**:
- [ ] Cópia nasce `active = false`, `is_kit_showcase = false`, nome sufixado `(cópia)`
- [ ] Faixas e categorias vêm junto
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T22: Convite para a próxima faixa na gaveta

**What**: "Falta 1 para cada botton sair a R$ 4,20", vindo do `nextTier` que a T11 já calcula.
**Where**: `apps/store/src/widgets/cart-drawer/**` (+ `__tests__/`)
**Depends on**: T21
**Reuses**: `useCartPromotion().nextTier`
**Requirement**: PRM-23

**Done when**:
- [ ] Só aparece quando existe faixa acima da atual; some na última faixa
- [ ] `k` e o valor vêm da mesma função pura do desconto, não de conta na tela
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit · **Gate**: quick

---

### T23: Números da listagem

**What**: Os três cartões: promoções ativas, desconto concedido em 30 dias, itens por pedido com e sem promoção.
**Where**: `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx`, `packages/core/src/hooks/usePromotions.ts` (+ `__tests__/`)
**Depends on**: T22
**Reuses**: `StatCard`; `orders.promotion_discount` e `orders.promotion_id` da T2
**Requirement**: PRM-24

**Done when**:
- [ ] Desconto concedido soma `orders.promotion_discount` de pedidos **pagos** nos últimos 30 dias
- [ ] "Itens por pedido" compara pedidos com e sem `promotion_id`
- [ ] Zero pedidos ⇒ cartões mostram `—`, não `R$ 0,00` nem `NaN`
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit · **Gate**: quick

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 ──→ T6 ──→ T7
Phase 3:  T8 ──→ T9
Phase 4:  T10 ──→ T11 ──→ T12 ──→ T13
Phase 5:  T14 ──→ T15 ──→ T16 ──→ T17 ──→ T18 ──→ T19
Phase 6:  T20 ──→ T21 ──→ T22 ──→ T23
```

**Empacotamento previsto (~7 tasks por lote, corte só em fronteira de fase):**

| Lote | Fases | Tasks | Total |
|---|---|---|---|
| 1 | Phase 1 + Phase 2 | T1–T7 | 7 |
| 2 | Phase 3 + Phase 4 | T8–T13 | 6 |
| 3 | Phase 5 | T14–T19 | 6 |
| 4 | Phase 6 | T20–T23 | 4 |

23 tasks ⇒ **4 lotes**. Passa de um lote, então o Execute vai **oferecer** sub-agentes (offer-then-confirm).

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1 | 1 migration (3 tabelas coesas + RLS) | ✅ |
| T2 | 1 migration (view + colunas) | ✅ |
| T3 | 1 migration (2 RPCs de escrita, coesas) | ✅ |
| T4 | 1 arquivo de tipos | ✅ |
| T5 | 3 funções coesas, 1 arquivo | ✅ |
| T6 | 2 funções coesas, 1 arquivo | ✅ |
| T7 | 1 função nova + 1 assinatura estendida | ✅ |
| T8 | 1 handler (leituras) | ✅ |
| T9 | 1 handler (guarda + gravação + log) | ✅ |
| T10 | 1 hook | ✅ |
| T11 | 1 hook | ✅ |
| T12 | 1 widget | ✅ |
| T13 | 1 hook + 1 componente do mesmo fluxo | ✅ |
| T14 | 5 hooks irmãos, 1 arquivo, 1 molde | ✅ |
| T15 | 1 página | ✅ |
| T16 | 1 slice de feature (dialog + escopo) | ✅ |
| T17 | 1 sub-componente (repetidor) | ✅ |
| T18 | 1 sub-componente (chaves + save) | ✅ |
| T19 | 1 mudança de navegação (3 arquivos acoplados por um teste) | ✅ |
| T20–T23 | 1 ação/1 bloco cada | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
|---|---|---|---|
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 (Phase 1 → Phase 2) | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 (Phase 2 → Phase 3) | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T7 | Phase 2 → Phase 4 (fase anterior; dependência aponta para trás) | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T4, T10 | Phase 1 e Phase 4 → Phase 5 (ambas anteriores) | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | Phase 5 → Phase 6 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada tocada | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | Migration | integration (probe HTTP) | integration (probe) | ✅ |
| T2 | Migration + view | integration (probe HTTP) | integration (probe) | ✅ |
| T3 | RPC | integration (probe HTTP) | integration (probe) | ✅ |
| T4 | Tipos | none (build gate) | none | ✅ |
| T5 | Domínio puro | unit | unit | ✅ |
| T6 | Domínio puro | unit | unit | ✅ |
| T7 | Domínio puro | unit | unit | ✅ |
| T8 | Edge handler | integration | integration | ✅ |
| T9 | Edge handler | integration | integration | ✅ |
| T10 | Hook de dados | unit | unit | ✅ |
| T11 | Hook de loja | unit | unit | ✅ |
| T12 | Componente de loja | unit | unit | ✅ |
| T13 | Hook + componente de loja | unit | unit | ✅ |
| T14 | Hook de dados | unit | unit | ✅ |
| T15 | Componente de admin | unit | unit | ✅ |
| T16 | Componente de admin | unit | unit | ✅ |
| T17 | Componente de admin | unit | unit | ✅ |
| T18 | Componente de admin + escrita real | unit + integration | unit + integration | ✅ |
| T19 | Navegação | unit | unit | ✅ |
| T20 | Componente de admin | unit | unit | ✅ |
| T21 | Componente + hook | unit | unit | ✅ |
| T22 | Componente de loja | unit | unit | ✅ |
| T23 | Componente + hook | unit | unit | ✅ |

Nenhuma task com `Tests: none` por deferimento — o único `none` é a camada de tipos, que a matriz define como gate de build.
