-- =====================================================================
-- O desfazer recusa o pedido pago duas vezes — `undo_manual_payment` recriada.
-- =====================================================================
--
-- O pedido registrado à mão que o meio de pagamento da loja TAMBÉM aprovou depois ganha o marcador
-- `paid_twice` (`order_payment_alerts`, migration `20261114120000_98-pagamento-a-mais.sql`). Nele a
-- loja recebeu o dinheiro: desfazer o registro levaria um pedido pago a Pendente, o tiraria das vendas
-- e o devolveria à contagem do cancelamento automático. Por isso a RPC passa a recusar esse caso com
-- um desfecho novo:
--   pago_duas_vezes  o pedido tem o marcador `paid_twice`; nada muda (continua Pago, o registro
--                    continua vivo). A devolução de um dos valores é feita fora do sistema.
--
-- O resto é o corpo da migration `20261113120000_98-desfazer-registro.sql`, sem outra mudança — os
-- outros desfechos (`ok`, `sem_papel`, `nao_encontrado`, `motivo_vazio`, `motivo_longo`,
-- `sem_registro`, `fora_de_pago`, `indisponivel`) continuam os mesmos, na mesma ordem. O painel não
-- oferece a ação nesse caso (`canUndoManualPayment`, `@estrelinha/core/orders`); a recusa aqui é a que
-- impede a requisição forjada.
--
-- Nenhuma tabela, coluna ou dado novo. Privilégios os mesmos de antes.

create or replace function public.undo_manual_payment(
	p_order_id uuid,
	p_reason text,
	p_author_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_pedido record;
	v_registro record;
	v_motivo text := nullif(btrim(coalesce(p_reason, '')), '');
	v_baixa jsonb;
begin
	if not public.has_role(auth.uid(), 'admin') then
		return jsonb_build_object('result', 'sem_papel');
	end if;

	-- O pedido fica travado do começo ao fim: um desfazer e um registro (ou dois desfazer) ao mesmo
	-- tempo, o segundo espera e lê o estado que o primeiro deixou.
	select id, status, payment_status, coupon_id into v_pedido
	from public.orders
	where id = p_order_id
	for update;

	if not found then
		return jsonb_build_object('result', 'nao_encontrado');
	end if;

	if v_motivo is null then
		return jsonb_build_object('result', 'motivo_vazio');
	end if;

	if char_length(v_motivo) > 500 then
		return jsonb_build_object('result', 'motivo_longo');
	end if;

	select id, previous_payment_status, stock_deducted into v_registro
	from public.order_manual_payments
	where order_id = p_order_id
		and undone_at is null
	for update;

	if not found then
		return jsonb_build_object('result', 'sem_registro');
	end if;

	if v_pedido.status <> 'paid' then
		return jsonb_build_object('result', 'fora_de_pago');
	end if;

	if v_pedido.payment_status <> 'approved' then
		return jsonb_build_object('result', 'indisponivel');
	end if;

	-- A loja também recebeu: o pedido não volta a Pendente nem sai das vendas.
	if exists (
		select 1 from public.order_payment_alerts a
		where a.order_id = p_order_id and a.kind = 'paid_twice'
	) then
		return jsonb_build_object('result', 'pago_duas_vezes');
	end if;

	update public.orders
	set
		payment_status = v_registro.previous_payment_status,
		paid_at = null,
		status = 'pending'
	where id = p_order_id;

	-- O estoque: as quantidades que a aprovação baixou de fato, linha a linha.
	for v_baixa in select * from jsonb_array_elements(coalesce(v_registro.stock_deducted, '[]'::jsonb))
	loop
		if v_baixa ? 'variant_id' then
			update public.product_variants
			set stock = stock + (v_baixa ->> 'quantidade')::int
			where id = (v_baixa ->> 'variant_id')::uuid;
		elsif v_baixa ? 'product_id' then
			update public.products
			set stock_total = stock_total + (v_baixa ->> 'quantidade')::int
			where id::text = v_baixa ->> 'product_id';
		end if;
	end loop;

	if v_pedido.coupon_id is not null then
		update public.coupons
		set used_count = greatest(used_count - 1, 0)
		where id = v_pedido.coupon_id;
	end if;

	update public.order_manual_payments
	set
		undone_at = now(),
		undone_by = auth.uid(),
		undone_by_name = nullif(btrim(coalesce(p_author_name, '')), ''),
		undone_reason = v_motivo
	where id = v_registro.id;

	insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
	values (p_order_id, 'paid', 'pending', 'Registro de pagamento desfeito. Motivo: ' || v_motivo, auth.uid());

	return jsonb_build_object('result', 'ok', 'status', 'pending');
end;
$$;

revoke all on function public.undo_manual_payment(uuid, text, text) from public;
revoke all on function public.undo_manual_payment(uuid, text, text) from anon;
grant execute on function public.undo_manual_payment(uuid, text, text) to authenticated;

comment on function public.undo_manual_payment(uuid, text, text) is
	'Desfaz um pagamento registrado a mao. So admin (has_role no corpo), so com o pedido em paid, registro manual vivo e sem o marcador paid_twice. Devolve payment_status anterior, paid_at nulo, pending, estoque baixado e uso do cupom. Sem e-mail. Desfecho por string em result.';
