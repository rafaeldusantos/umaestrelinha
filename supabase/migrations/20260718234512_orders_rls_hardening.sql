-- =====================================================================
-- Endurece RLS de orders/order_items (PAY-10)
-- Remove as políticas permissivas "Allow all" — as políticas escopadas
-- ("users read/insert own orders", "users read own order items",
--  "admin full orders/order_items") já existem e permanecem.
-- Updates de payment_status ficam restritos ao service role (bypassa RLS):
-- nenhuma policy de UPDATE para authenticated é criada.
-- =====================================================================

drop policy if exists "Allow all orders" on public.orders;
drop policy if exists "Allow all order_items" on public.order_items;

-- Hoje o INSERT de itens do checkout só funciona por causa do "Allow all";
-- esta policy mantém o fluxo: cliente insere itens apenas em pedidos próprios.
do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'order_items'
			and policyname = 'users insert own order items'
	) then
		create policy "users insert own order items"
			on public.order_items
			for insert
			to authenticated
			with check (
				order_id in (
					select id
					from public.orders
					where customer_id in (
						select id from public.customers where user_id = auth.uid()
					)
				)
			);
	end if;
end $$;
