-- Feature 71 · probe VIS-03 — o dia de Brasília e a segunda-feira, decididos no banco.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f dia.sql
-- Tudo em begin … rollback: nada fica no banco.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

-- O fuso da SESSÃO não pode mudar a resposta: o probe roda num fuso que não é o da loja.
set local timezone = 'Asia/Tokyo';

select pg_temp.confere(public.store_day('2026-10-21T02:59:59.900Z') = date '2026-10-20',
  '2026-10-21T02:59:59.900Z ⇒ 20/10');
select pg_temp.confere(public.store_day('2026-10-21T03:00:00Z') = date '2026-10-21',
  '2026-10-21T03:00:00Z ⇒ 21/10');
select pg_temp.confere(public.store_day('2026-10-19T02:30:00Z') = date '2026-10-18',
  'domingo 2026-10-19T02:30:00Z (23h30 em Brasília) ⇒ 18/10');
select pg_temp.confere(public.store_week_start(public.store_day('2026-10-19T02:30:00Z')) = date '2026-10-12',
  'o domingo 18/10 está na semana iniciada em 12/10');
select pg_temp.confere(public.store_week_start(public.store_day('2026-10-19T02:30:00Z')) <> date '2026-10-19',
  '… e NÃO na de 19/10');
select pg_temp.confere(public.store_week_start(date '2026-10-19') = date '2026-10-19',
  'numa segunda-feira, a semana começa nela mesma');
select pg_temp.confere(public.store_day_start(date '2026-10-21') = timestamptz '2026-10-21T03:00:00Z',
  'store_day_start(21/10) = 2026-10-21T03:00:00Z (a inversa da mesma régua)');

-- O mesmo, pela leitura do painel: o `hoje`, o `ontem` e o `inicio_semana` vêm do banco.
select pg_temp.movimento('2026-10-19T02:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'hoje') = '2026-10-18'
  and (:'m'::jsonb ->> 'ontem') = '2026-10-17'
  and (:'m'::jsonb ->> 'inicio_semana') = '2026-10-12',
  'store_movement(domingo 23h30) ⇒ hoje 18/10, ontem 17/10, semana de 12/10');
select pg_temp.confere((:'m'::jsonb ->> 'expira_em')::timestamptz = timestamptz '2026-10-19T03:00:00Z',
  'expira_em = a próxima 00:00 de Brasília');

select :'m'::jsonb - 'periodos' as resposta_sem_periodos;

rollback;
