-- Feature 71 · probe VIS-14/VIS-16/VIS-27 — o prazo que `store_clock` devolve (G9 da verificação r3).
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f relogio.sql
-- Tudo em begin … rollback: nada fica no banco.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

-- A sessão em UTC (o padrão do local e do hospedado).
set local timezone = 'UTC';

-- 15h de Brasília de 21/10.
select public.store_clock('2026-10-21T18:00:00Z') as c \gset
select pg_temp.confere((:'c'::jsonb ->> 'dia') = '2026-10-21', 'store_clock às 15h de 21/10 (Brasília) ⇒ dia 21/10');
select pg_temp.confere(jsonb_typeof(:'c'::jsonb -> 'ate') = 'number' and (:'c'::jsonb ->> 'ate') !~ '\.'
  and jsonb_typeof(:'c'::jsonb -> 'agora') = 'number' and (:'c'::jsonb ->> 'agora') !~ '\.',
  'store_clock: `ate` e `agora` são INTEIROS no JSON');
select pg_temp.confere((:'c'::jsonb ->> 'ate')::bigint = (extract(epoch from timestamptz '2026-10-22T03:00:00Z') * 1000)::bigint,
  'store_clock: `ate` = a próxima 00:00 de Brasília (22/10 03:00Z), em ms');
select pg_temp.confere((:'c'::jsonb ->> 'agora')::bigint = (extract(epoch from timestamptz '2026-10-21T18:00:00Z') * 1000)::bigint,
  'store_clock: `agora` = o instante do servidor, em ms');

-- 22h30 de Brasília de 21/10 (01:30Z de 22/10): o dia em UTC já é o seguinte.
select public.store_clock('2026-10-22T01:30:00Z') as c \gset
select pg_temp.confere((:'c'::jsonb ->> 'dia') = '2026-10-21'
  and (:'c'::jsonb ->> 'ate')::bigint = (extract(epoch from timestamptz '2026-10-22T03:00:00Z') * 1000)::bigint,
  'store_clock às 22h30 de 21/10 (Brasília) ⇒ dia 21/10 e `ate` 22/10 03:00Z — nunca o dia em UTC');

-- O mesmo prazo que a gravação devolve no mesmo instante.
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000c1', '2026-10-21T18:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'ate') = (:'c'::jsonb ->> 'ate'),
  'o `ate` do relógio é o MESMO da gravação (22/10 03:00Z)');

rollback;
