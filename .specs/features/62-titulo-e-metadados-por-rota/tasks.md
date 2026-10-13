# Tasks — 62 · Título e metadados por rota

Design inline (Medium): a regra é pura em `packages/core/src/seo/`; o cliente a aplica por um hook
único (`usePageMeta`); o servidor a aplica na `product-page`. Commits ao final (`BL-012`).

| # | Task | Requisitos | Arquivos | Gate |
| --- | --- | --- | --- | --- |
| 01 | `01-core-seo` — derivação pura: marca, texto, tabela das rotas fixas, produto, categoria, 404, busca | MTA-01..05, MTA-10 (b) | `packages/core/src/seo/**`, `packages/core/package.json` | `pnpm --filter @estrelinha/core test` |
| 02 | `02-seo-no-produto` — `Product` carrega `seo_title`/`seo_description` | MTA-02, MTA-03 | `packages/supabase/src/types/index.ts`, `entities/product/lib/mapProduct.ts` | store, arquivo do mapper |
| 03 | `03-use-page-meta` — o hook (título, descrição, `og:`/`twitter:`, `robots`) e o sinal de declaração; `useDocumentMeta` apagado | MTA-06..08 | `shared/lib/pageMeta.ts`, `shared/lib/usePageMeta.ts` | store, arquivo do hook |
| 04 | `04-toda-pagina-declara` — as 18 páginas chamam o hook; guarda que lê o `App.tsx` | MTA-01..05, MTA-09, MTA-10 (a) | `pages/*.tsx`, `pages/__tests__/metaPorRota.test.ts` | store inteira |
| 05 | `05-page-view-espera` — `PageViewTracker` espera a declaração, prazo de 3 s, `REPLACE` não mede | MTA-11..14 | `app/PageViewTracker.tsx`, `app/__tests__/analytics.test.tsx` | store inteira |
| 06 | `06-produto-servido` — `product-page` substitui `<title>`/descrição/`og:`/`twitter:` | MTA-15..18 | `supabase/functions/product-page/**` | functions |
| 07 | `07-arte-de-compartilhamento` — `og:image` padrão nova, JPEG 1200×630 | MTA-19 | `apps/store/index.html`, `public/joia-afetiva-…jpg`, `brandAssets.test.ts` | store inteira |
| 08 | `08-fecho` — baselines, `CLAUDE.md` raiz e da loja, `STATE.md` | — | docs | os cinco workspaces, lint, tsc, build |

Gate de fecho: os cinco workspaces um por vez com exit code fora de pipe e `--testTimeout=20000`
nos dois apps; lint; `tsc` dos dois apps; `pnpm build`; `git diff --name-only -- packages/core/src/payment`
vazio.
