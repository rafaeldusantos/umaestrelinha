# Performance da loja no celular — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/38-performance-mobile/design.md`
**Status**: **T1–T18 executadas e commitadas** · T19 **adiada por decisão do usuário** (2026-09-05) → `BL-026`

---

## Execução — o que foi feito

| Fase | Tasks | Commit | Resultado |
| --- | --- | --- | --- |
| — | spec | `fd4d121` | os quatro documentos |
| 1A | T1–T5 | `5c6fa32` | core 1493→1524 · store 2001→2056 |
| 1B | T6–T10 | `7ef8ab1` | store →2088 · functions 350→368 · catalog-import 509→512 · backoffice 1786→1789 |
| 2 | T11–T13 | `c952f7e` | store →2133 |
| 3 | T14–T17 | `2099684` | store →2184 · chunk de entrada 278,4 → 117,2 KB brotli |
| — | correção | `92fadbf` | store →2204 · o select pedia `products.stock`, que não existe |
| 4 | T18 | `6fe260e` | store →2234 |
| 4 | T19 | — | **adiada** por decisão do usuário → `BL-026`. Sem `updateMetadata` no storage-js instalado, o passe custa 410 MB de reenvio — e compra velocidade de revisita, não dinheiro |

**Medido contra o banco hospedado, por sonda HTTP** (a prescrição do `AD-012`, não inspeção de tipo):

| Medida | Antes | Depois |
| --- | --- | --- |
| Catálogo inteiro, brotli | 1.449 KB | **214 KB** |
| Categoria `colar-e-correntes` (147 produtos), brotli | 307 KB | **50 KB** |
| Chunk de entrada, brotli | 278,4 KB | **117,2 KB** |

| — | correções do Verifier | `a1d465d` | store →2259 · functions →370 · as três lacunas e o interruptor da busca |

| — | `L-05` medida e fechada | `(este commit)` | store →2270 · o `sizes` do palco ganha dono provado |

Baselines finais, medidas **uma por vez e com exit code capturado sem pipe**: store **2270/152** ·
core **1524/61** · functions **370/7** · catalog-import **512/23** · backoffice **1789/109** =
**6465 em 352 arquivos**. Contra a entrada de 6139/334: **+326 testes em +18 arquivos**, sem uma
única perda. Lint **27/5** e tipos **0 · 0 · 0**, os dois iguais à baseline de entrada.

> **Esta linha já esteve errada duas vezes, e as duas ficam registradas** — é a lição que o
> `CLAUDE.md` escreve como *baseline anotada de memória mente sem quebrar nada*:
>
> 1. Dizia `6127 em 351` — desatualizada **e** mal somada (os números daquele momento davam 6427).
> 2. Corrigida para `6454 em 352`, ficou velha de novo em 4 testes no commit seguinte.
>
> As duas foram pegas pelo Verifier, nenhuma por mim. A terceira escrita é medida na hora.

**O flake do backoffice, resolvido:** `CategoryInspector.test.tsx` estourou o teto de 5 s durante a
suíte cheia (5.993 ms) e **passa isolado — 22/22, exit 0**. É a saturação que o `CLAUDE.md`
documenta, no mesmo arquivo que já oscilou antes. Nenhum arquivo dele foi tocado por esta feature.

### A correção fora de fase, e por que ela existe

`c952f7e` introduziu `PRODUCT_CARD_SELECT` nomeando a coluna `stock`. **Ela não existe** — virou
`stock_total` na migration `20260726000000`, e o que restou no `mapDbToProduct` é o fallback
`p.stock ?? p.stock_total` de intervalo de deploy. O PostgREST responde
`400 · column products.stock does not exist`, e **toda vitrine da loja ficaria vazia em produção**.

Nada pegou: `tsc` não checa string, `vite build` não checa tipo, e os testes de hook mockam o
client. É o `AD-012` na íntegra, do lado da leitura. O guarda `renamedColumns.test.ts` lê os
`RENAME COLUMN` das migrations do disco e é **por tabela** — `product_variants.stock` nunca foi
renomeada e segue legítima.

### As duas decisões do usuário, tomadas em 2026-09-05 *(já não são pendências)*

1. **A busca por descrição.** `searchProducts` pontua `description` como último desempate (peso 5),
   e ela saiu do select enxuto. **Decisão: aceitar, e pôr interruptor na busca.** Trazer a descrição
   de volta custaria **+430 KB brotli em toda página**; em troca, o `SearchDropdown` — que fica no
   `Header`, montado em toda rota — ganhou o `enabled` que o `SearchOverlay` já tinha e deixou de
   baixar o catálogo de quem só abriu a página (**−214 KB por página**). A busca por descrição volta
   com `BL-025`. Registrado nos critérios de sucesso da spec.
2. **T19**, o passe de `cacheControl` sobre os 3.618 objetos. **Decisão: adiar** — vira `BL-026`.
   Não existe `updateMetadata` no `@supabase/storage-js` instalado, então o passe custaria 410 MB de
   reenvio, e a cobrança da transformação é por imagem distinta **por mês**: ele compra velocidade
   de revisita, não dinheiro.

---

## ⚠️ Bloqueio de estado antes da T1 — **resolvido em 2026-09-05**

A árvore tinha **101 arquivos não commitados**, e a inspeção mostrou que a premissa inicial estava
errada: a `37` **já estava commitada**; o que nunca havia entrado no git eram as features `34`, `35`
e `36` inteiras — incluindo duas migrations que o CI aplica no projeto hospedado. O `CLAUDE.md`
declarava a `34` e a `35` como fechadas enquanto o código delas vivia só na árvore de trabalho.

Resolvido em `146561e`, com os cinco workspaces medidos verdes antes do commit. A `38` nasceu em
branch próprio a partir dali.

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. Diretrizes encontradas: `CLAUDE.md` (raiz),
> `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md`, os cinco `vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura em `packages/core` | unit | Todos os ramos; 1:1 com as ACs da spec; **todo edge case listado tem teste** | `packages/core/src/<mod>/__tests__/*.test.ts` ou co-locado `*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Componente de UI da loja | unit (RTL + jsdom) | O **DOM renderizado**, atributo a atributo — `srcset`, `sizes`, `loading`, `fetchpriority`. Nunca a implementação | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Guarda de repositório (lê o fonte do disco) | unit | **Âncora dupla** (arquivos lidos **e** ocorrências encontradas) + **sensor embutido** que prova que a régua reprova o defeito que ela existe para pegar | `apps/store/src/{shared/lib,app,entities/*/lib}/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Handler de edge function | unit, com deps injetadas (`AD-004`) | Caminho feliz + produto sem foto + o degradado. Nunca `Deno.serve` | `supabase/functions/<fn>/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Escrita do importador | unit | Idempotência e ausência de reenvio indevido | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| Config (`vite.config.ts`, `index.html`, `vercel.json`) | none direto | Coberta **indiretamente** pelo guarda de repositório da mesma task + portão de build | — | portão de build |

**Regra de medição herdada do `CLAUDE.md`, e ela não é opcional:**

- **Rode um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout de 5 s
  nos testes que varrem disco — que são justamente os guardas desta feature.
- **`pnpm test | tail` esconde a falha**: o código de saída que sai do pipe é o do `tail`. Capture o
  de verdade (`${PIPESTATUS[0]}`).
- **Teste que reprova isolado nunca é flake.**

## Gate Check Commands

| Gate Level | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Depois de task que toca **um** workspace | `pnpm --filter @estrelinha/<workspace> test` |
| **Full** | Depois de task que cruza workspaces | Os workspaces tocados, **um por vez**, cada um com exit code capturado |
| **Build** | Fim de fase, e depois de qualquer task de config | `npx tsc --noEmit -p apps/store/tsconfig.app.json` **e** `pnpm --filter @estrelinha/store build` |

> `pnpm build` **não faz typecheck** — é `vite build` puro. Build verde não prova ausência de erro de
> tipo, e por isso os dois comandos do portão de build são obrigatórios, não alternativos.

---

## Execution Plan

### Fase 1A: A rendição e as vitrines

```
T1 → T2 → T3 → T4 → T5
```

### Fase 1B: Dicas ao navegador e cache

```
T6 → T7 → T8 → T9 → T10
```

### Fase 2: A consulta traz o que o card desenha

```
T11 → T12 → T13
```

### Fase 3: O celular baixa só o código da tela aberta

```
T14 → T15 → T16 → T17
```

### Fase 4: Fontes próprias, e o passe opcional

```
T18 → T19
```

---

## Task Breakdown

### T1: O módulo `rendition` — dono único da URL e da prioridade

**What**: criar `renditionUrl`, `renditionSrcSet`, `imagePriority` e as constantes, num arquivo
**sem nenhum import** — nem de tipo.
**Where**: `packages/core/src/media/rendition.ts` (novo) · `packages/core/src/media/index.ts` (uma
linha de reexport, **com extensão**: `export * from './rendition.ts'`)
**Depends on**: None
**Reuses**: convenção de `packages/core/src/media/index.ts`; a regra de extensão explícita do
`CLAUDE.md` (armadilha medida na feature `33`)
**Requirement**: PRF-01, PRF-03 (AC 4), PRF-05 (AC 2)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `rendition.ts` não tem **nenhuma** linha `import` — conferido por leitura, e asserido por teste
- [ ] `renditionUrl` troca `/storage/v1/object/public/` por `/storage/v1/render/image/public/` e
      acrescenta `width` e `quality=75`
- [ ] Entrada não transformável (host externo, `/assets`, `''`, caminho sem o segmento) volta
      **inalterada**, sem lançar
- [ ] Largura fora de `1..2500` é grampeada ao limite mais próximo
- [ ] `renditionSrcSet` devolve as três larguras no formato `url 360w, url 480w, url 720w`, e `''`
      para entrada não transformável
- [ ] `imagePriority(index)` devolve `eager` + `fetchPriority: 'high'` + `animateIn: false` no índice
      0; `eager` + sem `fetchPriority` + `animateIn: false` nos índices 1 a 5; `lazy` +
      `animateIn: true` a partir do 6
- [ ] `STORAGE_CACHE_CONTROL` exportado como `'31536000'`
- [ ] Gate: `pnpm --filter @estrelinha/core test`
- [ ] Test count: **1493 → ≥1513** (mínimo 20 casos novos; nenhum existente removido)

**Tests**: unit · **Gate**: quick

---

### T2: `ProductCard` pede a foto do tamanho da vaga, e o primeiro não se esconde

**What**: `srcset`/`sizes` na foto do card e `loading`/`fetchpriority`/animação vindos de
`imagePriority`, por um `index` novo na prop.
**Where**: `apps/store/src/entities/product/ui/ProductCard.tsx` ·
`apps/store/src/entities/product/ui/__tests__/ProductCard.test.tsx`
**Depends on**: T1
**Reuses**: `imagePriority` e `renditionSrcSet` de T1; a moldura `aspect-[4/5]` e o `@container` de
`COR-16`, que **não mudam**
**Requirement**: PRF-02 (AC 4), PRF-03 (AC 1, 2, 3)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O `<img>` do card declara `srcset` com as três larguras e
      `sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"`
- [ ] O `src` aponta para a rendição de **480**, nunca o original — o caso do navegador sem `srcset`
- [ ] Card de índice 0: `loading="eager"`, `fetchpriority="high"`, e **sem** `opacity-0` e **sem**
      `initial={{ opacity: 0 }}`
- [ ] Cards de índice 1 a 5: `loading="eager"`, sem `fetchpriority`, sem opacidade zero
- [ ] Card de índice ≥6: `loading="lazy"` e a animação de entrada de hoje, intacta
- [ ] Card **sem** `index` (superfície que não é listagem) se comporta como ≥6 — o padrão seguro
- [ ] O esqueleto de `LST-09` e a fileira de cor de `COR-16` continuam idênticos
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **2001 → ≥2011** (mínimo 10 casos novos)

**Tests**: unit · **Gate**: quick

---

### T3: A galeria do produto pede 720, e a lupa continua no original

**What**: `srcset` na foto grande e nas miniaturas; o modo de tela cheia mantém o original.
**Where**: `apps/store/src/entities/product/ui/ProductGallery.tsx` ·
`apps/store/src/entities/product/ui/__tests__/ProductGallery.test.tsx`
**Depends on**: T1
**Reuses**: `renditionUrl`/`renditionSrcSet`; o `altOf` e o palco vazio de `VAR-11`, intocados
**Requirement**: PRF-02 (AC 5, 6)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A foto grande declara `srcset` e `sizes="(min-width: 768px) 50vw, 100vw"`
- [ ] A foto grande é `loading="eager"` com `fetchpriority="high"` — é o LCP da página do produto
- [ ] As miniaturas pedem rendição compatível com 56 px (mobile) e 80 px (desktop), nunca o original
- [ ] O `<img>` **dentro do `Dialog` de tela cheia** continua apontando para a URL original
- [ ] Produto sem imagem continua sem renderizar `<img>` nenhum (`VAR-11` AC 3)
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+8** sobre o total de T2

**Tests**: unit · **Gate**: quick

---

### T4: O carrossel e as artes da home

**What**: `srcset` no `ProductCarousel`, no `HomeBannerGrid`, no `CollectionFeature`, no `MegaMenu` e
no `HeroBanner`, com o `index` alimentando `imagePriority` no carrossel.
**Where**: `apps/store/src/widgets/{product-carousel,home-banners,collection-feature,header,hero-banner}/ui/*.tsx`
+ testes co-locados
**Depends on**: T1, T2
**Reuses**: o `index` que T2 introduziu no `ProductCard`; a proporção que vive no link
(`HOME-29`), que **não muda**
**Requirement**: PRF-02 (AC 4, 5), PRF-03 (AC 1)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ProductCarousel` repassa o `index` de cada card, e o banner da fileira declara `srcset` com
      `sizes="220px"` no mobile
- [ ] `HomeBannerGrid` e `CollectionFeature` declaram `srcset`, e o `bg-estrelinha-ground-deep` que
      segura a proporção continua no link
- [ ] `HeroBanner` — quando há foto — é `loading="eager"` com `fetchpriority="high"`: é o LCP da home
- [ ] `MegaMenu` pede rendição pequena; imagem de host externo passa sem `srcset`
- [ ] `homeComposition.test.tsx` continua verde **sem uma asserção alterada** — a Home não muda de cara
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+12** sobre o total de T3

**Tests**: unit · **Gate**: quick

---

### T5: O guarda do dono único da URL de imagem

**What**: guarda que varre `apps/**` e derruba a suíte quando alguém monta URL de rendição sem passar
pelo helper.
**Where**: `apps/store/src/shared/lib/__tests__/renditionSingleOwner.test.ts` (novo)
**Depends on**: T2, T3, T4
**Reuses**: **molde literal** de `freeShippingSingleOwner.test.ts` — escopo escrito à mão, remoção de
comentário com **CRLF normalizado primeiro**, âncora dupla, sensor embutido
**Requirement**: PRF-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A régua recusa `render/image`, `?width=`, `&width=` e `quality=` fora do allowlist
- [ ] O allowlist tem **um** endereço: `packages/core/src/media/rendition.ts` — e ele é escrito
      **literalmente** no teste, nunca derivado de constante que o código sob teste exporte
- [ ] A régua recusa largura cravada em JSX (`srcSet={'...360w'}` à mão)
- [ ] **Âncora dupla**: a varredura assere que leu ≥1 arquivo **e** que encontrou ≥6 chamadas do
      helper — sem a segunda, um caminho errado varre zero arquivo e passa em silêncio
- [ ] **Sensor embutido**: um trecho sintético que monta a URL à mão é **reprovado** pela régua, e o
      teste prova isso
- [ ] **Sensor de comentário**: a régua ignora a mesma linha dentro de comentário, com CRLF **e** LF
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+10** sobre o total de T4

**Tests**: unit · **Gate**: quick

---

### T6: Carrinho, checkout e busca pedem rendição pequena

**What**: `srcset`/rendição nas seis superfícies de vaga pequena que sobraram.
**Where**: `widgets/cart-drawer/ui/{CartDrawerRow,CrossSell}.tsx` ·
`features/checkout/ui/{OrderSummary,OrderBump}.tsx` ·
`features/search/ui/{SearchDropdown,SearchOverlay}.tsx` ·
`entities/product/ui/{ColorPreview,VariantPicker,VariantSheet}.tsx` ·
`entities/product/model/useProductPurchase.tsx` + testes co-locados
**Depends on**: T1
**Reuses**: `renditionUrl` de T1; o recorte `scale-[1.6]` de `COR-13`, que **não muda**
**Requirement**: PRF-02 (AC 5)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cada superfície pede largura compatível com a vaga: 120 para amostra de cor (40 px × `scale`
      1,6 × DPR 2), 160 para linha de carrinho e resumo, 160 para resultado de busca
- [ ] `ColorPreview` continua **não** renderizando `<img>` para cor sem foto (`COR-15`)
- [ ] O toast de "adicionado ao carrinho" pede rendição, não o original
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+12** sobre o total de T5

**Tests**: unit · **Gate**: quick

---

### T7: `preconnect` para o Supabase no HTML

**What**: `<link rel="preconnect">` para a origem do Supabase, e a asserção que impede que ele suma.
**Where**: `apps/store/index.html` · `apps/store/src/app/__tests__/brandAssets.test.ts`
**Depends on**: None
**Reuses**: `brandAssets.test.ts`, que já lê o `index.html` do disco
**Requirement**: PRF-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O `index.html` declara `preconnect` (com `crossorigin`) para a origem do Supabase, **antes** do
      `<script type="module">`
- [ ] O guarda assere que o `preconnect` existe e que a origem casa a do `.env.example`
- [ ] As três `preconnect` de fonte de hoje continuam intactas — T18 é quem mexe nelas
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+3** sobre o total de T6

**Tests**: unit · **Gate**: quick

---

### T8: A edge function do produto injeta o `preload` da foto principal

**What**: `<link rel="preload" as="image">` com `imagesrcset` no `<head>`, junto do JSON-LD.
**Where**: `supabase/functions/product-page/handlers.ts` ·
`supabase/functions/product-page/__tests__/handlers.test.ts`
**Depends on**: T1
**Reuses**: `injectIntoHead`, que já existe; `rendition.ts` importado por **caminho relativo com
`.ts` explícito**, nunca pelo barrel de `core/media`
**Requirement**: PRF-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O import é `../../../packages/core/src/media/rendition.ts` — relativo e com extensão
- [ ] Produto **com** foto: a resposta traz `<link rel="preload" as="image">` apontando para a
      rendição de 720, com `imagesrcset` coerente com o que T3 fez a galeria pedir
- [ ] Produto **sem** foto: nenhum `preload`, e a resposta segue byte a byte a de hoje
- [ ] O JSON-LD continua idêntico — `googleShoppingSchema.test.ts` e `shoppingParity.test.ts` verdes
      sem asserção alterada
- [ ] O `Content-Type` da resposta continua `text/html; charset=utf-8` (`AD-021`)
- [ ] **Fumaça de Deno**: `deno check` da function passa — é o que prova que a armadilha de resolução
      de tipos da feature `33` não voltou
- [ ] Gate: `pnpm --filter @estrelinha/functions test`
- [ ] Test count: **350 → ≥358**

**Tests**: unit · **Gate**: quick

---

### T9: Um ano de cache nas imagens novas, com dono único

**What**: os dois gravadores passam a ler `STORAGE_CACHE_CONTROL` em vez do literal `'3600'`.
**Where**: `tools/catalog-import/src/write/storage.ts` ·
`apps/backoffice/src/features/product-form/lib/uploadProductImage.ts` + testes co-locados
**Depends on**: T1
**Reuses**: `STORAGE_CACHE_CONTROL` de T1
**Requirement**: PRF-05 (AC 1, 2)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Nenhum dos dois arquivos contém o literal `'3600'`
- [ ] Os dois importam a constante de `@estrelinha/core`
- [ ] O teste do importador assere que o `upload` recebe `cacheControl: '31536000'`
- [ ] `upsert: false` e a detecção de duplicata (`CAT-03`) continuam intactos
- [ ] Gate **full**: `@estrelinha/catalog-import` e `@estrelinha/backoffice`, um por vez
- [ ] Test count: catalog-import **509 → ≥512**; backoffice **1782 → ≥1784**

**Tests**: unit · **Gate**: full

---

### T10: O React Query para de refazer consulta já respondida

**What**: `defaultOptions.queries.staleTime` de 5 minutos no `QueryClient` da loja.
**Where**: `apps/store/src/app/App.tsx` · `apps/store/src/app/__tests__/queryClient.test.ts` (novo)
**Depends on**: None
**Reuses**: o `PROMOTIONS_STALE_TIME` de `core/hooks/usePromotions`, como precedente do valor
**Requirement**: PRF-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] O `QueryClient` declara `staleTime` padrão de 5 minutos
- [ ] O teste prova que uma consulta **com** `staleTime` próprio (`store_settings`) mantém o dela
- [ ] O teste prova que uma consulta **sem** herda o padrão
- [ ] Nenhuma mutação passa a ser cacheada — só `queries`
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+4** sobre o total de T7

**Tests**: unit · **Gate**: quick

---

### T11: `PRODUCT_CARD_SELECT` — a consulta traz o que o card desenha

**What**: o select enxuto, adotado pelas quatro leituras de listagem, com o guarda que impede campo
lido e não pedido.
**Where**: `apps/store/src/entities/product/lib/mapProduct.ts` ·
`apps/store/src/entities/product/api/useProducts.ts` ·
`apps/store/src/entities/product/lib/__tests__/cardSelect.test.ts` (novo)
**Depends on**: None
**Reuses**: `PRODUCT_SELECT` e o embed aliased de `PRODUCT_SELECT_BY_CATEGORY`, cuja razão de existir
(o selo de `PST-06`) **não muda**; `mapDbToProduct`, que não é tocado
**Requirement**: PRF-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `PRODUCT_CARD_SELECT` e `PRODUCT_CARD_SELECT_BY_CATEGORY` existem, sem `description`, sem os
      dois campos de SEO e sem os seis de Google Shopping
- [ ] A variação pede lista explícita de colunas, não `*`
- [ ] `useProducts`, `useAllProducts`, `useFeaturedProducts` e `useNewProducts` usam o enxuto;
      `useProduct` e `useProductById` continuam no completo (`PRF-08` AC 2)
- [ ] **Guarda**: uma linha contendo só as colunas do select enxuto, passada por `mapDbToProduct`,
      produz `price`, `compare_price`, `tags`, `is_new`, `variants`, `image_url`, `category_slug`,
      `stock_policy`, `category_links` e as **quatro dimensões de `SHP-02`** preenchidos
- [ ] **Sensor embutido**: o guarda prova que remover `weight_kg` do select **reprova** — sem isso a
      cotação de frete cairia nos fallbacks em silêncio
- [ ] O guarda assere que `description` **não** está no select enxuto (a economia é real)
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+14** sobre o total de T10

**Tests**: unit · **Gate**: quick

---

### T12: A home para de baixar a árvore inteira para mostrar quatro cards

**What**: limite nas fileiras de coleção e nos relacionados do produto.
**Where**: `apps/store/src/entities/product/api/useProducts.ts` ·
`apps/store/src/widgets/home-collections/ui/HomeCollectionRow.tsx` ·
`apps/store/src/pages/ProductPage.tsx` + testes co-locados
**Depends on**: T11
**Reuses**: o `CARDS = 4` que `HomeCollectionRow` já declara — passa a ser o limite da **consulta**,
não só do `.slice`
**Requirement**: PRF-09 (AC 1, 2)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `useProducts` aceita um limite opcional, aplicado no **servidor**
- [ ] `HomeCollectionRow` pede exatamente o que desenha; o `.slice` continua como rede de segurança
- [ ] Os relacionados da página do produto são limitados, e não rebaixam para "a categoria inteira"
- [ ] A ordem dos cards não muda: sem `.order` explícito, o limite tornaria a ordem indefinida — a
      consulta limitada **declara** a ordenação que a tela já pratica
- [ ] `homeComposition.test.tsx` verde sem asserção alterada
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+10** sobre o total de T11

**Tests**: unit · **Gate**: quick

---

### T13: O teto de 1.000 linhas deixa de ser invisível

**What**: teto explícito nas leituras de listagem, para que o corte do PostgREST seja declarado.
**Where**: `apps/store/src/entities/product/api/useProducts.ts` + teste co-locado
**Depends on**: T11, T12
**Reuses**: `@estrelinha/core/paging`, que já é o dono da leitura paginada completa
**Requirement**: PRF-09 (AC 3)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cada leitura de listagem declara um teto explícito, com o número escrito num lugar só
- [ ] O teste prova que o teto é **declarado**, não herdado — uma resposta no limite não vira lista
      silenciosamente truncada
- [ ] O comentário no código aponta para `BL-025` como o fecho de verdade
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+5** sobre o total de T12

**Tests**: unit · **Gate**: quick

---

### T14: Sai o `Toaster` que ninguém usa

**What**: remover o `<Toaster />` do Radix do `App.tsx`.
**Where**: `apps/store/src/app/App.tsx` · `apps/store/src/app/__tests__/toasterUnico.test.tsx` (novo)
**Depends on**: None
**Reuses**: o Sonner, que já é o único caminho de aviso da loja
**Requirement**: PRF-13

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `App.tsx` não monta o `Toaster` do Radix
- [ ] O guarda assere que **nenhum** arquivo de `apps/store/**` importa `useToast` ou o `Toaster` do
      Radix — a prova de que a remoção é segura, e não uma aposta
- [ ] O Sonner continua montado, e os sete avisos de hoje continuam funcionando
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+4** sobre o total de T13

**Tests**: unit · **Gate**: quick

---

### T15: Cada rota vira um chunk

**What**: `React.lazy` nas 14 páginas, `Suspense` com fallback sem deslocamento, e `ErrorBoundary`
para chunk que falha ao baixar.
**Where**: `apps/store/src/app/App.tsx` · `apps/store/src/app/ChunkErrorBoundary.tsx` (novo) +
testes co-locados
**Depends on**: T14
**Reuses**: a tabela de rotas de `AD-018` e a ordem por especificidade do React Router, que **não
mudam**; o esqueleto de `LST-09` como fallback da listagem
**Requirement**: PRF-10, PRF-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] As 14 páginas são carregadas por `lazy(() => import(...))`
- [ ] O `Suspense` fica **dentro** do `BrowserRouter` e **abaixo** do `ScrollToTop`, para o botão
      voltar continuar se comportando como `scrollToTop.test.tsx` exige
- [ ] A leitura de `?preview=1` continua **acima** das `Routes` e do `Suspense` (`AD-019`)
- [ ] Overlays de gesto — checkout, auth, busca, menu mobile, gaveta de variações — carregados sob
      demanda, e ausentes do chunk inicial
- [ ] Chunk que falha ao baixar mostra mensagem legível com recarregar, nunca tela branca
- [ ] `routes.test.ts`, `reservedSlugs.test.ts`, `sitemapRoutes.test.ts` e `scrollToTop.test.tsx`
      verdes **sem asserção alterada**
- [ ] Gate **build**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` **e**
      `pnpm --filter @estrelinha/store build`
- [ ] Test count: **≥+12** sobre o total de T14

**Tests**: unit · **Gate**: build

---

### T16: O guarda do carregamento sob demanda

**What**: guarda bidirecional que lê o `App.tsx` do disco.
**Where**: `apps/store/src/app/__tests__/routeSplitting.test.ts` (novo)
**Depends on**: T15
**Reuses**: molde de `reservedSlugs.test.ts` e `sitemapRoutes.test.ts`, os dois já bidirecionais
**Requirement**: PRF-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Página do `App.tsx` importada estaticamente **derruba** a suíte
- [ ] **Bidirecional**: entrada em `lazy` que deixou de ser rota também derruba
- [ ] O guarda **não** confunde o `NotFound` que a `CategoryPage` importa e renderiza — está no
      chunk da categoria de propósito, e isso é o comportamento correto
- [ ] **Âncora dupla**: prova que leu o `App.tsx` **e** que encontrou ≥14 chamadas de `lazy`
- [ ] **Sensor embutido**: um `App.tsx` sintético com import estático é reprovado pela régua
- [ ] Gate: `pnpm --filter @estrelinha/store test`
- [ ] Test count: **≥+8** sobre o total de T15

**Tests**: unit · **Gate**: quick

---

### T17: React, Supabase e Query em chunks que sobrevivem a deploy

**What**: `manualChunks` no build de produção.
**Where**: `apps/store/vite.config.ts` · `apps/store/src/app/__tests__/viteChunks.test.ts` (novo)
**Depends on**: T15
**Reuses**: o `dedupe` que o `vite.config.ts` já declara para React e React Query
**Requirement**: PRF-12

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `react`, `supabase` e `query` saem em chunks nomeados
- [ ] O guarda lê o `vite.config.ts` do disco e assere que os três grupos existem e que a lista de
      pacotes de cada um casa a do `dedupe`
- [ ] **Medido e registrado no commit**: chunk de entrada em brotli, antes e depois
- [ ] Chunk de entrada **abaixo de 220 KB brotli**
- [ ] Gate **build**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` **e**
      `pnpm --filter @estrelinha/store build`
- [ ] Test count: **≥+5** sobre o total de T16

**Tests**: unit · **Gate**: build

---

### T18: As fontes saem do domínio de terceiro

**What**: Libre Baskerville e Outfit servidas do próprio domínio, com `preload`.
**Where**: `apps/store/index.html` · `apps/store/public/fonts/` (novo) ·
`apps/store/src/app/App.css` · `apps/store/src/app/__tests__/brandAssets.test.ts` ·
`apps/store/vercel.json` (se o `immutable` não alcançar `public/`)
**Depends on**: T7
**Reuses**: `brandAssets.test.ts`, que já assere que todo arquivo referenciado existe no disco
**Requirement**: PRF-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os quatro `woff2` (Libre Baskerville 400, 700, itálico 400; Outfit variável 300–700) estão em
      `public/fonts`, subconjunto latino, com a licença OFL junto
- [ ] `@font-face` no CSS, com `font-display: swap` — nunca texto invisível
- [ ] Nenhuma referência a `fonts.googleapis.com` ou `fonts.gstatic.com` sobra no `index.html`
- [ ] As duas faces do primeiro texto têm `preload`
- [ ] **Conferido, não assumido**: o cabeçalho `immutable` de fato alcança o caminho servido; se
      `public/` cair fora de `/assets`, o `vercel.json` ganha regra própria e
      `vercelRedirects.test.ts` ganha a asserção
- [ ] O guarda assere que toda fonte referenciada existe no disco e que nenhum peso fora do design
      system é pedido (`PRF-14` AC 4)
- [ ] Gate **build**: os dois comandos
- [ ] Test count: **≥+8** sobre o total de T17

**Tests**: unit · **Gate**: build

---

### T19 *(opcional — decisão do usuário)*: O passe de cache nos 3.618 objetos existentes

**What**: subcomando que regrava o `cacheControl` dos objetos já no Storage.
**Where**: `tools/catalog-import/src/` (subcomando novo) + teste co-locado
**Depends on**: T9
**Reuses**: o **cache em disco** de `write/cache.ts` — os 410 MB já baixados, para nada ser rebaixado
do CDN da Nuvemshop
**Requirement**: PRF-05 (AC 3)

**Tools**: MCP: NONE · Skill: NONE

> **Por que é opcional, e por que a razão mudou durante o design.** Verificado no
> `dist/index.d.mts` do `@supabase/storage-js` **2.110.7 instalado**: não existe `updateMetadata`,
> `getMetadata` nem `setMetadata`. O único caminho é `update(path, bytes, { cacheControl })`, que
> **substitui o arquivo** — ou seja, ~410 MB de upload. E a cobrança da transformação é por **imagem
> distinta por mês**, não por batida: o passe compra **velocidade de revisita**, não dinheiro. Uma
> busca na web afirmou que existia atualização só de metadados; estava errada, e a biblioteca
> instalada é a prova.

**Done when**:
- [ ] O subcomando lê os bytes do cache em disco e chama `update` com `STORAGE_CACHE_CONTROL`
- [ ] Objeto ausente do cache é **pulado com registro**, nunca rebaixado do CDN de terceiro
- [ ] Idempotente: a segunda execução grava o mesmo valor e relata "sem mudança"
- [ ] Relatório final: quantos atualizados, quantos pulados, quantos falharam
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test`
- [ ] Test count: **≥+8** sobre o total de T9

**Tests**: unit · **Gate**: quick

---

## Phase Execution Map

```
Fase 1A → Fase 1B → Fase 2 → Fase 3 → Fase 4

Fase 1A:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5
Fase 1B:  T6 ──→ T7 ──→ T8 ──→ T9 ──→ T10
Fase 2:   T11 ─→ T12 ─→ T13
Fase 3:   T14 ─→ T15 ─→ T16 ─→ T17
Fase 4:   T18 ─→ T19
```

Execução estritamente sequencial. **19 tasks**, que empacotam em **4 lotes** de ~7:
`[1A]` · `[1B]` · `[Fase 2 + Fase 3]` · `[Fase 4]`.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo puro | ✅ |
| T2 | 1 componente | ✅ |
| T3 | 1 componente | ✅ |
| T4 | 5 widgets, uma mudança idêntica em cada | ⚠️ coeso — mesma edição, mesma prop, mesmo teste |
| T5 | 1 guarda | ✅ |
| T6 | 9 superfícies pequenas, uma mudança idêntica | ⚠️ coeso — todas trocam `src` por rendição pequena |
| T7 | 1 arquivo | ✅ |
| T8 | 1 handler | ✅ |
| T9 | 2 arquivos, 1 constante | ✅ |
| T10 | 1 config | ✅ |
| T11 | 1 constante + 4 chamadas | ✅ |
| T12 | 1 função + 2 chamadas | ✅ |
| T13 | 1 função | ✅ |
| T14 | 1 remoção | ✅ |
| T15 | 1 arquivo (App.tsx) + 1 componente | ✅ |
| T16 | 1 guarda | ✅ |
| T17 | 1 config | ✅ |
| T18 | 1 HTML + 1 CSS + ativos | ✅ |
| T19 | 1 subcomando | ✅ |

T4 e T6 agrupam superfícies porque a edição é **a mesma linha em N arquivos** com um teste por
arquivo. Quebrá-las em 14 tasks produziria 14 commits de uma linha, contra a regra de commit deste
projeto.

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | início da 1A | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T2 → T3 (mesma fase, T1 anterior) | ✅ |
| T4 | T1, T2 | T3 → T4 (T1, T2 anteriores) | ✅ |
| T5 | T2, T3, T4 | T4 → T5 | ✅ |
| T6 | T1 | início da 1B (T1 em fase anterior) | ✅ |
| T7 | None | T6 → T7 | ✅ |
| T8 | T1 | T7 → T8 (T1 em fase anterior) | ✅ |
| T9 | T1 | T8 → T9 | ✅ |
| T10 | None | T9 → T10 | ✅ |
| T11 | None | início da Fase 2 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T11, T12 | T12 → T13 | ✅ |
| T14 | None | início da Fase 3 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T15 | T16 → T17 (T15 anterior) | ✅ |
| T18 | T7 | início da Fase 4 (T7 em fase anterior) | ✅ |
| T19 | T9 | T18 → T19 (T9 em fase anterior) | ✅ |

Nenhuma task depende de task em fase posterior. ✅

---

## Test Co-location Validation

| Task | Camada tocada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura em `core` | unit | unit | ✅ |
| T2 | Componente de UI | unit | unit | ✅ |
| T3 | Componente de UI | unit | unit | ✅ |
| T4 | Componente de UI | unit | unit | ✅ |
| T5 | Guarda de repositório | unit | unit | ✅ |
| T6 | Componente de UI | unit | unit | ✅ |
| T7 | Config + guarda de repositório | unit | unit | ✅ |
| T8 | Handler de edge function | unit | unit | ✅ |
| T9 | Escrita do importador + UI do painel | unit | unit | ✅ |
| T10 | Config + guarda | unit | unit | ✅ |
| T11 | Regra da loja + guarda | unit | unit | ✅ |
| T12 | Regra da loja | unit | unit | ✅ |
| T13 | Regra da loja | unit | unit | ✅ |
| T14 | Config + guarda | unit | unit | ✅ |
| T15 | Config + componente | unit | unit | ✅ |
| T16 | Guarda de repositório | unit | unit | ✅ |
| T17 | Config + guarda | unit | unit | ✅ |
| T18 | Config + guarda | unit | unit | ✅ |
| T19 | Escrita do importador | unit | unit | ✅ |

Nenhuma violação. Nenhuma task tem `Tests: none` — a matriz só permite `none` para config, e toda
task de config desta feature carrega o guarda que a cobre, no mesmo commit.

---

## Commits

Um commit por **task**, conforme a Skill — **e isso é a exceção declarada**, não a regra do projeto.
O `CLAUDE.md` manda agrupar num commit ao fim (`BL-012`), e a razão de abrir exceção aqui é que esta
feature é **medida**: cada task tem um número antes e depois, e um commit por task é o que permite
apontar qual mudança comprou qual milissegundo.

**Isto precisa do aval do usuário antes da T1.** Se a resposta for "vale o `CLAUDE.md`", os commits
saem agrupados por **fase** — cinco commits, um por fase, que ainda preserva a medição.

---

## Ferramentas: pergunta obrigatória antes da execução

| Pergunta | Contexto |
| --- | --- |
| **Prova em navegador real** — usar a Skill `playwright-cli` para medir 390×844 no fecho de cada fase? | O `CLAUDE.md` exige prova em viewport móvel, e **jsdom devolve 0 para toda medida de layout**. Sem navegador, `PRF-02` e `PRF-03` ficam provados só no atributo do DOM, nunca no byte que a rede entregou |
| **MCP do Supabase** | Está **configurado mas não autenticado** nesta sessão. Ele seria o caminho para conferir o consumo de transformação do primeiro mês. Sem ele, a medição de custo é manual, no painel |
| **Skill `qa-execution`** | Opcional, para o fecho: um roteiro de persona em 390 e 1440 depois da Fase 3 |
