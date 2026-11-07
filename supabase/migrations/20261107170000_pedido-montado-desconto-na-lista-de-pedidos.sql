-- O desconto combinado do pedido montado pelo painel na view `order_list`.
--
-- `order_list` é o que o detalhe do pedido do app do ateliê lê (o pedido e o endereço numa ida). A
-- coluna `orders.manual_discount` (migration `20261103120000_89-pedido-montado.sql`) não saía por ela,
-- e o resumo de valores do app mostrava o pedido montado sem a linha "Desconto combinado": as linhas
-- não fechavam com o Total. Ela passa a sair, para o app mostrar a mesma composição do painel.
--
-- `create or replace view` só aceita coluna ACRESCENTADA AO FIM: a lista abaixo é a da migration
-- `20261107160000_compre-junto-desconto-na-lista-de-pedidos.sql`, copiada sem reordenar nada, e a
-- nova entra depois de `order_bump_discount`. O motivo do desconto mora em `order_proposals`, que
-- nenhum papel do navegador lê, e por isso NÃO entra aqui.
--
-- Aditiva: nenhum dado, nenhuma policy, nenhum `grant`. A view segue `security_invoker`.
--
-- Ordem de publicação: migration → bundle do app. O detalhe passa a pedir a coluna no `select`; sem
-- ela a leitura inteira falha.

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
	manual_discount
from public.orders o;
