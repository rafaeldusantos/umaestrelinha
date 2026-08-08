-- =====================================================================
-- products: colunas estendidas usadas pelo formulário do backoffice
-- =====================================================================
-- A tabela `products` nasceu na migration inicial com o mínimo do catálogo,
-- mas o front (DbProduct em @estrelinha/supabase/types + AdminProductFormPage)
-- evoluiu para um schema bem maior. O PATCH do backoffice enviava colunas
-- inexistentes e o PostgREST rejeitava com PGRST204
-- ("Could not find the 'buy_together_ids' column of 'products'").
--
-- Esta migration alinha o banco ao contrato que os apps já assumem.

-- ---------------------------------------------------------------------
-- 1. stock → stock_total
-- ---------------------------------------------------------------------
-- Nome único para o estoque. O backoffice lê/filtra/ordena por `stock_total`
-- em todo lugar (inclusive filtros server-side como `.lte('stock_total', 5)`
-- em useAdminStats) e o store lê com fallback `stock ?? stock_total`, então
-- renomear resolve os dois lados sem duplicar fonte de verdade.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_total'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN stock TO stock_total;
  END IF;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_total INT DEFAULT 0;

-- ---------------------------------------------------------------------
-- 2. Colunas novas
-- ---------------------------------------------------------------------
ALTER TABLE public.products
  -- precificação
  ADD COLUMN IF NOT EXISTS cost_price          NUMERIC(10,2),
  -- opções do produto (arrays livres; alimentam os seletores da ProductCard)
  ADD COLUMN IF NOT EXISTS sizes               TEXT[]      DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS finishes            TEXT[]      DEFAULT '{}'::text[],
  -- mídia
  ADD COLUMN IF NOT EXISTS video_url           TEXT,
  -- logística (usadas no cálculo de frete do Melhor Envio)
  ADD COLUMN IF NOT EXISTS weight_kg           NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS width_cm            NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS height_cm           NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS length_cm           NUMERIC(6,2),
  -- SEO
  ADD COLUMN IF NOT EXISTS seo_title           TEXT,
  ADD COLUMN IF NOT EXISTS seo_description     TEXT,
  -- publicação agendada
  ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMPTZ,
  -- merchandising
  ADD COLUMN IF NOT EXISTS related_product_ids UUID[]      DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS buy_together_ids    UUID[]      DEFAULT '{}'::uuid[],
  -- grade tamanho×acabamento embutida ({size, finish, stock, sku}[]).
  -- Convive com a tabela public.product_variants, que tem outro formato
  -- ({name, sku, price_override, stock}) e é referenciada por
  -- order_items.variant_id — unificar as duas é dívida em aberto.
  ADD COLUMN IF NOT EXISTS variants            JSONB       DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------
-- 3. apply_payment_approval: acompanhar o rename
-- ---------------------------------------------------------------------
-- Mesmo corpo de 20260718235214_payment_approval_rpc.sql, só trocando
-- stock → stock_total. Sem isso a baixa de estoque quebra no webhook.
CREATE OR REPLACE FUNCTION public.apply_payment_approval(
	p_order_id uuid,
	p_mp_payment_id text,
	p_status_detail text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
	v_coupon_id uuid;
begin
	update public.orders
	set
		payment_status = 'approved',
		paid_at = now(),
		mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id),
		mp_status_detail = coalesce(p_status_detail, mp_status_detail)
	where id = p_order_id
		and paid_at is null
	returning coupon_id into v_coupon_id;

	if not found then
		return false;
	end if;

	-- Baixa de estoque exatamente uma vez, com floor 0 (janela de oversell).
	-- order_items.product_id é text → casa com products.id::text.
	update public.products p
	set stock_total = greatest(p.stock_total - oi.qty, 0)
	from (
		select product_id, sum(quantity)::int as qty
		from public.order_items
		where order_id = p_order_id
		group by product_id
	) oi
	where p.id::text = oi.product_id;

	-- Incrementa uso do cupom aplicado ao pedido (coluna real: used_count).
	if v_coupon_id is not null then
		update public.coupons
		set used_count = used_count + 1
		where id = v_coupon_id;
	end if;

	return true;
end;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_approval(uuid, text, text) TO service_role;
