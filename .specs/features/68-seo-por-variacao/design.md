# 68 — Design

**Spec:** `spec.md` (SVR-01..41, Assumptions confirmadas em 2026-10-19) · **Decisão:** `AD-052`
**Baseline de entrada** (2026-10-19, árvore parada, um workspace por vez, exit fora de pipe,
`--testTimeout=20000`): core **3011/122** · functions **977/22** · catalog-import **512/23** · store
**5164/289** · backoffice **3487/198** = **13151 em 654** (bate a tabela do `CLAUDE.md`).

## Medido antes de desenhar

| O quê | Onde | Consequência no desenho |
| --- | --- | --- |
| O `rewrite` repassa `?variant=` mesmo com `?slug=` no destino | produção, 2026-10-19 (spec, Open questions) | nenhuma mudança no `vercel.json` |
| HTML servido sem `rel="canonical"` | idem | `productHeadTags` passa a emitir uma |
| A loja já recebe as marcações **no mesmo `select` do produto**, filtradas pela RLS | `mapProduct.ts:39,51` (`PRODUCT_OPTION_MARKS_EMBED`) | SVR-13 sai de graça: peça e marcações chegam juntas. Nenhuma consulta nova no cliente |
| A loja só pode nomear `option_marks` no `mapProduct` | `marcacaoPorOpcaoComDonoUnico.test.ts` | a página passa o **produto inteiro** a `core`; quem lê o campo é `core` |
| A `product-page` lê com service role e **sem** `options`/`option_values`/marcações | `product-page/index.ts` | colunas novas + uma leitura **separada** das marcações (SVR-21 exige falhar sozinha) |
| `product_variants` é público só de peça ativa; marcações só de grupo ativo **e** peça ativa | migrations `05` e `67` | o sitemap (anon) herda tudo; a `product-page` reaplica **só o grupo ativo** — a peça ativa já é exigida por `feedExclusion` na elegibilidade (SVR-03) |
| `representativeVariant` prefere estoque | `offer.ts:130` | a representante da opção é OUTRA função, com outro nome |
| `?variant=` montado à mão no card da `67` | `ProductCard.tsx:234` | extrair `variantPath` em `core/shopping/offer.ts`; `offerLink` e o card passam a usá-lo (SVR-40) |
| Redirect de slug antigo descarta a query | `ProductPage.tsx:97` | preservar `?variant=` (edge case da spec) |
| O corpo da página lê `?variant=` uma vez por montagem e é chaveado só por `product.id` | `ProductPage.tsx:111,158` | SVR-16: chave passa a ser `product.id` + o `?variant=` da URL |
| `brandedTitle` não é chamado fora de `core` | grep | o guarda de SVR-39 pode recusar a chamada fora de `core` sem allowlist |

## Arquitetura

```
                         packages/core/src/seo/variant.ts   ◄── DONO ÚNICO (Deno-alcançável)
                         ├─ indexableOptions(input)          SVR-01..06
                         ├─ resolveVariantPage(input, param) SVR-07  → { kind: 'option' | 'product' }
                         ├─ productHead(input, param, desc)  SVR-08..11 → { meta, canonicalPath, page }
                         ├─ publicOptionMarks(rows)          SVR-20  (a restrição da RLS, para quem lê com service role)
                         └─ VARIES_BY / variesByFor(eixo)    SVR-32
                                   │ imports (todos com .ts)
       ┌───────────────────────────┼─────────────────────────────────┐
  shopping/offer.ts (variantPath, offerLink, resolveOffer)   seo/pages.ts (productPageMeta)   seo/brand.ts, seo/text.ts
       │
  shopping/jsonld.ts  — productJsonLd INTOCADO (paridade); productGroupJsonLd + withPageUrl NOVOS ao lado

Leitores (todos chamam productHead / indexableOptions — nenhum compõe nada):
  apps/store  ProductPage        → useCanonical(head.canonicalPath) + usePageMeta(head.meta)
  product-page handlers.ts       → <title>/meta/<link rel=canonical>/og:url + JSON-LD
  core/sitemap/urls.ts           → <loc> de opção logo depois da <loc> da peça
  apps/backoffice OptionMarkRow  → "Tem página própria no Google" (P3)
```

### Por que `core/seo` e não `core/shopping`

A pergunta é "qual é o `<head>` desta URL?", que é de `core/seo` (`AD-048`). `seo → shopping` já é
a direção que existe (o título não importa preço, mas a canônica é o `<g:link>`); `shopping → seo`
criaria ciclo. O `ProductGroup` mora em `shopping/jsonld.ts` porque parte de `ShoppingOffer`, e
`seo/variant.ts` não é importado por `shopping`.

## Componentes

### 1. `core/shopping/offer.ts` — `variantPath` (SVR-05, SVR-40)

```ts
export const variantPath = (product: { slug: string }, variant: OfferVariantIdentity): string =>
  `${productPath(product.slug)}?variant=${publicVariantId(variant)}`
export const offerLink = (p, v, origin) => `${trimOrigin(origin)}${variantPath(p, v)}`
```

`offerLink` fica byte a byte igual (`shoppingParity` sem toque). `ProductCard.tsx:234` troca a
montagem à mão por `variantPath` — o `encodeURIComponent` sai, e é identidade para os dois formatos
de id (dígitos, UUID); um caso prova isso com os dois.

### 2. `core/seo/variant.ts`

Tipos estruturais, sem importar `@estrelinha/supabase/types` (o grafo de tipos do Deno):

```ts
export interface VariantSeoProduct extends OfferProductEligibility, OfferProductIdentity {
  slug: string; name: string
  options?: readonly { name: string; position?: number }[] | null
  option_marks?: readonly OptionMarkLike[] | null   // a loja passa o Product inteiro
  description?: string | null; seo_title?: string | null; seo_description?: string | null
}
export interface VariantSeoVariant extends OfferVariantEligibility, OfferVariantIdentity {
  position?: number; option_values?: Record<string, string> | null
}
export interface IndexableOption { axis: string; text: string; variant: VariantSeoVariant; path: string }
export type VariantPage =
  | { kind: 'option'; option: IndexableOption; opened: VariantSeoVariant }
  | { kind: 'product'; opened: VariantSeoVariant | null }
```

- `kind` é literal de **string** (`strictNullChecks: false` não estreita booleano).
- Ordem dos eixos: `options` ordenado por `position` (ausente ⇒ ordem de chegada) — SVR-02.
- Ordem dos textos: a primeira ocorrência de cada texto **entre as variações elegíveis ordenadas**
  pela régua da representante. **Desvio declarado da letra de SVR-01** ("na ordem dos textos em
  `options` daquele eixo"): `ProductOption.values` existe no tipo, mas o texto de `option_values` é
  quem é comparado exato, e um texto de variação ausente de `values` sumiria. Se `values` estiver
  presente, ele ordena e os textos fora dele vão ao fim, na ordem da grade. Ver T03.
- `optionRepresentative` (nome próprio, nunca `representative*`): elegíveis com o texto, menor
  `position`, desempate por `publicVariantId` crescente (`localeCompare` não — comparação de código
  de caractere, `<`), estoque fora (SVR-04).
- `resolveVariantPage(input, param)`: `variantByPublicId` → elegível (`feedExclusion === null`) →
  texto no eixo indexável é indexável ⇒ `option`; senão `product` com `opened` = a pedida se
  elegível, `null` se não (SVR-07).
- `productHead(input, param, storeDescription)` — **a régua**: devolve `{ meta, canonicalPath,
  page }`. `option` ⇒ título `"{nome} — {texto}"` com espaços colapsados, `brandedTitle` só se o
  resultado tiver ≤ 60 caracteres (contados em code points, `[...s].length`); descrição
  `summarize(`${texto}. ${productPageMeta(...).description}`)`; `canonicalPath = option.path`.
  `product` ⇒ `productPageMeta` intocado e `canonicalPath = productPath(slug)`.
  - **Marca nunca em dobro**: se o nome já tem a marca, `brandedTitle` devolve sem sufixo — mas
    o nome é emendado ANTES da opção, então "… | UE — Prata" é possível. Régua: a marca (forma longa
    ou `| UE`) presente no **nome** ⇒ remove-se dela antes de compor? **Não** — `name` (não
    `seo_title`) foi escolhido justamente por não carregar marca (spec, Assumptions). Medir no T03
    quantos `name` contêm a marca; se zero, um caso trava o pressuposto.
- `publicOptionMarks(rows)`: recebe `{ option_name, option_value, value_id, filter_values: {
  filter_groups: { is_active } } }` e devolve só os de grupo ativo — a réplica da policy da `67`
  para quem lê com service role (SVR-20). Peça ativa não precisa de réplica: `feedExclusion` já a
  exige para toda variação elegível.
- `VARIES_BY`: `{ cor: 'https://schema.org/color', tamanho: 'https://schema.org/size' }`, chave pela
  dobra de acento e caixa (a dobra de `core/filters/suggest.ts` se for exportável e alcançável pelo
  Deno; senão uma local de 1 linha, `normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()`, com caso
  de igualdade com a de `filters`).

### 3. `core/shopping/jsonld.ts` (SVR-22, SVR-30..33)

- `productJsonLd(offer)` **não muda**. `shoppingParity.test.ts` sem uma asserção alterada.
- `withPageUrl(ld, { url, groupId? })` acrescenta `url` e, quando há `?variant=` válido,
  `inProductGroupWithID`.
- `productGroupJsonLd({ name, groupId, variesBy, url, variants: [{ offer, name, property, value,
  url }] })` — `hasVariant` com `productJsonLd(offer)` + `name`/`url`/propriedade.
- Precedência na `product-page`: `?variant=` **válido e elegível** ⇒ `Product` da aberta (+ `url` da
  canônica + `inProductGroupWithID`), mesmo quando resolve para peça; senão, eixo indexável na
  tabela ⇒ `ProductGroup`; senão `Product` da representante de hoje + `url`. Um `@type` por documento.

### 4. Loja — `ProductPage.tsx`

- `const variantParam = searchParams.get('variant')` no nível da página.
- `const head = vaiMostrar ? productHead(product, product.variants, variantParam, descricaoDaLoja) : null`
  (assinatura final no T03); `useCanonical(head?.canonicalPath ?? null)`; `usePageMeta(head?.meta ?? null)`.
  `metaPorRota` continua verde: a chamada de `usePageMeta(` segue no arquivo.
- SVR-12: o seletor não muda a URL ⇒ `variantParam` não muda ⇒ `head` não muda. Caso prova.
- SVR-16: `<ProductBody key={`${product.id}:${variantParam ?? ''}`}>` — remonta só em navegação.
- SVR-13: `vaiMostrar` já espera a peça; as marcações vêm no mesmo `select`.
- SVR-15: não há leitura separada das marcações no cliente para falhar. **Declarado**: a falha do
  embed é a falha da consulta do produto, comportamento da `67` inalterado. O caso de teste prova
  o lado que existe: produto **sem** `option_marks` (campo ausente/vazio) ⇒ `<head>` da peça e a
  variação da URL aberta.
- Slug antigo: `<Navigate to={productPath(slug) + search}>` preserva o `?variant=`.

### 5. `product-page`

- `index.ts`: `COLUNAS_PRODUTO += ',options'`, `COLUNAS_VARIACAO += ',option_values'`; dependência
  nova `readOptionMarks(productId)` lendo `product_option_filter_values` com
  `filter_values(filter_groups(is_active))` embutido; `throw` em erro.
- `handlers.ts`: `marcas = publicOptionMarks(await readOptionMarks(id))`, com `catch` ⇒ `[]` e
  `log({ fn: 'product-page', erro: 'marcacoes', slug })` (SVR-21). `productHead(...)` no lugar de
  `productPageMeta`. `ProductHead.url` passa a ser a canônica (com `?variant=` quando opção), e
  `productHeadTags` emite `<link rel="canonical" href="…">` **e** `og:url` com o mesmo valor, só com
  origem absoluta (SVR-18/19); remove qualquer `rel="canonical"` que o shell traga (exatamente uma).
- A oferta continua da aberta (`elegivel ?? representativeVariant`) — preço/`sku`/`offers.url` iguais
  aos de hoje.

### 6. Sitemap

- `SitemapProduct` ganha `id`, `is_active`, `options` (opcionais — fixture antiga continua válida).
- `SitemapUrlsInput` ganha `variants?` e `optionMarks?` (por `product_id`). `sitemapUrls` agrupa e,
  logo depois da `<loc>` da peça, emite `indexableOptions(...).map(o => absolute(base, o.path))`,
  `lastmod` = o da peça (SVR-24/25). A checagem de duplicata continua lançando.
- `handlers.ts`: `countVariants/readVariants` e `countOptionMarks/readOptionMarks` por
  `readAllPages` (SVR-26). Erro ou leitura incompleta ⇒ 503 `text/plain`, sem `<urlset>` (o caminho
  existente).
- `index.ts`: colunas `id,product_id,nuvemshop_id,price,is_active,position,option_values` e
  `product_id,option_name,option_value,value_id`, chave publicável (RLS decide).
- `SitemapUrl.loc` deixa de prometer "sem query" no comentário: "sem query, exceto `?variant=` de
  opção indexável".

### 7. `sitemap-check.yml` (SVR-34..36, SVR-41)

Depois da contagem: conta `<loc>` com `?variant=` e imprime. Para uma `<loc>` de produto **sem**
query e, se houver, uma **com** `?variant=`: busca o HTML, extrai `rel="canonical"`, e falha se
(a) a origem da canônica ≠ origem de onde o sitemap foi buscado (SVR-41), (b) para a de opção, a
canônica ≠ a `<loc>` (SVR-34). Zero `?variant=` ⇒ só imprime. Nenhum literal de domínio, slug ou id.
Guardado por um teste que lê o `.yml` (molde `emailCheckWorkflow.test.ts`).

### 8. Painel — `OptionMarkRow`/`FilterValuesCard` (SVR-37/38)

O modelo da seção (`optionRows.ts`) chama `indexableOptions` com o produto do formulário, as
variações do rascunho e as marcações do rascunho restritas a grupo ativo (o catálogo de grupos já
está na tela). Linha de texto indexável: "Tem página própria no Google". Peça com marcação em outro
eixo: uma frase no topo do eixo não indexável — "Só o primeiro eixo marcado ganha página própria no
Google; as marcações deste continuam valendo para o filtro." Sem emoji, sem exclamação.

## Guardas — o que muda, sem afrouxar

| Guarda | Muda como |
| --- | --- |
| `core/seo/__tests__/seo.test.ts` | **ganha** a régua do título de opção (≤ 60 com marca, > 60 sem, nunca cortado, marca nunca em dobro) e da descrição (≤ 160, nunca vazia, começa pelo texto). Nada removido |
| `core/seo/__tests__/denoReach.test.ts` | a âncora **sobe**: o grafo passa a alcançar `seo/variant.ts`, `shopping/{identity,eligibility,offer,pricing}.ts`; asserções de presença acrescentadas para esses nomes; `≥ 7` vira o número medido |
| `core/shopping/__tests__/denoReach.test.ts` | intocado, e continua verde com `variantPath` (sem import novo em `offer.ts`) |
| `core/shopping/__tests__/shoppingParity.test.ts` | **zero linhas alteradas** — conferido por `git diff --stat` no gate (SVR-22) |
| `pages/__tests__/metaPorRota.test.ts` | intocado; continua exigindo `usePageMeta(` na `ProductPage` |
| `marcacaoPorOpcaoComDonoUnico.test.ts` | intocado; a loja continua sem nomear `option_marks` fora do `mapProduct` |
| `core/sitemap/__tests__/urls.test.ts` | a régua de `SMP-07` é **reescrita** para SVR-27 e fica mais estreita que "nenhum `?`": a única query aceita é `?variant=<id>` e o id tem de ser de opção indexável **segundo `indexableOptions`**; sensores: `?utm=`, `?variant=` de variação não indexável, `&` extra, e o inverso (a de opção passa). Mais SVR-28 nos dois sentidos com a mesma função da produção |
| `core/sitemap/__tests__/render.test.ts` | ganha a `<loc>` com query escapada |
| `functions/sitemap/__tests__/handlers.test.ts` | ganha: falha de variações ⇒ 503 sem `<urlset>`; falha de marcações ⇒ idem; leitura truncada (total 1001, página devolvendo 1000) ⇒ idem; o caminho feliz com duas cores |
| `functions/product-page/__tests__/handlers.test.ts` | ganha: canônica servida (peça e opção), exatamente uma, igual ao `og:url`; origem relativa ⇒ nenhuma das duas; `<head>` de opção; grupo inativo ⇒ peça (SVR-20); falha de marcações ⇒ 200 com a peça e o log (SVR-21); `ProductGroup`/`inProductGroupWithID`; escape de `&`/`<`/aspas no texto da opção |
| `vercelRedirects.test.ts` | intocado |
| **novo** `paginaDeOpcaoComDonoUnico.test.ts` (store `shared/lib/__tests__`, varre `apps/**` e `supabase/functions/**`) | SVR-39/40: recusa, fora de `packages/core`, (a) string/template de **código** contendo `?variant=` seguido de interpolação ou concatenação, (b) chamada a `brandedTitle(`, (c) o separador ` — ` emendado a `option`/`texto` num template. **Metade positiva**: `ProductPage.tsx` chama `productHead`, `product-page/handlers.ts` chama `productHead`, `ProductCard.tsx` chama `variantPath`, `core/sitemap/urls.ts` chama `indexableOptions`. Zero allowlist; âncora dupla; sensores de CRLF/LF/glob de dois asteriscos e o inverso (comentário que cita `?variant=` não é acusado) |
| **novo** `seo/__tests__/variant.test.ts` | SVR-01..07 com a fixture "Pingente Pata" da spec; SVR-05 comparando com `resolveOffer(...).link` |
| **novo** `sitemapCheckWorkflow.test.ts` (store, lê o `.yml`) | SVR-34..36/41: sem literal de domínio, slug ou id; passo da origem presente; zero `?variant=` não falha |

## O que só o navegador / a produção prova

- SVR-14 (`page_view` com o título da opção e o `?variant=`): aba Rede no navegador.
- SVR-23 e os Success Criteria: `curl` contra a loja publicada **depois do deploy** — tipo entregue,
  `<title>` com a cor, uma `rel="canonical"` igual à URL, `og:url` igual. Antes da curadoria em
  produção não haverá opção indexável; a prova servida de opção é feita no **local** (function
  servida + banco local com cores marcadas), e a de produção prova a canônica **da peça** e a
  ausência de `<loc>` com `?variant=` (Success Criterion 2).
- Script sobre o sitemap local inteiro: toda `<loc>` com `?variant=` ⇒ canônica servida igual
  (Success Criterion 1, não amostra).
