-- Feature 74 · T10 — probe semântico de `public.atelie_clock` contra o banco local (54442).
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--     -f .specs/features/74-mobile-adm-pedidos/probes/01-relogio.sql
--
-- Mede o ARQUIVO: a função é derrubada e a migration reaplicada dentro da transação, então um
-- mutante injetado no `.sql` é o que roda aqui (um `grant` apagado não ficaria escondido pelo que a
-- aplicação anterior concedeu). Tudo em `begin … rollback`.
--
-- Cada asserção imprime `ok — <o quê>`; uma falha derruba o script com exit ≠ 0.

\set QUIET on
\pset tuples_only on
\pset format unaligned
begin;

drop function if exists public.atelie_clock();
\ir ../../../../supabase/migrations/20261024120000_74-relogio-do-atelie.sql

create function pg_temp.ok(cond boolean, oque text) returns text language plpgsql as $f$
begin
  if cond is not true then raise exception 'FALHOU — %', oque; end if;
  return 'ok — ' || oque;
end $f$;

-- Lê `atelie_clock()` como o papel e o `sub` dados; devolve o SQLSTATE da recusa, ou 'sem erro'.
create function pg_temp.estado(papel text, sub uuid) returns text language plpgsql as $f$
declare v_estado text;
begin
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', sub, 'role', papel)::text, ''), true);
  execute format('set local role %I', papel);
  begin
    perform public.atelie_clock();
    v_estado := 'sem erro';
  exception when others then
    v_estado := sqlstate;
  end;
  reset role;
  return v_estado;
end $f$;

-- Um admin e uma conta sem papel, só desta transação (nunca a conta do seed).
insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-4000-a000-000000000741', 'probe74-admin@exemplo.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-4000-a000-000000000742', 'probe74-cliente@exemplo.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-000000000741', 'admin');

-- 1. O admin recebe `lido_em`, e ele é o instante desta transação (now()).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000741","role":"authenticated"}', true) \gset
select public.atelie_clock()::text as relogio \gset
reset role;
select pg_temp.ok((:'relogio')::jsonb ? 'lido_em', 'admin recebe a chave lido_em');
select pg_temp.ok(((:'relogio')::jsonb ->> 'lido_em')::timestamptz = now(), 'lido_em é o now() do banco');
select pg_temp.ok((select count(*) from jsonb_object_keys((:'relogio')::jsonb)) = 1, 'a resposta tem só a chave lido_em');

-- 2. A conta autenticada SEM papel admin é recusada com 42501.
select pg_temp.ok(pg_temp.estado('authenticated', '00000000-0000-4000-a000-000000000742') = '42501',
                  'conta sem papel admin ⇒ 42501');
-- 3. Sem `sub` (auth.uid() nulo) também.
select pg_temp.ok(pg_temp.estado('authenticated', null) = '42501', 'authenticated sem sub ⇒ 42501');
-- 4. `anon` nem chega ao corpo: `execute` revogado ⇒ permission denied (42501).
select pg_temp.ok(pg_temp.estado('anon', null) = '42501', 'anon ⇒ 42501 (permission denied)');
select pg_temp.ok(not has_function_privilege('anon', 'public.atelie_clock()', 'execute'), 'anon sem execute');
select pg_temp.ok(has_function_privilege('authenticated', 'public.atelie_clock()', 'execute'), 'authenticated com execute');

-- 5. A forma: security definer, stable, search_path vazio.
select pg_temp.ok(p.prosecdef and p.provolatile = 's' and p.proconfig @> array['search_path=""'],
                  'security definer, stable e search_path = ''''')
from pg_proc p where p.oid = 'public.atelie_clock()'::regprocedure;

rollback;
