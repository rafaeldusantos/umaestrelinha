# BUG-20260802-loja-nao-mostra-nenhum-produto: a vitrine está vazia e toda página de produto diz "Produto não encontrado"

- **Status:** verified <!-- open | fixed | verified | wont-fix | invalid -->
- **Impact (user-side):** Blocks-Completion
- **Severity:** Critical · **Priority:** P0
- **Persona Affected:** Marina (e toda cliente da loja); Nana descobre pela ponta da journey de cadastro
- **Journey Step:** `J-cadastrar-produto-com-grade`, passo 7 — o true end state (a loja mostrando o produto). Atinge também toda navegação de vitrine.
- **Scenarios:** PRD-cadastro-com-grade-happy; MED-imagem-por-variacao-na-loja; MED-alt-chega-na-loja; PRD-slug-301-preserva-link-antigo
- **Found:** 2026-08-02 · **Report:** `../reports/2026-08-02-backoffice-catalogo-11-14.md`

## Summary

**A loja não vende.** A home carrega o layout inteiro — cabeçalho, hero, selos de frete e Pix — e
**nenhum produto**: zero cards, e nem uma mensagem de vazio. Abrir qualquer página de produto pelo link
direto devolve **"Produto não encontrado"**, inclusive produtos que estão ativos no banco e visíveis no
backoffice.

Do lado da cliente não há erro, não há spinner preso, não há "algo deu errado". A loja parece uma loja
que simplesmente não tem nada à venda.

Achado na ponta de loja da journey de cadastro: a lojista publicou um produto pelo backoffice (grade de 6
variações, foto, SEO, `is_active = true` confirmado no banco) e foi conferir na vitrine.

## Reproduction

- **Charter:** CH-cadastro-de-produto-com-grade · **Tour:** Feature Tour
- **Environment:** loja `http://localhost:8080`, phone-large 390×844, 4g, pt-BR (reproduz igual no desktop)

1. Abrir `http://localhost:8080/` → a home renderiza tudo, menos produto: **0 cards** (`a[href*="/produto/"]` = 0)
2. Abrir `http://localhost:8080/produto/botton-qa-sailor-moon` (produto ativo, publicado neste ciclo)
3. Abrir `http://localhost:8080/produto/levi-ackerman` (produto antigo, do seed) — mesmo resultado

**Expected:** a vitrine lista os produtos; a página do produto abre com galeria, seletores de variação e preço.
**Actual:** vitrine sem nenhum card; página de produto com **"Produto não encontrado"**.

## Evidence

- `../evidence/2026-08-02-backoffice-catalogo-11-14/loja-home-sem-produtos.png`
- `../evidence/2026-08-02-backoffice-catalogo-11-14/loja-produto-nao-encontrado.png`
- **Rede na home:** 6 requisições ao PostgREST com status **300**, 5 com 200. Todas as que falham são as de produto.
- **Corpo do erro** (replicado por HTTP fora do navegador, com a mesma publishable key da loja):

```json
{"code":"PGRST201",
 "message":"Could not embed because more than one relationship was found for 'products' and 'categories'",
 "details":[{"cardinality":"many-to-one","relationship":"products_category_id_fkey using products(category_id) and categories(id)"},
            {"cardinality":"many-to-many","relationship":"product_categories using product_categories_product_id_fkey(product_id) and product_categories_category_id_fkey(category_id)"}],
 "hint":"Try changing 'categories' to one of the following: 'categories!products_category_id_fkey', 'categories!product_categories'"}
```

- **Caminho de leitura independente:** o produto existe e está ativo —
  `select is_active, slug from products where slug='botton-qa-sailor-moon'` devolve `t`. O backoffice
  lista e edita o mesmo produto normalmente (ele não usa esse `select`).

## Fix

<!-- filled when status moves to fixed -->
- **Root cause:** `PRODUCT_SELECT` em
  [`apps/store/src/entities/product/lib/mapProduct.ts:20-21`](../../apps/store/src/entities/product/lib/mapProduct.ts#L20-L21)
  embeda **`categories(slug, name)`** e **`product_categories(category_id, position)`** no mesmo
  `select`. Desde que a feature `07` criou `product_categories` (migration
  `20260801120300_04-categories-redirects-order-items.sql`), existem **dois** caminhos de
  `products` para `categories` — a FK legada `products.category_id` e a N:N. O PostgREST se recusa a
  adivinhar e responde `300 PGRST201`; o `supabase-js` devolve erro, os hooks tratam como "sem
  resultado", e a UI mostra vitrine vazia e "Produto não encontrado".
  A correção é desambiguar o embed nomeando a FK — `categories!products_category_id_fkey(slug, name)`
  — no único lugar onde `PRODUCT_SELECT` é declarado. Ele serve os 3 hooks da loja
  (`useProduct`, `useProducts`, recuperação de carrinho), então a mesma linha conserta tudo.
- **Por que os testes não pegaram:** os testes de `useProducts`/`useProduct` mockam o client
  `supabase` — a string do `select` nunca chega a um PostgREST de verdade. É a mesma armadilha do
  `AD-012` (tipo/afirmação vs. verificação), agora na forma de uma **query** que só falha contra o
  banco real.
- **Fix commit:** `eca8b64`
- **Regression test:** `apps/store/src/entities/product/lib/__tests__/mapProduct.test.ts` — guarda a forma
  da query (embed com a FK nomeada). **2 de 3 falham** sem a correção, provado com `git stash` do arquivo
  de origem. O teste é de string de propósito: o defeito não estava em lógica nenhuma, estava na query, e
  o que dá para guardar em vitest é a forma dela. A prova real foi HTTP contra o banco local, na sessão.

## Verification

- **Retested:** 2026-08-02, sessão limpa da Marina em 390×844 (phone-large, a persona primária da loja) ·
  **Report:** `../reports/2026-08-02-backoffice-catalogo-11-14.md`
- **Result:** **16 cards de produto na home** (eram 0) e a página do produto publicado nesta sessão abre
  com os dois seletores de variação e o preço vindo da grade. Produtos antigos do seed também voltaram.
  As combinações aparecem como "indisponível" porque o produto de teste ficou com estoque 0 e política
  `Controlar estoque` — comportamento correto, não resíduo do defeito.
- **Journey adjacente re-andada:** o cadastro no backoffice segue gravando (mesmo produto reaberto, grade
  íntegra com os 6 preços).
