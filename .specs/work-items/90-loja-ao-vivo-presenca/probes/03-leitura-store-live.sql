-- Work Item 90 · tarefa 02 — a leitura `store_live` contra o banco local.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/work-items/90-loja-ao-vivo-presenca/probes/03-leitura-store-live.sql
--
-- `begin … rollback`: derruba `store_live`, reaplica a migration DO DISCO (mede o arquivo, não o
-- banco), semeia presença, minutos e pedidos num instante de 2030 (nenhum dado real ali) e desfaz
-- tudo. Saída esperada: só linhas `ok —`.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

drop function if exists public.store_live(timestamptz);
\ir ../../../../supabase/migrations/20261104130000_presenca-leitura.sql

create function pg_temp.confere(ok boolean, msg text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FALHOU — %', msg; end if;
  raise notice 'ok — %', msg;
end $$;

-- Um admin só desta transação.
insert into auth.users (id, email, aud, role, instance_id)
values ('00000000-0000-4000-a000-000000000090', 'probe90@exemplo.invalid', 'authenticated', 'authenticated',
        '00000000-0000-0000-0000-000000000000');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-000000000090', 'admin');

delete from public.store_presence; delete from public.store_presence_minutes; delete from public.store_presence_carts;

-- Três joias reais, em ordem de nome (X < Z), e uma quarta para a que sai da janela.
select id as x, name as x_nome, images::text as x_imagens from public.products order by name, id limit 1 \gset
select id as z from public.products order by name, id offset 1 limit 1 \gset
select id as y from public.products order by name, id offset 2 limit 1 \gset

-- Agora = 2030-03-04 15:00:30 UTC. A janela é o minuto 15:00 e os quatro anteriores (14:56..15:00).
--  A checkout, sacola 2 (instagram, celular)       — presente, conta no checkout
--  B joia X, sacola 1 (instagram, celular)          — presente, conta na sacola
--  C joia X, sem sacola, 14:56:20 (direto, celular) — presente na borda (minuto 14:56)
--  D joia Y, 14:55:50                                — FORA (minuto 14:55)
--  E guia (google, computador)                       — presente
--  H joia Z (direto, tablet)                         — presente
--  F batida DEPOIS do instante lido (15:10)          — fora
--  G 14:40, ainda na tabela (a poda não a tirou)     — fora: a janela é recortada na leitura
insert into public.store_presence (presence_id, last_seen_at, page_kind, product_id, cart_items, source, device) values
  ('90020000-0000-4000-8000-00000000000a', '2030-03-04T15:00:10Z', 'checkout', null, 2, 'instagram', 'celular'),
  ('90020000-0000-4000-8000-00000000000b', '2030-03-04T14:59:40Z', 'joia', :'x', 1, 'instagram', 'celular'),
  ('90020000-0000-4000-8000-00000000000c', '2030-03-04T14:56:20Z', 'joia', :'x', 0, 'direto', 'celular'),
  ('90020000-0000-4000-8000-00000000000d', '2030-03-04T14:55:50Z', 'joia', :'y', 0, 'whatsapp', 'celular'),
  ('90020000-0000-4000-8000-00000000000e', '2030-03-04T15:00:20Z', 'guia', null, 0, 'google', 'computador'),
  ('90020000-0000-4000-8000-0000000000a1', '2030-03-04T15:00:00Z', 'joia', :'z', 0, 'direto', 'tablet'),
  ('90020000-0000-4000-8000-00000000000f', '2030-03-04T15:10:00Z', 'lista', null, 0, 'outros', 'celular'),
  ('90020000-0000-4000-8000-0000000000b1', '2030-03-04T14:40:00Z', 'lista', null, 0, 'outros', 'celular');
insert into public.store_presence_minutes (minute, presence_id) values
  ('2030-03-04T14:58:00Z', '90020000-0000-4000-8000-00000000000a'),
  ('2030-03-04T14:59:00Z', '90020000-0000-4000-8000-00000000000a'),
  ('2030-03-04T15:00:00Z', '90020000-0000-4000-8000-00000000000a'),
  ('2030-03-04T14:59:00Z', '90020000-0000-4000-8000-00000000000b'),
  ('2030-03-04T14:56:00Z', '90020000-0000-4000-8000-00000000000c'),
  ('2030-03-04T14:55:00Z', '90020000-0000-4000-8000-00000000000d'),
  ('2030-03-04T15:00:00Z', '90020000-0000-4000-8000-00000000000e'),
  ('2030-03-04T15:00:00Z', '90020000-0000-4000-8000-0000000000a1'),
  ('2030-03-04T15:10:00Z', '90020000-0000-4000-8000-00000000000f'),
  ('2030-03-04T14:40:00Z', '90020000-0000-4000-8000-0000000000b1');

-- Pedidos: só o primeiro conta (pago, não cancelado, nos 30 min até o instante lido).
insert into public.orders (subtotal, total, payment_method, customer_name, customer_email, payment_status, status, paid_at) values
  (10, 10, 'pix', 'Probe', 'p1@exemplo.invalid', 'approved', 'paid', '2030-03-04T14:31:00Z'),
  (10, 10, 'pix', 'Probe', 'p2@exemplo.invalid', 'approved', 'paid', '2030-03-04T14:30:20Z'),
  (10, 10, 'pix', 'Probe', 'p3@exemplo.invalid', 'approved', 'cancelled', '2030-03-04T14:50:00Z'),
  (10, 10, 'pix', 'Probe', 'p4@exemplo.invalid', 'pending', 'pending', '2030-03-04T14:50:00Z'),
  (10, 10, 'pix', 'Probe', 'p5@exemplo.invalid', 'approved', 'paid', '2030-03-04T15:05:00Z');

-- Loja medida desde um instante conhecido.
delete from public.store_visit_counter;
insert into public.store_visit_counter (id, started_at, last_recorded_at) values (true, '2030-03-01T12:00:00Z', '2030-03-04T14:00:00Z');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000090","role":"authenticated"}', true) \gset
select public.store_live('2030-03-04T15:00:30Z')::text as l \gset
reset role;

select pg_temp.confere(
  (select array_agg(k order by k) from jsonb_object_keys(:'l'::jsonb) k)::text
    = '{agora,aparelho,compraram_30min,contagem_desde,guia,janela_min,joias,lido_em,minutos,origens,production_host}',
  'as chaves de topo do contrato');
select pg_temp.confere((:'l'::jsonb->>'janela_min')::int = 5, 'janela_min = 5 (LIVE_WINDOW_MIN)');
select pg_temp.confere((:'l'::jsonb->>'lido_em')::timestamptz = '2030-03-04T15:00:30Z', 'lido_em = o instante do servidor');
select pg_temp.confere(:'l'::jsonb->'agora' = '{"total":5,"olhando":3,"sacola":1,"checkout":1}'::jsonb,
  'agora: 5 na janela de 5 min (borda 14:56 dentro, 14:55 fora, batida futura e a antiga fora), sem poda');
select pg_temp.confere(
  (select (a->>'olhando')::int + (a->>'sacola')::int + (a->>'checkout')::int = (a->>'total')::int from (select :'l'::jsonb->'agora' a) x),
  'o funil soma o total');
select pg_temp.confere((:'l'::jsonb->'minutos'->>29)::int = (:'l'::jsonb->'agora'->>'total')::int,
  'a barra de agora é igual ao total');
select pg_temp.confere(jsonb_array_length(:'l'::jsonb->'minutos') = 30, '30 barras');
select pg_temp.confere((:'l'::jsonb->'minutos'->>28)::int = 4, 'a barra de 14:59 conta pela janela dela (14:55..14:59): A, B, C e D');
select pg_temp.confere((:'l'::jsonb->'minutos'->>25)::int = 2, 'a barra de 14:56: C e D');
select pg_temp.confere((:'l'::jsonb->'minutos'->>24)::int = 1, 'a barra de 14:55: só D');
select pg_temp.confere((:'l'::jsonb->'minutos'->>9)::int = 1 and (:'l'::jsonb->'minutos'->>13)::int = 1
                       and (:'l'::jsonb->'minutos'->>14)::int = 0 and (:'l'::jsonb->'minutos'->>0)::int = 0,
  'a batida de 14:40 conta de 14:40 a 14:44 e não depois');
select pg_temp.confere((:'l'::jsonb->>'compraram_30min')::int = 1,
  'compraram: pago e não cancelado nos últimos 30 min (fora: 30 min e 10 s antes, cancelado, pendente, futuro)');
select pg_temp.confere((:'l'::jsonb->>'guia')::int = 1, 'guia: 1 pessoa');
select pg_temp.confere(
  (select jsonb_agg(jsonb_build_object('id', j->>'id', 'pessoas', (j->>'pessoas')::int)) from jsonb_array_elements(:'l'::jsonb->'joias') j)
    = jsonb_build_array(jsonb_build_object('id', :'x', 'pessoas', 2), jsonb_build_object('id', :'z', 'pessoas', 1)),
  'joias: X com 2, Z com 1, Y (fora da janela) não aparece');
select pg_temp.confere((:'l'::jsonb->'joias'->0->>'nome') = :'x_nome', 'a joia traz o nome');
select pg_temp.confere((:'l'::jsonb->'joias'->0->'imagens') = (:'x_imagens')::jsonb, 'imagens = products.images, como store_overview');
select pg_temp.confere(
  (select array_agg(k order by k) from jsonb_object_keys(:'l'::jsonb->'joias'->0) k)::text = '{id,imagens,nome,pessoas}',
  'as chaves de uma joia');
select pg_temp.confere(:'l'::jsonb->'origens' = '[{"faixa":"instagram","n":2},{"faixa":"google","n":1},{"faixa":"whatsapp","n":0},{"faixa":"direto","n":2},{"faixa":"outros","n":0}]'::jsonb,
  'origens: as cinco faixas em ordem fixa, das mesmas pessoas do total');
select pg_temp.confere(:'l'::jsonb->'aparelho' = '{"celular":3,"computador":1,"tablet":1}'::jsonb, 'aparelho: das mesmas pessoas do total');
select pg_temp.confere((:'l'::jsonb->>'contagem_desde')::timestamptz = '2030-03-01T12:00:00Z', 'contagem_desde = o início do contador');

-- Até 5 joias, mais pessoas primeiro e empate por nome.
delete from public.store_presence; delete from public.store_presence_minutes;
insert into public.store_presence (presence_id, last_seen_at, page_kind, product_id, cart_items, source, device)
select ('90020000-0000-4000-8000-0000000002' || lpad(n::text, 2, '0'))::uuid, '2030-03-04T15:20:00Z', 'joia', p.id, 0, 'direto', 'celular'
from (select id, row_number() over (order by name, id) as n from public.products order by name, id limit 6) p;
insert into public.store_presence (presence_id, last_seen_at, page_kind, product_id, cart_items, source, device)
select '90020000-0000-4000-8000-000000000299', '2030-03-04T15:20:00Z', 'joia', id, 0, 'direto', 'celular'
from public.products order by name, id offset 5 limit 1;
set local role authenticated;
select public.store_live('2030-03-04T15:20:30Z')::text as l2 \gset
reset role;
select id as sexta from public.products order by name, id offset 5 limit 1 \gset
select pg_temp.confere(jsonb_array_length(:'l2'::jsonb->'joias') = 5, 'no máximo 5 joias');
select pg_temp.confere((:'l2'::jsonb->'joias'->0->>'id') = :'sexta' and (:'l2'::jsonb->'joias'->0->>'pessoas')::int = 2,
  'a joia com mais pessoas vem primeiro, mesmo sendo a última por nome');
select pg_temp.confere(
  (select bool_and(coalesce((a.j->>'nome') <= (b.j->>'nome'), true))
     from jsonb_array_elements(:'l2'::jsonb->'joias') with ordinality a(j, i)
     join jsonb_array_elements(:'l2'::jsonb->'joias') with ordinality b(j, i2) on b.i2 = a.i + 1
    where a.i > 1),
  'empate por nome');

-- Loja ainda não medida: o mesmo sinal de Acessos.
delete from public.store_visit_counter;
set local role authenticated;
select public.store_live('2030-03-04T15:20:30Z')::text as l3 \gset
reset role;
select pg_temp.confere(:'l3'::jsonb ? 'contagem_desde' and (:'l3'::jsonb->'contagem_desde') = 'null'::jsonb,
  'sem contador: contagem_desde nulo');

-- Ninguém na loja: zeros, nunca nulos.
delete from public.store_presence; delete from public.store_presence_minutes;
set local role authenticated;
select public.store_live('2030-03-04T15:20:30Z')::text as l4 \gset
reset role;
select pg_temp.confere(:'l4'::jsonb->'agora' = '{"total":0,"olhando":0,"sacola":0,"checkout":0}'::jsonb
                       and :'l4'::jsonb->'joias' = '[]'::jsonb and (:'l4'::jsonb->>'guia')::int = 0
                       and jsonb_array_length(:'l4'::jsonb->'minutos') = 30,
  'ninguém na loja: zeros, lista vazia e as 30 barras');

-- A recusa.
do $$
begin
  set local role anon;
  begin
    perform public.store_live();
    raise exception 'FALHOU — anon executou';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;
select pg_temp.confere(true, 'anon: sem execute');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-000000000002","role":"authenticated"}', true) \gset
do $$
declare v_estado text;
begin
  begin
    perform public.store_live();
    raise exception 'FALHOU — cliente executou';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate;
    if v_estado <> '42501' then raise exception 'FALHOU — cliente recebeu %', v_estado; end if;
  end;
end $$;
reset role;
select pg_temp.confere(true, 'conta sem papel admin: 42501 do has_role');

rollback;
