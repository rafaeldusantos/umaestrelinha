-- =====================================================================
-- 07 · T4 — product_categories, product_redirects e price_source
-- =====================================================================
-- Requisitos: VAR-05, VAR-06, VAR-09
--
-- Três coisas independentes que compartilham o mesmo momento de deploy porque
-- nenhuma delas sozinha justifica uma migration, e todas são pré-condição do
-- caminho do dinheiro (fase 3) e da loja (fase 4).

-- ---------------------------------------------------------------------
-- 1. product_categories — N:N (VAR-05)
-- ---------------------------------------------------------------------
-- Hoje `products.category_id` é FK única: um produto está em UMA categoria. O
-- catálogo real quer o botton de Sailor Moon em `anime`, `Sailor Moon` e
-- `mais vendidos` ao mesmo tempo.
--
-- Conjunto PLANO, sem categoria "principal" (D3). Quando a loja precisa de UMA
-- (selo do card, breadcrumb), a regra é determinística: menor
-- `categories.sort_order`, empate desfeito por `product_categories.position`
-- (PST-06). Uma flag `is_primary` seria mais um estado para manter em sincronia
-- e mais uma forma de o dado ficar inconsistente.
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id  uuid NOT NULL REFERENCES public.products(id)   ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  position    int  NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, category_id)
);

-- A PK cobre a busca por produto; este índice cobre o sentido inverso, que é o
-- da vitrine ("todos os produtos da categoria X").
CREATE INDEX IF NOT EXISTS product_categories_category_idx
  ON public.product_categories (category_id);

-- Backfill: todo produto que já tem categoria ganha a linha equivalente.
-- `position = 0` porque não há ordem anterior a preservar.
INSERT INTO public.product_categories (product_id, category_id, position)
SELECT p.id, p.category_id, 0
FROM public.products p
WHERE p.category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;

-- `products.category_id` PERMANECE. É coluna legada: a loja e o admin ainda a
-- leem até PST-06 e PFM-05 entrarem. Remover aqui quebraria os dois.
COMMENT ON COLUMN public.products.category_id IS
  'LEGADO (07/T4). A verdade e public.product_categories (N:N). Mantida ate os leitores migrarem (PST-06, PFM-05).';

-- ---------------------------------------------------------------------
-- 2. product_redirects — 301 de slug antigo (VAR-06)
-- ---------------------------------------------------------------------
-- Editar o slug de um produto publicado hoje mata todo link já postado no
-- Instagram e indexado no Google, sem aviso.
CREATE TABLE IF NOT EXISTS public.product_redirects (
  from_slug  text PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_redirects_product_idx
  ON public.product_redirects (product_id);

COMMENT ON TABLE public.product_redirects IS
  'Slugs antigos que devem redirecionar 301 para o produto. ON DELETE CASCADE: produto morto nao deixa redirect pendurado.';

-- ---------------------------------------------------------------------
-- 3. order_items: caminho de preço congelado no pedido (VAR-09)
-- ---------------------------------------------------------------------
-- `price_source` é o que impede o preço de um pedido pendente de mudar porque
-- o admin criou ou pausou uma variação no meio do caminho (A8). O servidor
-- respeita o que está GRAVADO no item, sem reavaliar se o produto tem grade.
--
-- DEFAULT 'base' faz as linhas existentes descreverem exatamente o
-- comportamento de hoje — nenhum pedido antigo muda de preço.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS price_source    text NOT NULL DEFAULT 'base',
  -- Snapshot legível: "4,5 cm · Fosco". O histórico do pedido não pode depender
  -- de join em product_variants, que pode ter sido pausada ou reeditada.
  ADD COLUMN IF NOT EXISTS variant_label   text,
  ADD COLUMN IF NOT EXISTS variant_options jsonb;

-- CHECK em statement próprio e nomeado, pelo mesmo motivo de T1: inline num
-- ADD COLUMN IF NOT EXISTS ele é ignorado em silêncio se a coluna já existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_source_check'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_price_source_check
      CHECK (price_source IN ('base', 'variant'));
  END IF;
END $$;

COMMENT ON COLUMN public.order_items.price_source IS
  'Como este item foi precificado, CONGELADO no pedido: base = products.base_price | variant = product_variants.price. O servidor respeita este valor, nao reavalia.';
COMMENT ON COLUMN public.order_items.variant_label IS
  'Snapshot do rotulo da variacao no momento da compra, ex.: "4,5 cm · Fosco". Historico legivel sem join.';
COMMENT ON COLUMN public.order_items.variant_options IS
  'Snapshot de option_values no momento da compra.';
