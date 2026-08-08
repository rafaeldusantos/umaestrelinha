-- =====================================================================
-- RPC idempotente de aprovação de pagamento + Realtime + expirador 24h
-- PAY-07 (webhook idempotente), PAY-08 (estoque 1x, floor 0),
-- PAY-11 (pending > 24h → expired), PAY-13 (publication Realtime)
-- =====================================================================

-- RPC transacional e idempotente: o guard `paid_at is null` garante que os
-- efeitos (aprovação, baixa de estoque, incremento de cupom) rodem UMA vez —
-- reexecutar (webhook duplicado / corrida síncrono×webhook) é no-op.
-- Chamada somente via service role (edge function mercado-pago).
create or replace function public.apply_payment_approval(
	p_order_id uuid,
	p_mp_payment_id text,
	p_status_detail text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
	set stock = greatest(p.stock - oi.qty, 0)
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

revoke all on function public.apply_payment_approval(uuid, text, text) from public;
revoke all on function public.apply_payment_approval(uuid, text, text) from anon;
revoke all on function public.apply_payment_approval(uuid, text, text) from authenticated;
grant execute on function public.apply_payment_approval(uuid, text, text) to service_role;

-- Realtime na linha do pedido (PAY-13): o store escuta UPDATE em orders
-- filtrado por id=eq.<order_id> (RLS escopada permite ao dono).
do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'orders'
	) then
		alter publication supabase_realtime add table public.orders;
	end if;
end $$;

-- Expirador 24h (PAY-11): job pg_cron horário marca pending > 24h → expired.
-- cron.schedule com jobname é upsert (idempotente).
-- FALLBACK se pg_cron indisponível no ambiente: a migration segue sem erro
-- (apenas notice) e a expiração deve ser aplicada de forma lazy — o webhook /
-- a leitura tratam pedido pending vencido como expired antes de transicionar.
do $$
begin
	if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
		begin
			create extension if not exists pg_cron;
			perform cron.schedule(
				'expire-pending-orders',
				'0 * * * *',
				$job$
					update public.orders
					set payment_status = 'expired'
					where payment_status = 'pending'
						and created_at < now() - interval '24 hours'
				$job$
			);
			raise notice 'pg_cron: job expire-pending-orders agendado (horário)';
		exception when others then
			raise notice 'pg_cron indisponível (%): usar fallback lazy de expiração', sqlerrm;
		end;
	else
		raise notice 'pg_cron não instalado neste ambiente: usar fallback lazy de expiração';
	end if;
end $$;
