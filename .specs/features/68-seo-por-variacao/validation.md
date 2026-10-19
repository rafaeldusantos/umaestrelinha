# 68 — Validação (Verifier independente, rodada 2)

> **Nota do AUTOR depois da rodada 2** (2026-10-19 — não é do Verifier, e não muda o veredito
> dele). Duas lacunas não-bloqueantes foram fechadas: **N09** ganhou a metade do documento que a
> canônica não cobria — o teste servido de SVR-19 passou a cobrar, nas três origens não absolutas,
> JSON-LD `Product` sem `url` e sem `hasVariant` (`product-page/__tests__/handlers.test.ts`, no
> `it.each` de SVR-19). Reinjetado no arquivo real: **morto por asserção nos 3 casos**, restaurado
> por `cmp`. E o cabeçalho de `paginaDeOpcaoComDonoUnico.test.ts` passou a declarar o alcance da
> régua (a), como já declarava o da (c). **N12** (barra final da origem) e **N14** (grupo nulo
> provado só em `core`) ficam como estão. Contagens inalteradas: functions 1010/22 e store
> 5222/292, exit 0 — as asserções entraram em casos que já existiam.

**Data:** 2026-10-19 · **Verifier:** sessão independente (não escreveu o código, os testes nem a
rodada 1). **Diff range:** HEAD `9284bb11` + a árvore não commitada. Nenhum commit, stash, checkout,
reset ou worktree. Todo arquivo mutado foi restaurado e conferido por SHA-256 no arnês; `git status
--porcelain` no fim é idêntico ao do início, exceto este arquivo.

## Veredito: **PASS ✅**

Os cinco itens da rodada 1 estão fechados, conferidos por mim e não pelo relato do autor. A rodada
nova de sensor (18 mutações, focada nos pontos que a rodada 1 cobriu com uma asserção só ou por
acaso, e no que o conserto pode ter deixado ao lado) matou 16 por asserção; os **2 sobreviventes não
estão em cima de AC** — os dois moram no ramo "origem da loja malformada" do servidor, que a spec
cobre só para `<link rel=canonical>`/`og:url` (SVR-19) e que em produção não ocorre
(`STORE_PUBLIC_URL` absoluta e sem barra final). Estão ranqueados abaixo como lacunas de baixa
prioridade, não como bloqueio.

## Gate (uma suíte por vez, exit fora de pipe)

| Workspace | Comando | Resultado | Exit | Esperado pelo autor |
| --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | **3116 / 123** | 0 | 3116/123 ✅ |
| functions | `pnpm --filter @estrelinha/functions test` | **1010 / 22** | 0 | 1010/22 ✅ |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5222 / 292** | 0 | 5222/292 ✅ |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **3493 / 198** | 0 | 3493/198 ✅ |

Contra a rodada 1: core **+2** (os dois casos de ordem), o resto idêntico — a asserção de M39 entrou
num caso existente. `git diff --name-only 9284bb11 -- packages/core/src/payment` → **vazio**;
`git diff 9284bb11 -- packages/core/src/shopping/__tests__/shoppingParity.test.ts` → **vazio**.

## Os cinco itens da rodada 1

| # | Item | O que conferi | Estado |
| --- | --- | --- | --- |
| 1 | M11 — ordem por `options.values` × grade (SVR-01/24) | Reinjetei M11 em `core/src/seo/variant.ts` (sort só pela grade): **core 2 falhas por asserção** — `variant.test.ts` "SVR-01: a ordem é a de options.values MESMO quando a grade discorda dela" e `urls.test.ts` "SVR-24: a ordem das `<loc>` …". Os dois casos têm a fixture que discorda (`values` = Rosé primeiro, grade começa pela Prata, asserido no próprio caso) | ✅ fechado |
| 2 | M39 — `name` do `ProductGroup` servido (SVR-30) | Reinjetei `name: dados.product.slug` no handler: **functions 1 falha por asserção** (`handlers.test.ts:805`, `expect(dado.name).toBe('Pingente Afetivo Pata')`) | ✅ fechado |
| 3 | SVR-15 desvio sem registro | `spec.md:184` traz a nota SPEC_DEVIATION ao lado da AC e `ProductPage.tsx:95` o marcador `// SPEC_DEVIATION` com a razão. **É honesto**: `useProduct.ts` faz uma única consulta com `PRODUCT_SELECT`, que embute `PRODUCT_OPTION_MARKS_EMBED` (`mapProduct.ts:39,51`); erro nela cai no recuo de `product_redirects` e termina em `null` ⇒ 404. Não existe ramo "marcações falham e a peça abre" no cliente. E a forma real em que as marcações "faltam" — embed sob RLS devolve lista vazia, não erro — é exatamente o caso provado (`ProductPageOptionHead.test.tsx`, marcações ausentes/vazias ⇒ `<head>` da peça) | ✅ fechado |
| 4 | SVR-30 × Assumption | `spec.md:271-278`: SVR-30 agora vale "só quando a URL não traz `?variant=` de uma variação elegível", e remete o `?variant=` válido que resolve para peça a SVR-33, citando a Assumption. Lido junto com SVR-33 (`:286`) não há mais caso coberto pelas duas com respostas diferentes; o código (`handlers.ts`, `dadoEstruturado`, ramo 1) e `handlers.test.ts:824` seguem esta forma | ✅ fechado |
| 5 | Entrada da regra diferente (`normalizeOptions`) | Registrado em `CLAUDE.md` → *Estado conhecido*, com a medição (zero eixos sujos em 707, local e produção) e o conserto apontado (folha alcançável pelo Deno, chamada dentro de `indexableOptions`). Não consertado, como declarado — aceito como dívida | ✅ registrado |

**Itens da rodada 1: 5/5 fechados.**

## Sensor de discriminação, rodada 2 — 18 mutações nos arquivos reais

Arnês: cópia do original no scratch, alvo exigido **exatamente uma vez** (senão não aplica — N08
precisou ser reescrito por indentação e só então rodou), suítes dos consumidores, restauração e
SHA-256. Todas as mutações são sintaticamente válidas; **nenhuma morte por compilação** (as falhas
nomeiam casos por asserção).

| # | Arquivo | Mutação | Resultado | Matou |
| --- | --- | --- | --- | --- |
| N01 | `seo/variant.ts` | M11 reinjetado (ordem só pela grade) | morto | `variant.test.ts` SVR-01 (grade discorda), `urls.test.ts` SVR-24 (ordem) |
| N02 | `product-page/handlers.ts` | M39 reinjetado (`name` = slug) | morto | `handlers.test.ts:805` |
| N03 | `seo/variant.ts` | texto fora de `values` vai ao **começo** | morto | `variant.test.ts` "ausente de options.values vai ao fim" |
| N04 | idem | eixos ignoram `position` | morto | SVR-02 "os eixos seguem options.position" |
| N05 | idem | `?variant=` de texto não marcado resolve para a 1ª opção | morto | core 6, functions 3, loja 2 (SVR-07/10/11/16/20/29/33) |
| N06 | idem | descrição sem o ponto (`"{texto} {desc}"`) | morto | core 3, functions 2 (incl. escape), loja 1 — literais |
| N07 | `shopping/jsonld.ts` | propriedade do eixo recebe o título | morto | `jsonld.test.ts` (2), `handlers.test.ts` SVR-30/31 |
| N08 | idem | `withPageUrl` emite `url: null` | morto **só em core** | `jsonld.test.ts:142` (functions 1010/1010 verde — ver lacuna 1) |
| N09 | `product-page/handlers.ts` | `ProductGroup` mesmo **sem canônica absoluta** | **SOBREVIVEU** (functions 1010/1010) | — |
| N10 | `shopping/jsonld.ts` | `variesBy` sem dobra de acento/caixa | morto | `jsonld.test.ts` "Còr", "Tamânho" |
| N11 | `product-page/handlers.ts` | `hasVariant[].url` relativa | morto | `handlers.test.ts` SVR-30/31 |
| N12 | idem | origem com barra final não aparada | **SOBREVIVEU** (functions 1010/1010) | — |
| N13 | `sitemap/urls.ts` | marcações de TODAS as peças em cada peça | morto | `urls.test.ts` (6) |
| N14 | `seo/variant.ts` | `publicOptionMarks` aceita grupo ausente/nulo | morto | `variant.test.ts` "grupo ausente, nulo ou sem is_active" (uma asserção só — functions e loja verdes) |
| N15 | `backoffice/.../optionRows.ts` | rascunho sem o recorte de grupo ativo | morto | `filtros.test.tsx` SVR-37 (2) |
| N16 | `sitemap/handlers.ts` | marcações lidas só até 1000 | morto | `handlers.test.ts` SVR-26 (marcações truncadas ⇒ 503) |
| N17 | `seo/variant.ts` | inelegíveis contam como texto do eixo | morto | core 9 (SVR-03, SVR-06, SVR-24..28) |
| N18 | `ProductPage.tsx` | sem o `is_active: true` da loja | morto | `ProductPageOptionHead.test.tsx` (10) — o `Product` da loja não carrega `is_active`, e sem o recorte toda opção vira peça |

**18 injetadas · 16 mortas por asserção · 0 por compilação · 2 sobreviveram (N09, N12).**

Rodadas 1 + 2: 57 mutações, 53 mortas por asserção, 0 por compilação, 4 sobreviventes, dos quais os
dois da rodada 1 estão fechados.

## Lacunas, ranqueadas (nenhuma bloqueia)

1. **O JSON-LD servido com origem NÃO absoluta não tem asserção** (N09, e N08 morto só na unidade).
   O comentário de `dadoEstruturado` (`product-page/handlers.ts`, item 2 da precedência) promete o
   `ProductGroup` só "com origem absoluta", e `withPageUrl` promete "nunca `url` relativa" — mas o
   caso servido de SVR-19 (`handlers.test.ts:782`) olha só `<link rel=canonical>` e `og:url`. Com
   N09, `origin = '/loja'` serve um `ProductGroup` com `"url":null` e `hasVariant[].url` relativa
   (`/loja/produtos/…`), com functions verde. **Não é AC**: SVR-19 fala de canônica e `og:url`, e
   SVR-31 pede "o caminho canônico" sem exigir absoluto. **Não ocorre em produção** (`STORE_PUBLIC_URL`
   é absoluta). Conserto, se quiser: no mesmo `it.each` de SVR-19, asserir que o JSON-LD da peça é
   `Product` sem `url` (e, com `?variant=`, sem `url`). É a assinatura de L-039 de novo: a regra
   provada no construtor, o ramo do handler não.
2. **A barra final de `STORE_PUBLIC_URL` é aparada sem teste** (N12). Antes da `68` o handler também
   não aparava (`${deps.origin}${productPath(...)}`), então o comportamento é ganho de robustez, não
   AC; com a mutação, uma origem `https://x/` serviria canônica `https://x//produtos/…` e o sensor
   diário (SVR-41) a acusaria no dia seguinte. Conserto: um caso com origem terminando em `/`.
3. **SVR-39, régua (a), mede GRAFIA, e o cabeçalho do guarda não declara isso** (M32 da rodada 1).
   `` `?${'variant'}=${id}` ``, `URLSearchParams({ variant: id })` ou `'?variant' + '=' + id` passam
   pela régua (a). Classificação: **limite de régua, não lacuna de AC** — SVR-39/40 pedem um guarda e
   um construtor único, e os dois existem; a contenção do card é a metade positiva (`variantPath` no
   `ProductCard`). Mas o cabeçalho de `paginaDeOpcaoComDonoUnico.test.ts` declara o alcance só da
   régua (c) ("o limite de qualquer régua de grafia"); a (a) tem o mesmo limite e não o diz. Conserto:
   uma frase no cabeçalho. Um arquivo NOVO que monte o parâmetro por outra grafia não seria acusado.
4. **`publicOptionMarks` com grupo ausente/nulo é provado por uma asserção só, em core** (N14).
   Basta para o comportamento (o servidor é o único chamador e consome a função), mas o caso servido
   de SVR-20 usa só `is_active: false`; o embed nulo (`filter_values: null`) nunca passa pelo handler.
   Baixo risco: a função é chamada e testada; anotado para quem mexer no `select` de
   `COLUNAS_MARCACAO`.

**Observações (não ranqueadas como lacuna):**

- O painel monta as variações com `position: v.position ?? i` (`FilterValuesCard.tsx`) e a regra usa
  `?? 0`. Muda só a **representante**, que o painel não mostra; o conjunto de textos com página
  (que é o que a tela diz) não depende disso.
- O `index.ts` das duas functions (os `select` de `options`, `option_values`, `price`, `is_active` e a
  ordem estável de `product_option_filter_values`) continua sem teste por construção (`AD-004`); a
  prova é a servida em `prova-servida.md` (autor = medidor), não remedida aqui.

## O que fica para produção / navegador

Igual à rodada 1, sem mudança: **SVR-23** e **Success Criterion 1** (`curl` contra a loja publicada:
`text/html`, uma `rel="canonical"` igual à URL, `og:url` igual — o caso de opção só depois da
curadoria); **Success Criterion 2** (zero `<loc>` com `?variant=` logo após o deploy);
**SVR-34/35/41** na primeira execução do `Sitemap check`; **SVR-14 / SC 4** e **SC 3** medidos pelo
autor e não remedidos; **SC 5** no Search Console. Ordem de publicação: as duas functions dependem de
`product_option_filter_values` (migration da `67`, já no disco) e das colunas `options`/`option_values`
que existem; nenhuma migration nova nesta feature.

---

# 68 — Validação (Verifier independente, rodada 1)

**Data:** 2026-10-19 · **Verifier:** sessão independente (não escreveu o código nem os testes).
**Diff range:** HEAD `9284bb11` + a árvore **não commitada** (30 arquivos alterados, 8 novos — `git
status --porcelain` no início da sessão). Nenhum commit, stash, checkout ou worktree foi usado.

## Veredito: **FAIL ❌ — por cobertura, sem defeito de produto achado**

A feature faz o que a spec pede em todos os ramos que medi, e 37 de 39 mutantes morreram por
asserção. Os **dois sobreviventes** estão em cima de ACs P1/P2 (SVR-01/24 e SVR-30) e são
consertáveis com um caso cada. Pela régua do processo, mutante sobrevivente vira tarefa de conserto
antes do fecho. Há também um desvio de spec (SVR-15) que está no `design.md` e não está na spec nem
no código.

## Gate (uma suíte por vez, exit code fora de pipe)

| Workspace | Comando | Resultado | Exit | Esperado pelo autor |
| --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | **3114 / 123** | 0 | 3114/123 ✅ |
| functions | `pnpm --filter @estrelinha/functions test` | **1010 / 22** | 0 | 1010/22 ✅ |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5222 / 292** | 0 | 5222/292 ✅ |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **3493 / 198** | 0 | 3493/198 ✅ |

Contra a baseline de entrada do `design.md` (core 3011/122 · functions 977/22 · store 5164/289 ·
backoffice 3487/198): **+103 · +33 · +58 · +6**, nenhum workspace caiu. Nenhum skip.

- `git diff --name-only 9284bb11 -- packages/core/src/payment` → **vazio** ✅
- `git diff 9284bb11 -- packages/core/src/shopping/__tests__/shoppingParity.test.ts` → **vazio** ✅
  (e o arquivo não aparece em `git status`). Também intocados: `shopping/__tests__/denoReach.test.ts`,
  `pages/__tests__/metaPorRota.test.ts`, `vercelRedirects.test.ts`, `marcacaoPorOpcaoComDonoUnico.test.ts`.
- Não rodei `tsc` nem `pnpm lint`/`pnpm build` (fora do pedido); o autor declara 0 · 0 e 26/7.

## Cobertura ancorada na spec (evidence-or-zero)

Legenda: ✅ coberto com o valor da spec · ⚠️ coberto, com ressalva · ❌ lacuna · 🌐 só produção/navegador prova.

### P1 — a regra (SVR-01..07)

| AC | Valor da spec | Evidência (`arquivo:linha` — asserção) | |
| --- | --- | --- | --- |
| SVR-01 | lista de opções (eixo, texto, representante, caminho) **na ordem dos textos em `options` do eixo** | `core/src/seo/__tests__/variant.test.ts:72` — `toEqual([['Cor',PRATA],['Cor',ROSE]])`; `:87` (marcações invertidas) e `:92` (texto fora de `values` vai ao fim) | ❌ **mutante M11 sobreviveu**: trocar a ordem por `options.values` pela ordem da grade deixa as 4 suítes verdes — em toda fixture a ordem de `values` coincide com a da grade entre os textos marcados |
| SVR-02 | primeiro eixo (ordem de `options`) com ≥1 texto indexável **e** ≥2 textos distintos elegíveis; nenhum outro eixo | `variant.test.ts:97` (ordem por `position`), `:110` (um texto só ⇒ próximo eixo), `:117` (eixo sem marca é pulado); M01, M02 mortos | ✅ |
| SVR-03 | marcação (qualquer valor) + ≥1 variação elegível com o texto, comparação exata | `variant.test.ts:124` (caixa/espaço não casam ⇒ `[]`), `:129` (só inativa/sem preço ⇒ fora), `:150` | ✅ |
| SVR-04 | menor `position`, desempate `publicVariantId` crescente, estoque fora | `variant.test.ts:182`, `:186` (`representativeVariant` escolhe outra; a da opção não), `:196` (desempate nas duas ordens, `'20' < '3'`); M03, M04 mortos | ✅ |
| SVR-05 | `productPath(slug)+'?variant='+publicVariantId(rep)`, igual byte a byte ao `<g:link>` | `variant.test.ts:80` — `toBe(resolveOffer(...).link)`; `:213` (UUID); `shopping/__tests__/offer.test.ts` `variantPath` (4 casos, forma antiga por extenso); M30 morto | ✅ |
| SVR-06 | sem eixo / sem marcação / só grupo inativo ⇒ `[]` | `variant.test.ts:157`, `:162`, `:169`, `:176` | ✅ |
| SVR-07 | opção para variação elegível de texto indexável (rep. ou não); peça para ausente, vazio, desconhecido, inelegível, texto não indexável | `variant.test.ts:222`, `:231`, `:240`, `:249` (5 formas ⇒ `{kind:'product',opened:null}`), `:259`, `:271`; M05 morto | ✅ |

### P1 — a página na loja (SVR-08..16)

| AC | Valor da spec | Evidência | |
| --- | --- | --- | --- |
| SVR-08 | `"{nome} — {texto}"`, espaços colapsados, marca só se ≤ 60, nunca cortado | `seo.test.ts:285` (exatamente 60, com marca), `:292` (61 ⇒ sem marca), `:297`, `:302` (code points), `:308`, `:312` (nome, não `seo_title`), `:316` (marca nunca em dobro); loja: `ProductPageOptionHead.test.tsx:157,169` com títulos LITERAIS; M06, M07, M08 mortos | ✅ |
| SVR-09 | `summarize("{texto}. {descrição de productPageMeta}")`, ≤ 160, nunca vazia | `seo.test.ts:325`, `:334`, `:341`; loja `ProductPageOptionHead.test.tsx:164` (literal); M09 morto | ✅ |
| SVR-10 | peça ⇒ `productPageMeta` idêntico | `seo.test.ts:361` — `toEqual(productPageMeta(p,…))` em 3 formas; loja `:195,202,208` | ✅ |
| SVR-11 | canônica = caminho da opção ou `productPath(slug)`, absoluta, sem outro parâmetro | `seo.test.ts:354`; loja `ProductPageOptionHead.test.tsx:157,175,182,188` (`utm_source` fora), `:195`; M10, M13 mortos | ✅ |
| SVR-12 | `<head>` do `?variant=` da abertura; seletor não muda | `ProductPageOptionHead.test.tsx:229` — clique no seletor muda a linha, título/canônica ficam os do Rosé; M38 morto | ✅ |
| SVR-13 | sem peça+marcações ⇒ nem título nem canônica | `ProductPageOptionHead.test.tsx:262` (`'sentinela'`, `null`), `:294` (rota legada) | ✅ |
| SVR-14 | `page_view` com o título da opção e `?variant=` em `page_location` | `ProductPageOptionHead.test.tsx:309` — `page_title === TITULO_ROSE`, `search === '?variant=1004'` (jsdom); navegador: `prova-servida.md` (autor = medidor) | ✅ local · 🌐 produção |
| SVR-15 | falha da leitura das marcações no cliente ⇒ `<head>` da peça **e** a página abre normalmente | `ProductPageOptionHead.test.tsx:271` — só marcações **ausentes/vazias** | ⚠️ **desvio não marcado**: no cliente as marcações vêm no MESMO `select` do produto (`mapProduct.ts:51`); uma falha do embed é falha de `useProduct`, que cai no recuo de `product_redirects` e termina em 404 (`useProduct.ts:19-38`) — a página **não** "abre normalmente". O `design.md` (§4) declara isso; a spec continua prometendo o contrário e não há `// SPEC_DEVIATION` no código (`L-026`) |
| SVR-16 | navegar `?variant=A → B` reabre em B e troca o `<head>` | `ProductPageOptionHead.test.tsx:239,250`; M14 morto | ✅ |

### P1 — o HTML servido (SVR-17..23)

| AC | Valor da spec | Evidência | |
| --- | --- | --- | --- |
| SVR-17 | `<title>`, description, og:title/description, twitter:title/description = SVR-08/09, mesma função | `product-page/__tests__/handlers.test.ts:687` — título LITERAL `Pingente Afetivo Pata — ${ROSE}` e os 6 campos comparados por igualdade de lista (exatamente um de cada); `:704` (canônica == `<g:link>`) | ✅ |
| SVR-18 | **uma** `<link rel=canonical>` absoluta igual à do cliente, `og:url` igual | `handlers.test.ts:681`, `:687`, `:791` (shell com canônica ⇒ exatamente uma); M16, M17 mortos | ✅ |
| SVR-19 | origem não absoluta ⇒ sem canônica e sem `og:url` | `handlers.test.ts:778` (vazia, relativa, sem esquema; com e sem `?variant=`); M18 morto | ✅ |
| SVR-20 | marcações da service role passam por grupo ativo (e peça ativa) | `handlers.test.ts:721,727`; `variant.test.ts:303,307`; M12, M19 mortos. Peça ativa: via `feedExclusion` (`variant.test.ts:176`) | ✅ |
| SVR-21 | falha ⇒ 200, `<head>`/canônica da peça, log `{fn:'product-page', erro:'marcacoes', slug}` | `handlers.test.ts:747` — `objectContaining({fn, erro, slug: SLUG})`; M20 morto | ✅ |
| SVR-22 | `Product.url` = canônica; `offers.url` = `<g:link>` da aberta; paridade intocada | `handlers.test.ts:710` (não representante: `url` ≠ `offers.url`), `:841` (preço do XML do feed, `sku`, `offers.url`); `jsonld.test.ts:133,148`; `shoppingParity.test.ts` sem diff; M21 morto | ✅ |
| SVR-23 | produção: `text/html` e canônica servida == própria URL | só `prova-servida.md` (local, autor = medidor: 3/3 `<loc>` de opção com canônica igual, `text/html; charset=utf-8`) | 🌐 produção — depende de deploy e de curadoria |

### P1 — o sitemap (SVR-24..29)

| AC | Valor da spec | Evidência | |
| --- | --- | --- | --- |
| SVR-24 | uma `<loc>` por opção, = caminho canônico absolutizado, logo depois da peça, **na ordem de SVR-01** | `core/src/sitemap/__tests__/urls.test.ts:114` (lista exata), `:124`; `sitemap/__tests__/handlers.test.ts:301`; M26 morto | ⚠️ posição ✅; a **ordem** herda o sobrevivente M11 (a fixture tem `values` na ordem da grade) |
| SVR-25 | `lastmod` = `updated_at` da peça | `urls.test.ts:129`; `handlers.test.ts:314`; M27 morto | ✅ |
| SVR-26 | leitura paginada (`readAllPages`); incompleta ⇒ não 200 | `handlers.test.ts:330` (4 falhas ⇒ 503 sem `<urlset>`), `:346`, `:354` (1001/1000), `:362` (faixas `0-999`, `1000-1999`); M28 morto | ✅ |
| SVR-27 | única query = `?variant=` de opção indexável; sensor nos dois sentidos | `urls.test.ts:169,175,185,195` (forma medida sozinha, com o conjunto contendo a própria URL), `:54` | ✅ |
| SVR-28 | sitemap ⊆ autocanônicas e autocanônicas ⊆ sitemap, com a função da produção | `urls.test.ts:203,216` | ✅ |
| SVR-29 | marcação removida / grupo desligado / sem elegível ⇒ `<loc>` some e canoniza para a peça | `urls.test.ts:222` (3 casos, com `resolveVariantPage` ⇒ `'product'`); `handlers.test.ts:324`; `variant.test.ts:323`; M29 morto | ✅ |

### P2 — `ProductGroup` (SVR-30..33)

| AC | Valor da spec | Evidência | |
| --- | --- | --- | --- |
| SVR-30 | `ProductGroup` com `name` (nome da peça), `productGroupID`, `variesBy`, `hasVariant`, no lugar do `Product` | `jsonld.test.ts:228` (unidade: `name`, id, `variesBy`, `url`); `handlers.test.ts:798` (servido: `@type`, `productGroupID`, `variesBy`, `url`, `hasVariant`, 1 bloco); M23 morto | ❌ **mutante M39 sobreviveu**: `name: dados.product.slug` no handler deixa as 1010 de functions verdes — o `name` do grupo servido não tem asserção; a de `jsonld.test.ts` recebe o nome do próprio teste |
| SVR-31 | cada variante: `name` (título sem marca), `sku`, `image`, `color`/`size`, `url`, `offers` de `resolveOffer(rep)` | `jsonld.test.ts:237` (os seis campos), `:254` (preço "por" e OutOfStock); `handlers.test.ts:798` (`name`,`color`,`sku`,`url`, `offers` da rep.); M24 morto | ✅ |
| SVR-32 | `Cor`→color, `Tamanho`→size, dobra exata; fora da tabela ⇒ `Product` | `jsonld.test.ts:158,162,166,170`; `handlers.test.ts:832`; M25 morto | ✅ |
| SVR-33 | `?variant=` válido ⇒ `Product` da aberta + `inProductGroupWithID`, um `@type` | `handlers.test.ts:815,824`; M22 morto | ✅ · ⚠️ spec-precision: o texto de SVR-30 ("WHEN resolve para **peça**") e a Assumption da linha 88 ("páginas com `?variant=` continuam com o `Product`") discordam para `?variant=` válido de texto não marcado; o código segue a Assumption (`handlers.test.ts:824`) |

### P2 — o sensor diário (SVR-34..36, 41)

Provados por **leitura do `.yml`** (`apps/store/src/shared/lib/__tests__/sitemapCheckWorkflow.test.ts`,
predicados com sensor por mutação e `mutar()` que lança). O shell **não foi executado** por mim nem
por CI nesta feature — só a primeira execução do cron prova que o passo 6 roda.

| AC | Evidência | |
| --- | --- | --- |
| SVR-34 | `sitemapCheckWorkflow.test.ts:110` + sensor `:193`; M34 morto | ✅ (texto) · 🌐 CI |
| SVR-35 | `:117` + sensor `:198` (zero não falha, contagem impressa) | ✅ (texto) · 🌐 CI |
| SVR-36 | `:77`, `:89` + sensores `:172,179` | ✅ (texto) |
| SVR-41 | `:95`, `:104` + sensores `:183,189`; M33 morto | ✅ (texto) · 🌐 CI |

### P3 — o painel (SVR-37/38)

| AC | Evidência | |
| --- | --- | --- |
| SVR-37 | `AdminProductFormPage.filtros.test.tsx:410` (frase LITERAL, 2 linhas; grupo desligado e 2º eixo não), `:427` (rascunho), `:450` (mesmo texto em 2 eixos), `:472`; M35, M37 mortos | ✅ |
| SVR-38 | `:420` (frase LITERAL, só no eixo que não gera), `:435`; M36 morto | ✅ |

### Restrições

| | Evidência | |
| --- | --- | --- |
| SVR-39 | `paginaDeOpcaoComDonoUnico.test.ts` — três réguas, metade positiva, âncora dupla, sensores CRLF/LF/glob; M31 morto pela régua (a) | ✅ · limite declarado: M32 (`` `?${'variant'}=${id}` ``) passou pela régua (a) e só morreu porque a metade positiva cobra `variantPath` **no card** — num arquivo novo a mesma grafia passaria |
| SVR-40 | `offer.test.ts` `variantPath` (offerLink delega, byte a byte); card chama `variantPath` (guarda, metade positiva); M30 morto | ✅ |

### Edge cases da spec

| Edge case | Evidência | |
| --- | --- | --- |
| dois textos, mesmo valor ⇒ duas páginas | `variant.test.ts:136` | ✅ |
| texto só em inativa/sem preço | `variant.test.ts:129` | ✅ |
| representante desativada ⇒ próxima | `variant.test.ts:208` | ✅ |
| peça desativada | `variant.test.ts:176`, `urls.test.ts:146` (a 404 não é desta feature) | ✅ |
| sem `nuvemshop_id` ⇒ UUID == `<g:link>` | `variant.test.ts:213` | ✅ |
| UUID de variação com `nuvemshop_id` ⇒ canônica pelo id público | `variant.test.ts:276`; loja `:182` | ✅ |
| `?variant=` repetido ⇒ o primeiro | `variant.test.ts:285` | ✅ |
| `&`, `<`, aspas escapados | `handlers.test.ts:851`; `render.test.ts:98-118` (`<loc>` com `&`) | ✅ |
| slug antigo mantém `?variant=` | `ProductPageOptionHead.test.tsx:284`; M15 morto | ✅ |
| cliente × servidor em momentos diferentes | aceito pela spec, sem teste | — (declarado) |

**Resumo:** 41 ACs · 33 ✅ · 2 ❌ (SVR-01 ordem, SVR-30 `name`) · 3 ⚠️ (SVR-15 desvio, SVR-24 herda
M11, SVR-30/33 ambiguidade de spec) · SVR-23 e os Success Criteria 🌐 · SVR-34/35/41 provados no
texto, não na execução.

## Sensor de discriminação — 39 mutantes nos arquivos reais

Cada mutação: cópia do original no scratch, edição do arquivo real (alvo exigido **exatamente uma
vez**, senão o arnês não aplica), suíte(s) do consumidor, restauração e `cmp`. **Todos os 11
arquivos-alvo conferidos por `shasum -c` contra o SHA de antes: OK.** Nenhuma morte por compilação —
todas as mutações são sintaticamente válidas e as falhas nomeiam casos por asserção.

| # | Arquivo | Mutação | Resultado | Matou |
| --- | --- | --- | --- | --- |
| M01 | `seo/variant.ts` | eixo com 1 texto gera página (`< 2` → `< 1`) | morto (asserção) | `variant.test.ts:110` |
| M02 | idem | eixo sem marca encerra (`continue` → `return []`) | morto | `:117` |
| M03 | idem | desempate decrescente | morto | `:196` |
| M04 | idem | estoque passa a preferir | morto | `:186` |
| M05 | idem | variação inelegível resolve para opção | morto | `:259` |
| M06 | idem | `<= 60` → `< 60` | morto | `seo.test.ts:285,302` |
| M07 | idem | contagem em UTF-16 | morto | `seo.test.ts:302` |
| M08 | idem | sem o portão da marca no nome | morto | `seo.test.ts:316` |
| M09 | idem | descrição sem o prefixo do texto | morto | `seo.test.ts:325,334,341` |
| M10 | idem | canônica de opção = a da peça | morto | `seo.test.ts:354` |
| **M11** | idem | ordem pela grade em vez de `options.values` | **SOBREVIVEU** (core, functions, store-página, painel) | — |
| M12 | idem | `publicOptionMarks` aceita `is_active` nulo | morto | `variant.test.ts:307` |
| M13 | `ProductPage.tsx` | canônica com a query inteira da URL | morto | `ProductPageOptionHead.test.tsx:175…` |
| M14 | idem | `key={product.id}` | morto | `:239,250` |
| M15 | idem | slug antigo descarta a query | morto | `:284` |
| M16 | `product-page/handlers.ts` | `og:url` sem a query | morto | `handlers.test.ts:687` |
| M17 | idem | canônica do shell não removida | morto | `:791` |
| M18 | idem | origem relativa vira canônica | morto | `:778` |
| M19 | idem | sem o recorte de grupo ativo | morto | `:721` |
| M20 | idem | sem o log da falha | morto | `:747` |
| M21 | idem | `Product.url` = `offers.url` | morto | `:710` |
| M22 | idem | sem `inProductGroupWithID` | morto | `:815` |
| M23 | idem | `?variant=` válido vira `ProductGroup` | morto | `:710…` |
| M24 | idem | `offers` do grupo = oferta da página | morto | `:798` |
| M25 | `shopping/jsonld.ts` | Tamanho → color | morto | `jsonld.test.ts:158,166` |
| M26 | `sitemap/urls.ts` | opção antes da peça | morto | `urls.test.ts:114` |
| M27 | idem | `lastmod` da opção nulo | morto | `urls.test.ts:129` |
| M28 | `sitemap/handlers.ts` | variações lidas só até 1000 | morto | `handlers.test.ts:346` |
| M29 | `sitemap/urls.ts` | peça inativa ganha opção | morto | `urls.test.ts:146` |
| M30 | `shopping/offer.ts` | `variantPath` sempre com UUID | morto | `offer.test.ts` (offerLink, variantPath) |
| M31 | `ProductCard.tsx` | `?variant=` por concatenação | morto pela régua (a) e pela positiva | `paginaDeOpcaoComDonoUnico.test.ts:194,216` |
| M32 | idem | `` `?${'variant'}=${id}` `` (grafia fora da régua) | morto **só** pela metade positiva | `:216` |
| M33 | `sitemap-check.yml` | sem a comparação de origem (SVR-41) | morto | `sitemapCheckWorkflow.test.ts:95` |
| M34 | idem | opção sem exigir igualdade (SVR-34) | morto | `:110,117` |
| M35 | `FilterValuesCard.tsx` | linha marca página só pelo texto | morto | `filtros.test.tsx:450` |
| M36 | idem | aviso conta marcação de grupo desligado | morto | `:435` |
| M37 | `optionRows.ts` | sem o recorte de grupo ativo | morto | `:410` |
| M38 | `ProductPage.tsx` | `variantParam` anulado | morto | `ProductPageOptionHead.test.tsx:157…` |
| **M39** | `product-page/handlers.ts` | `ProductGroup.name` = slug | **SOBREVIVEU** (functions 1010/1010) | — |

**39 injetados · 37 mortos por asserção · 0 por compilação · 2 sobreviventes.**

## Payload / conjunção

- **`<head>` servido** (SVR-17/18): `<title>`, `description`, `og:title`, `og:description`,
  `twitter:title`, `twitter:description`, `rel=canonical`, `og:url` — os oito com asserção de VALOR e
  de unicidade (`handlers.test.ts:687`, igualdade de lista).
- **JSON-LD `Product`** (SVR-22/33): `url`, `offers.url`, `sku`, `offers.price`, `inProductGroupWithID`
  — todos com valor.
- **JSON-LD `ProductGroup`** (SVR-30/31): `@type`, `productGroupID`, `variesBy`, `url`, `hasVariant[*]`
  (`name`, `color`, `sku`, `url`, `offers`) com valor no handler; `image` só na unidade
  (`jsonld.test.ts:247`); **`name` do grupo sem asserção no handler** (M39).

## Lacunas, ranqueadas

1. **SVR-01 / SVR-24 — a ordem por `options.values` não é discriminada** (M11). Em todas as fixtures
   (core, functions, loja, painel) a ordem de `values` entre os textos marcados coincide com a da
   grade, então a ordenação por `posicao()` é verdadeira nos dois mundos. Conserto: uma fixture em que
   `values` = `[ROSE, OURO, PRATA]` e a grade começa pela Prata, com as duas marcadas, asserindo
   `[ROSE, PRATA]` em `indexableOptions` e na ordem das `<loc>`. `core/src/seo/variant.ts:155-156`.
2. **SVR-30 — o `name` do `ProductGroup` servido não tem asserção** (M39). `handlers.test.ts:798`
   não olha `dado.name`; o caso de `jsonld.test.ts:228` recebe o nome do próprio teste. Conserto:
   `expect(dado.name).toBe('Pingente Afetivo Pata')` no caso servido.
   `supabase/functions/product-page/handlers.ts:406`.
3. **SVR-15 — desvio da spec sem registro na spec nem no código.** A falha de leitura das marcações no
   cliente não existe como falha isolada: ela é a falha da consulta do produto, e a página vai a 404,
   não "abre normalmente". O `design.md` declara; a spec não foi emendada e não há
   `// SPEC_DEVIATION` em `ProductPage.tsx` (`L-026`). Conserto: emendar SVR-15 (ou marcar o desvio)
   — não é código.
4. **SVR-30 × Assumption (linha 88) — ambiguidade de spec.** `?variant=` válido de texto não marcado
   "resolve para peça" (SVR-07) e, pela letra de SVR-30, levaria `ProductGroup`; a Assumption diz
   `Product`. O código segue a Assumption e tem teste (`handlers.test.ts:824`). Conserto: uma frase
   em SVR-30 ("…e a URL não tem `?variant=` válido").

**Observações que não ranqueei como lacuna:**

- **A regra é uma só; a ENTRADA não é.** A loja passa a peça por `normalizeOptions`/`normalizeVariants`
  (`core/product/index.ts`: apara o nome do eixo, descarta eixo sem `values`), e a `product-page` e o
  `sitemap` passam `options` cru do banco. Com dado limpo dá o mesmo; com `name: 'Cor '` ou um eixo
  sem `values`, a loja e o servidor responderiam diferente. Não medi se existe esse dado; é risco de
  segundo dono pela porta da normalização.
- **SVR-39, régua (a), é de grafia.** M32 mostra que `` `?${'variant'}=${id}` `` escapa da régua; o
  card está contido pela metade positiva, um arquivo novo não estaria. O cabeçalho do guarda declara o
  limite para a régua (c), não para a (a).
- O passo 6 do `sitemap-check.yml` foi medido como texto; nunca rodou.

## O que fica para produção / navegador

- **SVR-23** e **Success Criterion 1** em produção: `curl` contra a loja publicada depois do deploy —
  `Content-Type: text/html`, uma `rel="canonical"` igual à URL da peça, `og:url` igual; o caso de
  opção só existe depois de a Adri marcar uma cor.
- **Success Criterion 2**: zero `<loc>` com `?variant=` no sitemap de produção logo após o deploy.
- **SVR-34/35/41**: a primeira execução do cron (`Sitemap check`) depois do deploy.
- **SVR-14 / Success Criterion 4**: medido em navegador pelo autor (`prova-servida.md`); não
  remedido aqui.
- **Success Criterion 3** (feed idêntico): medido pelo autor por `cmp` no local; não remedido aqui.
- **Success Criterion 5**: Search Console, 4 e 8 semanas depois da curadoria.
