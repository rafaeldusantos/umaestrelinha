-- Feature 82 · T15 — fixturas da prova em navegador (P82-…), ids 00000000-0000-4000-d082-…,
-- order_number explícito. Apagadas por limpa.sql. Datas relativas a now() do banco local.
-- A: aguardando sem código, cinzas + cabelo, criado há 10 dias (idade stale)
-- B: material_enviado com código informado pela cliente (set_by customer, há 2 dias)
-- C: material_recebido sem código
-- D: cancelado com material (aguardando)
-- E: material_enviado com código longo (~30), set_by admin
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method, subtotal, total, status, payment_status, material_status, material_tracking_code, material_tracking_set_at, material_tracking_set_by, material_received_at, shipping_service_id, created_at) values
  ('00000000-0000-4000-d082-00000000000a', 'P82-A', 'Mariana Prova Envelope', 'prova82-a@exemplo.invalid', '51999998201', 'pix', 389.9, 389.9, 'paid', 'approved', 'aguardando_material', null, null, null, null, '1', now() - interval '10 days'),
  ('00000000-0000-4000-d082-00000000000b', 'P82-B', 'Beatriz Prova Envelope', 'prova82-b@exemplo.invalid', '51999998202', 'pix', 210, 210, 'paid', 'approved', 'material_enviado', 'AN123456789BR', now() - interval '2 days', 'customer', null, '1', now() - interval '4 days'),
  ('00000000-0000-4000-d082-00000000000c', 'P82-C', 'Carla Prova Envelope', 'prova82-c@exemplo.invalid', '51999998203', 'pix', 150, 150, 'paid', 'approved', 'material_recebido', null, null, null, now() - interval '1 day', '1', now() - interval '6 days'),
  ('00000000-0000-4000-d082-00000000000d', 'P82-D', 'Débora Prova Envelope', 'prova82-d@exemplo.invalid', '51999998204', 'pix', 120, 120, 'cancelled', 'approved', 'aguardando_material', null, null, null, null, '1', now() - interval '3 days'),
  ('00000000-0000-4000-d082-00000000000e', 'P82-E', 'Elisa Prova Envelope', 'prova82-e@exemplo.invalid', '51999998205', 'pix', 99, 99, 'paid', 'approved', 'material_enviado', 'QX12345678901234567890123456BR', now() - interval '3 hours', 'admin', null, '1', now() - interval '1 day');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price, requires_material, material_kinds) values
  ('00000000-0000-4000-d082-0000000001a1', '00000000-0000-4000-d082-00000000000a', 'prova82', 'Pingente Estrela de Cinzas', 1, 189.9, true, '{cinzas}'),
  ('00000000-0000-4000-d082-0000000001a2', '00000000-0000-4000-d082-00000000000a', 'prova82', 'Anel Mecha de Cabelo', 1, 200, true, '{cabelo,cinzas}'),
  ('00000000-0000-4000-d082-0000000001b1', '00000000-0000-4000-d082-00000000000b', 'prova82', 'Pingente Gota de Leite', 1, 210, true, '{leite_materno}'),
  ('00000000-0000-4000-d082-0000000001c1', '00000000-0000-4000-d082-00000000000c', 'prova82', 'Colar Pelo de Pet', 1, 150, true, '{pelo_pet}'),
  ('00000000-0000-4000-d082-0000000001d1', '00000000-0000-4000-d082-00000000000d', 'prova82', 'Brinco Cinzas', 1, 120, true, '{cinzas}'),
  ('00000000-0000-4000-d082-0000000001e1', '00000000-0000-4000-d082-00000000000e', 'prova82', 'Pulseira Dente de Leite', 1, 99, true, '{dente_leite}');
