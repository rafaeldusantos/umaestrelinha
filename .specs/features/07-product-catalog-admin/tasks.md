# Product Catalog — Fundação e Caminho do Dinheiro — Tasks

> **Feature 1 de 4** (`AD-009`). É **pré-condição** de
> [`11-product-form-v2`](../11-product-form-v2/tasks.md),
> [`12-product-media-studio`](../12-product-media-studio/tasks.md) e
> [`13-product-bulk-ops`](../13-product-bulk-ops/tasks.md) — nenhuma delas começa antes da Fase 4 daqui
> estar fechada.
>
> **Numeração global preservada.** Os números `T1`–`T42` são os da spec original e foram distribuídos
> entre as quatro features **sem renumerar**, para que o fatiamento seja conferível: cada número aparece
> exatamente uma vez no programa. Consequência: os números **não são contíguos** dentro de uma feature.
> Aqui ficam **T1–T20 + T27**.

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tarefas com a Skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo Execute e as
Critical Rules dela.** Não procure os arquivos da Skill por caminho de filesystem. A Skill é a fonte de
verdade do fluxo completo (ciclo por task, delegação a sub-agentes, Verifier, sensor de discriminação).

**Se a Skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

> **Convenção do projeto (`CLAUDE.md`):** **não** criar commits atômicos em pequenos pedaços durante a
> implementação. Aguardar a conclusão e gerar os commits completos de uma vez. Isso **sobrepõe** o
> comportamento padrão de commit-por-task da Skill. Os `Commit:` de cada task abaixo são a **mensagem
> planejada** para o commit final agrupado por fase.

---

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Contexto**: [`context.md`](./context.md)
**Status**: **CONCLUÍDA** — 21/21 tasks (Fases 1-4). Verificação em [`validation.md`](./validation.md): PASS
**Total**: **21 tasks em 4 fases** (T1–T20 + T27)

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes do Execute.
> **Diretrizes encontradas:** `CLAUDE.md` (convenções, FSD, estado conhecido de lint), `turbo.json`,
> `package.json` raiz, `apps/*/vitest.config.ts`, `packages/core/vitest.config.ts`.
> Nenhum threshold de cobertura configurado → **defaults fortes aplicados** para lógica de domínio.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio puro em `packages/core` (`pricing`, `formatters`, `media`) | unit | Todas as branches; 1:1 com as ACs da spec; **toda** edge case listada tem teste | `packages/core/src/**/__tests__/*.test.ts` ou co-locado `*.test.ts` | `pnpm --filter @nanapin/core test` |
| Componentes de UI do backoffice — aqui **só** os 3 inputs mascarados (`MoneyInput`, `WeightInput`, `DimensionInput`, T27) | unit (RTL) | Comportamento observável das ACs: render, digitação, colagem, estados de erro. **Não** snapshot | co-locado `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Lógica e telas da loja (`cartStore`, `ProductPage`, `CheckoutPage`) | unit (RTL) | Happy path + toda edge case listada + caminhos de erro | `apps/store/src/**/__tests__/*.test.{ts,tsx}` | `pnpm --filter @nanapin/store test` |
| Edge function `mercado-pago` | unit em `@nanapin/functions` **+** regra pura em `packages/core` | A lógica vive em `handlers.ts` com deps injetadas e é testada no workspace `@nanapin/functions` (`AD-004`); a aritmética de preço vive em `packages/core/src/payment/*` e **é** a que roda no servidor | `supabase/functions/**/__tests__/*.test.ts` · `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @nanapin/functions test` · `pnpm --filter @nanapin/core test` |
| Migrations SQL / RPC | none (gate manual) | Sem runner de SQL no projeto. Verificação: `supabase db reset` + queries de conferência declaradas na task | — | gate manual + `pnpm build` |
| Tipos, barrels, config, rotas | none | Build gate apenas | — | `pnpm build` |

**Baseline conhecida (`CLAUDE.md` § Estado conhecido):** `pnpm lint` já falha com **41 erros / 16 warnings**
pré-existentes (`no-explicit-any` em `entities/*/api/useAdmin*`). O gate é **"sem erros novos"**, não
"lint limpo". Fronteiras FSD em `warn`.

## Gate Check Commands

> Gerados do codebase — confirmar antes do Execute.

| Gate Level | Quando usar | Comando |
| ---------- | ----------- | ------- |
| **quick-core** | Tasks que só tocam `packages/core` | `pnpm --filter @nanapin/core test` |
| **quick-bo** | Tasks que só tocam `apps/backoffice` | `pnpm --filter @nanapin/backoffice test` |
| **quick-store** | Tasks que só tocam `apps/store` | `pnpm --filter @nanapin/store test` |
| **quick-fn** | Tasks que só tocam `supabase/functions/**` | `pnpm --filter @nanapin/functions test` |
| **full** | Tasks que cruzam workspaces | `pnpm test` |
| **build** | Fim de fase, tasks de tipo/config/rota, migrations | `pnpm build && pnpm test && pnpm lint` (lint comparado à baseline 41/16) |
| **sql** | Migrations | `pnpm supabase db reset --no-seed` **+** `docker exec -i supabase_db_nanapin-store psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/seed.sql` + as queries de conferência da task |

> **Por que o gate SQL tem dois passos e não é só `supabase db reset`.** O `seed.sql` cria
> `_pal` como **`CREATE TEMP TABLE`** ([`seed.sql:59`](../../../supabase/seed.sql)) e usa a função
> `pg_temp.nana_marker`. O CLI envia o seed em **lotes**, e objetos de sessão (`TEMP` / `pg_temp`)
> não sobrevivem entre lotes — `db reset` morre com
> `failed to send batch: ERROR: relation "_pal" does not exist`. Aplicado numa **sessão única** via
> `psql`, o mesmo arquivo roda limpo (exit 0, 8 categorias / 32 produtos / 10 variações legadas).
>
> É condição **pré-existente**, não regressão desta feature — mas invalida o "rodar `supabase db reset`"
> escrito no Independent Test da P1.1. Use os dois passos. Registrado em
> [`docs/qa/bugs/BUG-20260801-seed-temp-table-quebra-db-reset.md`](../../../docs/qa/bugs/BUG-20260801-seed-temp-table-quebra-db-reset.md).
>
> **Baseline do seed (medida em 2026-08-01, antes de qualquer migration desta feature):**
> `categories = 8` · `products = 32` · `product_variants = 10` · produtos com `variants` JSONB
> não-vazio = **0**. Ou seja: o backfill de `P1.1 AC 2` não tem dados no seed; quem tem dados é o
> `AC 3` (as 10 linhas legadas). Confere com a A15.

---

## Execution Plan

Fases sequenciais. A ordem é o guarda-corpo da spec: nada que precifique por variação chega à loja
antes de o caixa entender variação.

### Fase 1 — Schema e tipos (6 tasks)
```
T1 → T2 → T3 → T4 → T5 → T6
```

### Fase 2 — Núcleo puro e primitivos compartilhados (5 tasks)
```
T7 → T8 → T9 → T10 → T27
```
`T27` entra aqui por `AD-010`: os 3 inputs mascarados só dependem de `T8` e são consumidos pela `11`
**e** pela `13`. Mantidos na `11`, fariam a `13` esperar uma task no meio do formulário.

### Fase 3 — Caminho do dinheiro (6 tasks)
```
T11 → T12 → T13 → T14 → T15 → T16
```

### Fase 4 — Loja: imagens, eixos, categorias e redirect (4 tasks)
```
T17 → T18 → T19 → T20
```

---

## Saída desta feature — o que as outras três destravam

| Ao fim da fase | Destrava |
| -------------- | -------- |
| **2** (T27) | Nada ainda — mas `T27`, `T8`, `T9` e `T10` são as dependências que `11` e `13` importam |
| **4** (completa) | [`11-product-form-v2`](../11-product-form-v2/tasks.md) e [`13-product-bulk-ops`](../13-product-bulk-ops/tasks.md), que rodam **em paralelo**. A [`12`](../12-product-media-studio/tasks.md) espera a `11` (precisa do esqueleto de 5 abas, T21) |

**Contrato de saída** — o que as outras features assumem como pronto e não re-verificam:
`product_variants` estendida e populada · `products.options` / `stock_policy` / `production_lead_days` ·
`products.images` em `jsonb` com os 12 leitores migrados · `product_categories` e `product_redirects`
com RLS · tipos de `@nanapin/supabase` alinhados · `@nanapin/core` com `media`, `formatters` e `pricing` ·
`MoneyInput` / `WeightInput` / `DimensionInput` em `shared/ui`.

---

## Task Breakdown

### Fase 1 — Schema e tipos

#### T1: Migration — estender `product_variants` e `products`

**What**: Uma migration que faz `ALTER` em `product_variants` (`option_values`, `price`, `compare_price`,
`weight_kg`, `image_url`, `is_active`, `position` + índice `(product_id, position)`) e em `products`
(`options`, `stock_policy` com CHECK, `production_lead_days`).
**Where**: `supabase/migrations/<ts>_01-product-variants-pricing.sql`
**Depends on**: None
**Reuses**: padrão `ADD COLUMN IF NOT EXISTS` de `20260726000000_products_extended_fields.sql`
**Requirement**: VAR-01 (AC 1), VAR-02, VAR-03, VAR-10

**Tools**: MCP: NONE (supabase MCP não autenticado nesta sessão) · Skill: NONE

**Done when**:
- [ ] `product_variants` tem as 7 colunas novas; `name`, `sku`, `stock`, `price_override` preservados
- [ ] `products` tem `options`, `stock_policy` (CHECK `track|backorder|none`), `production_lead_days`
- [ ] `supabase db reset` roda sem erro
- [ ] Query de conferência: `select column_name from information_schema.columns where table_name='product_variants'` lista as novas

**Tests**: none · **Gate**: sql
**Commit**: `feat(db): estende product_variants e products para preço por variação`

---

#### T2: Migration — backfill das variações, pausadas e sem preço

**What**: Copiar `products.variants` (JSONB) para `product_variants` com
`option_values = {Tamanho, Acabamento}`, `price = null`, `is_active = false`; e normalizar as linhas
legadas (`option_values = {}`, `price = null`, `is_active = false`, `id` preservado). `price_override`
**não** é interpretado. Emitir `RAISE NOTICE` com a contagem de pausadas.
**Where**: `supabase/migrations/<ts>_02-backfill-variants.sql`
**Depends on**: T1
**Reuses**: —
**Requirement**: VAR-01 (AC 2, 3, 4)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Toda entrada de `products.variants` tem linha correspondente em `product_variants`
- [ ] **Nenhuma** linha migrada tem `is_active = true` ou `price` não nulo
- [ ] Todo `order_items.variant_id` existente continua resolvendo (query: `select count(*) from order_items oi left join product_variants v on v.id = oi.variant_id where oi.variant_id is not null and v.id is null` = 0)
- [ ] O `NOTICE` reporta a contagem
- [ ] `products.variants` **não** é removido nesta task

**Tests**: none · **Gate**: sql
**Commit**: `feat(db): backfill de product_variants a partir do JSONB, pausado e sem preço`

> **Achado na execução (2026-08-01) — o `db reset` não exercita esta task, e não pode.**
> `supabase db reset` aplica as migrations numa base **vazia** e só depois roda o `seed.sql`. Logo:
>
> 1. O backfill roda com **0 linhas** em ambas as origens — `NOTICE` confirma `0 (legadas: 0, JSONB: 0)`.
>    A lógica do JSONB foi provada por **teste sintético em transação com `rollback`**: 3 entradas
>    (completa · só `size` · com SKU colidindo) produziram `option_values` correto, `price = NULL`,
>    `is_active = false`, e a terceira **perdeu o SKU em vez de abortar o lote**.
> 2. As 10 variações legadas que o **seed** cria nascem **depois** da migration e portanto pegam o
>    `DEFAULT true` de `is_active` (T1). Estado pós-reset: `10 ativas · 0 com preço · 5 produtos com
>    variação ativa e `options` vazio`.
>
> **Isto não é defeito da migration.** Em base real (produção/staging) as legadas existem *antes* e são
> normalizadas — que é o que a AC 3 descreve. No `db reset`, o seed é fixture nova, não dado legado.
> O estado resultante é exatamente o que `PST-10` trata em runtime (fase 3): variação ativa com
> `options` vazio ⇒ produto tratado como sem variação.
>
> **RESOLVIDA em 2026-08-01, opção (b).** O usuário confirmou que **nada está em produção**, o que
> tira o risco de migração da mesa e torna o seed o *único* dado que existe. Ele foi reescrito com
> grade real: 5 produtos com `options` (3 tamanhos × 2 acabamentos), preço **crescente com o
> tamanho** (5,90 → 7,90 → 9,40), `compare_price` só no acabamento Brilhante, uma linha **pausada**
> por produto, e as três políticas de estoque representadas (`track` 30, `none` 1, `backorder` 1).
>
> Preço uniforme não serviria: não distinguiria "cobrou pela variação" de "cobrou pelo `base_price`",
> que é justamente o que a Fase 3 precisa provar.
>
> Estado pós-seed: **30 variações · 25 ativas · 5 pausadas · 0 ativas sem preço** · 5 produtos com
> grade e 27 sem — os dois caminhos de precificação existem no fixture.

---

#### T3: Migration — `products.images` para `jsonb`

**What**: Converter `products.images` de `text[]` para `jsonb`, cada URL virando
`{"url":…, "alt":null, "source":"upload"}`.
**Where**: `supabase/migrations/<ts>_03-product-images-jsonb.sql`
**Depends on**: T1
**Reuses**: —
**Requirement**: VAR-04

**Tests**: none · **Gate**: sql
**Done when**:
- [ ] `images` é `jsonb`; todo elemento tem `url`, `alt`, `source`
- [ ] Produto sem imagem fica com `'[]'::jsonb`, nunca `null`
- [ ] Query: `select count(*) from products where jsonb_typeof(images) <> 'array'` = 0

**Commit**: `feat(db): products.images vira jsonb com alt e origem`

---

#### T4: Migration — `product_categories`, `product_redirects` e colunas de `order_items`

**What**: Criar `product_categories` (PK composta + backfill de `category_id`), `product_redirects`, e
adicionar `price_source` (DEFAULT `'base'` + CHECK), `variant_label`, `variant_options` em `order_items`.
**Where**: `supabase/migrations/<ts>_04-categories-redirects-order-items.sql`
**Depends on**: T1
**Reuses**: —
**Requirement**: VAR-05, VAR-06, VAR-09

**Tests**: none · **Gate**: sql
**Done when**:
- [ ] `product_categories` existe com backfill: todo produto com `category_id` tem uma linha `position = 0`
- [ ] `product_redirects` existe com FK `ON DELETE CASCADE`
- [ ] **Todo** `order_items` existente tem `price_source = 'base'` (query de contagem)
- [ ] `products.category_id` permanece (legado)

**Commit**: `feat(db): product_categories, product_redirects e price_source em order_items`

---

#### T5: Migration — RLS escopada e trigger de `base_price`

**What**: Trocar a policy `public read variants` (`USING (true)`) por escopo em produto ativo; criar as
policies de `product_categories` e `product_redirects` (leitura pública, escrita `has_role admin`); criar
`sync_product_base_price()` + trigger em `product_variants`.
**Where**: `supabase/migrations/<ts>_05-rls-and-base-price-trigger.sql`
**Depends on**: T4
**Reuses**: padrão de RLS escopada de `mockup_templates` (decisão de 2026-07-18)
**Requirement**: VAR-07, VAR-12

**Tests**: none · **Gate**: sql
**Done when**:
- [ ] `SELECT` anônimo em `product_variants` não retorna linhas de produto inativo
- [ ] `INSERT` anônimo em `product_categories`/`product_redirects` é negado
- [ ] Ativar uma variação com `price = 10` e outra com `20` deixa `products.base_price = 10`
- [ ] Sem variação ativa com preço, `base_price` **não** vira 0 (mantém o valor anterior)

**Commit**: `feat(db): RLS escopada nas tabelas de produto e trigger de base_price`

---

#### T6: Tipos de domínio em `@nanapin/supabase`

**What**: Atualizar `ProductVariant` (formato novo), adicionar `ProductOption`, `ProductImage`,
`StockPolicy`, `OptionValues`, `ImageSource`; `DbProduct.images: ProductImage[]`, `options`,
`stock_policy`, `production_lead_days`, `category_ids`; marcar `sizes`/`finishes`/`variants`(JSONB) como
`@deprecated`.
**Where**: `packages/supabase/src/types/index.ts`
**Depends on**: T1, T3, T4
**Reuses**: interfaces existentes do arquivo
**Requirement**: VAR-08

**Tests**: none · **Gate**: build
**Done when**:
- [ ] Tipos compilam; `pnpm build` verde nos dois apps
- [ ] Erros de tipo resultantes ficam **visíveis** (não silenciados com `any`) — são o mapa dos leitores que T7/T10 migram

**Commit**: `feat(types): modelo de variação, opções, imagens e política de estoque`

---

### Fase 2 — Núcleo puro em `@nanapin/core`

#### T7: `@nanapin/core/media` — `normalizeImages`

**What**: Helper puro que aceita `string[]` **ou** `ProductImage[]` (ou lixo) e devolve sempre
`ProductImage[]`; mais `primaryImage`.
**Where**: `packages/core/src/media/index.ts` + `media/index.test.ts`; export `./media` no `package.json`
**Depends on**: T6
**Reuses**: tipos de `@nanapin/supabase/types`
**Requirement**: VAR-11 (AC 1, 3)

**Tests**: unit · **Gate**: quick-core
**Done when**:
- [ ] `normalizeImages(['a.webp'])` → `[{url:'a.webp', alt:null, source:'upload'}]`
- [ ] `normalizeImages([{url,alt,source}])` devolve idêntico
- [ ] `normalizeImages(null)`, `(undefined)`, `('')`, `([{}])` → `[]` (sem throw)
- [ ] `primaryImage([])` → `null`
- [ ] Test count: ≥ 8 testes passam

**Commit**: `feat(core): normalizeImages tolerante a string[] e jsonb`

---

#### T8: `@nanapin/core/formatters` — máscaras BRL, gramas, cm, %

**What**: Transformar `formatters.ts` em diretório (`index.ts`, `currency.ts`, `units.ts`) preservando o
export `@nanapin/core/formatters` e `formatPrice` sem mudança de assinatura; adicionar `parseBRL`,
`formatBRL`, `parseGrams`, `formatGrams`, `parseCm`, `formatCm`, `parsePercent`, `formatPercent`.
**Where**: `packages/core/src/formatters/` + `__tests__/`
**Depends on**: None
**Reuses**: `Intl.NumberFormat('pt-BR')` já usado por `formatPrice`
**Requirement**: PFM-10

**Tests**: unit · **Gate**: quick-core
**Done when**:
- [ ] `parseBRL` aceita `R$ 1.234,56` · `1.234,56` · `1234,56` · `1234.56` → `1234.56`
- [ ] `parseBRL('abc')` e `parseBRL('')` → `null` (nunca `NaN`)
- [ ] `parseGrams('18')` → `0.018`; `formatGrams(0.018)` → `18 g`; ida-e-volta estável
- [ ] `formatPrice` mantém a saída atual (teste de regressão)
- [ ] Todos os importadores atuais de `@nanapin/core/formatters` seguem compilando
- [ ] Test count: ≥ 20 testes passam

**Commit**: `feat(core): máscaras pt-BR de moeda, gramas, cm e percentual`

---

#### T9: `@nanapin/core/pricing` — resolução de preço e disponibilidade

**What**: `resolveItemPrice`, `isVariantAvailable`, `priceRange`, `variantLabel`.
**Where**: `packages/core/src/pricing/index.ts` + `__tests__/`; export `./pricing`
**Depends on**: T6
**Reuses**: padrão de `packages/core/src/payment/pricing.ts` (função pura importada pela edge function)
**Requirement**: PST-01 (AC 6–9), PST-08, PFM-15

**Tests**: unit · **Gate**: quick-core
**Done when**:
- [ ] `price_source:'variant'` com variação válida → preço da variação
- [ ] `price_source:'variant'` com variação inexistente / de outro produto / `price` nulo → `NOT_RESOLVABLE` (3 testes)
- [ ] `price_source:'base'` → `base_price`; produto ausente → `NOT_RESOLVABLE`
- [ ] `isVariantAvailable`: `track` com `stock:0` → false; `backorder` → true; `none` → true
- [ ] `priceRange` ignora pausadas e sem preço; devolve `null` quando não sobra nenhuma
- [ ] `variantLabel` respeita a ordem de `position`
- [ ] Test count: ≥ 18 testes passam

**Commit**: `feat(core): resolveItemPrice, disponibilidade e faixa de preço por variação`

---

#### T10: `@nanapin/core/pricing` — cruzamento de eixos e diff da grade

**What**: `cartesian(options)` e `diffGrid(current, next)` → `{toCreate, toKeep, toRemove}`; mais
`skuFromParts(slug, values)`.
**Where**: `packages/core/src/pricing/grid.ts` + testes
**Depends on**: T9
**Reuses**: —
**Requirement**: PFM-07 (AC 4), PFM-08 (AC 6, 14)

**Tests**: unit · **Gate**: quick-core
**Done when**:
- [ ] `cartesian` de 3×2 devolve 6 combinações na ordem de `position`
- [ ] `cartesian` de 0 eixos → `[]`; de 1 eixo com 3 valores → 3
- [ ] `diffGrid` **preserva** as combinações existentes em `toKeep` (com preço/estoque intactos)
- [ ] Reduzir de 3 para 2 eixos coloca as órfãs em `toRemove`, nunca em `toCreate`
- [ ] `skuFromParts('botton-sailor-moon', {Tamanho:'4,5 cm',Acabamento:'Brilhante'})` → padrão `PREFIXO-EIXO1-EIXO2` estável
- [ ] Test count: ≥ 12 testes passam

**Commit**: `feat(core): cruzamento de eixos, diff da grade e SKU automático`

---

#### T27: Inputs mascarados (`MoneyInput`, `WeightInput`, `DimensionInput`)

> **Movida da Fase 6 (formulário) para cá por `AD-010`.** E **relocada de slice**: sai de
> `features/product-form/ui/inputs/` para `shared/ui/inputs/`. Com a `13` consumindo os mesmos inputs,
> `features/bulk-edit` e `features/quick-grid` importariam de `features/product-form` — cross-import na
> mesma camada, que o `eslint-plugin-boundaries` sinaliza. `shared/ui` é o lugar certo para um
> primitivo usado por três features, no mesmo padrão de `shared/ui/AdminTable` e `shared/ui/FormCard`.

**What**: Inputs controlados por número, com máscara só na apresentação e prefixo/sufixo em slot fixo.
**Where**: `apps/backoffice/src/shared/ui/inputs/` + testes
**Depends on**: T8
**Reuses**: `Input` do `@nanapin/ui`, funções puras de `@nanapin/core/formatters`
**Requirement**: PFM-10 (UI)

**Tests**: unit (RTL) · **Gate**: quick-bo
**Done when**:
- [ ] Colar `R$ 1.234,56` no `MoneyInput` chama `onChange(1234.56)`
- [ ] Colar texto sem número mantém o valor anterior (nenhum `onChange(NaN)`)
- [ ] `WeightInput` com `value = 0.018` exibe `18 g`; digitar `20` chama `onChange(0.02)`
- [ ] Prefixo `R$` e sufixos `g`/`cm`/`%` não entram no valor
- [ ] Exportados pelo barrel `shared/ui/index.ts` — nenhum consumidor importa por caminho profundo
- [ ] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): inputs de moeda, peso e dimensão com máscara pt-BR`

---

### Fase 3 — Caminho do dinheiro

#### T11: `cartStore` v2 — chave por variação e migração do storage

**What**: `CartItem` ganha `variantId`, `variantLabel`, `unitPrice`, `optionValues`;
`itemKey = variantId ?? productId`; `subtotal` soma `unitPrice`;
`persist({ version: 2, migrate })` descartando o storage v1 com aviso.
**Where**: `apps/store/src/entities/cart/model/cartStore.ts` + `__tests__/cartStore.test.ts`
**Depends on**: T9
**Reuses**: store zustand atual
**Requirement**: PST-04, PST-02 (AC 1–3)

**Tests**: unit · **Gate**: quick-store
**Done when**:
- [ ] Mesmo produto com variações diferentes = 2 linhas
- [ ] Mesma variação adicionada 2× = 1 linha com `quantity: 2`
- [ ] `subtotal` usa `unitPrice`, não `product.price` (teste com valores divergentes)
- [ ] Storage v1 (sem `version`) é descartado na reidratação; storage v2 é preservado
- [ ] `CartItem.tsx` e `OrderSummary` seguem verdes (os testes atuais não podem quebrar em silêncio)
- [ ] Test count: ≥ 12 testes passam

**Commit**: `feat(store): carrinho chaveado por variação com migração do storage`

---

#### T12: `create-payment` — precificar por `price_source`

**What**: Substituir o mapa `priceById` por `resolveItemPrice`; ler `price_source`, `variant_id`;
remover o fallback `?? Number(i.unit_price)`; devolver 422 nomeando o item quando `NOT_RESOLVABLE`;
manter a exceção de `product_id` não-UUID (pin personalizado).
**Where**: `supabase/functions/mercado-pago/index.ts`
**Depends on**: T9, T4
**Reuses**: import relativo de `packages/core`, como já faz com `calculateOrderTotals`
**Requirement**: PST-01 (AC 6–9)

**Tests**: unit (via `packages/core`, conforme a matriz) · **Gate**: full
**Done when**:
- [ ] Item com `price_source:'variant'` é cobrado pelo `product_variants.price`
- [ ] Item com `price_source:'base'` é cobrado por `products.base_price`
- [ ] Preço não resolvível → 422 com o nome do item; **nenhum** `POST /v1/payments` é feito
- [ ] O `??` para `unit_price` do client não existe mais no arquivo
- [ ] `product_id` não-UUID continua usando `unit_price` (comportamento do pin personalizado preservado)
- [ ] As ACs 6–9 têm teste 1:1 em `packages/core/src/pricing/__tests__`

**Commit**: `feat(payments): create-payment precifica por variação via price_source`

---

#### T13: `create-payment` — persistir o recálculo completo

**What**: Além de `pix_discount` e `total`, persistir os `order_items.unit_price` recalculados e
`orders.subtotal` antes de cobrar.
**Where**: `supabase/functions/mercado-pago/index.ts`
**Depends on**: T12
**Reuses**: o bloco de persistência existente (`index.ts:173-176`)
**Requirement**: PST-01 (AC 10)

**Tests**: none (I/O da function; a regra de preço já é coberta em T12) · **Gate**: build
**Done when**:
- [ ] `orders.subtotal` e cada `order_items.unit_price` refletem o recálculo
- [ ] A escrita acontece **antes** do `POST /v1/payments`
- [ ] Falha na persistência ainda devolve 500 sem cobrar (comportamento atual preservado)

**Commit**: `feat(payments): persiste unit_price e subtotal recalculados`

---

#### T14: Flag de servidor para a rejeição 422

**What**: Variável de ambiente (`STRICT_VARIANT_PRICING`) que liga a rejeição 422 por item sem variação;
desligada, o item cai em `price_source:'base'` com log de aviso.
**Where**: `supabase/functions/mercado-pago/index.ts` + `.env.example` da raiz
**Depends on**: T12
**Reuses**: padrão de `Deno.env.get` já usado no arquivo
**Requirement**: PST-09

**Tests**: none · **Gate**: build
**Done when**:
- [ ] Flag desligada: comportamento idêntico ao de hoje, com `log({action, status:'variant_pricing_lenient'})`
- [ ] Flag ligada: 422 conforme T12
- [ ] `.env.example` documenta a variável e **quando** ligá-la (após o deploy do bundle da loja)

**Commit**: `feat(payments): flag de servidor para a precificação estrita por variação`

---

#### T15: `apply_payment_approval` — baixa por variação e política

**What**: Reescrever o corpo da RPC: baixa em `product_variants.stock` quando há `variant_id`
(`greatest(...,0)` em `track`, sem floor em `backorder`, nenhuma em `none`); manter a baixa em
`products.stock_total` só para itens sem `variant_id`. Assinatura e `GRANT` preservados.
**Where**: `supabase/migrations/<ts>_06-stock-by-variant.sql`
**Depends on**: T4, T5
**Reuses**: corpo atual de `20260726000000_products_extended_fields.sql:70-118`
**Requirement**: PST-02

**Tests**: none · **Gate**: sql
**Done when**:
- [ ] Pedido com `variant_id` decrementa **só** aquela variação; `products.stock_total` intacto
- [ ] `stock_policy = 'none'` → nenhum estoque muda
- [ ] `stock_policy = 'backorder'` → saldo pode ficar negativo
- [ ] Item sem `variant_id` continua baixando de `products.stock_total`
- [ ] Chamar a RPC duas vezes baixa uma vez só (`paid_at is null` preservado)
- [ ] Incremento de `coupons.used_count` preservado

**Commit**: `feat(db): baixa de estoque por variação respeitando stock_policy`

---

#### T16: `CheckoutPage` — gravar `variant_id`, `price_source` e snapshot

**What**: Montar `order_items` com `variant_id`, `price_source`, `variant_label`, `variant_options`; e
bloquear a criação do pedido quando um item exige variação e não tem.
**Where**: `apps/store/src/pages/CheckoutPage.tsx` + `__tests__/CheckoutPage.test.tsx`
**Depends on**: T11, T4
**Reuses**: `resolveItemPrice` e `variantLabel` de `@nanapin/core/pricing`
**Requirement**: PST-03

**Tests**: unit (RTL) · **Gate**: quick-store
**Done when**:
- [ ] Item com variação grava `variant_id` + `price_source:'variant'` + rótulo e opções
- [ ] Item sem variação grava `price_source:'base'` e `variant_id: null`
- [ ] Item que exige variação e não tem: pedido **não** é criado; erro visível ao cliente
- [ ] Pin personalizado (`custom-…`) continua criando pedido normalmente
- [ ] Test count: ≥ 6 testes novos passam; os existentes seguem verdes

**Commit**: `feat(store): checkout grava variação, price_source e snapshot no pedido`

---

### Fase 4 — Loja: eixos, categorias e redirect

#### T17: Leitores de `images` migrados para o helper

**What**: Trocar os 12 pontos que assumem `string[]` por `normalizeImages`/`primaryImage`.
**Where**: `apps/store`: `useProducts.ts`, `useProduct.ts`, `useRecoverCart.ts`,
`useAbandonedCartTracker.ts`, `CheckoutPage.tsx`, `ProductGallery.tsx`, `CustomPinPage.tsx`;
`apps/backoffice`: `useAdminProducts.ts`, `AdminProductsPage.tsx`, `AdminCollectionsPage.tsx`,
`AdminProductFormPage.tsx`
**Depends on**: T7
**Reuses**: `@nanapin/core/media`
**Requirement**: VAR-11 (AC 2, 4)

**Tests**: unit (RTL nos pontos com teste existente) · **Gate**: full
**Done when**:
- [x] Nenhum `p.images?.[0]` cru resta nos 12 pontos (grep limpo)
- [x] `ProductGallery` recebe `ProductImage[]` e usa `alt` quando existe
- [x] `pnpm build` verde nos dois apps; suites existentes de store e backoffice verdes
- [x] Produto sem imagem não gera `src={undefined}`

**Commit**: `refactor(apps): leitores de images passam pelo normalizeImages`

---

#### T18: Loja lê eixos genéricos e variações

**What**: `useProducts`/`useProduct` passam a trazer `options` e `product_variants`; `ProductCard`
(máx. 2 eixos) e `ProductPage` (até 3) renderizam seletores por eixo em vez de `sizes`/`finishes`;
disponibilidade por `isVariantAvailable`.
**Where**: `apps/store/src/entities/product/api/*`, `entities/product/ui/ProductCard.tsx`,
`pages/ProductPage.tsx`
**Depends on**: T11, T17
**Reuses**: `@nanapin/core/pricing`
**Requirement**: PST-05, PST-08, PST-10

**Tests**: unit (RTL) · **Gate**: quick-store
**Done when**:
- [x] Produto de 2 eixos mostra 2 seletores; de 3 eixos, o card mostra 2 e leva à página
- [x] Combinação com `stock: 0` e `policy: track` aparece indisponível e não entra no carrinho
- [x] Produto com variações ativas e `options` vazio é tratado como produto simples (PST-10)
- [x] `sizes`/`finishes` não são mais lidos nestes arquivos
- [x] Test count: ≥ 8 testes passam

**Commit**: `feat(store): seletores por eixo genérico e disponibilidade por variação`

---

#### T19: Vitrine lê categorias N:N

**What**: `CategoryPage` filtra por `product_categories`; a categoria de exibição (selo/breadcrumb) vem
da regra de menor `sort_order`, com desempate por `position`.
**Where**: `apps/store/src/pages/CategoryPage.tsx`, `entities/product/api/useProducts.ts`,
`entities/product/ui/ProductCard.tsx`
**Depends on**: T18
**Reuses**: `displayCategory` (helper novo, junto de `@nanapin/core/pricing` ou `entities/product/lib`)
**Requirement**: PST-06

**Tests**: unit · **Gate**: quick-store
**Done when**:
- [x] Produto em 3 categorias aparece nas 3 páginas de categoria
- [x] O selo mostra a de menor `sort_order`; empate resolve por `position` (2 testes)
- [x] Produto sem categoria não quebra o card
- [x] Test count: ≥ 5 testes passam

**Commit**: `feat(store): vitrine filtra por categorias N:N com regra de exibição determinística`

---

#### T20: Redirect 301 em `/produto/:slug`

**What**: Ao não achar o slug, consultar `product_redirects` e redirecionar para o slug atual.
**Where**: `apps/store/src/pages/ProductPage.tsx`, `entities/product/api/useProduct.ts`
**Depends on**: T4
**Reuses**: `Navigate` do react-router
**Requirement**: PST-07

**Tests**: unit (RTL) · **Gate**: quick-store
**Done when**:
- [x] Slug em `product_redirects` redireciona (`replace`) para o slug atual
- [x] Slug inexistente e sem redirect mantém o 404 atual
- [x] Redirect que aponta para produto deletado cai no 404, sem loop
- [x] Test count: ≥ 4 testes passam

**Commit**: `feat(store): resolve URL antiga de produto via product_redirects`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4

Fase 1 (schema):     T1 → T2 → T3 → T4 → T5 → T6
Fase 2 (core+UI):    T7 → T8 → T9 → T10 → T27
Fase 3 (dinheiro):   T11 → T12 → T13 → T14 → T15 → T16
Fase 4 (loja):       T17 → T18 → T19 → T20
```

Execução estritamente sequencial — sem paralelismo dentro da fase.

**Dependências externas:** nenhuma. Esta é a primeira feature do programa; todas as dependências de
T1–T20 e T27 são satisfeitas dentro dela.

**Empacotamento previsto (~7 tasks por worker, fases inteiras):**

| Batch | Fases | Tasks |
| ----- | ----- | ----- |
| 1 | Fase 1 | 6 |
| 2 | Fase 2 | 5 |
| 3 | Fase 3 | 6 |
| 4 | Fase 4 | 4 |

21 tasks → o empacotamento real é decidido no Execute (fases inteiras, ~7 tasks por batch); a tabela
acima é a estimativa. **> 8 tasks ⇒ a oferta de sub-agentes é obrigatória antes de começar.**

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1–T5 | 1 migration cada, com um tema | ✅ Granular |
| T6 | 1 arquivo de tipos | ✅ Granular |
| T7, T8, T9, T10 | 1 módulo puro cada | ✅ Granular |
| T27 | 3 componentes irmãos que dividem as mesmas máscaras | ✅ Granular (coesos) |
| T11 | 1 store | ✅ Granular |
| T12, T13, T14 | 1 preocupação cada no mesmo arquivo (preço · persistência · flag) | ✅ Granular (coesas, sequenciais) |
| T15 | 1 RPC | ✅ Granular |
| T16 | 1 página | ✅ Granular |
| T17 | 12 arquivos, **1 mudança mecânica idêntica** | ⚠️ OK — split por arquivo geraria 12 commits sem valor e a mudança é a mesma linha |
| T18, T19, T20 | 1 preocupação cada | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on | Posição no fluxo | OK |
| ---- | ---------- | ---------------- | -- |
| T1 | None | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T2 → T3 (cadeia da fase; T1 é anterior) | ✅ |
| T4 | T1 | T3 → T4 (T1 anterior na fase) | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T1, T3, T4 | T5 → T6 (todas anteriores na fase) | ✅ |
| T7 | T6 | Fase 1 → Fase 2 → T7 | ✅ |
| T8 | None | T7 → T8 (sem dep; ordem é só sequencial) | ✅ |
| T9 | T6 | T8 → T9 (T6 em fase anterior) | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T27 | T8 | T10 → T27 (T8 anterior na mesma fase) | ✅ |
| T11 | T9 | Fase 2 → Fase 3 → T11 | ✅ |
| T12 | T9, T4 | T11 → T12 (ambas em fases anteriores) | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T12 | T13 → T14 (T12 anterior na fase) | ✅ |
| T15 | T4, T5 | T14 → T15 (fase anterior) | ✅ |
| T16 | T11, T4 | T15 → T16 (T11 anterior na fase) | ✅ |
| T17 | T7 | Fase 3 → Fase 4 → T17 | ✅ |
| T18 | T11, T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T4 | T19 → T20 (fase anterior) | ✅ |

**Sem ciclos. Sem dependência para frente. Sem dependência fora da feature.**
