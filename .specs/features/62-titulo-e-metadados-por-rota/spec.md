# Título e metadados por rota — Specification

> Feature `62`. É a **primeira fatia** da [`36`](../36-metadados-e-dados-estruturados/spec.md), que
> continua só com `spec.md`: aqui entra a derivação pura em `core/seo`, o `<head>` atualizado na
> navegação (o P2 dela) e o `<head>` **servido** só onde o transporte já existe (`/produtos/:slug`,
> pela edge function `product-page`). O transporte para as outras rotas (`BL-017`, A1 da `36`)
> continua fora — ver *Out of Scope*.

## Problem Statement

**A loja tem um `<title>` para 719 URLs.** Medido em 2026-10-06: das 18 páginas `lazy` do `App.tsx`,
**uma** (`FaqPage`) declara título; as outras 17 herdam o do `index.html`
("Uma Estrelinha - Joias afetivas artesanais em resina"). A aba do navegador, o histórico e o
Googlebot (que renderiza) leem a mesma coisa em todo lugar.

**Com o GA4 ligado (feature `61`), o defeito virou dado errado.** O `PageViewTracker` envia
`page_title: document.title`, e todo `page_view` sai com o mesmo título — Home, categoria, produto e
checkout aparecem no relatório como uma página só. Relatado pelo usuário com print do GA4.

**O dado para consertar já existe e não chega ao HTML.** Medido no banco hospedado em 2026-10-06:
**686 de 691** produtos ativos têm `seo_title` e `seo_description` curados (247 já trazem
"Uma Estrelinha" no título e 166 terminam em `| UE`). `PRODUCT_SELECT` pede `*`, e `mapDbToProduct`
os descarta. O `store_settings.seo` (título, descrição e imagem que o painel edita) **não é lido pela
loja** em lugar nenhum.

**O card de compartilhamento de um produto mostra a loja, não a joia.** `curl` em
`/produtos/brinco-buzios-folheado-a-ouro` (loja publicada, 2026-10-06): o JSON-LD do produto está lá,
mas `<title>`, `description` e `og:*` são os genéricos do `index.html`. WhatsApp não executa
JavaScript — nenhuma correção no cliente alcança esse caso.

**A imagem de compartilhamento da loja vai mudar** (pedido do usuário, 2026-10-06): a arte
`joia-afetiva-leite-materno-uma estrelinha.webp` passa a ser a imagem de destaque da Home nos links
do Google, mensageiros e redes sociais.

## Goals

- [ ] Toda rota da loja escreve o próprio `<title>` na navegação: **18 de 18** páginas declaram (hoje 1).
- [ ] Todo `page_view` do GA4 sai com o título **da página para onde se navegou**, inclusive em
      página que carrega dado (produto, categoria).
- [ ] O HTML **servido** de `/produtos/:slug` traz título, descrição e card (`og:*`/`twitter:*`) da
      joia, com a copy curada do banco.
- [ ] O card padrão da loja usa a arte nova, num formato que todo mensageiro aceita.

## Out of Scope

| Item | Motivo |
| --- | --- |
| `<head>` **servido** para Home, categoria e páginas institucionais | Exige tirar o transporte do `rewrite` não cacheado (`BL-017`, A1 da `36`) ou estendê-lo a 719 rotas — mudança de arquitetura com risco de latência. Essas rotas continuam servindo o `index.html` genérico; o título certo chega **após o JavaScript** (Googlebot e GA4 enxergam; WhatsApp não). |
| `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage` de produto, `CollectionPage` | Dado estruturado novo é a outra metade da `36` e não tem relação com o defeito relatado. |
| Ligar o campo **"Imagem Open Graph"** do painel (`store_settings.seo.og_image`) | A imagem que o rastreador lê é a do HTML **servido**, e o `index.html` é estático. Ler o campo exigiria `<head>` servido por função em toda rota (linha 1). O campo segue sem efeito — registrado como dívida. |
| Domínio de produção (`umaestrelinha.com.br`) servir a imagem | É cutover. Até ele, o domínio é a Nuvemshop e a URL absoluta da imagem responde 404 lá. |
| `og:url`/`og:image`/`og:type` atualizados no cliente | Só quem não executa JavaScript lê esses campos, e esses leem o HTML servido. No cliente eles ficariam corretos apenas para ninguém. |

---

## Assumptions & Open Questions

| # | Decisão | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | Onde mora a derivação | `packages/core/src/seo/`, puro, com `.ts` explícito em todo import | Dois consumidores — o hook do cliente e a edge function `product-page` (Deno). Duas escritas da regra divergiriam sem quebrar nada (defeito 01). Mesmo argumento da A3 da `36`. | y |
| A2 | Sufixo de marca | `"{título} \| Uma Estrelinha"`, **só** quando o título não contém "Uma Estrelinha" e não termina em `\| UE` | Medido: 247 títulos curados já trazem a marca e 166 terminam na abreviação `\| UE` que a curadoria usa. Sufixar cegamente produz marca dupla. O separador é `\|` porque é o que a curadoria já usa; o `·` da `FaqPage` é trocado. | y |
| A3 | Título do produto sem `seo_title` | `name` do produto, com A2 | Os 5 sem curadoria têm nome. Nunca string vazia. | y (A4 da `36`) |
| A4 | Descrição do produto sem `seo_description` | `description` sem o bloco de FAQ (`stripFaqBlock`), como texto (`htmlToText`), cortada em **160** no limite de palavra com `…`; vazia ⇒ a descrição da loja | A5 da `36`. As duas funções já existem em `core/faq`. | y |
| A5 | Título e descrição curados longos | Entregues **íntegros**, sem corte | Edge case da `36`: quem corta é o buscador; cortar no servidor esconde da dona o que ela escreveu. | y |
| A6 | Título e descrição da Home | `store_settings.seo.title`/`description` (os campos que o painel já edita), com `DEFAULT_SEO` enquanto carrega | O campo existe, a dona o edita, e a loja nunca o leu. Lê-lo dá dono ao dado sem criar outro. | y |
| A7 | Descrição de categoria | `description` da categoria como texto; vazia (35 de 35 hoje) ⇒ `"{nome}: joias afetivas feitas à mão em resina por Adri Muniz, em Porto Alegre."` | Sem coluna nova (Out of Scope da `36`). A frase é derivada, sóbria, sem urgência. | y |
| A8 | Rota não indexável | Título próprio **e** `<meta name="robots" content="noindex">`; indexável **remove** a tag | `NON_INDEXABLE_PATHS` já classifica as nove. A tag é criada e removida pelo hook — o `index.html` não a traz. | y |
| A9 | Título enquanto a página carrega dado (produto, categoria) | **Não escreve nada**: o título anterior permanece até o dado chegar | Escrever um título intermediário faria o `page_view` sair com ele (A10). | y |
| A10 | Quando o `page_view` sai | Quando a página **declara** o metadado da rota atual; sem declaração, depois de **3 s** com o que houver | O observador atual dispara na **primeira** troca de `<title>`, espera só 500 ms, e a página de produto leva mais que isso para ter dado. A declaração é o sinal certo; o prazo existe para página que nunca declara (falha). | y |
| A11 | Página substituída (`replace`) antes de declarar | **Nenhum** `page_view` para ela | É redirect (rota legada, slug antigo, pai errado na URL), não visita. Hoje ela sai com o título da página anterior. | y |
| A12 | O que o hook faz ao desmontar | **Nada** — a próxima página sobrescreve | Reverter ao título do `index.html` entre duas rotas é exatamente a troca intermediária que A10 mediria. Contrapartida obrigatória: guarda que exige a declaração em toda página (`MTA-10`). Desvio declarado do P2 AC 3 da `36`. | y |
| A13 | Formato e tamanho da imagem de compartilhamento | **JPEG 1200×630**, a arte quadrada inteira (630×630) centrada sobre o próprio fundo `#F2F2F2` | WebP não é aceito por todo mensageiro. O card largo de Facebook/LinkedIn/X recorta para ~1,91:1, e a arte quadrada perderia o título "JOIAS AFETIVAS" no recorte. 1200×630 é também o que `brandAssets.test.ts` exige declarado. | y |
| A14 | Host da imagem padrão | `https://umaestrelinha.com.br/…`, como a atual | Regra de `brandAssets.test.ts`: absoluta e do domínio da loja. Até o cutover ela responde 404 lá (a atual também). | y |
| A15 | `og:image` do produto servido | A **rendição** de 1200 da foto do produto (`renditionUrl(oferta.imageLink, 1200)`), **sem** `og:image:width/height` | Medido em 2026-10-06 no Storage hospedado, com o `User-Agent` do WhatsApp: o original é `image/webp`, e `render/image` entrega `image/jpeg` a quem não anuncia WebP — a mesma razão de compatibilidade de A13. Foto fora do Storage volta inalterada. Dimensão declarada sem medição seria afirmação (`AD-012`, A8 da `36`). | y — revisto na prova em navegador |
| A16 | De onde o servidor tira a descrição da loja (fallback) | `store_settings.seo.description`, lida na mesma consulta das settings que a function já faz | Mesmo dono que o cliente usa (A6). Falha de leitura ⇒ mantém a do shell. | y |

**Open questions:** nenhuma.

---

## User Stories

### P1: Cada página escreve o próprio título ⭐ MVP

**User Story**: Como cliente navegando entre produtos, e como a dona lendo o relatório do GA4, quero
que o título da aba seja o da página aberta, para saber onde estou e para o relatório distinguir as
páginas.

**Acceptance Criteria**:

1. WHEN uma rota fixa é aberta (`/`, `/sobre`, as duas políticas, cuidados, perguntas frequentes,
   guia de material, e as nove de `NON_INDEXABLE_PATHS`) THEN `document.title` SHALL ser o título
   próprio daquela rota, **distinto** do de todas as outras rotas fixas.
2. WHEN a rota é de produto e o produto carregou THEN o título SHALL ser `seo_title` (ou `name`, A3)
   com o sufixo condicional de A2.
3. WHEN a rota é de produto THEN `meta[name=description]` SHALL ser `seo_description`, ou a derivação
   de A4.
4. WHEN a rota é de categoria resolvida THEN o título SHALL ser `"{nome} | Uma Estrelinha"` e a
   descrição a de A7.
5. WHEN a rota não resolve (produto ou categoria inexistente, ou `*`) THEN o título SHALL ser
   `"Página não encontrada | Uma Estrelinha"` e a página SHALL declarar `noindex`.
6. WHEN a rota está em `NON_INDEXABLE_PATHS` THEN o documento SHALL conter exatamente uma
   `<meta name="robots" content="noindex">`; WHEN a rota seguinte é indexável THEN a tag SHALL sair.
7. WHEN o metadado é escrito THEN `og:title` e `twitter:title` SHALL receber o mesmo título, e
   `og:description` e `twitter:description` a mesma descrição de `meta[name=description]`.
8. WHEN a página ainda carrega o dado (produto/categoria) THEN nenhum título SHALL ser escrito (A9),
   e WHEN a página desmonta THEN o título SHALL **não** voltar ao do `index.html` (A12).
9. WHEN a rota é `/` THEN título e descrição SHALL vir de `store_settings.seo` (A6).

**Independent Test**: navegar Home → categoria → produto → checkout em navegador e ler
`document.title` em cada uma.

---

### P1: O `page_view` leva o título da página certa ⭐ MVP

**User Story**: Como a dona lendo o GA4, quero que cada visita seja registrada com o título da página
visitada.

**Acceptance Criteria**:

1. WHEN o `pathname` muda e a página nova declara o metadado THEN UM `page_view` SHALL sair com o
   título **declarado** e o endereço novo.
2. WHEN a página nova leva mais que 500 ms para ter dado (produto) THEN o `page_view` SHALL esperar a
   declaração e sair com o título do produto — nunca com o da página anterior.
3. WHEN a página não declara em **3 s** THEN o `page_view` SHALL sair com o `document.title` do
   momento (A10).
4. WHEN a página é substituída por navegação `REPLACE` antes de declarar THEN nenhum `page_view`
   SHALL sair para ela, e o destino SHALL ter o seu (A11).
5. WHEN só a query string muda THEN nenhum `page_view` a mais SHALL sair (comportamento da `61`,
   mantido).
6. WHEN o usuário navega para outra página antes de a anterior declarar, por `PUSH` ou `POP` THEN a
   anterior SHALL sair com o título do momento (comportamento da `61`, mantido).

**Independent Test**: em navegador, com o gtag dublado, navegar até um produto com a resposta do
banco atrasada 1,5 s e conferir o `page_title` do `page_view`.

---

### P1: Toda página da loja declara — guarda ⭐ MVP

**Acceptance Criteria**:

1. WHEN uma página `lazy` do `App.tsx` não chama o hook de metadado THEN a suíte SHALL reprovar,
   nomeando o arquivo. Âncora: o número de páginas encontradas.
2. WHEN `SITEMAP_STATIC_PATHS` ou `NON_INDEXABLE_PATHS` ganha uma rota sem metadado em `core/seo`, ou
   `core/seo` declara uma rota que não está em nenhuma das duas THEN a suíte SHALL reprovar
   (bidirecional).

---

### P2: O link de um produto mostra a joia no WhatsApp

**User Story**: Como a Adri mandando o link de uma peça por WhatsApp, quero que o card mostre o nome,
a descrição e a foto daquela joia.

**Acceptance Criteria**:

1. WHEN a `product-page` serve um produto THEN o HTML SHALL conter `<title>`, `og:title` e
   `twitter:title` com o título de P1/AC2, e `meta[name=description]`, `og:description` e
   `twitter:description` com a descrição de P1/AC3 — produzidos pela **mesma** função de `core/seo`
   que o cliente chama.
2. WHEN o produto é servido THEN o HTML SHALL conter `og:type=product`, `og:url` igual à URL canônica
   do produto, e `og:image`/`twitter:image` iguais à rendição de 1200 da foto (A15), **sem** `og:image:width`,
   `og:image:height` nem `og:image:alt` da arte padrão.
3. WHEN o shell já traz uma dessas tags THEN o documento entregue SHALL conter **exatamente uma**
   instância de cada — a genérica é substituída, nunca duplicada.
4. WHEN um valor contém `"`, `<`, `>` ou `&` THEN ele SHALL sair escapado para atributo HTML (e para
   texto, no `<title>`).
5. WHEN a leitura do produto falha, o slug é desconhecido ou não há variação elegível THEN o shell
   SHALL ser servido **intacto** (comportamento da `30`, mantido).
6. WHEN a leitura das settings falha THEN a descrição de fallback SHALL ser a do shell, e a página
   SHALL ser servida.

**Independent Test**: `curl` do HTML servido de um produto, contando cada tag.

---

### P1: A arte nova é o card padrão da loja ⭐ MVP

**Acceptance Criteria**:

1. WHEN o `index.html` é servido THEN `og:image` e `twitter:image` SHALL apontar para
   `https://umaestrelinha.com.br/joia-afetiva-leite-materno-uma-estrelinha.jpg`, com
   `og:image:width=1200`, `og:image:height=630`, `og:image:type=image/jpeg` e um `og:image:alt`.
2. WHEN o arquivo é lido do disco THEN ele SHALL ser um JPEG de exatamente 1200×630.

---

## Edge Cases

- WHEN `seo_title` é só espaço THEN cai em `name` (A3); `seo_description` só espaço ⇒ derivação.
- WHEN a descrição derivada tem exatamente 160 caracteres THEN sai sem `…`; com 161, corta na última
  palavra inteira antes de 160 e acrescenta `…`.
- WHEN uma palavra sozinha passa de 160 caracteres THEN corta em 159 e acrescenta `…`.
- WHEN a busca tem termo THEN o título SHALL ser `"Busca: {termo} | Uma Estrelinha"`; sem termo,
  `"Busca | Uma Estrelinha"` — e trocar de termo **não** gera `page_view` (P1 GA, AC 5).
- WHEN a página é aberta dentro do iframe da prévia do painel THEN o título é escrito do mesmo jeito
  (inofensivo) e nenhum `page_view` sai (comportamento da `61`).

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| MTA-01 | P1 título — rotas fixas, títulos distintos | Pending |
| MTA-02 | P1 título — produto: título com sufixo condicional | Pending |
| MTA-03 | P1 título — produto: descrição curada ou derivada | Pending |
| MTA-04 | P1 título — categoria | Pending |
| MTA-05 | P1 título — 404 com `noindex` | Pending |
| MTA-06 | P1 título — `robots` criado e removido | Pending |
| MTA-07 | P1 título — `og:`/`twitter:` título e descrição em sincronia | Pending |
| MTA-08 | P1 título — nada escrito carregando, nada revertido ao desmontar | Pending |
| MTA-09 | P1 título — Home lê `store_settings.seo` | Pending |
| MTA-10 | P1 guarda — toda página declara; tabela fixa bidirecional | Pending |
| MTA-11 | P1 GA — `page_view` com o título declarado | Pending |
| MTA-12 | P1 GA — espera a página que carrega dado | Pending |
| MTA-13 | P1 GA — prazo de 3 s | Pending |
| MTA-14 | P1 GA — `REPLACE` antes de declarar não mede | Pending |
| MTA-15 | P2 servido — título e descrição do produto no HTML, pela função de `core/seo` | Pending |
| MTA-16 | P2 servido — `og:type`, `og:url`, `og:image` do produto | Pending |
| MTA-17 | P2 servido — uma instância de cada tag, escape | Pending |
| MTA-18 | P2 servido — caminhos de falha servem a página | Pending |
| MTA-19 | P1 arte — `og:image` padrão nova, JPEG 1200×630 | Pending |

**Coverage:** 19 no total.

---

## Success Criteria

- [ ] Em navegador, Home → categoria → produto → checkout mostram quatro títulos diferentes, e os
      quatro `page_view` saem com esses quatro títulos (produto com a resposta atrasada).
- [ ] `curl` do HTML servido de um produto contém o `seo_title` dele em `<title>` e `og:title`, e
      exatamente uma `og:title` — medido no deploy depois do `functions deploy`.
- [ ] Sem regressão de baseline (lint 26/7, tipos 0·0, testes por workspace com exit code capturado);
      `packages/core/src/payment/**` sem uma linha alterada.
