-- VAR-13 — a limpeza que fecha o programa do catálogo (features 07, 11, 12, 13).
--
-- `products.variants` (JSONB `{size, finish, stock, sku}`), `products.sizes` e `products.finishes`
-- eram o modelo antigo: dois eixos FIXOS e uma lista de variações **sem preço**. O modelo novo é
-- `product_variants` (tabela, com preço, promo, estoque, SKU, peso e imagem por linha) mais
-- `products.options` (eixos livres, até 3).
--
-- Por que só agora: enquanto as colunas existirem, qualquer código novo pode lê-las por engano — e
-- foi exatamente isso que aconteceu no meio do caminho (o formulário seguiu gravando o JSONB morto
-- para não zerar produtos antigos). A remoção exige as **três** frentes fechadas (A25 / `AD-009`):
-- a `11` (formulário) e a `12` (mídia) liam essas colunas até fecharem.
--
-- Migração de dados: nenhuma. `product_variants` já foi populada a partir do JSONB na migration
-- `20260801120000_01-product-variants-pricing.sql`, e os eixos foram para `options` na
-- `20260801120100`. Isto aqui só remove o que sobrou.

alter table public.products
  drop column if exists variants,
  drop column if exists sizes,
  drop column if exists finishes;

comment on column public.products.options is
  'Os eixos de escolha do produto, na ordem de position. Substituiu sizes/finishes (VAR-13).';
