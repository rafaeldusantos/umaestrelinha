-- =====================================================================
-- `apply_payment_approval` com a data e o autor, e `record_manual_payment`.
-- =====================================================================
--
-- O pagamento registrado à mão no painel aprova o pedido pelo MESMO corpo do webhook: a baixa de
-- estoque e o uso do cupom não são copiados. As tabelas e o bucket são da migration anterior
-- (`20261112120000_98-registrar-pagamento.sql`).
--
-- Esta é a migration VIGENTE de `apply_payment_approval`, e o guarda `pagamentoMarcaPagoSchema.test.ts`
-- (suíte da loja) a lê: o corpo inteiro vem PRIMEIRO no arquivo, e a primeira revogação de `anon` é a
-- da porta do webhook.

-- ---------------------------------------------------------------------
-- 1 · O corpo, com a data, o autor e o registro manual
-- ---------------------------------------------------------------------
--
-- O corpo é o da migration `20261030120000_pagamento-aprovado-marca-pago.sql`, com quatro mudanças:
--   - `paid_at` é o parâmetro (a porta do webhook passa `now()`);
--   - com autor, o histórico leva o autor e a nota "Pagamento registrado manualmente";
--   - a baixa de estoque é feita linha a linha, lendo o saldo de antes com a linha travada, para
--     saber a quantidade EFETIVAMENTE baixada (o `track` não desce de zero, então o que saiu pode
--     ser menos que o pedido);
--   - com `p_manual_payment_id`, essas quantidades são gravadas no registro manual
--     (`order_manual_payments.stock_deducted`) — é o que o desfazer do registro devolve.
--
-- A idempotência continua sendo `paid_at is null`: a segunda chamada não acha linha e sai em
-- `return false` antes de qualquer baixa. Só `pending` vira `paid`. Nenhum privilégio: só as duas
-- funções `security definer` abaixo a chamam, como dono.

create or replace function public.apply_payment_approval(
	p_order_id uuid,
	p_mp_payment_id text,
	p_status_detail text,
	p_paid_at timestamptz,
	p_author uuid,
	p_manual_payment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_coupon_id uuid;
	v_status_antes text;
	v_item record;
	v_antes integer;
	v_depois integer;
	v_politica text;
	v_baixas jsonb := '[]'::jsonb;
begin
	-- O status de antes, para saber se a aprovação o mudou. `for update` trava a linha até o fim da
	-- transação: entre esta leitura e a escrita abaixo ninguém troca o status por baixo.
	select status into v_status_antes
	from public.orders
	where id = p_order_id
	for update;

	-- Idempotência: `paid_at is null` no WHERE faz a segunda chamada não encontrar linha e sair
	-- em `return false` ANTES de qualquer baixa.
	update public.orders
	set
		payment_status = 'approved',
		paid_at = coalesce(p_paid_at, now()),
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

	-- A mudança de status entra no histórico do pedido. Sem autor (o webhook), quem mudou foi o
	-- pagamento; com autor, foi a admin que registrou o pagamento à mão.
	if v_status_antes = 'pending' then
		insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
		values (
			p_order_id, 'pending', 'paid',
			case when p_author is null then 'Pagamento aprovado' else 'Pagamento registrado manualmente' end,
			p_author
		);
	end if;

	-- ------------------------------------------------------------------
	-- 1. Itens COM variação: baixa na LINHA VENDIDA
	-- ------------------------------------------------------------------
	-- `track`     → floor em 0 (a janela de oversell é a mesma de antes, conhecida e aceita).
	-- `backorder` → SEM floor: saldo negativo é o ponto do modo.
	-- `none`      → pulado: nunca esgota, então não há saldo a mexer.
	for v_item in
		select variant_id, sum(quantity)::int as qty
		from public.order_items
		where order_id = p_order_id
			and variant_id is not null
		group by variant_id
	loop
		select v.stock, pr.stock_policy into v_antes, v_politica
		from public.product_variants v
		join public.products pr on pr.id = v.product_id
		where v.id = v_item.variant_id
		for update of v;

		if not found or v_politica = 'none' then
			continue;
		end if;

		v_depois := case
		              when v_politica = 'backorder' then v_antes - v_item.qty
		              else greatest(v_antes - v_item.qty, 0)
		            end;

		update public.product_variants set stock = v_depois where id = v_item.variant_id;

		if v_antes <> v_depois then
			v_baixas := v_baixas || jsonb_build_object('variant_id', v_item.variant_id, 'quantidade', v_antes - v_depois);
		end if;
	end loop;

	-- ------------------------------------------------------------------
	-- 2. Itens SEM variação
	-- ------------------------------------------------------------------
	-- `order_items.product_id` é TEXT e `products.id` é uuid — o cast mantém o pin personalizado
	-- (`custom-…`) fora do join, sem match e sem erro.
	for v_item in
		select product_id, sum(quantity)::int as qty
		from public.order_items
		where order_id = p_order_id
			and variant_id is null
		group by product_id
	loop
		select p.stock_total, p.stock_policy into v_antes, v_politica
		from public.products p
		where p.id::text = v_item.product_id
		for update of p;

		if not found or v_politica = 'none' then
			continue;
		end if;

		v_depois := case
		              when v_politica = 'backorder' then v_antes - v_item.qty
		              else greatest(v_antes - v_item.qty, 0)
		            end;

		update public.products set stock_total = v_depois where id::text = v_item.product_id;

		if v_antes <> v_depois then
			v_baixas := v_baixas || jsonb_build_object('product_id', v_item.product_id, 'quantidade', v_antes - v_depois);
		end if;
	end loop;

	-- Incrementa uso do cupom aplicado ao pedido (coluna real: used_count).
	if v_coupon_id is not null then
		update public.coupons
		set used_count = used_count + 1
		where id = v_coupon_id;
	end if;

	-- As quantidades efetivamente baixadas, no registro manual (o webhook não tem registro).
	if p_manual_payment_id is not null then
		update public.order_manual_payments
		set stock_deducted = v_baixas
		where id = p_manual_payment_id;
	end if;

	return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 2 · A porta do webhook, com o contrato de sempre
-- ---------------------------------------------------------------------
--
-- A `mercado-pago` chama `apply_payment_approval(p_order_id, p_mp_payment_id, p_status_detail)` e lê
-- um booleano ("aprovou AGORA"). A assinatura e o retorno não mudam: a porta chama o corpo acima com
-- `now()`, sem autor e sem registro manual.

create or replace function public.apply_payment_approval(
	p_order_id uuid,
	p_mp_payment_id text,
	p_status_detail text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $body$
begin
	return public.apply_payment_approval(p_order_id, p_mp_payment_id, p_status_detail, now(), null, null);
end;
$body$;

-- Privilégio mínimo, igual ao de antes: só o webhook (service role) aprova pagamento.
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_approval(uuid, text, text) TO service_role;

-- O corpo não é chamado de fora: só pelas duas portas `security definer`, como dono.
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text, timestamptz, uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text, timestamptz, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text, timestamptz, uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.apply_payment_approval(uuid, text, text, timestamptz, uuid, uuid) FROM service_role;

-- ---------------------------------------------------------------------
-- 3 · `record_manual_payment` — a porta do painel
-- ---------------------------------------------------------------------
--
-- Desfecho por STRING em `result`:
--   ok                     gravado; traz `id` e `status` (o status do pedido depois)
--   sem_papel              quem chamou não é admin
--   nao_encontrado         o pedido não existe
--   ja_pago                o pagamento já foi aprovado (pela loja ou por outro registro) — NADA é
--                          gravado, e o painel apaga os comprovantes que enviou
--   pedido_cancelado       pedido cancelado não recebe registro
--   indisponivel           pagamento estornado ou cancelado
--   data_futura            a data informada está no futuro
--   data_antes_do_pedido   a data informada é anterior à criação do pedido
--   meio_invalido          meio fora da lista
--   observacao_longa       observação acima de 1000
--   comprovantes_invalidos mais de 3, tipo ou tamanho fora, caminho fora da pasta do pedido, ou
--                          arquivo que não está no bucket
--
-- As recusas de data são as de `paidAtRefusal` (`core/orders/manualPayment.ts`), por minuto: o
-- campo do painel não tem segundos.
--
-- Uma linha de histórico "Pagamento registrado manualmente" com o autor sai SEMPRE: quando o pedido
-- estava Pendente, é a do corpo acima (Pendente → Pago); quando não (o status já tinha sido avançado
-- à mão), é gravada aqui, sem mudança de status. O pedido fica travado (`for update`) do começo ao
-- fim: duas admins registrando ao mesmo tempo, a segunda espera e recebe `ja_pago`.

create or replace function public.record_manual_payment(
	p_order_id uuid,
	p_method text,
	p_paid_at timestamptz,
	p_note text,
	p_receipts jsonb,
	p_author_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_pedido record;
	v_quando timestamptz := coalesce(p_paid_at, now());
	v_nota text := nullif(btrim(coalesce(p_note, '')), '');
	v_comprovantes jsonb := coalesce(p_receipts, '[]'::jsonb);
	v_comprovante jsonb;
	v_registro uuid;
	v_status_depois text;
begin
	if not public.has_role(auth.uid(), 'admin') then
		return jsonb_build_object('result', 'sem_papel');
	end if;

	select id, status, payment_status, paid_at, created_at into v_pedido
	from public.orders
	where id = p_order_id
	for update;

	if not found then
		return jsonb_build_object('result', 'nao_encontrado');
	end if;

	-- A corrida com a aprovação: a loja (ou outra admin) aprovou enquanto o formulário estava aberto.
	if v_pedido.paid_at is not null or v_pedido.payment_status = 'approved' then
		return jsonb_build_object('result', 'ja_pago');
	end if;

	if v_pedido.status = 'cancelled' then
		return jsonb_build_object('result', 'pedido_cancelado');
	end if;

	if v_pedido.payment_status not in ('pending', 'rejected', 'expired') then
		return jsonb_build_object('result', 'indisponivel');
	end if;

	if date_trunc('minute', v_quando) > date_trunc('minute', now()) then
		return jsonb_build_object('result', 'data_futura');
	end if;

	if date_trunc('minute', v_quando) < date_trunc('minute', v_pedido.created_at) then
		return jsonb_build_object('result', 'data_antes_do_pedido');
	end if;

	if p_method is not null and p_method not in ('pix_direto', 'transferencia', 'dinheiro', 'cartao', 'outro') then
		return jsonb_build_object('result', 'meio_invalido');
	end if;

	if v_nota is not null and char_length(v_nota) > 1000 then
		return jsonb_build_object('result', 'observacao_longa');
	end if;

	if jsonb_typeof(v_comprovantes) <> 'array' or jsonb_array_length(v_comprovantes) > 3 then
		return jsonb_build_object('result', 'comprovantes_invalidos');
	end if;

	for v_comprovante in select * from jsonb_array_elements(v_comprovantes)
	loop
		if coalesce(v_comprovante ->> 'path', '') not like p_order_id::text || '/%'
			or coalesce(v_comprovante ->> 'content_type', '') not in (
				'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'
			)
			or coalesce((v_comprovante ->> 'size_bytes')::bigint, 0) not between 1 and 10485760
			or not exists (
				select 1 from storage.objects o
				where o.bucket_id = 'order-payment-receipts' and o.name = v_comprovante ->> 'path'
			)
		then
			return jsonb_build_object('result', 'comprovantes_invalidos');
		end if;
	end loop;

	-- O registro nasce antes da aprovação para ela gravar nele as quantidades baixadas. Uma aprovação
	-- que não se aplique (impossível com o pedido travado e `paid_at` nulo acima) desfaz tudo.
	insert into public.order_manual_payments (
		order_id, method, paid_at, note, created_by, created_by_name, previous_payment_status
	)
	values (
		p_order_id, p_method, v_quando, v_nota, auth.uid(), nullif(btrim(coalesce(p_author_name, '')), ''),
		v_pedido.payment_status
	)
	returning id into v_registro;

	if not public.apply_payment_approval(p_order_id, null, null, v_quando, auth.uid(), v_registro) then
		raise exception 'o pagamento do pedido % não pôde ser aplicado', p_order_id;
	end if;

	if v_pedido.status <> 'pending' then
		insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
		values (p_order_id, v_pedido.status, v_pedido.status, 'Pagamento registrado manualmente', auth.uid());
	end if;

	insert into public.order_manual_payment_receipts (manual_payment_id, path, content_type, size_bytes)
	select v_registro, c ->> 'path', c ->> 'content_type', (c ->> 'size_bytes')::integer
	from jsonb_array_elements(v_comprovantes) c;

	select status into v_status_depois from public.orders where id = p_order_id;

	return jsonb_build_object('result', 'ok', 'id', v_registro, 'status', v_status_depois);
end;
$$;

revoke all on function public.record_manual_payment(uuid, text, timestamptz, text, jsonb, text) from public;
revoke all on function public.record_manual_payment(uuid, text, timestamptz, text, jsonb, text) from anon;
grant execute on function public.record_manual_payment(uuid, text, timestamptz, text, jsonb, text) to authenticated;

comment on function public.record_manual_payment(uuid, text, timestamptz, text, jsonb, text) is
	'Registra um pagamento feito por fora da loja. So admin (has_role no corpo). Aprova pelo MESMO corpo do webhook (apply_payment_approval com data, autor e o registro). Desfecho por string em result.';
