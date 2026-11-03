-- Compre Junto — os descontos por item do pedido na view `order_list`.
--
-- `order_list` é o que o detalhe do pedido do app do ateliê lê (o pedido e o endereço numa ida). As
-- duas colunas que a migration `20261107140000_compre-junto-desconto-no-pedido.sql` acrescentou a
-- `orders` — `buy_together_discount` (o desconto casado) e `order_bump_discount` (a oferta do
-- checkout) — passam a sair por ela, para o resumo do pedido mostrar a mesma composição da loja.
--
-- `create or replace view` só aceita coluna ACRESCENTADA AO FIM: a lista abaixo é a da migration
-- `20261028120000_82-envelope-da-cliente.sql`, copiada sem reordenar nada, e as duas novas entram
-- depois de `material_tracking_set_by`.
--
-- Aditiva: nenhum dado, nenhuma policy, nenhum `grant`. A view segue `security_invoker`.
--
-- Ordem de publicação: migration → bundle do app. O detalhe passa a pedir as duas colunas no
-- `select`; sem elas a leitura inteira falha.

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
	order_bump_discount
from public.orders o;
