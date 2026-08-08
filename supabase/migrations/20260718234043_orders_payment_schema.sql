-- =====================================================================
-- Schema de pagamento em orders (checkout Mercado Pago)
-- PAY-12 (persistência de mp_status_detail) + base do mapa de transições (PAY-04)
-- =====================================================================

-- payment_status com backfill legado: pedidos criados antes do checkout MP
-- eram pagos manualmente → 'approved' (evita o expirador marcá-los 'expired').
-- O backfill roda SOMENTE quando a coluna acaba de ser criada (idempotente).
do $$
begin
	if not exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'orders'
			and column_name = 'payment_status'
	) then
		alter table public.orders
			add column payment_status text not null default 'pending';
		update public.orders
		set payment_status = 'approved';
	end if;
end $$;

alter table public.orders
	drop constraint if exists orders_payment_status_check;
alter table public.orders
	add constraint orders_payment_status_check
	check (payment_status in ('pending', 'approved', 'rejected', 'refunded', 'expired', 'cancelled'));

alter table public.orders
	add column if not exists mp_payment_id text,
	add column if not exists mp_status_detail text,
	add column if not exists paid_at timestamptz,
	add column if not exists pix_discount numeric(10,2) not null default 0;

create index if not exists idx_orders_mp_payment_id on public.orders(mp_payment_id);
