-- Feature 71 · probe VIS-27, VIS-44 — o teto de 5.000 linhas num dia, e o dia anotado.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f teto.sql
-- As 5.000 linhas entram PELA gravação (como entrariam de verdade), em begin … rollback.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

select pg_temp.confere((select count(*) from public.store_visits where day = date '2026-10-21') = 0,
  'nenhuma visita em 21/10 antes da fixtura');

-- A chamada fica na LISTA do select (uma por linha). Num `lateral` sem referência à série, o
-- planejador a avalia UMA vez e repete o resultado — o probe contaria 5.000 "gravadas" com 1 linha.
select count(*) as gravadas
  from (select public.record_store_visit(gen_random_uuid(), '2026-10-21T15:00:00Z') as r
          from generate_series(1, 5000) i) x
 where x.r ->> 'desfecho' = 'gravada' \gset
select pg_temp.confere(:gravadas = 5000
  and (select count(*) from public.store_visits where day = date '2026-10-21') = 5000,
  '5.000 gravações em 21/10, e 5.000 linhas na tabela');

select public.record_store_visit('eeeeeeee-0000-4000-8000-000000000005', '2026-10-21T16:00:00Z') as r \gset
select :'r'::jsonb as resposta_no_teto;
select pg_temp.confere((:'r'::jsonb ->> 'desfecho') = 'teto', 'a 5.001ª ⇒ desfecho `teto`');
select pg_temp.confere((:'r'::jsonb ->> 'dia') = '2026-10-21' and jsonb_typeof(:'r'::jsonb -> 'ate') = 'number',
  'o teto ainda devolve `dia` e `ate`');
select pg_temp.confere((select count(*) from public.store_visits where day = date '2026-10-21') = 5000,
  'nada foi gravado além das 5.000');
select pg_temp.confere(not exists (select 1 from public.store_visits where visitor_id = 'eeeeeeee-0000-4000-8000-000000000005'),
  'o id recusado pelo teto não está na tabela');
select pg_temp.confere((select capped_day from public.store_visit_counter where id) = date '2026-10-21',
  '`capped_day` = 21/10 em store_visit_counter');

-- A leitura: o teto aparece enquanto 21/10 está no período aberto, e some depois.
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'teto_dia') = '2026-10-21', 'lido em 21/10 ⇒ teto_dia 21/10 (Hoje e Esta semana)');
select pg_temp.movimento('2026-10-22T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'teto_dia') = '2026-10-21', 'lido em 22/10 ⇒ teto_dia 21/10 (agora Ontem, e Esta semana)');
select pg_temp.movimento('2026-10-28T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere(jsonb_typeof(:'m'::jsonb -> 'teto_dia') = 'null', 'lido em 28/10 ⇒ teto_dia null (fora do período aberto)');

rollback;
