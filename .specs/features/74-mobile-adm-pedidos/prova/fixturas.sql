-- Feature 74 · T31 — 60 pedidos de prova (prefixo de id 00000000-0000-4000-d074-, order_number P74-NN
-- explícito: a sequência não anda). Apagadas por limpa.sql.
\set ON_ERROR_STOP on
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method, subtotal,
  shipping_cost, total, status, payment_status, material_status, tracking_code, shipping_service_id, shipping_method,
  address_street, address_number, address_neighborhood, address_city, address_state, address_zip, created_at)
select
  ('00000000-0000-4000-d074-' || lpad(n::text, 12, '0'))::uuid,
  'P74-' || lpad(n::text, 2, '0'),
  case when n = 1 then 'Cliente Prova Com Um Nome Bem Comprido Para Quebrar Linha' else 'Cliente Prova ' || n end,
  'prova74-' || n || '@exemplo.invalid',
  '51999990' || lpad(n::text, 3, '0'),
  case when n % 3 = 0 then 'cartao' else 'pix' end,
  100 + n, case when n % 5 = 0 then 0 else 19.9 end,
  case when n = 2 then 99999.90 else 100 + n end,
  (array['paid','paid','separating','shipped','delivered','pending'])[1 + n % 6],
  case when n % 6 = 5 then 'pending' else 'approved' end,
  case when n % 4 = 0 then 'aguardando_material' else 'nao_aplicavel' end,
  case when n % 6 = 3 and n % 12 <> 3 then 'BR' || lpad(n::text, 9, '0') || 'BR'
       when n % 6 = 4 then 'BR' || lpad(n::text, 9, '0') || 'BR' else null end,
  case when n % 10 = 7 then 'retirada' else '1' end,
  case when n % 10 = 7 then null else 'PAC' end,
  'Rua das Flores', '120', 'Centro', 'Porto Alegre', 'RS', '90010000',
  now() - (n || ' hours')::interval - (n || ' microseconds')::interval
from generate_series(1, 60) n;

insert into public.order_items (id, order_id, product_id, product_name, variant_label, engraving_text, quantity, unit_price)
values ('00000000-0000-4000-d074-0000000001a1', '00000000-0000-4000-d074-000000000001', 'prova74', 'Pingente gota de prova', 'Prata 925', 'Helena', 2, 50);
insert into public.order_status_history (id, order_id, from_status, to_status, note)
values ('00000000-0000-4000-d074-0000000001a2', '00000000-0000-4000-d074-000000000001', 'pending', 'paid', null);
insert into public.order_notifications (id, order_id, event, status)
values ('00000000-0000-4000-d074-0000000001a3', '00000000-0000-4000-d074-000000000001', 'order_paid', 'failed');
