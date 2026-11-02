-- 90 · tarefa 04 · probe UC-06/UC-09 (LAV-51) — "Com sacola", a semana anterior e a poda de 14 dias.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -X -v ON_ERROR_STOP=1 \
--   -f .specs/work-items/90-loja-ao-vivo-presenca/probes/04-acessos-com-sacola.sql
--
-- `begin … rollback`: reaproveita o preâmbulo da 83 (derruba os objetos da 71/83 e aplica as duas do
-- disco), lê `store_movement` da 83 sobre as fixturas, e então aplica a migration desta tarefa DO
-- DISCO e lê de novo — `periodos` e as chaves de antes têm de sair idênticos. A marca de sacola
-- (`store_presence_carts`, tarefa 01) não é derrubada: só esvaziada dentro da transação.
--
-- Calendário: HOJE = quarta 21/10/2026, lido às 15h30 de Brasília (18h30Z) ⇒ h = 15.
--   semana = seg 19/10 · semana anterior = seg 12/10 · o mesmo dia da semana anterior = qua 14/10.
\set ON_ERROR_STOP 1
begin;
\ir ../../../features/83-loja-ao-vivo/probes/_comum.sql

delete from public.store_presence_carts;

select pg_temp.confere((select count(*) from public.orders
                         where payment_status = 'approved' and paid_at >= timestamptz '2026-10-12T03:00:00Z'
                           and paid_at < timestamptz '2026-10-22T03:00:00Z') = 0,
  'nenhum pedido pago entre 12/10 e 21/10 antes das fixturas');

-- ---------------------------------------------------------------------------------------------
-- Fixturas
-- ---------------------------------------------------------------------------------------------
select pg_temp.contador('2026-09-01T12:00:00Z', null);

-- Visitas. Semana atual: A, B (seg 19), A(8h), C(14h) (ter 20), B(10h), D(16h) (qua 21, hoje).
-- Semana anterior: P, Q (seg 12), P, V (ter 13), R(9h), S(15h), T(20h) (qua 14), U (qui 15).
insert into public.store_visits (day, visitor_id, first_hour) values
  ('2026-10-19', '90040000-0000-4000-8000-00000000000a', 9),
  ('2026-10-19', '90040000-0000-4000-8000-00000000000b', 11),
  ('2026-10-20', '90040000-0000-4000-8000-00000000000a', 8),
  ('2026-10-20', '90040000-0000-4000-8000-00000000000c', 14),
  ('2026-10-21', '90040000-0000-4000-8000-00000000000b', 10),
  ('2026-10-21', '90040000-0000-4000-8000-00000000000d', 16),
  ('2026-10-12', '90040000-0000-4000-8000-000000000001', 9),
  ('2026-10-12', '90040000-0000-4000-8000-000000000002', 9),
  ('2026-10-13', '90040000-0000-4000-8000-000000000001', 9),
  ('2026-10-13', '90040000-0000-4000-8000-000000000005', 9),
  ('2026-10-14', '90040000-0000-4000-8000-000000000003', 9),
  ('2026-10-14', '90040000-0000-4000-8000-000000000004', 15),
  ('2026-10-14', '90040000-0000-4000-8000-000000000006', 20),
  ('2026-10-15', '90040000-0000-4000-8000-000000000007', 9);

-- A marca de sacola (ids da PRESENÇA, outros que os das visitas).
-- seg 19: 1 · ter 20: 3 (09h, 10h, 17h — mais que as 2 visitas do dia) · qua 21: 11h e 15h10.
-- seg 12: 1 · ter 13: 1 · qua 14: 08h e 16h · qui 15: 1.
insert into public.store_presence_carts (day, presence_id, first_cart_at) values
  ('2026-10-19', '90041000-0000-4000-8000-000000000001', '2026-10-19T15:00:00Z'),
  ('2026-10-20', '90041000-0000-4000-8000-000000000002', '2026-10-20T12:00:00Z'),
  ('2026-10-20', '90041000-0000-4000-8000-000000000003', '2026-10-20T13:00:00Z'),
  ('2026-10-20', '90041000-0000-4000-8000-000000000004', '2026-10-20T20:00:00Z'),
  ('2026-10-21', '90041000-0000-4000-8000-000000000005', '2026-10-21T14:00:00Z'),
  ('2026-10-21', '90041000-0000-4000-8000-000000000006', '2026-10-21T18:10:00Z'),
  ('2026-10-12', '90041000-0000-4000-8000-000000000007', '2026-10-12T15:00:00Z'),
  ('2026-10-13', '90041000-0000-4000-8000-000000000008', '2026-10-13T15:00:00Z'),
  ('2026-10-14', '90041000-0000-4000-8000-000000000009', '2026-10-14T11:00:00Z'),
  ('2026-10-14', '90041000-0000-4000-8000-00000000000a', '2026-10-14T19:00:00Z'),
  ('2026-10-15', '90041000-0000-4000-8000-00000000000b', '2026-10-15T15:00:00Z');

-- Vendas: seg 19 12h · qua 21 10h · qua 21 15h20 (depois do corte) · seg 12 10h · qua 14 14h ·
-- qua 14 15h30 (depois do corte) · qui 15 (fora da semana anterior até o mesmo dia).
select pg_temp.pedido('PROBE-90-04-1', 10.00, '2026-10-19T15:00:00Z');
select pg_temp.pedido('PROBE-90-04-2', 10.00, '2026-10-21T13:00:00Z');
select pg_temp.pedido('PROBE-90-04-3', 10.00, '2026-10-21T18:20:00Z');
select pg_temp.pedido('PROBE-90-04-4', 10.00, '2026-10-12T13:00:00Z');
select pg_temp.pedido('PROBE-90-04-5', 10.00, '2026-10-14T17:00:00Z');
select pg_temp.pedido('PROBE-90-04-6', 10.00, '2026-10-14T18:30:00Z');
select pg_temp.pedido('PROBE-90-04-7', 10.00, '2026-10-15T15:00:00Z');

-- A leitura da 83 (a poda dela, de 8 dias, apagaria a semana anterior: desfeita pelo savepoint).
savepoint leitura_83;
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m83 \gset
rollback to savepoint leitura_83;

-- A migration desta tarefa, do disco.
\ir ../../../../supabase/migrations/20261104140000_acessos-com-sacola.sql

create function pg_temp.historico(p timestamptz) returns void
language sql as $f$
  update public.store_visit_counter set history_since = p where id;
$f$;
select pg_temp.historico('2026-10-01T12:00:00Z');

select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset

-- =============================================================================================
-- periodos e as chaves de antes, idênticos
-- =============================================================================================
select pg_temp.confere((:'m'::jsonb -> 'periodos') = (:'m83'::jsonb -> 'periodos'), 'periodos idêntico ao da 83');
select pg_temp.confere((:'m'::jsonb - 'acessos') = (:'m83'::jsonb - 'acessos'), 'todas as chaves de topo fora de acessos idênticas');
select pg_temp.confere(
  (:'m'::jsonb #> '{acessos,hoje}') - 'com_sacola' = (:'m83'::jsonb #> '{acessos,hoje}')
  and (:'m'::jsonb #> '{acessos,ontem}') - 'com_sacola' = (:'m83'::jsonb #> '{acessos,ontem}')
  and (:'m'::jsonb #> '{acessos,semana}') - 'com_sacola' = (:'m83'::jsonb #> '{acessos,semana}')
  and (:'m'::jsonb #> '{acessos,faixa_atual}') = (:'m83'::jsonb #> '{acessos,faixa_atual}'),
  'faixas, sem_hora, por_dia e faixa_atual idênticos aos da 83');
select pg_temp.confere(
  ((:'m'::jsonb #> '{acessos,comparacao,hoje}') - 'com_sacola') - 'base_hoje'
    = (:'m83'::jsonb #> '{acessos,comparacao,hoje}') - 'base_hoje'
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje}') - 'com_sacola'
    = (:'m83'::jsonb #> '{acessos,comparacao,hoje,base_hoje}')
  and (:'m'::jsonb #> '{acessos,comparacao,ontem}') - 'com_sacola' = (:'m83'::jsonb #> '{acessos,comparacao,ontem}'),
  'comparações de Hoje e Ontem idênticas às da 83, fora com_sacola');
select pg_temp.confere((:'m83'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb, 'na 83 a semana era sempre null');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 2
  and (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 2
  and (:'m'::jsonb #>> '{periodos,semana,visitas}')::int = 4,
  'fixturas: visitas hoje 2, ontem 2, semana 4 (distintos)');

-- =============================================================================================
-- "Com sacola": por dia limitado por Visitas; Semana = soma dos dias
-- =============================================================================================
select pg_temp.confere((:'m'::jsonb #>> '{acessos,hoje,com_sacola}')::int = 2, 'hoje: 2 marcas, 2 visitas ⇒ 2');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,ontem,com_sacola}')::int = 2,
  'ontem: 3 marcas, 2 visitas ⇒ 2 (nunca passa de Visitas)');
select pg_temp.confere(
  (:'m'::jsonb #>> '{acessos,hoje,com_sacola}')::int <= (:'m'::jsonb #>> '{periodos,hoje,visitas}')::int
  and (:'m'::jsonb #>> '{acessos,ontem,com_sacola}')::int <= (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int,
  'com_sacola ≤ visitas em hoje e ontem');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,semana,com_sacola}')::int = 1 + 2 + 2,
  'semana: soma dos dias 1 + 2 + 2 = 5 (passa dos 4 distintos: a soma conta dois dias)');

-- =============================================================================================
-- As comparações de Hoje e Ontem para "Com sacola"
-- =============================================================================================
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,com_sacola}')::int = 2,
  'Hoje × ontem até as 15h: ontem com marca antes das 15h = 2 (09h, 10h), visitas antes das 15h = 2 ⇒ 2');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,base_hoje,com_sacola}')::int = 1,
  'base de hoje até as 15h: 1 marca (11h; a de 15h10 fica fora), 1 visita ⇒ 1');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,ontem,com_sacola}')::int = 1,
  'Ontem × anteontem (seg 19): 1 marca, 2 visitas ⇒ 1');

-- =============================================================================================
-- A semana contra a semana anterior até o mesmo dia e a mesma hora
-- =============================================================================================
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,ate_dia}') = '2026-10-14'
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,ate_hora}')::int = 15,
  'semana anterior até qua 14/10 às 15h');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,base_semana,visitas}')::int = 3,
  'semana atual até as 15h de hoje: A, B, C (D chegou às 16h) ⇒ 3 distintos');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,visitas}')::int = 4,
  'semana anterior: P, Q, V e R (S às 15h, T às 20h e U na quinta ficam fora) ⇒ 4 distintos');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,base_semana,vendas}')::int = 2
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,vendas}')::int = 2,
  'vendas: 2 × 2 (as de depois das 15h e a da quinta ficam fora)');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,base_semana,com_sacola}')::int = 1 + 2 + 1,
  'com sacola atual: seg 1 + ter 2 + qua até as 15h 1 = 4');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,com_sacola}')::int = 1 + 1 + 1,
  'com sacola anterior: seg 1 + ter 1 + qua 14 até as 15h 1 (a de 16h fica fora; a da quinta também) = 3');

-- =============================================================================================
-- A variação some sem o período anterior medido
-- =============================================================================================
savepoint historico_na_semana;
select pg_temp.historico('2026-10-20T12:00:00Z');
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb,
  'os 14 dias guardados só desde ter 20 (depois da segunda) ⇒ semana null');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,com_sacola}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,com_sacola}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,ontem,com_sacola}') = 'null'::jsonb,
  'marca medida só desde ontem ⇒ com_sacola das comparações de Hoje e Ontem null');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') <> 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,ontem,visitas}') <> 'null'::jsonb,
  'as visitas de Hoje e Ontem seguem comparadas (a regra da 83 não muda)');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,hoje,com_sacola}')::int = 2,
  'o número de Com sacola continua (só a variação some)');
rollback to savepoint historico_na_semana;

savepoint historico_na_segunda;
select pg_temp.historico('2026-10-19T12:00:00Z');
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') <> 'null'::jsonb
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,visitas}')::int = 4,
  '14 dias guardados desde a segunda: a poda antiga (8 dias) guardava a semana anterior ⇒ visitas comparadas');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana,com_sacola}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,semana,base_semana,com_sacola}') = 'null'::jsonb,
  'a marca não foi medida na semana anterior ⇒ com_sacola da semana null');
rollback to savepoint historico_na_segunda;

savepoint contagem_recente;
update public.store_visit_counter set started_at = '2026-10-12T12:00:00Z' where id;
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb,
  'contagem começando na segunda da semana anterior ⇒ semana null');
rollback to savepoint contagem_recente;

savepoint teto_na_anterior;
update public.store_visit_counter set capped_day = '2026-10-13' where id;
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb,
  'teto num dia da semana anterior ⇒ semana null');
rollback to savepoint teto_na_anterior;

savepoint sem_hora_no_corte;
insert into public.store_visits (day, visitor_id) values ('2026-10-14', '90040000-0000-4000-8000-0000000000f1');
select pg_temp.movimento('2026-10-21T18:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb,
  'linha sem hora no dia do corte da semana anterior ⇒ semana null');
rollback to savepoint sem_hora_no_corte;

savepoint segunda_meia_noite;
select pg_temp.movimento('2026-10-19T03:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb,
  'segunda às 0h30: nenhuma hora completa na semana ⇒ semana null');
rollback to savepoint segunda_meia_noite;

savepoint segunda_de_manha;
select pg_temp.movimento('2026-10-19T13:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,semana,ate_dia}') = '2026-10-12'
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,ate_hora}')::int = 10
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,base_semana,visitas}')::int = 1
  and (:'m'::jsonb #>> '{acessos,comparacao,semana,visitas}')::int = 2,
  'segunda às 10h: só a segunda até as 10h dos dois lados (A × P, Q)');
rollback to savepoint segunda_de_manha;

-- =============================================================================================
-- A poda: hoje e os 13 anteriores ficam
-- =============================================================================================
savepoint poda;
insert into public.store_visits (day, visitor_id, first_hour) values
  ('2026-10-08', '90040000-0000-4000-8000-0000000000e1', 9),
  ('2026-10-07', '90040000-0000-4000-8000-0000000000e2', 9);
select public.prune_store_visits(date '2026-10-21');
select pg_temp.confere(exists (select 1 from public.store_visits where day = '2026-10-08')
  and not exists (select 1 from public.store_visits where day = '2026-10-07'),
  'prune_store_visits(21/10) guarda 08/10 (13 dias antes) e apaga 07/10');
select pg_temp.confere(exists (select 1 from public.store_visits where day = '2026-10-12'),
  'a semana anterior inteira sobrevive à poda');
rollback to savepoint poda;

-- O que só a leitura grava: nenhuma escrita da leitura na marca de sacola.
select pg_temp.confere((select count(*) from public.store_presence_carts) = 11, 'store_movement não escreve na marca de sacola');

-- O `history_since` nasce do `default` na linha que já existia: o instante da migration.
select pg_temp.confere(
  (select data_type || '|' || is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'store_visit_counter' and column_name = 'history_since') = 'timestamp with time zone|NO',
  'store_visit_counter.history_since é timestamptz not null');
select pg_temp.confere(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'store_visits') = array['day', 'visitor_id', 'first_hour'],
  'store_visits continua {day, visitor_id, first_hour}');

select pg_temp.confere(pg_temp.recusado('authenticated', :'cliente_id', 'select public.store_movement(now())'),
  'cliente sem papel: store_movement recusado (42501)');
select pg_temp.confere(pg_temp.recusado('anon', null, 'select public.store_movement(now())'), 'anon: store_movement recusado (42501)');

rollback;
