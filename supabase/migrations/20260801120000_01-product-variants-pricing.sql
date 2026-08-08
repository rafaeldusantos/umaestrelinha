-- =====================================================================
-- 07 · T1 — product_variants como fonte de verdade da linha vendável
-- =====================================================================
-- Requisitos: VAR-01 (AC 1), VAR-02, VAR-03, VAR-10
--
-- Hoje existem DUAS verdades sobre variação:
--   1. `products.variants` (JSONB, {size, finish, stock, sku}) — o que o
--      formulário do backoffice grava, e que NÃO tem coluna de preço.
--   2. `public.product_variants` ({name, sku, price_override, stock}) — a
--      tabela que `order_items.variant_id` referencia por FK.
-- A própria migration 20260726000000 registra a dívida como aberta (linhas
-- 60-62). O resultado é que nem o pedido sabe qual linha foi vendida.
--
-- Esta migration escolhe a TABELA como fonte de verdade e a estende para
-- responder "quanto custa e quanto tem desta linha". O JSONB é esvaziado de
-- responsabilidade em T2 e removido no fecho do programa (VAR-13, feature 13).
--
-- É ALTER, não CREATE: a tabela nasceu em 20260414121021 e já é populada pelo
-- seed. `id` é preservado em toda linha existente — qualquer DROP/CREATE
-- deixaria `order_items.variant_id` órfão.

-- ---------------------------------------------------------------------
-- 1. product_variants: colunas de precificação, logística e vitrine
-- ---------------------------------------------------------------------
ALTER TABLE public.product_variants
  -- Os eixos desta linha, como {"Tamanho": "4,5 cm", "Acabamento": "Fosco"}.
  -- Objeto e não array para que a leitura por eixo seja direta e a ordem de
  -- exibição venha de `products.options[].position`, não da ordem das chaves.
  ADD COLUMN IF NOT EXISTS option_values jsonb   NOT NULL DEFAULT '{}'::jsonb,
  -- Preço ABSOLUTO da linha (D2), não delta sobre products.base_price.
  -- Nullable de propósito: variação sem preço existe e é inválida para venda —
  -- quem barra é a UI (PFM-08 AC 11) e o servidor (PST-01 AC 9), não o schema.
  ADD COLUMN IF NOT EXISTS price         numeric(10,2),
  ADD COLUMN IF NOT EXISTS compare_price numeric(10,2),
  -- Peso próprio da linha; quando nulo, vale products.weight_kg.
  ADD COLUMN IF NOT EXISTS weight_kg     numeric(6,3),
  ADD COLUMN IF NOT EXISTS image_url     text,
  ADD COLUMN IF NOT EXISTS is_active     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS position      int     NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.product_variants.option_values IS
  'Eixos desta variação, ex.: {"Tamanho":"4,5 cm","Acabamento":"Fosco"}. Ordem de exibição vem de products.options[].position.';
COMMENT ON COLUMN public.product_variants.price IS
  'Preço absoluto cobrado por esta linha. NULL = variação sem preço: não vendável.';
COMMENT ON COLUMN public.product_variants.price_override IS
  'DEPRECADO (07/T1). Semântica ambígua no seed — ver A15 da spec. Não é lido por código novo; será removido junto com o JSONB legado.';

-- Serve tanto a leitura da grade no admin (todas as linhas de um produto, na
-- ordem) quanto a da vitrine. `product_id` sozinho já ajudaria, mas o par
-- evita o sort em cima do resultado no caminho mais quente.
CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON public.product_variants (product_id, position);

-- ---------------------------------------------------------------------
-- 2. products: eixos, política de estoque e prazo de produção
-- ---------------------------------------------------------------------
ALTER TABLE public.products
  -- Os eixos do produto: [{name, values[], position}]. Substitui sizes[] e
  -- finishes[], que eram dois eixos fixos e não davam conta de Cor/Estampa/Pack.
  -- As colunas antigas seguem vivas até VAR-13 (feature 13).
  ADD COLUMN IF NOT EXISTS options              jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Dias úteis; só exibição na página do produto, NÃO entra na cotação do
  -- Melhor Envio (A6).
  ADD COLUMN IF NOT EXISTS production_lead_days int;

-- `stock_policy` em statement próprio: o CHECK inline num ADD COLUMN IF NOT
-- EXISTS é ignorado em silêncio se a coluna já existir, e aí o banco ficaria
-- sem a constraint sem avisar. Separado e nomeado, dá para conferir por query.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_policy text NOT NULL DEFAULT 'track';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_policy_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_policy_check
      CHECK (stock_policy IN ('track', 'backorder', 'none'));
  END IF;
END $$;

COMMENT ON COLUMN public.products.options IS
  'Eixos do produto: [{name, values[], position}]. Máx. 3 (regra de UI). Substitui sizes[]/finishes[].';
COMMENT ON COLUMN public.products.stock_policy IS
  'track = desconta e esgota | backorder = vende no negativo | none = nunca esgota (personalizados e sob demanda).';
COMMENT ON COLUMN public.products.production_lead_days IS
  'Dias úteis de produção. Exibição apenas — não entra na cotação de frete (A6).';
