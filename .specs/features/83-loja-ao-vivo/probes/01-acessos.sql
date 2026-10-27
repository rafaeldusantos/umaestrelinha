-- Feature 83 · probe LAV-61, LAV-70..LAV-74 — a hora da primeira visita e a chave `acessos`.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/features/83-loja-ao-vivo/probes/01-acessos.sql
--
-- `begin … rollback`: aplica a 71 e a 83 do disco (_comum.sql), grava fixturas e desfaz tudo.
-- O calendário: quarta 21/10/2026 é HOJE na maioria das leituras (segunda 19/10 = anteontem e início
-- da semana). Brasília é UTC−3: `h` de Brasília em 21/10 é `21/10T(h+3)Z` até as 20h.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

select pg_temp.confere((select count(*) from public.orders
                         where payment_status = 'approved' and paid_at >= timestamptz '2026-10-15T03:00:00Z') = 0,
  'nenhum pedido pago desde 15/10 antes das fixturas');
select pg_temp.confere((select count(*) from public.store_visits) = 0, 'store_visits nasce vazia na transação');

-- =============================================================================================
-- LAV-70 — store_hour nas bordas, a coluna, e a gravação só na inserção
-- =============================================================================================
select pg_temp.confere(public.store_hour('2026-10-21T05:59:00Z') = 2, '02:59 de Brasília ⇒ hora 2');
select pg_temp.confere(public.store_hour('2026-10-21T06:00:00Z') = 3, '03:00 de Brasília ⇒ hora 3');
select pg_temp.confere(public.store_hour('2026-10-22T02:59:00Z') = 23
  and public.store_day('2026-10-22T02:59:00Z') = date '2026-10-21',
  '23:59 de Brasília (22/10 em UTC) ⇒ dia 21/10, hora 23');

select pg_temp.confere(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'store_visits') = array['day', 'visitor_id', 'first_hour'],
  'information_schema: store_visits = {day, visitor_id, first_hour}, nada mais');
select pg_temp.confere(
  (select data_type || '|' || is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'store_visits' and column_name = 'first_hour') = 'smallint|YES',
  'first_hour é smallint anulável');

savepoint gravacao;
select pg_temp.contador('2026-10-10T12:00:00Z', null);

select pg_temp.confere(pg_temp.visita('83000000-0000-4000-8000-000000000001', '2026-10-21T05:59:00Z') = 'gravada', '02:59 ⇒ gravada');
select pg_temp.confere(pg_temp.visita('83000000-0000-4000-8000-000000000002', '2026-10-21T06:00:00Z') = 'gravada', '03:00 ⇒ gravada');
select pg_temp.confere(pg_temp.visita('83000000-0000-4000-8000-000000000003', '2026-10-21T12:00:00Z') = 'gravada', '09:00 ⇒ gravada');
select pg_temp.confere(pg_temp.visita('83000000-0000-4000-8000-000000000003', '2026-10-21T18:00:00Z') = 'repetida', 'o mesmo id às 15:00 ⇒ repetida');
select pg_temp.confere(pg_temp.visita('83000000-0000-4000-8000-000000000004', '2026-10-22T02:59:00Z') = 'gravada', '23:59 ⇒ gravada');

select pg_temp.confere((select first_hour from public.store_visits where visitor_id = '83000000-0000-4000-8000-000000000001') = 2,
  'a linha das 02:59 tem first_hour 2 (faixa 0)');
select pg_temp.confere((select first_hour from public.store_visits where visitor_id = '83000000-0000-4000-8000-000000000002') = 3,
  'a linha das 03:00 tem first_hour 3 (faixa 1)');
select pg_temp.confere((select first_hour from public.store_visits where visitor_id = '83000000-0000-4000-8000-000000000003') = 9,
  'visita às 09h e às 15h ⇒ UMA linha, first_hour 9 (a repetição não muda a hora)');
select pg_temp.confere((select day::text || '|' || first_hour from public.store_visits
                         where visitor_id = '83000000-0000-4000-8000-000000000004') = '2026-10-21|23',
  'a linha das 23:59 é do dia 21/10 com first_hour 23');

select pg_temp.movimento('2026-10-22T02:59:30Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,faixa_atual}')::int = 7, '23:59 ⇒ faixa_atual 7');
select pg_temp.confere((:'m'::jsonb #> '{acessos,hoje,por_faixa}') = '[1,1,0,1,0,0,0,1]'::jsonb,
  'por_faixa de hoje = [1,1,0,1,0,0,0,1] (02:59 na 0, 03:00 na 1, 09h na 3, 23:59 na 7)');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 4, 'periodos.hoje.visitas = 4');
select pg_temp.confere(:'m'::jsonb ? 'periodos' and :'m'::jsonb ? 'acessos' and :'m'::jsonb ? 'teto_dia', 'as chaves de antes e a nova');

rollback to savepoint gravacao;

-- =============================================================================================
-- LAV-71 — faixa_atual, futuras null, e o caso 00:30
-- =============================================================================================
savepoint faixas;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
-- 00h30, ANTES de qualquer visita de hoje (uma visita posterior puxaria a faixa: caso do futuro)
select pg_temp.movimento('2026-10-21T03:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,faixa_atual}')::int = 0, '00h30 ⇒ faixa_atual 0');
select pg_temp.confere((:'m'::jsonb #> '{acessos,hoje,por_faixa}') = '[0,null,null,null,null,null,null,null]'::jsonb,
  '00h30: faixas 1..7 de hoje null');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,ate_hora}')::int = 0
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,vendas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,vendas}') = 'null'::jsonb,
  '00h30: nenhuma hora completa ⇒ comparação de Hoje toda null');
select pg_temp.visita('83000000-0000-4000-8000-000000000011', '2026-10-21T12:00:00Z');  -- 09h
select pg_temp.visita('83000000-0000-4000-8000-000000000012', '2026-10-21T16:00:00Z');  -- 13h

select pg_temp.movimento('2026-10-21T17:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,faixa_atual}')::int = 4, '14h30 ⇒ faixa_atual 4');
select pg_temp.confere((:'m'::jsonb #> '{acessos,hoje,por_faixa}') = '[0,0,0,1,1,null,null,null]'::jsonb,
  '14h30: faixas 0..4 contadas, 5..7 null (futuras)');
select pg_temp.confere((:'m'::jsonb #> '{acessos,ontem,por_faixa}') = '[0,0,0,0,0,0,0,0]'::jsonb,
  'ontem sem visita: 8 zeros, nenhum null (a contagem começou antes)');

rollback to savepoint faixas;

-- =============================================================================================
-- LAV-71 — a invariante soma(por_faixa) + sem_hora = visitas, com linhas sem hora
-- =============================================================================================
savepoint invariante;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
insert into public.store_visits (day, visitor_id) values
  ('2026-10-21', '83000000-0000-4000-8000-000000000021'),
  ('2026-10-21', '83000000-0000-4000-8000-000000000022'),
  ('2026-10-20', '83000000-0000-4000-8000-000000000023');
select pg_temp.visita('83000000-0000-4000-8000-000000000024', '2026-10-21T13:00:00Z');  -- hoje 10h
select pg_temp.visita('83000000-0000-4000-8000-000000000025', '2026-10-21T20:00:00Z');  -- hoje 17h
select pg_temp.visita('83000000-0000-4000-8000-000000000026', '2026-10-20T04:00:00Z');  -- ontem 01h
select pg_temp.visita('83000000-0000-4000-8000-000000000027', '2026-10-20T15:00:00Z');  -- ontem 12h
select pg_temp.visita('83000000-0000-4000-8000-000000000028', '2026-10-21T02:30:00Z');  -- ontem 23h30

select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,hoje,sem_hora}')::int = 2 and (:'m'::jsonb #>> '{acessos,ontem,sem_hora}')::int = 1,
  'sem_hora: hoje 2, ontem 1');
select pg_temp.confere(
  (select coalesce(sum(x::int), 0) from jsonb_array_elements_text(:'m'::jsonb #> '{acessos,hoje,por_faixa}') x where x <> 'null')
    + (:'m'::jsonb #>> '{acessos,hoje,sem_hora}')::int = (:'m'::jsonb #>> '{periodos,hoje,visitas}')::int
  and (:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 4,
  'hoje: soma(por_faixa) + sem_hora = visitas (2 + 2 = 4)');
select pg_temp.confere(
  (select coalesce(sum(x::int), 0) from jsonb_array_elements_text(:'m'::jsonb #> '{acessos,ontem,por_faixa}') x where x <> 'null')
    + (:'m'::jsonb #>> '{acessos,ontem,sem_hora}')::int = (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int
  and (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 4,
  'ontem: soma(por_faixa) + sem_hora = visitas (3 + 1 = 4)');
select pg_temp.confere((:'m'::jsonb #> '{acessos,ontem,por_faixa}') = '[1,0,0,0,1,0,0,1]'::jsonb,
  'ontem: 01h na faixa 0, 12h na 4, 23h30 na 7');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,visitas}') = 'null'::jsonb,
  'com linha sem hora em hoje e ontem ⇒ visitas da comparação de Hoje null');
rollback to savepoint invariante;

savepoint sem_hora_so_ontem;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
insert into public.store_visits (day, visitor_id) values ('2026-10-20', '83000000-0000-4000-8000-000000000031');
select pg_temp.visita('83000000-0000-4000-8000-000000000032', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,vendas}') <> 'null'::jsonb,
  'linha sem hora SÓ em ontem ⇒ visitas null, vendas não');
rollback to savepoint sem_hora_so_ontem;

-- conserto da rodada 1 (S06): o motivo "linha sem hora" vale também quando ela está SÓ em hoje
savepoint sem_hora_so_hoje;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
insert into public.store_visits (day, visitor_id) values ('2026-10-21', '83000000-0000-4000-8000-000000000033');
select pg_temp.visita('83000000-0000-4000-8000-000000000034', '2026-10-20T13:00:00Z');  -- ontem 10h
select pg_temp.visita('83000000-0000-4000-8000-000000000035', '2026-10-21T13:00:00Z');  -- hoje 10h
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,hoje,sem_hora}')::int = 1
  and (:'m'::jsonb #>> '{acessos,ontem,sem_hora}')::int = 0,
  'fixtura: sem_hora hoje 1, ontem 0');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,vendas}') <> 'null'::jsonb,
  'linha sem hora SÓ em hoje ⇒ visitas e base_hoje.visitas null, vendas não (S06)');
rollback to savepoint sem_hora_so_hoje;

-- =============================================================================================
-- LAV-72 — por_dia de segunda a hoje
-- =============================================================================================
savepoint semana;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
select pg_temp.visita('83000000-0000-4000-8000-000000000041', '2026-10-19T15:00:00Z');  -- seg
select pg_temp.visita('83000000-0000-4000-8000-000000000042', '2026-10-21T15:00:00Z');  -- qua
select pg_temp.visita('83000000-0000-4000-8000-000000000041', '2026-10-21T16:00:00Z');  -- qua, o de segunda de volta

select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,semana,por_dia}') =
  '[{"dia":"2026-10-19","visitas":1},{"dia":"2026-10-20","visitas":0},{"dia":"2026-10-21","visitas":2}]'::jsonb,
  'quarta: por_dia de 19 a 21, terça vazia com 0');
select pg_temp.confere((:'m'::jsonb #> '{acessos,semana,por_dia}' -> -1 ->> 'dia') = (:'m'::jsonb ->> 'hoje')
  and (:'m'::jsonb #> '{acessos,semana,por_dia}' -> -1 ->> 'visitas')::int = (:'m'::jsonb #>> '{periodos,hoje,visitas}')::int,
  'o último item é hoje, com visitas = periodos.hoje.visitas');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,semana,visitas}')::int = 2,
  'a semana conta o navegador de segunda UMA vez (2), embora as barras somem 3');

select pg_temp.movimento('2026-10-19T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere(jsonb_array_length(:'m'::jsonb #> '{acessos,semana,por_dia}') = 1
  and (:'m'::jsonb #> '{acessos,semana,por_dia}' -> 0 ->> 'dia') = '2026-10-19',
  'segunda-feira: por_dia com 1 item');

select pg_temp.movimento('2026-10-25T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere(jsonb_array_length(:'m'::jsonb #> '{acessos,semana,por_dia}') = 7
  and (:'m'::jsonb #> '{acessos,semana,por_dia}' -> -1 ->> 'dia') = '2026-10-25',
  'domingo: por_dia com 7 itens, o último é o domingo');
rollback to savepoint semana;

-- =============================================================================================
-- LAV-73 — comparação de Hoje por horas completas: simétrica às 15h02
-- =============================================================================================
savepoint simetrica;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
-- ontem: 10h, 14h59, 15h00, 18h
select pg_temp.visita('83000000-0000-4000-8000-000000000051', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000052', '2026-10-20T17:59:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000053', '2026-10-20T18:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000054', '2026-10-20T21:00:00Z');
-- hoje, a mesma distribuição até agora: 10h, 14h59, 15h00
select pg_temp.visita('83000000-0000-4000-8000-000000000055', '2026-10-21T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000056', '2026-10-21T17:59:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000057', '2026-10-21T18:00:00Z');
-- vendas: ontem às 14h59 (entra) e às 15h00 (não); hoje às 14h59 (entra) e às 15h01 (não)
select pg_temp.pedido('PROBE-83-S1', 10.00, '2026-10-20T17:59:00Z');
select pg_temp.pedido('PROBE-83-S2', 20.00, '2026-10-20T18:00:00Z');
select pg_temp.pedido('PROBE-83-S3', 30.00, '2026-10-21T17:59:00Z');
select pg_temp.pedido('PROBE-83-S4', 40.00, '2026-10-21T18:01:00Z');

select pg_temp.movimento('2026-10-21T18:02:00Z', :'admin_id') as m \gset
select :'m'::jsonb #> '{acessos,comparacao}' as comparacao_15h02;
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,ate_hora}')::int = 15, '15h02 ⇒ ate_hora 15');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,visitas}')::int = 2
  and (:'m'::jsonb #>> '{acessos,comparacao,hoje,base_hoje,visitas}')::int = 2,
  'visitas: ontem até as 15h = 2 = hoje até as 15h (variação 0, nunca uma queda)');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,vendas}')::int = 1
  and (:'m'::jsonb #>> '{acessos,comparacao,hoje,base_hoje,vendas}')::int = 1,
  'vendas: a das 14h59 de ontem entra e a das 15h00 não; o mesmo corte em hoje');
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,visitas}')::int = 3 and (:'m'::jsonb #>> '{periodos,ontem,visitas}')::int = 4
  and (:'m'::jsonb #>> '{periodos,hoje,vendas}')::int = 2 and (:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 2,
  'os totais de periodos não mudam com o corte (hoje 3/2, ontem 4/2)');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,faixa_atual}')::int = 5, '15h02 ⇒ faixa_atual 5');
rollback to savepoint simetrica;

-- =============================================================================================
-- LAV-73 — comparação de Ontem (anteontem inteiro) e os casos sem comparação
-- =============================================================================================
savepoint anteontem;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
select pg_temp.visita('83000000-0000-4000-8000-000000000061', '2026-10-19T04:00:00Z');  -- seg 01h
select pg_temp.visita('83000000-0000-4000-8000-000000000062', '2026-10-20T02:00:00Z');  -- seg 23h
select pg_temp.visita('83000000-0000-4000-8000-000000000063', '2026-10-20T15:00:00Z');  -- ter 12h
select pg_temp.pedido('PROBE-83-A1', 15.00, '2026-10-19T23:00:00Z');                     -- seg 20h
select pg_temp.pedido('PROBE-83-A2', 27.00, '2026-10-20T03:00:00Z');                     -- ter 00:00:00 exato (fronteira)
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,ontem}') = '{"dia":"2026-10-19","visitas":2,"vendas":1}'::jsonb,
  'comparacao.ontem = anteontem inteiro: 19/10, 2 visitas, 1 venda');
select pg_temp.confere(public.store_day_start(date '2026-10-20') = timestamptz '2026-10-20T03:00:00Z'
  and (:'m'::jsonb #>> '{acessos,comparacao,ontem,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 1,
  'venda paga às 00:00:00 de ontem conta em Ontem e NÃO em anteontem (fronteira meio-aberta, S05)');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,semana}') = 'null'::jsonb, 'comparacao.semana = null');
rollback to savepoint anteontem;

savepoint contagem_ontem;
select pg_temp.contador('2026-10-20T12:00:00Z', null);                                     -- começou ontem 09h
select pg_temp.visita('83000000-0000-4000-8000-000000000071', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,vendas}') <> 'null'::jsonb,
  'contagem começando ontem ⇒ visitas da comparação de Hoje null (vendas seguem)');
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,ontem,visitas}') = 'null'::jsonb,
  'contagem começando ontem ⇒ visitas da comparação de Ontem null');
select pg_temp.confere((:'m'::jsonb #> '{acessos,ontem,por_faixa}') = '[null,null,null,0,0,0,0,0]'::jsonb,
  'ontem: as faixas que terminam antes das 09h (0h..6h) são null, a das 9h em diante contadas');
rollback to savepoint contagem_ontem;

savepoint contagem_anteontem;
select pg_temp.contador('2026-10-19T12:00:00Z', null);                                     -- começou anteontem
select pg_temp.visita('83000000-0000-4000-8000-000000000081', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-000000000082', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,ontem,visitas}') = 'null'::jsonb,
  'contagem começando anteontem ⇒ visitas da comparação de Ontem null');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,visitas}')::int = 1
  and (:'m'::jsonb #>> '{acessos,comparacao,hoje,base_hoje,visitas}')::int = 1,
  'contagem começando anteontem ⇒ a comparação de Hoje existe (ontem 10h, hoje 10h)');
rollback to savepoint contagem_anteontem;

-- =============================================================================================
-- LAV-71 — a linha "do futuro" puxa a faixa atual
-- =============================================================================================
savepoint futuro;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
select pg_temp.visita('83000000-0000-4000-8000-000000000091', '2026-10-21T18:00:00.001Z');  -- 15h00:00.001
select pg_temp.movimento('2026-10-21T17:59:59.999Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,faixa_atual}')::int = 5,
  'a linha com hora 15 lida às 14h59 puxa faixa_atual para 5');
select pg_temp.confere((:'m'::jsonb #> '{acessos,hoje,por_faixa}') = '[0,0,0,0,0,1,null,null]'::jsonb,
  'a linha do futuro aparece na faixa 5 (não some do gráfico)');
select pg_temp.confere(
  (select coalesce(sum(x::int), 0) from jsonb_array_elements_text(:'m'::jsonb #> '{acessos,hoje,por_faixa}') x where x <> 'null')
    + (:'m'::jsonb #>> '{acessos,hoje,sem_hora}')::int = (:'m'::jsonb #>> '{periodos,hoje,visitas}')::int,
  'a invariante vale com a linha do futuro');
rollback to savepoint futuro;

-- =============================================================================================
-- LAV-73 — o teto anula as comparações; teto_dia igual ao da 71
-- =============================================================================================
savepoint teto_ontem;
select pg_temp.contador('2026-10-10T12:00:00Z', date '2026-10-20');
select pg_temp.visita('83000000-0000-4000-8000-0000000000a1', '2026-10-19T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000a2', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000a3', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,ontem,visitas}') = 'null'::jsonb,
  'teto em ontem ⇒ visitas das comparações de Hoje e de Ontem null');
select pg_temp.confere((:'m'::jsonb ->> 'teto_dia') = '2026-10-20', 'teto_dia = 20/10 (como na 71)');
rollback to savepoint teto_ontem;

-- Teto em HOJE (achado do gate do Lote 1): a contagem de hoje parou em 5.000, então a base de Hoje é
-- um piso e a variação fabricaria uma queda. As visitas são gravadas ANTES de o teto entrar no
-- contador (record_store_visit recusaria a de hoje), e há visita nas três datas e antes das 18h, para
-- que SEM o teto as duas comparações existissem: o null de Hoje só pode vir do teto em hoje.
savepoint teto_hoje;
select pg_temp.contador('2026-10-10T12:00:00Z', null);
select pg_temp.visita('83000000-0000-4000-8000-0000000000c1', '2026-10-19T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000c2', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000c3', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,hoje,visitas}')::int = 1
  and (:'m'::jsonb #>> '{acessos,comparacao,hoje,base_hoje,visitas}')::int = 1,
  'controle: sem teto, a comparação de Hoje tem visitas (ontem 10h, hoje 10h)');
select pg_temp.contador('2026-10-10T12:00:00Z', date '2026-10-21');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,hoje,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #> '{acessos,comparacao,hoje,base_hoje,visitas}') = 'null'::jsonb,
  'teto em hoje ⇒ visitas da comparação de Hoje (e a base de hoje) null');
select pg_temp.confere((:'m'::jsonb #>> '{acessos,comparacao,ontem,visitas}')::int = 1,
  'teto em hoje ⇒ a comparação de Ontem (anteontem inteiro) segue com as visitas');
select pg_temp.confere((:'m'::jsonb ->> 'teto_dia') = '2026-10-21', 'teto_dia = 21/10 (hoje)');
rollback to savepoint teto_hoje;

savepoint teto_anteontem;
select pg_temp.contador('2026-10-10T12:00:00Z', date '2026-10-19');
select pg_temp.visita('83000000-0000-4000-8000-0000000000b1', '2026-10-20T13:00:00Z');
select pg_temp.visita('83000000-0000-4000-8000-0000000000b2', '2026-10-21T13:00:00Z');
select pg_temp.movimento('2026-10-21T21:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,comparacao,ontem,visitas}') = 'null'::jsonb
  and (:'m'::jsonb #>> '{acessos,comparacao,hoje,visitas}')::int = 1,
  'teto em anteontem ⇒ só a comparação de Ontem perde as visitas');
select pg_temp.confere((:'m'::jsonb ->> 'teto_dia') = '2026-10-19', 'teto_dia = 19/10 (dentro de v_desde, como na 71)');
rollback to savepoint teto_anteontem;

-- =============================================================================================
-- LAV-71 — faixas antes da contagem são null, nunca 0
-- =============================================================================================
savepoint antes_da_contagem;
select pg_temp.contador('2026-10-21T17:00:00Z', null);                                     -- começou hoje 14h
select pg_temp.visita('83000000-0000-4000-8000-0000000000c1', '2026-10-21T17:30:00Z');    -- 14h30
select pg_temp.movimento('2026-10-21T19:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #> '{acessos,hoje,por_faixa}') = '[null,null,null,null,1,0,null,null]'::jsonb,
  'contagem desde 14h: faixas 0h..9h null, 12h contada (1), 15h (atual) 0, 18h e 21h futuras');
select pg_temp.confere((:'m'::jsonb #> '{acessos,ontem,por_faixa}') = '[null,null,null,null,null,null,null,null]'::jsonb,
  'contagem desde hoje: ontem inteiro null');
rollback to savepoint antes_da_contagem;

-- =============================================================================================
-- periodos idêntico ao da 71 para a mesma fixtura (visitas.sql (a) e vendas.sql vis31 da 71)
-- =============================================================================================
savepoint como_a_71;
select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-19T15:00:00Z');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-20T15:00:00Z');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-21T15:00:00Z');
select public.record_store_visit('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-21T16:00:00Z');
select pg_temp.pedido('PROBE-83-71A', 11.00, '2026-10-21T03:10:00Z');            -- (a) Hoje
select pg_temp.pedido('PROBE-83-71C', 33.00, '2026-10-20T15:00:00Z');            -- (c) cancelado
update public.orders set status = 'cancelled' where order_number = 'PROBE-83-71C';
select pg_temp.pedido('PROBE-83-71F', 66.00, '2026-10-21T02:59:59.900Z');        -- (f) Ontem
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb -> 'periodos') = '{
  "hoje":   {"visitas": 2, "vendas": 1, "faturamento": 11.00, "ticket": 11.00},
  "ontem":  {"visitas": 1, "vendas": 1, "faturamento": 66.00, "ticket": 66.00},
  "semana": {"visitas": 2, "vendas": 2, "faturamento": 77.00, "ticket": 38.50}
}'::jsonb, 'periodos = os números da 71 (seg/ter/qua 2/1/2; vendas (a)+(f), (c) fora)');
rollback to savepoint como_a_71;

-- =============================================================================================
-- LAV-74 — papéis
-- =============================================================================================
select pg_temp.confere(pg_temp.recusado('anon', null, 'select public.store_movement(now())'), 'anon: store_movement recusado (42501)');
select pg_temp.confere(pg_temp.recusado('authenticated', :'cliente_id', 'select public.store_movement(now())'), 'cliente: store_movement recusado (42501)');
select pg_temp.confere(pg_temp.recusado('anon', null, 'select public.store_hour(now())'), 'anon: store_hour sem execute');
select pg_temp.confere(pg_temp.recusado('authenticated', :'cliente_id', 'select public.store_hour(now())'), 'authenticated: store_hour sem execute');
select pg_temp.confere(pg_temp.recusado('anon', null, $$select public.record_store_visit('83000000-0000-4000-8000-0000000000d1')$$), 'anon: record_store_visit sem execute');
select pg_temp.confere(pg_temp.recusado('authenticated', :'admin_id', $$select public.record_store_visit('83000000-0000-4000-8000-0000000000d1')$$), 'authenticated (até o admin): record_store_visit sem execute');

savepoint servico;
set local role service_role;
select public.record_store_visit('83000000-0000-4000-8000-0000000000d2', '2026-10-21T15:00:00Z') ->> 'desfecho' as d \gset
reset role;
select pg_temp.confere(:'d' = 'gravada', 'service_role executa record_store_visit (a recriação não perdeu o grant)');
rollback to savepoint servico;

rollback;
