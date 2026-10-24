-- Feature 76 · T10 — semântica de `orders_open` (MAC-24, MAC-09, A10). Fixturas P76-… em ids
-- 00000000-0000-4000-c076-… e e-mails p76-op-…@exemplo.invalid (apagadas pelo 02-limpa.sql).
insert into public.customers (id, user_id, name, email, phone, created_at) values
  ('00000000-0000-4000-c076-0000000e0001', null, 'P76 Sem Pedido', 'p76-op-sem@exemplo.invalid', null, '2031-06-01T00:00:00Z'),
  ('00000000-0000-4000-c076-0000000e0002', null, 'P76 Conta Depois', 'p76-op-conta@exemplo.invalid', null, '2031-06-02T00:00:00Z');

insert into public.orders (id, order_number, customer_id, customer_name, customer_email, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, created_at)
select ('00000000-0000-4000-c076-' || lpad(n::text, 12, '0'))::uuid, 'P76-' || lpad(n::text, 3, '0'),
       cid::uuid, 'P76 ' || pessoa, 'p76-op-' || pessoa || '@exemplo.invalid', 'pix', 100, 100, st, pg, 'nao_aplicavel', '1', criado::timestamptz
from (values
  -- a: só pago e entregue => 0
  (201, 'a', null, 'delivered', 'approved', '2031-07-01T10:00:00Z'),
  -- b: pago e shipped => 1
  (202, 'b', null, 'shipped',   'approved', '2031-07-02T10:00:00Z'),
  -- c: pending + approved (o material esperado) => 1
  (203, 'c', null, 'pending',   'approved', '2031-07-03T10:00:00Z'),
  -- d: pending + expired => 0
  (204, 'd', null, 'pending',   'expired',  '2031-07-04T10:00:00Z'),
  -- e: cancelled + approved => 0
  (205, 'e', null, 'cancelled', 'approved', '2031-07-05T10:00:00Z'),
  -- f: duas abertas => 2
  (206, 'f', null, 'paid',       'approved', '2031-07-06T10:00:00Z'),
  (207, 'f', null, 'separating', 'approved', '2031-07-07T10:00:00Z'),
  -- conta: um pedido de convidada ANTES de criar conta (customer_id nulo) e um DEPOIS (com o id) => 2 (A10)
  (208, 'conta', null,                                   'paid',    'approved', '2031-07-08T10:00:00Z'),
  (209, 'conta', '00000000-0000-4000-c076-0000000e0002', 'shipped', 'approved', '2031-07-09T10:00:00Z')
) as t(n, pessoa, cid, st, pg, criado);

-- A pessoa "sem pedido" usa o e-mail p76-op-sem; nenhuma ordem dela.
create temp table esperado (email text, orders_open bigint);
insert into esperado values
  ('p76-op-a@exemplo.invalid', 0), ('p76-op-b@exemplo.invalid', 1), ('p76-op-c@exemplo.invalid', 1),
  ('p76-op-d@exemplo.invalid', 0), ('p76-op-e@exemplo.invalid', 0), ('p76-op-f@exemplo.invalid', 2),
  ('p76-op-conta@exemplo.invalid', 2), ('p76-op-sem@exemplo.invalid', 0);

select case when l.orders_open is not distinct from e.orders_open then 'ok' else 'FALHA' end as resultado,
       e.email, e.orders_open as esperado, l.orders_open as lido, s.orders_open as lido_stats
from esperado e
left join public.customer_list l on lower(l.email) = e.email
left join public.customer_stats s on s.customer_id = l.id
order by e.email;

select 'orders_open nulo em customer_list: ' || count(*) filter (where orders_open is null) as nulos from public.customer_list;
