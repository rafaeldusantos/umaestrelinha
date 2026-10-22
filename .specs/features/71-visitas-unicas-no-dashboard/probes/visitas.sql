-- Feature 71 · probe VIS-14, VIS-15, VIS-30 — visitas distintas por período, e a poda.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f visitas.sql
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

-- Contagem zero no período das fixturas antes de começar.
select pg_temp.confere((select count(*) from public.store_visits where day between date '2026-10-05' and date '2026-10-31') = 0,
  'nenhuma visita entre 05/10 e 31/10 antes das fixturas');

-- ---------------------------------------------------------------------------------------------
-- VIS-15 (a): id A em seg/ter/qua, id B só na quarta ⇒ Hoje 2, Ontem 1, Esta semana 2 (e não 4)
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_a;

select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-19T15:00:00Z') as r1 \gset
select pg_temp.confere((:'r1'::jsonb ->> 'desfecho') = 'gravada', 'A na segunda ⇒ gravada');
select pg_temp.confere((:'r1'::jsonb ->> 'dia') = '2026-10-19', 'o dia vem do banco: 2026-10-19');
select pg_temp.confere(jsonb_typeof(:'r1'::jsonb -> 'ate') = 'number' and (:'r1'::jsonb ->> 'ate') !~ '\.'
  and jsonb_typeof(:'r1'::jsonb -> 'agora') = 'number' and (:'r1'::jsonb ->> 'agora') !~ '\.',
  '`ate` e `agora` são INTEIROS no JSON');
select pg_temp.confere((:'r1'::jsonb ->> 'ate')::bigint = (extract(epoch from timestamptz '2026-10-20T03:00:00Z') * 1000)::bigint,
  '`ate` = a próxima 00:00 de Brasília, em ms');
select pg_temp.confere((:'r1'::jsonb ->> 'agora')::bigint = (extract(epoch from timestamptz '2026-10-19T15:00:00Z') * 1000)::bigint,
  '`agora` = o instante do servidor, em ms');

select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-19T20:00:00Z') as r2 \gset
select pg_temp.confere((:'r2'::jsonb ->> 'desfecho') = 'repetida', 'A de novo na segunda ⇒ repetida');

select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-20T15:00:00Z');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-21T15:00:00Z');
select public.record_store_visit('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-21T16:00:00Z');

select pg_temp.confere((select count(*) from public.store_visits where visitor_id = 'aaaaaaaa-0000-4000-8000-000000000001') = 3,
  'A tem UMA linha por dia (3 dias, 4 chamadas)');

select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 2, 'seg/ter/qua: Hoje = 2');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 1, 'seg/ter/qua: Ontem = 1');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,semana,visitas}')::int = 2, 'seg/ter/qua: Esta semana = 2, e NÃO 4');
select :'m'::jsonb -> 'periodos' as periodos_a;

rollback to savepoint fixtura_a;

-- ---------------------------------------------------------------------------------------------
-- VIS-15 (b): id C no domingo 18/10 e na segunda 19/10 ⇒ 1/1/1 (o domingo é da semana anterior)
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_c;

select public.record_store_visit('cccccccc-0000-4000-8000-000000000003', '2026-10-18T15:00:00Z');
select public.record_store_visit('cccccccc-0000-4000-8000-000000000003', '2026-10-19T12:00:00Z');

select pg_temp.movimento('2026-10-19T15:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 1, 'dom/seg: Hoje = 1');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 1, 'dom/seg: Ontem = 1');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,semana,visitas}')::int = 1, 'dom/seg: Esta semana = 1 (o domingo é da semana anterior)');

rollback to savepoint fixtura_c;

-- ---------------------------------------------------------------------------------------------
-- VIS-30: a gravação poda o que tem mais de 7 dias — hoje e os 7 anteriores ficam
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_poda;

insert into public.store_visits (day, visitor_id)
select d::date, gen_random_uuid()
  from generate_series(date '2026-10-05', date '2026-10-21', interval '1 day') d;

select public.record_store_visit('dddddddd-0000-4000-8000-000000000004', '2026-10-21T18:00:00Z');

select pg_temp.confere((select count(*) from public.store_visits where day < date '2026-10-14') = 0,
  'poda: nada com mais de 7 dias (antes de 14/10)');
select pg_temp.confere((select count(distinct day) from public.store_visits where day between date '2026-10-14' and date '2026-10-21') = 8,
  'poda: os 8 dias (14/10 a 21/10) continuam lá');

rollback to savepoint fixtura_poda;

-- ---------------------------------------------------------------------------------------------
-- VIS-30: a leitura com `p_agora` FUTURO não poda o presente
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_futuro;

insert into public.store_visits (day, visitor_id)
select public.store_day(now()) - k, gen_random_uuid()
  from generate_series(0, 7) k;

select pg_temp.movimento('2999-01-01T12:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((select count(*) from public.store_visits where day >= public.store_day(now()) - 7) = 8,
  'store_movement com p_agora em 2999 não apaga os 8 dias do presente');

rollback to savepoint fixtura_futuro;

-- ---------------------------------------------------------------------------------------------
-- VIS-38 / VIS-40 — os dois instantes do contador (conserto G2 da verificação r1)
-- Com UMA gravação, "started_at grava uma vez" e "grava sempre" dão o mesmo valor, e o mesmo vale
-- para "last_recorded_at acompanha a última linha nova" e "fica congelado". DUAS visitas novas e
-- uma repetida separam os quatro mundos (mutantes S19 e S20, que nenhum probe matava).
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_instantes;

select pg_temp.confere(not exists (select 1 from public.store_visit_counter),
  'âncora: o contador nasce vazio (a migration foi reaplicada dentro desta transação)');

select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-10-21T10:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada', 'A às 10h ⇒ gravada');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a2', '2026-10-21T12:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada', 'B às 12h ⇒ gravada');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-10-21T14:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'repetida', 'A de novo às 14h ⇒ repetida');

select pg_temp.confere((select started_at from public.store_visit_counter where id) = timestamptz '2026-10-21T10:00:00Z',
  'started_at = a PRIMEIRA gravação (10h), e não muda com a segunda');
select pg_temp.confere((select last_recorded_at from public.store_visit_counter where id) = timestamptz '2026-10-21T12:00:00Z',
  'last_recorded_at = a última linha NOVA (12h); a repetida das 14h não conta');

select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'contagem_desde')::timestamptz = timestamptz '2026-10-21T10:00:00Z'
  and (:'m'::jsonb ->> 'ultima_visita')::timestamptz = timestamptz '2026-10-21T12:00:00Z',
  'store_movement: contagem_desde = 10h (a primeira), ultima_visita = 12h (a última nova)');

-- `greatest`: uma gravação nova com instante ANTERIOR (o p_agora de um probe, ou relógio do banco
-- que voltou) não puxa last_recorded_at para trás.
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a3', '2026-10-21T11:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada'
  and (select last_recorded_at from public.store_visit_counter where id) = timestamptz '2026-10-21T12:00:00Z'
  and (select started_at from public.store_visit_counter where id) = timestamptz '2026-10-21T10:00:00Z',
  'gravação nova às 11h (anterior à última) ⇒ last_recorded_at continua 12h, started_at continua 10h');

rollback to savepoint fixtura_instantes;

-- ---------------------------------------------------------------------------------------------
-- VIS-33 / VIS-38 / VIS-40 — os dois DIAS do contador entre 21h e 24h de Brasília
-- (conserto G7 da verificação r2; a fixtura `dias-do-contador.sql` do verificador)
-- Às 10h/12h UTC (fixtura acima) o dia de Brasília e o dia em UTC coincidem, e um `::date` cru
-- (`v_inicio::date`, mutantes S24/S25) escreveria o mesmo texto que `store_day`. Aqui os dois
-- instantes caem na faixa em que o dia em UTC é o SEGUINTE ao de Brasília, e a sessão está em UTC
-- (o padrão do banco local e do hospedado), que é onde o `::date` cru decidiria o dia.
-- ---------------------------------------------------------------------------------------------
savepoint fixtura_dias_do_contador;

set local timezone = 'UTC';

select pg_temp.confere(not exists (select 1 from public.store_visit_counter),
  'âncora: o contador nasce vazio (dias do contador)');

-- Primeira visita às 23h59:59 de 20/10 em Brasília (02:59:59Z de 21/10); a última, às 22h30 de
-- 21/10 em Brasília (01:30Z de 22/10).
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000f1', '2026-10-21T02:59:59Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada' and (:'r'::jsonb ->> 'dia') = '2026-10-20',
  'a primeira (02:59:59Z de 21/10) é gravada no dia 20/10 de Brasília');
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000f2', '2026-10-22T01:30:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'gravada' and (:'r'::jsonb ->> 'dia') = '2026-10-21',
  'a última (01:30Z de 22/10) é gravada no dia 21/10 de Brasília');

-- Lido às 00h30 de 22/10 em Brasília (03:30Z): hoje = 22/10, ontem = 21/10.
select pg_temp.movimento('2026-10-22T03:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'hoje') = '2026-10-22' and (:'m'::jsonb ->> 'ontem') = '2026-10-21',
  'âncora: lido às 00h30 de 22/10 (Brasília) ⇒ hoje 22/10, ontem 21/10');
select pg_temp.confere((:'m'::jsonb ->> 'contagem_desde_dia') = '2026-10-20',
  'contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10 (o dia em UTC)');
select pg_temp.confere((:'m'::jsonb ->> 'ultima_visita_dia') = '2026-10-21',
  'ultima_visita_dia = 21/10 (22h30 de Brasília) — "ontem" no painel —, e não 22/10 (o dia em UTC, que o painel escreveria "hoje")');

rollback to savepoint fixtura_dias_do_contador;

rollback;
