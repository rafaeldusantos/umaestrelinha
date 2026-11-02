-- Work Item 90 · tarefa 01 — a gravação da presença contra o banco local.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/work-items/90-loja-ao-vivo-presenca/probes/01-presenca.sql
--
-- `begin … rollback`: derruba os objetos da presença, reaplica a migration DO DISCO (mede o arquivo,
-- não o banco), grava fixturas e desfaz tudo. Saída esperada: só linhas `ok —`.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

drop function if exists public.record_store_presence(uuid, text, text, integer, text, text, text, timestamptz);
drop function if exists public.prune_store_presence(timestamptz);
drop function if exists public.store_canonical_host(text);
drop table if exists public.store_presence, public.store_presence_minutes, public.store_presence_carts;
\ir ../../../../supabase/migrations/20261104120000_presenca-na-loja.sql

create function pg_temp.confere(ok boolean, msg text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FALHOU — %', msg; end if;
  raise notice 'ok — %', msg;
end $$;

-- o host de produção, só nesta transação
insert into public.store_settings (key, value) values ('analytics', '{"production_host":"umaestrelinha.com.br"}')
on conflict (key) do update set value = public.store_settings.value || '{"production_host":"umaestrelinha.com.br"}';

create function pg_temp.pulso(p_id uuid, p_page text, p_slug text, p_cart int, p_agora timestamptz,
                              p_host text default 'www.umaestrelinha.com.br') returns text language sql as $$
  select public.record_store_presence(p_id, p_page, p_slug, p_cart, 'instagram', 'celular', p_host, p_agora)->>'desfecho'
$$;

-- nenhuma coluna de IP, UA, referrer ou URL
select pg_temp.confere(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'store_presence')
  = array['presence_id','last_seen_at','page_kind','product_id','cart_items','source','device'],
  'store_presence = {presence_id, last_seen_at, page_kind, product_id, cart_items, source, device}');
select pg_temp.confere(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'store_presence_minutes') = array['minute','presence_id'],
  'store_presence_minutes = {minute, presence_id}');
select pg_temp.confere(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'store_presence_carts') = array['day','presence_id','first_cart_at'],
  'store_presence_carts = {day, presence_id, first_cart_at}');

-- o host canônico: os MESMOS casos que hostCanonicoPareado.test.ts executa no TypeScript
select pg_temp.confere(public.store_canonical_host('UmaEstrelinha.com.br') = 'umaestrelinha.com.br', 'host canônico: [UmaEstrelinha.com.br] ⇒ [umaestrelinha.com.br]');
select pg_temp.confere(public.store_canonical_host('www.umaestrelinha.com.br:443') = 'umaestrelinha.com.br', 'host canônico: [www.umaestrelinha.com.br:443] ⇒ [umaestrelinha.com.br]');
select pg_temp.confere(public.store_canonical_host('umaestrelinha.com.br.') = 'umaestrelinha.com.br', 'host canônico: [umaestrelinha.com.br.] ⇒ [umaestrelinha.com.br]');
select pg_temp.confere(public.store_canonical_host('  WWW.Umaestrelinha.com.br  ') = 'umaestrelinha.com.br', 'host canônico: [  WWW.Umaestrelinha.com.br  ] ⇒ [umaestrelinha.com.br]');
select pg_temp.confere(public.store_canonical_host('localhost:8082') = 'localhost', 'host canônico: [localhost:8082] ⇒ [localhost]');
select pg_temp.confere(public.store_canonical_host('x.com:') = 'x.com', 'host canônico: [x.com:] ⇒ [x.com]');
select pg_temp.confere(public.store_canonical_host('x.com:abc') = 'x.com', 'host canônico: [x.com:abc] ⇒ [x.com]');
select pg_temp.confere(public.store_canonical_host('a:b:c') = 'a:b', 'host canônico: [a:b:c] ⇒ [a:b]');
select pg_temp.confere(public.store_canonical_host('[::1]:8080') = '[::1]:8080', 'host canônico: [[::1]:8080] ⇒ [[::1]:8080]');
select pg_temp.confere(public.store_canonical_host('www.') = 'www', 'host canônico: [www.] ⇒ [www]');
select pg_temp.confere(public.store_canonical_host('') = '', 'host canônico: [] ⇒ []');
select pg_temp.confere(public.store_canonical_host(null) = '', 'host canônico: nulo ⇒ vazio');

delete from public.store_presence; delete from public.store_presence_minutes; delete from public.store_presence_carts;

-- grava: joia resolvida pelo slug, faixas, sacola
select slug as slug_real, id as id_real from public.products where slug is not null limit 1 \gset
select pg_temp.confere(pg_temp.pulso('90000000-0000-4000-8000-000000000001', 'joia', :'slug_real', 2, '2026-10-21T15:00:10Z') = 'gravada',
  'batida no host de produção (com www.) ⇒ gravada');
select pg_temp.confere((select product_id = :'id_real'::uuid and page_kind = 'joia' and cart_items = 2
                          and source = 'instagram' and device = 'celular'
                        from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000001'),
  'a presença guarda a joia (id resolvido do slug), a sacola, a origem e o aparelho');
select pg_temp.pulso('90000000-0000-4000-8000-000000000005', 'joia', 'nao-existe-este-slug', 0, '2026-10-21T15:00:10Z') as d \gset
select pg_temp.confere(:'d' = 'gravada'
  and (select product_id is null from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000005'),
  'slug que não existe ⇒ grava sem joia');

-- o minuto não conta a mesma pessoa duas vezes
select pg_temp.pulso('90000000-0000-4000-8000-000000000001', 'lista', null, 2, '2026-10-21T15:00:50Z');
select pg_temp.confere((select count(*) from public.store_presence_minutes where presence_id = '90000000-0000-4000-8000-000000000001') = 1,
  'duas batidas no mesmo minuto ⇒ uma linha no registro por minuto');
select pg_temp.confere((select count(*) from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000001') = 1
  and (select page_kind from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000001') = 'lista',
  'a presença é uma linha por id, com o último tipo de página');

-- a marca diária é única por (dia, id) e guarda a hora da PRIMEIRA sacola
select pg_temp.pulso('90000000-0000-4000-8000-000000000001', 'sacola', null, 3, '2026-10-21T15:20:00Z');
select pg_temp.confere((select count(*) from public.store_presence_carts where presence_id = '90000000-0000-4000-8000-000000000001') = 1
  and (select first_cart_at from public.store_presence_carts where presence_id = '90000000-0000-4000-8000-000000000001') = '2026-10-21T15:00:10Z',
  'a marca diária é uma por (dia, id) e fica com a hora da primeira sacola');
select pg_temp.pulso('90000000-0000-4000-8000-000000000002', 'lista', null, 0, '2026-10-21T15:20:00Z') as d \gset
select pg_temp.confere(:'d' = 'gravada'
  and exists (select 1 from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000002')
  and not exists (select 1 from public.store_presence_carts where presence_id = '90000000-0000-4000-8000-000000000002'),
  'sacola vazia não gera marca');

-- fora do host de produção não grava
select pg_temp.pulso('90000000-0000-4000-8000-000000000003', 'lista', null, 0, '2026-10-21T15:20:00Z', 'umaestrelinha-store-five.vercel.app') as d \gset
select pg_temp.confere(:'d' = 'interno'
  and not exists (select 1 from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000003'),
  'host interno ⇒ interno, nada gravado');
select pg_temp.confere(pg_temp.pulso('90000000-0000-4000-8000-000000000003', 'lista', null, 0, '2026-10-21T15:20:00Z', '') = 'interno',
  'host vazio ⇒ interno');

-- poda: 30 min da presença, 1 hora do minuto, 14 dias da marca
insert into public.store_presence_carts values (date '2026-10-06', '90000000-0000-4000-8000-0000000000aa', '2026-10-06T15:00:00Z');
insert into public.store_presence_carts values (date '2026-10-07', '90000000-0000-4000-8000-0000000000ab', '2026-10-07T15:00:00Z');
select pg_temp.pulso('90000000-0000-4000-8000-000000000004', 'outra', null, 0, '2026-10-21T15:45:00Z');
select pg_temp.confere(not exists (select 1 from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000005')
  and exists (select 1 from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000001'),
  'presença sem batida há mais de 30 min é podada; a das 15:00 sai às 15:45, a das 15:20 fica');
select pg_temp.confere(not exists (select 1 from public.store_presence_minutes where minute < '2026-10-21T14:45:00Z')
  and exists (select 1 from public.store_presence_minutes where minute = '2026-10-21T15:00:00Z'),
  'o registro por minuto vive até 1 hora');
select pg_temp.pulso('90000000-0000-4000-8000-000000000004', 'outra', null, 0, '2026-10-21T16:01:00Z');
select pg_temp.confere(not exists (select 1 from public.store_presence_minutes where minute = '2026-10-21T15:00:00Z'),
  'o minuto de mais de 1 hora atrás é podado');
select pg_temp.confere(not exists (select 1 from public.store_presence_carts where day = '2026-10-06')
  and exists (select 1 from public.store_presence_carts where day = '2026-10-07'),
  'a marca de sacola fica 14 dias (07/10 fica em 21/10; 06/10 sai)');

-- teto de 5.000 linhas
insert into public.store_presence (presence_id, last_seen_at, page_kind, cart_items, source, device)
select gen_random_uuid(), '2026-10-21T16:01:00Z', 'outra', 0, 'direto', 'computador'
from generate_series(1, 5000 - (select count(*) from public.store_presence)::int);
select pg_temp.pulso('90000000-0000-4000-8000-000000000009', 'lista', null, 0, '2026-10-21T16:01:30Z') as d \gset
select pg_temp.confere(:'d' = 'teto'
  and not exists (select 1 from public.store_presence where presence_id = '90000000-0000-4000-8000-000000000009'),
  'com 5.000 presenças, um id novo ⇒ teto, nada gravado');
select pg_temp.confere(pg_temp.pulso('90000000-0000-4000-8000-000000000004', 'lista', null, 0, '2026-10-21T16:01:30Z') = 'gravada',
  'no teto, quem já está presente continua batendo');

-- a resposta traz { ate, agora } do servidor
select pg_temp.confere(
  (select r->>'ate' = '1792724400000' and r->>'agora' = '1792681200000'
     from (select public.record_store_presence('90000000-0000-4000-8000-000000000004', 'outra', null, 0, 'direto', 'computador',
             'umaestrelinha.com.br', '2026-10-22T15:00:00Z') r) x),
  'ate = a próxima 00:00 de Brasília, agora = o instante do servidor, em ms');

-- só service_role executa; ninguém lê as tabelas
do $$
declare papel text;
begin
  foreach papel in array array['anon', 'authenticated'] loop
    begin
      execute format('set local role %I', papel);
      perform public.record_store_presence('90000000-0000-4000-8000-000000000001', 'outra', null, 0, 'direto', 'celular', 'umaestrelinha.com.br');
      raise exception 'FALHOU — % executou record_store_presence', papel;
    exception when insufficient_privilege then
      reset role;
      raise notice 'ok — % não executa record_store_presence (42501)', papel;
    end;
    begin
      execute format('set local role %I', papel);
      perform 1 from public.store_presence limit 1;
      raise exception 'FALHOU — % leu store_presence', papel;
    exception when insufficient_privilege then
      reset role;
      raise notice 'ok — % não lê store_presence (42501)', papel;
    end;
  end loop;
end $$;
set local role service_role;
select pg_temp.confere(public.record_store_presence('90000000-0000-4000-8000-000000000004', 'outra', null, 0, 'direto', 'celular',
  'umaestrelinha.com.br', '2026-10-21T16:02:00Z')->>'desfecho' = 'gravada', 'service_role executa');
reset role;

select pg_temp.confere((select count(*) from pg_policies where tablename in ('store_presence','store_presence_minutes','store_presence_carts')) = 0,
  'nenhuma policy nas três tabelas');
select pg_temp.confere(exists (select 1 from cron.job where jobname = 'prune-store-presence'), 'o job de poda existe (pg_cron local)');

rollback;
