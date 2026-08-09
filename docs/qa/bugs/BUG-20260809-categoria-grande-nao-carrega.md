# BUG-20260809 — Categoria grande abre vazia, em silêncio

- **Achado em**: 2026-08-09, na validação da feature [`21-catalogo-nuvemshop`](../../../.specs/features/21-catalogo-nuvemshop/spec.md) (`T17`)
- **Severidade**: alta — a maior categoria da loja não mostra produto nenhum
- **Onde**: `apps/store/src/entities/product/api/useProducts.ts`
- **Status**: ✅ **CORRIGIDO** em 2026-08-09, na mesma sessão, depois de registrado

## Como ficou

- **Filtro no servidor, por embed aliased** (`PRODUCT_SELECT_BY_CATEGORY`): o que viaja na URL passou
  a ser a árvore de **categorias** (dezenas, limitada pela profundidade) em vez da lista de
  **produtos** (centenas, limitada pelo catálogo). O alias existe porque `product_categories!inner`
  filtrado **trunca o embed**, e `category_links` alimenta o selo do card (`displayCategory`, PST-06)
  e a busca — truncar mudaria o selo em silêncio. Medido contra o banco real: 46 produtos, 5 vínculos
  em `product_categories` e 1 em `filtro`, nos 46.
- **O erro sobe** (`ProductQueryError`) em vez de virar `[]`, e a `CategoryPage` mostra estado de
  falha próprio — não mais "Nenhuma joia com esses filtros", que mandava mexer em filtro inocente.
- **Uma consulta a menos**: eram três (árvore → vínculos → produtos), agora são duas.

**Verificado em 390×844 com o catálogo real**: `503 produtos encontrados`, 503 cards, zero requisição
falhada, 7,3 s até `networkidle`. As imagens abaixo da dobra são `loading="lazy"` (26 carregadas,
48 depois de rolar) — comportamento correto, não defeito.

**Testes**: os 6 que assertavam o mecanismo antigo foram reescritos contra o comportamento, com
autorização explícita — nenhuma garantia se perdeu (roll-up de descendência, dedupe, folha, sem N+1).
Mais três novos: a regressão da URL congelada (nenhum filtro por id de produto; o galho enviado cabe
em 4 ids mesmo com 500 produtos na categoria) e as duas falhas que agora sobem.

---

## O que NÃO foi corrigido, e fica para outra rodada

1. **A listagem carrega 3,1 MB** para 503 produtos. `description` é 1,15 MB (37%) e o card não o
   renderiza — mas **a busca pontua por ele** (`searchProducts.ts:76`), então cortá-lo degradaria a
   busca em silêncio. Resolver de verdade é `select` de listagem + paginação + busca no servidor.
2. **Outras quatro consultas ainda engolem erro**: `useAllProducts`, `useFeaturedProducts`,
   `useNewProducts`, `useProductById`. **O dano não é só cosmético**: com `return []`, o React Query
   guarda o vazio como **sucesso** e não repete a tentativa — um blip de rede na home deixa a loja
   vazia até o cliente recarregar à mão. Corrigir exige estado de erro na home, na gaveta do carrinho
   e na busca.

---

## Registro original (mantido)

## O que acontece

Abrir `/colecao/joias-afetivas` (508 produtos) mostra **"0 produtos encontrados"** e a mensagem
"Nenhuma joia com esses filtros". Nenhum erro na tela.

Medido em 390×844, com o catálogo real importado:

```
FALHOU: net::ERR_FAILED | tamanho da URL: 14309
http://127.0.0.1:54341/rest/v1/products?select=…&id=in.(f7ed8f2d-…,3c0a60bd-…, …508 uuids… )
```

## Causa

São **dois** defeitos que se escondem um ao outro.

1. **URL longa demais.** A consulta resolve a descendência da categoria em `product_categories`,
   junta os `product_id` e filtra com `query.in('id', ids)`. Com 508 produtos isso vira uma URL de
   **14.309 caracteres**, que o gateway recusa antes de chegar ao PostgREST. Funcionava com o seed de
   desenvolvimento porque lá a maior categoria tinha 4 produtos.

2. **O erro é engolido.** `if (error || !data) return []` transforma a falha em lista vazia, e a tela
   não tem como distinguir "categoria sem produto" de "a consulta falhou". É a **mesma forma** do
   defeito que `AD-014` registrou em `useAdminCollections` (`PGRST205` engolido ⇒ grade vazia para
   sempre) — segunda ocorrência do padrão no projeto.

## Por que ele nao foi consertado DENTRO da feature 21

A `21` importa catalogo; este defeito e da leitura da loja. Ele foi registrado no fecho da `21` e
corrigido em seguida, em trabalho proprio, com os testes reescritos sob autorizacao explicita — e nao
como remendo no fim da outra feature.

**O dado sempre esteve certo no banco**: o defeito era de leitura, nunca de gravacao.
