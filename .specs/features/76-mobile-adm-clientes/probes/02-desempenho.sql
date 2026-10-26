-- Feature 76 · T10 — custo da lista com orders_open: 3.000 pessoas e 6.000 pedidos de fixtura, numa
-- transação DESFEITA. A lista é a consulta da primeira página do app (ordem do cursor da 76).
begin;
insert into public.customers (id, user_id, name, email, created_at)
select ('00000000-0000-4000-c076-' || lpad((300000 + g)::text, 12, '0'))::uuid, null, 'P76 Carga ' || g,
       'p76-carga-' || g || '@exemplo.invalid', now() - (g || ' minutes')::interval
from generate_series(1, 3000) g;
insert into public.orders (id, order_number, customer_id, customer_name, customer_email, payment_method,
  subtotal, total, status, payment_status, material_status, shipping_service_id, created_at)
select ('00000000-0000-4000-c076-' || lpad((400000 + g)::text, 12, '0'))::uuid, 'P76C' || g,
       case when g % 3 = 0 then null else ('00000000-0000-4000-c076-' || lpad((300000 + ((g - 1) % 3000) + 1)::text, 12, '0'))::uuid end,
       'P76 Carga', 'p76-carga-' || (((g - 1) % 3000) + 1) || '@exemplo.invalid', 'pix', 100, 100,
       (array['pending','paid','separating','shipped','delivered','cancelled'])[1 + g % 6],
       (array['approved','approved','expired'])[1 + g % 3], 'nao_aplicavel', '1', now() - (g || ' minutes')::interval
from generate_series(1, 6000) g;
analyze public.orders;
analyze public.customers;
explain (analyze, buffers) select id, name, email, orders_paid, orders_open, last_activity_at
from public.customer_list
order by last_activity_at desc nulls last, id
limit 25;
rollback;
