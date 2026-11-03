-- Compre Junto — o desconto da compra casada no pedido.
--
-- O pedido passa a guardar cada desconto por item numa coluna própria, ao lado de
-- `promotion_discount`: `buy_together_discount` (o desconto casado) e `order_bump_discount` (a oferta
-- do checkout). Como `promotion_discount`, os dois são gravados na CRIAÇÃO com o que a tela mostrou e
-- regravados pelo `create-payment` com o recalculado — o exibido é o teto da guarda que recusa cobrar
-- mais caro do que a tela prometeu.
--
-- Cada linha passa a guardar o preço cheio da unidade (`full_unit_price`) ao lado do cobrado
-- (`unit_price`, que passa a ser o preço com a oferta do checkout, a promoção ou o desconto casado).
-- Nulo nos pedidos de antes: neles `unit_price` continua sendo o que era, e quem lê usa
-- `full_unit_price` com recuo para `unit_price`.
--
-- Aditiva: nenhum dado reescrito, nenhuma policy, nenhum `grant`. Os pedidos existentes ficam com os
-- dois descontos em zero (o default) e o preço cheio nulo.

alter table public.orders
	add column if not exists buy_together_discount numeric(10,2) not null default 0,
	add column if not exists order_bump_discount   numeric(10,2) not null default 0;

alter table public.order_items
	add column if not exists full_unit_price numeric(10,2);

-- Os `check` em statements próprios e nomeados: constraint escrita INLINE num
-- `add column if not exists` é ignorada em silêncio quando a coluna já existe.
do $$
begin
	if not exists (
		select 1 from pg_constraint
		 where conname = 'orders_buy_together_discount_check'
		   and conrelid = 'public.orders'::regclass
	) then
		alter table public.orders
			add constraint orders_buy_together_discount_check check (buy_together_discount >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		 where conname = 'orders_order_bump_discount_check'
		   and conrelid = 'public.orders'::regclass
	) then
		alter table public.orders
			add constraint orders_order_bump_discount_check check (order_bump_discount >= 0);
	end if;

	if not exists (
		select 1 from pg_constraint
		 where conname = 'order_items_full_unit_price_check'
		   and conrelid = 'public.order_items'::regclass
	) then
		alter table public.order_items
			add constraint order_items_full_unit_price_check
			check (full_unit_price is null or full_unit_price >= 0);
	end if;
end $$;

comment on column public.orders.buy_together_discount is
	'Desconto da compra casada (Compre Junto). Gravado na criação com o que a tela mostrou e regravado pelo create-payment com o recalculado; o exibido é teto da guarda que recusa cobrar mais caro.';
comment on column public.orders.order_bump_discount is
	'Desconto da oferta do checkout (order bump). Mesma regra de buy_together_discount.';
comment on column public.order_items.full_unit_price is
	'Preço cheio da unidade. unit_price é o cobrado (com bump, promoção ou desconto casado). Nulo nos pedidos anteriores: use unit_price.';
