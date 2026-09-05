# Metadados por rota e dados estruturados — Specification

> Feature `36`. Fecha a última parte da [`BL-007`](../../BACKLOG.md) (`BreadcrumbList`) e a
> [`BL-017`](../../BACKLOG.md) (transporte), e depende das decisões `AD-018` (endereçamento),
> `AD-020` (superfície que o Google lê é **servida**), `AD-021` (a prova é o `Content-Type`
> entregue) e `AD-022` (a regra de qual URL existe mora em `@estrelinha/core`).

## Problem Statement

**As 719 URLs da loja entregam um único título, uma única descrição e um único card de
compartilhamento.** Nenhuma linha do repositório escreve `document.title`, `og:title` ou
`meta[name=description]` — a loja herdou o `index.html` e nunca o personalizou por rota. Uma joia de
leite materno, um anel de cinzas e a página de políticas são, para todo buscador e todo aplicativo de
mensageria, a mesma página.

**O dado para consertar isso já existe e já foi comprado.** Medido no banco hospedado em 2026-08-30:
**676 dos 680 produtos** têm `seo_title` e `seo_description` curados — importados da Nuvemshop pelo
`catalog-import` (`map/product.ts:150-151`), editáveis na aba SEO do painel, e cobrados pelo
checklist de publicação. `mapDbToProduct` os descarta, o tipo `Product` não os declara, e a loja
nunca os escreve no HTML. O pipeline inteiro existe; faltam os últimos dez metros.

**A janela é curta.** `umaestrelinha.com.br` é hoje a Nuvemshop, ranqueando, e o cutover está
decidido com data próxima. O que a loja nova entregar no primeiro dia é o que o Google vai comparar
com o que já indexou.

**Medições que motivam a feature** (todas em 2026-08-30, contra o que está no ar):

| O que | Medido |
| --- | --- |
| `<title>` entregue em `/produtos/anel-afetivo-6-coracoes-leite-materno-prata-925` | `Uma Estrelinha - Joias afetivas artesanais em resina` |
| `og:image` declarado no `index.html` | `https://umaestrelinha.com.br/og-image.png` → **404** |
| Texto útil no `<body>` entregue | **1 byte** (`<div id="root"></div>`) |
| Tipos de `schema.org` emitidos | **2** (`Product`, `Offer`) |
| Tipos que a Nuvemshop emite hoje | **8** (`Product`, `Offer`, `Brand`, `BreadcrumbList`, `ListItem`, `Organization`, `WebPage`, `QuantitativeValue`) |
| Produtos com `seo_title`/`seo_description` no banco | **676 / 680** |
| Vínculos de pergunta frequente semeados (feature `28`) | **3.475**, em 687 produtos — nenhum vira `FAQPage` |
| `X-Vercel-Cache` em `/produtos/:slug` | **MISS** em 4 de 4 batidas, ~1s cada |

## Goals

- [ ] **Toda rota indexável entrega `<title>`, `<meta name="description">`, `<link rel="canonical">`
      e o conjunto Open Graph/Twitter próprios, no HTML servido** — verificável por `curl`, sem
      executar JavaScript. Hoje: 0 de 719 rotas. Meta: 719 de 719.
- [ ] **O card de mensageria de um produto mostra o produto** — nome, descrição curada e foto —
      medido no validador do Facebook e num compartilhamento real de WhatsApp.
- [ ] **A copy curada que já está no banco chega ao HTML**: `seo_title` e `seo_description` para os
      676 que os têm, e uma derivação declarada para os 4 que não têm.
- [ ] **Os tipos de `schema.org` sobem de 2 para 6** (`Product`, `Offer`, `BreadcrumbList`,
      `Organization`, `WebSite`, `FAQPage`), com `Product` ganhando `description`, `brand` e
      `itemCondition`, e `offers.url` deixando de divergir da canônica.
- [ ] **A latência de produto não piora, e de preferência melhora** — o transporte sai do `rewrite`
      não cacheado para uma função do próprio deploy (`BL-017`).

## Out of Scope

Explicitamente excluído. Cada linha tem motivo, porque exclusão sem motivo é exclusão que ninguém
consegue revisar depois.

| Item | Motivo |
| --- | --- |
| **Renderizar o `<body>` no servidor (SSR/prerender de conteúdo)** | Esta feature entrega o `<head>` completo, que é o que buscador e rastreador de IA leem primeiro e o que aplicativo de mensageria lê **exclusivamente**. Renderizar o corpo é outra arquitetura, com outro custo e outro risco, e não é pré-requisito de nenhum objetivo acima. **G5 fica mitigada, não resolvida** — e a spec declara isso em vez de fingir. |
| **Os 13 redirects 301 das URLs da Nuvemshop que morrem** (`/sobre-a-loja-de-joias-afetivas`, `/contato`, `/rastreio`, …) | É trabalho de **cutover**, não de metadado. Vai para a `BL-018`, e precisa subir **antes ou junto** com a virada de domínio. Escopo decidido com o usuário em 2026-08-30. |
| **`noindex` no `.vercel.app` e o host da linha `Sitemap:`** | Mesma razão: é cutover. `BL-019`. |
| **Colunas de SEO curado para categoria** (`categories.seo_title`/`seo_description`) | As 35 categorias não têm nem `description` preenchida. Criar coluna que ninguém preenche é dar um segundo dono a um dado que não existe. Esta feature **deriva** o metadado da categoria do nome dela; a curadoria vira `BL-020`, junto das outras quatro que esperam a Adri. |
| **Image sitemap (`<image:loc>`)** | A Nuvemshop tem 3.618. É ganho real para joia, e é uma mudança no `core/sitemap` que a `33` acabou de fechar — merece feature própria em vez de entrar de carona. `BL-021`. |
| **Code splitting e `srcset`** (bundle de 1,17 MB em chunk único) | Core Web Vitals é performance, não metadado. Feature própria. `BL-022`. |
| **Religar o feed do Google Shopping** (`404 integração desligada`) | É um interruptor no painel mais o `STORE_PUBLIC_URL` correto — decisão de negócio da Adri, não código. |
| **`aggregateRating` / `Review`** | Não há tabela de avaliações, e o `CLAUDE.md` proíbe depoimento inventado neste negócio. Declarar rating que não existe é dado estruturado falso. |
| **Gerar `seo_title`/`seo_description` por IA para os 4 que faltam** | Irmã da `BL-001`/`BL-014`, adiadas por decisão do usuário. Esta feature usa fallback determinístico. |

---

## Assumptions & Open Questions

| # | Assunção / decisão | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | Onde a montagem do `<head>` acontece | **Função do deploy da Vercel**, não a edge function da Supabase | `BL-017`: a Vercel **não cacheia** `rewrite` para host externo (4/4 `MISS`, ~1s). Estender o transporte atual às 719 rotas poria a loja inteira atrás de um proxy não cacheado, às vésperas do cutover. A função da própria Vercel é cacheada nativamente, o `Content-Type` deixa de depender de comportamento não documentado (`AD-021`), e o shell viaja no mesmo build — deixa de poder envelhecer. | y (usuário: escopo "metadados + dado estruturado"; o transporte é o habilitador) |
| A2 | O risco que A1 carrega | O builder `@vercel/node` **compila e traceia** o entrypoint, e ninguém provou que ele siga um `exports` para `.ts` dentro de `node_modules` (link pnpm para `packages/core`) | `BL-017` já mediu que `node` v24 importa `@estrelinha/core/shopping` do fonte e devolve os 20 exports. Falta a última milha. **Vira a primeira task da feature**, com duas saídas conhecidas e baratas: fixar runtime `nodejs22.x`/`nodejs24.x`, ou importar por caminho relativo como as functions do Deno já fazem. | n — a provar na T01 |
| A3 | Quem é o dono da derivação do metadado | **`packages/core/src/seo/`**, puro, lido por dois consumidores | Regra do "defeito 01": a função da Vercel monta o `<head>` servido e o hook do cliente atualiza o `<head>` na navegação interna. Duas escritas da mesma regra divergiriam sem quebrar nada — é literalmente o molde de `core/shopping` (feed + jsonld partindo da mesma `ShoppingOffer`). | y |
| A4 | Fallback quando falta `seo_title` | `seo_title` → `name` do produto | Os 4 sem SEO ainda têm nome. Nunca cai em string vazia: título vazio é pior que título genérico. | y |
| A5 | Fallback quando falta `seo_description` | `seo_description` → `description` **sem HTML, sem o bloco de FAQ, truncada em 160 no limite de palavra** | `description` é HTML de origem externa e contém o bloco de perguntas que a `28` extraiu. `stripFaqBlock` (`core/faq`) já existe e é o dono dessa remoção. Truncar no meio da palavra produz "…leite mater". | y |
| A6 | Sufixo de marca no título | `"{seo_title} \| Uma Estrelinha"`, **e só quando o título ainda não contém a marca** | Medido no catálogo: alguns `seo_title` já terminam em `\| Uma Estrelinha`, outros em `\| UE`, a maioria em nada. Sufixar cegamente produz `… \| Uma Estrelinha \| Uma Estrelinha`. | y |
| A7 | `og:image` do produto | A imagem primária via `storage/v1/render/image?width=1200&height=630&resize=cover` | Medido: responde 200 e devolve **JPEG** (16,9 KB), que é o formato que todo aplicativo de mensageria aceita sem discussão. |  y |
| A8 | `og:image:width`/`height` em imagem de produto | **Omitidos** | Medido: pedir 1200×630 num fonte de 1024 de largura devolve **1024×630**. Declarar 1200 seria afirmação sem verificação (`AD-012`). Ficam declarados só na imagem estática da marca, cujas dimensões são conhecidas. | y |
| A9 | A origem absoluta das URLs | **Uma variável de ambiente**, nunca literal no código | Cutover com data próxima. `og:url`, `canonical`, `og:image` e `offers.url` mudam **juntos** de host, e um literal esquecido publica o domínio provisório no card de todo mundo. Mesmo dono que o `STORE_PUBLIC_URL` do sitemap (`AD-022`). | y |
| A10 | Escape do conteúdo dos atributos | **Obrigatório e próprio**, em `core/seo` | `seo_description` vem da Nuvemshop. Uma aspa dupla fecha o atributo `content="…"` e o resto vira markup. O `escapeXml` de `core/xml` escapa para XML e **não serve**: `<meta>` é HTML, e o conjunto de caracteres perigosos é outro. Molde do `jsonLdScript`, que já escapa `<` por esta mesma razão. | y |
| A11 | Rota não indexável (`/carrinho`, `/checkout`, `/conta`, …) | Recebe título próprio e **`<meta name="robots" content="noindex">`** | `NON_INDEXABLE_PATHS` (`core/routes`) já classifica as sete, com motivo escrito. Título próprio é usabilidade (aba do navegador, histórico); `noindex` é o que impede `/busca?q=…` de virar espaço de rastreio infinito. | y |
| A12 | O que acontece quando a leitura do banco falha | **A página é servida com o metadado da loja**, nunca 5xx | Mesma regra que a `product-page` já pratica e que o `AD-020` registra: esta função entra no caminho de **toda** visita, não só a do rastreador. Título genérico é degradação; página fora do ar é queda. O sitemap faz o oposto (503) porque lá o consumidor é só rastreador e sitemap parcial mente em silêncio. | y |

**Open questions:** nenhuma — A2 é risco técnico com plano, resolvido na T01, não pergunta em aberto.

---

## User Stories

### P1: A cliente compartilha um produto no WhatsApp e o card mostra o produto ⭐ MVP

**User Story**: Como Adri (e como qualquer cliente que reencaminha um link), quero que o card do
WhatsApp mostre o nome, a descrição e a foto **daquela joia**, para que o link que eu mando pareça a
joia que eu estou vendendo, e não um anúncio genérico da loja.

**Why P1**: É o canal de venda principal deste negócio. A Adri manda link por WhatsApp todo dia, e
hoje todos saem idênticos. É também a única superfície que **não tem plano B**: aplicativo de
mensageria não executa JavaScript, então nenhuma correção no cliente alcança este caso.

**Acceptance Criteria**:

1. WHEN um cliente HTTP sem JavaScript busca `/produtos/<slug>` de um produto com `seo_title`
   THEN o HTML entregue SHALL conter `<title>` e `og:title` com o `seo_title` daquele produto,
   sufixados por `| Uma Estrelinha` **apenas se** o valor ainda não contiver a marca (A6).
2. WHEN o mesmo cliente lê o HTML THEN ele SHALL conter `meta[name=description]`,
   `og:description` e `twitter:description` com o `seo_description` daquele produto, idênticos entre si.
3. WHEN o produto tem imagem primária THEN o HTML SHALL conter `og:image` e `twitter:image`
   apontando para aquela imagem transformada por `render/image?width=1200&height=630&resize=cover`,
   em URL **absoluta** derivada da origem configurada, **sem** `og:image:width`/`og:image:height` (A8).
4. WHEN o produto **não** tem imagem THEN `og:image` SHALL cair na imagem estática da marca,
   com `og:image:width=1200` e `og:image:height=630` declarados — nunca ausente e nunca quebrado.
5. WHEN o HTML é entregue THEN ele SHALL conter `og:url` e `<link rel="canonical">` com o **mesmo**
   valor: `productPath(slug)` absolutizado pela origem configurada, sem query e sem barra final.
6. WHEN o HTML é entregue THEN ele SHALL conter `og:type=product`, `og:site_name=Uma Estrelinha`,
   `og:locale=pt_BR` e `twitter:card=summary_large_image`.
7. WHEN um produto está entre os 4 sem `seo_title` THEN o título SHALL ser o `name` do produto e a
   descrição SHALL ser derivada de `description` por A5 — nunca string vazia, nunca a copy da loja.
8. WHEN `seo_description` contém `"`, `<`, `>` ou `&` THEN o valor entregue SHALL estar escapado
   para atributo HTML, e o documento SHALL continuar parseando com o número esperado de `<meta>`.

**Independent Test**: `curl -s <origem>/produtos/<slug> | grep -E 'og:|<title>'` mostra o produto, em
três produtos escolhidos (um com SEO curado, um dos 4 sem, um sem imagem). Depois, o validador de
compartilhamento do Facebook e um envio real de WhatsApp nos mesmos três.

---

### P1: O Google recebe título, descrição e canônica próprios de cada rota ⭐ MVP

**User Story**: Como responsável pelo SEO, quero que cada uma das 719 URLs entregue metadado próprio
no HTML servido, para que a loja nova não chegue ao cutover com 719 páginas que o Google lê como uma.

**Why P1**: É o objetivo central da feature e a condição para não perder a posição que a Nuvemshop
tem hoje.

**Acceptance Criteria**:

1. WHEN um cliente sem JavaScript busca **qualquer** caminho de `SITEMAP_STATIC_PATHS` (`/`,
   `/sobre`, `/politicas`, `/como-enviar-seu-material-de-dna`) THEN o HTML SHALL conter título,
   descrição e canônica próprios daquela página, distintos dos das outras três.
2. WHEN o caminho é de categoria — uma ou duas formas de `categoryHref` — THEN o HTML SHALL conter
   título e descrição derivados do **nome** da categoria (A3, e não de coluna nova), e a canônica
   SHALL ser a que `categoryHref` produz, que é a **mesma** função que `resolveCategoryRoute` já usa
   (`AD-018`). A forma de um segmento e a de dois SHALL declarar a **mesma** canônica.
3. WHEN o caminho está em `NON_INDEXABLE_PATHS` THEN o HTML SHALL conter
   `<meta name="robots" content="noindex">` e um `<title>` próprio, e SHALL **não** conter `canonical`.
4. WHEN a rota não casa com nada — 404 — THEN o HTML SHALL conter um `<title>` de página não
   encontrada e `noindex`, e SHALL **não** declarar canônica.
5. WHEN a origem configurada muda de host THEN `canonical`, `og:url`, `og:image` e `offers.url`
   SHALL mudar juntos, sem nenhum literal de host restante no código (A9).
6. WHEN o `<head>` do `index.html` já traz uma tag que a função vai emitir THEN o documento entregue
   SHALL conter **exatamente uma** instância de cada — a genérica é substituída, nunca duplicada.
   Duas `og:title` no mesmo documento é comportamento indefinido em todo rastreador.

**Independent Test**: uma varredura que busca as 719 URLs do sitemap e assere que o par
`(title, description)` é único por URL, e que canônica e `og:url` coincidem em todas.

---

### P1: Um assistente de IA consegue descrever a loja e um produto ⭐ MVP

**User Story**: Como Adri, quero que quem pergunta a um assistente "onde compro joia com leite
materno em Porto Alegre" encontre a Uma Estrelinha, para não ficar de fora do canal de busca que mais
cresce.

**Why P1**: GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot e Bingbot (que alimenta o Copilot do
Edge) majoritariamente **não executam JavaScript**. Hoje eles leem 1 byte de texto. O `<head>`
servido, com JSON-LD rico, é o que muda isso sem mudar a arquitetura da loja.

**Acceptance Criteria**:

1. WHEN qualquer rota da loja é entregue THEN o HTML SHALL conter um bloco JSON-LD `Organization`
   com nome, `url`, `logo`, `sameAs` do Instagram e a área de atuação (Porto Alegre/RS) — os mesmos
   valores que o rodapé já exibe como texto, sem uma segunda escrita deles.
2. WHEN a home é entregue THEN o HTML SHALL conter, além do `Organization`, um `WebSite` com
   `potentialAction: SearchAction` apontando para `/busca?q={search_term_string}`.
3. WHEN uma página de produto é entregue THEN o `Product` SHALL carregar, além do que já emite,
   `description` (a mesma de A5), `brand` e `itemCondition: NewCondition`.
4. WHEN uma página de produto é entregue THEN `offers.url` SHALL ser a canônica **sem** `?variant=`
   — hoje ele emite `…?variant=1537891935` enquanto a canônica é sem query, o que declara dois
   endereços para a mesma oferta no mesmo documento.
5. WHEN o produto tem perguntas frequentes vinculadas THEN o HTML SHALL conter um `FAQPage` com
   `mainEntity` de uma `Question`/`acceptedAnswer` por pergunta, **na mesma ordem e com o mesmo
   texto** que `ProductFaq` renderiza — e SHALL omitir o bloco inteiro quando não houver pergunta,
   nunca emitir `FAQPage` com `mainEntity: []`.
6. WHEN uma página de produto ou de categoria é entregue THEN o HTML SHALL conter um
   `BreadcrumbList` cuja trilha é a **mesma** que a página desenha visualmente, com `item`
   absolutizado pela origem configurada.
7. WHEN qualquer valor que entra no JSON-LD contém `<` THEN ele SHALL sair escapado como `<`,
   pela regra que `jsonLdScript` já aplica — uma descrição com `</script>` não pode fechar a tag.
8. WHEN a página emite mais de um bloco THEN cada `@type` SHALL aparecer **uma vez** por documento, e
   o conjunto SHALL passar no Rich Results Test do Google sem erro.

**Independent Test**: colar o HTML entregue de um produto, de uma categoria e da home no
Rich Results Test e no Schema Markup Validator; zero erros, e os tipos esperados reconhecidos.

---

### P1: O transporte sai do proxy não cacheado ⭐ MVP

**User Story**: Como visitante da loja no celular, quero que a página de produto abra rápido, para
não esperar um segundo antes do primeiro byte.

**Why P1**: Sem isto, o P1 anterior **piora** a loja: estender o `rewrite` não cacheado às 719 rotas
põe a loja inteira atrás de um proxy de ~1s. É a condição que a própria `AD-020` escreveu ("se não
cachear, a decisão precisa ser revista antes do cutover") e que a `BL-017` existe para cumprir.

**Acceptance Criteria**:

1. WHEN a mesma URL de produto é buscada duas vezes seguidas THEN a segunda resposta SHALL trazer
   `X-Vercel-Cache: HIT`. Hoje: `MISS` em 4 de 4.
2. WHEN a resposta chega ao cliente THEN o `Content-Type` **entregue** SHALL ser
   `text/html; charset=utf-8`, medido no header de resposta e não no que a função constrói (`AD-021`).
3. WHEN a função monta a página THEN ela SHALL usar o `index.html` do **próprio build**, nunca um
   shell buscado por HTTP — o modo de falha que isso elimina é o shell velho apontando para um
   `<script>` com hash que já não existe (quadro branco, 200, nada acusando).
4. WHEN a leitura do banco falha, expira ou devolve vazio THEN a resposta SHALL ser a página
   **íntegra** com o metadado genérico da loja e status 200 (A12), e SHALL registrar o erro em log
   estruturado.
5. WHEN o `rewrite` de `/produtos/:slug` para `*.supabase.co` for removido THEN o override de
   `Content-Type` correspondente no `vercel.json` SHALL sair junto, e `vercelRedirects.test.ts` SHALL
   acompanhar — deixar o header órfão mantém no arquivo uma linha cuja razão de existir sumiu.
6. WHEN a função responde THEN o catch-all do SPA SHALL continuar por último na lista de `rewrites`,
   como `vercelRedirects.test.ts` já exige.

**Independent Test**: `curl -sD - -o /dev/null` duas vezes na mesma URL de produto, conferindo
`X-Vercel-Cache` e `Content-Type`; e um deploy da loja seguido de nova busca, provando que o shell
acompanhou o build.

---

### P2: Navegar dentro da loja atualiza o título

**User Story**: Como cliente navegando entre produtos, quero que a aba do navegador e o histórico
mostrem onde eu estou, para conseguir voltar ao que eu estava olhando.

**Why P2**: Não é MVP porque buscador e mensageria são servidos pelo P1 — mas sem isto o título fica
**errado** depois do primeiro clique, e o Googlebot, que renderiza, veria o título da página anterior.

**Acceptance Criteria**:

1. WHEN o cliente navega de uma rota para outra dentro da SPA THEN `document.title`,
   `meta[name=description]` e as tags `og:*` SHALL passar a refletir a rota atual.
2. WHEN o valor é derivado THEN ele SHALL vir da **mesma** função de `packages/core/src/seo/` que a
   função da Vercel usa — nunca de uma segunda derivação (A3).
3. WHEN o componente desmonta THEN as tags que ele criou SHALL ser removidas ou revertidas, pelo
   mesmo motivo que `useCanonical` já remove a dela: numa SPA o `<head>` sobrevive à navegação, e uma
   tag que fica é pior que uma que nunca existiu.
4. WHEN a rota é a de produto THEN o hook SHALL produzir **o mesmo valor** que o HTML servido já
   trazia — a hidratação não pode trocar o título por outro.

**Independent Test**: teste de componente que navega entre duas rotas e assere `document.title` e o
conteúdo das metas nas duas, mais a igualdade com o que a função servidora produz para as mesmas
entradas.

---

### P3: A categoria declara sua vitrine como `ItemList`

**User Story**: Como responsável pelo SEO, quero que a página de categoria declare os produtos que
mostra, para concorrer por resultado de lista.

**Why P3**: Ganho real e barato, mas nenhum dos objetivos acima depende dele.

**Acceptance Criteria**:

1. WHEN uma página de categoria é entregue THEN o HTML SHALL conter um `CollectionPage` com
   `mainEntity: ItemList`, cujos itens são os produtos da primeira página da vitrine, na **mesma**
   ordem que a loja desenha.

---

## Edge Cases

- WHEN `seo_title` tem mais de 60 caracteres THEN o título SHALL ser entregue **íntegro** — truncar
  no servidor esconde da Adri o que ela escreveu; quem corta é o buscador, e o painel já é onde ela vê.
- WHEN `seo_description` passa de 160 THEN idem: entregue íntegra. O truncamento de A5 vale **só**
  para a derivação de fallback, onde a origem é HTML corrido sem intenção editorial.
- WHEN `description` é HTML vazio ou só o bloco de FAQ THEN a descrição derivada SHALL cair na
  descrição da loja em vez de ficar vazia.
- WHEN a categoria pedida existe mas está inativa THEN a resposta SHALL ser a da 404 (`noindex`, sem
  canônica) — a RLS já a esconde, e declarar canônica para conteúdo que não é servido é pior que nada.
- WHEN o `?variant=` da URL aponta para uma variação válida THEN o `Product` SHALL continuar
  refletindo a variação (comportamento que a `30` já entrega), mas `offers.url` e a canônica SHALL
  permanecer sem query (AC 4 do terceiro P1).
- WHEN dois produtos têm o **mesmo** `seo_title` THEN nada falha — mas o guarda de unicidade do
  segundo P1 SHALL reportá-lo como aviso, porque é curadoria a corrigir no painel, não defeito de código.
- WHEN a origem configurada estiver ausente ou não for absoluta THEN a função SHALL servir a página
  com metadado genérico e **sem** canônica, e registrar o erro — nunca emitir canônica relativa nem
  `og:url` quebrado em 719 páginas de uma vez (mesmo modo de falha que `originRefusal` já recusa no
  sitemap).

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| SEO-01 | P1 mensageria — título por rota, com sufixo condicional | Design | Pending |
| SEO-02 | P1 mensageria — descrição por rota, idêntica nas três tags | Design | Pending |
| SEO-03 | P1 mensageria — `og:image` do produto por `render/image`, sem dimensões declaradas | Design | Pending |
| SEO-04 | P1 mensageria — fallback de imagem para a arte da marca, com dimensões | Design | Pending |
| SEO-05 | P1 mensageria — `og:url` e `canonical` com o mesmo valor | Design | Pending |
| SEO-06 | P1 mensageria — `og:type`, `og:site_name`, `og:locale`, `twitter:card` | Design | Pending |
| SEO-07 | P1 mensageria — fallback de título e descrição (os 4 sem SEO) | Design | Pending |
| SEO-08 | P1 mensageria — escape de atributo HTML | Design | Pending |
| SEO-09 | P1 Google — metadado próprio nas 4 institucionais | Design | Pending |
| SEO-10 | P1 Google — metadado e canônica de categoria por `categoryHref` | Design | Pending |
| SEO-11 | P1 Google — `noindex` nas 7 de `NON_INDEXABLE_PATHS`, sem canônica | Design | Pending |
| SEO-12 | P1 Google — 404 com `noindex` e sem canônica | Design | Pending |
| SEO-13 | P1 Google — origem em variável, zero literal de host | Design | Pending |
| SEO-14 | P1 Google — exatamente uma instância de cada tag no documento | Design | Pending |
| SEO-15 | P1 IA — `Organization` em toda rota | Design | Pending |
| SEO-16 | P1 IA — `WebSite` + `SearchAction` na home | Design | Pending |
| SEO-17 | P1 IA — `Product` com `description`, `brand`, `itemCondition` | Design | Pending |
| SEO-18 | P1 IA — `offers.url` canônica, sem `?variant=` | Design | Pending |
| SEO-19 | P1 IA — `FAQPage` espelhando `ProductFaq`, omitido quando vazio | Design | Pending |
| SEO-20 | P1 IA — `BreadcrumbList` igual à trilha desenhada | Design | Pending |
| SEO-21 | P1 IA — escape de `<` no JSON-LD, um `@type` por documento | Design | Pending |
| SEO-22 | P1 transporte — função no deploy da Vercel, `X-Vercel-Cache: HIT` | Design | Pending |
| SEO-23 | P1 transporte — `Content-Type` entregue é `text/html` | Design | Pending |
| SEO-24 | P1 transporte — shell do próprio build, nunca buscado | Design | Pending |
| SEO-25 | P1 transporte — falha de leitura serve a página, com log | Design | Pending |
| SEO-26 | P1 transporte — `rewrite` e override órfão removidos juntos | Design | Pending |
| SEO-27 | P2 cliente — hook atualiza `<head>` na navegação, e remove no unmount | Design | Pending |
| SEO-28 | P2 cliente — mesma função de `core/seo` que o servidor usa | Design | Pending |
| SEO-29 | P3 — `CollectionPage`/`ItemList` na categoria | — | Pending |

**Coverage:** 29 no total · 0 mapeados para tarefas · 29 não mapeados ⚠️ (normal antes de Design)

---

## Success Criteria

Todos medidos, nenhum por inspeção de código.

- [ ] **719 de 719 URLs do sitemap entregam par `(title, description)` único**, verificado por
      varredura que busca cada uma e compara. Hoje: 1 par para 719 URLs.
- [ ] **`curl` de três produtos** (um com SEO curado, um dos 4 sem, um sem imagem) mostra o produto
      em `<title>`, `og:title`, `og:description` e `og:image`, e a imagem responde **200**.
- [ ] **O validador de compartilhamento do Facebook e um WhatsApp real** mostram card com nome,
      descrição e foto do produto — nos mesmos três.
- [ ] **Rich Results Test sem erro** em produto, categoria e home, reconhecendo `Product`, `Offer`,
      `BreadcrumbList`, `FAQPage`, `Organization` e `WebSite`.
- [ ] **`X-Vercel-Cache: HIT`** na segunda batida da mesma URL de produto, e `Content-Type` entregue
      `text/html; charset=utf-8` (`AD-021` — a prova é o tipo, nunca o status).
- [ ] **Sem regressão de baseline**: lint ≤ 27/5, tipos 0·0·0, e a suíte de cada workspace medida
      **por workspace, com exit code capturado** (`CLAUDE.md`).
- [ ] **`packages/core/src/payment/**` sem uma linha alterada**, conferido por
      `git diff --name-only` no gate — metadado não tem por que tocar no código de dinheiro.
- [ ] **Um guarda novo que leia o `App.tsx` do disco** e derrube a suíte quando uma rota nova não
      receber classificação de metadado, com **âncora de contagem** e sensibilidade provada por
      injeção de falha. Mesmo molde de `sitemapRoutes.test.ts`, que já é bidirecional.
