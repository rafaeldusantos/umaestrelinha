-- =====================================================================
-- 21 · T1 — nuvemshop_id: a chave de idempotência do import
-- =====================================================================
-- Requisito: CAT-01
--
-- O import da feature 21 é ONE-SHOT mas RE-EXECUTÁVEL: rodar de novo tem de
-- atualizar o que existe e criar zero duplicata. Isso exige uma chave estável
-- que sobreviva a qualquer edição feita nos dois lados.
--
-- ---------------------------------------------------------------------
-- POR QUE O ID E NÃO O SLUG
-- ---------------------------------------------------------------------
-- Slug é a candidata óbvia: `products.slug` e `categories.slug` já são UNIQUE, e
-- o import preserva o slug da origem (CAT-02). Mas slug MUDA na origem — é o
-- que acontece toda vez que a Adri renomeia um produto na Nuvemshop. Chaveado
-- por slug, um produto renomeado não é encontrado, entra como registro NOVO, e
-- a loja fica com duas fichas do mesmo produto: a velha (com o slug indexado,
-- agora órfã) e a nova. O id da Nuvemshop não muda.
--
-- ---------------------------------------------------------------------
-- POR QUE TAMBÉM EM product_variants
-- ---------------------------------------------------------------------
-- Sem a coluna aqui, a única forma de casar uma variação na re-execução seria
-- por `option_values` — que muda quando um eixo é renomeado na origem
-- ("Tipos de elo" -> "Tipo de elo"). O efeito é pior do que na tabela de
-- produto: a variação antiga continua ATIVA e VENDÁVEL ao lado da nova, e o
-- trigger `sync_product_base_price` passa a derivar `base_price` de uma linha
-- que a origem já não tem. Medido no catálogo real: 3.357 variações, uma delas
-- num produto com 144 linhas de grade.
--
-- ---------------------------------------------------------------------
-- POR QUE bigint, E POR QUE ÍNDICE SIMPLES
-- ---------------------------------------------------------------------
-- `bigint` e não `int`: os ids medidos hoje cabem em 32 bits (32376553,
-- 40271295), mas nada na API garante essa faixa, e migrar tipo de coluna
-- chaveada depois é caro.
--
-- Índice único SIMPLES e não parcial: em Postgres `NULL` nunca colide com
-- `NULL`, então as linhas locais (produto cadastrado à mão, categoria criada no
-- admin) convivem sem predicado nenhum. Um `where nuvemshop_id is not null`
-- daria o mesmo resultado com uma armadilha a mais — a L-018 registra que
-- índice único parcial não aceita deferrable e não compõe com constraint.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS nuvemshop_id bigint;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS nuvemshop_id bigint;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS nuvemshop_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS categories_nuvemshop_id_key
  ON public.categories (nuvemshop_id);

CREATE UNIQUE INDEX IF NOT EXISTS products_nuvemshop_id_key
  ON public.products (nuvemshop_id);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_nuvemshop_id_key
  ON public.product_variants (nuvemshop_id);

COMMENT ON COLUMN public.categories.nuvemshop_id IS
  'Id da categoria na Nuvemshop. Chave de idempotencia do import (CAT-01). NULL = registro local, criado no admin.';
COMMENT ON COLUMN public.products.nuvemshop_id IS
  'Id do produto na Nuvemshop. Chave de idempotencia do import (CAT-01). NULL = registro local, criado no admin.';
COMMENT ON COLUMN public.product_variants.nuvemshop_id IS
  'Id da variacao na Nuvemshop. Sem ela, renomear um eixo na origem transformaria a variacao em duplicata ativa e vendavel.';
