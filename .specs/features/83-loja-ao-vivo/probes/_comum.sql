-- Feature 83 · preâmbulo comum dos probes (incluído por \ir, DENTRO do `begin` de cada probe).
--
-- Molde: `.specs/features/71-visitas-unicas-no-dashboard/probes/_comum.sql`.
--
-- 1. Derruba os objetos da 71 e da 83 (se existirem) e aplica as DUAS migrations do disco, na ordem,
--    dentro da transação do probe: o probe mede os ARQUIVOS, e não o banco que uma aplicação
--    anterior deixou (um `grant` apagado da migration não revogaria o que já foi concedido). O
--    `rollback` do fim desfaz tudo, inclusive a derrubada.
-- 2. Define em `pg_temp` (somem com a sessão):
--    - confere(ok, o_que): reprova o probe com a frase, ou anuncia o `ok`;
--    - movimento(p_agora, p_sub): lê `store_movement` COMO `authenticated` com o `sub` dado;
--    - recusado(papel, p_sub, comando): executa como o papel e devolve `true` só se veio 42501;
--    - visita(id, instante): `record_store_visit` e devolve o desfecho;
--    - contador(inicio, teto): o singleton do contador num estado conhecido;
--    - pedido(…): um pedido de fixtura (molde de `vendas.sql` da 71).
-- 3. Lê o id do admin e o de uma conta SEM papel (nunca cravados) para `:admin_id` e `:cliente_id`.

drop function if exists public.store_movement(timestamptz);
drop function if exists public.store_clock(timestamptz);
drop function if exists public.record_store_visit(uuid, timestamptz);
drop function if exists public.prune_store_visits(date);
drop function if exists public.store_production_host();
drop function if exists public.store_hour(timestamptz);
drop function if exists public.store_week_start(date);
drop function if exists public.store_day_start(date);
drop function if exists public.store_day(timestamptz);
drop function if exists public.store_time_zone();
drop table if exists public.store_visit_counter;
drop table if exists public.store_visits;

\ir ../../../../supabase/migrations/20261021120000_71-visitas-unicas.sql
\ir ../../../../supabase/migrations/20261029120000_83-loja-ao-vivo.sql

create function pg_temp.confere(ok boolean, o_que text) returns void
language plpgsql as $f$
begin
  if ok is not true then
    raise exception 'PROBE FALHOU: %', o_que;
  end if;
  raise notice 'ok — %', o_que;
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

create function pg_temp.visita(p_id uuid, p_agora timestamptz) returns text
language sql as $f$
  select public.record_store_visit(p_id, p_agora) ->> 'desfecho'
$f$;

create function pg_temp.contador(p_inicio timestamptz, p_teto date) returns void
language sql as $f$
  delete from public.store_visit_counter;
  insert into public.store_visit_counter (id, started_at, last_recorded_at, capped_day)
  values (true, p_inicio, p_inicio, p_teto);
$f$;

create function pg_temp.pedido(p_num text, p_total numeric, p_pago timestamptz) returns void
language sql as $f$
  insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                             customer_email, payment_status, created_at, paid_at)
  values (p_num, 'pending', p_total, p_total, 'pix', 'Probe 83', 'probe83@exemplo.invalid',
          'approved', p_pago - interval '1 minute', p_pago)
$f$;

select u.id as admin_id
  from auth.users u
  join public.user_roles r on r.user_id = u.id
 where r.role = 'admin'
 order by u.created_at
 limit 1 \gset

select u.id as cliente_id
  from auth.users u
 where not exists (select 1 from public.user_roles r where r.user_id = u.id)
 order by u.created_at
 limit 1 \gset
