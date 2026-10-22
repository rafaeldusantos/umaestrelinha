-- Feature 71 · probe VIS-28, VIS-33 — quem alcança o quê.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f papeis.sql
-- `anon` e um `authenticated` NÃO-admin (um `sub` aleatório) recebem 42501 nas duas tabelas e nas
-- cinco funções; o `service_role` executa a gravação e o relógio; o admin lê o movimento.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

select gen_random_uuid() as qualquer_id \gset

-- As duas tabelas, nas quatro operações.
select pg_temp.confere(pg_temp.recusado(p.papel, case when p.papel = 'authenticated' then gen_random_uuid() end, c.comando),
         format('%s recusado (42501): %s', p.papel, c.comando))
  from (values ('anon'), ('authenticated')) p(papel),
       (values
         ('select * from public.store_visits'),
         ('insert into public.store_visits (day, visitor_id) values (date ''2026-10-21'', gen_random_uuid())'),
         ('update public.store_visits set day = day'),
         ('delete from public.store_visits'),
         ('select * from public.store_visit_counter'),
         ('insert into public.store_visit_counter (id, started_at, last_recorded_at) values (true, now(), now())'),
         ('update public.store_visit_counter set capped_day = null'),
         ('delete from public.store_visit_counter'),
         ('select public.record_store_visit(gen_random_uuid())'),
         ('select public.store_clock()'),
         ('select public.prune_store_visits(date ''2999-01-01'')'),
         ('select public.store_movement()'),
         ('select public.store_day(now())'),
         ('select public.store_production_host()')
       ) c(comando);

-- O sensor do auxiliar: um comando que o papel PODE fazer não é contado como recusa.
select pg_temp.confere(not pg_temp.recusado('anon', null, 'select 1'),
  'sensor: `select 1` como anon NÃO é recusa (o auxiliar não aprova tudo)');

-- O service_role executa a gravação e o relógio.
select set_config('role', 'service_role', true);
select public.record_store_visit(:'qualquer_id', '2026-10-21T15:00:00Z') as r \gset
select public.store_clock('2026-10-21T15:00:00Z') as c \gset
select set_config('role', 'postgres', true);
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada', 'service_role executa record_store_visit ⇒ gravada');
select pg_temp.confere((:'c'::jsonb ->> 'dia') = '2026-10-21' and (:'c'::jsonb ? 'production_host'),
  'service_role executa store_clock ⇒ {dia, ate, agora, production_host}');
select :'c'::jsonb as store_clock;

-- O admin lê o movimento.
select pg_temp.confere(pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') ? 'periodos',
  'o admin lê store_movement');

rollback;
