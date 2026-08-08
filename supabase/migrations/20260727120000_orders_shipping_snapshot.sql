-- =====================================================================
-- M1 · orders: snapshot do envio escolhido (SHP-07, SHP-08)
--
-- Nenhuma coluna atual guarda o prazo de entrega nem o id do serviço do
-- Melhor Envio; sem elas uma recotação posterior (inclusive a do backoffice)
-- mudaria o que a cliente viu no checkout.
--
-- Idempotente: só ADD COLUMN IF NOT EXISTS. Nenhum DROP, nenhuma alteração de
-- coluna existente — mesmo padrão de 20260415175146_orders_melhor_envio_fields.sql.
-- =====================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_service_id    text,
  ADD COLUMN IF NOT EXISTS delivery_estimate_min  date,
  ADD COLUMN IF NOT EXISTS delivery_estimate_max  date;

COMMENT ON COLUMN public.orders.shipping_service_id IS
  'id do serviço no Melhor Envio no momento da compra (snapshot — não recotar)';
COMMENT ON COLUMN public.orders.delivery_estimate_min IS
  'início da janela de entrega estimada, em dias úteis (SHP-09)';
COMMENT ON COLUMN public.orders.delivery_estimate_max IS
  'fim da janela de entrega estimada, em dias úteis (SHP-09)';
