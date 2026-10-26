-- Feature 75 · T31 — fixturas da prova em navegador (P75-N…), ids 00000000-0000-4000-d075-…,
-- order_number explícito. Apagadas por limpa.sql.
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method, subtotal, total, status, payment_status, material_status, tracking_code, shipping_service_id, created_at) values
  ('00000000-0000-4000-d075-000000000001', 'P75-N1', 'Cliente Prova Um', 'prova75-n1@exemplo.invalid', '51999990001', 'pix', 389.9, 389.9, 'paid', 'approved', 'aguardando_material', null, '1', '2026-09-01T12:00:00Z'),
  ('00000000-0000-4000-d075-000000000002', 'P75-N2', 'Cliente Prova Dois Com Um Nome Bem Comprido Para Quebrar', 'prova75-n2@exemplo.invalid', '51999990002', 'pix', 210, 210, 'paid', 'approved', 'nao_aplicavel', null, '1', '2026-10-20T12:00:00Z'),
  ('00000000-0000-4000-d075-000000000003', 'P75-N3', 'Cliente Prova Três', 'prova75-n3@exemplo.invalid', '51999990003', 'pix', 150, 150, 'separating', 'approved', 'nao_aplicavel', null, '1', '2026-10-21T12:00:00Z'),
  ('00000000-0000-4000-d075-000000000004', 'P75-N4', 'Cliente Prova Quatro', 'prova75-n4@exemplo.invalid', '51999990004', 'pix', 120, 120, 'shipped', 'approved', 'nao_aplicavel', null, '1', '2026-10-22T12:00:00Z'),
  ('00000000-0000-4000-d075-000000000005', 'P75-N5', 'Cliente Prova Cinco', 'prova75-n5@exemplo.invalid', '51999990005', 'pix', 99, 99, 'separating', 'approved', 'nao_aplicavel', null, 'retirada', '2026-10-22T13:00:00Z'),
  ('00000000-0000-4000-d075-000000000006', 'P75-N6', 'Cliente Prova Seis', 'prova75-n6@exemplo.invalid', '51999990006', 'pix', 180, 180, 'paid', 'approved', 'aguardando_material', null, '1', '2026-08-01T12:00:00Z');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price) values
  ('00000000-0000-4000-d075-000000000101', '00000000-0000-4000-d075-000000000001', 'prova75', 'Pingente Estrela de Leite', 1, 389.9),
  ('00000000-0000-4000-d075-000000000102', '00000000-0000-4000-d075-000000000002', 'prova75', 'Anel Memória', 1, 210),
  ('00000000-0000-4000-d075-000000000103', '00000000-0000-4000-d075-000000000003', 'prova75', 'Brinco Gota', 1, 150),
  ('00000000-0000-4000-d075-000000000104', '00000000-0000-4000-d075-000000000004', 'prova75', 'Colar Ponto de Luz', 1, 120),
  ('00000000-0000-4000-d075-000000000105', '00000000-0000-4000-d075-000000000005', 'prova75', 'Pulseira Fio', 1, 99),
  ('00000000-0000-4000-d075-000000000106', '00000000-0000-4000-d075-000000000006', 'prova75', 'Pingente Gota', 1, 180);
insert into public.order_status_history (order_id, from_status, to_status, note) values
  ('00000000-0000-4000-d075-000000000002', 'pending', 'paid', 'Pagamento aprovado'),
  ('00000000-0000-4000-d075-000000000003', 'paid', 'separating', null),
  ('00000000-0000-4000-d075-000000000004', 'separating', 'shipped', null);
