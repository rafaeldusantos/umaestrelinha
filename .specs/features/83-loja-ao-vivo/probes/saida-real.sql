-- Feature 83 · a saída REAL de `store_movement` (como admin, `begin … rollback`), para a task 03
-- conferir as chaves do tipo contra ela (`AD-012`: tipo escrito à mão é afirmação).
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -X -At -q -v ON_ERROR_STOP=1 \
--   -f saida-real.sql > saida-real.json
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
\pset format unaligned
begin;
\o /dev/null
\ir _comum.sql
select pg_temp.contador('2026-10-10T12:00:00Z', date '2026-10-20');
select pg_temp.visita('83000000-0000-4000-8000-0000000000e1', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000e2', '2026-10-21T13:00:00Z');
select pg_temp.pedido('PROBE-83-SR', 25.00, '2026-10-21T14:00:00Z');
\o
select jsonb_pretty(pg_temp.movimento('2026-10-21T18:02:00Z', :'admin_id'));
rollback;
