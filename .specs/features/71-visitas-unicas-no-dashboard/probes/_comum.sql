-- Feature 71 · preâmbulo comum dos probes (incluído por \ir, DENTRO do `begin` de cada probe).
--
-- 1. Derruba os objetos da 71 (se existirem) e aplica a migration do zero, dentro da transação do
--    probe — o probe mede o ARQUIVO, igual antes e depois de `supabase migration up --local`, e o
--    `rollback` do fim desfaz tudo (inclusive a derrubada).
-- 2. Define três auxiliares em `pg_temp` (somem com a sessão):
--    - confere(ok, o_que): reprova o probe com a frase, ou anuncia o `ok`;
--    - movimento(p_agora, p_sub): lê `store_movement` COMO `authenticated` com o `sub` dado — como
--      `postgres` puro, `auth.uid()` é nulo e a leitura cairia em 42501;
--    - recusado(papel, p_sub, comando): executa o comando como o papel e devolve `true` só se a
--      recusa veio com 42501.
-- 3. Lê o id do admin do banco (nunca cravado) para `:admin_id`.

-- Parte do ZERO dentro da transação: depois de `migration up --local` os objetos já existem, e um
-- `grant` apagado da migration não revogaria o que a aplicação anterior concedeu — o probe passaria
-- medindo o banco, e não o arquivo (achado do sensor de mutação desta task). O `rollback` devolve
-- tudo como estava.
drop function if exists public.store_movement(timestamptz);
drop function if exists public.store_clock(timestamptz);
drop function if exists public.record_store_visit(uuid, timestamptz);
drop function if exists public.prune_store_visits(date);
drop function if exists public.store_production_host();
drop function if exists public.store_week_start(date);
drop function if exists public.store_day_start(date);
drop function if exists public.store_day(timestamptz);
drop function if exists public.store_time_zone();
drop table if exists public.store_visit_counter;
drop table if exists public.store_visits;

\ir ../../../../supabase/migrations/20261021120000_71-visitas-unicas.sql

create function pg_temp.confere(ok boolean, o_que text) returns void
language plpgsql as $f$
begin
  if ok is not true then
    raise exception 'PROBE FALHOU: %', o_que;
  end if;
  raise notice 'ok: %', o_que;
end
$f$;

create function pg_temp.movimento(p_agora timestamptz, p_sub uuid) returns jsonb
language plpgsql as $f$
declare
  v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  v := public.store_movement(p_agora);
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  return v;
end
$f$;

create function pg_temp.recusado(papel text, p_sub uuid, comando text) returns boolean
language plpgsql as $f$
declare
  v_estado text;
begin
  if p_sub is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', papel)::text, true);
  end if;
  perform set_config('role', papel, true);
  begin
    execute comando;
  exception when others then
    v_estado := sqlstate;
  end;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  return coalesce(v_estado = '42501', false);
end
$f$;

select u.id as admin_id
  from auth.users u
  join public.user_roles r on r.user_id = u.id
 where r.role = 'admin'
 order by u.created_at
 limit 1 \gset
