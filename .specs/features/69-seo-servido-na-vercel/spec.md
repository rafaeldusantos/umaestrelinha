# 69 — O `<head>` servido de dentro da Vercel: produto com cache, categoria e páginas fixas com título no HTML, 404 de verdade e imagens no sitemap

## Problem Statement

A loja vai assumir `umaestrelinha.com.br`, onde o Google tem **547 páginas indexadas** (Search
Console, 19/10/2026) e o Google Imagens indexou **3.739 fotos** do sitemap da Nuvemshop. Medido em
19/10/2026 contra `umaestrelinha-store-five.vercel.app`, quatro coisas fazem a loja nova chegar ao
domínio em desvantagem:

1. **A página de produto não é cacheada.** `/produtos/:slug` é um `rewrite` para a edge function
   `product-page` em `*.supabase.co`, e a Vercel não guarda em cache proxy para host externo: três
   batidas seguidas, três `X-Vercel-Cache: MISS`, **TTFB de 1,5 a 2,2 s** contra 0,2–0,3 s da
   Nuvemshop. É a condição de revisão que a `AD-020` escreveu e que o `BL-017` registrou.
2. **Categoria e páginas fixas chegam com o `<head>` da home.** O HTML servido de
   `/joias-afetivas/joia-afetiva-linha-pet` traz o `<title>` da home e nenhuma canônica; o certo só
   aparece depois do JavaScript. O WhatsApp e o Facebook não executam JavaScript e mostram a prévia
   da home; o Google só vê o certo na segunda etapa de renderização.
3. **Não existe 404.** O catch-all do SPA responde **200** para qualquer endereço —
   `/produtos/inexistente-xyz` e `/qualquer-coisa-xyz` inclusive —, e o `noindex` da tela "Essa
   página não existe" é posto por JavaScript. O Google trata isso como *soft 404*.
4. **O sitemap novo não declara imagem nenhuma.** A Nuvemshop declara as fotos de cada produto com
   `<image:image>`; a loja nova, zero.

## Goals

- [ ] Página de produto servida com `X-Vercel-Cache: HIT` na segunda batida e TTFB abaixo de 300 ms
      no acerto de cache, medido no deploy.
- [ ] Toda categoria ativa e toda página fixa indexável chegam com `<title>`, descrição, canônica e
      Open Graph corretos **no HTML servido**, sem depender de JavaScript.
- [ ] Endereço inexistente responde **status 404**; categoria inativa responde **301** para a
      categoria ativa mais próxima.
- [ ] O sitemap declara as fotos de cada produto.

## Out of Scope

| Item | Razão |
| --- | --- |
| Os 301 das 13 URLs da Nuvemshop sem destino (`BL-018`) | São decisão de conteúdo da dona, um a um; a `69` cria o 404 que eles evitam, não o destino deles |
| Reimportar os 25 produtos que existem só na Nuvemshop | Operação do importador, não código |
| Apagar a edge function `product-page` do projeto hospedado | Remoção em produção se ordena pelo publicado: só depois de o deploy desta feature estar no ar e conferido. Registrado como passo de operação |
| `<head>` servido da home | O `index.html` já declara título e descrição da home; o título editável em `store_settings.seo` continua sendo aplicado no cliente |
| `<head>` servido das rotas não indexáveis (`/carrinho`, `/conta`, `/checkout`, `/busca`, `/pedido/*`, `/entrar`, `/favoritos`) | Não são indexadas e não são compartilhadas; continuam com `noindex` no cliente |
| Dados estruturados de categoria (`BreadcrumbList`, `ItemList`) | Ganho separado; a `36` segue com só `spec.md` |
| Imagens das páginas de opção (`?variant=`) no sitemap | A foto é a mesma da peça; declará-la duas vezes não acrescenta nada ao Google Imagens |
| Avisar o Google de URL com conteúdo novo (`lastmod` de imagem, IndexNow) | Fora do pedido |

---

## Assumptions & Open Questions

| Decisão | Escolha | Razão | Confirmado? |
| --- | --- | --- | --- |
| Produto inativo ou inexistente | **404** com a tela "Essa página não existe" | Decisão do usuário (2026-10-19) | sim |
| Categoria inativa | **301 para a categoria ativa mais próxima acima dela**; categoria raiz inativa (ou sem ancestral ativo) ⇒ **301 para `/`** | Decisão do usuário (2026-10-19). Um salto só, nunca cadeia | sim |
| Atraso máximo entre editar preço/estoque no painel e a página do produto mostrar | **5 minutos** (`s-maxage=300`) | Decisão do usuário (2026-10-19) | sim |
| Páginas fixas indexáveis no escopo | **Sim**: as rotas de `SITEMAP_STATIC_PATHS` que não são produto, categoria nem a home | Decisão do usuário (2026-10-19) | sim |
| Conteúdo velho servido quando o banco falha | Servir a última versão cacheada é **permitido** além dos 5 min, só enquanto a origem estiver falhando | Resiliência vale mais que frescor quando a alternativa é erro; fora de falha, vale o teto de 5 min | não — assumido |
| Leitura de categoria inativa | A função **não pode** usar a chave de serviço (`chaveDeServidorForaDoNavegador.test.ts`), e a leitura pública só vê `active = true`. O design escolhe a via (ex.: RPC `security definer` que devolve só o caminho de destino) | Restrição existente, não escolha nova | não — design decide |
| Subcategoria aberta por um segmento só (`/aco-inoxidavel`) | Responde **200** com a canônica de dois segmentos, como a SPA já faz (`AD-018`, `useCanonical`) | Mudar para 301 seria mudança de comportamento fora do pedido | não — assumido |
| Origem das URLs absolutas no `<head>` servido | A mesma origem que o sitemap e o feed usam (`STORE_PUBLIC_URL`); divergir disso é defeito | `sitemap-check.yml` já reprova canônica de outra origem (SVR-41) | não — assumido |
| Qual URL de imagem vai no sitemap | A primeira é **byte a byte** o `og:image` servido da página; as demais seguem a mesma forma, na ordem de `products.images` | Duas URLs para a mesma foto seriam dois donos | não — assumido |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Página de produto rápida e servida pela própria loja ⭐ MVP

**User Story**: Como cliente no celular, quero que a página do produto abra rápido; como Google e
Merchant Center, quero ler o preço, a canônica e o JSON-LD no HTML sem depender de um serviço de
terceiro.

**Why P1**: É o tipo de página de 508 das 547 indexadas, e toda visita paga hoje 1,5–2,2 s antes do
primeiro byte.

**Acceptance Criteria**:

1. WHEN `/produtos/:slug` de um produto ativo é pedido THEN a resposta SHALL ser **200**, com
   `Content-Type: text/html; charset=utf-8`, e o `<head>` SHALL conter exatamente o que a `product-page`
   produz hoje para o mesmo produto: `<title>`, descrição, canônica, Open Graph, Twitter card e o
   JSON-LD `Product`/`ProductGroup` saídos de `productHead`/`productJsonLd` (`AD-020`, `AD-052`).
2. WHEN a resposta é servida THEN ela SHALL vir de código **dentro do deploy da loja na Vercel**, e o
   `vercel.json` SHALL deixar de ter `rewrite` para `*.supabase.co` em `/produtos/:slug`.
3. WHEN a resposta de produto é servida THEN ela SHALL declarar cache de borda com **`s-maxage=300`**,
   e a segunda batida na mesma URL dentro desse intervalo SHALL vir com `X-Vercel-Cache: HIT`.
4. WHEN o shell (`index.html`) usado para montar a página é lido THEN ele SHALL ser o do **mesmo
   build** do deploy que responde — nunca buscado por HTTP de outro deploy.
5. WHEN `?variant=` aponta uma opção indexável THEN o `<head>` SHALL ser o da opção (canônica com
   `?variant=`, título da opção), igual ao que a `product-page` serve hoje (SVR-*). WHEN aponta id
   desconhecido, inativo ou não indexável THEN SHALL servir o `<head>` da peça com status 200.
6. WHEN a leitura do produto no banco falha (erro, timeout) THEN a resposta SHALL ser o shell intacto
   com **200** (a SPA resolve) e SHALL NOT ser cacheada por 300 s.

**Independent Test**: `curl -sD -` duas vezes no mesmo produto do deploy: 200, `text/html`, JSON-LD no
corpo, canônica em `umaestrelinha.com.br`, segunda batida `HIT`.

---

### P1: 404 de verdade ⭐ MVP

**User Story**: Como Google, quero receber 404 em endereço que não existe, para tirá-lo do índice
sem classificar a loja com *soft 404*.

**Why P1**: A troca de DNS vai expor a loja nova a URLs antigas e digitadas errado; 200 para tudo
transforma cada uma em página duplicada da home.

**Acceptance Criteria**:

1. WHEN `/produtos/:slug` aponta produto inexistente **ou** com `is_active = false` THEN a resposta
   SHALL ser **404**, com o corpo do shell (a SPA desenha "Essa página não existe") e
   `<meta name="robots" content="noindex">` **no HTML servido**.
2. WHEN `/:slug` ou `/:pai/:filha` não corresponde a nenhuma categoria (ativa ou inativa) nem a rota
   fixa THEN a resposta SHALL ser **404** com o mesmo corpo e o mesmo `noindex`.
3. WHEN o caminho tem três ou mais segmentos e não é rota declarada THEN a resposta SHALL ser **404**.
4. WHEN o caminho é uma rota fixa declarada no `App.tsx` (`/carrinho`, `/conta`, `/pedido/:id`,
   `/checkout`, `/sobre`…) THEN a resposta SHALL continuar **200**.
5. WHEN o caminho é um redirect de `LEGACY_REDIRECTS` (`/produto/:slug`, `/colecao/:slug`,
   `/categoria/:slug`, `/como-enviar-o-material`) THEN ele SHALL continuar **301** para o destino de
   hoje.
6. WHEN a resposta é 404 THEN ela SHALL ter cache de borda **mais curto** que a de 200 (no máximo
   60 s), para um produto recém-cadastrado não ficar 5 min invisível.
7. WHEN a leitura do banco falha ao decidir se a categoria existe THEN a resposta SHALL ser o shell
   com **200**, nunca 404 — erro de infraestrutura não pode tirar página do índice.

**Independent Test**: `curl -o /dev/null -w '%{http_code}'` em `/produtos/inexistente-xyz`,
`/qualquer-coisa-xyz` e `/a/b/c` devolve 404; em `/carrinho` e `/sobre`, 200.

---

### P1: Categoria inativa redireciona para a mãe ⭐ MVP

**User Story**: Como dona da loja, quero que desativar uma categoria no painel não jogue fora o link
que o Google já conhecia.

**Why P1**: `/personalizados/profissoes` está indexada e inativa hoje; sem isto ela vira 404 no dia
do apontamento.

**Acceptance Criteria**:

1. WHEN `/:pai/:filha` aponta subcategoria **inativa** cujo pai está ativo THEN a resposta SHALL ser
   **301** para o caminho canônico do pai (`/personalizados`).
2. WHEN a categoria inativa não tem ancestral ativo (raiz inativa, ou pai também inativo sem avô
   ativo) THEN a resposta SHALL ser **301** para `/`.
3. WHEN o pai ativo mais próximo está dois níveis acima THEN o 301 SHALL ir direto para ele, em
   **um** salto (nunca uma cadeia de 301).
4. WHEN a leitura usada para decidir o redirecionamento acontece THEN ela SHALL NOT usar a chave de
   serviço em `apps/**` e SHALL NOT expor ao público nada além do caminho de destino (nome, descrição
   e arte de categoria inativa continuam invisíveis).

5. WHEN `/produtos/:slug` não é produto ativo mas `product_redirects` tem o slug THEN a resposta SHALL
   ser **301** para `/produtos/<slug atual>` — o mesmo destino que `useProduct` já navega no cliente.
   *(acrescentado no design, 2026-10-19: sem isto o servidor diria 404 para um endereço que a loja
   sabe redirecionar)*
6. WHEN o slug de categoria não é categoria ativa mas `category_redirects` aponta para uma categoria
   ativa THEN a resposta SHALL ser **301** para a canônica dela (`resolveCategoryRoute`, `SEO-02`).
7. WHEN a categoria é ativa mas a URL traz o pai errado (`/pai-errado/filha`) THEN a resposta SHALL
   ser **301** para a canônica, como `resolveCategoryRoute` já decide no cliente.
8. WHEN mais de uma regra se aplica THEN a precedência SHALL ser: categoria ativa > `category_redirects`
   > categoria inativa (301 para o ancestral) > 404.

**Independent Test**: desativar uma subcategoria no banco local e ver `curl -I` devolver 301 com
`Location` da mãe; reativar e ver 200.

---

### P1: Categoria servida com o próprio `<head>` ⭐ MVP

**User Story**: Como cliente que compartilha uma categoria no WhatsApp, quero que a prévia mostre o
nome da categoria e não o da home.

**Why P1**: 31 categorias indexadas, e o compartilhamento por WhatsApp é canal de venda da loja.

**Acceptance Criteria**:

1. WHEN uma categoria **ativa** é pedida por `/:slug` ou `/:pai/:filha` THEN a resposta SHALL ser
   **200**, `text/html; charset=utf-8`, com `<title>` e descrição saídos de `categoryPageMeta`
   (`@estrelinha/core/seo`) — a mesma função que o cliente chama.
2. WHEN a categoria é servida THEN o `<head>` SHALL conter `<link rel="canonical">` absoluto com o
   caminho de `categoryHref`/`categoryPath` (dois segmentos para subcategoria) e `og:title`,
   `og:description`, `og:url` (= canônica), `og:type=website`, e `og:image` quando a categoria tiver
   `banner_url` ou `image_url`.
3. WHEN o `<head>` servido já declara título, descrição e canônica THEN o shell SHALL NOT carregar
   uma segunda declaração das mesmas tags (nada de dois `<title>` ou duas canônicas no HTML).
4. WHEN a resposta de categoria é servida THEN ela SHALL declarar `s-maxage=300`.

**Independent Test**: `curl -s .../joias-afetivas/joia-afetiva-linha-pet | grep -E '<title>|canonical'`
mostra o nome da categoria e a canônica de dois segmentos.

---

### P2: Páginas fixas com o `<head>` no HTML

**User Story**: Como quem compartilha `/sobre` ou `/perguntas-frequentes`, quero a prévia com o
título da página.

**Why P2**: São poucas e menos visitadas que produto e categoria, mas o custo é baixo.

**Acceptance Criteria**:

1. WHEN uma rota de `SITEMAP_STATIC_PATHS` diferente de `/` é pedida THEN o HTML servido SHALL conter
   o `<title>` e a descrição de `staticPageMeta(path)` e a canônica absoluta do caminho, sem
   depender de JavaScript.
2. WHEN uma rota for acrescentada a `SITEMAP_STATIC_PATHS` THEN um guarda SHALL reprovar se ela não
   for servida com o `<head>` próprio (bidirecional com a lista, no molde de `metaPorRota.test.ts`).
3. WHEN `/perguntas-frequentes/:pergunta` é pedido THEN o comportamento SHALL ser o de hoje
   (fora desta história).

**Independent Test**: `curl -s .../politica-de-privacidade | grep '<title>'` mostra o título da
política.

---

### P2: Imagens dos produtos no sitemap

**User Story**: Como Google Imagens, quero saber quais fotos pertencem a cada produto, para
reindexar as 3.781 fotos no endereço novo.

**Why P2**: As fotos trocam de endereço no apontamento (CDN da Nuvemshop → Storage), e o sitemap é o
mapa que a Nuvemshop entrega hoje.

**Acceptance Criteria**:

1. WHEN o sitemap é gerado THEN cada `<url>` de **produto** (sem `?variant=`) SHALL conter um
   `<image:image><image:loc>` por foto de `products.images`, na ordem do array.
2. WHEN o sitemap é gerado THEN o documento SHALL declarar o namespace
   `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`.
3. WHEN a primeira foto é declarada THEN o `<image:loc>` SHALL ser **byte a byte** o `og:image` que a
   página do produto serve.
4. WHEN o produto não tem foto THEN a `<url>` SHALL sair sem `<image:image>`, e nunca com um
   `<image:loc>` vazio.
5. WHEN `<url>` é de categoria, página fixa ou opção (`?variant=`) THEN SHALL NOT conter
   `<image:image>`.
6. WHEN a URL da foto contém `&`, `<` ou aspas THEN ela SHALL sair escapada (`escapeXml`), como o
   `<loc>`.
7. WHEN o produto tem mais de 1.000 fotos THEN SHALL declarar só as 1.000 primeiras (limite do
   protocolo).

**Independent Test**: `curl -s /sitemap.xml | grep -c '<image:loc>'` próximo de 3.781, e a primeira
foto de um produto igual ao `og:image` da página dele.

---

## Edge Cases

- WHEN o mesmo slug existe como categoria filha em dois pais e é aberto por um segmento THEN o
  comportamento SHALL ser o que a SPA já tem hoje (fora desta feature).
- WHEN o slug do produto vem com maiúsculas ou barra final THEN a barra final SHALL continuar sendo
  removida por 308 (`trailingSlash: false`) antes de a função decidir; maiúsculas SHALL resolver
  como hoje.
- WHEN um caminho de categoria colide com arquivo estático (`/favicon.ico`, `/assets/…`) THEN o
  arquivo SHALL vencer, como hoje.
- WHEN a função de produto/categoria lança erro inesperado THEN a resposta SHALL ser o shell com 200
  e SHALL ser registrada em log com o caminho.
- WHEN o deploy é novo THEN a primeira resposta de cada URL SHALL ser `MISS` e as seguintes `HIT` —
  nenhuma resposta cacheada SHALL apontar para bundle de outro deploy.

## Implicit-requirement sweep

| Dimensão | Tratamento |
| --- | --- |
| Validação de entrada | slug vazio, com `..`, codificado: tratado como inexistente ⇒ 404; nunca vira caminho de arquivo |
| Falha parcial | leitura de produto/categoria falhando ⇒ shell 200 sem cache longo (P1·6, 404·7); leitura de marcações de opção falhando ⇒ `<head>` da peça (SVR-21 de hoje) |
| Idempotência / retry | N/A — leitura pura, sem escrita |
| Auth / rate limit | Leitura com a chave publicável e RLS; chave de serviço proibida em `apps/**` (404·redirect AC 4) |
| Concorrência / ordem | N/A — sem escrita; a ordem que importa é a dos `rewrites` (rotas fixas antes da categoria, catch-all por último) |
| Ciclo de vida / expiração | teto de 5 min em 200, 60 s em 404; stale só durante falha da origem |
| Observabilidade | log estruturado por erro de leitura com caminho; `sitemap-check.yml` segue conferindo canônica e origem |
| Dependência externa | Supabase fora ⇒ shell 200 (nunca 404, nunca 5xx); a Vercel passa a ser a única dependência para servir HTML |
| Integridade de estado | N/A — nenhuma transição de estado |

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SSV-01 | P1 produto · AC1 (mesmo `<head>`) | Pending |
| SSV-02 | P1 produto · AC2 (dentro do deploy, sem rewrite externo) | Pending |
| SSV-03 | P1 produto · AC3 (`s-maxage=300`, HIT) | Pending |
| SSV-04 | P1 produto · AC4 (shell do mesmo build) | Pending |
| SSV-05 | P1 produto · AC5 (opção `?variant=`) | Pending |
| SSV-06 | P1 produto · AC6 (falha de leitura ⇒ 200 sem cache longo) | Pending |
| SSV-07 | P1 404 · AC1 (produto inexistente/inativo) | Pending |
| SSV-08 | P1 404 · AC2 (categoria inexistente) | Pending |
| SSV-09 | P1 404 · AC3 (3+ segmentos) | Pending |
| SSV-10 | P1 404 · AC4 (rotas fixas seguem 200) | Pending |
| SSV-11 | P1 404 · AC5 (legado segue 301) | Pending |
| SSV-12 | P1 404 · AC6 (cache curto em 404) | Pending |
| SSV-13 | P1 404 · AC7 (falha ⇒ 200, nunca 404) | Pending |
| SSV-14 | P1 inativa · AC1 (301 para a mãe) | Pending |
| SSV-15 | P1 inativa · AC2 (sem ancestral ⇒ `/`) | Pending |
| SSV-16 | P1 inativa · AC3 (um salto) | Pending |
| SSV-17 | P1 inativa · AC4 (sem chave de serviço, sem vazar dado) | Pending |
| SSV-18 | P1 categoria · AC1 (título/descrição de `categoryPageMeta`) | Pending |
| SSV-19 | P1 categoria · AC2 (canônica e Open Graph) | Pending |
| SSV-20 | P1 categoria · AC3 (sem tag duplicada) | Pending |
| SSV-21 | P1 categoria · AC4 (`s-maxage=300`) | Pending |
| SSV-22 | P2 fixas · AC1 (título, descrição, canônica no HTML) | Pending |
| SSV-23 | P2 fixas · AC2 (guarda bidirecional) | Pending |
| SSV-24 | P2 imagens · AC1 (uma `<image:image>` por foto, em ordem) | Pending |
| SSV-25 | P2 imagens · AC2 (namespace) | Pending |
| SSV-26 | P2 imagens · AC3 (primeira = `og:image`) | Pending |
| SSV-27 | P2 imagens · AC4 (sem foto ⇒ sem bloco) | Pending |
| SSV-28 | P2 imagens · AC5 (só em produto) | Pending |
| SSV-29 | P2 imagens · AC6 (escape) | Pending |
| SSV-30 | P2 imagens · AC7 (teto de 1.000) | Pending |
| SSV-31 | P1 inativa · AC5 (`product_redirects` ⇒ 301) | Pending |
| SSV-32 | P1 inativa · AC6 (`category_redirects` ⇒ 301) | Pending |
| SSV-33 | P1 inativa · AC7 (pai errado ⇒ 301 à canônica) | Pending |
| SSV-34 | P1 inativa · AC8 (precedência) | Pending |

**Coverage:** 34 total, 0 mapeados a tasks (pendente de Design/Tasks).

---

## Success Criteria

- [ ] No deploy: produto com `HIT` na segunda batida e TTFB < 300 ms no acerto; `text/html`; JSON-LD
      no corpo; canônica na origem de `STORE_PUBLIC_URL`.
- [ ] No deploy: `/produtos/inexistente-xyz`, `/qualquer-coisa-xyz` e `/a/b/c` ⇒ 404;
      `/personalizados/profissoes` ⇒ 301 `/personalizados`; `/carrinho` ⇒ 200.
- [ ] As 31 categorias e as rotas fixas indexáveis com `<title>` próprio no HTML servido.
- [ ] Sitemap com `<image:loc>` para as fotos dos produtos, e a primeira de cada produto igual ao
      `og:image` dele.
- [ ] `shoppingParity.test.ts` com **zero** linhas alteradas; `packages/core/src/payment/**` com zero
      arquivos alterados; nenhum `rewrite` para `*.supabase.co` além de `/sitemap.xml` e do feed.
