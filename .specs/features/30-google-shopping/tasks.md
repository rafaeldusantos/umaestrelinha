# Google Shopping — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a Skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo de Execute e
as Critical Rules dela.** Não procure os arquivos da Skill por caminho de filesystem.

**Se a Skill não puder ser ativada, PARE e avise — não prossiga sem ela.**

### ⚠️ Sobrescrita do projeto: commits

O `CLAUDE.md` deste repositório **sobrepõe** a regra de "um commit atômico por task":

> **Não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a conclusão e
> gerar os commits completos da implementação de uma vez.

Isso é decisão do usuário de 2026-08-15 que **fechou a `BL-012`**, e vale da feature `25` em diante.
Portanto: nenhum `Done when` abaixo pede commit, e nenhuma task deve commitar. Os commits saem no
fecho, de uma vez. Todo o resto do contrato de Execute continua valendo — gate por task, teste
derivado da AC, nada de afrouxar asserção.

---

**Design**: `.specs/features/30-google-shopping/design.md`
**Spec**: `.specs/features/30-google-shopping/spec.md`
**Status**: Done — T0..T25 concluidas, gate verde, validation.md escrito

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes de Execute.
> Diretrizes encontradas: **`CLAUDE.md`** (seções *Os guardas — o que trava o quê* e *Estado
> conhecido / dívidas*), `vitest.config.ts` de cada workspace, `turbo.json`.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Domínio puro (`packages/core/src/shopping/**`) | unit | Todos os ramos; 1:1 com as ACs; **todo edge case listado na spec tem caso** | `packages/core/src/shopping/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Handler de edge function (`supabase/functions/*/handlers.ts`) | integration (deps injetadas, `AD-004`) | Caminho feliz + **todos** os caminhos de erro da tabela de *Error Handling* | `supabase/functions/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Wiring de edge function (`index.ts`) | none | Só env + `Deno.serve`; o gate é o build | — | build |
| UI da loja (`pages/`, `entities/`) | unit (RTL) | Cada AC da história; estado vazio e entrada inválida inclusos | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| UI do painel (`pages/admin/`, `features/`) | unit (RTL) | Cada AC da história; a transição destrutiva tem caso próprio | `apps/backoffice/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| **Guarda de fonte** (lê arquivo do disco) | unit | **Âncora de contagem obrigatória** — varredura que lê zero arquivo passa em silêncio, e é a pior falha possível deste tipo de teste | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Migration / schema | unit (guarda que lê o `.sql`) | Limites do TypeScript comparados com os números lidos do arquivo | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Importador | unit | Idempotência: segunda execução não sobrescreve curadoria | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |

## Gate Check Commands

> Gerados do codebase — confirmar antes de Execute.

| Nível | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Task que mexe em um workspace só | `pnpm --filter <workspace> test` |
| **Full** | Task que cruza workspaces (core + function, core + loja) | `pnpm --filter @estrelinha/core test && pnpm --filter @estrelinha/functions test` (ajustar aos tocados) |
| **Build** | Fim de fase | `pnpm build && npx tsc --noEmit -p apps/store/tsconfig.app.json && npx tsc --noEmit -p apps/backoffice/tsconfig.app.json && pnpm lint && pnpm test` |

**Três armadilhas deste repositório, que valem para todo gate acima:**

1. **`pnpm build` não faz typecheck** — é `vite build` puro. Build verde não prova ausência de erro de
   tipo. O `tsc` tem de ser o `tsconfig.app.json`; o `tsconfig.json` de cada app é solution-style e
   compila zero arquivo. **Baseline de tipos: 0 em todos.**
2. **`pnpm test | tail` devolve o código de saída do `tail`**, não o do teste. Capturar o de verdade.
3. **Baseline de lint: 30 erros / 8 warnings** (backoffice 28/7 · store 2/1). O gate é *sem erros
   novos*, não *lint limpo*. E `pnpm lint` **não olha `packages/`** (`BL-002`) — `core/shopping`
   nasce sem ESLint, como o código de dinheiro.

**⚠️ A baseline de testes precisa ser remedida na T0.** O `CLAUDE.md` registra 5085/284 como fecho da
`28`, mas anota que o número do store foi medido **antes** de a feature `29-pagina-sobre` chegar à
árvore — e a `29` está na árvore agora, não commitada. Sem remedir, toda contagem de "N testes passam,
sem deleção silenciosa" nasce comparada contra um número errado.

---

## Execution Plan

Fases ordenadas, executadas em sequência; tasks dentro da fase, em ordem.

### Phase 0: Linha de base

```
T0
```

### Phase 1: O dono da oferta — `@estrelinha/core/shopping`

Domínio puro. Nada aqui importa React, Supabase ou DOM.

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Banco e configuração

```
T8 → T9
```

### Phase 3: A edge function do feed

```
T10 → T11
```

### Phase 4: A página servida

```
T12 → T13 → T14
```

### Phase 5: A loja lê o `?variant=`

```
T15 → T16 → T17
```

### Phase 6: O painel

```
T18 → T19 → T20 → T21 → T22
```

### Phase 7: Cadastro, importador e o P3

```
T23 → T24 → T25
```

---

## Task Breakdown

### ✅ T0: Remedir a linha de base

**What**: Registrar contagem de teste por workspace, erros de lint e erros de tipo **com a árvore de
hoje**, incluindo o que a `29` trouxe, e anotar no handoff.
**Where**: `.specs/STATE.md` (Handoff)
**Depends on**: None
**Reuses**: o procedimento de medição do `CLAUDE.md`
**Requirement**: — (pré-requisito de verificação de todas as demais)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Contagem de testes por workspace registrada (store, backoffice, core, functions, catalog-import)
- [ ] Contagem de erros/warnings de lint registrada por app
- [ ] `tsc --noEmit` registrado por app
- [ ] A divergência contra os 5085/284 do `CLAUDE.md` está **explicada**, não estimada
- [ ] `git diff --name-only` de `packages/core/src/payment/**` registrado como vazio (linha de partida)

**Tests**: none · **Gate**: build

---

### ✅ T1: `ShoppingOffer` e a identidade pública

**What**: Os tipos da oferta e as duas funções de identidade — `publicVariantId`, `publicProductId`.
**Where**: `packages/core/src/shopping/{types.ts,identity.ts,index.ts}`
**Depends on**: T0
**Reuses**: o molde de módulo puro de `packages/core/src/faq/block.ts`
**Requirement**: GSH-01, GSH-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `publicVariantId` devolve `nuvemshop_id` em decimal quando existe, e o UUID quando é nulo
- [ ] Caso medido travado: variação `nuvemshop_id = 1259936246` → `"1259936246"`; produto
      `281745761` → `"281745761"`
- [ ] `publicProductId` segue a mesma regra sobre `products`
- [ ] Nenhum import de React, Supabase ou DOM
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`
- [ ] Contagem de testes do core sobe; nenhuma some

**Tests**: unit · **Gate**: quick

---

### ✅ T2: `feedExclusion` — o motivo, não o booleano

**What**: A regra de inclusão do feed, devolvendo o **motivo** da exclusão ou `null`.
**Where**: `packages/core/src/shopping/eligibility.ts`
**Depends on**: T1
**Reuses**: `ProductVariant`/`Product` de `@estrelinha/supabase/types` (só tipos)
**Requirement**: GSH-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Devolve `null` para variação ativa, de produto ativo, com preço
- [ ] Devolve `'produto_inativo'`, `'variacao_inativa'` e `'sem_preco'` — um caso de teste cada
- [ ] Quando mais de um motivo se aplica, **a spec define qual vence** e o teste assere essa ordem
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T3: `offerPricing` e `offerAvailability`

**What**: O par preço/preço-promocional e a disponibilidade derivada de `stock_policy`.
**Where**: `packages/core/src/shopping/pricing.ts`
**Depends on**: T1
**Reuses**: nada de `payment/**` — o feed **lê** preço, não calcula nenhum
**Requirement**: GSH-06, GSH-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `price` vem de `product_variants.price`; teste com `base_price` **divergente** prova que a base
      não é lida
- [ ] Teste com `price_override` **divergente** prova que a coluna depreciada não é lida
- [ ] `salePrice` é `null` quando `compare_price <= price`, e o par `de/por` quando é maior
- [ ] Os quatro ramos de disponibilidade têm caso: `track`>0, `track`=0, `backorder`, `none`
- [ ] **Nenhuma** referência a desconto Pix ou a promoção progressiva
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T4: `resolveOffer` — a oferta inteira

**What**: A montagem do `ShoppingOffer`, incluindo link canônico, descrição e recuo de imagem.
**Where**: `packages/core/src/shopping/offer.ts`
**Depends on**: T1, T2, T3
**Reuses**: `productPath` (`@estrelinha/core/routes`), `stripFaqBlock` (`@estrelinha/core/faq/block`)
**Requirement**: GSH-03, GSH-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `link` é `<origin>` + `productPath(slug)` + `?variant=<publicVariantId>`, **sem barra final** e
      **sem** `pf=mc`
- [ ] O link é montado por `productPath`, não por concatenação — teste prova que trocar `productPath`
      muda o resultado
- [ ] `imageLink` usa `variant.image_url`; sem ela, a primeira imagem do produto (191 variações reais
      caem neste ramo)
- [ ] Descrição passa por `stripFaqBlock` e sai como **texto**, sem tag
- [ ] Descrição vazia recua para o nome do produto
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T5: `renderFeedXml`

**What**: A serialização RSS 2.0 com o namespace do Google, e o escape de XML.
**Where**: `packages/core/src/shopping/xml.ts`
**Depends on**: T4
**Reuses**: —
**Requirement**: GSH-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] O documento declara `xmlns:g="http://base.google.com/ns/1.0"` e é **parseável** por um parser
      XML no teste (não conferido por `includes` de string)
- [ ] `identifier_exists` sai como `no` por padrão; `<g:gtin>` **nunca** é emitido
- [ ] Campo nulo **omite a tag** — nunca `<g:brand></g:brand>`
- [ ] Descrição com `&`, `<` e caractere de controle produz documento bem-formado
- [ ] `offer_id` duplicado na lista **lança**, com o id na mensagem
- [ ] Lista vazia **lança** — feed vazio é "apague tudo"
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T6: `productJsonLd`

**What**: A serialização `Product` + `Offer` para a landing page.
**Where**: `packages/core/src/shopping/jsonld.ts`
**Depends on**: T4
**Reuses**: o mesmo `ShoppingOffer` da T4
**Requirement**: GSH-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Emite `@context`, `@type: Product`, `name`, `image`, `sku`, e `offers` com `price`,
      `priceCurrency: 'BRL'`, `availability` (URL de `schema.org`) e `url`
- [ ] O `url` do `offers` é o mesmo `link` da oferta
- [ ] Saída é objeto serializável; `JSON.stringify` não lança nem produz `undefined`
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T7: Os dois guardas de `core/shopping`

**What**: O guarda de paridade feed ↔ página, e o de pureza do módulo.
**Where**: `packages/core/src/shopping/__tests__/{shoppingParity.test.ts,purity.test.ts}`
**Depends on**: T5, T6
**Reuses**: o molde de `packages/core/src/home/__tests__/catalog.test.ts` (varredura com âncora)
**Requirement**: GSH-12, GSH-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Para a mesma variação, o preço declarado no XML e o do JSON-LD são **iguais por valor**, não por
      formatação — e o mesmo para disponibilidade
- [ ] O guarda é **sensível**: inverter a decisão central de `offerPricing` faz o arquivo falhar
      (prova de sensibilidade registrada no teste)
- [ ] A varredura de pureza recusa `react`, `@supabase/*` e `document` em qualquer arquivo de
      `shopping/`
- [ ] A varredura começa com **âncora de contagem** (`expect(files.length).toBeGreaterThan(N)`)
- [ ] Gate passa: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### ✅ T8: Migration — colunas de identificação e o interruptor

**What**: As seis colunas de `products`, os dois `check` nomeados, e a semente da chave
`google_shopping` em `store_settings`.
**Where**: `supabase/migrations/20260817120000_30-google-shopping.sql`,
`apps/store/src/shared/lib/__tests__/googleShoppingSchema.test.ts`
**Depends on**: T0
**Reuses**: o molde de `faqSchema.test.ts`, que já lê `.sql` do disco e compara com o TypeScript
**Requirement**: GSH-19, GSH-20

**Tools**: MCP: `supabase` (probe HTTP contra o banco local) · Skill: NONE

**Done when**:

- [ ] `brand`, `mpn`, `age_group`, `gender`, `google_product_category`, `identifier_exists` existem
- [ ] Os `check` de `age_group` e `gender` estão em **statement próprio e nomeado** — não inline num
      `ADD COLUMN IF NOT EXISTS`, que é ignorado em silêncio quando a coluna já existe
- [ ] O guarda lê o `.sql` do disco e assere os dois vocabulários **caractere a caractere** contra o
      TypeScript
- [ ] O guarda assere que nenhum `grant` novo alcança `anon`
- [ ] **Provado por probe HTTP contra o banco local que um `PATCH` de produto com os campos novos
      grava** (`AD-012`: tipo escrito à mão é afirmação, não verificação — `DbCategory` já custou
      `PGRST204` em toda gravação de categoria)
- [ ] `supabase db reset` roda limpo
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda de schema) · **Gate**: quick

---

### ✅ T9: `GoogleShoppingSettings` no TypeScript

**What**: A interface, o `DEFAULT_GOOGLE_SHOPPING`, e a extensão do guarda de defaults.
**Where**: `packages/supabase/src/types/settings.ts`,
`apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts`
**Depends on**: T8
**Reuses**: o padrão `DEFAULT_*` das outras sete chaves de settings
**Requirement**: GSH-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `enabled` e `ever_enabled` nascem `false`; `last_fetched_at` nasce `null`
- [ ] `merchant_id` nasce `'685367464'`
- [ ] `storeSettingsDefaults.test.ts` compara os defaults do TypeScript com o que **as duas** migrations
      de `store_settings` gravam, campo a campo — as duas são duplicata byte-a-byte e divergi-las
      produz resultado que depende de qual roda por último
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### ✅ T10: `google-feed/handlers.ts`

**What**: A lógica do feed — interruptor, leitura paginada com contagem exata, montagem e os 503.
**Where**: `supabase/functions/google-feed/handlers.ts`,
`supabase/functions/__tests__/googleFeed.test.ts`
**Depends on**: T4, T5, T9
**Reuses**: `selectAll` de `tools/catalog-import/src/db.ts` (padrão de paginação); `AD-004` para deps
injetadas
**Requirement**: GSH-05, GSH-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Integração desligada ⇒ **404**, e nenhuma leitura de catálogo é feita
- [ ] Leitura paginada traz **todas** as linhas acima de 1.000 — teste com 3.233 linhas falsas prova
- [ ] Mock devolvendo 1.000 de 3.233 ⇒ **503**, e o corpo **não é XML**
- [ ] Erro do Supabase ⇒ **503**
- [ ] Zero ofertas elegíveis ⇒ **503**, nunca RSS vazio
- [ ] `STORE_PUBLIC_URL` ausente ⇒ **503**
- [ ] Caminho feliz ⇒ 200, `Content-Type: application/xml`, e a oferta `1259936246` presente
- [ ] Gate passa: `pnpm --filter @estrelinha/functions test`

**Tests**: integration · **Gate**: full

---

### ✅ T11: `google-feed/index.ts` e o registro de última busca

**What**: O wiring (env, client, `Deno.serve`), o `verify_jwt = false` no `config.toml`, e a escrita de
`last_fetched_at`.
**Where**: `supabase/functions/google-feed/index.ts`, `supabase/config.toml`,
`supabase/functions/__tests__/googleFeed.test.ts` (estende)
**Depends on**: T10
**Reuses**: o `index.ts` de `melhor-envio` como molde de wiring
**Requirement**: GSH-15, GSH-22

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `[functions.google-feed] verify_jwt = false` — o Google não manda JWT
- [ ] Resposta 200 grava `last_fetched_at`; resposta 404 e 503 **não** gravam
- [ ] Falha ao gravar o carimbo **não** derruba a resposta do feed
- [ ] Gate passa: `pnpm --filter @estrelinha/functions test`

**Tests**: integration · **Gate**: full

---

### ✅ T12: `product-page/handlers.ts`

**What**: Buscar o shell, resolver o `?variant=`, injetar o JSON-LD, e os três recuos.
**Where**: `supabase/functions/product-page/handlers.ts`,
`supabase/functions/__tests__/productPage.test.ts`
**Depends on**: T4, T6
**Reuses**: `AD-004`; `publicVariantId` para casar o parâmetro
**Requirement**: GSH-12, GSH-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] O bloco `application/ld+json` é injetado **antes** de `</head>`, e o resto do shell sai byte a
      byte igual
- [ ] `?variant=` por `nuvemshop_id` e por UUID produzem o mesmo resultado
- [ ] `?variant=` desconhecido ⇒ JSON-LD do produto, **200**
- [ ] Slug desconhecido ⇒ shell **intacto**, 200 (a SPA renderiza `NotFound`)
- [ ] Falha da leitura ⇒ shell intacto, 200 — nunca erro de servidor no caminho da cliente
- [ ] Shell não carrega ⇒ 502, e o teste assere o status
- [ ] O preço injetado é **o mesmo** que `renderFeedXml` produz para aquele `offer_id`
- [ ] Gate passa: `pnpm --filter @estrelinha/functions test`

**Tests**: integration · **Gate**: full

---

### ✅ T13: `product-page/index.ts` e o cache de borda

**What**: O wiring, o `config.toml`, e os cabeçalhos de cache.
**Where**: `supabase/functions/product-page/index.ts`, `supabase/config.toml`,
`supabase/functions/__tests__/productPage.test.ts` (estende)
**Depends on**: T12
**Reuses**: molde de wiring de `melhor-envio`
**Requirement**: GSH-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `[functions.product-page] verify_jwt = false`
- [ ] Resposta 200 leva `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`
- [ ] O cache em memória do shell tem TTL curto e é asserido — shell velho é quadro branco
- [ ] Gate passa: `pnpm --filter @estrelinha/functions test`

**Tests**: integration · **Gate**: full

---

### ✅ T14: `vercel.json` — os dois rewrites, na ordem certa

**What**: Expor as duas functions sob o domínio da loja, com o catch-all por último, e prender a ordem
por teste.
**Where**: `apps/store/vercel.json`, `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts`
**Depends on**: T11, T13
**Reuses**: `vercelRedirects.test.ts`, que já lê o `vercel.json` do disco
**Requirement**: GSH-03, GSH-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `/feeds/google-shopping.xml` e `/produtos/:slug` apontam para as functions
- [ ] O catch-all `/(.*)` → `/index.html` é o **último** elemento do array, e o teste assere o
      **índice**, não só a presença — a Vercel avalia por ordem, e um catch-all na frente engoliria as
      duas rotas sem erro nenhum
- [ ] `trailingSlash` continua `false`
- [ ] Os `redirects` existentes seguem intactos (`vercelRedirects.test.ts` não perde asserção)
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda de fonte) · **Gate**: quick

---

### ✅ T15: `findVariantByPublicId`

**What**: Resolver o parâmetro da URL para uma linha do produto, aceitando as duas formas de id.
**Where**: `apps/store/src/entities/product/lib/variantSelection.ts`,
`apps/store/src/entities/product/lib/__tests__/variantSelection.test.ts`
**Depends on**: T1
**Reuses**: `publicVariantId` de `@estrelinha/core/shopping` — **a mesma função que produziu o
`offer_id`**
**Requirement**: GSH-10, GSH-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Casa por `nuvemshop_id` e por UUID, sem dois caminhos de código
- [ ] Devolve `null` para id desconhecido, malformado, de outro produto, e de variação inativa —
      um caso cada
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### ✅ T16: `useProductPurchase` aceita seleção inicial

**What**: O terceiro parâmetro que semeia a seleção a partir de uma variação resolvida.
**Where**: `apps/store/src/entities/product/model/useProductPurchase.tsx`,
`apps/store/src/entities/product/model/__tests__/useProductPurchase.test.tsx`
**Depends on**: T15
**Reuses**: `initialSelection`, que continua sendo o recuo
**Requirement**: GSH-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Com `initialVariant`, os eixos abrem naquela combinação e `price` é o dela
- [ ] Sem `initialVariant`, tudo se comporta **exatamente** como hoje — nenhuma asserção existente
      muda de valor
- [ ] O estado continua **único** para as duas superfícies de compra (coluna e barra fixa)
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### ✅ T17: `ProductPage` lê o `?variant=`

**What**: Ligar a URL ao estado de compra, mantendo a canônica sem o parâmetro.
**Where**: `apps/store/src/pages/ProductPage.tsx`,
`apps/store/src/pages/__tests__/ProductPage.test.tsx`
**Depends on**: T16
**Reuses**: `useCanonical`, `useSearchParams`
**Requirement**: GSH-10, GSH-11, GSH-14

**Tools**: MCP: NONE · Skill: `playwright-cli` (prova em 390×844 — ver *Done when*)

**Done when**:

- [ ] `?variant=1259936246` abre a página com `Tamanho: G` e R$ 19,90
- [ ] `?variant=` inválido abre a seleção padrão, **sem erro visível e sem tela branca**
- [ ] A tag canônica **não** inclui o parâmetro (`AD-018`: a canônica tem um formato só)
- [ ] Produto sem grade vendável ignora o parâmetro sem efeito
- [ ] **Prova em viewport móvel 390×844**: a página com `?variant=` não introduz scroll horizontal —
      `scrollWidth === clientWidth` no `body`. jsdom devolve 0 para toda medida de layout, e foi
      exatamente assim que a `ProductPage` rolou na horizontal no celular sem nada quebrar
- [ ] Gate passa: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### ✅ T18: O modelo da tela — leitura e escrita da configuração

**What**: O hook de leitura/escrita de `store_settings.google_shopping` e a derivação das contagens.
**Where**: `apps/backoffice/src/features/google-shopping/model/`,
`apps/backoffice/src/features/google-shopping/model/__tests__/`
**Depends on**: T9
**Reuses**: `feedExclusion` de `@estrelinha/core/shopping` — **a mesma função do feed**, nunca uma
segunda contagem
**Requirement**: GSH-18, GSH-22

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] A contagem de publicáveis e a de excluídas por motivo saem de `feedExclusion`
- [ ] Teste prova que **inverter a regra em `core` muda a contagem da tela** — se não mudar, há uma
      segunda escrita
- [ ] Escrita passa pela policy admin de `store_settings`; nenhum caminho novo a contorna
- [ ] Erro de leitura **não** vira lista vazia tratada como sucesso (o padrão que a `BL-00Y`
      registra três vezes neste projeto)
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T19: `AdminGoogleShoppingPage` — estado, URL e os passos do cutover

**What**: A tela: estado da integração, ID do Merchant Center, URL do feed copiável, e a ordem
numerada do cutover.
**Where**: `apps/backoffice/src/pages/admin/AdminGoogleShoppingPage.tsx` + teste co-locado
**Depends on**: T18
**Reuses**: `FormCard`, `FormPageHeader`
**Requirement**: GSH-15, GSH-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Exibe estado, `merchant_id` e a URL absoluta do feed
- [ ] Os **cinco** passos do cutover aparecem, na ordem: DNS → ligar aqui → desconectar o app na
      Nuvemshop → excluir a fonte `Content API` → criar a busca agendada. **Um item de verificação por
      passo** — implementar a maioria passa no gate e deixa a lacuna invisível
- [ ] Exibe `last_fetched_at`; quando `null`, diz explicitamente que o Google ainda não buscou
- [ ] Alvos de toque respeitam `TAP_44`/`TAP_ROW` conforme a varredura de `touchTarget.test.ts`
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T20: O interruptor, e a confirmação que ele exige

**What**: Ligar/desligar, com confirmação destrutiva quando já esteve ligado.
**Where**: `apps/backoffice/src/features/google-shopping/ui/` + teste co-locado
**Depends on**: T19
**Reuses**: o diálogo de confirmação já usado em Descontos
**Requirement**: GSH-15, GSH-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Ligar grava `enabled: true` **e** `ever_enabled: true`
- [ ] Desligar com `ever_enabled: false` não pede confirmação
- [ ] Desligar com `ever_enabled: true` **exige** confirmação, e o aviso **diz que os produtos saem do
      Google** — asserido pela frase, não pela existência do diálogo
- [ ] Cancelar a confirmação não grava nada
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T21: O que ficou de fora, e por quê

**What**: A contagem por motivo e a lista acionável de variações excluídas.
**Where**: `apps/backoffice/src/features/google-shopping/ui/` + teste co-locado
**Depends on**: T19, T2
**Reuses**: `feedExclusion` via T18
**Requirement**: GSH-22

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Uma linha por motivo, com contagem
- [ ] A lista leva ao produto por link — exclusão acionável, não só número
- [ ] Desativar uma variação faz a contagem publicável cair em 1 e o motivo subir em 1
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T22: A rota e a vaga na sidebar

**What**: `/admin/google-shopping` no `App.tsx` e em `navGroups`, no grupo `Loja`.
**Where**: `apps/backoffice/src/app/App.tsx`,
`apps/backoffice/src/widgets/admin-layout/model/navItems.ts`, `navItems.test.ts`
**Depends on**: T19
**Reuses**: `navGroups`
**Requirement**: GSH-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Entra em `Loja`, **depois** de `Menu da loja`
- [ ] A ordem das rotas em `App.tsx` acompanha — `navItems.test.ts` lê o arquivo do disco e compara a
      sequência textual
- [ ] `navItems.test.ts` ganha a asserção do grupo com **três** itens; nenhuma existente é afrouxada
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T23: Os campos de identificação na aba SEO do produto

**What**: O card `Google Shopping` no formulário do produto, com os seis campos.
**Where**: `apps/backoffice/src/features/product-form/ui/`, `AdminProductFormPage.test.tsx`
**Depends on**: T8
**Reuses**: os componentes de campo já usados na aba SEO
**Requirement**: GSH-19, GSH-20

**Tools**: MCP: `supabase` (probe de gravação) · Skill: NONE

**Done when**:

- [ ] Os seis campos aparecem na aba **SEO** — nenhuma aba nova
- [ ] `age_group` e `gender` são escolha fechada, não texto livre — **um item de verificação por
      campo**
- [ ] Campo vazio grava `null`, não string vazia
- [ ] **Provado por probe HTTP que a gravação chega ao banco** (`AD-012`)
- [ ] Gate passa: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### ✅ T24: O importador semeia `brand`

**What**: `RawProduct.brand` → `products.brand`, só onde a coluna é nula.
**Where**: `tools/catalog-import/src/map/product.ts` + teste co-locado
**Depends on**: T8
**Reuses**: a regra de semente de `requires_material` (`22`): entra no INSERT; no UPDATE, só onde é
`null`
**Requirement**: GSH-21

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] INSERT leva `brand` da origem
- [ ] UPDATE **não** sobrescreve `brand` já preenchido — teste com valor curado divergente
- [ ] `brand` nulo na origem não zera o curado
- [ ] `apiShape.test.ts` continua cobrindo o campo na fixture
- [ ] Gate passa: `pnpm --filter @estrelinha/catalog-import test`

**Tests**: unit · **Gate**: quick

---

### ✅ T25: P3 — `google_product_category` por categoria

**What**: A coluna em `categories` e a precedência produto > categoria > default de loja.
**Where**: migration, `packages/core/src/shopping/offer.ts`, `AdminCategoriesPage`
**Depends on**: T4, T8
**Reuses**: `resolveOffer`
**Requirement**: GSH-23

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Os **três** níveis de precedência têm caso de teste, incluindo o empate
- [ ] Produto em duas categorias com valores diferentes: a spec define qual vence e o teste assere
- [ ] Gate passa: `pnpm --filter @estrelinha/core test && pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: full

---

## Phase Execution Map

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 0:  T0
Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5 ──→ T6 ──→ T7
Phase 2:  T8 ──→ T9
Phase 3:  T10 ─→ T11
Phase 4:  T12 ─→ T13 ─→ T14
Phase 5:  T15 ─→ T16 ─→ T17
Phase 6:  T18 ─→ T19 ─→ T20 ─→ T21 ─→ T22
Phase 7:  T23 ─→ T24 ─→ T25
```

**Empacotamento sugerido (26 tasks, ~7 por worker):**

| Batch | Fases | Tasks |
| --- | --- | --- |
| 1 | 0 + 1 | T0–T7 (8) |
| 2 | 2 + 3 + 4 | T8–T14 (7) |
| 3 | 5 + 6 | T15–T22 (8) |
| 4 | 7 | T23–T25 (3) |

Mais de um batch ⇒ a oferta de sub-agentes é apresentada no início de Execute, e **não é
auto-despachada**.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T0 | 1 medição | ✅ |
| T1 | 2 funções coesas, 1 conceito | ✅ |
| T2 | 1 função | ✅ |
| T3 | 2 funções no mesmo arquivo, coesas | ✅ |
| T4 | 1 função | ✅ |
| T5 | 1 função + escape | ✅ |
| T6 | 1 função | ✅ |
| T7 | 2 guardas, 1 conceito (a arquitetura) | ✅ |
| T8 | 1 migration | ✅ |
| T9 | 1 tipo + defaults | ✅ |
| T10 | 1 handler | ✅ |
| T11 | 1 wiring | ✅ |
| T12 | 1 handler | ✅ |
| T13 | 1 wiring | ✅ |
| T14 | 1 arquivo de config | ✅ |
| T15 | 1 função | ✅ |
| T16 | 1 hook | ✅ |
| T17 | 1 página | ✅ |
| T18 | 1 modelo | ✅ |
| T19 | 1 página | ✅ |
| T20 | 1 componente | ✅ |
| T21 | 1 componente | ✅ |
| T22 | 1 rota + 1 lista | ✅ |
| T23 | 1 card | ✅ |
| T24 | 1 mapeamento | ✅ |
| T25 | 1 regra de precedência | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T0 | None | (início) | ✅ |
| T1 | T0 | T0 → T1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T2 → T3 (mesma fase, ordem) | ✅ |
| T4 | T1, T2, T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T4 | T5 → T6 (mesma fase, ordem) | ✅ |
| T7 | T5, T6 | T6 → T7 | ✅ |
| T8 | T0 | Phase 2 após Phase 1 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T4, T5, T9 | Phase 3 após 1 e 2 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T4, T6 | Phase 4 após 1 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T11, T13 | T13 → T14; Phase 4 após 3 | ✅ |
| T15 | T1 | Phase 5 após 1 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T9 | Phase 6 após 2 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T19, T2 | T20 → T21; T2 em fase anterior | ✅ |
| T22 | T19 | T21 → T22 | ✅ |
| T23 | T8 | Phase 7 após 2 | ✅ |
| T24 | T8 | T23 → T24 | ✅ |
| T25 | T4, T8 | T24 → T25 | ✅ |

Nenhuma task depende de fase posterior. ✅

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T0 | — (medição) | none | none | ✅ |
| T1 | Domínio puro | unit | unit | ✅ |
| T2 | Domínio puro | unit | unit | ✅ |
| T3 | Domínio puro | unit | unit | ✅ |
| T4 | Domínio puro | unit | unit | ✅ |
| T5 | Domínio puro | unit | unit | ✅ |
| T6 | Domínio puro | unit | unit | ✅ |
| T7 | Guarda de fonte | unit + âncora | unit | ✅ |
| T8 | Migration / schema | unit (lê `.sql`) | unit | ✅ |
| T9 | Entity / config | unit (guarda de defaults) | unit | ✅ |
| T10 | Handler de edge function | integration | integration | ✅ |
| T11 | Wiring + handler (escrita do carimbo) | integration | integration | ✅ |
| T12 | Handler de edge function | integration | integration | ✅ |
| T13 | Wiring + cabeçalho de cache | integration | integration | ✅ |
| T14 | Guarda de fonte (`vercel.json`) | unit + índice | unit | ✅ |
| T15 | UI da loja (lib) | unit | unit | ✅ |
| T16 | UI da loja (hook) | unit | unit | ✅ |
| T17 | UI da loja (página) | unit | unit | ✅ |
| T18 | UI do painel (modelo) | unit | unit | ✅ |
| T19 | UI do painel (página) | unit | unit | ✅ |
| T20 | UI do painel | unit | unit | ✅ |
| T21 | UI do painel | unit | unit | ✅ |
| T22 | UI do painel + guarda de ordem | unit | unit | ✅ |
| T23 | UI do painel | unit | unit | ✅ |
| T24 | Importador | unit | unit | ✅ |
| T25 | Domínio puro + UI do painel | unit (maior exigido) | unit | ✅ |

Nenhuma ❌. Nenhum `Tests: none` justificado por "coberto em outra task".

---

## Requirement Coverage

| Requisito | Tasks |
| --- | --- |
| GSH-01 | T1 |
| GSH-02 | T1 |
| GSH-03 | T4, T14 |
| GSH-04 | T2 |
| GSH-05 | T10 |
| GSH-06 | T3 |
| GSH-07 | T3 |
| GSH-08 | T4 |
| GSH-09 | T5 |
| GSH-10 | T15, T16, T17 |
| GSH-11 | T15, T17 |
| GSH-12 | T6, T7, T12, T13, T14 |
| GSH-13 | T7, T12 |
| GSH-14 | T17 |
| GSH-15 | T9, T10, T11, T19, T20 |
| GSH-16 | T20 |
| GSH-17 | T19, T22 |
| GSH-18 | T18 |
| GSH-19 | T8, T23 |
| GSH-20 | T8, T23 |
| GSH-21 | T24 |
| GSH-22 | T11, T18, T21 |
| GSH-23 | T25 |

**Coverage: 23 de 23 mapeados. Zero órfãos.**
