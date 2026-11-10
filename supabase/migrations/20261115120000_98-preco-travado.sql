-- =====================================================================
-- O valor travado da primeira cobrança.
-- =====================================================================
--
-- Pagar de novo (o PIX que expirou, o cartão recusado) cobra o mesmo valor da PRIMEIRA cobrança que
-- o servidor calculou para o pedido: promoção encerrada, cupom esgotado ou preço mudado no catálogo
-- não mudam o valor nem recusam a cobrança.
--
-- Quem grava e lê é a function `mercado-pago` (`create-payment`), com a service role:
--   - na primeira cobrança, depois do recálculo de sempre, grava os totais dos DOIS meios (o pagar
--     de novo pode trocar o PIX pelo cartão), o desconto do cupom, o frete, os descontos por item e
--     as linhas cobradas;
--   - da segunda em diante, cobra o total do meio escolhido, conferindo as linhas do pedido contra
--     as travadas.
--
-- Nunca `orders.total`: as policies de INSERT de `orders` e `order_items` seguem abertas (`BL-030`),
-- e um valor gravado por quem fez o pedido não pode virar o valor cobrado. Por isso a tabela tem RLS
-- ligada e NENHUMA policy (molde de `order_proposals`, migration `20261103120000_89-pedido-montado.sql`):
-- para `anon` e `authenticated` ela não existe.
--
-- Pedido sem linha aqui (inclusive os pendentes de antes desta migration) é calculado como sempre.
--
-- Nenhuma escrita de dado.

create table if not exists public.order_charge_locks (
	order_id              uuid primary key references public.orders (id) on delete cascade,
	first_method          text not null check (first_method in ('pix', 'card')),
	coupon_id             uuid,
	promotion_id          uuid,
	promotion_discount    numeric(10,2) not null default 0 check (promotion_discount >= 0),
	buy_together_discount numeric(10,2) not null default 0 check (buy_together_discount >= 0),
	order_bump_discount   numeric(10,2) not null default 0 check (order_bump_discount >= 0),
	-- `{ subtotal, discount, pix_discount, shipping, total }` de cada meio. Nulo só quando aquele meio
	-- não fecha um total válido (menor que R$ 0,01); o do meio da primeira cobrança sempre existe.
	pix                   jsonb check (pix is null or jsonb_typeof(pix) = 'object'),
	card                  jsonb check (card is null or jsonb_typeof(card) = 'object'),
	-- `[{ product_id, variant_id, quantity, unit_price, full_unit_price }]`: as linhas como a primeira
	-- cobrança as regravou em `order_items`.
	lines                 jsonb not null check (jsonb_typeof(lines) = 'array'),
	created_at            timestamptz not null default now(),
	check (
		(first_method = 'pix' and pix is not null)
		or (first_method = 'card' and card is not null)
	)
);

-- RLS ligada e NENHUMA policy: só a service role lê e grava.
alter table public.order_charge_locks enable row level security;

revoke all on table public.order_charge_locks from public;
revoke all on table public.order_charge_locks from anon;
revoke all on table public.order_charge_locks from authenticated;

grant all on table public.order_charge_locks to service_role;
