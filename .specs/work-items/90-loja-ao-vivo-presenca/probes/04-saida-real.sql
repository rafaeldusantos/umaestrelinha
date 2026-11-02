-- 90 · tarefa 04 · a saída REAL de `store_movement` (como admin, `begin … rollback`), com
-- "Com sacola" e a semana anterior, para o tipo `StoreMovement` ser conferido contra ela (`AD-012`:
-- tipo escrito à mão é afirmação). Lida por `packages/core/src/hooks/__tests__/useStoreMovement.test.ts`.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -X -At -q -v ON_ERROR_STOP=1 \
--   -f 04-saida-real.sql > 04-saida-real.json
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on
\pset format unaligned
begin;
\o /dev/null
\ir ../../../features/83-loja-ao-vivo/probes/_comum.sql
\ir ../../../../supabase/migrations/20261104140000_acessos-com-sacola.sql
delete from public.store_presence_carts;
select pg_temp.contador('2026-09-01T12:00:00Z', null);
update public.store_visit_counter set history_since = '2026-10-01T12:00:00Z' where id;
select pg_temp.visita('90040000-0000-4000-8000-0000000000e1', '2026-10-14T13:00:00Z');
select pg_temp.visita('90040000-0000-4000-8000-0000000000e2', '2026-10-20T13:00:00Z');
select pg_temp.visita('90040000-0000-4000-8000-0000000000e3', '2026-10-21T13:00:00Z');
insert into public.store_presence_carts (day, presence_id, first_cart_at)
values ('2026-10-21', '90041000-0000-4000-8000-0000000000e1', '2026-10-21T13:05:00Z');
\o
select jsonb_pretty(pg_temp.movimento('2026-10-21T18:02:00Z', :'admin_id'));
rollback;
