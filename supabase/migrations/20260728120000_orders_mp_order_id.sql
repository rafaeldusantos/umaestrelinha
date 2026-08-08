-- =====================================================================
-- PER-01 (09-checkout-orders-api): orders.mp_order_id
--
-- A API de Orders do Mercado Pago trabalha com DOIS identificadores ULID
-- distintos, e ambos têm uso real. Os formatos abaixo são os MEDIDOS em
-- sandbox no T16 (o prefixo ORDTST marca sandbox), e vêm em MAIÚSCULAS:
--
--   · id da ORDER    (ex.: ORDTST01KYMAPS387GPYD6WV2YA8VEBJ)
--       É a chave de GET /v1/orders/{id} e de POST /v1/orders/{id}/cancel,
--       e é o valor que chega como `data.id` na notificação de webhook.
--       Por isso precisa de índice: o webhook faz lookup por ela (WHK-03).
--
--   · id do PAYMENT  (ex.: PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1)
--       Vive em transactions.payments[0].id. É o que aparece no painel do MP
--       e em conversa de suporte. Continua em `mp_payment_id`, que já existe
--       (20260718234043_orders_payment_schema.sql:32-37) e já é `text`.
--
-- Sem backfill: a integração via /v1/payments nunca processou pedido real,
-- então nenhuma linha mistura formatos.
-- =====================================================================

alter table public.orders
	add column if not exists mp_order_id text;

create index if not exists idx_orders_mp_order_id on public.orders(mp_order_id);
