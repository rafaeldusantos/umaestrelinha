-- Feature 76 · T02 — fixturas do probe de banco (P76-…). Tudo termina em @exemplo.invalid.
-- Pedidos: ids 00000000-0000-4000-c076-<n>. Convidadas (sem customers) nascem do pedido; o id delas
-- no customer_directory é md5(lower(email))::uuid.
insert into public.orders (id, order_number, customer_name, customer_email, customer_phone, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, address_city, address_state, created_at)
select ('00000000-0000-4000-c076-' || lpad(n::text, 12, '0'))::uuid, 'P76-' || lpad(n::text, 3, '0'),
       nome, email, '51999990000', 'pix', 100, 100, 'paid', 'approved', 'nao_aplicavel', '1', 'Porto Alegre', 'RS', criado::timestamptz
from (values
  -- cursor: A (microssegundos), B e C EMPATADOS, D mais antigo
  (1,  'P76 Cursor A', 'p76-cur-a@exemplo.invalid', '2031-05-01T10:00:00.123456Z'),
  (2,  'P76 Cursor B', 'p76-cur-b@exemplo.invalid', '2031-04-01T10:00:00.500000Z'),
  (3,  'P76 Cursor C', 'p76-cur-c@exemplo.invalid', '2031-04-01T10:00:00.500000Z'),
  (4,  'P76 Cursor D', 'p76-cur-d@exemplo.invalid', '2031-03-01T10:00:00Z'),
  -- escape: o literal e o engodo de cada caractere
  (10, 'P76 100% Ana',      'p76-esc-10@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (11, 'P76 100X Ana',      'p76-esc-11@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (12, 'P76 a_b Bia',       'p76-esc-12@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (13, 'P76 aXb Bia',       'p76-esc-13@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (14, 'P76 back\slash',    'p76-esc-14@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (15, 'P76 backXslash',    'p76-esc-15@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (16, 'P76 "aspas" Dani',  'p76-esc-16@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (17, 'P76 Ana (b, c)',    'p76-esc-17@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (18, 'P76 star*x',        'p76-esc-18@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (19, 'P76 starZx',        'p76-esc-19@exemplo.invalid', '2030-01-01T10:00:00Z'),
  (20, 'P76 star',          'p76-esc-20@exemplo.invalid', '2030-01-01T10:00:00Z'),
  -- vínculo (A10) e caixa (5)
  (30, 'P76 Vrosa Um',      'P76VROSA_RJ@exemplo.invalid',  '2030-02-01T10:00:00Z'),
  (31, 'P76 Vrosa Dois',    'P76VROSAXRJ@exemplo.invalid', '2030-02-02T10:00:00Z'),
  (32, 'P76 Maria Caixa',   'P76Maria@Exemplo.invalid',    '2030-02-03T10:00:00Z')
) as t(n, nome, email, criado);

insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price)
select ('00000000-0000-4000-c076-' || lpad((n + 5000)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-c076-' || lpad(n::text, 12, '0'))::uuid, 'probe76', 'P76 Joia', 1, 100
from unnest(array[1,2,3,4,30,31,32]) as n;

-- Cadastros SEM pedido (data nula no cursor) e a duplicata do e-mail (A18), sem auth.users (user_id nulo).
insert into public.customers (id, user_id, name, email, phone, created_at) values
  ('00000000-0000-4000-c076-0000000a0001', null, 'P76 Nulo A', 'p76-nul-a@exemplo.invalid', null, '2031-01-01T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000a0002', null, 'P76 Nulo B', 'p76-nul-b@exemplo.invalid', null, '2031-01-02T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000d0001', null, 'P76 Dup Um',   'p76-dup@exemplo.invalid',   null, '2031-02-01T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000d0002', null, 'P76 Dup Dois', 'P76-DUP@exemplo.invalid',   null, '2031-02-02T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000d0003', null, 'P76 Emp Um',   'p76-emp@exemplo.invalid',   null, '2031-02-03T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000d0004', null, 'P76 Emp Dois', 'P76-EMP@exemplo.invalid',   null, '2031-02-03T00:00:00Z');
