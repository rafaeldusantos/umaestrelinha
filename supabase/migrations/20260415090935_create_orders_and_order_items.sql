alter table public.orders
	alter column order_number drop default;
alter table public.orders
	alter column order_number type text using order_number::text;
alter table public.orders
	add column if not exists customer_name text,
	add column if not exists customer_email text,
	add column if not exists address_street text,
	add column if not exists address_number text,
	add column if not exists address_neighborhood text,
	add column if not exists address_city text,
	add column if not exists address_state text;
update public.orders as orders
set
	customer_name = coalesce(orders.customer_name, customers.name, 'Cliente'),
	customer_email = coalesce(orders.customer_email, customers.email, 'cliente@example.com'),
	payment_method = coalesce(orders.payment_method, 'manual'),
	status = coalesce(orders.status, 'pending'),
	discount = coalesce(orders.discount, 0),
	shipping_cost = coalesce(orders.shipping_cost, 0)
from public.customers as customers
where orders.customer_id = customers.id;
update public.orders
set
	customer_name = coalesce(customer_name, 'Cliente'),
	customer_email = coalesce(customer_email, 'cliente@example.com'),
	payment_method = coalesce(payment_method, 'manual'),
	status = coalesce(status, 'pending'),
	discount = coalesce(discount, 0),
	shipping_cost = coalesce(shipping_cost, 0);
alter table public.orders
	alter column order_number set not null,
	alter column customer_name set not null,
	alter column customer_email set not null,
	alter column status set default 'pending',
	alter column status set not null,
	alter column payment_method set not null,
	alter column discount set default 0,
	alter column shipping_cost set default 0;
do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'orders_order_number_key'
			and conrelid = 'public.orders'::regclass
	) then
		alter table public.orders
			add constraint orders_order_number_key unique (order_number);
	end if;
end $$;
do $$
begin
	if exists (
		select 1
		from pg_constraint
		where conname = 'order_items_product_id_fkey'
			and conrelid = 'public.order_items'::regclass
	) then
		alter table public.order_items
			drop constraint order_items_product_id_fkey;
	end if;
end $$;
alter table public.order_items
	alter column product_id type text using product_id::text;
alter table public.order_items
	add column if not exists product_image text,
	add column if not exists size text,
	add column if not exists finish text;
update public.order_items
set product_id = coalesce(product_id, variant_id::text, id::text)
where product_id is null;
alter table public.order_items
	alter column product_id set not null;
create index if not exists idx_orders_email on public.orders(customer_email);
create index if not exists idx_order_items_order on public.order_items(order_id);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'orders'
			and policyname = 'Allow all orders'
	) then
		create policy "Allow all orders"
			on public.orders
			for all
			using (true)
			with check (true);
	end if;
end $$;
do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'order_items'
			and policyname = 'Allow all order_items'
	) then
		create policy "Allow all order_items"
			on public.order_items
			for all
			using (true)
			with check (true);
	end if;
end $$;
