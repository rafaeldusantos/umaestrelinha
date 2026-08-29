# Design — Sitemap da loja

> Cobre a [`spec.md`](./spec.md) desta pasta. A `BL-007` dizia que *"o item 1 é a decisão que dá o
> trabalho"* — onde o sitemap é gerado. Ela foi **tomada pelo usuário em 2026-08-29**, e o §1 registra
> o que ela compra, o que ela custa e o que foi medido antes.

---

## 1. A arquitetura: edge function da Supabase, irmã da `google-feed`

**Escolhido pelo usuário: (a).** `/sitemap.xml` é um `rewrite` do `vercel.json` para
`supabase/functions/sitemap`, que lê o catálogo e serializa o `<urlset>` a cada requisição.

### 1.1 O critério que decidiu

O usuário: *"mudanças ou cadastros de novos produtos e categorias e páginas devem atualizar o
sitemap"*. Ler o banco por requisição satisfaz isso **por construção** — não existe artefato
intermediário para envelhecer, nem passo de regeneração para alguém esquecer. A alternativa de build
(`dist/sitemap.xml`) só era verdade no dia do deploy, e a curadoria da Adri acontece **no painel**,
sem deploy nenhum.

### 1.2 O que a escolha custa, medido e aceito

Três custos, os três medidos antes da decisão. Nenhum é hipótese:

| Custo | Medição | Como fica contido |
| --- | --- | --- |
| **A Vercel não cacheia `rewrite` para host externo** | 2026-08-29 em `/produtos/:slug`: 4 batidas, **4 `X-Vercel-Cache: MISS`**, ~1s cada | Aceito sem mitigação. Quem busca sitemap é rastreador, algumas vezes por dia — ~1s por leitura não é custo de cliente. A function ainda declara `Cache-Control` para intermediários que respeitem. |
| **`application/xml` NÃO atravessa `*.supabase.co`** — medido em 2026-08-29, ver §1.2.1 | A function respondeu `application/xml; charset=utf-8` e o gateway entregou **`text/plain`**, com `nosniff` acrescentado | O `vercel.json` reimpõe `Content-Type: application/xml; charset=utf-8` — o mesmo mecanismo provado em produção no `BUG-20260829`. Ele deixou de ser rede extra e é **carga**. |
| **É o terceiro `rewrite` para `*.supabase.co`** | A `BL-017` existe para remover os dois que já há | Registrado como custo aceito na `AD-022`. A mitigação estrutural é o §2: **toda a regra é pura e vive em `packages/core/src/sitemap`**, então o dia em que a `BL-017` mover o transporte, o sitemap vai junto sem uma linha de regra mudar. É a lição da `AD-020`/`AD-021`: errar o transporte é barato quando o **dono** está certo. |

#### 1.2.1 A medição que a `AD-021` deixou pendente, agora feita

A `AD-021` registrou que a Supabase reescreve `text/html` para `text/plain` no domínio compartilhado,
e deixou por responder se o mesmo valia para `application/xml` — a `google-feed` declara esse tipo,
mas está com o interruptor desligado, então o que se mediu na época foi o **404** dela, que é
`text/plain`.

Com a function do sitemap implantada (aditiva, sem rota ligada), a pergunta foi respondida em
**2026-08-29**:

```
GET https://hgkrsfpupypxtygjgthf.supabase.co/functions/v1/sitemap
HTTP/1.1 200 OK
Content-Type: text/plain            ← a function declara application/xml; charset=utf-8
Cache-Control: public, max-age=600  ← atravessa INTACTO
X-Content-Type-Options: nosniff     ← acrescentado pelo gateway
```

**Assinatura idêntica à do `BUG-20260829`**: os headers da function são respeitados e **só o tipo é
reescrito**. Não é específico de `text/html` — o gateway impõe `text/plain` a qualquer tipo que possa
ser interpretado pelo navegador, e acrescenta `nosniff` para garantir.

Consequência direta: **o header do `vercel.json` é carga, não zelo.** Sem ele, `/sitemap.xml`
responderia 200, com XML correto no corpo e `text/plain` na entrega — a forma de quebrar que este
projeto mais paga caro. O corpo de **erro** da function é `text/plain` de propósito, e por isso não é
afetado.

### 1.3 O que foi medido antes de fixar o wiring, e mudou o desenho

A function roda em **Deno**, que só resolve especificador relativo com **extensão explícita**. Medido
em 2026-08-29 com `node v24.18.0` de dentro de `apps/store` — mesma propriedade, outro runtime:

| Tentativa | Resultado |
| --- | --- |
| `import('@estrelinha/core/shopping')` | **20 exports** — reproduz a medição da `BL-017` |
| `import('@estrelinha/core/menu')` | **falha**: `Cannot find module …/menu/menu` |

**A causa é a regra que ninguém tinha escrito**: um módulo de `core` só é consumível fora de um
bundler quando **todo** especificador relativo do grafo tem `.ts` explícito. `shopping` e `routes`
foram escritos assim — justamente por causa do Deno —, e `menu` não (`menu/index.ts` faz
`export * from './menu'`). Nada acusa, porque Vite e vitest resolvem as duas formas.

Isso não é detalhe: **o dono da canônica de categoria é `categoryHref`, e ele mora em `core/menu`**.
Sem a extensão, a function não alcança o dono e seria empurrada a remontar `/pai/filha` à mão — o
"defeito 01" nascendo dentro da feature que existe para enumerar canônicas. Daí a `T03`.

---

## 2. Onde cada regra mora

O princípio do repositório é o "defeito 01": **se dois consumidores leem a mesma regra, ela vai para
`packages/core`.** A regra "quais URLs a loja tem" **já tem dono** (`@estrelinha/core/routes` +
`@estrelinha/core/menu`), e esta feature **não cria um segundo** — ela enumera o dono.

```
packages/core/src/
  routes/routes.ts        (+) SITEMAP_STATIC_PATHS, NON_INDEXABLE_PATHS   ← classificação de rota
  menu/index.ts           (~) './menu' → './menu.ts'                      ← alcançável pelo Deno
  xml/escape.ts           (novo) escapeXml                                 ← movido de shopping/
  paging/readAll.ts       (novo) readAllPages                              ← extraído de google-feed
  sitemap/
    types.ts              SitemapUrl, SitemapProduct, SitemapCategory
    urls.ts               sitemapUrls()      — catálogo → URLs canônicas
    render.ts             renderSitemapXml() — URLs → documento
    index.ts              barrel

supabase/functions/sitemap/
  index.ts                wiring: env, client, Deno.serve                  ← só isso
  handlers.ts             handleSitemap(deps)                              ← toda a decisão, injetada
  __tests__/handlers.test.ts

apps/store/
  vercel.json             (+) rewrite /sitemap.xml  +  header de Content-Type
  public/robots.txt       (+) a linha Sitemap:
  src/app/__tests__/sitemapRoutes.test.ts        (novo guarda)
  src/shared/lib/__tests__/vercelRedirects.test.ts  (existente, ganha vizinhas)
  src/shared/lib/__tests__/robotsSource.test.ts  (novo guarda)

supabase/config.toml      (+) [functions.sitemap] verify_jwt = false
.github/workflows/sitemap-check.yml   rotina diária que prova a ENTREGA
```

### 2.1 As duas extrações para `core`, e por que não são scope creep

**`escapeXml` → `packages/core/src/xml/escape.ts`.** Hoje mora em `shopping/xml.ts`, e o sitemap é o
**segundo** consumidor. Copiar seria o "defeito 01" literal: duas escritas do mesmo escape divergindo
sem quebrar nada. Movimento puro; `shopping/xml.ts` reexporta e o barrel de `shopping` não muda de
superfície, então o import relativo das edge functions segue resolvendo pela cadeia. `xml.test.ts` e
`shoppingParity.test.ts` são o gate.

**`readAllRows` → `packages/core/src/paging/readAll.ts` como `readAllPages`.** A leitura completa
conferida contra a contagem exata é a resposta do repositório ao teto de 1.000 do PostgREST — o
defeito que quebrou o importador na `21` e que a `BL-008` mantém aberto. Ela existe hoje **uma vez**,
dentro de `google-feed/handlers.ts`, acoplada a `FeedDeps`. A function do sitemap é o segundo
consumidor **no mesmo runtime, com o mesmo client e o mesmo teto**; escrever a terceira cópia é o que
o `CLAUDE.md` proíbe em letra. A extraída é pura (recebe `total` e `readPage` injetados), e
`readAllRows` vira adaptador de três linhas — **os testes da `google-feed` não são editados**, e é
isso que prova que o comportamento não mudou.

> **`tools/catalog-import/src/write/db.ts::selectAll` fica onde está**, e é decisão declarada: é um
> algoritmo **diferente** — pagina até uma página vir menor que o teto, sem `count` —, roda em Node
> com uma interface `TableClient` própria, e não tem segundo consumidor. Unificá-lo é refatoração do
> importador, não desta feature.

### 2.2 A classificação de rota (`SMP-24`)

`core/routes` ganha duas listas, e a obrigação de que a união delas cubra o `App.tsx`:

```ts
/** As rotas de conteúdo público e estável — as únicas rotas fixas que entram no sitemap. */
export const SITEMAP_STATIC_PATHS: readonly string[] = [
  '/', '/sobre', '/politicas', MATERIAL_GUIDE_PATH,
]

/** Rotas declaradas que ficam FORA do sitemap, cada uma com o motivo escrito ao lado. */
export const NON_INDEXABLE_PATHS: readonly { path: string; reason: string }[] = [
  { path: '/carrinho',   reason: 'estado do navegador, não conteúdo' },
  { path: '/checkout',   reason: 'transacional' },
  { path: '/pedido/:id', reason: 'privado — o pedido de uma pessoa' },
  { path: '/conta',      reason: 'privado' },
  { path: '/favoritos',  reason: 'privado' },
  { path: '/entrar',     reason: 'autenticação' },
  { path: '/busca',      reason: 'espaço de rastreio infinito por parâmetro' },
]
```

O guarda (`sitemapRoutes.test.ts`) lê o `App.tsx` **do disco** e exige, **nas duas direções**, que
toda rota declarada esteja em exatamente um de quatro conjuntos: `SITEMAP_STATIC_PATHS`,
`NON_INDEXABLE_PATHS`, as **dinâmicas** (`/produtos/:slug`, `/:slug`, `/:parentSlug/:slug` — cobertas
por catálogo) ou `LEGACY_REDIRECTS` (mais o curinga `*`). **Âncora de contagem dupla** (`SMP-25`,
`L-021`): arquivo lido com conteúdo, e nº de rotas encontradas conferido.

Ele **não** deriva a lista de rotas de `ROUTE_SLUGS`: a régua nunca pode ser o objeto medido. A fonte
é o `App.tsx`; `ROUTE_SLUGS` é outro consumidor dele, guardado por `reservedSlugs.test.ts`.

---

## 3. A regra pura: `core/sitemap`

### 3.1 `sitemapUrls` — catálogo para URLs

```ts
export interface SitemapUrl { loc: string; lastmod?: string | null }

export const sitemapUrls = (input: {
  origin: string
  products: readonly SitemapProduct[]     // { slug, updated_at }
  categories: readonly SitemapCategory[]  // MenuCategory + updated_at
  staticPaths?: readonly string[]         // default: SITEMAP_STATIC_PATHS
}): SitemapUrl[]
```

- **Produto** (`SMP-02`): `productPath(slug)`. **Categoria** (`SMP-03`): `categoryHref(categories, id)`
  — a **mesma** função que `resolveCategoryRoute` usa para declarar a canônica na tela, o que garante
  por construção que sitemap e `<link rel="canonical">` não podem divergir. Filha com pai visível sai
  em dois segmentos; pai invisível degrada para um, que é a forma que a loja serve.
- **Absoluta e sem barra** (`SMP-05`): origem normalizada sem barra final; `'/'` vira a origem nua.
- **Legadas fora** (`SMP-06`): por construção — nada aqui lê `LEGACY_REDIRECTS`, `product_redirects`
  nem `category_redirects`. O teste assere a **ausência** das quatro formas.
- **`lastmod`** (`SMP-08`, `SMP-15`): `updated_at` da linha lida naquela requisição, em W3C Datetime;
  omitido quando nulo e nas estáticas.
- **Ordem** (`SMP-12`): estáticas na ordem da lista → categorias por `sort_order` e depois `slug` →
  produtos por `slug`.
- **Duplicata**: `sitemapUrls` **lança** se duas `<loc>` coincidirem — mesmo raciocínio de
  `renderFeedXml` com `offer_id` repetido.

### 3.2 `renderSitemapXml` — URLs para documento

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://umaestrelinha.com.br/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah</loc>
    <lastmod>2026-08-16T14:58:34.849+00:00</lastmod>
  </url>
</urlset>
```

- **Percent-encode e depois XML-escape** (`SMP-10`), nessa ordem: o caminho passa por
  `encodeURI`-equivalente e só então por `escapeXml`. Invertido, `&` viraria `&amp;` e depois
  `%26amp%3B`. Medido: os **680** slugs de hoje são `[a-z0-9-]` puro, então a codificação é no-op —
  e é exatamente por isso que o teste usa um slug sintético com `&` e acento, senão a regra nasceria
  não exercitada.
- Sem `<changefreq>` e sem `<priority>` (`SMP-09`). Lança em lista vazia.

---

## 4. A function: `supabase/functions/sitemap`

Molde da `google-feed`, e por decisão declarada (`AD-004`): `index.ts` só wiring (env, client,
`Deno.serve`), toda a lógica em `handlers.ts` com dependências injetadas, testada em vitest fora do
Deno. Importa `core` por caminho relativo com extensão explícita, como as irmãs.

```
handleSitemap(deps):
  1. origem ausente ou não http(s) absoluta          → 503 (SMP-18)
  2. countProducts / countCategories (count=exact)
  3. readAllPages nas duas tabelas, order('id')      → truncou? LANÇA → 503 (SMP-16, SMP-19)
  4. zero produtos                                   → 503 (SMP-17)
  5. sitemapUrls → renderSitemapXml                  → lança? → 503
  6. 200 application/xml; charset=utf-8 + Cache-Control
```

**Nenhum caminho de erro devolve `<urlset>`** (`SMP-20`): o corpo de falha é `text/plain`, como o da
`google-feed` — e `text/plain` é o único tipo que já se mediu atravessar o gateway intacto.

**A chave é a publicável (`anon`), não a de service role** — é a única diferença deliberada em relação
à `google-feed`. Com ela, a visibilidade do sitemap **é** a RLS (`is_active`/`active`), sem uma
segunda cópia da política em `.eq()`. `config.toml` recebe `[functions.sitemap] verify_jwt = false`
pelo mesmo motivo das irmãs: quem chega é rastreador, e o conteúdo já é público.

### 4.1 O que muda no `vercel.json`

```jsonc
"rewrites": [
  { "source": "/sitemap.xml",               "destination": "https://<ref>.supabase.co/functions/v1/sitemap" },
  { "source": "/feeds/google-shopping.xml", "destination": "…/google-feed" },
  { "source": "/produtos/:slug",            "destination": "…/product-page?slug=:slug" },
  { "source": "/(.*)",                      "destination": "/index.html" }   // sempre o último
],
"headers": [
  { "source": "/sitemap.xml", "headers": [{ "key": "Content-Type", "value": "application/xml; charset=utf-8" }] },
  …
]
```

O header **não é zelo**: é a rede que torna a entrega independente do que o gateway
`*.supabase.co` faça com `application/xml` — pergunta que a medição de 2026-08-29 deixou sem
resposta. A Vercel sobrescreve tipo de resposta proxiada, e isso está **provado em produção**
(`BUG-20260829`, três produtos conferidos).

---

## 5. O cron: ele prova a entrega, não regenera nada

O usuário pediu "atualização disparada por cron". **Com a function servindo ao vivo, não há o que
regenerar** — a exigência de frescor já está satisfeita por construção (`SMP-14`), e um cron de
regeneração ficaria sem trabalho. Então ele recebe o trabalho que de fato protege esta rota.

**Por que essa é a resposta certa, e não uma troca de assunto**: o modo de falha desta rota é
invisível. O `BUG-20260829` devolvia **200, corpo certo e JSON-LD certo**, com a página quebrada — e
o `curl -I` que o `CLAUDE.md` prescrevia teria declarado verde. Nenhum teste do repositório alcança
isso, porque **a asserção e a entrega têm donos diferentes**. Um cron que confere a entrega é o único
mecanismo do projeto capaz de ter achado aquele defeito no dia.

`.github/workflows/sitemap-check.yml`, `schedule` **diário** + `workflow_dispatch`. Sem credencial
nenhuma — só HTTP público:

1. `GET /sitemap.xml` → 200, `Content-Type` **contém** `xml`, corpo abre em `<?xml` e **parseia**.
2. contagem de `<url>` **≥ âncora** declarada (`SMP-28`) — a mesma disciplina dos guardas de
   varredura, aplicada à entrega. Âncora, não igualdade: o catálogo cresce, e a rotina não pode
   reprovar por isso.
3. `GET /robots.txt` → **uma** linha `Sitemap:`, e o host dela é o host requisitado (`SMP-29`) — é a
   contenção do segundo dono da origem que §1 assumiu.
4. uma `<loc>` do documento responde 200 (`SMP-30`).

**Periodicidade: diária.** Duas requisições HTTP por dia, sem segredo, e o tempo em que uma quebra
passa despercebida cai de "até alguém olhar o Search Console" para **24 h**. Semanal multiplicaria
isso por 7 sem economizar nada mensurável.

---

## 6. A ordem de execução, e a medição que vem cedo

O usuário instruiu: *"se a solução servir XML por edge function, meça isso cedo, não no fim"*. A
ordem das tarefas obedece:

1. **Local primeiro** (`T09`): `supabase functions serve sitemap` contra a instância local e `curl` —
   prova de uma vez a resolução de módulo pelo **Deno**, o XML, e a contagem de 719.
2. **Hospedado depois** (`T10`): `supabase functions deploy sitemap`. A function é **aditiva e não
   está ligada a rota nenhuma** enquanto o `vercel.json` não for publicado, então o deploy não muda
   nada do que está no ar. Aí se mede o `Content-Type` **entregue** por `*.supabase.co` para
   `application/xml`, e o resultado é anotado neste arquivo e no `CLAUDE.md`.
3. **Só então** o `rewrite` e o header (`T11`).

---

## 7. Testes — o que prova o quê

| Arquivo | Onde | O que derruba a suíte |
| --- | --- | --- |
| `urls.test.ts` | `core/src/sitemap/__tests__` | produto fora de `/produtos/:slug`; filha em um segmento com pai visível; `<loc>` relativa, com barra final ou com query; forma legada presente; `lastmod` inventado para estática; ordem não determinística; duplicata aceita |
| `render.test.ts` | idem | `<changefreq>`/`<priority>` de volta; namespace errado; escape na ordem errada (slug sintético com `&` e acento); documento vazio aceito |
| `readAll.test.ts` | `core/src/paging/__tests__` | leitura truncada aceita; total lido ≠ contagem passando; paginação parando na primeira página |
| `handlers.test.ts` | `supabase/functions/sitemap/__tests__` | 200 com origem ausente ou malformada; 200 com contagem divergente; 200 com zero produtos; **`<urlset>` em corpo de erro**; `Content-Type` da resposta boa deixando de ser `application/xml` |
| `sitemapRoutes.test.ts` | store `app/__tests__` | rota nova no `App.tsx` sem classificação; entrada classificada que deixou de ser rota; âncora dupla ausente |
| `robotsSource.test.ts` | store `shared/lib/__tests__` | `public/robots.txt` sem linha `Sitemap:`, com mais de uma, com URL relativa, ou não terminando em `/sitemap.xml`; diretiva `User-agent` anterior alterada |
| `vercelRedirects.test.ts` | store `shared/lib/__tests__` (**existente, ganha vizinhas**) | o `rewrite` de `/sitemap.xml` sumir ou sair da frente do catch-all; o header de `Content-Type` sumir; o catch-all sair do fim; a contagem de `headers` mudar sem revisão |

**Sensor embutido** (padrão de `faqSuggestion.test.ts` e `shoppingParity.test.ts`): `urls.test.ts`
inclui um caso que **assere a reprovação** de um gerador ingênuo — `'/' + slug` para categoria filha
—, provando que a régua distingue as duas formas em vez de aceitar as duas.

**O que nenhum teste pega, e por isso existe o §5**: o `Content-Type` **entregue** e a contagem no
documento **servido**. A asserção e a entrega têm donos diferentes (`AD-021`).

---

## 8. Riscos e saídas

| Risco | Sinal | Saída |
| --- | --- | --- |
| `application/xml` reescrito por `*.supabase.co` | a medição do `T10` | Já contido: o header do `vercel.json` reimpõe o tipo. Se nem isso funcionar, servir como `text/plain; charset=utf-8` (o único tipo medido atravessando intacto) e reimpor na Vercel. |
| A extração de `escapeXml`/`readAllRows` quebrar a `google-feed` | suíte de `@estrelinha/functions` | Reverter a extração e importar por caminho relativo entre módulos de `core`. Registrar como `SPEC_DEVIATION`. |
| A extensão explícita em `menu/index.ts` quebrar algum consumidor | suítes de core, store e backoffice | Improvável (Vite e vitest resolvem as duas formas), mas é mudança de resolução: as três suítes são o gate, e a reversão é a mesma linha. |
| O Deno não resolver o `import type` bare de `core/menu` (`@estrelinha/supabase/types`) | `supabase functions serve` no `T09` | É a razão de o `T09` ser local e vir **antes** de tudo. Saída: trocar o `import type` por tipo estrutural local em `menu.ts` — é tipo, não regra. |
| `STORE_PUBLIC_URL` apontando para o `.vercel.app` no cutover | `<loc>` com host provisório; a rotina diária acusa divergência com o `robots.txt` | **Já é pendência conhecida** — o mesmo valor de que o `<g:link>` das 3.233 ofertas depende. Trocar os dois juntos, mais a linha do `robots.txt`. |
| Cold start da function | primeira requisição lenta | Aceito. Quem busca sitemap é rastreador. |

---

## 9. O que esta feature NÃO decide

- Não mexe em `packages/core/src/payment/**` (conferido no gate por `git diff --name-only`).
- Não muda `redirects` do `vercel.json`, nem a `product-page`, nem o interruptor do feed.
- Não fecha a `BL-007`: o `BreadcrumbList` continua aberto, e o `BACKLOG.md` passa a dizer isso.
