-- =====================================================================
-- O pagamento aprovado passa o pedido de `pending` para `paid`.
-- =====================================================================
--
-- Até aqui `apply_payment_approval` gravava `payment_status`, `paid_at`, o estoque e o uso do cupom,
-- e NUNCA tocava `orders.status`. Ninguém percebeu porque os pedidos `paid` que existiam vieram do
-- importador da Nuvemshop, que já traduz "aprovado" para `paid`. O primeiro pedido pago pela loja
-- nova (#0183, 2026-10-26) ficou "Aprovado" no pagamento e "Pendente" no status — e, com o material
-- recebido, sairia de "Pago, a separar" e de "Precisa de ação" (as duas leem `status = 'paid'`) e
-- ficaria no painel sem ação nenhuma.
--
-- O corpo abaixo é o da migration `20260801120500_06-stock-by-variant.sql` (conferido contra
-- `pg_get_functiondef` do hospedado em 2026-10-27), com UMA mudança na primeira escrita e uma linha de
-- histórico depois dela. A idempotência continua sendo `paid_at is null`: o segundo webhook não acha
-- linha, sai em `return false` e não grava status, histórico, estoque nem cupom.
--
-- Só `pending` vira `paid`. Um pedido que a Adri já tenha avançado à mão (separando, enviado) ou
-- cancelado antes de o webhook chegar continua onde está — o pagamento não desfaz o trabalho dela.
--
-- Os e-mails não mudam: `order_paid` e `owner_order_paid` decidem por `paid_at`
-- (`core/notifications/precondition.ts`), nunca por `status`.

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
	v_status_antes text;
begin
	-- O status de antes, para saber se a aprovação o mudou. `for update` trava a linha até o fim da
	-- transação: entre esta leitura e a escrita abaixo ninguém troca o status por baixo.
	select status into v_status_antes
	from public.orders
	where id = p_order_id
	for update;

	-- Idempotência: `paid_at is null` no WHERE faz o segundo webhook não encontrar linha e sair
	-- em `return false` ANTES de qualquer baixa. Preservado sem alteração.
	update public.orders
	set
		payment_status = 'approved',
		paid_at = now(),
		-- Só `pending` anda. Qualquer outro status é decisão de alguém, e o pagamento não a desfaz.
		status = case when status = 'pending' then 'paid' else status end,
		mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id),
		mp_status_detail = coalesce(p_status_detail, mp_status_detail)
	where id = p_order_id
		and paid_at is null
	returning coupon_id into v_coupon_id;

	if not found then
		return false;
	end if;

	-- A mudança de status entra no histórico do pedido, como toda outra. `created_by` nulo: quem
	-- mudou foi o pagamento, não uma pessoa.
	if v_status_antes = 'pending' then
		insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
		values (p_order_id, 'pending', 'paid', 'Pagamento aprovado', null);
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

-- Privilégio mínimo, igual ao de antes: só o webhook (service role) aprova pagamento.
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_approval(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- Os pedidos já pagos que ficaram `pending`.
-- ---------------------------------------------------------------------
-- Pagos pela loja entre a primeira venda e este deploy. Idempotente pelo próprio recorte: depois da
-- primeira execução ninguém mais casa `status = 'pending'` com `payment_status = 'approved'`. O
-- histórico é gravado na MESMA instrução, só para as linhas que esta atualização mudou.
with corrigidos as (
	update public.orders
	set status = 'paid'
	where status = 'pending'
		and payment_status = 'approved'
		and paid_at is not null
	returning id
)
insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
select id, 'pending', 'paid', 'Pagamento aprovado', null
from corrigidos;
