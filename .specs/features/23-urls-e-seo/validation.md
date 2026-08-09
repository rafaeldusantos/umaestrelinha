# 23 · URLs e SEO — Validation

**Date**: 2026-08-09
**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Tasks**: [`tasks.md`](./tasks.md)
**Verifier**: sub-agente independente (autor ≠ verificador) — não escreveu nenhuma linha desta feature
**Veredito**: **PASS ✅**

---

## Superfície coberta

**Não há commit nenhum.** A convenção do projeto (`CLAUDE.md`) manda commitar só no fim, e os commits
ainda não foram criados — a superfície inteira da feature é a **árvore de trabalho suja**. O que foi
lido: `git status --short` (65 arquivos `M` + 15 entradas `??`), `git diff` para os rastreados, e
leitura direta dos não-rastreados (que `git diff` não mostra).

**Código novo (não rastreado)**

| Arquivo | Papel |
| --- | --- |
| `packages/core/src/routes/{routes.ts,index.ts}` | fonte única do endereçamento |
| `packages/core/src/routes/__tests__/routes.test.ts` | 64 testes do módulo |
| `apps/store/src/entities/category/lib/resolveCategoryRoute.ts` + `__tests__/` | a decisão da página de categoria |
| `apps/store/src/entities/category/api/useCategoryRedirect.ts` + `__tests__/` | leitura de `category_redirects` |
| `apps/store/src/shared/lib/useCanonical.ts` + `__tests__/` | a tag canônica |
| `apps/store/src/shared/lib/__tests__/{reservedSlugs,vercelRedirects}.test.ts` | os dois guardas novos |
| `apps/store/src/app/__tests__/routing.test.tsx` | ranqueamento do React Router |
| `apps/store/src/pages/__tests__/CategoryPage.test.tsx` | 25 testes da página |
| `apps/store/src/widgets/related-products/ui/__tests__/RelatedProducts.test.tsx` | href canônico do "Ver todos" |
| `apps/backoffice/src/features/category-list/model/persistCategoryRedirect.{ts,test.ts}` | escrita do redirect |
| `apps/backoffice/src/features/abandoned-cart-detail/ui/AbandonedCartDetailDialog.test.tsx` | link para a loja |
| `supabase/migrations/20260810120000_category-redirects.sql` | a tabela |

**Modificados (65)** — os principais: `apps/store/src/app/App.tsx`, `pages/{CategoryPage,ProductPage}.tsx`,
`entities/product/api/useProducts.ts`, `apps/store/vercel.json`, `packages/core/src/menu/menu.ts`,
`packages/core/package.json`, `apps/backoffice/src/features/{category-form,category-list,product-form,abandoned-cart-detail}/**`,
`tools/catalog-import/src/{map/category.ts,write/categories.ts,report.ts}`, `CLAUDE.md`, `.specs/{STATE,BACKLOG}.md`.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1–T20 | ✅ Done | Todas verificadas por evidência abaixo. T16/T17 têm probe HTTP reproduzido independentemente pelo Verifier. |

---

## Spec-Anchored Acceptance Criteria

Regra aplicada: **evidência-ou-zero**. Cada critério precisa de `arquivo:linha` **e** da expressão da
asserção; asserção sobre chamada de mock não substitui asserção sobre o estado resultante.

### P1 · As URLs indexadas resolvem

| AC | Desfecho que a spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **1** — `/produtos/<slug>` responde o produto e é a canônica | rota monta `ProductPage`; `<link rel=canonical>` = `/produtos/<slug>` | `apps/store/src/app/__tests__/routing.test.tsx:111` — `expect(screen.getByText('produto:galeria')).toBeInTheDocument()` · `:112` — `expect(window.location.pathname).toBe('/produtos/joia-lua')` · `apps/store/src/pages/__tests__/ProductPage.test.tsx:162` — `expect(canonical()).toBe(\`${window.location.origin}/produtos/botton-sailor-moon\`)` · `packages/core/src/routes/__tests__/routes.test.ts:164` — `expect(productPath('x')).toBe('/produtos/x')` | ✅ PASS |
| **2** — `/produto/<slug>` responde **301** para `/produtos/<slug>` | edge: `statusCode: 301`, destino `/produtos/:slug`; espelho no router navega | `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts:75-76` — `expect(entry.destination).toBe('/produtos/:slug')` + `expect(entry.statusCode).toBe(301)` · `:107` — `expect(Object.prototype.hasOwnProperty.call(entry,'permanent')).toBe(false)` · `routing.test.tsx:118` — `expect(window.location.pathname).toBe('/produtos/joia-lua')` · `packages/core/src/routes/__tests__/routes.test.ts:200` — `expect(LEGACY_REDIRECTS[0]).toEqual({ from: '/produto/:slug', to: '/produtos/:slug' })` | ✅ PASS (medição do status HTTP não é possível — ver *Limites declarados*) |
| **3** — `/<slug>` de categoria **raiz** responde a categoria e é a canônica dela | renderiza; canônica de **um** segmento | `apps/store/src/pages/__tests__/CategoryPage.test.tsx:98-99` — `expect(screen.getByRole('heading',{name:'Joias afetivas'})).toBeInTheDocument()` + `expect(screen.getByText('url:/joias-afetivas')).toBeInTheDocument()` · `:105` — `expect(canonical()).toBe(\`${window.location.origin}/joias-afetivas\`)` · `resolveCategoryRoute.test.ts:39` — `expect(route.canonical).toBe('/joias-afetivas')` | ✅ PASS |
| **3b** — `/<pai>/<filha>` responde e é a canônica; `/<filha>` sozinha responde a **mesma página** apontando canonical para a de dois | dois segmentos ⇒ 200 + canonical própria; um segmento ⇒ **200** (não redirect) + canonical de dois | `CategoryPage.test.tsx:113-115` — `getByText('url:/joias-afetivas/joia-de-leite-materno')` + `expect(canonical()).toBe(…/joias-afetivas/joia-de-leite-materno)` · `:121-124` — `getByText('url:/joia-de-leite-materno')` **e** `expect(canonical()).toBe(…/joias-afetivas/joia-de-leite-materno)` · `resolveCategoryRoute.test.ts:54-58` — `expect(route.kind).toBe('ok')`, `expect(route.kind).not.toBe('redirect')`, `expect(route.canonical).toBe('/joias-afetivas/joia-de-leite-materno')` · `packages/core/src/menu/__tests__/menu.test.ts:131-133` — `expect(href).toBe('/anime/naruto')` + `toHaveLength(2)` + `not.toContain('bottons')` (árvore de 3 níveis) | ✅ PASS |
| **3c** — `/colecao/<slug>` responde **301** para a forma canônica | edge 301 → `/:slug`; espelho no router navega | `vercelRedirects.test.ts:82-83` — `expect(entry.destination).toBe('/:slug')` + `expect(entry.statusCode).toBe(301)` · `:89-90` (idem `/categoria/:slug`) · `routing.test.tsx:127` — `expect(window.location.pathname).toBe('/joias-afetivas')` · `CategoryPage.test.tsx:191,198` — `getByText('url:/joias-afetivas')` | ⚠️ **Spec-precision gap** — ver nota 1 |
| **4** — slug sem correspondência ⇒ **404 própria**, nunca tela branca nem catálogo completo | `<NotFound />`; consulta de catálogo **não** dispara | `CategoryPage.test.tsx:139` — `expect(screen.getByRole('heading',{name:'Essa página não existe.'})).toBeInTheDocument()` · `:145` — `expect(screen.queryByText('Coleção não encontrada')).not.toBeInTheDocument()` · `:169-171` — `for (const [,options] of useProductsMock.mock.calls) expect(options).toEqual({ enabled: false })` · `useProducts.test.tsx:433-437` — `expect(result.current.data).toEqual([])` **e** `expect(catalogoCompletoSpy).not.toHaveBeenCalled()` · `ProductPage.test.tsx:123,132` — 404 própria + "Produto não encontrado" removido · `routing.test.tsx:178,184` — `/a/b/c` e `/nao-existe` na 404 | ✅ PASS |

### P1 · Nome de categoria nunca encobre rota

| AC | Desfecho que a spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **5** — slug reservado **recusado no formulário**, com a lista visível | submit bloqueado, `onSave` não chamado, mensagem contém a lista | **Criação**: `CategoryFormDialog.test.tsx:140` — `expect(screen.getByLabelText('Slug')).toHaveValue('sobre')` (slug derivado do nome) · `:143` — `expect(alerta).toHaveTextContent(reservedSlugRefusal('sobre'))` · `:146-147` — `toHaveTextContent('checkout')` + `('favoritos')` · `:158` — `expect(onSave).not.toHaveBeenCalled()` · `:170` (slug digitado à mão). **Edição**: `CategoryInspector.test.tsx:153-156` — mesma tripla · `:164` — `expect(onSave).not.toHaveBeenCalled()` · `:176` — slug livre grava. **Domínio**: `routes.test.ts:129-151` — a mensagem contém os 16 reservados, um `expect` por elemento | ✅ PASS |
| **6** — rota nova ⇒ um teste **falha** se ela não estiver na lista | comparação **bidirecional** contra o `App.tsx` lido do disco | `apps/store/src/shared/lib/__tests__/reservedSlugs.test.ts:78` — `expect(foraDaLista).toEqual([])` (direção 1) · `:86` — `expect(semRota).toEqual([])` (direção 2) · `:90` — `expect([...staticFirstSegments(APP)].sort()).toEqual([...ROUTE_SLUGS].sort())` · **âncora dupla** `:68-69` — `expect(APP).toContain('<Routes>')` + `expect(declaredPaths(APP).length).toBeGreaterThanOrEqual(15)` · teste negativo `:148-149`. **Provado empiricamente pela MUT13** (rota `/ajuda` real acrescentada ao `App.tsx` ⇒ 2 falhas) | ✅ PASS |

### P2 · Slug que muda não perde a página

| AC | Desfecho que a spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| **7** — slug antigo de **produto** resolve por `product_redirects` | hook devolve o produto atual; página navega para o caminho **novo** | `apps/store/src/entities/product/api/__tests__/useProduct.test.tsx:160-161` — `expect(result.current.data!.slug).toBe('botton-sakura-2026')` + `.id).toBe('prod-1')` · `:164` — caminho normal **não** consulta `product_redirects` · `ProductPage.test.tsx:84` — `expect(screen.getByText('url:/produtos/botton-sailor-moon')).toBeInTheDocument()` · `:94` — os **dois** saltos encadeados (`/produto/<antigo>` → `/produtos/<atual>`) | ✅ PASS |
| **8** — slug antigo de **categoria** resolve por tabela equivalente | tabela nova; leitura só no caminho de exceção; hit ⇒ canônica do destino | **Schema**: `supabase/migrations/20260810120000_category-redirects.sql` + probe HTTP abaixo. **Escrita**: `persistCategoryRedirect.test.ts:60` — `expect(upsert.payload).toEqual([{ from_slug: 'joias-de-leite', category_id: 'cat-1' }])` · `:68` — `toEqual({ onConflict: 'from_slug' })` · `:109` — `expect(del.payload).toEqual({ column: 'from_slug', value: 'joia-de-leite-materno' })` (slug ativo vence o redirect). **Wiring**: `AdminCategoriesPage.test.tsx:277-278` — `expect(upsert.table).toBe('category_redirects')` + `expect(upsert.payload).toEqual([{ from_slug: 'k-pop', category_id: 'kpop' }])`. **Leitura**: `useCategoryRedirect.test.tsx:62-63` — `toHaveBeenCalledWith('category_redirects')` + `toHaveBeenCalledWith('from_slug','joias-de-leite')` · `:77` — `enabled:false` ⇒ `expect(fromMock).not.toHaveBeenCalled()`. **Resolução**: `CategoryPage.test.tsx:228` — `getByText('url:/joias-afetivas/joia-de-leite-materno')` (canônica de dois) · `:237` — raiz sai com um · `:249-250` — sem laço · `:258` — destino apagado ⇒ 404 | ✅ PASS |

**Status**: **8/8 ACs cobertas com desfecho batendo · 1 spec-precision gap flagrado (AC 3c)**

### Nota 1 — o spec-precision gap da AC 3c

A AC 3c diz "SHALL responder **301** para a forma canônica". Para uma **subcategoria**, o 301 do edge
leva a `/<filha>` — que **não é a canônica dela** (a canônica tem dois segmentos). A divergência é
**deliberada e declarada em três lugares**: `design.md` ("Destino do 301 de categoria: **um segmento**
— o edge não conhece a árvore"), `AD-018` ("a forma de um segmento resolve e aponta canonical para a
de dois") e o próprio bloco *Decisões do usuário — 2026-08-09* da `spec.md`, item 2. O efeito líquido
respeita o Goal ("uma URL canônica por conteúdo"): o legado chega ao conteúdo em **um** salto e recebe
a canônica na mesma resposta. **Não é defeito — é a AC que ficou menos precisa que a decisão que a
governa.** Registrado, não passado em silêncio.

---

## Requisitos — rastreabilidade conferida

| ID | Onde fecha | Result |
| --- | --- | --- |
| `URL-01` | `productPath` + rota + `useCanonical` + varredura de links | ✅ Verified |
| `URL-02` | `LEGACY_REDIRECTS` → `vercel.json` (301, sem `permanent`) + espelho no router | ✅ Verified (config, não implantação) |
| `URL-03` | `/:slug`, `/:parentSlug/:slug`, `resolveCategoryRoute` (6 regras, 1 teste por linha), `categoryHref` | ✅ Verified |
| `URL-04` | `NotFound` nas duas páginas + `enabled` + slug desconhecido ⇒ `[]` | ✅ Verified |
| `URL-05` | `reservedSlugRefusal` nas **duas** superfícies do backoffice | ✅ Verified |
| `URL-06` | `reservedSlugs.test.ts` bidirecional, lendo o `App.tsx` do disco | ✅ Verified |
| `SEO-01` | `product_redirects` + caminho novo | ✅ Verified |
| `SEO-02` | migration + `persistCategoryRedirect` + `useCategoryRedirect` + resolver | ✅ Verified |

---

## Discrimination Sensor

**Profundidade**: P0-full (13 mutações — o endereçamento é caminho de receita: URL quebrada é venda
perdida). Cada mutação foi aplicada **uma de cada vez**, a suíte relevante rodou, e a edição foi
**revertida byte-exato a partir de cópia em scratchpad** (`git stash` foi evitado de propósito: aqui
ele carregaria a feature inteira).

| # | Alvo | Falha injetada | Suíte | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `packages/core/src/routes/routes.ts:32` | remove `'conta'` de `ROUTE_SLUGS` | core `routes` **8 falhas** · store `reservedSlugs` **2 falhas** | ✅ Killed |
| 2 | `routes.ts:107` | `{'/colecao/:slug' → '/produtos/:slug'}` (destino invertido) | core **2** · store `vercelRedirects`+`routing`+`CategoryPage` **3** | ✅ Killed |
| 3 | `routes.ts:73` | `reservedSlugRefusal` devolve sempre `null` | core **3** · backoffice `CategoryFormDialog`+`CategoryInspector` **5** | ✅ Killed |
| 4 | `resolveCategoryRoute.ts:61` | pai errado deixa de devolver `redirect` (vira `ok`) | store **3 falhas** | ✅ Killed |
| 5 | `resolveCategoryRoute.ts:57` | canônica da filha vira de **um** segmento | store **7 falhas** | ✅ Killed |
| 6 | `CategoryPage.tsx:146-148` | remove a guarda de carregamento (404 volta a piscar) | store `CategoryPage` **2 falhas** | ✅ Killed |
| 7 | `useCanonical.ts:33-35` | não remove a tag no unmount | store `useCanonical` **2 falhas** | ✅ Killed |
| 8 | `apps/store/vercel.json:10` | `statusCode: 301` → `permanent: true` | store `vercelRedirects` **2 falhas** | ✅ Killed |
| 9 | `useProducts.ts:65` | slug desconhecido volta a devolver o catálogo inteiro | store `useProducts` **1 falha** | ✅ Killed |
| 10 | `tools/catalog-import/src/map/category.ts` | move `32697621` de `CURATED_EXCLUDED` para `CURATED_INACTIVE` | catalog-import **14 falhas em 3 arquivos** | ✅ Killed |
| 11 | `CategoryPage.tsx:86` | `enabled` do redirect vira `true` (consulta em toda abertura) | store `CategoryPage` **2 falhas** | ✅ Killed |
| 12 | `CategoryPage.tsx:136` | prop `legacy` deixa de navegar | store `CategoryPage`+`routing` **5 falhas** | ✅ Killed |
| 13 | `apps/store/src/app/App.tsx` | acrescenta `<Route path="/ajuda">`, fora de `ROUTE_SLUGS` — **a AC 6 na direção que ela enuncia** | store `reservedSlugs` **2 falhas** | ✅ Killed |

**Resultado: 13/13 mortas · 0 sobreviventes.**

**Árvore restaurada e provada**: `md5sum` dos 8 arquivos tocados comparado contra o baseline tirado
antes da primeira mutação — `diff` vazio. `git status --short` volta a listar exatamente os mesmos
arquivos do início, mais este `validation.md`.

---

## Gate Check — números medidos pelo Verifier

| Gate | Comando | Resultado medido | Baseline / declarado | Veredito |
| --- | --- | --- | --- | --- |
| Testes | `npx turbo run test --force`, exit code capturado em arquivo (**nunca** por `\| tail`) | **EXIT_CODE=0** · **3.672 testes em 211 arquivos** · store **1256/98** · backoffice **1090/67** · core **799/27** · functions **258/4** · catalog-import **269/15** | declarado 3.672/211 com a mesma quebra | ✅ **bate exatamente** |
| Lint | `npx turbo run lint` | backoffice **28 erros / 7 warnings** · store **2 erros / 1 warning** = **30 / 8** | baseline 30/8 | ✅ **zero erro novo** |
| Tipos | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | exit **0** | 0 | ✅ |
| Tipos | `… -p apps/backoffice/tsconfig.app.json` | exit **0** | 0 | ✅ |
| Tipos | `… -p tools/catalog-import/tsconfig.json` | exit **0** | 0 | ✅ |
| Dinheiro | `git status --short packages/core/src/payment/` | **saída vazia** · `git diff --stat` vazio | intocado | ✅ |

**Integridade de contagem**: 3.445 → 3.672 (**+227**). Nenhuma queda; nenhum teste apagado. O
crescimento de `core` (725 → **799**) vem de `routes/` (64) e de `categoryHref` — o `design.md` previa
exatamente isso, e `packages/core/src/payment/**` não mudou de resultado.

---

## Probes HTTP (`AD-012` — a prova de que grava é gravar)

### T16 — `category_redirects`, RLS

**Rodado pelo Verifier**, contra o Supabase local (`http://127.0.0.1:54341`), com limpeza ao fim.
Transcrição literal:

```
== 1. estado inicial (service role) ==
GET /rest/v1/category_redirects?select=*            → []              HTTP 200

== 2. categoria real para a FK ==
GET /rest/v1/categories?select=id,slug&limit=1
   → [{"id":"d6315b26-f3c1-47ba-ab8f-e8d7369cb31d","slug":"pulseiras1"}]   HTTP 200

== A. insert com SERVICE ROLE ==
POST /rest/v1/category_redirects
   {"from_slug":"__verifier-probe-23","category_id":"d6315b26-…"}
   → [{"from_slug":"__verifier-probe-23","category_id":"d6315b26-…",
       "created_at":"2026-08-09T17:44:31.475195+00:00"}]                    HTTP 201

== B. select ANÔNIMO (a loja resolve sem sessão) ==
GET /rest/v1/category_redirects?select=from_slug,category_id&from_slug=eq.__verifier-probe-23
   → [{"from_slug":"__verifier-probe-23","category_id":"d6315b26-…"}]       HTTP 200

== C. insert ANÔNIMO deve ser recusado ==
POST /rest/v1/category_redirects  (apikey anônima)
   → {"code":"42501","message":"new row violates row-level security policy
      for table \"category_redirects\""}                                    HTTP 401

== D. limpeza ==
DELETE /rest/v1/category_redirects?from_slug=eq.__verifier-probe-23         HTTP 204

== E. estado final ==
GET /rest/v1/category_redirects?select=*            → []              HTTP 200
```

Confere com o registrado no `STATE.md` (201 / 200 / 401+42501). **Banco restaurado**: tabela vazia,
**37 categorias** confirmadas por `Prefer: count=exact` → `content-range: 0-0/37`, batendo com a
documentação de `CURATED_EXCLUDED` (39 → 37).

### T17 — o caminho do admin

O `STATE.md` registra o fluxo real medido pelo implementador (login → `PATCH` do slug → `DELETE` do
conflito → `upsert` do slug antigo, fechando em **200 / 204 / 201**, com a loja anônima lendo a
linha). **A transcrição verbatim desse fluxo não está registrada em lugar nenhum do repositório** — o
que existe é o resumo do `STATE.md`. O Verifier **não a reproduziu** (exigiria sessão de admin e
escrita real na tabela de categorias do catálogo em produção local) e **não a inventa**. A cobertura
equivalente em teste existe e é forte: `AdminCategoriesPage.test.tsx:277-278` prova a linha exata que
a tela manda, com `slug` propositalmente diferente do `id` na fixture para que trocar `from_slug` por
`category_id` não passe.

### Migration aplicada por `migration up`, e não por `db reset` — risco avaliado

`SPEC_DEVIATION` do Lote 3. **Risco residual: baixo**, por três razões conferidas:

1. `20260810120000_category-redirects.sql` é **a última** de `supabase/migrations` (conferido por
   `ls`) — replay do zero e aplicação por cima produzem o mesmo estado para ela.
2. O SQL é **idempotente** de ponta a ponta: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
   `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`.
3. As duas dependências (`public.categories`, `public.has_role`) são de migrations anteriores e já
   sustentam as policies de `product_redirects`.

O motivo de não ter rodado `db reset` é legítimo e está declarado: apagaria 689 produtos e 3.660
imagens do Storage.

---

## Ceticismo dirigido — o que foi conferido linha a linha

| Ponto | Achado |
| --- | --- |
| **`SPEC_DEVIATION` — `legacy` navega incondicionalmente** | ✅ **Marcado no código**: `apps/store/src/pages/CategoryPage.tsx:52-57`, com o raciocínio. **Sustenta-se**: o edge redireciona sem conhecer a árvore, então condicionar a navegação a `kind === 'ok'` faria a 404 aparecer sob a URL legada em dev e sob a nova em produção — divergência exatamente no caso errado. Coberto por `CategoryPage.test.tsx:201-206` (`/colecao/nao-existe` salta **e** cai na 404 do destino). |
| **`SPEC_DEVIATION` — `legacyRedirectTo` nasceu em `routes.ts`** | ⚠️ **NÃO há marcador `// SPEC_DEVIATION` no código** — é o único dos declarados sem marca. `grep -rn "SPEC_DEVIATION"` acha **um só** hit da feature 23 (o do `CategoryPage`). A função está documentada em `routes.ts:111-117` e listada no contrato do `STATE.md:385`, então é rastreável; mas o `design.md` enumera a interface do módulo **sem** ela. Lacuna de marcação, não de comportamento (a função tem 5 testes: `routes.test.ts:212-232`, incluindo prefixo legado sem slug ⇒ `null`). |
| **`SPEC_DEVIATION` — `CategoryTable` corrigido além do `Where` da T14** | ✅ **Tem teste**: `CategoryTable.test.tsx:131-148` — `expect(screen.getByText('/anime')).toBeInTheDocument()` + `expect(screen.getByText('/anime/sailor')).toBeInTheDocument()` + `expect(screen.queryByText(/\/categoria\//)).not.toBeInTheDocument()`. E a varredura de disco em `CategoryInspector.test.tsx:216-245` inclui `CategoryTable.tsx` na **âncora dupla** (`files.length > 100` **e** os dois arquivos-alvo encontrados por nome). |
| **`routing.test.tsx` — harness alterado** | ⚠️ **Não há diff a ler**: o arquivo é **não-rastreado** (`??`), então nenhuma baseline existe para comparar. Lido **integralmente**: o dublê novo (`useCategoryRedirect → { data: undefined, isFetching: false }`, linhas 28-30) é irmão dos dois dublês de dado que já estavam lá (`useCategories`, `useProduct`) e traz o comentário explicando por quê. **Nenhuma asserção deste arquivo é fraca**: todas medem URL final (`window.location.pathname`) ou conteúdo renderizado — nenhuma mede "o hook foi chamado". O caminho real do `SEO-02`, que o dublê apaga aqui, tem prova própria e forte em `CategoryPage.test.tsx` (7 testes) e `useCategoryRedirect.test.tsx` (5). Método aceitável; a **impossibilidade de diff** fica declarada. |
| **`useProducts.test.tsx` — valor esperado invertido** | ✅ **A spec manda, e a asserção ficou MAIS FORTE.** `URL-04` diz literalmente "nunca tela branca nem listagem completa do catálogo". O teste antigo asseria `toHaveLength(1)` (catálogo); o novo assere **duas** coisas: `expect(result.current.data).toEqual([])` **e** `expect(catalogoCompletoSpy).not.toHaveBeenCalled()` — o resultado vazio sozinho não distinguiria "não buscou" de "buscou e filtrou". Ganhou também 3 testes de `enabled` e 1 de regressão (`useProducts()` sem slug **continua** trazendo tudo). Provado pela MUT9. |
| **`packages/core/src/payment/**`** | ✅ `git status --short` e `git diff --stat` do diretório saem **vazios**. Nenhum teste de dinheiro mudou de resultado. |
| **Âncora dupla nos guardas de disco** | ✅ `vercelRedirects.test.ts:52-54` (arquivo > 100 chars **e** `framework === 'vite'`) + `:60,64` (nº de redirects = `LEGACY_REDIRECTS.length` **e** `LEGACY_REDIRECTS.length === 3` escrito à mão — impede a régua de encolher junto). `reservedSlugs.test.ts:68-69` (`<Routes>` presente **e** ≥ 15 `path=`) + `:104-110` (`INFRA_SLUGS` iterado por literal, não pela constante). `routes.test.ts:19` declara a regra e assere as 3 listas elemento a elemento com literais. **A régua nunca é o objeto medido**: os dois guardas montam o caminho do arquivo por extenso (`join(ROOT,'apps/store/vercel.json')`, `join(ROOT,'apps/store/src/app/App.tsx')`). |

---

## Edge Cases (do `spec.md` / `design.md`)

- [x] `/x` não é categoria nem redirect ⇒ `NotFound` — `CategoryPage.test.tsx:139`
- [x] `/x` com a consulta correndo ⇒ `aria-busy`, 404 **não** pisca — `:159-160` e `:275-276`
- [x] `/pai-errado/filha` ⇒ redirect para a canônica — `:130`, `resolveCategoryRoute.test.ts:86`
- [x] categoria **raiz** aberta com um pai qualquer ⇒ redirect — `resolveCategoryRoute.test.ts:98`
- [x] `/colecao/x` em dev ⇒ `Navigate replace` — `:191`; inclusive com slug inexistente — `:204`
- [x] slug reservado no cadastro ⇒ save bloqueado nas duas telas — `URL-05` acima
- [x] redirect apontando para categoria apagada/inativa ⇒ `notfound`, nunca salto vazio — `:258`, `resolveCategoryRoute.test.ts:135`
- [x] redirect não entra em laço — `:249-250`
- [x] `slug` vazio e árvore vazia ⇒ `notfound` sem lançar — `resolveCategoryRoute.test.ts:152-158`
- [x] árvore de **3 níveis** ⇒ canônica ainda de 2 segmentos — `menu.test.ts:131-133`
- [x] `id` inexistente em `categoryHref` ⇒ `/` sem lançar — `menu.test.ts:137-138`
- [x] pai ausente da lista ⇒ forma de um segmento — `menu.test.ts:143`
- [x] segmento estático vence dinâmico (`/conta`, `/busca`, `/pedido/abc`) — `routing.test.tsx:156,163,170`
- [x] `/checkout` fora do `StoreLayout` — `routing.test.tsx:193`
- [x] filha de categoria excluída viraria raiz ⇒ **asserido na fixture**, não assumido — `catalog-import/src/map/__tests__/category.test.ts`

---

## Code Quality

| Princípio | Status | Nota |
| --- | --- | --- |
| Código mínimo | ✅ | `routes.ts` tem 8 exports, todos consumidos por ≥ 2 pontos. |
| Mudanças cirúrgicas | ✅ | As varreduras de `/produto/`/`/colecao/` são substituição mecânica pelo construtor único; provado por grep. |
| Sem scope creep | ⚠️ aceitável | Dois defeitos pré-existentes foram corrigidos de carona (`AbandonedCartDetailDialog` apontando para rota inexistente do painel; `CategoryTable` com prefixo mentiroso). Ambos estavam **no caminho da varredura**, ambos ganharam teste. `design.md` previa o primeiro; o segundo está marcado como deviation e coberto. |
| Segue os padrões do projeto | ✅ | Guardas de disco no molde de `navItems.test.ts`/`palette.test.ts`; veredito `string \| null` e discriminante de string, como manda o `CLAUDE.md` sob `strictNullChecks: false`. |
| Testes mapeiam ACs, não são rasos | ✅ | Uma linha da tabela de regras do `design.md` = um teste. Asserções sobre `<head>`, URL final e DOM — não sobre chamada de hook, exceto onde o que se mede **é** o não-disparo da consulta (e aí a asserção é sobre `options`, com o dublê respeitando `enabled` — `CategoryPage.test.tsx:71-77`). |
| Sem teste órfão | ✅ | Todo teste novo cita `URL-0x`/`SEO-0x`/`AD-018` ou uma decisão do usuário registrada. |
| Guidelines documentadas seguidas | ✅ | `CLAUDE.md` (*Os guardas*, âncora dupla, `strictNullChecks`, mobile-first, commits no fim), `AD-012`, `AD-014`, `AD-017`, `AD-018`. |

---

## Limites declarados (não escondidos)

1. **Os 301 não foram medidos contra HTTP.** Não há projeto Vercel da Uma Estrelinha (`C-08`). O que
   está provado é a **configuração** (`vercel.json` lido do disco, preso a `LEGACY_REDIRECTS`) e o
   **espelho no router** (que é `<Navigate replace>` client-side, **não** um 301). `curl -I` contra
   produção é operação de cutover.
2. **A tag canônica é injetada por JS**, e o Success Criteria da spec pedia `curl` + `canonical`. A
   medição foi partida: a canônica se prova no **DOM renderizado** (`useCanonical.test.tsx`,
   `CategoryPage.test.tsx`, `ProductPage.test.tsx` — sempre lendo `document.head`), nunca por `curl`.
   Navegador headless contra `vite preview` **não foi executado** nesta validação; a cobertura em
   jsdom mede o mesmo contrato (a tag existe, é única, tem o href absoluto certo, e some no unmount).
3. **T17 sem transcrição verbatim** no repositório — ver acima.

---

## Lacunas ranqueadas (nenhuma bloqueia)

1. **Minor — `legacyRedirectTo` sem `// SPEC_DEVIATION`.** É o único dos desvios declarados que não
   tem marca no código. Correção de 2 linhas em `packages/core/src/routes/routes.ts:111`, ou uma
   linha em `design.md` acrescentando a função à interface do módulo. Comportamento **não** é afetado.
2. **Minor — AC 3c menos precisa que a decisão que a governa** (nota 1). Vale emendar a redação da AC
   para "301 para a forma que resolve, que declara a canônica" antes de a spec virar referência.
3. **Cosmetic — o `Done when` da T2** diz "zero `/colecao/` em `packages/core/src`", mas
   `routes.ts:107` **precisa** conter `/colecao/:slug`: é o dado do redirect legado. A intenção
   (`menu.ts` sem o literal) está cumprida — `packages/core/src/menu/` tem zero ocorrências.
4. **Declarado, não gap — prova em navegador headless** da canônica contra `vite preview` continua
   pendente, junto com `curl -I` contra produção. Ambos são cutover (`C-08`).

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored**: 8/8 ACs com desfecho batendo · 1 spec-precision gap flagrado (AC 3c, deliberado e
triplamente documentado)
**Sensor**: 13/13 mutações mortas, 0 sobreviventes — árvore restaurada byte-exato
**Gate**: 3.672 testes / 211 arquivos, exit 0 · lint 30/8 (baseline exata) · tipos 0·0·0 ·
`packages/core/src/payment/` intocado
**Probe**: `category_redirects` reproduzida pelo Verifier — 201 / 200 / 401+42501 / 204, banco restaurado

**O que funciona**: toda URL indexada resolve (produto, categoria raiz, subcategoria nas duas formas);
uma canônica por conteúdo, com a tag removida no unmount; 404 própria nas duas páginas de catálogo,
sem baixar o catálogo para mostrá-la; slug reservado recusado nas duas superfícies do cadastro, com a
lista visível; guarda bidirecional entre `App.tsx` e `ROUTE_SLUGS` que **prova pegar** (MUT13);
`vercel.json` preso a `LEGACY_REDIRECTS` com âncora dupla; redirect de slug antigo de categoria
gravando e resolvendo, com precedência categoria-viva-vence-redirect nas duas pontas.

**Next steps**: criar os commits da feature (convenção do projeto: de uma vez, no fim) e, depois,
`BL-007` — sitemap e dados estruturados, que a spec pôs fora de escopo até o endereçamento fechar.
Opcionalmente, resolver as duas lacunas *Minor* acima, que são de marcação e redação.

---

## Adendo do orquestrador — 2026-08-09, depois do veredito

O Verifier passou e deixou três lacunas menores mais uma pendência de método. As quatro foram
fechadas aqui, e nenhuma delas tocou comportamento.

### 1–3 · As lacunas menores, resolvidas

| # | O que era | O que foi feito |
| --- | --- | --- |
| 1 | `legacyRedirectTo` era o único desvio declarado **sem marca no código** | `// SPEC_DEVIATION` + `Reason` acrescentados em `packages/core/src/routes/routes.ts`. O motivo registrado é o do projeto: três consumidores escrevendo `.replace(':slug', …)` cada um seriam três donos da mesma regra |
| 2 | **AC 3c dizia "301 para a forma canônica"**, o que só é literalmente verdade para categoria raiz | A AC foi reescrita para "301 para `/<slug>`", com a nota do porquê: **o 301 mora no edge, e o edge não conhece a árvore**. A AC era menos precisa que `AD-018`; passou a acompanhá-la |
| 3 | `Done when` da T2 proibia `/colecao/` em `packages/core/src` inteiro — o que proibiria a própria entrega | Critério corrigido para `packages/core/src/menu`, com a exceção de `routes/` declarada: lá a forma legada é **dado** (`LEGACY_REDIRECTS`), não regra reescrita à mão |

### 4 · A prova em navegador headless — executada

`vite build` (exit 0) + `vite preview` em `:4173`, com o Supabase local servindo o **catálogo real**.
Chromium via `playwright-cli`, lendo `document.head` do DOM **renderizado** — que é o que `curl` não
consegue ver, e por isso a medição foi partida em duas desde o design.

Rodado em **390×844** e repetido em **1440×900**; a coluna `overflow-x` é a régua do `CLAUDE.md` de
que o body nunca rola na horizontal.

| URL pedida | URL final | `<link rel=canonical>` | `<h1>` | overflow-x |
| --- | --- | --- | --- | ---: |
| `/produtos/colar-com-letra1` | `/produtos/colar-com-letra1` | `/produtos/colar-com-letra1` | Colar com letra Grande | 0 |
| `/produto/colar-com-letra1` | **`/produtos/colar-com-letra1`** | `/produtos/colar-com-letra1` | Colar com letra Grande | 0 |
| `/joias-afetivas` (raiz) | `/joias-afetivas` | `/joias-afetivas` | Joias afetivas | 0 |
| `/joia-de-leite-materno` (filha, 1 segmento) | `/joia-de-leite-materno` — **200, sem salto** | **`/joias-afetivas/joia-de-leite-materno`** | Linha Leite Materno | 0 |
| `/joias-afetivas/joia-de-leite-materno` | idem | idem | Linha Leite Materno | 0 |
| `/colecao/joias-afetivas` | **`/joias-afetivas`** | `/joias-afetivas` | Joias afetivas | 0 |
| `/categoria/joias-afetivas` | **`/joias-afetivas`** | `/joias-afetivas` | Joias afetivas | 0 |
| `/joias-e-acessorios/pets` (pai errado) | **`/personalizados/pets`** | `/personalizados/pets` | Pets | 0 |
| `/conta` (rota reservada) | `/conta` | *nenhuma* | *nenhum* — `AccountPage` com overlay de auth (`role=dialog`) | 0 |
| `/nao-existe-mesmo` | `/nao-existe-mesmo` | *nenhuma* | **Essa página não existe.** | 0 |

Quatro leituras que valem mais que as outras:

- **A linha 4 é a `AD-018` em pé.** A filha aberta por um segmento **responde 200 e não salta** — e
  declara canônica de dois segmentos. Era a decisão mais fácil de implementar errado (como redirect),
  e o navegador mostra que não foi.
- **A linha 9 é a armadilha do `AD-018` desarmada.** `/conta` monta a página de conta, não a de
  categoria. O ranqueamento por especificidade do React Router é comportamento observado, não
  suposição de leitura de documentação.
- **A 404 não declara canônica.** Página que não existe não tem endereço preferido a informar.
- **`overflow-x = 0` em todas, nos dois viewports.** Nenhuma rota nova estoura a largura no celular,
  que é 90% do acesso.

**O que segue sem medição, e é declarado**: o **301 de verdade**, com `curl -I`. Não existe projeto
Vercel da Uma Estrelinha (`C-08`), e `vite preview` não aplica `vercel.json`. O que está provado é a
**configuração**, presa a `LEGACY_REDIRECTS` por guarda que lê o arquivo do disco, mais o **espelho
client-side**, que é o que a tabela acima mede. A virada de DNS é operação, e é lá que o `curl -I`
fecha.
