# 68 — SEO por variação: uma página no Google para cada opção marcada

> Depende da [`67`](../67-filtros-nas-variacoes/spec.md) e **só pode ser implementada depois dela**:
> a `68` **lê** `public.product_option_filter_values` (peça, eixo, texto da opção, valor de filtro) e
> não a redefine. Não há migration nesta feature.

## Problem Statement

A página de uma peça responde por uma URL só no Google, e a peça vende várias coisas diferentes.
Medido no banco local (2026-10-18): das 691 peças ativas, **395 têm o eixo `Cor`**, todas com pelo
menos **duas** cores ativas (85 com duas, 305 com três, 5 com quatro ou cinco), num total de **1.107
pares (peça, cor)**. "Pingente Afetivo Pata com Cinzas de Cremação" existe em Prata 925, em Prata 925
folheada a ouro e em Prata 925 folheada a ouro rosé, e quem procura a versão rosé encontra, quando
encontra, a página da peça aberta na primeira cor da grade.

A página já sabe abrir numa variação (`?variant=`, `findVariantByPublicId` no cliente e
`variantByPublicId` na edge function `product-page`), mas o `<head>` ignora isso nos dois lados: o
título é o da peça (`productPageMeta`), a canônica do cliente é `/produtos/<slug>` sem query
(`ProductPage.tsx:79`), e o HTML **servido** não traz `<link rel="canonical">` nenhum — só `og:url`,
também sem query (`handlers.ts:301`). O sitemap proíbe query por regra (`SMP-07` da `33`).

Indexar todas as variações seria pior que não indexar nenhuma: são 3.380 linhas, 144 numa peça só
("Colar coração com letra", Cor × Letra × gravação), quase todas diferentes da vizinha por uma letra.
A `67` dá à Adri a ferramenta para dizer quais opções **importam** (marcar "Cor = Prata 925" com o
valor de filtro *Prata 925*). Esta feature transforma essa marcação no sinal para o Google: **a
opção marcada ganha título, canônica e entrada no sitemap próprios; o resto continua sendo a peça.**

## Goals

- [ ] Toda opção marcada num filtro (pelas regras de SVR-02/03) tem **uma** URL indexável,
      `/produtos/<slug>?variant=<id>`, autocanônica, com título "Peça — Opção", no cliente **e** no
      HTML servido, pela **mesma** função.
- [ ] Toda outra URL com `?variant=` (Letra, gravação, opção sem marcação, id inválido) canoniza
      para a peça, como hoje.
- [ ] O sitemap lista as URLs de opção, e o conjunto de `<loc>` é, por construção, o conjunto de
      URLs que se declaram canônicas.
- [ ] O feed do Google Shopping e a paridade preço/disponibilidade com a landing page não mudam
      (`shoppingParity.test.ts` passa sem uma asserção tocada).
- [ ] Remover a marcação no painel tira a página do Google pelo caminho normal (canônica volta à
      peça, `<loc>` sai do sitemap), sem passo manual.

## Out of Scope

| Item | Razão |
| --- | --- |
| Indexar todas as variações (3.380) ou combinações de dois eixos (Cor × Tipo de elo) | decisão do usuário (2026-10-18): página quase duplicada. Combinação multiplicaria as URLs pelo produto dos eixos |
| Letra, gravação, tamanho e qualquer opção **sem** marcação ganharem página | decisão do usuário. Continuam canonizando para a peça |
| Curadoria da marcação (telas, sugestão, regra da loja) | feature `67` |
| Landing de filtro indexável (`/prata-925`, categoria filtrada) | a canônica da categoria continua sem query (`66`, Out of Scope) |
| Mudar o `<h1>`, a galeria ou o conteúdo visível da página por opção | a página já abre na variação pedida (foto, preço, seletor); o pedido é o `<head>` |
| O seletor da página trocar a URL ao escolher outra opção | é escolha da cliente, não navegação (`ProductPage.tsx`, comentário do `GSH-10`). A descoberta das páginas de opção é pelo sitemap e pelo `ProductGroup` (P2) |
| Campo de título/descrição curado **por opção** no painel | a derivação (SVR-08/09) cobre; campo novo seria cadastro de 1.107 textos |
| Limpar ou unificar o texto das opções, e o nome da peça que já cita o material ("… em Prata 925") | cadastro da dona (`67`, Out of Scope). Ver *Assumptions* sobre o título |
| Mudar o feed do Google Shopping (`<g:link>`, `<g:title>`, `<g:id>`) | o feed já aponta cada oferta para a própria variação; mexer nele reabre a revisão de 3.233 itens no Merchant Center |
| `hreflang`, `noindex` por variação, `IndexNow`, envio manual ao Search Console | a loja é de um idioma; `noindex` com canônica é sinal contraditório; a descoberta é o sitemap |
| `301` ao remover a marcação | não existe redirect por query string na Vercel, e a URL continua servindo a página (só muda a canônica) |
| Transporte do `<head>` servido para outras rotas, e o cache de borda que a Vercel não faz | `BL-017` / A1 da `36`. A `68` só usa o transporte que já existe (`/produtos/:slug`) |
| Evento de GA4 próprio | o `page_view` já leva o título e a URL (`AD-048`) |
| `Organization`, `BreadcrumbList`, `FAQPage` | outra metade da `36` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quais URLs viram página própria | uma por (peça × opção marcada num filtro) | decisão do usuário (2026-10-18) | y |
| Feature separada da `67` | sim, implementada depois dela | decisão do usuário | y |
| Forma da URL indexável | `/produtos/<slug>?variant=<publicVariantId da representante>` — **byte a byte igual** ao `<g:link>` que o feed já publica para aquela variação | a página, o card da `67` e o feed já falam `?variant=`; um segundo esquema (`?cor=prata-925`) seria um segundo dono do endereço de uma variação, e a página do anúncio e a página orgânica da mesma oferta passariam a ser URLs diferentes | y (2026-10-19) |
| A representante de uma opção | entre as variações **elegíveis** da peça com aquele texto (ativa e com preço, `feedExclusion === null`), a de menor `position`; empate pelo `publicVariantId` em ordem crescente. **Estoque não entra** | a canônica tem de ser estável. Preferir estoque (como `representativeVariant` e o card da `67` fazem) trocaria a canônica de id cada vez que a primeira cor esgota e volta — canônica que muda de id é pior que nenhuma. Medido: zero empates de `position` entre variações ativas da mesma peça hoje; o desempate existe para o dia em que houver | y (2026-10-19) |
| Estabilidade quando a grade muda | aceita-se que a representante mude quando a Adri reordena, desativa, tira o preço ou apaga a variação representante. A URL antiga continua abrindo (se a variação existe e é elegível, ela canoniza para a nova representante; se não, para a peça) | o painel atualiza variação **no lugar** (`persistProduct.ts:289`, medido pela `67`), então o id só muda quando a linha sai da grade, que é raro. Fixar a representante em coluna seria um segundo dono de "qual é a página desta opção" | y (2026-10-19) |
| Peça com marcação em dois eixos (Cor **e** Tipo de elo) | **um eixo só** gera página: o primeiro, na ordem de `products.options`, que tem ao menos um texto indexável. Os textos marcados dos outros eixos canonizam para a peça | duas páginas por eixo podem ter a **mesma** representante (a primeira variação é Prata 925 **e** Chaveiro), e aí uma URL teria dois títulos. Dentro de um eixo só, textos diferentes têm representantes diferentes por construção. Medido: com essa regra o teto é ~1.575 páginas se tudo for marcado (Cor 958, eixos de elo ~455, resto ~160); combinação passaria disso | y (2026-10-19) |
| Eixo com um texto só entre as variações elegíveis | não gera página | a página da opção seria a página da peça com outro título — duplicata exata | y (2026-10-19) |
| Título da página de opção | `"{nome da peça} — {texto da opção}"`, com espaço colapsado; com a marca (`brandedTitle`) **só se** o resultado couber em 60 caracteres, senão sem a marca | o **texto da opção** (e não o nome do valor de filtro) porque é o que a página mostra no seletor, é único dentro do eixo, e uma opção pode ter vários valores marcados (Prata 925 **e** Folheado a ouro) ou dois textos podem ter o mesmo valor — o nome do valor colidiria. O **nome** (e não o `seo_title`) porque 413 `seo_title` já terminam em marca (`\| Uma Estrelinha`, `\| UE`, medido pela `62` no hospedado), e emendar a opção depois da marca é frágil. Sem marca acima de 60 porque o buscador corta por volta disso e a opção, que é o que distingue esta página, está no fim. Medido: mediana de 68 caracteres sem a marca, e **1.059 de 1.107** pares passariam de 60 com ela | y (2026-10-19) |
| Nome da peça que já cita material ("… em Prata 925 — Prata 925 Folheado a Ouro Rose") | aceito sem tratamento | medido: 162 das 395 peças com `Cor` citam material no nome. Tirar palavras do nome é reescrever cadastro por regex, e erra | y (2026-10-19) |
| Descrição da página de opção | `summarize("{texto da opção}. {descrição da peça}")`, com a descrição da peça vinda de `productPageMeta` (curada → derivada → loja → piso), cortada em 160 | é derivada, então vale o teto da derivação (`DESCRIPTION_MAX`). Sem o prefixo, as 1.107 páginas teriam a mesma descrição da peça | y (2026-10-19) |
| `?variant=` de uma variação **não representante** de uma opção indexável (ex.: Prata 925 com Letra B) | a página abre nela (como hoje); título e descrição são os **da opção**; canônica é a da **opção** (a representante) | todas as letras de Prata 925 são o mesmo conteúdo para o buscador e se agrupam numa URL. Mandá-las para a peça perderia o sinal da cor que o link carrega | y (2026-10-19) |
| `?variant=` inválido, de outra peça, inativo ou sem preço | canônica e `<head>` da peça | é o mesmo recuo que a página e a function já fazem para a seleção | y (2026-10-19) |
| Outros parâmetros na URL (`utm_*`, `gclid`, `fbclid`) | ignorados no `<head>`: a canônica nunca os carrega | link de campanha não é página nova | y (2026-10-19) |
| Página que canoniza para outra | sem `noindex` | canônica e `noindex` juntos são sinal contraditório; a canônica basta | y (2026-10-19) |
| `<head>` acompanha a URL, não a seleção | título e canônica saem do `?variant=` lido **na abertura** e não mudam quando a cliente troca de cor no seletor (a URL também não muda) | o `<head>` descreve o endereço. Mudar o título a cada toque produziria um `page_view` por toque | y (2026-10-19) |
| Navegação SPA de `?variant=A` para `?variant=B` da mesma peça (voltar, card da `67`) | a página reabre na variação de B, e o `<head>` passa a ser o de B | hoje a variação da URL é lida uma vez por montagem do corpo (`key={product.id}`), e a mesma peça não remonta: o título diria Prata e a página mostraria Ouro | y (2026-10-19) |
| De onde vêm as marcações no servidor | a `product-page` lê com a chave de **serviço** (ignora RLS), então aplica à mão as mesmas restrições da leitura pública (grupo ativo, peça ativa) antes de chamar a regra | sem isso o HTML servido declararia página para um grupo desligado, enquanto o cliente e o sitemap (que leem pela RLS) não — três respostas para "esta opção tem página?" | y (2026-10-19) |
| Falha ao ler as marcações (cliente, servidor) | o `<head>` cai no da peça; nunca declara página de opção com dado parcial | declarar canônica errada é pior que não declarar (`useCanonical.ts`, comentário) | y (2026-10-19) |
| Falha ao ler as marcações ou as variações no sitemap | resposta degradada, **não 200**, como a falha de produtos hoje | sitemap 200 sem as páginas de opção apagaria 1.000 URLs num dia e as devolveria no seguinte; o guarda `handlers.test.ts` do sitemap já recusa caminho degradado com 200 | y (2026-10-19) |
| `lastmod` da URL de opção | o `updated_at` da peça | a página de opção é o conteúdo da peça. Marcar a opção não atualiza `products.updated_at`, e carimbar outra data seria inventar edição (`L-017`, candidata) | y (2026-10-19) |
| `offers.url` no JSON-LD | continua sendo o `<g:link>` da variação aberta (com `?variant=`). O `Product` ganha `url` = a canônica do documento. **Revoga a `SEO-18` da `36`** | a `SEO-18` partia da premissa de que a canônica era sempre a peça sem query, e que `?variant=` em `offers.url` declarava "dois endereços para a mesma oferta". Com a `68`, `?variant=` passa a ser forma canônica, e cada variação é uma oferta com URL própria — o que o Google espera de variante. Manter `offers.url` = `<g:link>` preserva a asserção "a página e o feed apontam para a mesma URL" de `shoppingParity.test.ts:108`, que é a que o Merchant Center confere | y (2026-10-19) |
| JSON-LD da página **da peça** com opções indexáveis | `ProductGroup` com `hasVariant` (uma por opção indexável) e `variesBy`, **no lugar** do `Product` avulso; páginas com `?variant=` continuam com o `Product` da variação aberta, mais `inProductGroupWithID` (P2) | o Merchant Center sempre chega com `?variant=` (comentário de `representativeVariant`), então a paridade fica no `Product`; a página sem query é a do resultado orgânico. Um `@type` de produto por documento (`SEO-21` da `36`) | y (2026-10-19) |
| `variesBy` | tabela fixa em `core`: eixo `Cor` → `https://schema.org/color`, `Tamanho` → `https://schema.org/size` (nome do eixo comparado com a dobra de acento e caixa, igualdade exata). Eixo indexável fora da tabela ⇒ sem `ProductGroup`, `Product` como hoje | "Tipos de elo" mistura formato e acabamento (medido pela `67`) e não tem propriedade de `schema.org`. Declarar `material` para "Chaveiro" seria afirmação falsa | y (2026-10-19) |
| Piso do `sitemap-check.yml` | continua 700 | é piso, não igualdade; as páginas de opção nascem zero (dependem da curadoria) | y (2026-10-19) |
| Tom | nenhuma palavra nova visível à cliente; o título é nome + opção | registro memorial do `CLAUDE.md`: nada de "nova cor!", "disponível em" | y (regra do projeto) |
| Medida de sucesso | Search Console, relatório "Páginas" filtrado pelo sitemap, 4 e 8 semanas depois de a Adri marcar as cores: proporção de URLs com `?variant=` em "Indexada" e contagem de "Duplicada: o Google escolheu uma canônica diferente" | é o único lugar que diz se o Google aceitou as canônicas; nada no repositório mede isso | y (2026-10-19) |

**Open questions:** nenhuma. Revisão de 2026-10-19 com o usuário: todas confirmadas no default.
Três notas saíram dela:

- **A representante da opção NÃO é `representativeVariant`** (`offer.ts:122`, que prefere estoque).
  A função nova tem nome próprio — duas funções "representante" com regras diferentes e o mesmo nome
  seriam o "defeito 01" no tamanho de um identificador.
- **SVR-23 foi medido ANTES do código** (2026-10-19, loja publicada, peça
  `colar-personalizado-com-nome-minha-gata`, 3 cores): sem query, o JSON-LD servido traz `sku`
  `1250307141` (a primeira); com `?variant=1349521839` (a terceira) e com
  `?variant=1349521839&utm_source=x`, traz `sku` e `offers.url` da terceira — o `rewrite`, cujo
  destino já carrega `?slug=:slug`, **repassa a query de entrada**. `Content-Type` entregue:
  `text/html; charset=utf-8` nos três. `rel="canonical"` servido: **zero** nos três. A prova de fecho
  de SVR-23 continua sendo a canônica servida igual à URL, que só existe depois da `68`.
- **A origem da canônica tem dois donos**: o cliente usa `window.location.origin`
  (`useCanonical.ts`), a `product-page` e o `sitemap` usam `STORE_PUBLIC_URL`. Hoje coincidem (o
  `.vercel.app` provisório). No dia do domínio próprio, um secret esquecido faria o HTML servido
  declarar o `.vercel.app` canônico — antes a divergência só tocava `og:url`, que não pesa na
  indexação. Decisão do usuário: o sensor diário confere (**SVR-41**).

---

## User Stories

### P1: A regra de quais opções têm página ⭐ MVP

**User Story**: Como a loja, preciso de **uma** resposta para "esta opção tem página própria, e qual
é o endereço dela?", lida igual pela página, pela edge function e pelo sitemap.

**Why P1**: três leitores escrevendo a regra cada um são o "defeito 01" com o Google como juiz: o
sitemap anunciaria uma URL que a página não declara canônica, e nada quebraria.

**Acceptance Criteria**:

1. **SVR-01** WHEN a regra recebe a peça (com `options` e `slug`), as variações dela e as marcações
   por opção já restritas à leitura pública THEN ela SHALL devolver a lista de **opções indexáveis**,
   cada uma com eixo, texto, variação representante e caminho canônico, na ordem dos textos em
   `options` daquele eixo.
2. **SVR-02** O **eixo indexável** SHALL ser o primeiro eixo, na ordem de `products.options`, que
   tenha ao menos um texto indexável (SVR-03) **e** ao menos dois textos distintos entre as variações
   elegíveis. Nenhum outro eixo da mesma peça SHALL gerar opção indexável.
3. **SVR-03** Um texto do eixo SHALL ser indexável quando há marcação (peça, eixo, texto, qualquer
   valor) **e** ao menos uma variação elegível (ativa, com preço — `feedExclusion === null`) com
   `option_values[eixo] = texto`, comparados exatos, como na `67`.
4. **SVR-04** A **representante** de uma opção SHALL ser, entre as variações elegíveis com aquele
   texto, a de menor `position`, com empate decidido pelo `publicVariantId` em ordem crescente. O
   estoque SHALL não participar da escolha.
5. **SVR-05** O caminho canônico de uma opção SHALL ser `productPath(slug) + '?variant=' +
   publicVariantId(representante)`, montado pela **mesma** função que monta o `<g:link>` do feed —
   absolutizado pela origem, a URL de opção SHALL ser igual, byte a byte, ao `<g:link>` da oferta da
   representante.
6. **SVR-06** WHEN a peça não tem eixo, não tem marcação, ou só tem marcação de grupo inativo THEN a
   lista SHALL ser vazia.
7. **SVR-07** WHEN a regra recebe um valor de `?variant=` THEN ela SHALL responder **opção** (com a
   opção indexável) quando o valor resolve (`variantByPublicId`) para uma variação elegível cujo
   texto no eixo indexável é indexável — seja ela a representante ou não —, e **peça** em todo outro
   caso: ausente, vazio, desconhecido, de variação inelegível, ou de texto não indexável.

**Independent Test**: com uma fixture de "Pingente Pata" (três cores, só Prata 925 e Rosé marcadas,
eixo `Tamanho` também marcado), a regra devolve duas opções no eixo `Cor`, nenhuma em `Tamanho`, e
o caminho de cada uma é igual ao `<g:link>` que `resolveOffer` produz para a representante.

---

### P1: A página de opção na loja ⭐ MVP

**User Story**: Como cliente que chega do Google em "pingente pata prata 925 folheado a ouro rosé",
quero ver na aba e no resultado o nome da peça **e** da cor, e cair na página já nela.

**Acceptance Criteria**:

1. **SVR-08** WHEN o `?variant=` da URL resolve para **opção** THEN o título SHALL ser
   `"{nome} — {texto}"` (espaços colapsados), com a marca por `brandedTitle` apenas quando o título
   com a marca tem até 60 caracteres; acima disso, sem a marca. O título SHALL nunca ser cortado.
2. **SVR-09** WHEN resolve para **opção** THEN a descrição SHALL ser
   `summarize("{texto}. {descrição da peça}")`, onde a descrição da peça é a de `productPageMeta`, e
   SHALL ter no máximo 160 caracteres e nunca ser vazia.
3. **SVR-10** WHEN resolve para **peça** THEN título e descrição SHALL ser os de `productPageMeta`,
   idênticos aos de hoje.
4. **SVR-11** WHEN a página abre THEN a `<link rel="canonical">` SHALL ser o caminho canônico da
   opção (SVR-05) quando resolve para opção, e `productPath(slug)` quando resolve para peça —
   absoluta, sem nenhum outro parâmetro da URL.
5. **SVR-12** O `<head>` SHALL vir do `?variant=` lido na abertura e SHALL não mudar quando a cliente
   troca de opção no seletor.
6. **SVR-13** WHEN a página ainda não tem a peça **e** as marcações THEN ela SHALL não declarar
   título nem canônica (A9 da `62`), para o `page_view` do GA4 nunca sair com o título da peça numa
   URL de opção.
7. **SVR-14** WHEN a página declara o metadado de uma opção THEN o `page_view` do GA4 SHALL sair com
   esse título e com o `?variant=` no `page_location`.
8. **SVR-15** WHEN a leitura das marcações falha no cliente THEN o `<head>` SHALL ser o da peça, e a
   página SHALL abrir normalmente na variação da URL.
   > **SPEC_DEVIATION (2026-10-19, registrado depois da verificação, rodada 1)**: no cliente as
   > marcações **não têm leitura própria** — elas vêm embutidas no mesmo `select` do produto desde a
   > `67` (`PRODUCT_OPTION_MARKS_EMBED`, `mapProduct.ts`). A falha delas é a falha da consulta do
   > produto, que já leva à página de não encontrado, como antes da `68`. O ramo "marcações falham e a
   > peça abre" não existe no cliente; o que existe, e está provado, é o produto chegar **sem**
   > marcações (campo ausente ou vazio) ⇒ `<head>` da peça e a variação da URL aberta. Criar uma
   > leitura separada só para tornar esta AC alcançável custaria uma consulta a mais por página e
   > reabriria SVR-13. No servidor o ramo existe e é SVR-21.
9. **SVR-16** WHEN a URL muda, por navegação, de `?variant=A` para `?variant=B` da mesma peça THEN a
   página SHALL reabrir na variação de B e o `<head>` SHALL passar a ser o de B.

**Independent Test**: abrir `/produtos/<pata>?variant=<rosé>` e ver na aba "Pingente … — Prata 925
Folheado a Ouro Rose" e a canônica com o mesmo `?variant=`. Trocar a cor no seletor e ver aba e
canônica iguais. Abrir com `?variant=<prata sem marcação>` e ver o título e a canônica da peça.

---

### P1: O HTML servido diz o mesmo ⭐ MVP

**User Story**: Como o Googlebot (e o WhatsApp, que não executa JavaScript), quero ler no HTML
entregue o mesmo título e a mesma canônica que a página escreve depois.

**Acceptance Criteria**:

1. **SVR-17** WHEN `product-page` responde a um `?variant=` que resolve para opção THEN `<title>`,
   `description`, `og:title`, `og:description`, `twitter:title` e `twitter:description` SHALL ser os
   de SVR-08/09, pela **mesma** função do cliente.
2. **SVR-18** WHEN `product-page` responde a qualquer peça THEN o HTML SHALL conter **uma**
   `<link rel="canonical">` absoluta, igual à do cliente (SVR-11), e `og:url` com o **mesmo** valor.
   Hoje não há canônica servida.
3. **SVR-19** WHEN a origem configurada não é absoluta THEN o HTML SHALL sair sem canônica e sem
   `og:url`, como hoje sai sem `og:url` — nunca relativa.
4. **SVR-20** As marcações lidas pela `product-page` SHALL passar pelas mesmas restrições da leitura
   pública (grupo ativo, peça ativa) antes de chegar à regra.
5. **SVR-21** WHEN a leitura das marcações falha na `product-page` THEN a resposta SHALL ser 200 com o
   `<head>` e a canônica da peça, e SHALL registrar um log com `fn: 'product-page'`, `erro:
   'marcacoes'` e o slug.
6. **SVR-22** O `Product` do JSON-LD SHALL ganhar `url` igual à canônica do documento, e
   `offers.url` SHALL continuar igual ao `<g:link>` da variação aberta. Preço, disponibilidade, `sku`
   e `offers.url` SHALL continuar passando em `shoppingParity.test.ts` sem uma asserção alterada.
7. **SVR-23** WHEN medido contra a loja publicada THEN uma URL de opção SHALL entregar
   `Content-Type: text/html` (`AD-021`) **e** a canônica servida igual à própria URL — prova de que o
   `rewrite` do `vercel.json` repassa o `?variant=` à function, que hoje é suposição.

**Independent Test**: `curl -s '<loja>/produtos/<pata>?variant=<rosé>'` traz `<title>` com a cor,
uma `rel="canonical"` com o mesmo `?variant=` e `og:url` igual; com `?variant=<sem marcação>`, a
canônica é a da peça; com o grupo desligado no painel, idem.

---

### P1: O sitemap anuncia as páginas de opção ⭐ MVP

**User Story**: Como a loja, quero que o Google descubra as páginas de opção sem depender de link
interno, porque o seletor não muda a URL.

**Acceptance Criteria**:

1. **SVR-24** O sitemap SHALL conter uma `<loc>` por opção indexável, igual ao caminho canônico
   (SVR-05) absolutizado, logo depois da `<loc>` da peça e na ordem de SVR-01.
2. **SVR-25** A `<lastmod>` de cada URL de opção SHALL ser o `updated_at` da peça.
3. **SVR-26** A function SHALL ler variações e marcações com a chave publicável (RLS), **paginadas**
   (`readAllPages`) — são 3.380 variações, acima do corte de 1.000 do PostgREST —, e a leitura
   incompleta SHALL produzir a resposta degradada (não 200) que a leitura de produtos já produz.
4. **SVR-27** A única query permitida numa `<loc>` SHALL ser `?variant=<id>` de uma opção
   indexável. **A `SMP-07` da `33` fica revogada nessa forma**: `urls.test.ts` passa a recusar
   qualquer outra query e qualquer `?variant=` que não seja de opção indexável, com sensor nos dois
   sentidos.
5. **SVR-28** Para toda `<loc>` com `?variant=`, a regra de SVR-07 aplicada a ela SHALL devolver a
   própria `<loc>` como canônica (sitemap ⊆ autocanônicas), e toda opção indexável SHALL ter
   `<loc>` (autocanônicas ⊆ sitemap). Um teste SHALL provar os dois sentidos com a mesma função que a
   produção chama.
6. **SVR-29** WHEN a marcação de uma opção é removida, o grupo é desligado, ou a opção perde a última
   variação elegível THEN a próxima geração do sitemap SHALL não ter aquela `<loc>`, e a página SHALL
   passar a canonizar para a peça — sem passo manual e sem `301`.

**Independent Test**: com duas cores marcadas, o sitemap ganha duas `<loc>` com `?variant=`, iguais à
canônica servida de cada uma. Remover uma marcação no painel e ver a `<loc>` sumir.

---

### P2: `ProductGroup` na página da peça

**User Story**: Como o Google, quero entender que as cores são variantes da mesma peça, com URL e
preço de cada uma.

**Acceptance Criteria**:

1. **SVR-30** WHEN a página resolve para **peça** e a peça tem opções indexáveis num eixo da tabela
   de `variesBy` THEN o JSON-LD SHALL ser um `ProductGroup` com `name` (nome da peça),
   `productGroupID` (= `publicProductId`, o `<g:item_group_id>`), `variesBy` e `hasVariant` com um
   `Product` por opção indexável, **no lugar** do `Product` avulso. **Só quando a URL não traz
   `?variant=` de uma variação elegível** (ausente ou inválido): um `?variant=` válido que resolve
   para peça (texto não marcado, Letra) segue SVR-33 — o `Product` da variação aberta, porque é ali
   que o Merchant Center chega e confere a oferta (Assumption "JSON-LD da página da peça"). Precisado
   em 2026-10-19 depois da verificação, rodada 1; o código e `handlers.test.ts` já seguiam esta forma.
2. **SVR-31** Cada `Product` de `hasVariant` SHALL ter `name` (o título de SVR-08 sem a marca),
   `sku`, `image`, a propriedade do eixo (`color`/`size`) com o texto da opção, `url` igual ao
   caminho canônico da opção, e `offers` montado por `resolveOffer` da representante — o mesmo
   preço e disponibilidade que o feed declara para ela.
3. **SVR-32** A tabela de `variesBy` SHALL ser `Cor` → `https://schema.org/color` e `Tamanho` →
   `https://schema.org/size`, com o nome do eixo comparado pela dobra de acento e caixa, igualdade
   exata. Eixo fora da tabela SHALL manter o `Product` de hoje.
4. **SVR-33** WHEN a página tem `?variant=` válido THEN o `Product` da variação aberta SHALL ganhar
   `inProductGroupWithID` (= `publicProductId`), e o documento SHALL continuar com um único `@type`
   de produto.

---

### P2: O sensor diário confere a canônica servida

**User Story**: Como quem mantém a loja, quero saber no dia seguinte se as páginas de opção deixaram
de se declarar canônicas em produção.

**Acceptance Criteria**:

1. **SVR-34** WHEN o sitemap tem ao menos uma `<loc>` com `?variant=` THEN o `sitemap-check.yml`
   SHALL buscar uma delas e falhar se a `rel="canonical"` servida não for igual à `<loc>`.
2. **SVR-35** O sensor SHALL imprimir quantas `<loc>` têm `?variant=`, e SHALL não falhar quando
   são zero (estado legítimo antes da curadoria). O piso continua 700.
3. **SVR-36** O sensor SHALL derivar a URL do documento entregue, sem literal de domínio, slug ou id
   no `.yml` (`AD-037`).
4. **SVR-41** O sensor SHALL falhar quando a origem da `rel="canonical"` servida de **qualquer**
   página de produto que ele busca (com ou sem `?variant=`) for diferente da origem de onde ele buscou
   o sitemap. Origem é esquema + host + porta, comparada exata.

---

### P3: O painel diz quais opções ganharam página

**User Story**: Como a Adri, quero saber, ao marcar uma cor, que ela passa a ter página no Google.

**Acceptance Criteria**:

1. **SVR-37** WHEN a seção "Pelas variações" (feature `67`) mostra o eixo indexável da peça THEN cada
   linha de texto indexável SHALL dizer "Tem página própria no Google", pela mesma regra de SVR-01.
2. **SVR-38** WHEN a peça tem marcação num segundo eixo THEN a seção SHALL dizer, em texto, que só o
   primeiro eixo marcado ganha página, e que as marcações deste continuam valendo para o filtro.

---

## Edge Cases

- WHEN a mesma peça tem dois textos do eixo indexável marcados com o **mesmo** valor ("Prata 925
  Folheado a Ouro" e "Prata 925 folheado a ouro", ambos *Folheado a ouro*) THEN são duas páginas, com
  títulos distintos pelo texto (SVR-08) e representantes distintas.
- WHEN um texto marcado só existe em variações inativas ou sem preço THEN não há página (SVR-03), e a
  marcação continua no banco.
- WHEN a representante é desativada ou apagada THEN a próxima é a nova representante; a URL antiga,
  se a variação ainda existe e é elegível, canoniza para a nova; se não, abre na peça e canoniza para
  ela.
- WHEN a peça é desativada THEN a página é a 404 de hoje, e nenhuma URL de opção dela sai no sitemap.
- WHEN a variação não tem `nuvemshop_id` THEN o `?variant=` canônico SHALL usar o UUID
  (`publicVariantId`, regra da `30`), e a URL continua igual ao `<g:link>`.
- WHEN o `?variant=` chega com o UUID de uma variação que tem `nuvemshop_id` THEN a página abre nela
  (`variantByPublicId` aceita as duas formas) e a canônica SHALL ser a forma do `publicVariantId`.
- WHEN a URL tem `?variant=` repetido THEN vale o primeiro, como `URLSearchParams.get` já faz nos dois
  lados.
- WHEN o texto da opção tem `&`, `<` ou aspas THEN título e descrição SHALL sair escapados no HTML
  servido (`escapeHtmlAttr`, `<title>` com `&lt;`), e o JSON-LD com `<` escapado (`jsonLdScript`).
- WHEN a peça tem slug antigo (`product_redirects`) THEN a página troca para o slug atual **mantendo**
  o `?variant=` na URL, e a canônica é a do slug atual.
- WHEN cliente e servidor leem o banco em momentos diferentes (a Adri marcou entre um e outro) THEN
  pode haver uma visita com `<head>` servido e `<head>` do cliente diferentes; aceito, e o próximo
  acesso converge.

---

## Implicit-requirement sweep

| Dimensão | Resolução |
| --- | --- |
| Validação e limites | título sem corte (SVR-08), marca só até 60; descrição ≤ 160 (SVR-09); query da canônica restrita a `?variant=` (SVR-11, SVR-27); teto de páginas por construção: um eixo por peça (SVR-02), medido em ~1.575 se tudo for marcado |
| Falha / falha parcial | marcações no cliente: SVR-15; no servidor: SVR-21 (200 com a peça, log); no sitemap: SVR-26 (degradado, não 200); origem não absoluta: SVR-19 |
| Idempotência / repetição | a regra é pura e determinística (desempate de SVR-04); duas gerações do mesmo catálogo produzem o mesmo sitemap; a `<loc>` duplicada continua lançando (`sitemapUrls`) |
| Auth e limites de taxa | leitura pública das marcações é a da `67` (RLS: grupo ativo, peça ativa); a `product-page` usa chave de serviço e por isso reaplica a restrição (SVR-20). Taxa N/A because não há endpoint novo: a `product-page` e o `sitemap` já são públicos |
| Concorrência / ordem | N/A because só há leitura; a divergência momentânea cliente × servidor é declarada nos *Edge Cases*. Ordem de publicação: a migration da `67` antes do código da `68` (a leitura por embed falha sem a tabela) |
| Ciclo de vida | remover marcação, desligar grupo, perder variação elegível ⇒ a página sai (SVR-29), sem `301`; reordenar ou desativar a representante ⇒ a canônica muda de id (*Assumptions*) |
| Observabilidade | log da falha de marcações na `product-page` (SVR-21); contagem de `<loc>` de opção no sensor diário (SVR-35); o resultado no Google só o Search Console mede (*Success Criteria*) |
| Dependência externa | Google/Search Console: a feature não depende de resposta dele para funcionar. Vercel repassar a query no `rewrite`: medido em produção (SVR-23). Gateway reescrevendo `Content-Type`: coberto pelo override do `vercel.json` (`AD-021`), conferido em SVR-23 |
| Integridade de estado | não há máquina de estado: "tem página" é derivado a cada leitura do estado atual das marcações e das variações (regra 2 do "defeito 01": nenhuma coluna `indexable` nova) |

---

## Restrições (guardas e donos que a feature toca)

- **Dono único em `packages/core`**: a regra de SVR-01..07 e o metadado de SVR-08/09 moram em
  `core` (o `design.md` decide o módulo), alcançáveis pelo Deno — todo especificador relativo com
  `.ts`, `import type` incluso, sem barrel que não seja alcançável. Os três leitores (a página, a
  `product-page`, o `sitemap`) e o painel (P3) chamam a mesma função. Um guarda de dono único SHALL
  recusar a composição do título de opção e a montagem de `?variant=` fora de `core`
  (**SVR-39**).
- **`?variant=` tem um construtor só**: a canônica de opção, o `<g:link>` do feed e o link do card da
  `67` saem da mesma função (`offerLink`/`productPath` + `publicVariantId`) (**SVR-40**).
- Guardas que mudam e **não** podem ser afrouxados, só ganhar casos:
  - `core/seo/__tests__/seo.test.ts` — ganha a régua do título e da descrição de opção (marca até 60,
    sem corte, ≤ 160, nunca vazio, marca nunca em dobro).
  - `core/seo/__tests__/denoReach.test.ts` e `core/shopping/__tests__/denoReach.test.ts` — o grafo
    transitivo novo (seo → shopping/identity, eligibility, offer) continua com `.ts` explícito.
  - `pages/__tests__/metaPorRota.test.ts` — continua verde: a `ProductPage` segue chamando
    `usePageMeta`.
  - `core/shopping/__tests__/shoppingParity.test.ts` — **sem asserção alterada** (SVR-22).
  - `core/sitemap/__tests__/urls.test.ts` — a régua de `SMP-07` é reescrita para SVR-27, com sensor
    de query estranha e de `?variant=` não indexável; `render.test.ts` ganha o escape de uma `<loc>`
    com query.
  - `supabase/functions/sitemap/__tests__/handlers.test.ts` — ganha a falha de marcações e de
    variações como caminho degradado (não 200), e a paginação acima de 1.000.
  - `supabase/functions/product-page/__tests__/handlers.test.ts` — ganha a canônica servida, o
    `<head>` de opção, o recuo da falha de marcações e a restrição de grupo inativo (SVR-20).
  - `shared/lib/__tests__/vercelRedirects.test.ts` — a linha de `Content-Type` de `/produtos/:slug`
    continua.
- **O código de dinheiro não muda**: `packages/core/src/payment/**` com zero arquivos alterados.
- **Mobile**: não há tela nova na loja; a P3 do painel é texto dentro da seção da `67` e segue a régua
  de 390×844 dela.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SVR-01..07 | P1: A regra de quais opções têm página (AC 1–7) | Design | Done |
| SVR-08..16 | P1: A página de opção na loja (AC 1–9) | Design | Done |
| SVR-17..23 | P1: O HTML servido diz o mesmo (AC 1–7) | Design | Done (SVR-23: medido em produção só na metade do `rewrite`; a canônica servida, depois do deploy) |
| SVR-24..29 | P1: O sitemap anuncia as páginas de opção (AC 1–6) | Design | Done |
| SVR-30..33 | P2: `ProductGroup` na página da peça (AC 1–4) | Design | Done |
| SVR-34..36, SVR-41 | P2: O sensor diário confere a canônica servida (AC 1–4) | Design | Done (local; produção depois do deploy) |
| SVR-37..38 | P3: O painel diz quais opções ganharam página (AC 1–2) | Design | Done |
| SVR-39 | Restrição: dono único da regra e do título de opção, com guarda | Design | Done |
| SVR-40 | Restrição: um construtor só para `?variant=` | Design | Done |

**Coverage:** 41 total, 41 mapeados a tasks T01–T13 (`tasks.md`); provas de produção pendentes do deploy: SVR-23, SVR-34..36/41 (primeira execução do `Sitemap check`).

**Requisitos de outras features que esta revoga, por escrito:**

| Requisito | Feature | O que fica | Motivo |
| --- | --- | --- | --- |
| `SEO-18` — "`offers.url` canônica, sem `?variant=`" | `36` (só `spec.md`, não implementada) | **revogado na forma, mantido no princípio**: o documento declara uma canônica só, e ela agora pode ter `?variant=`. `offers.url` fica igual ao `<g:link>` (SVR-22); a canônica vai em `Product.url` e na `<link rel="canonical">` | a premissa era "a canônica é sempre a peça". Com páginas de opção, cada variação é uma oferta com URL própria, e mudar `offers.url` quebraria a paridade de URL com o feed que o Merchant Center confere |
| Edge case da `36`: "`?variant=` válido ⇒ `offers.url` e a canônica permanecem sem query" | `36` | revogado para opções indexáveis; mantido para todo `?variant=` que resolve para peça (SVR-11) | idem |
| `SMP-07` — "nenhuma `<loc>` com query, em particular `?variant=`" | `33` | revogado na forma: a única query permitida é `?variant=` de opção indexável (SVR-27) | a regra existia para não anunciar 3.233 variações; a `68` anuncia só as marcadas, e cada uma é autocanônica |
| `URL-01` (comentário de `ProductPage.tsx:77`) — "a canônica do produto é `/produtos/<slug>`" | `23` | continua valendo para a peça; ganha a exceção da opção indexável | — |

---

## Success Criteria

- [ ] Com as cores curadas no banco local, **toda** `<loc>` com `?variant=` do sitemap devolve, no
      HTML servido pela `product-page`, uma `rel="canonical"` igual a ela, e nenhuma URL de opção
      não marcada se declara canônica (medido por script sobre o documento inteiro, não por amostra).
- [ ] Zero `<loc>` com `?variant=` antes da curadoria: o deploy não muda o sitemap de produção.
- [ ] `shoppingParity.test.ts` e o feed (`/feeds/google-shopping.xml`) idênticos antes e depois,
      conferidos por diff do XML gerado sobre o mesmo catálogo.
- [ ] O `page_view` de uma URL de opção sai com o título da opção (medido no navegador, aba Rede).
- [ ] No Search Console, 8 semanas depois de a Adri marcar as cores: ao menos metade das URLs com
      `?variant=` do sitemap em "Indexada", e as URLs das peças sem aumento de "Duplicada: o Google
      escolheu uma canônica diferente". Abaixo disso, a decisão de indexar por opção é revista (o
      número é *assumption*, `Confirmed? n`).
