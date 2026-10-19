# 68 — Context

**Gathered:** 2026-10-18
**Spec:** `.specs/features/68-seo-por-variacao/spec.md`
**Status:** Spec escrita — aguardando revisão (as *Assumptions* estão com `Confirmed? n`)
**Depende de:** `67-filtros-nas-variacoes` (a tabela `product_option_filter_values`). Implementar
só depois dela; publicar a migration da `67` antes do código da `68`.

---

## Feature Boundary

A opção da peça marcada num filtro pela `67` vira uma URL indexável
(`/produtos/<slug>?variant=<representante>`), autocanônica, com título "Peça — Opção", no cliente e
no HTML servido, e entra no sitemap. Toda outra URL com `?variant=` canoniza para a peça. **Sem**
migration, **sem** mudança no feed do Google Shopping, **sem** tela nova na loja. O painel só ganha
texto informativo na seção da `67` (P3).

## Medido antes de decidir (banco local e código, 2026-10-18)

- 702 peças, 691 ativas; 121 ativas sem eixo nenhum. 3.380 variações, 3.368 ativas, **zero** sem
  `nuvemshop_id`, **zero** ativas sem preço, **zero** empates de `position` dentro da mesma peça.
- `Cor` em 395 peças ativas, sempre com ≥ 2 textos ativos (85 com 2, 305 com 3, 5 com 4–5): **1.107
  pares (peça, cor)**. 24 textos distintos, de "Folheado a Ouro" (225 peças) a grafias únicas.
- Pelo eixo indexável de SVR-02 (o primeiro eixo de `options` com ≥ 2 textos), o teto se tudo fosse
  marcado é ~1.575 páginas: Cor 958 (343 peças), eixos de elo ~455, o resto ~160. Em 52 peças o
  primeiro eixo de `options` **não** é `Cor` (ex.: "Com Base: Não" vem antes) — por isso a regra é
  "o primeiro eixo **com marcação**", não "o primeiro eixo".
- Curadoria de prova da `66` no banco local: Acabamento com 3 valores e 239 marcações na peça toda
  (Prata 925 183, Folheado a ouro 32, Aço inoxidável 24). A tabela da `67` ainda não existe.
- Título: `"{nome} — {cor}"` tem mediana de **68** caracteres; **1.059 de 1.107** passariam de 60
  com `| Uma Estrelinha`. 162 das 395 peças com `Cor` já citam material no nome ("… em Prata 925").
- Sitemap: 719 `<loc>` em 2026-08-29 (comentário do `sitemap-check.yml`, não remedido aqui), piso 700; 35 categorias ativas no banco local.
- Código:
  - `ProductPage.tsx:79` declara a canônica `productPath(slug)` sem query; `:88` chama `usePageMeta`
    com `productPageMeta` antes de o corpo ler o `?variant=` (`:159`, uma vez por montagem do corpo,
    `key={product.id}`).
  - `product-page/handlers.ts` já resolve `?variant=` (`variantByPublicId` → elegível →
    `representativeVariant`), mas usa `productPageMeta(dados.product)` e `og:url` da peça, e **não
    emite `<link rel="canonical">`** — a canônica só existe depois do JavaScript.
  - A `product-page` lê com `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS); o `sitemap` lê com a chave
    publicável (RLS).
  - `offerLink` monta o `<g:link>` como `productPath(slug)?variant=<publicVariantId>`;
    `productJsonLd` usa esse link em `offers.url`. `shoppingParity.test.ts:108` assere
    `offers.url == <g:link>`.
  - `core/sitemap/__tests__/urls.test.ts:53` recusa qualquer `?` numa `<loc>` (`SMP-07`).
  - `brandedTitle` nunca corta; `DESCRIPTION_MAX = 160` só para descrição derivada.
  - `core/shopping/{identity,eligibility,offer}.ts` já são alcançáveis pelo Deno (imports com `.ts`).

## Implementation Decisions

### Do usuário (2026-10-18)
- Página própria indexável **só** para opção marcada num filtro, uma por (peça × opção marcada).
  Letra, gravação e opções sem marcação canonizam para a peça. Não indexar as 3.380 variações.
- Feature separada da `67`.

### Do agente, como default (todas `Confirmed? n` na spec)
- URL = `?variant=` da representante, igual ao `<g:link>` do feed; representante sem estoque na
  régua (estabilidade da canônica).
- Um eixo só por peça gera página; eixo com um texto só não gera.
- Título com o **texto da opção** e o **nome** da peça; marca só até 60 caracteres.
- `offers.url` continua = `<g:link>`; a canônica entra em `Product.url` e na `<link rel>` servida.
  Revoga a `SEO-18` da `36` (e o edge case irmão) e a `SMP-07` da `33`, por escrito.
- `ProductGroup` só na página sem query e só para eixo com propriedade de `schema.org` (`Cor`,
  `Tamanho`); o `Product` da variação aberta fica onde o Merchant Center chega.
- Falha de marcações: cliente e servidor caem na peça; sitemap responde degradado (não 200).

### Agent's Discretion (para o Design)
- O módulo de `core` que é dono da regra (`core/seo` ou um vizinho), desde que alcançável pelo Deno.
- Como a página do produto recebe as marcações (embed na consulta do produto ou consulta irmã),
  desde que SVR-13 valha.
- Como reabrir a variação na navegação SPA entre dois `?variant=` da mesma peça (SVR-16).

## Specific References

- "Quando a página abre com `?variant=`, o título passa a ser 'Peça — Variação' e mais opções entram
  no Google" (pedido do usuário).
- `AD-020` (a superfície que o Google lê é servida, e o preço vem da mesma função que o feed),
  `AD-021` (prova pelo `Content-Type` entregue), `AD-048` (o `<head>` tem um dono, `core/seo`).
- Um registro de decisão (`AD-0NN`, "a URL de uma opção marcada é a canônica dela") deve entrar no
  `STATE.md` no Design — esta sessão não escreveu fora da pasta da feature.

## Deferred Ideas

- Combinação de dois eixos indexáveis (Cor × Tipo de elo), se o Search Console mostrar demanda.
- Título/descrição curados por opção no painel, se a derivação se mostrar fraca para alguma peça.
- O seletor de opção mudar a URL (`replaceState`), para o link compartilhado levar a cor escolhida.
- Subir o piso do `sitemap-check.yml` depois que a curadoria das cores estabilizar.
