# 69 — Tasks

**Spec**: `spec.md` · **Design**: `design.md` · **Decisão**: `AD-053`
**Status (2026-10-19)**: T02–T13 ✅ · T01 ⏳ (preview atrás do login) · T14 parcial (gates, docs e verificação feitos; prova em plataforma pendente)
**Commits**: nenhum por task (CLAUDE.md, `BL-012`); só o branch descartável `69-spike` foi commitado,
com autorização do usuário. Commit da feature só quando o usuário pedir.
**Execução**: pedido do usuário (2026-10-19) — frentes paralelas por agentes, com **propriedade de
arquivo disjunta** escrita abaixo. Ninguém edita arquivo de outra frente; quem precisa de algo de
outra frente usa a **interface fixada aqui**.

---

## Fase 0 — Spike (sequencial, orquestrador)

### T01 — Provar o transporte num preview da Vercel
- **What**: branch `69-spike` com `api/page.mjs` reexportando um bundle esbuild gerado no build, e
  `api/gen.mjs` gerado direto. Rewrites `/spike/:path*` e `/spike-gen/:path*`.
- **Done when**: no preview, medido por `curl`: (1) qual das duas formas a Vercel detecta;
  (2) `__path` e `?variant=` chegam à função; (3) `VERCEL_REGION = pdx1`; (4) env publicável lida em
  runtime; (5) `X-Vercel-Cache: HIT` na segunda batida; (6) latência do banco a partir da função.
- **Saída**: o resultado decide o layout de T11 (escrito aqui ao fechar T01).

---

## Interfaces fixadas (contrato entre frentes)

```ts
// packages/core/src/page/images.ts — FRENTE B é dona. Folha alcançável pelo Deno: todo import
// relativo com `.ts`, nenhum import de pacote.
export const OG_IMAGE_WIDTH = 1200
/** As fotos que a página do produto declara: [0] é o og:image; o sitemap usa a lista toda. */
export const productPageImages: (
  product: OfferInputProduct,
  variants: readonly OfferInputVariant[],
) => string[]   // vazio quando não há foto; sem duplicatas; renditionUrl(url, OG_IMAGE_WIDTH)

// packages/core/src/page/categoryRoute.ts — FRENTE A é dona.
export type CategoryRoute =
  | { kind: 'ok'; category: C; canonical: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'notfound' }
export const resolveCategoryRoute: (input: {
  slug: string; parentSlug?: string | null; categories: readonly C[];
  redirectTo?: string | null;            // category_redirects (SEO-02)
  inactiveFallback?: string | null;      // id devolvido pela RPC; ROOT_FALLBACK ⇒ '/'
}) => CategoryRoute

// RPC — FRENTE C é dona.
// public.category_fallback(p_slug text) returns uuid
//   null  ⇒ não existe categoria INATIVA com esse slug
//   '00000000-0000-0000-0000-000000000000' (ROOT_FALLBACK) ⇒ inativa sem ancestral ativo
//   outro ⇒ id do ancestral ativo mais próximo
```

---

## Frente A — `core/page` (agente A)

**Arquivos da frente**: `packages/core/src/page/**` **exceto** `images.ts` e o teste dele;
`packages/core/src/routes/routes.ts` (só o acréscimo de `APP_ROUTE_PATTERNS`);
`packages/core/package.json` (export `./page`); `apps/store/src/entities/category/lib/resolveCategoryRoute.ts`
(vira reexport) e o teste dele; o guarda novo de rotas de app.

### T02 — `resolveCategoryRoute` sobe para `core/page/categoryRoute.ts`
- Movido sem mudar comportamento; acréscimo de `inactiveFallback` com a precedência de SSV-34.
- O arquivo da loja passa a reexportar; os testes existentes mudam de casa (contagem reaparece).
- **Done when**: SSV-14, 15, 16, 32, 33, 34 com teste em `core`; os testes antigos verdes no endereço novo.

### T03 — `core/page/head.ts`: `applyHead` e auxiliares
- `productHeadTags`, `injectIntoHead`, `jsonLdScript`, `imagePreloadLink`, `escapeHtmlAttr` saem de
  `supabase/functions/product-page/handlers.ts` (**copiados nesta task, apagados lá em T12**);
  `applyHead(shell, { title, description, canonical, image, ogType, noindex?, extra? })` generaliza.
- **Done when**: os casos de `productHead.test.ts` passam contra `applyHead` com `ogType: 'product'`;
  `noindex` injeta exatamente uma `<meta name="robots" content="noindex">`; `ogType: 'website'`;
  nenhuma tag duplicada (SSV-20).

### T04 — `APP_ROUTE_PATTERNS` e `classifyPath`
- `APP_ROUTE_PATTERNS` em `core/routes`; `classifyPath(path)` em `core/page/classify.ts`.
- Guarda bidirecional com o `App.tsx` (store `app/__tests__/rotasDeApp.test.ts`), âncora de contagem.
- **Done when**: SSV-09, SSV-10 e a classificação de toda linha da tabela do design.

### T05 — `core/page/serve.ts`: `servePage`
- O ramo de produto é o `handleProductPage` de hoje (mesmo `<head>`, mesmo JSON-LD, mesmo preload),
  agora com 404 para inexistente/inativo e 301 por `product_redirects`; os casos de
  `handlers.test.ts` mudam de casa (exceto shell cache, que deixa de existir) e ganham os novos.
- Ramos de categoria (via `resolveCategoryRoute`), página fixa (`staticPageMeta`), rota de app,
  404, erro; `Cache-Control` por ramo como na tabela do design.
- **Done when**: SSV-01, 05, 06, 07, 08, 12, 13, 18, 19, 21, 22, 31 com teste.

### T06 — Pureza e export
- `core/page/__tests__/purity.test.ts` (sem React, Supabase, Node, Deno); `"./page"` no `package.json`
  do `core`.

---

## Frente B — Sitemap com imagens (agente B)

**Arquivos da frente**: `packages/core/src/page/images.ts` + `__tests__/images.test.ts`;
`packages/core/src/sitemap/**`; `supabase/functions/sitemap/**`;
`packages/core/src/seo/__tests__/denoReach.test.ts` **só se** o grafo de `core/seo` mudar (não deve).

### T07 — `productPageImages` e o sitemap com `<image:image>`
- `images.ts` conforme a interface; `SitemapUrl.images`; `sitemapUrls` preenche só produto;
  `renderSitemapXml` com namespace e escape.
- **Done when**: SSV-24..30 com teste; o `[0]` igual ao `og:image` que a `product-page` de hoje
  monta para a mesma fixture (asserção cruzada contra `renditionUrl(oferta.imageLink, 1200)`).

### T08 — A function `sitemap` lê as fotos
- `select` com `images` e `image_url` das variações; teste de handler com as fotos no XML; o grafo
  Deno de `core/page/images.ts` coberto por um `denoReach` (molde de `shipping/denoReach.test.ts`).

---

## Frente C — Migration (agente C)

**Arquivos da frente**: `supabase/migrations/20261020120000_69-categoria-inativa.sql`;
`apps/store/src/shared/lib/__tests__/categoryFallbackSchema.test.ts`.

### T09 — `category_fallback`
- Conforme a interface; `security definer`, `search_path = ''`, `stable`, `grant execute` a `anon` e
  `authenticated`, `revoke` de `public`; só lê `id`, `slug`, `parent_id`, `active`; nenhuma escrita.
- **Done when**: guarda com uma régua por comando e `mutar()` que lança; **probe SQL no banco local**
  (subcategoria inativa com pai ativo ⇒ id do pai; raiz inativa ⇒ sentinela; ativa ⇒ null;
  inexistente ⇒ null; neto inativo com pai inativo e avô ativo ⇒ id do avô).

---

## Fase D — Ligação com a Vercel (depois de A, B, C)

### T10 — `apps/store/server/page.ts`
- `PageDeps` reais: supabase-js publicável sem sessão, as leituras, `category_fallback`, settings,
  `__SHELL__`, `log`. Handler `fetch` que reconstrói a URL original de `__path` + query.
- **Done when**: teste de unidade com client dublê que **enxerga os filtros** (molde `_shared/testing`);
  `chaveDeServidorForaDoNavegador` segue verde.

### T11 — Build e `vercel.json`
- Layout escolhido em T01; `pnpm build` gera o bundle; build **falha** sem `dist/index.html`.
- `vercel.json`: `regions`, catch-all para a função, sem rewrite externo de `/produtos/:slug` e sem o
  override de `Content-Type` dele; `vercelRedirects.test.ts` atualizado com asserção positiva no novo.
- **Done when**: SSV-02, 03, 04 (os de plataforma, provados no preview).

### T12 — Aposentar o código da `product-page`
- Remove `supabase/functions/product-page/**`; atualiza `paginaDeOpcaoComDonoUnico`,
  `wiringResolve` (âncora derivada), `seo/denoReach` se citar o caminho, `supabase/config.toml`
  (bloco da function), docs que a nomeiam como escritor.
- **Done when**: nenhum arquivo de produção nomeia `product-page` como escritor; contagem de testes
  movidos reaparece em `core`.

### T13 — Guarda das páginas fixas servidas (SSV-23)
- Toda entrada de `SITEMAP_STATIC_PATHS` − `/` classificada `static` e servida com `staticPageMeta`,
  e o inverso; âncora de contagem.

---

## Fase E — Fecho

### T14 — Gates, prova servida, docs
- Cinco workspaces medidos um por vez; lint 26/7; `tsc` 0·0·0; `pnpm build`.
- Prova no preview: SSV-01..34 de plataforma por `curl` (status, `Content-Type`, `X-Vercel-Cache`,
  TTFB, `Location`).
- Baselines e `CLAUDE.md` (raiz, store, core, supabase); `BL-017` fechado; handoff.
- Verifier independente (automático).

---

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| core | `pnpm --filter @estrelinha/core test` |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| functions | `pnpm --filter @estrelinha/functions test` |
| tipos | `npx tsc --noEmit -p apps/store/tsconfig.app.json` (e backoffice) |
| build | `pnpm build` |

Exit code capturado fora de pipe, sempre.

## Test Coverage Matrix

| Camada | Onde | Expectativa |
| --- | --- | --- |
| Regra pura | `packages/core/src/page/__tests__` | 1:1 com SSV; cada edge case com caso próprio |
| Sitemap | `packages/core/src/sitemap/__tests__`, `supabase/functions/sitemap/__tests__` | SSV-24..30 |
| Migration | store `shared/lib/__tests__` + probe SQL local | régua por comando |
| Wiring | `apps/store/server/__tests__` | leituras com filtros visíveis |
| Plataforma | preview da Vercel, `curl` | SSV-02/03/04 e status reais |
