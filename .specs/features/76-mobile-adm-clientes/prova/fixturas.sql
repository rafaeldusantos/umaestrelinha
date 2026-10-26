-- Feature 76 · T32 — fixturas da prova em navegador (ids …-d076-…; e-mails @exemplo.invalid). Apagadas por limpa.sql.
-- 1) uma convidada com nome e e-mail longos e 22 pedidos (2 em aberto) — "Ver mais pedidos" e a quebra de linha;
-- 2) um cadastro sem nome e sem pedido; 3) o par VROSA_RJ/VROSAXRJ; 4) um cadastro com telefone para a busca.
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, address_city, address_state, created_at)
select ('00000000-0000-4000-d076-' || lpad(n::text, 12, '0'))::uuid, 'P76-L' || lpad(n::text, 2, '0'),
       'P76 Marina Albuquerque de Vasconcelos Teixeira Duarte Figueiredo Santos',
       'p76.endereco.de.email.realmente.comprido.demais.para.caber.numa.linha.estreita@subdominio-bem-longo.exemplo.invalid',
       '51998124471', 'pix', 100 + n, 100 + n,
       case when n <= 2 then 'paid' else 'delivered' end, 'approved', 'nao_aplicavel', '1', 'Gramado', 'RS',
       now() - (n || ' days')::interval
from generate_series(1, 22) as n;
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, address_city, address_state, created_at)
values
  ('00000000-0000-4000-d076-000000000101', 'P76-V01', 'P76 Valéria Rosa',  'P76VROSA_RJ@exemplo.invalid',  '21999990001', 'pix', 150, 150, 'delivered', 'approved', 'nao_aplicavel', '1', 'Niterói', 'RJ', now() - interval '40 days'),
  ('00000000-0000-4000-d076-000000000102', 'P76-V02', 'P76 Valdete Rosa',  'P76VROSAXRJ@exemplo.invalid', '21999990002', 'pix', 250, 250, 'delivered', 'approved', 'nao_aplicavel', '1', 'Niterói', 'RJ', now() - interval '41 days');
insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price)
select ('00000000-0000-4000-d076-' || lpad((n + 5000)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-d076-' || lpad(n::text, 12, '0'))::uuid, 'probe76', 'P76 Pingente Gota ' || n, 1, 100
from unnest(array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,101,102]) as n;
insert into public.customers (id, user_id, name, email, phone, created_at) values
  ('00000000-0000-4000-d076-0000000a0001', null, '', 'p76.sem.nome@exemplo.invalid', null, now() - interval '3 days'),
  ('00000000-0000-4000-d076-0000000a0002', null, 'P76 Telefone Teste', 'p76.telefone@exemplo.invalid', '51988776655', now() - interval '2 days');
