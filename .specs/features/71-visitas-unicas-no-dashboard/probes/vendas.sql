-- Feature 71 · probe VIS-31, VIS-32, VIS-33 — vendas, faturamento e ticket na régua de Brasília.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f vendas.sql
-- Fixturas de pedido com `order_number` explícito (`PROBE-…`): a sequência não volta com rollback.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

create function pg_temp.pedido(p_num text, p_total numeric, p_status text, p_pagamento text,
                               p_criado timestamptz, p_pago timestamptz) returns void
language sql as $f$
  insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                             customer_email, payment_status, created_at, paid_at)
  values (p_num, p_status, p_total, p_total, 'pix', 'Probe 71', 'probe71@exemplo.invalid',
          p_pagamento, p_criado, p_pago)
$f$;

-- Contagem zero de venda nos períodos das fixturas antes de começar.
select pg_temp.confere((select count(*) from public.orders
                         where payment_status = 'approved' and paid_at >= timestamptz '2026-10-12T03:00:00Z') = 0,
  'nenhum pedido pago desde 12/10 antes das fixturas');

-- ---------------------------------------------------------------------------------------------
-- VIS-31 — as seis fixturas, lidas em 21/10 às 15h de Brasília
-- ---------------------------------------------------------------------------------------------
savepoint vis31;

-- (a) criado 23h50 de 20/10, pago 00h10 de 21/10 ⇒ Hoje
select pg_temp.pedido('PROBE-71-A', 11.00, 'pending', 'approved', '2026-10-21T02:50:00Z', '2026-10-21T03:10:00Z');
-- (b) criado e não pago ⇒ não conta
select pg_temp.pedido('PROBE-71-B', 22.00, 'pending', 'pending', '2026-10-21T12:00:00Z', null);
-- (c) pago em 20/10 e cancelado em 21/10 ⇒ sai de Ontem
select pg_temp.pedido('PROBE-71-C', 33.00, 'cancelled', 'approved', '2026-10-20T14:00:00Z', '2026-10-20T15:00:00Z');
-- (d) estornado ⇒ não conta
select pg_temp.pedido('PROBE-71-D', 44.00, 'pending', 'refunded', '2026-10-20T14:00:00Z', '2026-10-20T15:00:00Z');
-- (e) marcado como pago à mão: status 'paid', pagamento pendente, sem paid_at ⇒ não conta
select pg_temp.pedido('PROBE-71-E', 55.00, 'paid', 'pending', '2026-10-20T14:00:00Z', null);
-- (f) pago às 23h59:59.900 de 20/10 ⇒ Ontem
select pg_temp.pedido('PROBE-71-F', 66.00, 'pending', 'approved', '2026-10-20T20:00:00Z', '2026-10-21T02:59:59.900Z');

select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select :'m'::jsonb -> 'periodos' as periodos_vis31;
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,hoje,faturamento}')::numeric = 11.00,
  '(a) pago às 00h10 de 21/10 conta em Hoje, e só ele');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,faturamento}')::numeric = 66.00,
  '(f) 23h59:59.900 de 20/10 conta em Ontem; (b) (c) (d) (e) não contam');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,semana,vendas}')::int = 2
  and (:'m'::jsonb #>> '{periodos,semana,faturamento}')::numeric = 77.00,
  'Esta semana = (a) + (f)');

rollback to savepoint vis31;

-- ---------------------------------------------------------------------------------------------
-- VIS-03 / SPEC_DEVIATION D5 — a fronteira EXATA (conserto G3 da verificação r1)
-- A fixtura (f) acima é 02:59:59.900Z, um décimo ANTES da meia-noite: ela passa com `<` e com `<=`
-- em Ontem. Esta é o instante exato 00:00:00 de 21/10 em Brasília (03:00:00Z): pelo dia de Brasília
-- (`store_day`) ela é de 21/10, então conta só em Hoje. Com `paid_at <= v_ini_hoje` em Ontem ela
-- contaria em Hoje E em Ontem — mutante S10, que nenhum probe matava.
-- ---------------------------------------------------------------------------------------------
savepoint fronteira;

select pg_temp.pedido('PROBE-71-Z', 50.00, 'pending', 'approved', '2026-10-21T02:00:00Z', '2026-10-21T03:00:00Z');
select pg_temp.confere(public.store_day(timestamptz '2026-10-21T03:00:00Z') = date '2026-10-21',
  'âncora: 03:00:00Z de 21/10 é o dia 21/10 em Brasília');
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 0
  and (:'m'::jsonb #>> '{periodos,semana,vendas}')::int = 1,
  'pago EXATAMENTE às 00:00 de 21/10 (Brasília) ⇒ Hoje 1, Ontem 0, Semana 1');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,faturamento}')::numeric = 50.00
  and (:'m'::jsonb #>> '{periodos,ontem,faturamento}')::numeric = 0,
  'o faturamento acompanha: R$ 50,00 em Hoje, 0 em Ontem');

-- E o par: 1 µs antes do instante exato é de Ontem, e só de Ontem.
select pg_temp.pedido('PROBE-71-Y', 7.00, 'pending', 'approved', '2026-10-21T02:00:00Z', '2026-10-21T02:59:59.999999Z');
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,faturamento}')::numeric = 7.00,
  '1 µs antes da meia-noite ⇒ Ontem; o das 00:00 continua só em Hoje');

rollback to savepoint fronteira;

-- ---------------------------------------------------------------------------------------------
-- VIS-32 — o ticket arredondado no banco, e o faturamento 0 sem venda
-- Semana de 02/11 (segunda); lido na quarta 04/11 às 15h de Brasília.
-- ---------------------------------------------------------------------------------------------
savepoint vis32;

select pg_temp.pedido('PROBE-71-H1', 33.33, 'pending', 'approved', '2026-11-04T12:00:00Z', '2026-11-04T12:00:00Z');
select pg_temp.pedido('PROBE-71-H2', 33.33, 'pending', 'approved', '2026-11-04T13:00:00Z', '2026-11-04T13:00:00Z');
select pg_temp.pedido('PROBE-71-H3', 33.34, 'pending', 'approved', '2026-11-04T14:00:00Z', '2026-11-04T14:00:00Z');
select pg_temp.pedido('PROBE-71-O1', 10.00, 'pending', 'approved', '2026-11-03T12:00:00Z', '2026-11-03T12:00:00Z');
select pg_temp.pedido('PROBE-71-O2', 10.01, 'pending', 'approved', '2026-11-03T13:00:00Z', '2026-11-03T13:00:00Z');

select pg_temp.movimento('2026-11-04T18:00:00Z', :'admin_id') as m \gset
select :'m'::jsonb -> 'periodos' as periodos_vis32;
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,faturamento}')::numeric = 100.00
  and (:'m'::jsonb #>> '{periodos,hoje,ticket}')::numeric = 33.33,
  '3 vendas que somam R$ 100,00 ⇒ ticket 33,33');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,ontem,ticket}')::numeric = 10.01,
  'R$ 10,00 e R$ 10,01 ⇒ ticket 10,01 (metade para longe de zero)');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,semana,vendas}')::int = 5
  and (:'m'::jsonb #>> '{periodos,semana,ticket}')::numeric = 24.00,
  'Esta semana: 5 vendas, R$ 120,01 ⇒ ticket 24,00');

rollback to savepoint vis32;

-- Sem venda nenhuma: semana de 30/11, lida na quarta 02/12.
select pg_temp.movimento('2026-12-02T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere(jsonb_typeof(:'m'::jsonb #> '{periodos,hoje,ticket}') = 'null'
  and jsonb_typeof(:'m'::jsonb #> '{periodos,ontem,ticket}') = 'null'
  and jsonb_typeof(:'m'::jsonb #> '{periodos,semana,ticket}') = 'null',
  'sem venda ⇒ ticket NULL nos três períodos');
select pg_temp.confere((:'m'::jsonb #> '{periodos,hoje,faturamento}') = '0'::jsonb
  and (:'m'::jsonb #> '{periodos,ontem,faturamento}') = '0'::jsonb
  and (:'m'::jsonb #> '{periodos,semana,faturamento}') = '0'::jsonb,
  'sem venda ⇒ faturamento 0 (nunca NULL) nos três períodos');

-- ---------------------------------------------------------------------------------------------
-- VIS-33 — mais de 1.000 visitas e mais de 1.000 pedidos pagos ⇒ contagens exatas
-- Semana de 16/11; lido na quarta 18/11 às 15h de Brasília.
-- ---------------------------------------------------------------------------------------------
savepoint vis33;

create temp table ids_probe as select gen_random_uuid() as id from generate_series(1, 1200);
insert into public.store_visits (day, visitor_id) select date '2026-11-16', id from ids_probe;
insert into public.store_visits (day, visitor_id) select date '2026-11-17', id from ids_probe;
insert into public.store_visits (day, visitor_id) select date '2026-11-18', gen_random_uuid() from generate_series(1, 300);

insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                           customer_email, payment_status, created_at, paid_at)
select 'PROBE-71-M' || i, 'pending', 1.00, 1.00, 'pix', 'Probe 71', 'probe71@exemplo.invalid',
       'approved', timestamptz '2026-11-17T12:00:00Z', timestamptz '2026-11-17T12:00:00Z'
  from generate_series(1, 1100) i;

select pg_temp.movimento('2026-11-18T18:00:00Z', :'admin_id') as m \gset
select :'m'::jsonb -> 'periodos' as periodos_vis33;
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 300
  and (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 1200
  and (:'m'::jsonb #>> '{periodos,semana,visitas}')::int = 1500,
  '>1.000 visitas: Hoje 300, Ontem 1.200, Esta semana 1.500 (distintos, sem teto de 1.000)');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 1100
  and (:'m'::jsonb #>> '{periodos,ontem,faturamento}')::numeric = 1100.00
  and (:'m'::jsonb #>> '{periodos,semana,vendas}')::int = 1100,
  '>1.000 pedidos pagos: 1.100 contados, R$ 1.100,00');

-- Só escalares: nenhum texto da resposta é um uuid, e toda medida é número (ou null no ticket).
select pg_temp.confere(not exists (
    select 1 from jsonb_path_query(:'m'::jsonb, 'strict $.**') v
     where jsonb_typeof(v) = 'string' and (v #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-'),
  'a resposta não carrega id nenhum');
select pg_temp.confere(not exists (
    select 1 from jsonb_each(:'m'::jsonb -> 'periodos') p, jsonb_each(p.value) c
     where jsonb_typeof(c.value) not in ('number', 'null')),
  'toda medida dos três períodos é escalar numérico');
select pg_temp.confere((:'m'::jsonb ->> 'production_host') = (public.store_clock() ->> 'production_host'),
  'production_host da leitura = o de store_clock (uma leitura só do host)');
select pg_temp.confere((:'m'::jsonb ->> 'lido_em')::timestamptz = timestamptz '2026-11-18T18:00:00Z',
  'lido_em = o p_agora da leitura');

rollback to savepoint vis33;

rollback;
