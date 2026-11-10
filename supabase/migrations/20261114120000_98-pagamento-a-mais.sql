-- =====================================================================
-- O pagamento a mais: aprovado num pedido já pago, ou num pedido cancelado.
-- =====================================================================
--
-- Uma cobrança que ficou aberta no Mercado Pago (o PIX copiado antes, o cartão em análise) pode ser
-- aprovada DEPOIS de o pedido ter sido pago por outro caminho (o registro à mão, outra cobrança) ou
-- de ter sido cancelado. Até aqui `apply_payment_approval` tratava os dois casos de jeitos opostos:
--   - pedido já pago: `paid_at is null` não achava linha e a aprovação sumia em silêncio — o dinheiro
--     entrava duas vezes e ninguém via;
--   - pedido cancelado: `paid_at` era nulo, então a aprovação era APLICADA — estoque baixado, cupom
--     usado, e o webhook mandava "pagamento confirmado" sobre um pedido cancelado.
--
-- Agora nos dois casos nada se aplica (nem `paid_at`, nem estoque, nem cupom; o pedido cancelado
-- continua cancelado) e o banco grava um MARCADOR, que o painel mostra no bloco Pagamento:
--   paid_twice         "Pago duas vezes — devolver um dos valores"
--   paid_after_cancel  "Pago depois de cancelado — devolver o valor"
-- Os rótulos e a lista dos tipos moram em `@estrelinha/core/orders` (`paymentAlerts.ts`); o `check`
-- abaixo é cópia deliberada, guardada por `pagamentoAMaisSchema.test.ts` (suíte da loja).
--
-- Duas peças:
--   1. `order_payment_alerts` — o marcador, só admin. Nunca coluna de `orders`: a cliente lê a linha
--      do pedido inteira.
--   2. `apply_payment_approval` recriada (o corpo da migration `20261112130000_98-aprovacao-com-data-
--      e-autor.sql` com as duas saídas novas) e a porta do webhook, sem mudança de contrato. Esta é a
--      migration VIGENTE da função, e o guarda `pagamentoMarcaPagoSchema.test.ts` a lê: o corpo vem
--      PRIMEIRO no arquivo, e a primeira revogação de `anon` é a da porta do webhook.
--
-- Nenhuma escrita de dado.

-- ---------------------------------------------------------------------
-- 1 · O marcador
-- ---------------------------------------------------------------------
--
-- Uma linha por aprovação a mais: o mesmo pagamento notificado de novo pelo Mercado Pago não grava
-- outra (o índice único com o id do pagamento, e o `on conflict do nothing` da função).

create table if not exists public.order_payment_alerts (
	id               uuid primary key default gen_random_uuid(),
	order_id         uuid not null references public.orders (id) on delete cascade,
	kind             text not null check (kind in ('paid_twice', 'paid_after_cancel')),
	mp_payment_id    text,
	mp_status_detail text,
	created_at       timestamptz not null default now()
);

create unique index if not exists order_payment_alerts_uma_por_pagamento
	on public.order_payment_alerts (order_id, kind, coalesce(mp_payment_id, ''));

-- A RLS da tabela vem no fim do arquivo (seção 4): a primeira revogação de `anon` daqui é a da porta
-- do webhook, que o guarda da função lê.

-- ---------------------------------------------------------------------
-- 2 · O corpo, com as duas saídas novas
-- ---------------------------------------------------------------------
--
-- O corpo é o da migration `20261112130000_98-aprovacao-com-data-e-autor.sql`, com duas saídas antes
-- da escrita, as duas com o pedido travado:
--   - pedido JÁ PAGO (`paid_at` preenchido): nada se repete. É pagamento a mais quando há um registro
--     à mão vivo (o pedido não foi pago pela loja), ou quando o id do pagamento é outro que o já
--     gravado; o mesmo pagamento notificado de novo é a reentrega de sempre, e não marca nada;
--   - pedido CANCELADO: nada se aplica, e marca.
-- Só a porta do webhook (sem autor) marca: o registro à mão recusa os dois casos antes de chegar
-- aqui (`record_manual_payment`). O resto é o mesmo corpo.

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
	v_pago_em timestamptz;
	v_pagamento_antes text;
	v_cancelado boolean;
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

	-- A linha já está travada pela leitura acima.
	select paid_at, mp_payment_id, status = 'cancelled' into v_pago_em, v_pagamento_antes, v_cancelado
	from public.orders
	where id = p_order_id;

	-- Pedido já pago: nada se repete (estoque, cupom, e-mail). Pagamento a mais é marcado.
	if v_pago_em is not null then
		if p_author is null and (
			exists (
				select 1 from public.order_manual_payments m
				where m.order_id = p_order_id and m.undone_at is null
			)
			or (p_mp_payment_id is not null and v_pagamento_antes is distinct from p_mp_payment_id)
		) then
			insert into public.order_payment_alerts (order_id, kind, mp_payment_id, mp_status_detail)
			values (p_order_id, 'paid_twice', p_mp_payment_id, p_status_detail)
			on conflict do nothing;
		end if;
		return false;
	end if;

	-- Pedido cancelado: continua cancelado, e nada é baixado nem gravado como venda.
	if v_cancelado then
		if p_author is null then
			insert into public.order_payment_alerts (order_id, kind, mp_payment_id, mp_status_detail)
			values (p_order_id, 'paid_after_cancel', p_mp_payment_id, p_status_detail)
			on conflict do nothing;
		end if;
		return false;
	end if;

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
	-- Itens COM variação: baixa na LINHA VENDIDA
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
	-- Itens SEM variação
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
-- 3 · A porta do webhook, com o contrato de sempre
-- ---------------------------------------------------------------------
--
-- Igual à da migration anterior: a `mercado-pago` lê um booleano ("aprovou AGORA"). O pagamento a
-- mais devolve `false` — nenhum e-mail e nenhuma compra no GA4 saem —, e o marcador fica no banco.

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
-- 4 · A RLS do marcador
-- ---------------------------------------------------------------------
--
-- Só o admin lê. Quem grava é a função acima (`security definer`); a policy de escrita fica
-- para não haver um segundo caminho com outra regra.

alter table public.order_payment_alerts enable row level security;

revoke all on table public.order_payment_alerts from anon;
revoke all on table public.order_payment_alerts from public;

drop policy if exists "admin full order payment alerts" on public.order_payment_alerts;
create policy "admin full order payment alerts" on public.order_payment_alerts
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

comment on table public.order_payment_alerts is
	'Pagamento aprovado a mais (pedido ja pago, ou cancelado), gravado por apply_payment_approval. SO admin (has_role no using E no with check). Nunca coluna de orders: a cliente le a linha do pedido inteira.';
