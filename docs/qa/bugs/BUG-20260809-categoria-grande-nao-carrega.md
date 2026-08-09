# BUG-20260809 — Categoria grande abre vazia, em silêncio

- **Achado em**: 2026-08-09, na validação da feature [`21-catalogo-nuvemshop`](../../../.specs/features/21-catalogo-nuvemshop/spec.md) (`T17`)
- **Severidade**: alta — a maior categoria da loja não mostra produto nenhum
- **Onde**: `apps/store/src/entities/product/api/useProducts.ts:47` e `:51`
- **Escopo**: código da loja (feature `20`), **não** do importador. Registrado e **não corrigido**
  dentro da `21` de propósito — ver *Por que não foi consertado aqui*.

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

## Por que nenhum gate pegou

- `pnpm test` passa: os testes de `useProducts` mockam o client, e mock não tem limite de URL.
- `tsc` e `build` passam: não há erro de tipo.
- O seed de desenvolvimento **não tinha volume** — a maior categoria tinha 4 produtos.

É a mesma família dos três defeitos que o `T17` expôs no importador: **só existe em escala.**

## Terceiro problema, que aparece assim que os dois primeiros forem consertados

A consulta **não tem `limit` nem `range`**. Mesmo com o filtro corrigido, ela tentaria trazer 508
produtos com todas as variações numa resposta só — e o PostgREST corta em 1.000 linhas de qualquer
forma. Numa loja em que ~90% dos acessos vêm de celular, carregar a categoria inteira de uma vez é
problema por si.

## Forma sugerida do conserto (não implementada)

1. **Filtrar no servidor**, sem trafegar uuid: `product_categories!inner(category_id)` com
   `.in('product_categories.category_id', branch)`. A lista de ids sai da URL — passam a viajar só os
   ids das categorias da descendência (dezenas, não centenas).
2. **Parar de engolir o erro**: distinguir "vazio" de "falhou" e mostrar estado de erro.
3. **Paginar** a listagem de categoria.

Os três merecem teste próprio, e o (1) mexe na consulta que também lê preço e variação — caminho de
dinheiro. Por isso não entrou como remendo no fim de outra feature.

## Por que não foi consertado aqui

A feature `21` importa catálogo; este defeito é da leitura da loja. O conserto certo muda a consulta
que carrega preço e variação, e pede paginação — trabalho com escopo, desenho e testes próprios.
Emendá-lo no fecho do import trocaria um defeito visível por um risco invisível no caminho do dinheiro.

**O que a `21` entrega apesar disto**: home e página de produto renderizam com o catálogo real, com
foto servida pelo Storage. O dado está correto no banco — o defeito é de leitura, não de gravação.
