# Sitemap — a lista das URLs canônicas da loja

## Problem Statement

`GET /sitemap.xml` na loja publicada devolve **HTTP 200 com o HTML da SPA**. Não é 404: o catch-all
do `vercel.json` (`/(.*)` → `/index.html`) engole a rota, e um rastreador que pede o sitemap recebe a
home. Medido em 2026-08-29 contra `https://umaestrelinha-store-five.vercel.app`: 200,
`Content-Type: text/html; charset=utf-8`, 3.945 bytes começando em `<!doctype html>`. É a mesma classe
de defeito do [`BUG-20260829`](../../../docs/qa/bugs/BUG-20260829-product-page-servida-como-text-plain.md)
— **status certo, entrega inutilizável** — e nenhuma checagem de status code a acusa.

O `/robots.txt` existe, responde 200 `text/plain; charset=utf-8` (160 bytes) e **não tem linha
`Sitemap:`**. Ou seja: nem o arquivo existe, nem alguém é avisado de onde ele estaria.

O catálogo, medido no mesmo dia, tem **680 produtos ativos** e **35 categorias ativas** (7 raízes e 28
filhas, todas com pai ativo). São **719 URLs canônicas** que o Google hoje só descobre seguindo link
dentro de uma SPA — o caminho de descoberta mais frágil que existe, e o único que a loja tem.

É a metade que a [`BL-007`](../../BACKLOG.md) deixou aberta quando a
[`30-google-shopping`](../30-google-shopping/spec.md) fechou a dos dados estruturados.

## Goals

- [ ] `/sitemap.xml` responder **XML bem-formado**, com uma `<url>` por conteúdo canônico da loja —
      **719 hoje** (680 produtos + 35 categorias + 4 páginas institucionais) — e nenhuma URL legada,
      privada ou com query string.
- [ ] O sitemap ser **sempre atual**: produto, categoria ou página criada no painel aparece na
      **requisição seguinte**, sem deploy e sem regeneração.
- [ ] Toda `<loc>` ser **absoluta**, sem barra final, e nascer de `@estrelinha/core` — nunca de uma
      segunda regra de endereçamento montada à mão.
- [ ] `/robots.txt` apontar para ele, na mesma origem.
- [ ] Sitemap parcial **nunca** ser servido: leitura truncada, leitura vazia ou origem ausente
      respondem **5xx sem corpo de sitemap**, em vez de um documento que mente.
- [ ] Uma rotina agendada **provar a entrega** todos os dias — porque a falha desta rota é invisível
      para quem só olha status code.

## Out of Scope

Explicitamente excluído. Documentado para impedir alargamento.

| Item | Motivo |
| --- | --- |
| `BreadcrumbList` em JSON-LD | É a **terceira** parte da `BL-007` e não tem nada a ver com sitemap: mora no `<head>` da página do produto, servido pela `product-page`. A `BL-007` continua parcialmente aberta e o `BACKLOG.md` registra qual parte caiu aqui. |
| Sitemap de imagens (`image:image`) | Extensão distinta, com regra própria de qual imagem representa o produto — a mesma pergunta que `offerImages` responde para o feed. Sem demanda medida; entra depois se o Search Console pedir. |
| Índice de sitemaps (`<sitemapindex>`) | 719 URLs contra um teto de **50.000** por arquivo. Um índice é um segundo documento com modo de falha próprio, para um catálogo que precisaria de **70×** de crescimento. Gatilho de revisão registrado em `SMP-13`. |
| `<changefreq>` e `<priority>` | O Google declara que **ignora as duas**. Emitir campo ignorado é convidar divergência sem contrapartida (`SMP-09`). |
| Regras novas de `Disallow` no `robots.txt` | A feature acrescenta **uma** linha (`Sitemap:`). Decidir se `/checkout`, `/conta` ou `/busca` devem ser bloqueados é política de rastreamento, não descoberta de conteúdo, e mexe num arquivo que hoje funciona. |
| Servir `/robots.txt` pela edge function | Seria a única forma de a origem ter **um** dono, e está **recusada por assimetria de dano**: `robots.txt` em 5xx faz o Google **parar de rastrear o site inteiro** enquanto durar. Um sitemap em 5xx custa uma releitura. O `robots.txt` fica estático, e a divergência de host vira asserção da rotina diária (`SMP-29`). |
| Submeter URLs a buscador (IndexNow, ping) | O endpoint de ping do Google foi **descontinuado**; o IndexNow do Bing é outro protocolo, com chave própria. A descoberta desta feature é `robots.txt` + Search Console. |
| Mover `/produtos/:slug` para função da Vercel | É a [`BL-017`](../../BACKLOG.md), com risco próprio e independente. Esta feature acrescenta um terceiro `rewrite` para `*.supabase.co` — registrado como custo aceito em `AD-022`. |
| Reescrever `packages/core/src/payment/**` | Nenhuma decisão de dinheiro muda. O sitemap não lê preço. Conferido por `git diff --name-only` no gate. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assunção / decisão | Default escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| **Onde o sitemap é gerado** | **edge function da Supabase**, exposta por `rewrite` do `vercel.json` — irmã da `google-feed` | **Decisão do usuário em 2026-08-29.** O critério dele foi frescor: *"mudanças ou cadastros de novos produtos e categorias e páginas devem atualizar o sitemap"*. A function lê o banco a cada requisição, então a exigência é satisfeita **por construção** — não há artefato para envelhecer. Os custos que a alternativa de build evitaria estão listados e aceitos em [`design.md`](./design.md) §1. | **y** |
| O que o **cron** faz | **prova a entrega, diariamente** — não regenera nada | O usuário pediu "atualização disparada por cron" para garantir frescor. Com a function servindo ao vivo **não há o que regenerar**: o cron não teria trabalho. O que ele passa a fazer é o que de fato protege esta rota — conferir todo dia que o que é **entregue** é XML, com contagem plausível, e que o `robots.txt` aponta para o mesmo host. Seria o único mecanismo capaz de ter achado o `BUG-20260829` no dia. | **y — reinterpretado, ver `design.md` §5** |
| Periodicidade do cron | **diária** | O modo de falha é invisível (200 com corpo errado). A verificação custa duas requisições HTTP e nenhuma credencial. Diário limita a **24 h** o tempo em que uma quebra passa despercebida; semanal multiplicaria isso por 7 sem economizar nada mensurável. | y |
| Produto **sem estoque** entra? | **entra** | Decisão do usuário em 2026-08-29. Medido: **587 dos 680** produtos têm `stock_policy = 'none'`, então a regra alcançaria no máximo 93. Sitemap é lista de **URLs canônicas**, não feed de disponibilidade — esse é o do Shopping, e ele filtra, corretamente. | **y** |
| Categoria/produto **inativo** entra? | **não entra, e não por código** | A regra é a RLS: `public read products using (is_active = true)` e `public read categories using (active = true)`. A function lê com a **chave publicável**, não com service role, e assim a visibilidade do sitemap é *literalmente* a mesma da vitrine, sem uma segunda cópia da política. É a única diferença deliberada em relação à `google-feed`, que usa service role. | n |
| Páginas institucionais no sitemap | `/`, `/sobre`, `/politicas`, `/como-enviar-seu-material-de-dna` | São as quatro rotas do `App.tsx` que servem conteúdo público e estável. As demais são privadas (`/conta`, `/favoritos`, `/entrar`), transacionais (`/carrinho`, `/checkout`, `/pedido/:id`) ou geram espaço de rastreio infinito (`/busca`). A lista é **classificação obrigatória**, não curadoria: `SMP-24` exige que toda rota esteja de um lado ou do outro. | n |
| Origem das `<loc>` | secret `STORE_PUBLIC_URL`, **o mesmo** que a `google-feed` já lê | Origem é configuração, jamais literal. O valor hoje é o domínio **provisório** e no cutover vira `umaestrelinha.com.br` — a mesma pendência de que o `<g:link>` das 3.233 ofertas depende, então os dois trocam juntos. | n |
| A linha `Sitemap:` do `robots.txt` | **literal** em `apps/store/public/robots.txt` | É o **segundo dono da origem**, e é assumido de propósito: a alternativa (servir `robots.txt` pela function) troca uma divergência de host por um caminho em que 5xx **para o rastreio do site inteiro**. A contenção é dupla: um teste de fonte fixa a forma da linha, e a rotina diária confere que o host dela é o host que serve (`SMP-29`). | n |
| Interruptor liga/desliga | **não tem** | A `google-feed` tem um porque feed vazio no Merchant Center **remove catálogo**; sitemap ausente só adia descoberta. Um interruptor a mais seria mais um estado para alguém esquecer ligado. | n |
| `<lastmod>` | `products.updated_at` / `categories.updated_at`, em W3C Datetime; **omitido** nas estáticas | É o uso *correto* de `updated_at` — `lastmod` significa "última modificação qualquer", que é exatamente o que a coluna registra. (A `L-017` proíbe datar um **evento específico** por `updated_at`; aqui não há evento.) Página institucional não tem coluna de onde derivar, e omitir é legal e honesto. | n |
| Sitemap com o catálogo **vazio** | **503** | Zero produto público é muito mais provável de ser credencial errada ou RLS fechada do que fato. Mesma recusa que `renderFeedXml` faz por lista vazia, pelo mesmo motivo: um documento válido e semanticamente falso é pior que a ausência dele. | n |
| Teto do PostgREST | leitura paginada e **conferida contra a contagem exata** | 680 < 1.000 hoje, então nada trunca — e é por isso que o guarda precisa nascer agora: quando truncar, truncará em silêncio. É a `BL-008`, o defeito que quebrou o importador na `21` e que a `google-feed` já contém com `readAllRows`. **Reaproveitado, não reinventado.** | n |
| `Content-Type` entregue | a function declara `application/xml; charset=utf-8` **e** o `vercel.json` reimpõe o mesmo valor | `application/xml` **nunca atravessou** o gateway `*.supabase.co` — o que foi medido em 2026-08-29 foi o **404** da `google-feed`, que é `text/plain`. Declarar nos dois lados faz a entrega não depender do resultado dessa medição: a Vercel **sobrescreve** tipo de resposta proxiada, provado em produção no `BUG-20260829`. A medição é feita mesmo assim, cedo, e o resultado vai para o `design.md`. | n |
| Ordem das `<url>` | institucionais → categorias (`sort_order`, depois `slug`) → produtos (`slug`) | Ordem estável torna duas leituras comparáveis. Ordem incidental do PostgREST faria toda releitura parecer uma reescrita. | n |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: A loja publica a lista das suas URLs canônicas ⭐ MVP

**User Story**: Como dona da loja, quero que o Google receba de nós a lista completa das páginas que
existem, para que produto e categoria sejam indexados sem depender de o rastreador executar o
JavaScript da vitrine e adivinhar o caminho.

**Why P1**: É a feature. Sem o documento não há nada para o `robots.txt` apontar nem para o Search
Console ler.

**Acceptance Criteria**:

1. WHEN `/sitemap.xml` é requisitado na loja publicada THEN o sistema SHALL responder com um
   `<urlset>` no namespace `http://www.sitemaps.org/schemas/sitemap/0.9` e com `Content-Type`
   **entregue** de XML — **nunca** o `<!doctype html>` da SPA, e nunca `text/plain`.
2. WHEN o sitemap é gerado THEN o sistema SHALL emitir **exatamente uma** `<url>` por produto legível
   pela chave publicável, com `<loc>` igual à origem concatenada com `productPath(slug)`.
3. WHEN o sitemap é gerado THEN o sistema SHALL emitir **exatamente uma** `<url>` por categoria
   legível pela chave publicável, com `<loc>` igual à origem concatenada com o resultado de
   `categoryHref` — **dois** segmentos para filha (`/:pai/:filha`), **um** para raiz (`/:slug`).
4. WHEN o sitemap é gerado THEN o sistema SHALL emitir uma `<url>` para cada caminho de
   `SITEMAP_STATIC_PATHS` e para **nenhuma** outra rota declarada no `App.tsx`.
5. WHEN qualquer `<loc>` é emitida THEN ela SHALL ser **absoluta**, SHALL terminar **sem barra**, e
   SHALL ser construída por `productPath`/`categoryHref` de `@estrelinha/core` — nunca por
   concatenação local de segmentos.
6. WHEN o sitemap é gerado THEN ele SHALL **omitir** toda forma legada — `/produto/:slug`,
   `/colecao/:slug`, `/categoria/:slug`, `/como-enviar-o-material` — e toda linha de
   `product_redirects` e `category_redirects`.
7. WHEN o sitemap é gerado THEN nenhuma `<loc>` SHALL conter query string, em particular `?variant=`.
8. WHEN a linha de origem tem `updated_at` THEN a `<url>` SHALL declarar `<lastmod>` com esse
   instante em W3C Datetime; WHEN a URL é institucional THEN a `<url>` SHALL **omitir** `<lastmod>`.
9. WHEN o sitemap é gerado THEN ele SHALL **não** emitir `<changefreq>` nem `<priority>`.
10. WHEN um texto de URL contiver caractere que XML 1.0 não representa THEN o sistema SHALL escapá-lo
    (ou removê-lo, quando não houver representação) pela **mesma** função que o feed do Shopping usa.
11. WHEN o sitemap é gerado contra o catálogo medido em 2026-08-29 THEN ele SHALL conter **719**
    elementos `<url>` — 680 produtos, 35 categorias, 4 institucionais.
12. WHEN o sitemap é gerado THEN as `<url>` SHALL sair em ordem determinística — institucionais,
    depois categorias, depois produtos, cada bloco com critério estável.
13. WHEN o número de URLs ultrapassar **50.000**, OU o documento passar de **50 MB** THEN a decisão de
    arquivo único SHALL ser revista — está registrado como gatilho, não como limite implícito.

**Independent Test**: `curl -sD - https://<origem>/sitemap.xml`, conferir o `Content-Type`, contar
`<url>` (719), e verificar que `/produtos/<slug de um produto conhecido>` está presente e que
`/produto/<mesmo slug>` **não** está.

---

### P1: O sitemap está sempre atual ⭐ MVP

**User Story**: Como dona da loja, quero que um produto, uma categoria ou uma página que eu cadastre
apareça no sitemap **sem esperar deploy**, porque eu mexo no catálogo pelo painel e o painel não faz
deploy.

**Why P1**: É o critério que decidiu a arquitetura. Um sitemap que só é verdade no dia do deploy
descreve um catálogo que não existe mais.

**Acceptance Criteria**:

14. WHEN um produto ou categoria é criado, editado ou desativado no painel THEN a **requisição
    seguinte** a `/sitemap.xml` SHALL refletir a mudança — sem deploy, sem invalidação manual e sem
    passo de regeneração.
15. WHEN o sitemap é servido THEN o `<lastmod>` de cada URL SHALL vir da linha lida naquela
    requisição, e não de um instante de build.

**Independent Test**: contar `<url>`, criar um produto ativo no banco, requisitar de novo e ver a
contagem subir em 1 com a `<loc>` nova presente.

---

### P1: Um sitemap parcial nunca é servido ⭐ MVP

**User Story**: Como dona da loja, quero que a rota **falhe** em vez de servir uma lista pela metade,
porque uma lista incompleta não parece incompleta — parece um catálogo menor.

**Why P1**: É o mesmo teto de 1.000 linhas do PostgREST que quebrou o importador na `21` e que a
`BL-008` mantém aberto. Truncar não levanta erro: devolve menos linhas e segue.

**Acceptance Criteria**:

16. WHEN a leitura do catálogo falha, OU devolve **menos linhas do que a contagem exata** da mesma
    tabela THEN o sistema SHALL responder **5xx sem corpo de sitemap**, com log que nomeia lido e
    esperado.
17. WHEN a leitura devolve **zero** produtos THEN o sistema SHALL responder **5xx** — catálogo público
    vazio é muito mais provável de ser credencial ou RLS do que fato.
18. WHEN `STORE_PUBLIC_URL` está ausente, OU não é URL absoluta `http`/`https` THEN o sistema SHALL
    responder **5xx** nomeando a variável — nunca um sitemap de `<loc>` relativas ou com host errado.
19. WHEN o catálogo tiver mais de 1.000 linhas THEN a leitura SHALL paginar em ordem estável e emitir
    todas.
20. WHEN qualquer das condições acima ocorre THEN o corpo da resposta SHALL **não** ser um `<urlset>`
    — nem vazio, nem parcial.

**Independent Test**: exercitar `handleSitemap` com dependências injetadas nos quatro caminhos
(contagem divergente, zero produtos, origem ausente, origem malformada) e conferir status e ausência
de `<urlset>`.

---

### P1: Quem rastreia descobre o sitemap sozinho ⭐ MVP

**User Story**: Como rastreador, quero achar o sitemap sem que ninguém me diga onde ele está, porque é
assim que eu acho o de qualquer loja.

**Why P1**: Um sitemap que só existe no Search Console depende de alguém tê-lo submetido à mão, uma
vez, e de lembrar de refazer isso no cutover de domínio.

**Acceptance Criteria**:

21. WHEN `/robots.txt` é servido THEN ele SHALL conter **exatamente uma** linha `Sitemap:`, com URL
    **absoluta**, terminando em `/sitemap.xml`.
22. WHEN `/robots.txt` é servido THEN as diretivas `User-agent`/`Allow` já existentes SHALL permanecer
    **inalteradas**, byte a byte.
23. WHEN o host da linha `Sitemap:` diverge do host que serve o `robots.txt` THEN a rotina diária
    SHALL falhar — é a contenção do segundo dono da origem que esta escolha assume (`SMP-29`).

**Independent Test**: `curl -s https://<origem>/robots.txt | grep -ci '^Sitemap:'` devolve `1`, e o
host dela é o host requisitado.

---

### P2: Uma rota pública nova não pode nascer fora do sitemap

**User Story**: Como quem for criar a próxima página da loja, quero que o repositório me obrigue a
dizer se ela é indexável, para que ela não fique fora do sitemap por esquecimento.

**Why P2**: Não bloqueia a entrega, mas é a diferença entre um sitemap correto hoje e um sitemap
correto daqui a seis features. A `AD-018` já pagou por essa lição: o namespace compartilhado exigiu
`reservedSlugs.test.ts` bidirecional, e a lista de rotas envelheceria igual.

**Acceptance Criteria**:

24. WHEN uma rota é declarada em `App.tsx` THEN ela SHALL estar classificada em **exatamente uma** de
    `SITEMAP_STATIC_PATHS` (indexável), `NON_INDEXABLE_PATHS` (deliberadamente fora, com motivo
    escrito), as rotas dinâmicas, ou `LEGACY_REDIRECTS` — e o guarda SHALL derrubar a suíte **nas duas
    direções**: rota nova sem classificação, e entrada classificada que deixou de ser rota.
25. WHEN o guarda varre o `App.tsx` THEN ele SHALL carregar **âncora de contagem dupla** — arquivo
    lido com conteúdo, e número de rotas encontradas conferido —, para que um caminho errado não
    varra zero rota e passe em silêncio.
26. WHEN o `vercel.json` é lido THEN o `rewrite` de `/sitemap.xml` SHALL apontar para a function, SHALL
    vir **antes** do catch-all, o catch-all SHALL continuar sendo o **último**, e SHALL existir um
    header reimpondo `Content-Type: application/xml; charset=utf-8` — o tipo entregue é o que prova a
    rota (`AD-021`).

**Independent Test**: acrescentar uma rota fictícia ao `App.tsx` num scratch e ver o guarda reprovar;
remover uma entrada de `SITEMAP_STATIC_PATHS` e ver reprovar do outro lado.

---

### P2: A entrega é provada todo dia, não no dia do deploy

**User Story**: Como dona da loja, quero saber em 24 horas — e não pelo relatório do Search Console
semanas depois — que o sitemap parou de ser servido corretamente.

**Why P2**: Esta rota falha **em silêncio**. O `BUG-20260829` devolvia 200, corpo certo e JSON-LD
certo, e mesmo assim a página estava quebrada; o ritual de fecho que o repositório prescrevia
(`curl -I`) teria declarado verde. Nenhum teste do repositório alcança isso: a asserção e a entrega
têm donos diferentes.

**Acceptance Criteria**:

27. WHEN a rotina roda THEN ela SHALL requisitar `/sitemap.xml` e falhar se o `Content-Type`
    **entregue** não for de XML, ou se o corpo não abrir em `<?xml`, ou se não parsear.
28. WHEN a rotina roda THEN ela SHALL contar os `<url>` e falhar abaixo de uma **âncora** declarada —
    é a mesma disciplina dos guardas de varredura do repositório (`L-021`), aplicada à entrega.
29. WHEN a rotina roda THEN ela SHALL requisitar `/robots.txt`, exigir **uma** linha `Sitemap:` e
    falhar se o host dela divergir do host requisitado.
30. WHEN a rotina roda THEN ela SHALL escolher uma `<loc>` do documento e falhar se aquela URL não
    responder 200 — sitemap que lista URL morta é pior que sitemap curto.
31. WHEN a rotina roda THEN ela SHALL aparecer na aba Actions **em todo caso**, e SHALL poder ser
    disparada à mão (`workflow_dispatch`) — run ausente é indistinguível de run quebrado.

**Independent Test**: `workflow_dispatch` manual contra a loja publicada, e um segundo disparo contra
uma URL propositalmente errada, que reprova.

---

## Edge Cases

- WHEN uma categoria filha tem o **pai desativado** THEN o `<loc>` dela SHALL ser a forma de **um**
  segmento — é o que `categoryHref` devolve quando o pai não está na lista visível, e é a mesma URL
  que a loja serve e declara como canônica. (Hoje: 0 casos — as 28 filhas têm pai ativo.)
- WHEN o slug contém `&`, `<`, `>` ou aspas THEN a `<loc>` SHALL sair percent-encoded e depois
  escapada, nessa ordem, e o documento SHALL continuar bem-formado.
- WHEN dois produtos tiverem o mesmo slug THEN é impossível (`products.slug` é `UNIQUE`); ainda assim
  o gerador SHALL **recusar** `<loc>` duplicada, pelo mesmo motivo que `renderFeedXml` recusa
  `offer_id` repetido.
- WHEN o catálogo cresce além de 1.000 linhas THEN a leitura pagina e a contagem confere (`SMP-19`).
- WHEN a function está fria THEN a primeira requisição paga cold start — aceitável: quem busca sitemap
  é rastreador, não cliente.
- WHEN o domínio final entrar no ar THEN trocar `STORE_PUBLIC_URL` **e** a linha `Sitemap:` do
  `robots.txt` SHALL bastar — e a rotina diária acusa se só um dos dois for trocado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SMP-01 .. SMP-13 | P1: URLs canônicas | Execute | **Verified** |
| SMP-14, SMP-15 | P1: sempre atual | Execute | **Verified** |
| SMP-16 .. SMP-20 | P1: nunca parcial | Execute | **Verified** |
| SMP-21 .. SMP-23 | P1: robots aponta | Execute | **Verified** (`SMP-23` pela rotina, exercitada à mão) |
| SMP-24 .. SMP-26 | P2: guarda de rota | Execute | **Verified**, com sensibilidade provada nos dois sentidos |
| SMP-27 .. SMP-31 | P2: entrega provada | Execute | **Verified** passo a passo; o workflow inteiro só roda depois do push |

**Coverage:** 31 total, **31 mapeados e verificados**, 0 sem task. Evidência em
[`validation.md`](./validation.md).

---

## Success Criteria

Nada aqui se prova por status code — foi assim que o `BUG-20260829` passou despercebido (`AD-021`).

- [ ] `curl -sD - <origem>/sitemap.xml` devolve **`Content-Type` de XML** e um corpo que abre em
      `<?xml` — não em `<!doctype html>` e não `text/plain`.
- [ ] A contagem de `<url>` **bate com o catálogo**: 719 hoje (680 + 35 + 4), conferida contra
      `count=exact` das duas tabelas no mesmo instante.
- [ ] Criar um produto e requisitar de novo devolve **720**, sem deploy no meio.
- [ ] Um produto conhecido aparece como `/produtos/<slug>` e **não** aparece como `/produto/<slug>`;
      uma subcategoria conhecida aparece como `/<pai>/<filha>` e não como `/colecao/<filha>`.
- [ ] Todas as `<loc>` têm o **mesmo host**, ele é absoluto, e nenhuma termina em `/` nem contém `?`.
- [ ] `curl -s <origem>/robots.txt` traz **uma** linha `Sitemap:`, com o mesmo host, e as diretivas
      antigas intactas.
- [ ] O documento passa num parser de XML de verdade (não por regex).
- [ ] A rotina diária roda à mão e passa; apontada para uma URL errada, reprova.
- [ ] Gate do repositório sem regressão: testes por workspace com exit code capturado, tipos em
      `0 · 0 · 0`, lint sem erro novo, e `git diff --name-only` sem nada em
      `packages/core/src/payment/`.
