# 70 — Sitemap servido na Vercel · Validação

**Data**: 2026-10-20
**Spec**: `.specs/features/70-sitemap-servido-na-vercel/spec.md` (SMV-01..07)
**Diff**: working tree sobre `master` = `ee9091c0` (não commitado), mais os não rastreados
(`packages/core/src/sitemap/serve.ts` e teste, `apps/store/server/sitemap.ts` e teste,
`apps/store/scripts/{robots,build-robots}.mjs` e `scripts/__tests__/robots.test.ts`). `supabase/operacoes/` ficou de fora.
**Verificador**: sub-agente independente (autor ≠ verificador), rodada 1.

## Veredito: ❌ FAIL, por cobertura. Não há defeito de produto

O código faz o que a spec pede, e isso foi medido executando: o documento é byte a byte o do
handler antigo, a entrega local tem os headers certos e o Sitemap check passa. **Um mutante real
sobreviveu (M01)**: o adaptador `server/sitemap.ts` pode engolir o erro da leitura das perguntas
sem que nenhum teste reprove. Nesse caso o sitemap sai 200 e parcial, e é exatamente o que a
SMV-03 proíbe. O segundo sobrevivente (M20, `turbo.json`) tem impacto baixo e está registrado.

---

## Critérios de aceite, ancorados na spec

| SMV | Resultado que a spec define | Evidência (`arquivo:linha`, asserção) | Resultado |
| --- | --- | --- | --- |
| **01** | 200, `application/xml; charset=utf-8`, `public, s-maxage=3600`, vindo de `api/page` | `apps/store/server/__tests__/sitemap.test.ts:162-164`: `status 200`, `content-type 'application/xml; charset=utf-8'`, `cache-control 'public, s-maxage=3600'` pelo `createPageHandler` real. `packages/core/src/sitemap/__tests__/serve.test.ts:97-106`: os headers do 200 são `toEqual` exatamente os dois. `vercelRedirects.test.ts:365-380`: catch-all é o último rewrite, não há `public/sitemap.xml`, e `serveSitemap(` vem antes de `servePage(`. Também medido servido (bundle `api/page.mjs` + banco local): `200`, `application/xml; charset=utf-8`, `public, s-maxage=3600` | ✅ |
| **02** | XML byte a byte igual ao `renderSitemapXml` de antes | Repositório: `serve.test.ts:79-90` (11 `<loc>`), `:331-352` (`?variant=` e `<lastmod>`), e as colunas congeladas por string literal exata em `sitemap.test.ts:134-140`. **Medição do verificador**: o `handlers.ts` do HEAD contra o `serveSitemap` novo, com a mesma fixtura (fotos com `&`, opções, marcações, FAQ, categorias), deu `status` e corpo **idênticos** nos 5 casos (bom, sem origem, truncada, vazio, FAQ falhando). Servido contra o banco local: **2.327 `<loc>`, 3.735 `<image:loc>`**, que confere com o número do `apps/store/CLAUDE.md` | ✅ (⚠️ nenhum teste do repositório compara bytes; quem prova é a medição do verificador mais as `<loc>` asseridas) |
| **03** | Falha ou truncamento ⇒ **503**, `no-store`, sem `<urlset>` | `serve.test.ts:59-67` (ajudante `naoTemUrlset`: `text/plain`, `no-store`, sem `<urlset>`/`<url>`), usado em `:125-221` e `:360-390` (as quatro leituras, as truncadas, zero produtos, `<loc>` duplicada, FAQ falhando). `sitemap.test.ts:176-208`: falha de variações, falta de `STORE_PUBLIC_URL` e falta das envs do Supabase dão 503 `no-store` pelo handler. Servido sem a origem: `503`, `no-store`, `text/plain` | ⚠️ **lacuna M01**: o `throw` de `readFaqLinks` no adaptador não é exercitado |
| **04** | Nenhum rewrite de `/sitemap.xml` para `*.supabase.co`, nenhum override de tipo; o único externo é o feed | `vercelRedirects.test.ts:356-363` (`porSource('/sitemap.xml')` é `undefined`, nenhum destino `functions/v1/sitemap`, nenhum header em `/sitemap.xml`), `:232-241` (`comTipo` `toEqual([])`), `:459-465` (externos `toEqual(['/feeds/google-shopping.xml'])`, só 1 apontando para Supabase), `:384-390` (2 rewrites) | ✅ |
| **05** | `dist/robots.txt` com exatamente uma `Sitemap: <STORE_PUBLIC_URL>/sitemap.xml` absoluta, sem barra dupla, e o resto do modelo igual | `scripts/__tests__/robots.test.ts:48-56` (`toEqual(['Sitemap: https://umaestrelinha.com.br/sitemap.xml'])`, sem `//sitemap.xml`, resto `toBe` o modelo), `:101-106` (script real com barra final na env: exit 0 e arquivo `toBe` o gerado). `robotsSource.test.ts:58-93` (o modelo sem linha nem host, o gerado com 1 linha e `url toBe`). Build medido: `dist/robots.txt` termina em `Sitemap: http://localhost:8082/sitemap.xml` | ✅ |
| **06** | Na Vercel sem `STORE_PUBLIC_URL` o build falha com mensagem clara | `robots.test.ts:28-31` (lança `/STORE_PUBLIC_URL não está definida no build da Vercel/`), `:94-99` (script real: exit ≠ 0, a mensagem no stderr e nenhuma linha `Sitemap:`), com o **par positivo** no mesmo ambiente em `:101-106` (`L-041` aplicada). Rodado à mão: `VERCEL=1` sem a env dá `exit=1` e a mensagem | ✅ |
| **07** | Chave publicável e `readAllPages` (teto de 1.000) | `sitemap.test.ts:173` (`makeClient` chamado com `('http://127.0.0.1:54441', 'pk')`), `:99-111` (contagem exata com `head`, faixa inclusiva `[0,999]`/`[1000,1999]`, PK composta como ordem). `serve.test.ts:376-401` (variações e marcações truncadas dão 503, e 1001 linhas paginam em duas faixas). `chaveDeServidorForaDoNavegador.test.ts` varre `apps/**` | ✅ |

**7 de 7 critérios têm evidência.** A SMV-03 tem uma lacuna de cobertura no adaptador.

---

## Sensor de discriminação

Mutações nos arquivos **reais**, sem `git stash`. O arnês (`scratchpad/mut.mjs`) lança quando não
acha o alvo ou quando a mutação não muda nada, restaura o arquivo e confere o SHA-256. O hash de
`git status --porcelain` foi o mesmo antes e depois de todas as rodadas. Suítes usadas: core
`src/sitemap`, e na loja `server`, `scripts`, `robotsSource` e `vercelRedirects`.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `apps/store/server/sitemap.ts` | `readFaqLinks` troca `if (error) throw error` por `void error` | ❌ **SOBREVIVEU**: um erro do PostgREST em `faq_page_items` vira `[]` e o sitemap sai **200 sem as perguntas** |
| M02 | idem | `ler()` engole o erro | ✅ morto por asserção (`sitemap.test.ts`) |
| M03 | idem | a ordem da marcação usa só a 1ª coluna da PK | ✅ morto por asserção |
| M04 | idem | `ascending: true` → `false` | ⚪ sobreviveu, **equivalente**: a paginação continua estável e `sitemapUrls` reordena (categorias por `sort_order`, produtos por slug, `urls.ts:151,166`), então o documento não muda |
| M05 | idem | variação sem `stock` | ✅ morto por asserção |
| M06 | idem | `countVariants` devolve 0 | ✅ morto por asserção |
| M07 | `apps/store/server/page.ts` | sem o desvio de `/sitemap.xml` (cai em `servePage`) | ✅ morto por asserção (`sitemap.test.ts` e `vercelRedirects.test.ts`) |
| M08 | idem | envs ausentes respondem 200 em vez de 503 | ✅ morto por asserção |
| M09 | idem | a barra final da origem deixa de ser aparada | ⚪ sobreviveu, **equivalente**: `urls.ts:63` (`normalizeOrigin`) apara de novo |
| M10 | `packages/core/src/sitemap/serve.ts` | `s-maxage=3600` → `max-age=600` | ✅ morto por asserção |
| M11 | idem | o 503 sai com o cache do 200 | ✅ morto por asserção |
| M12 | idem | zero produtos responde 200 | ✅ morto por asserção |
| M13 | idem | marcações truncadas em 1000 aceitas | ✅ morto por asserção |
| M14 | `apps/store/scripts/robots.mjs` | `if (env.VERCEL)` → `if (false)` | ✅ morto por asserção |
| M15 | idem | origem com caminho aceita | ✅ morto por asserção |
| M16 | idem | devolve a env crua (barra dupla) | ✅ morto por asserção |
| M17 | idem | modelo que já traz `Sitemap:` aceito | ✅ morto por asserção |
| M18 | `apps/store/scripts/build-robots.mjs` | sem `process.exit(1)` | ✅ morto por asserção (o par positivo existe, `L-041`) |
| M19 | `robots.mjs` | o gerador perde o bloco do Bingbot | ✅ morto por asserção (`robots.test.ts` e `robotsSource.test.ts`) |
| M20 | `turbo.json` | tira `STORE_PUBLIC_URL` e `VERCEL` do `env` | ❌ **SOBREVIVEU**: nenhum teste lê o `env` do `turbo.json` |
| M21 | `apps/store/vercel.json` | volta o rewrite externo do sitemap | ✅ morto por asserção |
| M22 | `server/sitemap.ts` | `countCategories` devolve 0 | ✅ morto por asserção |

**22 injetados: 18 mortos por asserção, 0 por compilação, 2 equivalentes (M04, M09) e 2
sobreviventes reais (M01, M20).**

> **Ruído de medição que a feature piorou.** Na primeira rodada, `chaveDeServidorForaDoNavegador.test.ts`
> entrou junto e "matou" M03, M04, M06, M07, M19 e M21 com `ENOENT`. Ele varre `apps/**` em disco, e
> `scripts/__tests__/shell.test.ts` (feature 69) e agora também `robots.test.ts` (feature 70) criam e
> apagam `apps/store/.tmp-build-*` **dentro da árvore varrida**. Reproduzido sem mutação nenhuma: 1
> reprovação em 4 execuções de `scripts` + o guarda. Esses seis foram rodados de novo sem o guarda, e
> o resultado acima é o da segunda rodada. Na suíte cheia isso é uma flake latente, e a 70 dobrou a
> fonte dela.

---

## O que a mudança pode ter quebrado em outro lugar

- **Sitemap check (`.github/workflows/sitemap-check.yml`), rodado de verdade.** O bloco `run` foi
  extraído e executado contra uma origem servida localmente (`dist/` estático + `api/page.mjs` com a
  `.env`, banco local, `STORE_PUBLIC_URL=http://localhost:8099` no build do robots e no runtime).
  Resultado: `exit 0`, `OK — 2327 URLs, tipo application/xml;, robots.txt coerente, amostra 200,
  canônica na origem do sitemap, 1544 <loc> de opção`. O `grep -ci '^sitemap:'` do passo 4 lê a
  linha gerada sem problema.
  - Os comentários do workflow ficaram desatualizados nas linhas 45 e 76-78 ("a linha do robots.txt
    é literal", "troca ... a linha do `robots.txt`"). É só documentação.
- **O `turbo.json` com comentários continua parseando**: o `pnpm build` da raiz passou, e o Turbo
  entregou `STORE_PUBLIC_URL` ao script (`build-robots: … (Sitemap: http://localhost:8082/sitemap.xml)`).
- **A Vercel não passa pelo Turbo.** O root directory é `apps/store` e o `buildCommand` é
  `pnpm build`, ou seja, o script do app. Por isso M20 não ameaça o deploy. Ela ameaça o build da
  raiz (CI e local): no modo estrito do Turbo a env seria filtrada e o robots cairia em
  `localhost:8082`, com o cache sem distinguir a origem.
- **Fidelidade da mudança de casa.** O diff de `handlers.ts` (HEAD) contra `serve.ts` só tem
  imports, `log` injetado, `{status, headers, body}` no lugar de `Response`, e os dois valores de
  `Cache-Control`. O `index.ts` antigo contra `server/sitemap.ts`: as colunas, as ordens e as
  colunas de contagem são idênticas.

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Esperado |
| --- | --- | --- |
| core `pnpm --filter @estrelinha/core test` | **3414/133**, exit 0 | 3414/133 ✅ |
| functions `pnpm --filter @estrelinha/functions test` | **890/19**, exit 0 | 890/19 ✅ |
| store `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5340/299**, exit 0 | 5340/299 ✅ |
| `tsc --noEmit -p apps/store/tsconfig.app.json` | exit 0 | 0 ✅ |
| `tsc --noEmit -p apps/store/tsconfig.server.json` | exit 0, 0 `error TS` | 0 ✅ |
| `STORE_PUBLIC_URL=http://localhost:8082 pnpm build` | exit 0, 2/2 tasks | ✅ |

**Quedas declaradas**: `supabase/functions/sitemap/__tests__/handlers.test.ts` (30 casos) e
`wiring.test.ts` (4 casos) foram apagados. Os casos reaparecem em
`core/sitemap/__tests__/serve.test.ts` e `apps/store/server/__tests__/sitemap.test.ts` (o
cabeçalho dos dois diz isso). Lint não foi medido (não foi pedido).

## Pendências de plataforma (não contam como falha)

- **Em produção, depois do deploy**: `X-Vercel-Cache: HIT` na segunda batida; `application/xml`
  entregue; 2.331 `<loc>` / 3.742 `<image:loc>` (contagens de 2026-10-20); o `robots.txt` servido
  com a origem da env; o Sitemap check verde.
- **A env `STORE_PUBLIC_URL` precisa existir também no escopo de *Preview* da Vercel** (ou esse
  escopo precisa ser aceito como build vermelho). Com `VERCEL=1` sem a env, o build falha de
  propósito.
- **Apagar a edge function `sitemap` hospedada só depois** de conferir o deploy da loja.

## Lacunas ranqueadas → tasks de conserto

1. **M01, SMV-03.** Fazer `readFaqLinks` do adaptador provar que erro lança: um caso em
   `server/__tests__/sitemap.test.ts` com `dubleDoClient(LINHAS, 'faq_page_items')` passando pelo
   `createPageHandler`, esperando **503 `no-store` sem `<urlset>`** (ou `rejects` direto em
   `deps.readFaqLinks()`). O mesmo vale para os `contar` de categorias, variações e marcações, que
   só têm o erro provado em `products`.
2. **M20.** Um guarda que leia `turbo.json` (JSONC: tirar os comentários antes do parse) e exija
   `STORE_PUBLIC_URL` e `VERCEL` em `tasks.build.env`, com sensor.
3. **A flake dos temporários dentro da árvore varrida.** `robots.test.ts` (e `shell.test.ts`) criam
   `apps/store/.tmp-build-*` enquanto guardas varrem `apps/**`. Ou o temporário sai da árvore
   varrida, ou os varredores ignoram `.tmp-*`.
4. Menor: os comentários das linhas 45 e 76-78 do `sitemap-check.yml`. E, como observação de
   `L-040`, o dublê do client devolve a linha inteira seja qual for o `select`. As colunas estão
   presas por string literal exata (o que mata M05), mas não existe a régua de comportamento
   ("o dublê devolve só o que foi pedido e o documento é igual ao da linha inteira").


---

## Correções do autor depois do FAIL (2026-10-20) — não re-verificadas por agente independente

| Gap | Conserto | Prova |
| --- | --- | --- |
| M01 (SMV-03) | `server/__tests__/sitemap.test.ts`: erro em CADA uma das 5 tabelas pelo `createPageHandler` ⇒ 503 `no-store` sem `<urlset>` | M01 reinjetado: morto por asserção |
| M20 | `scripts/__tests__/robots.test.ts`: o `turbo.json` exige `STORE_PUBLIC_URL`/`VERCEL` em `env` e `dist/**`/`.server/**` em `outputs`, com sensor pela mesma régua | sensor no próprio teste |
| Flake ENOENT | temporários de `shell.test.ts` e `robots.test.ts` movidos para `node_modules/.cache/estrelinha-testes` da raiz | suíte da loja 3× seguidas: 5349/299, exit 0 |
| Régua de colunas (L-040) | dublê de projeção: o XML com as colunas pedidas é idêntico ao da linha inteira, com sensor que prova a fixtura | tirar `image_url`, `stock`, `position` ou `images` do `select` derruba a régua de comportamento sozinha |
| Comentários do `sitemap-check.yml` | atualizados (a linha do `robots.txt` é gerada) | `sitemapCheckWorkflow.test.ts` 20/20 |

Gates depois: store 5349/299 (3×), core 3414/133, functions 890/19, `tsc` 0·0, lint 2/2, `pnpm build` verde.
