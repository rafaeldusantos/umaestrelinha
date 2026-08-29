# Tasks — Sitemap da loja

Cobre [`spec.md`](./spec.md) e [`design.md`](./design.md). **15 tarefas em 5 fases.**

**Regra de commit deste repositório** (sobrepõe o padrão da Skill, `BL-012`): **não** há commit por
task. Implementa-se tudo, e no fim saem os commits completos da implementação de uma vez.

**Gate de cada task**: a suíte do workspace tocado passa, **por workspace e com exit code capturado**
(`pnpm test | tail` esconde a falha). Baseline a bater no fecho:

| Workspace | Baseline |
| --- | --- |
| store | 1903 / 130 |
| backoffice | 1556 / 97 |
| core | 1363 / 52 |
| functions | 337 / 6 |
| catalog-import | 335 / 16 |
| **total** | **5494 / 301** |

Tipos `0 · 0 · 0` · Lint 30 err / 8 warn · `git diff --name-only` sem nada em
`packages/core/src/payment/`.

---

## Fase 1 — Fundações em `core`

### T01 — `escapeXml` ganha casa própria em `core/xml`

- `packages/core/src/xml/escape.ts` com o **conteúdo atual** de `escapeXml`; `xml/index.ts` reexporta.
- `shopping/xml.ts` importa de `../xml/escape.ts` e **continua reexportando** — o barrel de `shopping`
  não muda de superfície, então o import relativo das edge functions segue resolvendo.
- `packages/core/package.json`: `"./xml": "./src/xml/index.ts"`.
- **Movimento puro.** Nenhuma alteração de comportamento.
- **Verificação**: `core` e `functions` passam **sem edição de teste**.
- **Requisitos**: `SMP-10`

### T02 — `readAllPages` sai da `google-feed` para `core/paging`

- `packages/core/src/paging/readAll.ts`: `readAllPages<T>({ total, readPage, pageSize })`, **puro**,
  lançando quando `lidas !== total` com mensagem que nomeia os dois números. `POSTGREST_PAGE_SIZE`
  mora aqui, com o comentário que explica por que o número existe.
- `google-feed/handlers.ts`: `readAllRows` vira adaptador sobre `readAllPages`, **mantendo nome,
  assinatura e mensagem** — os testes existentes são a régua e **não são editados**.
- `packages/core/package.json`: `"./paging": "./src/paging/index.ts"`.
- Novo `paging/__tests__/readAll.test.ts`: leitura completa; truncada lançando; página vazia
  interrompendo; total múltiplo exato do tamanho de página; `total = 0`.
- **Verificação**: `core` (+N) e `functions` (**337, inalterada**).
- **Requisitos**: `SMP-16`, `SMP-19`

### T03 — `core/menu` fica alcançável fora de um bundler

- `packages/core/src/menu/index.ts`: `export * from './menu'` → `'./menu.ts'`.
- **Por quê** (§1.3 do design): sem a extensão, `import('@estrelinha/core/menu')` falha com
  `Cannot find module …/menu/menu`, e o Deno tem a mesma exigência — `categoryHref`, o dono da
  canônica de categoria, ficaria inalcançável para a function.
- **Verificação**: core, store e backoffice passam **inalterados**; e
  `cd apps/store && node -e "import('@estrelinha/core/menu')"` resolve.
- **Requisitos**: `SMP-03`

---

## Fase 2 — A regra pura do sitemap

### T04 — A classificação de rota em `core/routes`

- `SITEMAP_STATIC_PATHS` (4 entradas, `MATERIAL_GUIDE_PATH` reaproveitado) e `NON_INDEXABLE_PATHS`
  (7 entradas, cada uma com `reason` escrito), com o comentário dizendo quem prova a cobertura.
- **Verificação**: `routes.test.ts` de `core` ganha asserções — nenhuma entrada duplicada entre as
  duas listas, todo `path` começando com `/`, `MATERIAL_GUIDE_PATH` presente.
- **Requisitos**: `SMP-04`, `SMP-24`

### T05 — `sitemapUrls`: catálogo → URLs canônicas

- `core/src/sitemap/{types,urls}.ts`. **Extensão explícita em todo import relativo** (regra de §1.3).
- Ordem: institucionais → categorias (`sort_order`, `slug`) → produtos (`slug`). Lança em duplicata.
- Testes (`urls.test.ts`), um por AC: produto em `/produtos/:slug`; filha em dois segmentos; raiz em
  um; filha com **pai invisível** degradando; origem com barra final normalizada; `'/'` virando a
  origem nua; `lastmod` presente/ausente; nenhuma query; nenhuma forma legada; ordem determinística
  sobre entrada embaralhada; duplicata lançando.
- **Sensor embutido**: caso que assere que `'/' + slug` para filha **reprova** na mesma régua.
- **Requisitos**: `SMP-02`, `SMP-03`, `SMP-05`, `SMP-06`, `SMP-07`, `SMP-08`, `SMP-12`, `SMP-15`

### T06 — `renderSitemapXml`: URLs → documento

- `core/src/sitemap/render.ts`. Namespace `…/sitemap/0.9`. **Percent-encode e depois `escapeXml`**,
  nessa ordem. Sem `<changefreq>`, sem `<priority>`. Lança em lista vazia.
- `core/src/sitemap/index.ts` (barrel) + `"./sitemap"` em `packages/core/package.json`.
- Testes (`render.test.ts`): bem-formado por **parser de XML de verdade**, não regex; slug sintético
  com `&` e acento provando a ordem do escape (os 680 slugs reais são `[a-z0-9-]`, e sem o sintético
  a regra nasceria não exercitada); ausência de `changefreq`/`priority`; lista vazia lançando;
  `lastmod` em W3C Datetime.
- **Requisitos**: `SMP-01`, `SMP-09`, `SMP-10`, `SMP-13`

---

## Fase 3 — A function, medida antes de ser ligada

### T07 — `handleSitemap` com dependências injetadas

- `supabase/functions/sitemap/handlers.ts`, molde da `google-feed` (`AD-004`): origem ausente ou
  malformada → 503; contagem divergente → 503; zero produtos → 503; serialização lançando → 503;
  sucesso → 200 `application/xml; charset=utf-8` + `Cache-Control`.
- **Nenhum corpo de erro é `<urlset>`** — erro sai em `text/plain`, o único tipo medido atravessando
  o gateway intacto.
- Testes (`__tests__/handlers.test.ts`): os quatro caminhos de 503, a ausência de `<urlset>` em cada
  um, e o `Content-Type` da resposta boa.
- **Requisitos**: `SMP-16`, `SMP-17`, `SMP-18`, `SMP-20`

### T08 — `index.ts` (wiring) e `config.toml`

- `supabase/functions/sitemap/index.ts`: env, client com a **chave publicável** (não service role —
  a visibilidade passa a ser a RLS), `Deno.serve`. Import de `core` por caminho relativo com extensão.
- `supabase/config.toml`: `[functions.sitemap] verify_jwt = false`, com o comentário no molde das
  irmãs.
- **Requisitos**: `SMP-02`, `SMP-03`

### T09 — Medição LOCAL: o Deno resolve, e o XML sai certo

- `supabase functions serve sitemap` contra a instância local; `curl` no endpoint.
- Prova de uma vez: resolução de módulo pelo **Deno** (incluindo o `import type` bare de `core/menu`),
  o documento, e a contagem de **719**.
- **Se o Deno recusar o `import type`**: trocar por tipo estrutural local em `menu.ts` — é tipo, não
  regra. Registrar como `SPEC_DEVIATION`.
- **Requisitos**: `SMP-11`

### T10 — Medição HOSPEDADA: o `Content-Type` que o gateway entrega

- `supabase functions deploy sitemap`. **Aditivo**: enquanto o `vercel.json` não for publicado a
  function não está ligada a rota nenhuma, então nada do que está no ar muda.
- `curl -sD -` direto em `https://<ref>.supabase.co/functions/v1/sitemap` e anotar o `Content-Type`
  **entregue** para `application/xml` — a pergunta que a medição de 2026-08-29 deixou aberta.
- Resultado vai para o `design.md` §1.2 e para o `CLAUDE.md`.
- **Requisitos**: `SMP-01`

---

## Fase 4 — A borda e os guardas

### T11 — `vercel.json`: o `rewrite` e o header

- `rewrites` ganha `/sitemap.xml` → `…/functions/v1/sitemap`, **antes** do catch-all, que continua o
  último. `headers` ganha `Content-Type: application/xml; charset=utf-8` para `/sitemap.xml`.
- **Verificação**: `vercelRedirects.test.ts` **ganha vizinhas** — rewrite presente, apontando para o
  mesmo host das outras duas, antes do catch-all; header com valor exato; contagem de `rewrites`
  (4) e de `headers` (4) como âncoras. Nenhuma asserção existente afrouxada.
- **Requisitos**: `SMP-01`, `SMP-26`

### T12 — A linha `Sitemap:` no `robots.txt` e o guarda dela

- `apps/store/public/robots.txt` ganha **uma** linha `Sitemap:` absoluta.
- Novo `robotsSource.test.ts`: exatamente uma linha `Sitemap:`, absoluta `https`, terminando em
  `/sitemap.xml`; as 5 diretivas `User-agent:` anteriores intactas. **Âncora dupla**: arquivo com
  conteúdo (> 100 bytes) **e** nº de `User-agent:` conferido.
- **Requisitos**: `SMP-21`, `SMP-22`

### T13 — Rota nova precisa ser classificada

- Novo `apps/store/src/app/__tests__/sitemapRoutes.test.ts`: lê `App.tsx` do disco e exige que toda
  rota caia em **exatamente um** de `SITEMAP_STATIC_PATHS`, `NON_INDEXABLE_PATHS`, dinâmicas,
  `LEGACY_REDIRECTS` ou `*`. **Bidirecional** e com **âncora de contagem dupla** (`L-021`).
- A lista de rotas vem do `App.tsx`, **nunca** de `ROUTE_SLUGS` — a régua não pode ser o objeto medido.
- **Verificação**: além de passar, **provar sensibilidade** — uma rota fictícia num scratch reprova.
- **Requisitos**: `SMP-24`, `SMP-25`

---

## Fase 5 — A prova de entrega e a documentação

### T14 — A rotina diária que prova a entrega

- `.github/workflows/sitemap-check.yml`: `schedule` diário + `workflow_dispatch`; sem credencial.
- Confere: `Content-Type` **entregue** contém `xml`; corpo abre em `<?xml` e parseia; contagem de
  `<url>` ≥ âncora; `robots.txt` com **uma** linha `Sitemap:` cujo host é o requisitado; uma `<loc>`
  do documento responde 200.
- A origem é `vars.STORE_PUBLIC_URL` com default para a loja provisória, e o job **pula anunciando**
  se ela não estiver definida.
- **Verificação**: `workflow_dispatch` manual passa; apontado para URL errada, reprova.
- **Requisitos**: `SMP-27`, `SMP-28`, `SMP-29`, `SMP-30`, `SMP-31`

### T15 — Documentação, backlog e decisão

- `apps/store/CLAUDE.md`: seção do sitemap — onde é gerado, por que a chave é a publicável, o que
  prova que está de pé, e o segundo dono da origem (a linha do `robots.txt`) com o passo de cutover.
- `CLAUDE.md` da raiz: guardas novos na tabela, **baselines remedidas na hora**, o resultado da
  medição do `T10`, e a regra de extensão explícita em `core`.
- `.specs/BACKLOG.md`: `BL-007` passa a "sitemap ✓, `BreadcrumbList` em aberto".
- `.specs/STATE.md`: `AD-022` + handoff da `33`.
- **Verificação**: os números batem com a medição do fecho, feita **na hora** — a lição da baseline
  errada da `31`.

### T16 — Gate e prova final

- Cinco suítes por workspace com exit code capturado; `tsc` nos três apps; `pnpm lint`;
  `git diff --name-only` conferindo `packages/core/src/payment/`.
- Prova local: **719** `<url>`, XML válido por parser real, todas as `<loc>` no mesmo host, sem barra
  final e sem `?`; um produto conhecido presente como `/produtos/<slug>` e ausente como
  `/produto/<slug>`; uma subcategoria como `/<pai>/<filha>`.
- **Prova de frescor** (`SMP-14`): criar um produto ativo no banco local, requisitar de novo, ver
  **720** — sem deploy no meio.
- A prova em produção (`curl` contra a loja depois do push) fica registrada como passo de fecho.

---

## Cobertura de requisitos

| Requisito | Task |
| --- | --- |
| SMP-01 | T06, T10, T11 |
| SMP-02 | T05, T08 |
| SMP-03 | T03, T05, T08 |
| SMP-04 | T04 |
| SMP-05 | T05 |
| SMP-06 | T05 |
| SMP-07 | T05 |
| SMP-08 | T05 |
| SMP-09 | T06 |
| SMP-10 | T01, T06 |
| SMP-11 | T09, T16 |
| SMP-12 | T05 |
| SMP-13 | T06 |
| SMP-14 | T16 (prova) — satisfeito por construção pela arquitetura |
| SMP-15 | T05 |
| SMP-16 | T02, T07 |
| SMP-17 | T07 |
| SMP-18 | T07 |
| SMP-19 | T02 |
| SMP-20 | T07 |
| SMP-21 | T12 |
| SMP-22 | T12 |
| SMP-23 | T14 |
| SMP-24 | T04, T13 |
| SMP-25 | T13 |
| SMP-26 | T11 |
| SMP-27 | T14 |
| SMP-28 | T14 |
| SMP-29 | T14 |
| SMP-30 | T14 |
| SMP-31 | T14 |

**Coverage:** 31 total, **31 mapeados**, 0 sem task.
