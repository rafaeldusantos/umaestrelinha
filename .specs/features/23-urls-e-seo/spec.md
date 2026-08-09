# 23 · URLs e SEO — Especificação

> **Nasceu de uma medição, não de uma suposição.** Ao fechar a [`21`](../21-catalogo-nuvemshop/spec.md)
> ficou claro que preservar o *slug* — que a `21` entrega — **não faz a URL indexada resolver**, porque
> o que difere é o **caminho**. Esta feature toma para si o bloco `SEO-01..03`, que saiu da
> [`22`](../22-material-afetivo/spec.md): aquele bloco descrevia "slug antigo → slug novo", que é um
> problema diferente e menor.

## Problem Statement

A loja em `umaestrelinha.com.br` tem tráfego orgânico construído pelas landing pages. No go-live, o
domínio passa a apontar para a loja nova. **Toda URL indexada quebra**, porque os formatos não são os
mesmos.

Medido no site real em 2026-08-09, pela tag `<link rel="canonical">`:

| o que | URL canônica hoje | a loja nova serve |
| --- | --- | --- |
| Produto | `/produtos/<slug>/` | `/produto/:slug` |
| Categoria raiz | **`/<slug>/`** | `/colecao/:slug` |
| Subcategoria | **`/<pai>/<filha>/`** | `/colecao/:slug` |

Dois detalhes que a medição revelou e que mudam o desenho:

- `/produto/<slug>/` (singular) **já responde 301** para o plural no site atual — o formato singular
  nunca foi canônico.
- `/categoria/<slug>/` também responde, mas canonicaliza para `/<slug>/`. A Nuvemshop aceita várias
  formas e canonicaliza uma. A loja nova precisa fazer o mesmo, ou o Google verá conteúdo duplicado.

**A consequência mais séria não é de rota, é de nomes.** Com categoria na raiz, o namespace de
categoria e o de rota viram **o mesmo namespace**. Hoje não há colisão — os 10 slugs raiz não batem com
`/conta`, `/busca`, `/sobre`, `/checkout`. Mas no dia em que a Adri criar uma categoria "sobre", ou
alguém acrescentar a rota `/ajuda` existindo a categoria `ajuda`, **uma das duas some sem aviso**.

## Goals

- [ ] Toda URL hoje indexada resolve na loja nova — produto, categoria raiz e subcategoria.
- [ ] Uma URL canônica por conteúdo; as demais formas redirecionam com 301.
- [ ] Um slug de categoria **nunca** pode encobrir nem ser encoberto por uma rota da loja.
- [ ] Nenhuma URL válida cai em tela branca.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Peso da listagem de categoria (3,1 MB) | Problema real e medido, mas é performance de leitura, não endereçamento. Registrado no `BACKLOG.md`. |
| Sitemap e dados estruturados | Só fazem sentido depois de o endereçamento estar decidido. |
| Decisão de DNS e cutover | `C-08`. Esta feature deixa a loja pronta; a virada é operação. |

---

## Assumptions & Open Questions

| Assumption | Chosen default | Confirmado? |
| --- | --- | --- |
| Formato canônico do produto | `/produtos/:slug` — o que a Nuvemshop publica | **y** — medido |
| Formato canônico da categoria | `/:slug` na raiz, e `/:pai/:filha` para filha | **y** — medido pelo canonical |
| Profundidade máxima da árvore | 2 níveis (10 raízes, 29 filhas) | **y** — medido no catálogo real |
| O que fazer com `/produto/:slug` e `/colecao/:slug` | **301** para o canônico novo | n — validar na Design |
| Barra final (`/produtos/x/` vs `/produtos/x`) | Aceitar as duas, canonicalizar numa | n — validar na Design |

**Decisões do usuário — 2026-08-09** (fecham as duas perguntas que estavam abertas):

1. **A loja nova adota o formato da loja em produção, incluindo a rota de categoria na raiz.** Não se
   troca por `/colecao/:slug` com 301. O custo — namespace de categoria e de rota compartilhados — é
   **aceito de propósito**, e é exatamente por isso que `URL-05` e `URL-06` existem: a lista de
   palavras reservadas deixa de ser zelo e passa a ser a contrapartida desta escolha.
2. **As duas formas de subcategoria continuam respondendo**, e a **canônica é a de dois segmentos**
   (`/joias-afetivas/joia-de-leite-materno/`) — a mesma que o site atual declara. A forma de um
   segmento resolve e aponta canonical para a de dois; se em algum momento for preciso escolher uma
   só, fica a de dois.

**Open questions:** nenhuma sem registro.

---

## User Stories

### P1: As URLs indexadas resolvem ⭐ MVP

**AC**:

1. WHEN `/produtos/<slug>` é acessado THEN SHALL responder o produto, e SHALL ser a URL canônica.
2. WHEN `/produto/<slug>` (singular, formato da loja nova hoje) é acessado THEN SHALL responder **301**
   para `/produtos/<slug>`.
3. WHEN `/<slug>` de uma categoria **raiz** é acessado THEN SHALL responder a categoria, e SHALL ser a
   URL canônica dela.
3b. WHEN `/<pai>/<filha>` é acessado THEN SHALL responder a subcategoria, e SHALL ser a URL canônica
   dela; `/<filha>` sozinha SHALL responder a mesma página, apontando canonical para a de dois
   segmentos.
3c. WHEN `/colecao/<slug>` é acessado THEN SHALL responder **301** para a forma canônica — a rota
   atual da loja nova deixa de ser canônica, mas continua resolvendo.
4. WHEN um slug não corresponde a nada THEN SHALL responder a **404 própria**, nunca tela branca nem
   listagem completa do catálogo.

### P1: Nome de categoria nunca encobre rota

**AC**:

5. WHEN a admin tenta salvar uma categoria cujo slug casa com uma rota reservada da loja THEN SHALL ser
   **recusado no formulário**, com a lista visível — e não descoberto meses depois pela cliente.
6. WHEN uma rota nova é acrescentada ao `App.tsx` THEN um teste SHALL falhar se ela não estiver na
   lista de reservadas — a lista e as rotas não podem divergir em silêncio.

### P2: Slug que muda não perde a página

**AC**:

7. WHEN o slug de um produto muda THEN o anterior SHALL continuar resolvendo por `product_redirects`.
8. WHEN o slug de uma categoria muda THEN o anterior SHALL resolver por uma tabela equivalente, que
   **ainda não existe** — hoje só há a de produto (`20260801120300`).

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| URL-01 | P1 · `/produtos/:slug` canônico (AC 1) | Specify | Pending |
| URL-02 | P1 · 301 do singular para o plural (AC 2) | Specify | Pending |
| URL-03 | P1 · Categoria no formato indexado, demais com 301 (AC 3) | Specify | Pending |
| URL-04 | P1 · 404 própria, nunca tela branca nem catálogo inteiro (AC 4) | Specify | Pending |
| URL-05 | P1 · Slug reservado recusado no cadastro (AC 5) | Specify | Pending |
| URL-06 | P1 · Guarda entre rotas e lista de reservadas (AC 6) | Specify | Pending |
| SEO-01 | P2 · Redirect de produto por `product_redirects` (AC 7) | Specify | Pending |
| SEO-02 | P2 · Redirect de categoria, tabela nova (AC 8) | Specify | Pending |

**Cobertura:** 8 requisitos. `SEO-01` e `SEO-02` vieram da `22`, onde estavam mal enquadrados;
`SEO-03` (404 própria) virou `URL-04`, porque é do endereçamento e não do redirect.

---

## Success Criteria

- [ ] Uma amostra de URLs colhida do site atual — produto, categoria raiz e subcategoria — resolve na
      loja nova, medida com o mesmo método que descobriu o problema (`curl` + `canonical`).
- [ ] Nenhuma URL responde 200 em duas formas sem uma delas ser canônica.
- [ ] Criar categoria com slug reservado é recusado no formulário.
- [ ] Nenhum teste de dinheiro muda de resultado.
