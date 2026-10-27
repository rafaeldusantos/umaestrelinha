-- Feature 83 · T13 · fixtura da prova em navegador (COMPROMETE no banco local; desfazer com limpa.sql).
-- Marca: visitor_id começando por 83000000-, pedidos PROVA83-*. O contador (store_visit_counter)
-- estava AUSENTE antes da prova; limpa.sql o apaga de novo.
-- Ontem com 4 dígitos em seis das 8 faixas (o extremo do gráfico), hoje com as horas 0 e 1.
\set ON_ERROR_STOP 1
begin;
insert into public.store_visit_counter (started_at, last_recorded_at)
values (now() - interval '8 days', now());

with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d),
plano(dia_rel, hora, n) as (values
  -- hoje: 0h e 1h
  (0, 0, 37), (0, 1, 9),
  -- ontem: uma por faixa de 3 h (faixas 0..7 → horas 1, 4, 7, …, 22)
  (1, 1, 12), (1, 4, 3), (1, 7, 1450), (1, 10, 2380), (1, 13, 3105), (1, 16, 2876),
  (1, 19, 1999), (1, 22, 1024),
  -- anteontem: base da comparação de Ontem
  (2, 10, 2100), (2, 15, 2400), (2, 20, 1700)),
linhas as (select (select d from hoje) - dia_rel as day, hora, generate_series(1, n) as k, dia_rel
             from plano)
insert into public.store_visits (day, visitor_id, first_hour)
select day, ('83000000-0000-4000-8' || dia_rel || lpad(hora::text, 2, '0') || '-' || lpad(k::text, 12, '0'))::uuid, hora
  from linhas;

insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                           customer_email, payment_status, created_at, paid_at)
select 'PROVA83-' || n, 'pending', v, v, 'pix', 'Prova 83', 'prova83@exemplo.invalid', 'approved',
       t - interval '1 minute', t
  from (values
    (1, 189.90::numeric, ((now() at time zone 'America/Sao_Paulo')::date + time '00:40') at time zone 'America/Sao_Paulo'),
    (2, 249.00, ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '11:15') at time zone 'America/Sao_Paulo'),
    (3, 320.50, ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '15:30') at time zone 'America/Sao_Paulo'),
    (4, 159.00, ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '21:05') at time zone 'America/Sao_Paulo'),
    (5, 410.00, ((now() at time zone 'America/Sao_Paulo')::date - 2 + time '16:00') at time zone 'America/Sao_Paulo')
  ) as p(n, v, t);
commit;
