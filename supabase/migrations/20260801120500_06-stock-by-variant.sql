-- =====================================================================
-- 07 · T15 — apply_payment_approval: baixa por variação e política
-- =====================================================================
-- Requisito: PST-02
--
-- Hoje a RPC baixa de `products.stock_total`, sempre e para todo item
-- (20260726000000:99-107). Com saldo por variação isso está errado de duas formas ao mesmo tempo:
-- descontaria do lugar errado, e descontaria de quem não deveria (produto sob demanda).
--
-- Duas baixas na mesma venda seria oversell garantido, por isso os dois UPDATEs são MUTUAMENTE
-- EXCLUSIVOS por item: `variant_id is not null` vai para a grade, `variant_id is null` continua em
-- `products.stock_total`.
--
-- O que NÃO muda: a assinatura, os GRANT, a idempotência por `paid_at is null` e o incremento de
-- `coupons.used_count`. Esta migration reescreve só o miolo de estoque.

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
	-- Idempotência: `paid_at is null` no WHERE faz o segundo webhook não encontrar linha e sair
	-- em `return false` ANTES de qualquer baixa. Preservado sem alteração.
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

	-- ------------------------------------------------------------------
	-- 1. Itens COM variação: baixa na LINHA VENDIDA
	-- ------------------------------------------------------------------
	-- `track`     → floor em 0 (a janela de oversell é a mesma de antes, conhecida e aceita).
	-- `backorder` → SEM floor: saldo negativo é o ponto do modo, é assim que a loja sabe quanto
	--               deve produzir.
	-- `none`      → excluído pelo WHERE: nunca esgota, então não há saldo a mexer.
	update public.product_variants v
	set stock = case
	              when pr.stock_policy = 'backorder' then v.stock - agg.qty
	              else greatest(v.stock - agg.qty, 0)
	            end
	from (
	       select variant_id, sum(quantity)::int as qty
	       from public.order_items
	       where order_id = p_order_id
	         and variant_id is not null
	       group by variant_id
	     ) agg,
	     public.products pr
	where v.id = agg.variant_id
	  and pr.id = v.product_id
	  and pr.stock_policy <> 'none';

	-- ------------------------------------------------------------------
	-- 2. Itens SEM variação: comportamento de hoje, agora com política
	-- ------------------------------------------------------------------
	-- `order_items.product_id` é TEXT e `products.id` é uuid — o cast mantém o pin personalizado
	-- (`custom-…`) fora do join, sem match e sem erro, que é o comportamento atual.
	update public.products p
	set stock_total = case
	                    when p.stock_policy = 'backorder' then p.stock_total - agg.qty
	                    else greatest(p.stock_total - agg.qty, 0)
	                  end
	from (
	       select product_id, sum(quantity)::int as qty
	       from public.order_items
	       where order_id = p_order_id
	         and variant_id is null
	       group by product_id
	     ) agg
	where p.id::text = agg.product_id
	  and p.stock_policy <> 'none';

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
