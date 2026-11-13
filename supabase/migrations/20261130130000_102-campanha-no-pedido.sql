-- O desconto de campanha no pedido.
--
-- A campanha da linha já tem a coluna `order_items.campaign_id` (migration das campanhas). Esta
-- acrescenta o resto do que o pedido guarda do que foi cobrado:
--
--   order_items.campaign_percent   o percentual da campanha naquela peça, no instante do pedido
--   order_items.compare_unit_price o "de" da peça (`original_price` do produto ou `compare_price` da
--                                  variação), quando havia — o cheio da campanha é o maior entre ele
--                                  e `full_unit_price` (o preço de tabela)
--   orders.campaign_discount       o desconto de campanha do pedido, calculado pelo SERVIDOR
--   order_charge_locks.campaign_discount
--                                  o mesmo desconto, travado na primeira cobrança (pagar de novo
--                                  devolve o pedido a ele)
--
-- Quem grava são as functions, com a service role: `checkout` (`create-order`) resolve a campanha
-- com o relógio dela e grava a de cada linha; `mercado-pago` (`create-payment`) aplica a campanha
-- GRAVADA na linha, sem reavaliar a vigência, e regrava os valores pelo recálculo. Nada vem do corpo
-- da requisição.
--
-- `campaign_percent` e `compare_unit_price` são nulos sem default: a linha sem campanha (e todo pedido
-- de antes) fica como era. O teto de 1..70 é o de `campaign_percents.percent`.
--
-- `order_list` é recriada com `campaign_discount` NO FIM: `create or replace view` só aceita coluna
-- acrescentada ao fim, e a lista abaixo é a da migration
-- `20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql`, copiada sem reordenar nada.
--
-- Aditiva: nenhum dado, nenhuma policy, nenhum `grant`.
--
-- Ordem de publicação: migration → functions (`checkout`, `mercado-pago`) → bundles. O detalhe do
-- pedido no app passa a pedir `campaign_discount`; sem a coluna a leitura inteira falha.

alter table public.order_items
	add column if not exists campaign_percent integer check (campaign_percent between 1 and 70),
	add column if not exists compare_unit_price numeric(10,2) check (compare_unit_price >= 0);

alter table public.orders
	add column if not exists campaign_discount numeric(10,2) not null default 0 check (campaign_discount >= 0);

alter table public.order_charge_locks
	add column if not exists campaign_discount numeric(10,2) not null default 0 check (campaign_discount >= 0);

create or replace view public.order_list
with (security_invoker = true) as
select
	id, order_number, customer_id, status, subtotal, shipping_cost, discount, total,
	payment_method, shipping_method, tracking_code, notes, created_at, updated_at,
	customer_name, customer_email, address_street, address_number, address_neighborhood,
	address_city, address_state, shipping_carrier, cancel_reason, address_zip,
	address_complement, melhor_envio_id, melhor_envio_label_url, melhor_envio_protocol,
	coupon_code, coupon_id, payment_status, mp_payment_id, mp_status_detail, paid_at,
	pix_discount, shipping_service_id, delivery_estimate_min, delivery_estimate_max,
	mp_order_id, promotion_id, promotion_discount, material_status, material_tracking_code,
	material_received_at,
	row_number() over (
		partition by (coalesce(customer_id::text, lower(customer_email))) order by created_at
	)::integer as purchase_ordinal,
	customer_phone,
	customer_document,
	material_tracking_set_at,
	material_tracking_set_by,
	-- Compre Junto (desconto da compra casada), no fim.
	buy_together_discount,
	order_bump_discount,
	-- O desconto combinado do pedido montado pelo painel, no fim.
	manual_discount,
	-- O desconto de campanha, no fim.
	campaign_discount
from public.orders o;
