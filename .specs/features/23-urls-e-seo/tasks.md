# 23 · URLs e SEO — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: [`design.md`](./design.md)
**Spec**: [`spec.md`](./spec.md)
**Status**: **T1–T20 implementadas** em 2026-08-09, nos 3 lotes sequenciais previstos (Fases 1–2,
Fases 3–4, Fases 5–6). Gate de fecho medido: `turbo run test --force` exit 0 · **3.672 testes em 211
arquivos** · lint 30 err / 8 warn (baseline exata) · `tsc` 0 · 0 · 0 · `packages/core/src/payment/`
intocado. **Pendentes**: o Verifier independente (`validation.md`) e os commits, os dois do
orquestrador — a árvore está suja de propósito, pela convenção de commit do projeto.

**Convenção de commit do projeto** (`CLAUDE.md`): **não** criar commits atômicos durante a
implementação. Aguardar a conclusão e gerar os commits completos de uma vez — isso **sobrepõe** a
regra "um commit por task" da Skill. A coluna `Commit` de cada task registra a mensagem prevista para
o agrupamento final.

---

## Test Coverage Matrix

> Gerada do codebase, das guidelines do projeto e da spec — confirmar antes do Execute.
> **Guidelines encontradas**: `CLAUDE.md` (seções *Os guardas*, *Convenções* e *Estado conhecido /
> dívidas*), `apps/{store,backoffice}/vitest.config.ts`, `packages/core/vitest.config.ts`,
> `tools/catalog-import/vitest.config.ts`, `turbo.json`. Nenhum threshold de cobertura configurado —
> o padrão do projeto é **teste que lê o fonte do disco, com âncora de contagem**, e é ele que vale
> aqui.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura compartilhada (`packages/core/src/{routes,menu}`) | unit | Todos os ramos; 1:1 com as ACs; **lista enumerada tem uma asserção por elemento** (`L-010`) | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Regra pura da loja (`entities/*/lib`, `shared/lib`) | unit | Todos os ramos; uma linha da tabela de regras do design = um teste | `apps/store/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Hook de dados (`entities/*/api`) | unit | Caminho feliz + caminho de erro + **prova de que a consulta extra NÃO dispara** no caminho normal | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Página / rota (`pages`, `app/App.tsx`) | unit (RTL + `MemoryRouter`) | Toda rota que a task acrescenta: monta certo + redirect + 404 | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| **Guarda de arquivo do disco** (`shared/lib/__tests__`) | unit | **Âncora dupla obrigatória** — arquivo lido não-vazio **E** nº de itens encontrados; a régua nunca é o objeto medido | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| UI de formulário (backoffice `features/*`) | unit (RTL) | Aceite + recusa + **`onSave` não chamado** na recusa | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Mapeamento/escrita do importador | unit | Todos os ramos; lista curada asserida elemento a elemento; fixture cobre o caso de borda | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| Migration / schema | none — build gate | Sem teste de unidade; **prova é probe HTTP contra o banco local** (`AD-012`: tipo escrito à mão é afirmação, não verificação) | `supabase/migrations/*.sql` | `supabase db reset` + `curl` registrado no `Done when` |
| Config de host (`vercel.json`) | none como config — **coberto pelo guarda que o lê do disco** | O guarda mora na mesma task da config | `apps/store/vercel.json` | `pnpm --filter @estrelinha/store test` |
| Documentação (`CLAUDE.md`, `.specs/**`) | none | — | — | build gate |

## Gate Check Commands

> Gerada do codebase — confirmar antes do Execute.

| Gate Level | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Depois de task com teste de unidade num workspace só | `pnpm --filter @estrelinha/<workspace> test` |
| **Full** | Depois de task que cruza workspace ou mexe em tipo | `pnpm --filter @estrelinha/<workspace> test` **e** `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **Build** | Fecho de fase e fecho da feature | `turbo run test --force` (capturar o exit code **de verdade** — `\| tail` devolve o do `tail`) · `pnpm lint` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` · idem `apps/backoffice` · `npx tsc --noEmit -p tools/catalog-import/tsconfig.json` |

**Baseline a bater (fecho da `21`, `CLAUDE.md`):**

| | valor |
| --- | ---: |
| Testes | **3.445** em 200 arquivos — store 1153 · backoffice 1055 · core 725 · functions 258 · catalog-import 254 |
| Lint | 30 erros / 8 warnings — o gate é **"sem erros novos"** |
| Tipos | store 0 · backoffice 0 · catalog-import 0 — **zero é a baseline** |

**`packages/core/src/payment/**` não pode mudar de resultado.** O crescimento esperado de `core` vem
de `routes/` e `menu/`; o número do dinheiro é conferido à parte no fecho.

---

## Execution Plan

Fases são ordenadas e rodam em sequência; dentro da fase, as tasks rodam em ordem.

### Fase 1 · A regra, em core

```
T1 → T2
```

### Fase 2 · Endereçamento na loja

```
T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10
```

### Fase 3 · Os guardas

```
T11 → T12
```

### Fase 4 · Backoffice

```
T13 → T14 → T15
```

### Fase 5 · Redirect de categoria (SEO-02)

```
T16 → T17 → T18
```

### Fase 6 · Importador e documentação

```
T19 → T20
```

---

## Task Breakdown

### T1: `@estrelinha/core/routes` — o módulo de endereçamento

**What**: O módulo puro que passa a ser a única fonte das regras de URL da loja.
**Where**: `packages/core/src/routes/{routes.ts,index.ts}` · `packages/core/src/routes/__tests__/routes.test.ts` · export `"./routes"` em `packages/core/package.json`
**Depends on**: None
**Reuses**: nada — módulo deliberadamente sem dependência, para poder ser lido pelos guardas
**Requirement**: `URL-01`, `URL-02`, `URL-05`, `URL-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ROUTE_SLUGS` = `produtos · produto · colecao · categoria · carrinho · pedido · busca · sobre · politicas · conta · favoritos · entrar · checkout`
- [ ] `INFRA_SLUGS` = `assets · api · _vercel`, e o comentário diz por que **não** aparecem no `App.tsx`
- [ ] `RESERVED_SLUGS` = união das duas, sem duplicata
- [ ] `isReservedSlug` normaliza caixa e espaço nas bordas antes de comparar
- [ ] `reservedSlugRefusal(slug)` devolve **`string | null`** — nunca união discriminada por booleano (`strictNullChecks: false` não estreita; `CLAUDE.md`)
- [ ] `productPath('x') === '/produtos/x'`
- [ ] `categoryPath('x') === '/x'` · `categoryPath('x','pai') === '/pai/x'` · `parentSlug` `null`/`''` cai na forma de um segmento
- [ ] `LEGACY_REDIRECTS` = `[/produto/:slug → /produtos/:slug, /colecao/:slug → /:slug, /categoria/:slug → /:slug]`
- [ ] **`ROUTE_SLUGS`, `INFRA_SLUGS` e `LEGACY_REDIRECTS` asseridos elemento a elemento** — AC que enumera lista precisa de um item de verificação por elemento
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` segue em 0
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(rotas): fonte unica das URLs da loja em @estrelinha/core/routes`

---

### T2: `categoryHref` — o href com o pai resolvido

**What**: A única função que transforma uma categoria da árvore em URL canônica, e a troca dos
literais `/colecao/` de `menu.ts` por ela.
**Where**: `packages/core/src/menu/menu.ts` · `packages/core/src/menu/__tests__/menu.test.ts`
**Depends on**: T1
**Reuses**: `ancestorsOf` (já em `menu.ts` — a subida da cadeia de pais é única no projeto), `categoryPath` (T1)
**Requirement**: `URL-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `categoryHref(categories, id)`: raiz ⇒ `/slug`; filha ⇒ `/pai/slug`
- [ ] Árvore de **3 níveis** ⇒ `/pai-imediato/slug` — nunca três segmentos (a canônica tem no máximo dois)
- [ ] `id` inexistente ⇒ `/`, sem lançar
- [ ] Categoria com `parent_id` apontando para categoria **ausente da lista** ⇒ forma de um segmento
- [ ] `menuEntries()[].href` e `resolvePromo().href` passam a usar `categoryHref`
- [x] **Zero ocorrência do literal `/colecao/` em `packages/core/src/menu`** (comentários incluídos, atualizados). **`routes/` é a exceção declarada**: lá a forma legada existe como **dado** (`LEGACY_REDIRECTS`), que é o ponto do módulo — a varredura vale contra a regra reescrita à mão, não contra a lista que a substitui. Redação ajustada na verificação (2026-08-09): o critério original dizia `packages/core/src` inteiro e teria proibido a própria entrega.
- [ ] Os testes de `menu` existentes seguem passando com os hrefs novos
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(menu): href de categoria pela arvore, no formato canonico`

---

### T3: `resolveCategoryRoute` — a decisão pura da página de categoria

**What**: A função que, dadas as partes da URL e a árvore, devolve conteúdo, redirect ou 404.
**Where**: `apps/store/src/entities/category/lib/resolveCategoryRoute.ts` · `__tests__/resolveCategoryRoute.test.ts` · barrel `entities/category/index.ts`
**Depends on**: T1
**Reuses**: `categoryPath` (T1), `ancestorsOf` (`@estrelinha/core/menu`)
**Requirement**: `URL-03`, `URL-04`, `SEO-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Discriminante é **literal de string** (`'ok' | 'redirect' | 'notfound'`), nunca booleano
- [ ] **Um teste por linha da tabela de regras do `design.md`** — as 6:
      raiz ⇒ `ok`; filha sem pai na URL ⇒ `ok` com canônica de dois segmentos (**resolve, não
      redireciona**); filha com pai certo ⇒ `ok`; filha com pai **errado** ⇒ `redirect` para a
      canônica; slug desconhecido com `redirectTo` válido ⇒ `redirect`; resto ⇒ `notfound`
- [ ] `redirectTo` apontando para categoria ausente da lista ⇒ `notfound` (não `redirect` para lugar nenhum)
- [ ] Categoria inativa não chega na lista (a RLS filtra) — teste declara isso e prova `notfound`
- [ ] `slug` vazio ⇒ `notfound`, sem lançar
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): resolucao de rota de categoria como regra pura`

---

### T4: `useCanonical` — a tag canônica

**What**: O hook que mantém um único `<link rel="canonical">` no `<head>`.
**Where**: `apps/store/src/shared/lib/useCanonical.ts` · `__tests__/useCanonical.test.tsx`
**Depends on**: None
**Reuses**: nada
**Requirement**: `URL-01`, `URL-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cria a tag quando não existe; **atualiza** a existente quando o path muda
- [ ] `href` é absoluto, resolvido a partir de `window.location.origin`
- [ ] `null` não cria tag nenhuma
- [ ] **Remove no unmount** — teste prova que navegar de uma página com canônica para outra sem canônica não deixa a anterior no `<head>`
- [ ] **Nunca há duas tags `rel="canonical"`** — teste com duas montagens em sequência
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): tag canonica por pagina`

---

### T5: `useProducts` — `enabled` e slug desconhecido

**What**: Fechar o caminho pelo qual toda URL errada baixaria o catálogo inteiro.
**Where**: `apps/store/src/entities/product/api/useProducts.ts` · `__tests__/useProducts.test.tsx`
**Depends on**: None
**Reuses**: `ProductQueryError` e o padrão `enabled` que `useAllProducts` já usa no mesmo arquivo
**Requirement**: `URL-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `useProducts(slug?, options?: { enabled?: boolean })`; `enabled: false` **não dispara consulta nenhuma**
- [ ] Slug informado que não casa com categoria ⇒ **`[]`**, e o teste prova que o `select` do catálogo completo **não** foi chamado
- [ ] `useProducts()` **sem** slug segue devolvendo o catálogo inteiro (comportamento usado por outras telas — teste de regressão)
- [ ] Roll-up da descendência intacto (`descendantIds`) — teste existente segue verde
- [ ] O comentário de `useProducts.ts:38` é **reescrito**, não apagado: registra que a virada é de `URL-04` e por que o comportamento anterior existia
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `fix(loja): slug desconhecido nao baixa mais o catalogo inteiro`

---

### T6: `CategoryPage` nas três rotas

**What**: A página passa a montar em `/:slug`, `/:parentSlug/:slug` e nas formas legadas, com 404
próprio e canônica.
**Where**: `apps/store/src/pages/CategoryPage.tsx` · `apps/store/src/pages/__tests__/CategoryPage.test.tsx` (novo)
**Depends on**: T3, T4, T5
**Reuses**: `useCategories` (já cacheada pelo header em toda rota), `NotFound`, o guarda de `isFetching` de `ProductPage.tsx:50`
**Requirement**: `URL-03`, `URL-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lê `slug` **e** `parentSlug` de `useParams`; resolve por `resolveCategoryRoute`
- [ ] `kind: 'redirect'` ⇒ `<Navigate to replace />`
- [ ] `kind: 'notfound'` ⇒ **`<NotFound />`** — o bloco "Coleção não encontrada" deixa de existir
- [ ] **Guarda de carregamento antes do 404**: com a consulta correndo, renderiza container `aria-busy` — teste prova que o 404 **não** pisca
- [ ] `useCanonical(canonical)`: raiz ⇒ `/slug`; filha aberta por um segmento ⇒ canônica de **dois**
- [ ] `useProducts` só habilitado quando `kind === 'ok'`
- [ ] Prop `legacy` ⇒ navega para o destino de `LEGACY_REDIRECTS` em vez de renderizar
- [ ] Filtros, sheet e grade seguem funcionando (testes existentes de `category-filters` verdes)
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): categoria na raiz do dominio, com 404 propria`

---

### T7: `ProductPage` — caminho novo, 404 própria, canônica

**What**: A página do produto passa a viver em `/produtos/:slug` e a usar o 404 do projeto.
**Where**: `apps/store/src/pages/ProductPage.tsx` · `apps/store/src/pages/__tests__/ProductPage.test.tsx`
**Depends on**: T1, T4
**Reuses**: `useProduct` (`product_redirects` já resolvido — PST-07), `NotFound`, `productPath` (T1)
**Requirement**: `URL-01`, `URL-02`, `URL-04`, `SEO-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O `<Navigate>` de slug antigo usa `productPath(product.slug)`
- [ ] Produto inexistente ⇒ **`<NotFound />`**; o bloco "Produto não encontrado" deixa de existir
- [ ] O guarda de `isFetching` **continua antes** do 404 (regressão: era o defeito que ele já evitava)
- [ ] `useCanonical(productPath(product.slug))`
- [ ] Teste de PST-07 atualizado: `/produto/sailor-moon-antigo` ⇒ `/produtos/<slug atual>`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): produto em /produtos/:slug, com canonica e 404 propria`

---

### T8: `App.tsx` — a tabela de rotas

**What**: As rotas do `design.md`, mais o teste que prova o ranqueamento do React Router.
**Where**: `apps/store/src/app/App.tsx` · `apps/store/src/app/__tests__/routing.test.tsx` (novo)
**Depends on**: T6, T7
**Reuses**: `LEGACY_REDIRECTS` (T1), `StoreLayout`, `NotFound`
**Requirement**: `URL-01`, `URL-02`, `URL-03`, `URL-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `/produtos/:slug` monta `ProductPage`
- [ ] `/produto/x` ⇒ `/produtos/x` · `/colecao/x` ⇒ `/x` · `/categoria/x` ⇒ `/x` (espelho de `LEGACY_REDIRECTS`, um teste por entrada)
- [ ] `/:slug` e `/:parentSlug/:slug` montam `CategoryPage`
- [ ] **Segmento estático vence dinâmico**: `/conta` monta `AccountPage` e **não** `CategoryPage` — teste explícito, porque é a armadilha que `AD-018` descreve
- [ ] `/pedido/abc` monta a confirmação e não `CategoryPage`
- [ ] `/a/b/c` (três segmentos) cai em `NotFound`
- [ ] `/checkout` segue **fora** do `StoreLayout`
- [ ] Comentário no arquivo registra que o ranqueamento é por especificidade e **não** pela ordem das linhas
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): tabela de rotas no formato indexado (AD-018)`

---

### T9: Todo link de **produto** passa por `productPath`

**What**: Varredura mecânica: nenhum literal `/produto/` sobra na loja.
**Where**: `entities/product/ui/ProductCard.tsx` · `features/search/ui/{SearchDropdown,SearchOverlay}.tsx` · `widgets/cart-drawer/ui/{CartDrawerRow,CrossSell}.tsx` · `widgets/header/ui/MegaMenu.tsx` · `shared/lib/storeChrome.ts` · `widgets/whatsapp-float/ui/WhatsAppFloat.tsx` + os testes desses arquivos
**Depends on**: T1
**Reuses**: `productPath` (T1)
**Requirement**: `URL-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os 8 arquivos usam `productPath`; **zero literal `/produto/`** em `apps/store/src` fora do redirect legado do `App.tsx`
- [ ] `ownsBottomBar('/produtos/x') === true` e `ownsBottomBar('/produto/x') === false` — a barra de compra segue sendo a única do rodapé na página do produto
- [ ] `WhatsAppFloat` continua escondido na página do produto, agora pelo prefixo novo
- [ ] `storeChrome.test.ts` atualizado, mantendo a asserção de que **uma barra por vez** vale
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(loja): links de produto pelo construtor unico`

---

### T10: Todo link de **categoria** passa por `categoryHref`

**What**: Varredura das superfícies de categoria — que, ao contrário da de produto, precisa da árvore
para resolver o pai.
**Where**: `features/search/ui/SearchOverlay.tsx` · `widgets/header/ui/MegaMenu.tsx` · `widgets/footer/ui/Footer.tsx` · `widgets/category-grid/ui/CategoryGrid.tsx` · `widgets/home-sections/ui/TrendingTags.tsx` · `widgets/mobile-menu/ui/MobileMenu.tsx` · `widgets/related-products/ui/RelatedProducts.tsx` + os testes desses arquivos
**Depends on**: T2
**Reuses**: `categoryHref` (T2); as listas de categoria que cada componente já recebe
**Requirement**: `URL-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os 7 arquivos usam `categoryHref`; **zero literal `/colecao/`** em `apps/store/src` fora do redirect legado do `App.tsx`
- [ ] `RelatedProducts` recebe a categoria (ou a árvore) em vez de só o slug — sem isso não tem como montar a canônica de uma filha
- [ ] Teste prova que o link de uma **subcategoria** no `MegaMenu` e no `MobileMenu` sai com **dois segmentos**
- [ ] Teste prova que o link de uma **raiz** no `Footer`/`CategoryGrid` sai com **um** segmento
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(loja): links de categoria no formato canonico`

---

### T11: `vercel.json` — 301 no edge, e o guarda que o lê do disco

**What**: A configuração de host e o teste que a prende a `LEGACY_REDIRECTS`, na mesma task — config
sem guarda é código não verificado.
**Where**: `apps/store/vercel.json` · `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts` (novo)
**Depends on**: T1
**Reuses**: `LEGACY_REDIRECTS` (T1); o padrão de guarda que lê arquivo do disco (`navItems.test.ts`, `palette.test.ts`)
**Requirement**: `URL-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `redirects` tem uma entrada por `LEGACY_REDIRECTS`, com **`statusCode: 301`** — nunca `permanent: true`, que produz 308, e os dois campos não coexistem
- [ ] `trailingSlash: false`
- [ ] O `rewrites` do SPA e os `headers` existentes ficam **intactos**
- [ ] O guarda lê `apps/store/vercel.json` **do disco** com caminho literal (a régua não é o objeto medido)
- [ ] **Âncora dupla**: o arquivo lido tem conteúdo **e** o nº de redirects encontrados é igual ao de `LEGACY_REDIRECTS` — sem isso um caminho errado varre zero e passa em silêncio
- [ ] Uma asserção por entrada: `source`, `destination` e `statusCode === 301`
- [ ] Asserção de que **nenhum** redirect usa `permanent`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): 301 das URLs legadas no edge, com guarda de configuracao`

---

### T12: `reservedSlugs.test.ts` — o guarda bidirecional entre rotas e lista

**What**: O teste que quebra quando uma rota nova não entra na lista de reservadas — e quando a lista
guarda uma entrada que não é rota nenhuma.
**Where**: `apps/store/src/shared/lib/__tests__/reservedSlugs.test.ts` (novo)
**Depends on**: T1, T8
**Reuses**: `ROUTE_SLUGS` / `INFRA_SLUGS` (T1); o molde de `navItems.test.ts`, que lê o `App.tsx` do disco
**Requirement**: `URL-06`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lê `apps/store/src/app/App.tsx` do disco, por caminho **literal**
- [ ] **Âncora dupla**: o arquivo contém `<Routes>` **e** o nº de `path=` encontrados é ≥ 15
- [ ] Todo primeiro segmento **estático** das rotas ∈ `ROUTE_SLUGS`
- [ ] Toda entrada de `ROUTE_SLUGS` aparece como primeiro segmento de alguma rota — **bidirecional**, para a lista não envelhecer com entrada morta
- [ ] `INFRA_SLUGS` explicitamente **fora** da comparação com o `App.tsx`, com asserção elemento a elemento e o motivo escrito
- [ ] Rota dinâmica (`/:slug`) e splat (`*`) são ignorados, e o teste declara isso
- [ ] Um teste negativo prova que o guarda **pega**: um `App.tsx` sintético com `path="/ajuda"` reprova
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `test(loja): guarda bidirecional entre rotas e slugs reservados`

---

### T13: Recusa de slug reservado no cadastro de categoria

**What**: `URL-05` — o slug que encobriria uma rota é recusado **no formulário**, nas duas
superfícies.
**Where**: `apps/backoffice/src/features/category-form/ui/CategoryFormDialog.tsx` (+ `.test.tsx`) · `apps/backoffice/src/features/category-list/ui/CategoryInspector.tsx` (+ `.test.tsx`)
**Depends on**: T1
**Reuses**: `reservedSlugRefusal` (T1)
**Requirement**: `URL-05`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O submit é bloqueado nas **duas** superfícies quando o slug é reservado
- [ ] A mensagem **mostra a lista** de palavras reservadas — a AC diz "com a lista visível"
- [ ] O caminho do slug **derivado do nome** também é coberto: digitar `Sobre` produz `sobre` e é recusado (é o caminho que a Adri usaria sem saber que existe um campo de slug)
- [ ] `onSave` **não é chamado** na recusa — asserção explícita, não só ausência de erro
- [ ] Slug livre continua salvando (teste de regressão nas duas telas)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): categoria com slug reservado e recusada no cadastro`

---

### T14: O prefixo de URL que o inspetor mostra passa a ser o real

**What**: O inspetor exibe hoje `/categoria/`, endereço que **nunca existiu** nesta loja.
**Where**: `apps/backoffice/src/features/category-list/ui/CategoryInspector.tsx` (+ `.test.tsx`)
**Depends on**: T2, T13
**Reuses**: `categoryHref` (T2)
**Requirement**: `URL-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Categoria **raiz** mostra o prefixo `umaestrelinha.com.br/`
- [ ] Categoria **filha** mostra `umaestrelinha.com.br/<slug do pai>/`
- [ ] Trocar o pai no `<select>` atualiza o prefixo sem salvar
- [ ] **Zero ocorrência de `/categoria/`** em `apps/backoffice/src`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick
**Commit**: `fix(admin): inspetor de categoria mostra a URL publica real`

---

### T15: `/produto/` → `/produtos/` no backoffice

**What**: As três superfícies que escrevem a URL da loja, mais um link que hoje aponta para uma rota
que não existe no painel.
**Where**: `features/product-form/lib/storeUrl.ts` · `features/product-form/ui/{SeoPreview,SlugField}.tsx` (+ `SlugField.test.tsx`) · `features/abandoned-cart-detail/ui/AbandonedCartDetailDialog.tsx` (+ teste)
**Depends on**: T1
**Reuses**: `productPath` (T1)
**Requirement**: `URL-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `storeUrl` monta o caminho com `productPath`
- [ ] `STORE_URL_PREFIX === 'umaestrelinha.com.br/produtos/'`, e `SeoPreview` mostra o mesmo
- [ ] `AbandonedCartDetailDialog` deixa de usar `<Link to="/produto/…">` — rota que **não existe no roteador do admin**, então o link cai no 404 do painel hoje — e passa a `<a href={storeUrl(...)} target="_blank" rel="noreferrer">`
- [ ] Teste prova que o link abre a **loja**, não uma rota interna
- [ ] **Zero literal `/produto/`** em `apps/backoffice/src`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick
**Commit**: `fix(admin): URL de produto no formato publicado`

---

### T16: Migration `category_redirects`

**What**: A tabela que faltava — só produto tinha redirect de slug.
**Where**: `supabase/migrations/20260810120000_category-redirects.sql`
**Depends on**: None
**Reuses**: `product_redirects` (`20260801120300`) como forma; as policies de `20260801120400` como molde de RLS
**Requirement**: `SEO-02`

**Tools**: MCP: NONE · Skill: `supabase` (se necessário para checar sintaxe/RLS)

**Done when**:
- [ ] `from_slug text primary key` · `category_id uuid not null references categories(id) on delete cascade` · `created_at`
- [ ] Índice em `category_id`
- [ ] RLS: `SELECT USING (true)` (a loja resolve **sem sessão**) e `FOR ALL TO authenticated` com `has_role(auth.uid(),'admin')`
- [ ] `COMMENT ON TABLE` explicando o `CASCADE` e a precedência categoria-viva-vence-redirect
- [ ] `supabase db reset` aplica sem erro
- [ ] **Probe HTTP registrado** (`AD-012` — a prova de que grava é gravar): insert com service role, `select` anônimo devolve a linha, `insert` anônimo é recusado. O comando e a saída vão para o `validation.md`
- [ ] Migration **nova**, não reescrita de existente — `AD-017` permite reescrever para desfazer dívida, não para acomodar tabela nova

**Tests**: none (schema — build gate + probe) · **Gate**: build
**Commit**: `feat(db): category_redirects para slug antigo de categoria`

---

### T17: `persistCategoryRedirect` — a escrita no save

**What**: Editar o slug de uma categoria passa a registrar o anterior.
**Where**: `apps/backoffice/src/features/category-list/model/persistCategoryRedirect.ts` (+ `__tests__`) · wiring no save de `CategoryInspector` / `useAdminCategories`
**Depends on**: T16
**Reuses**: `persistRedirect.ts` como molde exato, inclusive a regra AC 9
**Requirement**: `SEO-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Mesmos vereditos do molde: `unchanged` · `empty` · `error` · `written`
- [ ] **O slug que passa a ser ativo é removido de `category_redirects`** — senão a mesma URL seria categoria e redirect ao mesmo tempo, e a resolução dependeria da ordem da consulta
- [ ] `upsert` com `onConflict: 'from_slug'` — renomear, voltar atrás e renomear de novo não estoura a PK
- [ ] Falha da escrita do redirect **não** derruba o save da categoria (devolve `error`, a tela avisa)
- [ ] **Probe HTTP registrado**: editar o slug pelo admin grava a linha esperada
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): slug antigo de categoria vira redirect no save`

---

### T18: A loja resolve `category_redirects`

**What**: A leitura do redirect, só quando o slug não é categoria viva.
**Where**: `apps/store/src/entities/category/api/useCategoryRedirect.ts` (+ `__tests__`) · `pages/CategoryPage.tsx`
**Depends on**: T3, T6, T16
**Reuses**: o padrão de `useProduct.ts` — a consulta do redirect só acontece **depois** de o slug falhar
**Requirement**: `SEO-02`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A consulta de `category_redirects` **não dispara** quando o slug casa com categoria viva — asserção explícita sobre as chamadas, igual à de `useProduct.test.tsx:164`
- [ ] Hit ⇒ `resolveCategoryRoute` devolve `redirect` para a **canônica** do destino (dois segmentos, se filha)
- [ ] Destino apagado ou inativo ⇒ `notfound`, nunca navegação para lugar nenhum
- [ ] Sem hit ⇒ `notfound`
- [ ] Redirect resolvido não entra em laço: depois de navegar, o slug casa com categoria viva
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): slug antigo de categoria resolve pela tabela de redirect`

---

### T19: `CURATED_EXCLUDED` no importador

**What**: Brinquedos (`nanita`) e Rastreio deixam de ser importadas — decisão do usuário em
2026-08-09.
**Where**: `tools/catalog-import/src/map/category.ts` (+ `__tests__/category.test.ts`) · `write/categories.ts` (+ `__tests__`) · `report.ts` (+ `__tests__`)
**Depends on**: None
**Reuses**: `CURATED_INACTIVE` como molde; `selectAll` (leitura paginada) no writer
**Requirement**: curadoria — decisão do usuário, fora da tabela de rastreabilidade da spec

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CURATED_EXCLUDED` com `32509753` (Brinquedos) e `32697621` (Rastreio), **chaveada por `nuvemshop_id`** — e o comentário repete os dois motivos: slug muda na origem, e um destes slugs **é a marca anterior**, que não pode ser plantada em código novo
- [ ] Asserção **elemento a elemento** da lista
- [ ] `CURATED_INACTIVE` fica com `35119124` (Black Friday) e `34729760` (Profissões), também asseridos elemento a elemento
- [ ] `mapCategories` **não emite** as linhas excluídas
- [ ] Teste prova que **nenhuma filha pende** das excluídas na fixture — se pendesse, `parentOf` a promoveria a raiz em silêncio
- [ ] `writeCategories` **apaga** a linha existente cujo `nuvemshop_id` esteja na lista, e reporta
- [ ] Relatório ganha `categorias excluídas por curadoria`, **separado** de `categorias desativadas por curadoria`
- [ ] `brandScan.test.ts` segue verde — a string da marca anterior não aparece em código
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(catalogo): categorias excluidas por curadoria no importador`

---

### T20: Baselines e documentação

**What**: O que o próximo a sentar precisa saber, e os números medidos.
**Where**: `CLAUDE.md` · `.specs/STATE.md` · `.specs/features/23-urls-e-seo/spec.md` (rastreabilidade) · `.specs/BACKLOG.md`
**Depends on**: T1–T19
**Reuses**: —
**Requirement**: —

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CLAUDE.md` registra: o formato de URL (`/produtos/:slug`, `/:slug`, `/:pai/:filha`), que **namespace de rota e de slug de categoria é o mesmo**, `@estrelinha/core/routes` como fonte única, e a barra final
- [ ] `CLAUDE.md` · tabela **"Os guardas"** ganha `reservedSlugs.test.ts` e `vercelRedirects.test.ts`, com o que cada um derruba
- [ ] `CLAUDE.md` atualiza o parágrafo do resíduo da marca anterior: a categoria `nanita` **não é mais importada**; o catálogo passa de 39 para **37** categorias
- [ ] Baselines de **teste, lint e tipos** atualizadas com o número **medido** por `turbo run test --force` (exit code capturado de verdade)
- [ ] `STATE.md` · handoff novo; `AD-018` marcado como **implementado por esta feature**
- [ ] Tabela de rastreabilidade da spec: `URL-01..06`, `SEO-01`, `SEO-02` em `Done`
- [ ] `BACKLOG.md`: sitemap e dados estruturados registrados como o passo seguinte (a spec os põe fora de escopo justamente até o endereçamento fechar)
- [ ] Gate: build completo

**Tests**: none (docs) · **Gate**: build
**Commit**: `docs(urls): baselines, guardas e handoff da feature 23`

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6

Fase 1:  T1 ──→ T2
Fase 2:  T3 ──→ T4 ──→ T5 ──→ T6 ──→ T7 ──→ T8 ──→ T9 ──→ T10
Fase 3:  T11 ──→ T12
Fase 4:  T13 ──→ T14 ──→ T15
Fase 5:  T16 ──→ T17 ──→ T18
Fase 6:  T19 ──→ T20
```

Execução é estritamente sequencial — não há paralelismo dentro da fase.

**Empacotamento previsto** (~7 tasks por worker, fases inteiras, nunca partidas):

| Lote | Fases | Tasks |
| --- | --- | ---: |
| 1 | Fase 1 + Fase 2 | 10 |
| 2 | Fase 3 + Fase 4 | 5 |
| 3 | Fase 5 + Fase 6 | 5 |

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo puro | ✅ Granular |
| T2 | 1 função + os 2 chamadores no mesmo arquivo | ✅ Granular |
| T3 | 1 função pura | ✅ Granular |
| T4 | 1 hook | ✅ Granular |
| T5 | 1 hook (modificação) | ✅ Granular |
| T6 | 1 página | ✅ Granular |
| T7 | 1 página | ✅ Granular |
| T8 | 1 arquivo de rotas | ✅ Granular |
| T9 | 8 arquivos, **1 substituição mecânica** por `productPath` | ⚠️ Coeso — partir por arquivo produziria 8 commits do mesmo `sed` |
| T10 | 7 arquivos, **1 conceito** (href com pai resolvido) | ⚠️ Coeso — `RelatedProducts` é o único com trabalho real, e depende da mesma decisão |
| T11 | 1 config + o guarda dela | ⚠️ Coeso — separar deixaria a config sem verificação (proibido pela regra de co-locação) |
| T12 | 1 teste | ✅ Granular |
| T13 | 1 regra em 2 formulários | ⚠️ Coeso — cobrir só um deixa metade dos caminhos abertos, então não são duas entregas |
| T14 | 1 componente | ✅ Granular |
| T15 | 1 substituição mecânica em 4 arquivos | ⚠️ Coeso |
| T16 | 1 migration | ✅ Granular |
| T17 | 1 função + wiring | ✅ Granular |
| T18 | 1 hook + o consumo dele | ✅ Granular |
| T19 | 1 lista + os 2 pontos que a leem | ✅ Granular |
| T20 | documentação | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | início da Fase 1 | ✅ |
| T2 | T1 | `T1 → T2` | ✅ |
| T3 | T1 | Fase 1 → Fase 2 (fase anterior) | ✅ |
| T4 | None | dentro da Fase 2, sem dependência para trás | ✅ |
| T5 | None | dentro da Fase 2, sem dependência para trás | ✅ |
| T6 | T3, T4, T5 | `T3 → T4 → T5 → T6` | ✅ |
| T7 | T1, T4 | Fase 1 → Fase 2; `T4 → … → T7` | ✅ |
| T8 | T6, T7 | `T6 → T7 → T8` | ✅ |
| T9 | T1 | Fase 1 → Fase 2 | ✅ |
| T10 | T2 | Fase 1 → Fase 2 | ✅ |
| T11 | T1 | Fase 1 → Fase 3 | ✅ |
| T12 | T1, T8 | Fase 1 → Fase 3; Fase 2 → Fase 3 | ✅ |
| T13 | T1 | Fase 1 → Fase 4 | ✅ |
| T14 | T2, T13 | Fase 1 → Fase 4; `T13 → T14` | ✅ |
| T15 | T1 | Fase 1 → Fase 4 | ✅ |
| T16 | None | início da Fase 5 | ✅ |
| T17 | T16 | `T16 → T17` | ✅ |
| T18 | T3, T6, T16 | Fase 2 → Fase 5; `T16 → T17 → T18` | ✅ |
| T19 | None | início da Fase 6 | ✅ |
| T20 | T1–T19 | todas as fases anteriores | ✅ |

Nenhuma task depende de task em fase posterior.

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura compartilhada | unit | unit | ✅ |
| T2 | Regra pura compartilhada | unit | unit | ✅ |
| T3 | Regra pura da loja | unit | unit | ✅ |
| T4 | Regra pura da loja (`shared/lib`) | unit | unit | ✅ |
| T5 | Hook de dados | unit | unit | ✅ |
| T6 | Página / rota | unit | unit | ✅ |
| T7 | Página / rota | unit | unit | ✅ |
| T8 | Página / rota | unit | unit | ✅ |
| T9 | Página/UI + regra pura (`storeChrome`) | unit | unit | ✅ |
| T10 | Página/UI | unit | unit | ✅ |
| T11 | Config de host **+ guarda de disco** | unit (o guarda mora na mesma task) | unit | ✅ |
| T12 | Guarda de disco | unit | unit | ✅ |
| T13 | UI de formulário | unit | unit | ✅ |
| T14 | UI de formulário | unit | unit | ✅ |
| T15 | UI + regra pura | unit | unit | ✅ |
| T16 | Migration / schema | none — build gate + probe | none | ✅ |
| T17 | Regra pura + escrita | unit | unit | ✅ |
| T18 | Hook de dados | unit | unit | ✅ |
| T19 | Mapeamento/escrita do importador | unit | unit | ✅ |
| T20 | Documentação | none | none | ✅ |

Nenhuma task produz código sem verificação. `T11` e `T16` são as únicas de camada "config/schema", e
as duas carregam a própria prova — guarda de disco e probe HTTP, respectivamente.

---

## Verificação de fecho (`validation.md`)

O Success Criteria da spec diz "medida com `curl` + `canonical`". **A medição precisa ser partida em
duas**, porque a loja é SPA sem SSR e a tag canônica é injetada por JS:

| O que se mede | Como | Onde |
| --- | --- | --- |
| Status e `Location` dos 301/308 | `curl -I` contra `vercel dev` ou a configuração lida do disco | `vercelRedirects.test.ts` + roteiro manual |
| Página resolve, não é tela branca | `vite preview` + navegador headless | Skill `playwright-cli` |
| Tag canônica | DOM renderizado, **não** `curl` — `curl` não executa JS | Skill `playwright-cli` |
| Gravação em `category_redirects` | probe HTTP contra o banco local | `AD-012` |

**O que fica por medir e é declarado, não escondido**: não há projeto Vercel da Uma Estrelinha
(`C-08`), então os 301 se provam pela configuração e pelo espelho no router, nunca contra o domínio
em produção. A virada é operação.
