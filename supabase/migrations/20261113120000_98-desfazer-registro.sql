-- =====================================================================
-- Desfazer o pagamento registrado à mão — `undo_manual_payment`.
-- =====================================================================
--
-- A admin desfaz, com motivo, um pagamento que ela mesma (ou outra admin) registrou à mão no painel
-- (`record_manual_payment`, migration `20261112130000_98-aprovacao-com-data-e-autor.sql`). É a única
-- exceção de "aprovado não regride", e por isso mora numa RPC própria, fora da máquina de estado do
-- pagamento: o webhook do meio de pagamento nunca a alcança, e pagamento aprovado pela loja (sem
-- registro manual vivo) não tem o que desfazer.
--
-- O que volta:
--   - `payment_status` ao valor de antes do registro (`order_manual_payments.previous_payment_status`);
--   - `paid_at` nulo, e o pedido de Pago para Pendente;
--   - ao estoque, as quantidades EFETIVAMENTE baixadas, gravadas no registro (`stock_deducted`) — nunca
--     as do pedido, que podem ser maiores (o `track` não desce de zero);
--   - o uso do cupom (`used_count - 1`, sem descer de zero).
-- Com isso o pedido sai da venda do Dashboard e da Início, que contam `payment_status = 'approved'`.
--
-- O que fica: o registro (meio, data, observação, quem registrou) e os comprovantes. O registro ganha
-- `undone_at`/`undone_by`/`undone_by_name`/`undone_reason`; `undone_at` é o instante a partir do qual o
-- prazo do cancelamento automático recomeça. Uma linha de histórico "Registro de pagamento desfeito",
-- com o motivo e o autor. Nenhum e-mail: nada aqui dispara aviso.
--
-- Só com o pedido em Pago: em Separando, Enviado ou Entregue a peça já está andando, e desfazer não é
-- o caminho. Nenhuma tabela, coluna ou dado novo.
--
-- Desfecho por STRING em `result`:
--   ok             desfeito; traz `status` (o do pedido depois: `pending`)
--   sem_papel      quem chamou não é admin
--   nao_encontrado o pedido não existe
--   motivo_vazio   o motivo é obrigatório
--   motivo_longo   motivo acima de 500 caracteres (`MANUAL_PAYMENT_UNDO_REASON_MAX`)
--   sem_registro   não há pagamento registrado à mão vivo — inclusive o aprovado pela loja
--   fora_de_pago   o pedido não está em Pago
--   indisponivel   o pagamento mudou depois do registro (estornado, por exemplo)

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
	'Desfaz um pagamento registrado a mao. So admin (has_role no corpo), so com o pedido em paid e registro manual vivo. Devolve payment_status anterior, paid_at nulo, pending, estoque baixado e uso do cupom. Sem e-mail. Desfecho por string em result.';
