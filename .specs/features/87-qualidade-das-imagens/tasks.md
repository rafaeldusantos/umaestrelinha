# 87 — Tasks

Workspaces tocados: **core**, **store**, **backoffice**. Gate de cada task: os testes do arquivo
tocado + a suíte inteira do(s) workspace(s) afetado(s), **e a da loja sempre** (os guardas dela
varrem `apps/**` e `packages/**`). Medição um workspace por vez, `--testTimeout=20000` sem `--`,
exit code fora de pipe. Sem commit (só quando o usuário pedir). Sem migration.

## Fase 0 — baseline

- ✅ **00-baseline** — medir core, store e backoffice com a árvore parada; tipos (store, backoffice,
  core) e lint (store, backoffice). Gravar em `baseline.md`.

## Fase 1 — loja

- ✅ **01-larguras-no-core** — `RENDITION_WIDTHS_WIDE`, `RENDITION_WIDE_MAX`, `RENDITION_ZOOM_WIDTH`
  em `core/media/rendition.ts` (e no barrel). **Reqs:** IMG-01, IMG-08.
  **Done when:** `rendition.test.ts` prova os valores, a derivação das três primeiras e o arquivo
  sem import; core verde.
- ✅ **02-palco-e-zoom** — `ProductGallery` (as duas leituras do palco com o par largo) e `ImageZoom`
  (a camada com `zoomSrc` só existe com o ponteiro em cima). **Reqs:** IMG-02, IMG-15, IMG-16, IMG-17.
  **Done when:** `ProductGallery.test.tsx` (props do `ImageZoom` registradas e iguais às do palco do
  celular; quatro larguras; `src` de 1080) e `ImageZoom.test.tsx` novo (antes/depois do hover, troca
  de foto, externa) verdes; store verde.
- ✅ **03-preload** — `imagePreloadLink` com o par largo. **Reqs:** IMG-03.
  **Done when:** `head.test.ts` prova `imagesrcset` igual ao do palco e `href` de 1080; core verde.
- ✅ **04-banners-da-home** — `HeroBanner`, `HomeBannerGrid`, `CollectionFeature`, `HeroCarousel`
  (celular). **Reqs:** IMG-04, IMG-05, IMG-06, IMG-07.
  **Done when:** os testes de cada widget provam os descritores; os das superfícies não tocadas
  passam sem edição; store verde.

## Fase 2 — painel

- ✅ **05-envio-do-painel** — `uploadImage.ts`: 0.92, `high`, 2400, sem recompressão quando cabe.
  **Reqs:** IMG-09..IMG-14.
  **Done when:** `uploadImage.test.ts` com um caso por AC (inclusive o `Blob` sem tipo, o WebP
  grande e a falha de carga sem canvas); backoffice e store verdes.
- ✅ **06-dica-da-area-de-envio** — a frase de IMG-18 em `ImageGallery.tsx`; comentários que citam
  1600 em `uploadHomeImage.ts` e `AdminQuickGridPage.tsx`. **Reqs:** IMG-18.
  **Done when:** teste pela frase inteira; backoffice verde.

## Fase 3 — fecho

- ✅ **07-fecho** — tipos 0 nos três, lint sem regressão, `pnpm build` verde, `payment/**` intocado;
  prova em navegador dos Success Criteria (390×844 @3x produto e categoria, 1440 zoom, envio local
  com SHA-256); baselines e `CLAUDE.md` atualizados.
- Depois: **Verifier independente** → QA (`qa-report`/`qa-execution`) → conserto e reteste.

| Req | Task |
| --- | --- |
| IMG-01, IMG-08 | 01 |
| IMG-02, IMG-15, IMG-16, IMG-17 | 02 |
| IMG-03 | 03 |
| IMG-04..IMG-07 | 04 |
| IMG-09..IMG-14 | 05 |
| IMG-18 | 06 |

## Registro do gate (2026-10-29)

core **4923/190** (+5) · store **6229/334** (+10/+1) · backoffice **4504/243** (+13) — todos exit 0,
um por vez. Tipos 0 · 0 · core 11. Lint 2/2 · 23/5. `pnpm build` verde. `payment/**` intocado.
Testes antigos **reescritos por mudança de valor da spec** (não afrouxados): as três larguras → quatro
em `ProductGallery`, `HomeBannerGrid`, `serve.test.ts`; `src`/`href` 720 → 1080; o caso "duas
larguras" do `HeroCarousel` → descritores exatos; "1600 px" → 2400 em `uploadImage.test.ts`; a frase
da dropzone. Prova em navegador: `prova-navegador.md`.
