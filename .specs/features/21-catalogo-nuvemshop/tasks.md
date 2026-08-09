# 21 · Catálogo Nuvemshop — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md)
**Status**: In Progress
**Total**: 18 tasks em 4 fases

> **T18 nasceu durante a execução do T4** e por isso está fora da sequência numérica: a numeração é
> ordem de criação e é imutável, como a das features (precedente do fatiamento da `07`, `AD-009`). A
> **ordem de execução** da Phase 4 é `T15 → T16 → T18 → T17` — o `T17` fecha a feature porque roda o
> import de verdade e o gate final.

> **Execução inline, sequencial** — decisão do usuário em 2026-08-09 ("começar as implementações na
> sequência"). Nenhum sub-agente é despachado. A validação final usa o **standalone fallback** do
> `validate.md` (passagem independente de olhos frescos após o último commit), no lugar do Verifier
> em sub-agente.

> **Commits**: o `CLAUDE.md` deste projeto **sobrepõe** o commit atômico por task da Skill — os
> commits são gerados **de uma vez, ao fim da implementação**, agrupados por fase. Cada task ainda
> declara a sua mensagem, e elas são aplicadas na ordem no fecho.

---

## Test Coverage Matrix

> Gerada do codebase e das guidelines do projeto — guidelines encontradas: **`CLAUDE.md`** (seção
> *Os guardas* e *Estado conhecido / dívidas*), **`.specs/STATE.md`** (`AD-004`, `AD-012`),
> `supabase/vitest.config.ts`, `packages/core/package.json`, `apps/store/package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `tools/catalog-import/src/map/**` — domínio puro (mapeamento, preço, SKU, curadoria, caminho de imagem) | unit | **Todas as ramificações; 1:1 com as ACs da spec; todo edge case listado tem teste dedicado** | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| `tools/catalog-import/src/{nuvemshop,write}/**`, `run.ts` — I/O com deps injetadas (molde `AD-004`) | unit | Caminho feliz **+ cada falha documentada**: 429, 5xx, `User-Agent` ausente, credencial ausente, imagem individual falha, Storage fora, relatório que não fecha | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| `tools/catalog-import/src/cli.ts` — wiring | **none** | Declarado sem teste, mesmo motivo do `index.ts` das edge functions (`AD-004`): só env, client e exit code. Coberto pelo gate de build e pela execução real (T17) | — | build gate |
| `supabase/migrations/**` | **none** | `AD-012`: tipo declarado não é prova. A prova é **probe contra o banco local** — `information_schema` + gravação real | — | `supabase db reset` + `psql` |
| `supabase/seed.sql` | **none** | Probe: rodar o seed **avulso depois do import** e provar que nenhuma linha com `nuvemshop_id` sumiu | — | `psql` |
| Fixtures da API (`__fixtures__/*.json`) | unit | Guarda de forma **com âncora de contagem** (`L-021`): a varredura precisa provar que leu N registros, senão um caminho errado passa em silêncio | `tools/catalog-import/src/**/__tests__/apiShape.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |

## Gate Check Commands

> Extraídas do repo — `package.json` da raiz, `turbo.json`, `package.json` de cada workspace.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| **Quick** | Task com testes de unidade apenas | `pnpm --filter @estrelinha/catalog-import test` |
| **Full** | Task que toca banco/Storage | quick **+** probe: `docker exec supabase_db_uma-estrelinha-store psql -U postgres -d postgres -c "<query da task>"` |
| **Build** | Fim de fase, ou task de config/migration | `pnpm turbo run test --force` **+** `pnpm lint` **+** `pnpm build` **+** `npx tsc --noEmit -p apps/store/tsconfig.app.json` |

**Baselines a proteger** (fecho da feature 20, `CLAUDE.md`):

| | baseline | regra |
| --- | --- | --- |
| Testes | **3.188** em 185 arquivos (store 1150/90 · backoffice 1055/65 · core **725/26** · functions 258/4) | só pode **subir**. `core` **não pode mudar** — é o código de dinheiro e esta feature não o toca |
| Lint | **30 erros / 8 warnings** | "sem erros novos", não "lint limpo" |
| Tipos | store 0 · backoffice 0 | **zero é a baseline** |

⚠️ **`pnpm test | tail` mascara o exit code** (sai o do `tail`). Capturar o de verdade.
⚠️ **`pnpm build` não faz typecheck** — usar `tsconfig.app.json`, nunca o solution-style.

---

## Execution Plan

### Phase 1: Fundação — schema e workspace (T1–T3)

```
T1 → T2 → T3
```

### Phase 2: Mapeadores puros — o miolo decidível (T4–T9)

```
T4 → T5 → T6 → T7 → T8 → T9
```

### Phase 3: I/O — rede, banco e Storage (T10–T14)

```
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Integração, limpeza do seed e execução real (T15, T16, T18, T17)

```
T15 → T16 → T18 → T17
```

---

## Task Breakdown

### T1: Migration — `nuvemshop_id` nas três tabelas

**What**: Coluna `nuvemshop_id bigint` + índice único em `categories`, `products` e `product_variants`.
**Where**: `supabase/migrations/<ts>_nuvemshop-import-keys.sql`
**Depends on**: None
**Reuses**: molde de migration comentada do repo (`20260801150000_categories-hierarchy-and-counts.sql`)
**Requirement**: `CAT-01`

**Tools**: MCP: NONE (servidor `supabase` não autenticado nesta sessão) · Skill: NONE

**Done when**:
- [ ] Três `ALTER TABLE ... ADD COLUMN IF NOT EXISTS nuvemshop_id bigint`
- [ ] Três índices únicos **simples, não parciais** (em Postgres `NULL` não colide com `NULL`; parcial só traria a armadilha da `L-018`)
- [ ] Comentário na migration diz **por que a chave é o id e não o slug**, e por que `product_variants` também precisa
- [ ] **Probe (`AD-012`)**: `supabase db reset` roda limpo, e `information_schema.columns` devolve as 3 colunas com `data_type = 'bigint'`
- [ ] **Probe de gravação**: `insert` de duas linhas com o mesmo `nuvemshop_id` é **rejeitado**; duas com `null` são **aceitas**
- [ ] Gate build passa

**Tests**: none (matriz: migration → probe) · **Gate**: build
**Commit**: `feat(catalogo): nuvemshop_id como chave de idempotencia do import`

---

### T2: Workspace `tools/catalog-import` + `loc()`

**What**: O workspace novo (manifesto, tsconfig, eslint, vitest, `.gitignore` do cache) nascendo já com o primeiro módulo puro e seus testes.
**Where**: `tools/catalog-import/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts,.gitignore}`, `tools/catalog-import/src/map/loc.ts` + `__tests__/loc.test.ts`, `pnpm-workspace.yaml`
**Depends on**: T1
**Reuses**: `supabase/package.json` e `supabase/vitest.config.ts` (molde de workspace Node com vitest); `apps/store/eslint.config.js` (molde de flat config); a função `loc()` de `../landing-pages/src/lib/nuvemshop.ts:57-61`
**Requirement**: `CAT-09`

> **Por que o módulo `loc` entra nesta task e não numa própria**: `vitest run` sai com código ≠ 0 quando não encontra teste, e `--passWithNoTests` permanente esconderia um glob quebrado depois — exatamente a falha silenciosa que a `L-021` registra. O workspace nasce com um teste de verdade.

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `tools/*` acrescentado ao `pnpm-workspace.yaml`; `pnpm install` resolve
- [ ] `package.json` declara **`test` E `lint`** — o importador não pode nascer fora do gate como `packages/` nasceu (`BL-002`)
- [ ] `tsx` como devDependency do workspace
- [ ] `.gitignore` cobre `.cache/` e `reports/`
- [ ] `loc(value)` devolve `pt`, cai para o primeiro idioma presente, e `''` para nulo/vazio
- [ ] `pnpm --filter @estrelinha/catalog-import test` passa · `pnpm lint` **sem erros novos** (baseline 30/8)

**Tests**: unit (3+ casos: `pt` presente · só outro idioma · nulo/vazio) · **Gate**: build
**Commit**: `build(catalogo): workspace tools/catalog-import com vitest e lint`

---

### T3: Fixtures reais + guarda de forma da API

**What**: Recortes da resposta **real** da Nuvemshop como fixtures, e um teste que prova que os campos de que o mapeamento depende existem no payload real.
**Where**: `tools/catalog-import/src/__fixtures__/{categories,products}.json`, `src/nuvemshop/types.ts`, `src/nuvemshop/__tests__/apiShape.test.ts`
**Depends on**: T2
**Reuses**: as respostas já capturadas na Design (2026-08-09)
**Requirement**: `CAT-01`, `CAT-04`, `CAT-05`

> **Por que isto é uma task e não um detalhe**: `AD-012` — tipo escrito à mão é afirmação, não
> verificação. `DbCategory` declarou três colunas inexistentes por meses. Aqui o tipo descreve uma API
> de terceiro: a única prova é confrontá-lo com bytes que vieram do servidor.

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Fixture de categorias com **as 39** (payload pequeno, cabe inteiro)
- [ ] Fixture de produtos com um **recorte nomeado** que contém, comprovadamente: produto despublicado · produto sem categoria · produto sem imagem · o produto sem preço nenhum (`pingente-figa-colecao-fragmentos`) · variação com `promotional_price` · variação com `compare_at_price == price` · SKU repetido **entre produtos diferentes** · produto com 3 eixos · produto de variação única sem eixo
- [ ] `types.ts` descreve **o que a API devolve**, não o que a loja quer
- [ ] `apiShape.test.ts` tem **âncora de contagem** (`L-021`): falha se a fixture tiver menos registros que o esperado, para um caminho errado não passar lendo zero
- [ ] O teste assere presença dos campos usados no mapeamento: `id, name.pt, handle.pt, published, visibility, attributes, variants[].{id,price,promotional_price,compare_at_price,stock,stock_management,sku,values,position,visible,weight}, images[].{id,src,position}, categories[].id`
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `test(catalogo): fixtures reais da Nuvemshop e guarda de forma da API`

---

### T4: `map/category.ts` — hierarquia, ordem e curadoria

**What**: `RawCategory[] → CategoryRow[]`, com pais antes das filhas, `sort_order` derivado e a lista de curadoria.
**Where**: `tools/catalog-import/src/map/category.ts` + `__tests__/category.test.ts`
**Depends on**: T3
**Reuses**: `loc()` (T2), fixture de categorias (T3)
**Requirement**: `CAT-05`, `CAT-11`, `CAT-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `slug ← handle.pt` preservado; `name ← loc(name)`
- [ ] `parent` `0` ⇒ `parent_id: null`; a saída é **ordenada com toda pai antes de qualquer filha sua** (topológica) — teste com pai que aparece **depois** da filha na entrada
- [ ] `sort_order` = índice em `subcategories[]` do pai; para as 10 raízes, índice na resposta. **Teste declara que a origem não tem campo de ordenação** e que este é o derivado
- [ ] `CURATED_INACTIVE` chaveada por **`nuvemshop_id`** — `35119124` (Black Friday) · `32697621` (Rastreio) · `32509753` (Brinquedos) · `34729760` (Profissões) — constante exportada e asserida **elemento a elemento** (`L-010`: AC que enumera lista precisa de um item de verificação por elemento)
- [ ] Categoria em `CURATED_INACTIVE` ⇒ `active: false`, **slug preservado**

> **Por que por id e não por slug** (corrige o `design.md`, que dizia slug): o slug **muda na origem**
> — é o mesmo motivo de a chave de idempotência ser o id (`CAT-01`), e curadoria presa a um slug
> renomeado silenciosamente deixa de aplicar. E há um motivo específico deste catálogo: a categoria
> "Brinquedos" tem handle **`nanita`**, a marca anterior. Chavear por slug plantaria essa string em
> código novo, contra a varredura que a feature `20` deixou de pé.
- [ ] `visibility !== 'visible'` ⇒ `active: false`
- [ ] `show_in_menu` e `menu_promo` **não aparecem** na saída (asserido por ausência de chave)
- [ ] Aplicado à fixture real: **39 linhas, 4 inativas**
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): mapeamento de categorias com hierarquia, ordem e curadoria`

---

### T5: `map/product.ts` — campos, eixos e política de estoque

**What**: `RawProduct → ProductRow | Skip`.
**Where**: `tools/catalog-import/src/map/product.ts` + `__tests__/product.test.ts`
**Depends on**: T4
**Reuses**: `loc()`, fixture de produtos
**Requirement**: `CAT-02`, `CAT-04`, `CAT-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `slug ← handle.pt` **idêntico** à origem; `is_active ← published`
- [ ] `options ← attributes[]` como `[{name, values[], position}]`, `values` = distintos das variações **na ordem de primeira aparição**
- [ ] `stock_policy`: todas as variações com `stock_management === false` ⇒ `'none'`; qualquer `true` ⇒ `'track'`
- [ ] `base_price` semeado com o **menor preço efetivo** das variações (`NOT NULL` sem default)
- [ ] Produto sem nome ⇒ `Skip{ reason:'sem_nome' }`; sem **nenhuma** variação com preço ⇒ `Skip{ reason:'sem_preco' }`
- [ ] Peso e dimensões vêm da **primeira** variação
- [ ] `is_featured/is_new/is_promo/sort_order` **não aparecem** na saída
- [ ] Aplicado à fixture real: `pingente-figa-colecao-fragmentos` é o **único** `Skip`
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): mapeamento de produto com eixos e politica de estoque`

---

### T6: `map/variant.ts` — preço efetivo e a guarda do `compare_price`

**What**: `RawProduct → VariantRow[]`.
**Where**: `tools/catalog-import/src/map/variant.ts` + `__tests__/variant.test.ts`
**Depends on**: T5
**Requirement**: `CAT-04`

> A task de maior risco de dinheiro da feature. `compare_at_price` é **igual** ao preço em 3.346 das
> 3.357 variações medidas: sem guarda, quase todo produto nasce com "de" riscado igual ao "por".

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `price = promotional_price ?? price` — teste com **os três valores divergentes** (`price:380, promotional_price:299, compare_at_price:380`), porque fixture com campos candidatos iguais não detecta leitura do campo errado (`L-013`)
- [ ] `compare_price = compare_at_price` **somente se `> price` efetivo**; senão `null`. Teste dedicado para `compare == price` ⇒ `null`
- [ ] `stock = stock ?? 0`; `option_values` = `zip(attributes[].pt, values[].pt)`
- [ ] `name = values.join(' · ')`, vazio ⇒ `null`
- [ ] Variação sem preço ⇒ `price: null` **e** `is_active: false`
- [ ] `is_active = visible && temPreço`
- [ ] Aplicado à fixture real: contagem de `compare_price` não-nulo bate com o esperado do recorte
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): preco efetivo da variacao e guarda do compare_price`

---

### T7: `map/sku.ts` — deduplicação global

**What**: Função que decide, para o lote inteiro, qual SKU sobrevive e qual vira `null`.
**Where**: `tools/catalog-import/src/map/sku.ts` + `__tests__/sku.test.ts`
**Depends on**: T6
**Reuses**: a regra de `supabase/migrations/20260801120100_02-backfill-variants.sql:76-90`
**Requirement**: `CAT-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] SKU vazio ou só espaço ⇒ `null` (não conta como duplicata)
- [ ] Primeira ocorrência mantém; **todas as seguintes viram `null`**, com ordem determinística
- [ ] Duplicata **dentro do mesmo produto** ⇒ `null` — teste dedicado
- [ ] Duplicata **entre produtos diferentes** ⇒ `null` — teste dedicado (é o caso que só a varredura global pega)
- [ ] Cada descarte entra numa lista de relatório com `{ sku, product_slug, variant_nuvemshop_id }`
- [ ] Aplicado à fixture real: nenhum SKU sobrevive duas vezes (asserido por `Set`)
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): deduplicacao global de sku com relatorio de descarte`

---

### T8: `map/image.ts` — URL WebP, caminho determinístico e alt

**What**: `RawImage → ImagePlan` — de onde baixar, onde gravar, e qual `alt`.
**Where**: `tools/catalog-import/src/map/image.ts` + `__tests__/image.test.ts`
**Depends on**: T7
**Requirement**: `CAT-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `webpUrl` = `src` com a extensão trocada por `.webp` — preservando query string, se houver
- [ ] `storagePath` = `nuvemshop/<nuvemshop_product_id>/<image_id>.webp` — **determinístico**, sem UUID e sem timestamp. Teste chama duas vezes e assere igualdade
- [ ] `alt` **da origem quando existe** (20 imagens medidas têm texto da vendedora); vazio ⇒ template determinístico (`AD-011`): primeira imagem ⇒ `name`, demais ⇒ `"<name> — foto N"`, com `N` na ordem de `position`. Teste para as duas formas que a origem usa (`{pt}` e array)
- [ ] `source: 'import'` — o valor já existe em `ImageSource` (`packages/supabase/src/types/index.ts:73`)
- [ ] Extensão do original em maiúscula ou com query não quebra a troca
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): plano de imagem com rendicao webp e caminho deterministico`

---

### T9: `report.ts` — contadores e conferência de totais

**What**: Acumulador do relatório e a regra que decide o exit code.
**Where**: `tools/catalog-import/src/report.ts` + `__tests__/report.test.ts`
**Depends on**: T8
**Requirement**: `CAT-08`, `CAT-11`, `CAT-12`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Contadores por entidade: `lidos, criados, atualizados, pulados`
- [ ] Contadores de imagem: `novas, reusadas, falhadas`
- [ ] Listas nominais: SKUs descartados · produtos pulados **com motivo** · imagens falhadas **com motivo** · **as 4 categorias forçadas inativas** (`CAT-11`) · divergências de vitrine preservadas (`CAT-12`)
- [ ] **Conferência**: `lidos === criados + atualizados + pulados` por entidade; falso ⇒ `exitCode !== 0`. Teste que **desequilibra de propósito** e prova o exit ≠ 0
- [ ] Serialização JSON estável (chaves ordenadas) para diff entre execuções
- [ ] Gate quick passa

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): relatorio com conferencia de totais e exit code`

---

### T10: `nuvemshop/client.ts` — auth, paginação e backoff

**What**: O cliente HTTP, com `fetch` e `sleep` injetados.
**Where**: `tools/catalog-import/src/nuvemshop/client.ts` + `__tests__/client.test.ts`
**Depends on**: T9
**Reuses**: `apiFetch` de `../landing-pages/src/lib/nuvemshop.ts:67-88` (portado, não importado — aquele é `import.meta.env`)
**Requirement**: `CAT-06`, `CAT-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Header `Authentication: bearer <token>` e `User-Agent` em **toda** request
- [ ] **Guarda de `User-Agent`**: vazio/ausente ⇒ lança **antes** da primeira request, com mensagem própria e **zero chamadas de saída** (`L-004`: guarda que retorna antes de chamada externa precisa asserir o zero)
- [ ] Credencial ausente ⇒ lança nomeando a variável, zero chamadas
- [ ] Paginação pelo header `link` `rel="next"`; para quando não houver
- [ ] Rate limit: lê `x-rate-limit-remaining` e `x-rate-limit-reset` e **pausa `reset` ms quando `remaining <= 2`** — número nunca embutido
- [ ] `429`/`5xx` ⇒ backoff (`Retry-After`, senão `2^n`), **4 tentativas**; esgotadas ⇒ **lança** (`CAT-06`)
- [ ] Testes: 429 com `Retry-After` · 5xx sem `Retry-After` · esgotamento ⇒ throw · 2 páginas via `link` · pausa por rate limit
- [ ] Gate quick passa

**Tests**: unit (fetch dublado, molde `AD-004`) · **Gate**: quick
**Commit**: `feat(catalogo): cliente da nuvemshop com paginacao, backoff e guarda de user-agent`

---

### T11: `write/storage.ts` — download, cache e upload determinístico

**What**: Garantir uma imagem no Storage e devolver a URL pública.
**Where**: `tools/catalog-import/src/write/storage.ts` + `__tests__/storage.test.ts`
**Depends on**: T10
**Requirement**: `CAT-03`, `CAT-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Ordem: cache local ⇒ `.webp` do CDN ⇒ original. Fallback dispara quando a resposta **não** é `200` **ou** o `content-type` não é `image/webp` — teste dedicado para cada uma das duas condições
- [ ] Upload com `upsert: false` no `storagePath` do T8; erro de **duplicata** ⇒ `{ reused: true }`, **não** é falha (`CAT-03`)
- [ ] Falha da imagem individual ⇒ `{ failed: motivo }`, **sem lançar** — o produto entra sem ela (`CAT-07`)
- [ ] Falha de Storage que **não** é da imagem (conexão, credencial) ⇒ **lança**, para o import parar (`CAT-06`)
- [ ] Cache grava em `.cache/` chaveado pela URL e **não** rebaixa o CDN na segunda execução — teste assere **zero** fetch no hit
- [ ] URL devolvida é a pública do bucket `product-images`
- [ ] Gate quick passa

**Tests**: unit (fetch e storage dublados) · **Gate**: quick
**Commit**: `feat(catalogo): storage com cache, fallback de webp e falha parcial de imagem`

---

### T12: `write/categories.ts` — upsert por `nuvemshop_id`

**What**: Gravação das categorias, pais antes das filhas, com preservação de curadoria.
**Where**: `tools/catalog-import/src/write/categories.ts` + `__tests__/categories.test.ts`
**Depends on**: T11
**Requirement**: `CAT-01`, `CAT-05`, `CAT-12`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Casamento por `nuvemshop_id`; ausente ⇒ insert, presente ⇒ update
- [ ] `parent_id` resolvido para o **uuid** da pai já gravada; pai sempre antes (`CAT-05`)
- [ ] **No update, `active`, `sort_order`, `show_in_menu` e `menu_promo` não entram no payload** — asserido sobre o **objeto enviado ao client**, não sobre contagem de chamada (regra payload/conjunção)
- [ ] Divergência entre origem e banco nos campos de vitrine ⇒ linha de relatório (`CAT-12`)
- [ ] Segunda execução com a mesma entrada ⇒ `criados: 0`, `atualizados: N`
- [ ] Colisão de slug com registro de **outro** `nuvemshop_id` ⇒ pulado e reportado
- [ ] ⚠️ O client dublado **nunca** devolve query builder de dentro de função `async` (`L-011`: builder é thenable e a promise o adota)
- [ ] Gate quick passa

**Tests**: unit (supabase-js dublado) · **Gate**: quick
**Commit**: `feat(catalogo): gravacao de categorias com hierarquia e preservacao de curadoria`

---

### T13: `write/products.ts` — produto, variações e vínculo N:N

**What**: Gravação do produto com suas variações e `product_categories`.
**Where**: `tools/catalog-import/src/write/products.ts` + `__tests__/products.test.ts`
**Depends on**: T12
**Requirement**: `CAT-01`, `CAT-04`, `CAT-12`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Upsert de produto por `nuvemshop_id`; variações por `nuvemshop_id` da variação
- [ ] `product_categories` reescrito por produto (`delete` + `insert`), `position` = índice da origem
- [ ] **No update, `base_price` não é enviado** — o trigger `sync_product_base_price` é o dono (`20260801120400`)
- [ ] **No update, `is_active`, `sort_order`, `is_featured`, `is_new`, `is_promo` não entram no payload** — asserido sobre o objeto enviado
- [ ] Variação que sumiu da origem ⇒ `is_active: false`, **nunca `delete`** (`order_items.variant_id` referencia a linha)
- [ ] Produto pulado (T5) não gera nenhuma escrita — asserido com **zero** chamadas
- [ ] Segunda execução ⇒ `criados: 0`, zero duplicata em produto, variação e vínculo
- [ ] Gate quick passa

**Tests**: unit (supabase-js dublado) · **Gate**: quick
**Commit**: `feat(catalogo): gravacao de produto, variacoes e vinculo n:n`

---

### T14: `run.ts` + `cli.ts` — orquestração e wiring

**What**: A sequência das quatro fases e o executável.
**Where**: `tools/catalog-import/src/run.ts` + `__tests__/run.test.ts`, `src/cli.ts`
**Depends on**: T13
**Reuses**: molde `index.ts` × `handlers.ts` das edge functions (`AD-004`)
**Requirement**: `CAT-06`, `CAT-08`, `CAT-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Ordem fixa: categorias ⇒ produtos+variações ⇒ imagens ⇒ relatório. Teste assere a **ordem**, não só a ocorrência
- [ ] Throw do cliente (backoff esgotado) ou do Storage ⇒ **para**, devolve relatório parcial e `exitCode !== 0`, **sem** seguir para a fase seguinte
- [ ] `--dry-run` lê e mapeia mas **não grava** — zero escrita asserida em banco e Storage
- [ ] `--only=` e `--limit=` respeitados
- [ ] `cli.ts` só resolve env, monta clients, chama `run()`, imprime e define `process.exitCode` — **sem lógica**, declarado sem teste na matriz
- [ ] Pool de concorrência de imagens = 6, nunca ilimitado
- [ ] Gate quick passa
- [ ] Gate build passa (fim de fase)

**Tests**: unit · **Gate**: build
**Commit**: `feat(catalogo): orquestracao das fases e cli do importador`

---

### T15: `seed.sql` — remover o catálogo de dev com limpeza segura

**What**: Tirar as seções 1–3 do seed e estender a seção 0 com os slugs de dev, protegida por `nuvemshop_id IS NULL`.
**Where**: `supabase/seed.sql`
**Depends on**: T14
**Reuses**: o mecanismo de limpeza explícita que a **própria seção 0** já usa
**Requirement**: `CAT-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Seções **1 (categorias), 2 (produtos), 3 (variações)** removidas; **4 (cupons) e 5 (admin) preservadas** — sem elas o dev perde acesso ao backoffice e o teste de desconto
- [ ] Seção 0 lista os **16 slugs de produto + 7 de categoria** do catálogo de dev, explicitamente
- [ ] **Todo `DELETE` da seção 0 leva `AND nuvemshop_id IS NULL`** — sem isso, rodar o seed avulso depois do import apaga a `joias-afetivas` real e, por cascade, os 508 vínculos dela
- [ ] Comentário no cabeçalho explica que a loja fica **sem catálogo** após `db reset` até o import rodar, e por quê
- [ ] **Probe**: `supabase db reset` ⇒ `count(products) = 0`, `count(categories) = 0`, cupons e admin presentes
- [ ] **Probe do acidente**: com uma categoria de `nuvemshop_id` não-nulo e slug `joias-afetivas` no banco, rodar o `seed.sql` avulso **não a apaga**
- [ ] Gate build passa

**Tests**: none (matriz: seed → probe) · **Gate**: build
**Commit**: `feat(catalogo): seed deixa de inserir catalogo de dev, com limpeza segura`

---

### T16: Credenciais e documentação

**What**: `NUVEMSHOP_*` no `.env` da raiz e no `.env.example`, e o `CLAUDE.md` deixando de dizer que a loja roda com seed.
**Where**: `.env.example`, `.env` (não versionado), `CLAUDE.md`
**Depends on**: T15
**Requirement**: `CAT-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `.env.example` documenta `NUVEMSHOP_STORE_ID`, `NUVEMSHOP_ACCESS_TOKEN`, `NUVEMSHOP_USER_AGENT`, `NUVEMSHOP_API_VERSION`
- [ ] **O valor de exemplo do `User-Agent` está entre aspas**, com o motivo escrito: sem aspas, os parênteses não sobrevivem ao carregamento e a API devolve `400 "Required user-agent is missing"` — medido
- [ ] Nenhuma credencial em arquivo versionado; `.env` da raiz preenchido a partir de `../landing-pages/.env`
- [ ] `CLAUDE.md`: a linha "a loja roda com catálogo de desenvolvimento" passa a descrever o import; comandos do importador documentados
- [ ] `git grep` do token **não encontra nada** versionado
- [ ] Gate build passa

**Tests**: none (config) · **Gate**: build
**Commit**: `docs(catalogo): credenciais da nuvemshop e comandos do importador`

---

### T17: Execução real, probe e prova de idempotência

**What**: Rodar o import de verdade contra o Supabase local, conferir o relatório contra o previsto e provar idempotência rodando de novo.
**Where**: nenhum arquivo de produção — saída em `.specs/features/21-catalogo-nuvemshop/validation.md`
**Depends on**: T16
**Requirement**: `CAT-01`, `CAT-03`, `CAT-08`, e a prova de `AD-012`

> **Custo real declarado**: ~3.660 imagens, ~410 MB. É a task longa da feature. O import é
> idempotente e tem cache, então uma interrupção **continua** de onde parou em vez de recomeçar.

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `--dry-run` primeiro: o relatório previsto bate com o **Resultado esperado** do `design.md`
- [ ] Execução real termina com **exit 0** (o que já embute a conferência de totais)
- [ ] Relatório real conferido linha a linha contra o previsto: **39 categorias (4 inativas) · 689 produtos criados · 1 pulado (`pingente-figa-colecao-fragmentos`) · 3.357 variações · 93 com `compare_price` · 594 `stock_policy='none'` · 3.660 imagens**. Divergência é **defeito a investigar**, não ruído
- [ ] **Probe `AD-012`** (psql, não inspeção de tipo): `nuvemshop_id` preenchido nas 3 tabelas · `product_categories` com ~3.100 linhas · nenhum `compare_price <= base_price` · nenhum slug divergente do `handle` de origem
- [ ] **Segunda execução**: `criados = 0`, `atualizados = 689`, **zero duplicata** nas 3 tabelas, `3.660` imagens **reusadas** e **zero** novas
- [ ] **Prova de `CAT-12`**: desativar uma categoria no banco à mão, rodar de novo, e ela **continua** desativada, com a divergência no relatório
- [ ] Loja aberta em **390×844** (mobile é o caso principal): home, uma categoria e uma página de produto renderizam com foto servida por `…/storage/v1/object/public/product-images/nuvemshop/…`
- [ ] Gate build final: `pnpm turbo run test --force` exit 0 capturado de verdade (**não** por pipe), `pnpm lint` sem erros novos, `pnpm build` exit 0, `npx tsc --noEmit -p apps/store/tsconfig.app.json` **0 erros**
- [ ] Baselines atualizadas no `CLAUDE.md` com os números **medidos**

**Tests**: none (é a validação de integração; a suíte inteira roda no gate) · **Gate**: build
**Commit**: `test(catalogo): execucao real do import com relatorio conferido e prova de idempotencia`

---

### T18: Varredura de marca alcança `tools/`

**What**: Acrescentar `tools` ao escopo do `brandScan.test.ts`, com a fixture do catálogo real na `ALLOWLIST`.
**Where**: `apps/store/src/shared/lib/__tests__/brandScan.test.ts`
**Depends on**: T16 (o workspace precisa estar completo — a âncora exige > 10 arquivos por diretório)
**Requirement**: `CAT-11` (curadoria) · guarda de `AD-016`

> **Por que esta task existe.** A varredura de marca lê `['apps','packages','supabase']` **escritos
> literalmente**, e a feature `21` acabou de criar um **quarto diretório de fonte** — `tools/`. Um
> ponto cego criado por esta feature é dívida desta feature. E não é hipotético: a categoria
> "Brinquedos" do catálogo real tem handle **`nanita`**, então a string entra no repositório pela
> fixture.

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ESCOPO` passa a incluir `tools`
- [ ] A **âncora literal** do teste (`for (const dir of ['apps','packages','supabase'])`) passa a listar `tools` — escrito à mão, nunca iterando `ESCOPO`, que é o ponto inteiro daquela âncora
- [ ] `tools/catalog-import/src/__fixtures__/categories.json` entra na **`ALLOWLIST`** (permanente) com o motivo escrito: é captura do catálogo real, onde a string é o **assunto** e não resíduo
- [ ] Nenhuma entrada nova em `PENDENTE` — a fixture não é dívida a converter
- [ ] Nenhum arquivo `.ts` do importador contém a marca (é o que a decisão de chavear a curadoria por `nuvemshop_id` garante)
- [ ] A âncora `> 400 arquivos` e a `> 10 por diretório` continuam passando
- [ ] Gate build passa

**Tests**: none — a task **é** a alteração de um teste · **Gate**: build
**Commit**: `test(marca): varredura de marca passa a cobrir tools/`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9
Phase 3:  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
Phase 4:  T15 ──→ T16 ──→ T18 ──→ T17
```

Execução estritamente sequencial, uma task por vez.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 migration | ✅ Granular |
| T2 | scaffolding do workspace + 1 função + teste | ⚠️ Coeso — o teste existe para o gate não nascer quebrado (motivo na task) |
| T3 | 2 fixtures + 1 arquivo de tipos + 1 teste | ⚠️ Coeso — fixture sem guarda não prova nada; guarda sem fixture não roda |
| T4 | 1 módulo | ✅ Granular |
| T5 | 1 módulo | ✅ Granular |
| T6 | 1 módulo | ✅ Granular |
| T7 | 1 módulo | ✅ Granular |
| T8 | 1 módulo | ✅ Granular |
| T9 | 1 módulo | ✅ Granular |
| T10 | 1 módulo | ✅ Granular |
| T11 | 1 módulo | ✅ Granular |
| T12 | 1 módulo | ✅ Granular |
| T13 | 1 módulo | ✅ Granular |
| T14 | `run.ts` + `cli.ts` | ⚠️ Coeso — `cli.ts` é wiring sem lógica; separar geraria commit sem verificação possível |
| T15 | 1 arquivo | ✅ Granular |
| T16 | config + docs | ✅ Granular |
| T17 | execução + validação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (início da Phase 1) | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → (Phase 2) → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → (Phase 3) → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → (Phase 4) → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T18 | T16 | T16 → T18 | ✅ |
| T17 | T16 | T18 → T17 (T17 fecha a fase) | ✅ |

Nenhuma task depende de task em fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | `supabase/migrations/**` | none (probe) | none | ✅ |
| T2 | `src/map/**` (`loc`) + config | unit | unit | ✅ |
| T3 | fixtures + `nuvemshop/types.ts` | unit (guarda de forma) | unit | ✅ |
| T4 | `src/map/**` | unit | unit | ✅ |
| T5 | `src/map/**` | unit | unit | ✅ |
| T6 | `src/map/**` | unit | unit | ✅ |
| T7 | `src/map/**` | unit | unit | ✅ |
| T8 | `src/map/**` | unit | unit | ✅ |
| T9 | `src/report.ts` (domínio puro) | unit | unit | ✅ |
| T10 | `src/nuvemshop/**` | unit | unit | ✅ |
| T11 | `src/write/**` | unit | unit | ✅ |
| T12 | `src/write/**` | unit | unit | ✅ |
| T13 | `src/write/**` | unit | unit | ✅ |
| T14 | `src/run.ts` (unit) + `src/cli.ts` (none) | unit (maior das duas) | unit | ✅ |
| T15 | `supabase/seed.sql` | none (probe) | none | ✅ |
| T16 | config + docs | none | none | ✅ |
| T18 | `apps/store/.../brandScan.test.ts` — a task **é** a alteração de um teste | none | none | ✅ |
| T17 | nenhuma camada de produção | none | none | ✅ |

Nenhuma violação. Nenhum `Tests: none` justificado por "testado em outra task".

---

## Rastreabilidade — requisito → task

| Req | Tasks |
| --- | --- |
| `CAT-01` idempotência por `nuvemshop_id` | T1, T3, T12, T13, T17 |
| `CAT-02` slug preservado | T4, T5, T17 |
| `CAT-03` imagens no Storage | T8, T11, T17 |
| `CAT-04` variantes, preços e estoque | T3, T5, T6, T7, T13 |
| `CAT-05` categorias, hierarquia e ordem | T3, T4, T12 |
| `CAT-06` backoff e parada limpa | T10, T11, T14 |
| `CAT-07` falha de imagem não descarta produto | T11 |
| `CAT-08` relatório com totais conferidos | T5, T9, T14, T17 |
| `CAT-09` credenciais fora do navegador | T2, T10, T14, T16 |
| `CAT-10` seed de dev removido com limpeza segura | T15 |
| `CAT-11` quatro categorias inativas | T4, T9, T17, T18 |
| `CAT-12` re-execução preserva curadoria | T9, T12, T13, T17 |

**12 requisitos · 18 tasks · nenhum requisito sem task, nenhuma task sem requisito.**

---

## Estado da execução — 2026-08-09

Execução inline e sequencial, sem sub-agentes. Gate medido a cada task; o gate de build completo
rodou no fecho de cada fase.

| Task | Estado | Prova |
| --- | --- | --- |
| T1 · migration `nuvemshop_id` | ✅ | `db reset` limpo · `information_schema` devolve 3 colunas `bigint` · duplicata **rejeitada** pela constraint, dois `NULL` **aceitos** |
| T2 · workspace + `loc()` | ✅ | 7 testes · `pnpm install` resolve · `lint` e `test` declarados desde o primeiro commit |
| T3 · fixtures reais + guarda de forma | ✅ | 25 testes · âncora de contagem (39 categorias · 6 produtos · 38 variações · 43 imagens) · os 12 casos de borda provados presentes |
| T4 · `map/category.ts` | ✅ | 17 testes · ordem topológica com pai depois da filha · ciclo lança em vez de pendurar |
| T5 · `map/product.ts` + `map/price.ts` | ✅ | 35 testes · fixture com os três campos de dinheiro **divergentes** (`L-013`) |
| T6 · `map/variant.ts` | ✅ | 19 testes · guarda do `compare_price` com teste dedicado ao caso espelhado |
| T7 · `map/sku.ts` | ✅ | 11 testes · duplicata dentro do produto **e** entre produtos, cada uma com teste próprio |
| T8 · `map/image.ts` | ✅ | 21 testes · caminho determinístico · extensão vinda da URL que serviu |
| T9 · `report.ts` | ✅ | 18 testes · conferência desequilibrada de propósito prova o exit ≠ 0 |
| T10 · `nuvemshop/client.ts` | ✅ | 19 testes · guardas de credencial asserem **zero** chamadas de saída (`L-004`) |
| T11 · `write/storage.ts` + cache | ✅ | 12 testes · as duas condições de fallback separadas · cache prova zero fetch na segunda passada |
| T12 · `write/categories.ts` | ✅ | 11 testes · campos de vitrine asseridos **no objeto enviado**, não em contagem de chamada |
| T13 · `write/products.ts` | ✅ | 16 testes · variação ausente é **desativada**, nunca apagada |
| T14 · `run.ts` + `cli.ts` + adaptador | ✅ | 22 testes · ordem das fases asserida · dry-run com banco populado provado sem upload |
| T15 · `seed.sql` | ✅ | `db reset` ⇒ 0 produtos / 0 categorias / 5 cupons / 1 admin · seed avulso **apagou a linha de dev e preservou a importada** |
| T16 · credenciais e docs | ✅ | `.env` da raiz e `.env.example` com o motivo das aspas escrito · `CLAUDE.md` com os comandos · `.env` gitignored conferido |
| T18 · varredura de marca cobre `tools/` | ✅ | **Sensor**: removendo a entrada da `ALLOWLIST`, a varredura acusa `categories.json:661` — a entrada não é decorativa |
| T17 · execução real | ⏳ | dry-run completo confere **um a um** com o previsto no `design.md` |

### Desvios registrados

1. **`--only` virou `--stop-after`** (`SPEC_DEVIATION` marcado em `run.ts`). `only` prometia
   isolamento impossível: produtos precisam do mapa de uuid das categorias, imagens precisam do uuid
   do produto.
2. **`map/price.ts` nasceu dentro do T5**, não como task própria. A regra de preço é pré-requisito do
   `base_price` semeado, e o T6 a consome — separá-la geraria uma task sem verificação possível.
3. **`write/db.ts` ganhou o adaptador do `supabase-js`** e um teste próprio. Estava previsto como
   wiring no `cli.ts` (sem teste); foi movido porque um erro ali — `delete().eq()` invertido para
   `eq().delete()` — apagaria a tabela inteira em silêncio.
4. **T18 não existia no plano.** Nasceu de um achado do T4.

### Correções de rota durante a execução

- **O `alt` da origem não é sempre vazio**: 20 das 3.660 imagens têm texto escrito pela vendedora. A
  contagem original tratava `alt` como array (`.length`) e a forma real é `{ pt }` — as duas ocorrem.
  A origem passou a vencer o template.
- **Contagem de variações puladas** por colisão de slug quebrava a conferência de totais.
- **Dry-run classificava toda variação como atualizada**, o que faria o ensaio não bater com a
  execução real.
- **Dry-run com banco já populado subiria as imagens** — a fase só era pulada por acidente (sem uuid
  de produto). Agora sai do caminho explicitamente.
