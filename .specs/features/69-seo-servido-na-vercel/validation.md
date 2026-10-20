# 69 — Validação

**Data**: 2026-10-19
**Spec**: `.specs/features/69-seo-servido-na-vercel/spec.md` (SSV-01..34)
**Diff**: working tree sobre `90be4911` (nada commitado), mais os arquivos não rastreados da feature
(`packages/core/src/page/**`, `apps/store/{api,server,scripts}/**`, `apps/store/tsconfig.server.json`,
os guardas novos, a migration `20261020120000_69-categoria-inativa.sql`). `supabase/operacoes/` ignorado.
**Verificador**: sub-agente independente (autor ≠ verificador). Nenhum código ou teste alterado; só este arquivo.

---

## Veredito: ❌ FAIL — um conserto pequeno, no wiring da função

A regra pura (`core/page`), o sitemap, a migration e os guardas estão bem cobertos: **33 de 36
mutantes de comportamento morreram por asserção, nenhum por compilação**. O que reprova é a fiação
de `apps/store/server/page.ts`: **tirar `stock` das colunas da variação, ou `stock_policy` das do
produto, deixa a suíte da loja inteira verde** (5298/5298). Com `stock` ausente, `offerAvailability`
(`core/shopping/pricing.ts:77`, `variant.stock > 0`) declara **toda peça `track` como `OutOfStock`**
no JSON-LD servido, e a representante passa a ser a primeira por posição. Isso quebra SSV-01 (o
`<head>` igual ao de antes) e SSV-26 (o `og:image` deixaria de ser o `[0]` do sitemap, que lê `stock`)
— e o Merchant Center compara o preço/disponibilidade da página com o do feed. É exatamente o defeito
que `supabase/functions/sitemap/__tests__/wiring.test.ts` guarda do lado do sitemap; do lado da página
o guarda equivalente não existe.

As três ACs de plataforma (SSV-02/03/04) e a medida de TTFB/HIT estão **pendentes de prova no deploy**,
não reprovadas: o que é verificável localmente delas foi verificado (abaixo).

---

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Esperado pelo autor |
| --- | --- | --- |
| `pnpm --filter @estrelinha/core test` | exit 0 · **3381 / 132** | 3381/132 ✅ |
| `pnpm --filter @estrelinha/functions test` | exit 0 · **926 / 21** | 926/21 ✅ |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | exit 0 · **5298 / 296** | 5298/296 ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | exit 0 | 0 ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.server.json` | exit 0 | 0 ✅ |

**Delta contra a tabela de `HEAD`** (store 5222/292 · core 3116/123 · functions 1010/22): core
**+265/+9**, store **+76/+4**, functions **−84/−1**. A queda de functions é declarada: os dois
arquivos de teste da `product-page` (71 + 15 blocos `it`) foram apagados com a function, e o cabeçalho
de `packages/core/src/page/__tests__/serve.test.ts:11-27` lista os 63 que vieram e os 12 que não vieram
(cada um com o motivo de a coisa medida ter deixado de existir). Nenhuma asserção portada foi afrouxada
sem a spec mandar (três mudaram de veredito por SSV-07/SSV-03, declaradas ali).

`packages/core/src/payment/**` e `shoppingParity.test.ts`: **zero** arquivos/linhas no diff.

---

## Cobertura por AC (evidence-or-zero)

Legenda: ✅ coberto com o valor da spec · ⏳ pendente de prova em plataforma (com o que é local provado) ·
⚠️ gap de precisão.

| AC | Valor que a spec define | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| SSV-01 | 200, `text/html; charset=utf-8`, `<head>` igual ao da `product-page` | `packages/core/src/page/__tests__/serve.test.ts:103` — `status toBe(200)`; `:369` — `Content-Type toBe('text/html; charset=utf-8')`; `:343` — corpo `toBe(injectIntoHead(applyHead(...), jsonLdScript(...)))`; casos portados `:102-620` e `productHead.test.ts` | ⚠️ regra ✅, **wiring não prova as colunas que a regra precisa** (M34/M35 sobrevivem) — gap #1 |
| SSV-02 | servida dentro do deploy; sem `rewrite` para `*.supabase.co` em `/produtos/:slug` | `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts:183` — `porSource('/produtos/:slug') toBeUndefined()` e nenhum destino `/product-page/`; `:462` — externos `toEqual(['/feeds/google-shopping.xml','/sitemap.xml'])` | ⏳ arquivo ✅; "a Vercel detecta e executa `api/page`" só no preview |
| SSV-03 | `s-maxage=300`; 2ª batida `HIT` | `serve.test.ts:252` — `Cache-Control toBe('public, s-maxage=300')` | ⏳ header ✅; `X-Vercel-Cache: HIT` e TTFB < 300 ms só no deploy |
| SSV-04 | shell do **mesmo build**, nunca por HTTP | `vercelRedirects.test.ts:483` — `scripts.build toBe('vite build && node scripts/build-server.mjs')`; `:473` — `api/page.mjs` reexporta `.server/page.mjs`. **Medido por este verificador**: o bundle `apps/store/.server/page.mjs` chamado em Node sem env devolveu corpo **idêntico byte a byte** a `dist/index.html` | ⏳ local ✅; "nenhum HIT aponta para bundle de outro deploy" é da plataforma |
| SSV-05 | `?variant=` indexável ⇒ `<head>` da opção; desconhecido/inativo/não indexável ⇒ peça, 200 | `serve.test.ts:443` — título, description, og/twitter e canônica `?variant=`; `:487` — `it.each` inválido/desconhecido/sem marcação ⇒ `status 200` + canônica da peça; `:177` — inativa = desconhecida; `apps/store/server/__tests__/page.test.ts:85` — `originalUrl` preserva `variant` | ✅ |
| SSV-06 | falha de leitura ⇒ shell intacto, 200, **não** cacheado por 300 | `serve.test.ts:207` — `status 200`, `body toBe(SHELL)`, `Cache-Control toBe('no-store')`; `:699` — log com `path` | ✅ |
| SSV-07 | produto inexistente **ou** inativo ⇒ 404, corpo do shell, `noindex` no HTML | `serve.test.ts:199` — `404`, `toContain('<meta name="robots" content="noindex">')`, exatamente 1 `robots`, `toContain('<div id="root"></div>')`; `:634` — `is_active:false` ⇒ `404` e `robots toEqual(['noindex'])` | ✅ |
| SSV-08 | categoria inexistente ⇒ 404 + `noindex` | `serve.test.ts:909` — `404`, `robots toEqual(['noindex'])`, `s-maxage=60` | ✅ |
| SSV-09 | 3+ segmentos não declarados ⇒ 404 | `classify.test.ts:107` — `/a/b/c`, `/joias-afetivas/x/y`, `/a/b/c/d` ⇒ `notfound`; `serve.test.ts:999` — `404` + `noindex` | ✅ |
| SSV-10 | rotas fixas do `App.tsx` continuam 200 | `classify.test.ts:113` — 14 rotas ⇒ `{kind:'app'}`; `serve.test.ts:990` — `200`, `body toBe(SHELL)`, 3600; `apps/store/src/app/__tests__/rotasDeApp.test.ts:106` — "nenhuma rota declarada vira 404 no servidor", bidirecional `:78/:82` | ✅ |
| SSV-11 | legado segue 301 para o destino de hoje | `vercelRedirects.test.ts:82-121` — os 4 `statusCode: 301` com destino exato e igualdade bidirecional com `LEGACY_REDIRECTS` (intocados pela feature; os `redirects` da Vercel são avaliados antes dos `rewrites`) | ✅ |
| SSV-12 | 404 com cache ≤ 60 s | `serve.test.ts:649` — `toBe('public, s-maxage=60')`; `:913` (categoria) | ✅ |
| SSV-13 | falha ao decidir categoria ⇒ 200, nunca 404 | `serve.test.ts:916` (árvore), `:927` (`category_redirects`), `:938` (RPC) — `status 200`, `no-store`; `:679` (`product_redirects`) | ✅ |
| SSV-14 | subcategoria inativa, pai ativo ⇒ 301 para o pai | `serve.test.ts:879` — `301`, `Location toBe('/personalizados')`, RPC chamada com `'profissoes'`; `categoryRoute.test.ts:183`. **Probe local deste verificador** (bundle real + banco local): `/personalizados/profissoes` e `/profissoes` ⇒ `301 /personalizados`, `s-maxage=300` | ✅ |
| SSV-15 | sem ancestral ativo ⇒ 301 `/` | `serve.test.ts:887` — `Location toBe('/')`; `categoryRoute.test.ts:202` | ✅ |
| SSV-16 | ancestral dois níveis acima, **um** salto | `serve.test.ts:895` — `Location` direto à canônica do avô; `categoryRoute.test.ts:212`; SQL: `categoryFallbackSchema.test.ts:300` (ordena por profundidade, mais próxima) com sensor `:304` | ✅ (o SQL é provado por régua de texto + probe do autor; meu probe local cobriu só o caso pai) |
| SSV-17 | sem chave de serviço em `apps/**`; nada além do destino | `categoryFallbackSchema.test.ts:185` (`security definer`), `:212` (revoke public), `:220` (`execute` só `anon`,`authenticated`), `:238` (lê só `id,slug,parent_id,active`), `:250` (sem `*`), `:268` (sem escrita); `chaveDeServidorForaDoNavegador.test.ts` verde na suíte. **Probe local**: RPC devolve só `uuid` (`profissoes` ⇒ id de `personalizados`; ativa/inexistente ⇒ `null`) e `categories?slug=eq.profissoes` com a chave publicável ⇒ `[]` | ✅ |
| SSV-18 | 200, `text/html`, título/descrição de `categoryPageMeta` | `serve.test.ts:798` — `200`, `Content-Type toBe('text/html; charset=utf-8')`, título e descrição literais | ✅ |
| SSV-19 | canônica absoluta de 2 segmentos, `og:*`, `og:url` = canônica, `og:type=website`, `og:image` com arte | `serve.test.ts:808`, `:817` (um segmento ⇒ canônica de dois), `:823` (banner > image_url, rendição 1200), `:834` (sem arte, card do shell) | ✅ |
| SSV-20 | nenhuma tag duplicada no HTML servido | `head.test.ts:61` — cada tag gerenciada exatamente 1 vez; `serve.test.ts:840` (categoria com shell carregado de duplicatas) e `:546` (produto); `head.test.ts:151` (robots) | ✅ |
| SSV-21 | categoria `s-maxage=300` | `serve.test.ts:852` | ✅ |
| SSV-22 | fixa com título/descrição de `staticPageMeta` e canônica absoluta | `serve.test.ts:970`; `paginasFixasServidas.test.ts:173` (todas as 6) | ✅ |
| SSV-23 | guarda bidirecional com `SITEMAP_STATIC_PATHS` | `apps/store/src/app/__tests__/paginasFixasServidas.test.ts:173/:177`, sensores `:183` (a mais), `:188` (a menos), `:193` (shell intacto), âncoras `:156/:162` | ✅ |
| SSV-24 | uma `<image:image>` por foto, na ordem | `packages/core/src/sitemap/__tests__/images.test.ts:114`, `:193` (por namespace, parser real), `:204`; `supabase/functions/sitemap/__tests__/handlers.test.ts` (corpo servido) | ✅ — a 1ª é a da representante e as demais seguem `products.images` sem repetir (Assumption da spec) |
| SSV-25 | `xmlns:image` exato | `sitemap/__tests__/images.test.ts:186` — `getAttribute('xmlns:image') toBe('http://www.google.com/schemas/sitemap-image/1.1')` | ✅ |
| SSV-26 | 1ª `<image:loc>` = `og:image` byte a byte | `packages/core/src/page/__tests__/images.test.ts:123-160` (cruzada contra a montagem da `product-page`); `sitemap/__tests__/images.test.ts:119`; `serve.test.ts:757` (`og:image` = `productPageImages(...)[0]`) | ⚠️ regra ✅; a fiação da página não prova `stock`/`stock_policy` (gap #1) |
| SSV-27 | sem foto ⇒ sem bloco, nunca `<image:loc>` vazio | `sitemap/__tests__/images.test.ts:147`, `:211` | ✅ |
| SSV-28 | só produto (não categoria, fixa, opção) | `sitemap/__tests__/images.test.ts:135`, `:141` | ✅ |
| SSV-29 | escape (`&`, `<`, aspas) | `sitemap/__tests__/images.test.ts:223` — literal escapado e o parser devolve a original | ✅ |
| SSV-30 | teto de 1.000 | `sitemap/__tests__/images.test.ts:167` — 1.001 ⇒ `toHaveLength(1000)` | ✅ |
| SSV-31 | `product_redirects` ⇒ 301 `/produtos/<atual>` | `serve.test.ts:654` — `301`, `Location toBe('/produtos/pulseira-nova?variant=1259936246')`, 300, corpo vazio; `server/__tests__/page.test.ts:324` (pelo handler, com a query) | ✅ |
| SSV-32 | `category_redirects` ⇒ 301 à canônica | `serve.test.ts:871`; `categoryRoute.test.ts:239` | ✅ |
| SSV-33 | pai errado ⇒ 301 à canônica | `serve.test.ts:864`; `categoryRoute.test.ts:248`. Probe local: `/outra-mae/joia-de-leite-materno` ⇒ `301 /joias-afetivas/joia-de-leite-materno` | ✅ |
| SSV-34 | ativa > redirect > inativa > 404 | `categoryRoute.test.ts:258-305` (os quatro pares); `serve.test.ts:856` (ativa nem consulta), `:901` (redirect vence inativa) | ✅ |

**Contagem**: 34/34 com evidência `arquivo:linha`; **29 ✅**, **3 ⏳ plataforma** (SSV-02/03/04),
**2 ⚠️** (SSV-01 e SSV-26 — o mesmo gap de wiring).

### Wiring de `apps/store/server/page.ts` (dublê que enxerga o filtro)

`apps/store/server/__tests__/page.test.ts:35-80` registra tabela, `select`, filtros (`eq`/`in`),
`order`, terminal e argumentos de RPC. Mortos por asserção: `.eq('active', true)` removido (M06),
`p_slug` trocado (M07), `from_slug` trocado (M29), `seo_title` removido (M36). **Sobrevivem** `stock`
(M34) e `stock_policy` (M35): `:155` compara o `select` com **a própria constante** (autorreferente) e
a lista de presença de `:162-169` não nomeia nenhuma das duas.

---

## Sensor de discriminação

Mutações aplicadas nos arquivos REAIS, por script que **lança** se a string alvo não aparece
exatamente uma vez; restauradas da cópia e conferidas por **SHA-256** (12 arquivos, todos idênticos
ao fim). Sem `git stash`. Morte por asserção conferida no log (`AssertionError`), não por compilação.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `core/src/page/categoryRoute.ts` | inativa avaliada antes de `category_redirects` (SSV-34) | ✅ morto · asserção (2) |
| M02 | `core/src/page/serve.ts` | 404 com `s-maxage=300` (SSV-12) | ✅ morto · asserção (2) |
| M03 | `serve.ts` | produto `is_active=false` deixa de dar 404 (SSV-07) | ✅ morto · asserção |
| M04 | `head.ts` | `noindex` não escrito (SSV-07/08) | ✅ morto · asserção (7) |
| M05 | `apps/store/server/page.ts` | `originalUrl` descarta a query (`?variant=`) | ✅ morto · asserção (3) |
| M06 | `server/page.ts` | `readCategories` sem `.eq('active', true)` | ✅ morto · asserção |
| M07 | `server/page.ts` | RPC com `{ slug }` em vez de `{ p_slug }` | ✅ morto · asserção |
| M08 | `page/images.ts` | sem dedupe | ✅ morto · asserção (9) |
| M09 | `page/images.ts` | foto do produto antes da representante (SSV-26) | ✅ morto · asserção (11) |
| M10 | `sitemap/render.ts` | `<image:loc>` sem `escapeXml` (SSV-29) | ✅ morto · asserção (6) |
| M11 | `sitemap/urls.ts` | sem o corte de 1.000 (SSV-30) | ✅ morto · asserção |
| M12 | `serve.ts` | ramo de erro responde 404 (SSV-06/13) | ✅ morto · asserção (7) |
| M13 | `head.ts` | canônica do shell não removida (SSV-20) | ✅ morto · asserção (4) |
| M14 | `classify.ts` | 3 segmentos viram categoria (SSV-09) | ✅ morto · asserção (2) |
| M15 | migration | sem `security definer` (SSV-17) | ✅ morto · asserção (2) |
| M16 | migration | `grant execute` também a `public` (SSV-17) | ✅ morto · asserção (3) |
| M17 | `serve.ts` | RPC que falha vira 404 (SSV-13) | ✅ morto · asserção |
| M18 | `serve.ts` | `category_redirects` que falha vira 404 (SSV-13) | ✅ morto · asserção |
| M19 | `serve.ts` | 301 de `product_redirects` descarta `?variant=` (SSV-31) | ✅ morto · asserção |
| M20 | `serve.ts` | categoria com 3600 em vez de 300 (SSV-21) | ✅ morto · asserção |
| M21 | `serve.ts` | `og:image` ignora a variação aberta (SSV-05) | ✅ morto · asserção |
| M22 | `supabase/functions/sitemap/index.ts` | sitemap sem `stock` da variação (SSV-26) | ✅ morto · asserção (2) |
| M23 | `apps/store/scripts/build-server.mjs` | `if (!existsSync(SHELL))` → `if (false)` | ⚪ sobreviveu — **mutante equivalente**: o `readFileSync` seguinte lança ENOENT e o build falha do mesmo jeito |
| M24 | `serve.ts` | rota de app vira 404 (SSV-10) | ✅ morto · asserção |
| M25 | `serve.ts` | página fixa com 300 em vez de 3600 | ✅ morto · asserção (2) |
| M26 | `sitemap/render.ts` | sem `xmlns:image` (SSV-25) | ✅ morto · asserção (7) |
| M27 | `build-server.mjs` | aceita shell sem `id="root"` | ❌ **sobreviveu** (gap #2, baixo) |
| M29 | `server/page.ts` | `product_redirects` filtrado por `slug` em vez de `from_slug` | ✅ morto · asserção (2) |
| M32 | `classify.ts` | caminho com `%` deixa de ser `notfound` | ✅ morto · asserção (2) |
| M33 | `head.ts` | `robots` do shell não sai com `noindex` (duplicata) | ✅ morto · asserção |
| M34 | `server/page.ts` | `stock` fora de `COLUNAS_VARIACAO` | ❌ **sobreviveu** — também contra a suíte INTEIRA da loja (M34F, 5298 verdes) (gap #1) |
| M35 | `server/page.ts` | `stock_policy` fora de `COLUNAS_PRODUTO` | ❌ **sobreviveu** (gap #1) |
| M36 | `server/page.ts` | `seo_title` fora de `COLUNAS_PRODUTO` | ✅ morto · asserção |

**Resultado**: 33 mortos por asserção, 0 por compilação, 1 equivalente (M23), **3 sobreviventes**
(M27, M34, M35). Profundidade: expandida (caminho P1 e o JSON-LD que o Merchant Center confere).

---

## Pendente de prova em plataforma (não é falha de cobertura)

O preview está protegido; nada abaixo foi medido ainda. É a prova da T14:

- SSV-02: a Vercel detecta e executa `api/page.mjs` (que reexporta `../.server/page.mjs`), entrega
  `__path` e `?variant=` à função, e a função roda em `pdx1` (`x-vercel-id`).
- SSV-03: `X-Vercel-Cache: HIT` na 2ª batida e TTFB < 300 ms no acerto.
- SSV-04: deploy novo nasce com `MISS` em cada URL.
- `Content-Type` **entregue** `text/html; charset=utf-8` (regra de `AD-021`: a prova é o tipo
  entregue, nunca o status), e o 404/301 reais por `curl` em `/produtos/inexistente-xyz`,
  `/qualquer-coisa-xyz`, `/a/b/c`, `/personalizados/profissoes`, `/carrinho`.
- A canônica na origem de `STORE_PUBLIC_URL` — o env precisa existir no projeto da **Vercel**
  (até aqui era secret da function do Supabase). Sem ele `servePage` omite a canônica (correto pela
  régua SVR-19) e o produto sai **sem canônica nenhuma** — o `sitemap-check.yml` acusa.

**O que este verificador provou localmente** (bundle real `apps/store/.server/page.mjs` + Supabase
local, `STORE_PUBLIC_URL=https://umaestrelinha.com.br`): produto ativo 200/300 com JSON-LD, canônica
e `og:image` de 1200; `/produtos/inexistente-xyz`, `/qualquer-coisa-xyz`, `/a/b/c` ⇒ 404, 60 s, um
`robots`; `/carrinho` 200/3600 shell; `/sobre` e `/politica-de-privacidade` 200/3600 com título e
canônica próprios; categoria por um segmento 200 com canônica de dois; pai errado 301; inativa 301
`/personalizados`. Sem env: shell idêntico a `dist/index.html`, `no-store`, log `erro:'env'`.

---

## Gaps ranqueados

1. **[Major] A fiação da página não prova `stock` nem `stock_policy`** — SSV-01, SSV-26 —
   `apps/store/server/__tests__/page.test.ts:155` (asserção autorreferente) e `:162-169` (lista sem as
   duas). Consequência real com qualquer uma removida: JSON-LD `OutOfStock` em toda peça `track`,
   representante errada, `og:image` ≠ `[0]` do sitemap, divergência com o feed no Merchant Center —
   suíte verde.
   - **Fix**: acrescentar `stock` à lista de `COLUNAS_VARIACAO` e `stock_policy` (e, pela mesma razão,
     `price`, `position`, `is_active` já estão) à de `COLUNAS_PRODUTO` na asserção de presença; melhor
     ainda, um caso que compare as colunas da página com as do sitemap (`wiring.test.ts` já lê as do
     sitemap do disco) — a página precisa de **pelo menos** o que o sitemap lê para decidir a
     representante. Reinjetar M34/M35 e ver morrer.
2. **[Minor] `build-server.mjs` aceita um `dist/index.html` sem `id="root"`** (M27) — design C4/T11
   ("o build falha sem `dist/index.html`") — nenhum teste executa o script; `vercelRedirects.test.ts:473`
   só confere strings. O caso "arquivo ausente" já falha por `readFileSync` (M23 equivalente).
3. **[Observação, não AC] o `robots` servido não tem `data-owner`** — `usePageMeta.ts:54` só remove o
   `robots` marcado `estrelinha-spa`. Na 404 hidratada o DOM fica com dois `noindex`, e uma navegação
   SPA a partir da 404 mantém o `noindex` servido no documento. O Googlebot não navega por SPA e o HTML
   servido está correto (SSV-20 é sobre o HTML servido), então o impacto é nulo hoje; registrar.
4. **[Fora da 69] título de produto com marca duplicada vinda do banco** — no banco local,
   `pulseira-dados-do-nascimento-de-dois-filhos-personalizado` serve
   `"… Personalizado | Uma… | Uma Estrelinha"`: o `seo_title` importado vem truncado com `| Uma…`, e a
   régua da `62` só reconhece a marca inteira. Regra de `core/seo` (feature 62), não desta feature.

---

## Qualidade

| Princípio | Status |
| --- | --- |
| Mínimo / sem escopo a mais | ✅ — `optionRows.ts`, `index.html`, `useJsonLd.ts`, `usePageMeta.ts` mudam só comentário |
| Dono único (defeito 01) | ✅ — `productPageImages` é o dono do `og:image` e do sitemap; `resolveCategoryRoute` subiu a `core` e a loja reexporta; `product-page` removida |
| Guardas com âncora e sensor | ✅ — `paginasFixasServidas`, `rotasDeApp`, `categoryFallbackSchema` (mutar() que lança), `wiring.test.ts` do sitemap |
| Asserção com o valor da spec | ✅ nas ACs de regra; ⚠️ no wiring (gap #1) |
| `payment/**` e `shoppingParity.test.ts` intocados | ✅ |

---

## Rastreabilidade

SSV-02, SSV-03, SSV-04: **Implementado — prova de plataforma pendente**. SSV-01 e SSV-26:
**Needs fix** (gap #1). Demais (29): **Verified**.

**Working tree**: idêntico ao recebido (hashes SHA-256 dos 12 arquivos mutados conferidos); único
arquivo novo é este `validation.md`.

---

# Rodada 2

**Data**: 2026-10-19 · **Verificador**: sub-agente independente (autor ≠ verificador), sem alterar
código nem teste. Mutações nos arquivos REAIS por script que lança se o alvo não aparece exatamente
uma vez; restauração conferida por SHA-256 (7 arquivos, todos `OK`); `git status --short` idêntico
antes e depois (só este arquivo mudou). Sem `git stash`.

## Veredito: ❌ FAIL — o conserto do gap #1 tapou os dois mutantes nomeados, não a classe

Os três consertos da rodada 1 estão no disco e M34, M35 e M27 morrem por asserção. Mas a régua nova
de `apps/store/server/__tests__/page.test.ts:166-171` é uma **lista escrita à mão** que nomeia
exatamente as colunas que a rodada 1 citou. Outras quatro colunas que a página consome — `position`,
`compare_price` (variação), `description` e `brand` (produto) — saem do `select` com a **suíte inteira
da loja verde (5302/5302)**. É o mesmo defeito da rodada 1 em outra coluna: com `compare_price` fora,
o JSON-LD perde o "de/por" e diverge do `<g:price>`/`<g:sale_price>` do feed (que lê `compare_price`,
`supabase/functions/google-feed/index.ts:21`) — exatamente o que o Merchant Center compara; com
`position` fora, `representativeVariant`/`optionRepresentative` (`core/shopping/offer.ts:145`,
`core/seo/variant.ts:101`) ordenam por `0` e a representante — portanto o `og:image` — passa a
depender da ordem do PostgREST, enquanto o sitemap lê `position` (SSV-26). A sugestão da rodada 1
(comparar com as colunas que os consumidores leem, p.ex. as do sitemap/feed) não foi seguida.

## Consertos confirmados

| Gap da rodada 1 | Evidência | Status |
| --- | --- | --- |
| #1 `stock`/`stock_policy` | `apps/store/server/__tests__/page.test.ts:166` (`stock_policy` na lista de produto) e `:169` (`stock` na de variação) — `expect(COLUNAS_*.split(',')).toContain(c)`; M34/M35 mortos | ✅ para as duas colunas nomeadas; ❌ para a classe (N01/N02/N15/N16) |
| #2 `id="root"` | `apps/store/scripts/shell.mjs:15` (recusa), `build-server.mjs:15,25` (chama `lerShell` e sai 1), `scripts/__tests__/shell.test.ts:27` — `toThrow(/id="root"/)`; `vitest.config.ts` inclui `scripts/**`; M27 morto | ✅ (com dois buracos menores, abaixo) |
| #3 `data-owner` do robots | `packages/core/src/seo/pages.ts:199` (`ROBOTS_META_OWNER`), `page/head.ts:162`, `usePageMeta.ts:54,66`; `head.test.ts:159-161`, `serve.test.ts:202-203`, `usePageMeta.test.tsx` caso "o robots que o SERVIDOR pôs na 404…" (length 1 e removido ao navegar) | ✅ |
| Helpers de regex | `serve.test.ts:627` e `head.test.ts:143` passaram de `">` para `"[^>]*>`. `[^>]*` não atravessa `>`, então o helper só ficou **menos cego** (antes, um robots com atributo extra não era contado). A contagem continua medida por `match(/name="robots"/g).toHaveLength(1)` em `serve.test.ts:203` e `head.test.ts:149,156`. `metaDe`/`canonicas` não mudaram | ✅ não afrouxou |

## Gates (um workspace por vez, exit code fora de pipe, árvore restaurada)

| Gate | Resultado | Esperado |
| --- | --- | --- |
| `pnpm --filter @estrelinha/core test` | exit 0 · **3382 / 132** | 3382/132 ✅ |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | exit 0 · **5302 / 297** | 5302/297 ✅ |
| `pnpm --filter @estrelinha/functions test` | exit 0 · **926 / 21** | 926/21 ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | exit 0 | ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.server.json` | exit 0 | ✅ |

Delta contra a rodada 1: core +1, store +4/+1 (o `shell.test.ts` e os casos de `data-owner`).

## Sensor

Suíte-alvo: `server`, `scripts`, `usePageMeta`, `vercelRedirects`, `paginaDeOpcaoComDonoUnico` (loja)
e `src/page` + `src/seo` (core). Todo sobrevivente foi **reconfirmado contra a suíte INTEIRA da loja**
(5302 verdes). Nenhuma morte foi por compilação (todas `AssertionError`).

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M34 | `server/page.ts` | `stock` fora de `COLUNAS_VARIACAO` | ✅ morto · asserção (`page.test.ts` "as colunas…") |
| M35 | `server/page.ts` | `stock_policy` fora de `COLUNAS_PRODUTO` | ✅ morto · asserção |
| M27 | `scripts/shell.mjs` | recusa de `id="root"` desligada | ✅ morto · asserção (`shell.test.ts:27`) |
| N01 | `server/page.ts` | `position` fora de `COLUNAS_VARIACAO` | ❌ **sobreviveu** (suíte inteira) |
| N02 | `server/page.ts` | `compare_price` fora de `COLUNAS_VARIACAO` | ❌ **sobreviveu** (suíte inteira) |
| N15 | `server/page.ts` | `description` fora de `COLUNAS_PRODUTO` | ❌ **sobreviveu** (suíte-alvo) |
| N16 | `server/page.ts` | `brand` fora de `COLUNAS_PRODUTO` | ❌ **sobreviveu** (suíte-alvo) |
| N12 | `server/page.ts` | `stock` lido do produto em vez da variação | ✅ morto · asserção |
| N03 | `scripts/shell.mjs` | arquivo VAZIO aceito (`shell !== '' && …`) | ❌ **sobreviveu** (suíte inteira) — nenhum caso com arquivo vazio |
| N04 | `scripts/build-server.mjs` | `catch` engole o erro e embute `''` em vez de `process.exit(1)` | ❌ **sobreviveu** (suíte inteira) — buraco criado pela extração: `lerShell` é testado, a fiação do script não |
| N05 | `package.json` | `node scripts/build-server.mjs && vite build` | ✅ morto · asserção (`vercelRedirects.test.ts:485`) |
| N06 | `usePageMeta.ts` | seletor do robots com outro dono | ✅ morto · asserção (3) |
| N07 | `usePageMeta.ts` | sem `if (existente) return` (noindex duplicado na hidratação) | ✅ morto · asserção (2) |
| N13 | `usePageMeta.ts` | tag criada sem `data-owner` | ✅ morto · asserção (2) |
| N10 | `seo/pages.ts` | `ROBOTS_META_OWNER` com outro valor | ✅ morto · asserção (core 3, loja 1) |
| N11 | `page/head.ts` | robots servido sem `data-owner` | ✅ morto · asserção (3) |
| N08 | `server/page.ts` | ramo sem env com `s-maxage=300` em vez de `no-store` | ✅ morto · asserção |
| N09 | `server/page.ts` | `\|\|` → `&&` na checagem das envs | ❌ **sobreviveu** (suíte inteira) — o único caso tira as DUAS envs; com só a chave faltando o handler chamaria `createClient(url, '')`, que lança ⇒ 500 em vez do shell `no-store` |
| N14 | `server/page.ts` | sem o `replace(/\/+$/, '')` da origem | ⚪ equivalente — `origemDe` (`core/page/serve.ts:139`) e `trimOrigin` (`core/shopping/offer.ts:23`) já aparam |

**Resultado**: 19 injetados · 11 mortos por asserção · 0 por compilação · 1 equivalente (N14) ·
**7 sobreviventes**: N01, N02, N03, N04, N09 (confirmados contra a suíte inteira) e N15, N16 (suíte-alvo).
N01/N02/N15/N16 são uma lacuna só — a lista de colunas.

## Buraco criado pelo conserto

- **Extrair `lerShell` moveu o ônus da prova para a fiação do script** (N04): `shell.test.ts` prova a
  função, e `vercelRedirects.test.ts:476-480` só confere que `build-server.mjs` contém quatro strings
  — não que chama `lerShell` nem que sai com código ≠ 0. Trocar o `process.exit(1)` por `shell = ''`
  embute um shell vazio, a função serve página em branco em toda URL, e a suíte fica verde.
- **A lista de colunas virou o objeto medido**: a régua de presença tem o tamanho do achado da rodada
  anterior, não o da regra ("a página lê pelo menos o que `resolveOffer`/`productHead` consomem").
- Os helpers de regex **não** abriram buraco (ver tabela de consertos).

## Pendente de plataforma (não é falha)

SSV-02, SSV-03 e SSV-04 seguem como na rodada 1: detecção de `api/page.mjs` pela Vercel, `HIT` na
2ª batida/TTFB, `MISS` em deploy novo, `Content-Type` entregue e `STORE_PUBLIC_URL` no projeto da
Vercel — só no preview/deploy.

## Gaps ranqueados

1. **[Major] Colunas da página sem régua derivada** — SSV-01, SSV-26 —
   `apps/store/server/__tests__/page.test.ts:166-171`. N01 (`position`), N02 (`compare_price`), N15
   (`description`), N16 (`brand`) sobrevivem. **Fix**: derivar a exigência dos consumidores em vez de
   listar à mão — p.ex. exigir que `COLUNAS_VARIACAO` ⊇ as colunas de variação do `google-feed`
   (`index.ts:20`) e do `sitemap` (`index.ts:64`), lidas do disco, e `COLUNAS_PRODUTO` ⊇ os campos de
   `OfferInputProduct` + `seo_title`/`seo_description`/`options`; ou um caso de `createPageHandler`
   com um dublê que só devolve as colunas pedidas e compara o JSON-LD/`og:image` servido com o de
   `servePage` sobre a linha completa. Reinjetar N01/N02/N15/N16 e ver morrer.
2. **[Minor] `build-server.mjs` sem prova de fiação** (N04) — executar o script num diretório
   temporário (ou extrair o `main` testável) e asserir exit ≠ 0 sem shell válido.
3. **[Minor] `lerShell` aceita arquivo vazio** (N03) — um caso com `''`.
4. **[Minor] Env pela metade** (N09) — `page.test.ts` "sem as envs…": acrescentar os casos só-URL e
   só-chave.

## Rastreabilidade

SSV-01 e SSV-26: **Needs fix** (gap #1). SSV-02/03/04: **Implementado — prova de plataforma
pendente**. Demais (29): **Verified**.

---

# Rodada 3

**Data**: 2026-10-19 · **Verificador**: sub-agente independente (autor ≠ verificador), sem alterar
código nem teste. Mutações nos arquivos REAIS por script que **lança** se o alvo não aparece
exatamente uma vez; restauração conferida por SHA-256 a cada mutante (todos `OK`); `git status
--short` idêntico antes e depois (só este arquivo mudou). Sem `git stash`. Morte classificada por
`AssertionError` no log versus erro de transformação/carga — **nenhuma** morte por compilação.

## Veredito: ❌ FAIL — as ACs fecham; o conserto de N04 passa pelo motivo errado

SSV-01 e SSV-26 estão **fechadas**: a régua de comportamento mata N01 e N15, e a alegação de
equivalência de N02/N16 foi conferida contra o código e é **verdadeira**. N03 e N09 morrem. O que
reprova é o caso novo de N04 (`scripts/__tests__/shell.test.ts:44-58`): **o mutante N04 da rodada 2
sobrevive**, porque o diretório temporário do teste não tem `server/page.ts` nem
`tsconfig.server.json`, e o `esbuild` falha por ISSO — exit 1, a mensagem do `console.error` já
impressa, nenhum bundle. As três asserções são verdadeiras nos dois mundos. Reproduzido à mão: com o
mutante e um `server/page.ts` presente (o que o build real tem), o script sai **0** e escreve
`.server/page.mjs` com **shell de 0 bytes**. Gap menor (não é AC da spec; é o *Done when* de T11 /
design C4), mas o conserto alegado é inefetivo, e esta é a última rodada — escala ao usuário.

## Consertos confirmados

| Gap da rodada 2 | Evidência | Status |
| --- | --- | --- |
| #1 colunas da página (N01/N02/N15/N16) | `apps/store/server/__tests__/page.test.ts:373-473`: dublê que devolve só as colunas do `select` (`:399-405` `parseSelect`/`projetar`, `:417-431`); `:440-449` — `expect(pedido.body).toBe(cheio.body)` em `/produtos/colar-gota`, `?variant=222`, `?variant=223`; `:451-455` — `backorder` com `toContain('https://schema.org/BackOrder')` e corpo idêntico; sensor `:461-472` — `not.toBe(cheio)` sem `position`/`stock`/`description`/`stock_policy` | ✅ N01 e N15 mortos por asserção; N02/N16 **equivalentes** (abaixo) |
| #2 N04 (fiação do build) | `apps/store/scripts/__tests__/shell.test.ts:44-58` — `r.status not.toBe(0)`, `stderr toMatch(/build-server: .*vite build/)`, `.server/page.mjs` ausente | ❌ **N04 sobrevive** — o teste passa pela falha do `esbuild`, não pela parada do script |
| #3 N03 (shell vazio) | `shell.test.ts:34-38` — `lerShell('')` `toThrow(/id="root"/)` | ✅ morto · asserção |
| #4 N09 (env pela metade) | `page.test.ts:296-307` — `it.each` só-URL / só-chave: `200`, `no-store`, corpo `toBe(SHELL)`, `makeClient not.toHaveBeenCalled()` | ✅ morto · asserção (2) |

## A alegação de equivalência de N02 (`compare_price`) e N16 (`brand`) — CONFIRMADA

Varredura de todo `packages/core/src` (fora de testes) por `compare_price` e `brand`:

- `compare_price` só é lido em `shopping/pricing.ts:50` (`offerPricing`): `compare > price` ⇒
  `{ price: compare, salePrice: price }`, senão `{ price, salePrice: null }`. O único consumidor do
  par no caminho de `servePage` é `productJsonLd` (`shopping/jsonld.ts:52`) via `payablePrice`
  (`:31-32`, `salePrice ?? price`) — que vale `variant.price` **nos dois ramos**. `productGroupJsonLd`
  (`jsonld.ts:128`) reusa `productJsonLd`; `withPageUrl` (`:87-95`) só acrescenta `url`/grupo.
  `feedExclusion` (`eligibility.ts:47-51`) olha `is_active` e `price`; `representativeVariant`
  (`offer.ts:140-148`) olha `position` e `offerAvailability`; `productPageImages` (`page/images.ts:41`)
  pede `is_active|price|stock|image_url|position`; `productHead`/`indexableOptions` (`seo/variant.ts`)
  e `page/head.ts` não leem preço. O preload (`page/serve.ts:376`) usa só `oferta.imageLink`.
- `brand` só vai para `offer.brand` (`shopping/offer.ts:189`) e dali para `<g:brand>`
  (`shopping/xml.ts:56`) — o feed, não a página. O `item_brand` de `analytics/items.ts:89` é uma
  constante, não a coluna.

Logo N02 e N16 são equivalentes para o HTML servido (sobreviveram, como esperado). O mesmo vale para
`mpn`, `age_group`, `gender`, `google_product_category` e `identifier_exists`.

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Esperado |
| --- | --- | --- |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | exit 0 · **5311 / 297** | 5311/297 ✅ |
| `pnpm --filter @estrelinha/core test` | exit 0 · **3382 / 132** | 3382/132 ✅ |
| `pnpm --filter @estrelinha/functions test` | exit 0 · **926 / 21** | 926/21 ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | exit 0 | ✅ |
| `npx tsc --noEmit -p apps/store/tsconfig.server.json` | exit 0 | ✅ |

## Sensor

Suíte-alvo da loja: `vitest run server scripts` (40 casos); de `core`: `src/page src/shopping src/seo
src/sitemap` (591). Linha de base das duas verde antes de mutar.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | `server/page.ts` | `position` fora de `COLUNAS_VARIACAO` | ✅ morto · asserção (2 — comportamento, `:440` e `:451`) |
| N02 | `server/page.ts` | `compare_price` fora | ⚪ equivalente (confirmado acima) |
| N15 | `server/page.ts` | `description` fora de `COLUNAS_PRODUTO` | ✅ morto · asserção (4 — comportamento) |
| N16 | `server/page.ts` | `brand` fora | ⚪ equivalente (confirmado acima) |
| N03 | `scripts/shell.mjs` | `shell !== '' && …` (vazio aceito) | ✅ morto · asserção (`shell.test.ts:35`) |
| N04 | `scripts/build-server.mjs` | `process.exit(1)` → `shell = ''` (mantém o `console.error`) | ❌ **sobreviveu** — ver veredito |
| N04b | `build-server.mjs` | `console.error` **e** `exit` → `shell = ''` | ✅ morto · asserção (só pela mensagem: `stderr toMatch`) |
| N09 | `server/page.ts` | `\|\|` → `&&` nas envs | ✅ morto · asserção (2) |
| X01 | `page.test.ts` + `page.ts` | o dublê de projeção devolve a linha INTEIRA, com N01 aplicado | ⚪ sobrevive **por construção** — prova que a projeção é quem detecta: com ela, N01 morre; sem ela, vive. O dublê não é cego |
| X02 | `server/page.ts` | `readProduct` deixa `product_variants` dentro do produto | ✅ morto · asserção (`page.test.ts:160`) |
| X03 | `core/shopping/offer.ts` | `representativeVariant` sem o `sort` por `position` | ✅ morto · asserção (`offer.test.ts`, "escolhe a primeira por position") |
| X04 | `server/page.ts` | `select` com o embed ANTES das colunas do produto | ✅ morto · asserção (5 — `:156` e comportamento) |
| X05 | `core/page/serve.ts` | o ramo `?variant=` filtra por `sku` (coluna NÃO pedida) | ✅ morto · asserção (2 — `?variant=222`/`223` no comportamento) |
| X06 | `server/page.ts` | `options` fora de `COLUNAS_PRODUTO` | ✅ morto · asserção — **só pela lista** (`:167`); o comportamento é cego (fixtura `options: null`) |
| X07 | `server/page.ts` | `nuvemshop_id` fora de `COLUNAS_VARIACAO` | ✅ morto · asserção (lista e comportamento) |
| X08 | `server/page.ts` | `option_values` fora de `COLUNAS_VARIACAO` | ✅ morto · asserção — **só pela lista** (`:170`) |
| X09 | `scripts/shell.mjs` | `existsSync` desligado | ✅ morto · asserção (2) |
| X10 | `server/page.ts` | `readProduct` sem `.eq('slug', …)` | ✅ morto · asserção (2) |
| X11 | `core/page/serve.ts` | `og:image` de `productPageImages(…, dados.variants)` em vez da aberta | ✅ morto · asserção (`serve.test.ts`, SSV-26 com `?variant=`) |

**Resultado**: 19 injetados · 14 mortos por asserção · 0 por compilação · 3 equivalentes/por
construção (N02, N16, X01) · **1 sobrevivente real (N04)**. N04b morre só pela asserção de mensagem.

## Buracos criados pelo conserto

1. **N04 — o teste da fiação mede a falta do ambiente, não a parada do script.** O diretório
   temporário copia só `build-server.mjs` e `shell.mjs`; o `esbuild` não acha `server/page.ts` nem
   `tsconfig.server.json` e lança — exit 1 e nenhum bundle **com ou sem** o `process.exit(1)`.
   Reproduzido: com o mutante e um `server/page.ts` mínimo no temporário, `exit=0` e
   `build-server: …/.server/page.mjs (shell de 0 bytes)`; o bundle contém `true ? "" : …`.
   **Fix**: no teste, copiar também `server/page.ts` e `tsconfig.server.json` (ou um `server/page.ts`
   mínimo) para que a ÚNICA razão de falhar seja o shell — e acrescentar o par positivo (com um
   `dist/index.html` válido o script sai 0 e gera o bundle), que prova que o ambiente do teste
   consegue empacotar. Ou asserir que o `stderr` não contém `Build failed`/`Could not resolve`.
2. **[Observação] A régua de comportamento é cega ao ramo de OPÇÕES** — a fixtura tem
   `options: null`, então `indexableOptions`, o `ProductGroup` e o `<head>` de opção nunca rodam ali.
   `options` (X06) e `option_values` (X08) seguem presos **só** pela lista de `:163-173`. O
   comentário de `:371-372` ("qualquer uma, inclusive as que ainda não existem") afirma mais do que a
   fixtura cobre: uma coluna nova lida só no ramo de opção passaria. Não há sobrevivente hoje (a lista
   cobre as duas colunas existentes); registrar.

## Pendente de plataforma (não é falha)

SSV-02, SSV-03 e SSV-04 seguem como nas rodadas 1 e 2 (detecção de `api/page.mjs`, `HIT`/TTFB,
`MISS` em deploy novo, `Content-Type` entregue, `STORE_PUBLIC_URL` no projeto da Vercel).

## Gaps ranqueados

1. **[Minor] N04 sobrevive** — design C4 / T11 ("o build falha sem `dist/index.html`") —
   `apps/store/scripts/__tests__/shell.test.ts:44-58`. Fix acima (um teste; nenhum código de produto).
2. **[Observação] fixtura sem opções** — `page.test.ts:381-396` (`options: null`); ampliar a fixtura
   com um eixo e marcações para o comportamento cobrir o ramo de opção.

## Rastreabilidade (final)

| AC | Status |
| --- | --- |
| SSV-01, SSV-26 | **Verified** (N01/N15 mortos; N02/N16 equivalentes conferidos) |
| SSV-02, SSV-03, SSV-04 | **Implementado — prova de plataforma pendente** (não é falha) |
| SSV-05..SSV-25, SSV-27..SSV-34 | **Verified** (rodada 1, sem regressão; gates idênticos) |

34/34 ACs com evidência; 31 Verified, 3 pendentes de plataforma. O FAIL é da fiação do script de
build (gap #1), fora da lista de ACs — **decisão do usuário** se fecha com ele aberto ou com o
conserto de um teste.
