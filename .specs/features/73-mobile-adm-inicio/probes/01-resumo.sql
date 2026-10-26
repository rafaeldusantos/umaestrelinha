-- Feature 73 · T09 — probe semântico de `public.store_overview` contra o banco local (54442).
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--     -f .specs/features/73-mobile-adm-inicio/probes/01-resumo.sql
--
-- O `.sql` da migration é reaplicado dentro da transação, então o probe mede o ARQUIVO.
-- Tudo em `begin … rollback`: o banco volta como estava. Nenhum `nextval` é consumido — toda
-- fixtura traz `order_number` e `id` explícitos (sequência não volta no rollback).
--
-- O instante do probe é 2030-03-04 15:00Z = segunda-feira, 12:00 de Brasília. Em 2030 não há
-- pedido real nenhum, então semana, mês, clientes novas, joias e recentes medem só as fixturas. A
-- FILA não tem recorte de data (é o painel de hoje): ela é medida por DIFERENÇA, antes e depois.
--
-- Cada asserção imprime `ok — <o quê>` e uma falha derruba o script com exit ≠ 0.

\set QUIET on
\pset tuples_only on
\pset format unaligned
begin;

-- O probe mede o ARQUIVO, não o banco: a migration é reaplicada dentro da transação (`create or
-- replace`), então um mutante injetado no `.sql` é o que roda aqui — mesmo com a versão boa já
-- aplicada no banco local. O rollback desfaz.
\ir ../../../../supabase/migrations/20261023120000_73-resumo-do-atelie.sql

create function pg_temp.ok(cond boolean, oque text) returns text language plpgsql as $f$
begin
  if cond is not true then raise exception 'FALHOU — %', oque; end if;
  return 'ok — ' || oque;
end $f$;

-- Um admin só desta transação (nunca a conta do seed).
insert into auth.users (id, email, aud, role, instance_id)
values ('00000000-0000-4000-a000-000000000073', 'probe73@exemplo.invalid', 'authenticated', 'authenticated',
        '00000000-0000-0000-0000-000000000000');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-000000000073', 'admin');

-- ------------------------------------------------------------------------------------------
-- A fila ANTES das fixturas
-- ------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000073","role":"authenticated"}', true) \gset
select public.store_overview('2030-03-04T15:00:00Z')::text as antes \gset
reset role;

-- ------------------------------------------------------------------------------------------
-- Fixturas de VENDA — `delivered`, para nenhuma cair num bloco da fila e a diferença da fila
-- medir só as fixturas dela
-- ------------------------------------------------------------------------------------------
-- Uma cadastrada (com pedido antigo de convidada no mesmo e-mail — a adoção de `ESP-22`).
insert into public.customers (id, name, email)
values ('00000000-0000-4000-b000-000000000001', 'Cadastrada Probe', 'cadastrada73@exemplo.invalid');
-- Fecho r3 (C1): uma conta x@ cujo pedido de FEVEREIRO traz o customer_id dela e OUTRO e-mail (y@).
-- O vínculo pelo customer_id é o que a torna antiga em março; casar só por e-mail a contaria nova.
insert into public.customers (id, name, email)
values ('00000000-0000-4000-b000-000000000002', 'Conta X Probe', 'x73@exemplo.invalid');

insert into public.orders (id, order_number, customer_id, customer_name, customer_email, payment_method,
                           subtotal, total, status, payment_status, material_status, paid_at, created_at)
values
  -- A: 28/02 21:30 de Brasília (já 01/03 em UTC) ⇒ fevereiro.
  ('00000000-0000-4000-c000-00000000000a', 'PRB-A', null, 'A', 'a73@exemplo.invalid', 'pix', 100, 100, 'delivered', 'approved', 'nao_aplicavel', '2030-03-01T00:30:00Z', '2030-03-01T00:29:00Z'),
  -- B: 28/02 23:59 de Brasília ⇒ fevereiro.
  ('00000000-0000-4000-c000-00000000000b', 'PRB-B', null, 'B', 'b73@exemplo.invalid', 'pix', 200, 200, 'delivered', 'approved', 'nao_aplicavel', '2030-03-01T02:59:00Z', '2030-03-01T02:58:00Z'),
  -- C: 01/03 00:00 de Brasília ⇒ março. Cliente nova (c73).
  ('00000000-0000-4000-c000-00000000000c', 'PRB-C', null, 'C', 'c73@exemplo.invalid', 'pix', 300, 300, 'delivered', 'approved', 'nao_aplicavel', '2030-03-01T03:00:00Z', '2030-03-01T02:59:30Z'),
  -- D: pago hoje e depois CANCELADO ⇒ fora de tudo.
  ('00000000-0000-4000-c000-00000000000d', 'PRB-D', null, 'D', 'd73@exemplo.invalid', 'pix', 400, 400, 'cancelled', 'approved', 'nao_aplicavel', '2030-03-04T14:00:00Z', '2030-03-04T13:59:00Z'),
  -- E1/E2: convidada g1 compra em fevereiro e de novo em março ⇒ NÃO é nova em março.
  ('00000000-0000-4000-c000-0000000000e1', 'PRB-E1', null, 'G1', 'G1-73@Exemplo.invalid', 'pix', 50, 50, 'delivered', 'approved', 'nao_aplicavel', '2030-02-10T15:00:00Z', '2030-02-10T14:00:00Z'),
  ('00000000-0000-4000-c000-0000000000e2', 'PRB-E2', null, 'G1', 'g1-73@exemplo.invalid', 'pix', 60, 60, 'delivered', 'approved', 'nao_aplicavel', '2030-03-02T15:00:00Z', '2030-03-02T14:00:00Z'),
  -- F1/F2: o pedido de convidada antigo (fevereiro) e o da conta (março) ⇒ NÃO é nova.
  ('00000000-0000-4000-c000-0000000000f1', 'PRB-F1', null, 'Cadastrada', 'cadastrada73@exemplo.invalid', 'pix', 10, 10, 'delivered', 'approved', 'nao_aplicavel', '2030-02-15T15:00:00Z', '2030-02-15T14:00:00Z'),
  ('00000000-0000-4000-c000-0000000000f2', 'PRB-F2', '00000000-0000-4000-b000-000000000001', 'Cadastrada', 'cadastrada73@exemplo.invalid', 'pix', 70, 70, 'delivered', 'approved', 'nao_aplicavel', '2030-03-03T15:00:00Z', '2030-03-03T14:00:00Z'),
  -- G3: convidada nova em março.
  ('00000000-0000-4000-c000-0000000000a3', 'PRB-G3', null, 'G3', 'g3-73@exemplo.invalid', 'pix', 80, 80, 'delivered', 'approved', 'nao_aplicavel', '2030-03-03T16:00:00Z', '2030-03-03T15:30:00Z'),
  -- X1/X2 (fecho r3, C1): a conta x@ compra em fevereiro com e-mail y@ e o customer_id dela, e de
  -- novo em março ⇒ NÃO é nova em março.
  ('00000000-0000-4000-c000-0000000000b1', 'PRB-X1', '00000000-0000-4000-b000-000000000002', 'X', 'y73@exemplo.invalid', 'pix', 30, 30, 'delivered', 'approved', 'nao_aplicavel', '2030-02-12T15:00:00Z', '2030-02-12T14:00:00Z'),
  ('00000000-0000-4000-c000-0000000000b2', 'PRB-X2', '00000000-0000-4000-b000-000000000002', 'X', 'x73@exemplo.invalid', 'pix', 40, 40, 'delivered', 'approved', 'nao_aplicavel', '2030-03-02T16:00:00Z', '2030-03-02T15:00:00Z'),
  -- H: pago DEPOIS do instante do probe ⇒ fora.
  ('00000000-0000-4000-c000-000000000011', 'PRB-H', null, 'H', 'h73@exemplo.invalid', 'pix', 900, 900, 'delivered', 'approved', 'nao_aplicavel', '2030-03-04T16:00:00Z', '2030-03-04T14:30:00Z');

-- As joias de março: a órfã (3 peças) e um empate de 2 peças entre três produtos, mais um quinto
-- com 1 peça que o `limit 4` tem de cortar. A ordem do empate é pelo nome.
-- Fecho r3 (J1): mais um com 2 peças — empatado com o 4º, nome DEPOIS na ordem alfabética
-- ("Berloque…" > "Anel Afetivo Amor…"). O empate no CORTE decide quem entra: ele fica de fora.
insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
select v.order_id::uuid, v.product_id, v.product_name, 1, v.qtd
from (values
  ('00000000-0000-4000-c000-00000000000c', 'nuvemshop:999001', 'Peça Órfã Probe', 3),
  ('00000000-0000-4000-c000-00000000000c', '63069a13-917e-4f39-9393-3b9d5058087d', 'nome congelado ignorado', 1),
  ('00000000-0000-4000-c000-0000000000f2', '63069a13-917e-4f39-9393-3b9d5058087d', 'nome congelado ignorado', 1),
  ('00000000-0000-4000-c000-0000000000e2', '5395df36-85de-4b8a-a420-f7c140aa654d', 'x', 2),
  ('00000000-0000-4000-c000-0000000000a3', '9dd792b3-5500-4e50-8316-31d970026687', 'x', 2),
  ('00000000-0000-4000-c000-0000000000a3', '7b5b269b-3cb9-40ba-ad25-aba06e691d2e', 'x', 1),
  ('00000000-0000-4000-c000-00000000000c', '8e04f163-226b-419d-a1bd-a904eb3d663c', 'x', 2),
  -- de fevereiro e do cancelado: não entram
  ('00000000-0000-4000-c000-00000000000a', 'nuvemshop:999002', 'Fevereiro Probe', 9),
  ('00000000-0000-4000-c000-00000000000d', 'nuvemshop:999003', 'Cancelado Probe', 9)
) as v(order_id, product_id, product_name, qtd);

-- ------------------------------------------------------------------------------------------
-- Fixturas da FILA (sem `paid_at`: não são venda) — um pedido de cada bloco, e um em DOIS
-- ------------------------------------------------------------------------------------------
insert into public.orders (id, order_number, customer_name, customer_email, payment_method, subtotal, total,
                           status, payment_status, material_status, tracking_code, created_at)
values
  ('00000000-0000-4000-d000-000000000001', 'PRB-Q1', 'Q1', 'q1@exemplo.invalid', 'pix', 1, 1, 'paid', 'approved', 'aguardando_material', null, '2030-03-04T14:40:00Z'),
  ('00000000-0000-4000-d000-000000000002', 'PRB-Q2', 'Q2', 'q2@exemplo.invalid', 'pix', 1, 1, 'paid', 'approved', 'material_recebido', null, '2030-03-04T14:41:00Z'),
  ('00000000-0000-4000-d000-000000000003', 'PRB-Q3', 'Q3', 'q3@exemplo.invalid', 'pix', 1, 1, 'shipped', 'approved', 'nao_aplicavel', null, '2030-03-04T14:42:00Z'),
  ('00000000-0000-4000-d000-000000000004', 'PRB-Q4', 'Q4', 'q4@exemplo.invalid', 'pix', 1, 1, 'pending', 'pending', 'nao_aplicavel', null, '2030-03-04T14:43:00Z'),
  -- Em DOIS blocos: aguardando material E enviado sem rastreio ⇒ a união conta UMA vez.
  ('00000000-0000-4000-d000-000000000005', 'PRB-Q5', 'Q5', 'q5@exemplo.invalid', 'pix', 1, 1, 'shipped', 'approved', 'aguardando_material', null, '2030-03-04T14:44:00Z'),
  -- Enviado COM rastreio: em bloco nenhum.
  ('00000000-0000-4000-d000-000000000006', 'PRB-Q6', 'Q6', 'q6@exemplo.invalid', 'credit_card', 1, 1, 'shipped', 'approved', 'nao_aplicavel', 'AN000000000BR', '2030-03-04T14:45:00Z');

set local role authenticated;
select public.store_overview('2030-03-04T15:00:00Z')::text as depois \gset
reset role;

-- ------------------------------------------------------------------------------------------
-- As asserções
-- ------------------------------------------------------------------------------------------
\echo '— forma e dia'
select pg_temp.ok(j->>'hoje' = '2030-03-04', 'hoje é o dia de Brasília do instante') from (select :'depois'::jsonb j) x;
select pg_temp.ok(j->>'mes' = '2030-03', 'mês AAAA-MM') from (select :'depois'::jsonb j) x;
select pg_temp.ok((j->>'expira_em')::timestamptz = '2030-03-05T03:00:00Z', 'expira na próxima 00:00 de Brasília') from (select :'depois'::jsonb j) x;
select pg_temp.ok((j->>'lido_em')::timestamptz = '2030-03-04T15:00:00Z', 'lido_em é p_agora') from (select :'depois'::jsonb j) x;
select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j) k)::text
    = '{clientes_novas,expira_em,fila,hoje,joias,lido_em,mes,mes_resumo,recentes,semana}',
  'as chaves de topo são as de OVERVIEW_KEYS.topo') from (select :'depois'::jsonb j) x;

\echo '— semana (7 dias, do mais antigo a hoje, virada às 00:00 de Brasília)'
select pg_temp.ok(jsonb_array_length(j->'semana') = 7, '7 dias') from (select :'depois'::jsonb j) x;
select pg_temp.ok(
  (select string_agg(d->>'dia' || ':' || (d->>'dow') || ':' || (d->>'vendas') || ':' || trim_scale((d->>'faturamento')::numeric)::text, ' ' order by ord)
   from jsonb_array_elements(j->'semana') with ordinality as e(d, ord))
  = '2030-02-26:2:0:0 2030-02-27:3:0:0 2030-02-28:4:2:300 2030-03-01:5:1:300 2030-03-02:6:2:100 2030-03-03:7:2:150 2030-03-04:1:0:0',
  '21:30 e 23:59 caem no dia 28; 00:00 no dia 1; o cancelado e o pago depois do instante ficam fora; o dia sem venda vem com 0; segunda é dow 1; X2 soma no dia 2')
from (select :'depois'::jsonb j) x;
select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j->'semana'->0) k)::text = '{dia,dow,faturamento,vendas}',
  'chaves do dia') from (select :'depois'::jsonb j) x;

\echo '— mês (do dia 1 de Brasília até agora)'
select pg_temp.ok((j->'mes_resumo'->>'vendas')::int = 5 and (j->'mes_resumo'->>'faturamento')::numeric = 550,
  'março: C + E2 + F2 + G3 + X2 = 5 vendas, R$ 550 (sem as de fevereiro, o cancelado e o futuro)') from (select :'depois'::jsonb j) x;

select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j->'mes_resumo') k)::text = '{faturamento,vendas}',
  'chaves do mês') from (select :'depois'::jsonb j) x;

\echo '— clientes novas (primeira venda da vida no mês)'
select pg_temp.ok((j->>'clientes_novas')::int = 2,
  'só c73 e g3: a convidada de fevereiro (e-mail com outra caixa), a cadastrada que adotou o pedido antigo e a conta x@ com pedido de fevereiro pelo customer_id (e-mail y@) não contam')
from (select :'depois'::jsonb j) x;

\echo '— joias mais pedidas no mês'
select pg_temp.ok(
  (select string_agg((jo->>'nome') || '=' || (jo->>'pecas'), ' | ' order by ord) from jsonb_array_elements(j->'joias') with ordinality as e(jo, ord))
  = 'Peça Órfã Probe=3 | Anel Afetivo 6 Corações com Leite Materno em Prata 925=2 | Anel Afetivo Aliança com Coto Umbilical em Prata 925=2 | Anel Afetivo Amor Mãe e Bebê com Leite Materno em Prata 925=2',
  'a órfã pelo nome congelado, o produto pelo nome do catálogo (variações somadas), empate por nome — também no corte do 4º (o Berloque empatado fica fora) —, limit 4')
from (select :'depois'::jsonb j) x;
select pg_temp.ok(j->'joias'->0->>'chave' = 'nome:Peça Órfã Probe' and j->'joias'->1->>'chave' = '63069a13-917e-4f39-9393-3b9d5058087d',
  'a chave: uuid do produto, ou nome: da órfã') from (select :'depois'::jsonb j) x;

select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j->'joias'->0) k)::text = '{chave,nome,pecas}',
  'chaves da joia') from (select :'depois'::jsonb j) x;

\echo '— a fila (por diferença: ela não tem recorte de data)'
select pg_temp.ok(
  ((d->'fila'->>'aguardando')::int - (a->'fila'->>'aguardando')::int) = 2
  and ((d->'fila'->>'a_separar')::int - (a->'fila'->>'a_separar')::int) = 1
  and ((d->'fila'->>'sem_rastreio')::int - (a->'fila'->>'sem_rastreio')::int) = 2
  and ((d->'fila'->>'pix_aguardando')::int - (a->'fila'->>'pix_aguardando')::int) = 1,
  'cada bloco ganhou o seu pedido (Q5 está em dois)') from (select :'antes'::jsonb a, :'depois'::jsonb d) x;
select pg_temp.ok(((d->'fila'->>'precisa_acao')::int - (a->'fila'->>'precisa_acao')::int) = 4,
  'a UNIÃO ganhou 4 (Q1, Q2, Q3, Q5), não 5 — Q5 conta uma vez; Q4 (Pix) e Q6 (com rastreio) fora')
from (select :'antes'::jsonb a, :'depois'::jsonb d) x;
select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j->'fila') k)::text
    = '{a_separar,aguardando,aguardando_desde,pix_aguardando,precisa_acao,sem_rastreio}',
  'chaves da fila') from (select :'depois'::jsonb j) x;

\echo '— a fila bate com o PostgREST de hoje (o mesmo `orders`, contado do jeito do painel)'
select pg_temp.ok(
  (d->'fila'->>'aguardando')::int = (select count(*) from public.orders o where o.material_status = 'aguardando_material')
  and (d->'fila'->>'a_separar')::int = (select count(*) from public.orders o where o.status = 'paid' and o.material_status in ('nao_aplicavel','material_recebido','em_producao'))
  and (d->'fila'->>'sem_rastreio')::int = (select count(*) from public.orders o where o.status = 'shipped' and o.tracking_code is null)
  and (d->'fila'->>'pix_aguardando')::int = (select count(*) from public.orders o where o.payment_method = 'pix' and o.payment_status = 'pending')
  and (d->'fila'->>'aguardando_desde')::timestamptz = (select min(created_at) from public.orders o where o.material_status = 'aguardando_material')
  -- A união em valor ABSOLUTO (a diferença acima cancela um deslocamento constante): o `or=` da
  -- visão "Precisa de ação" do painel, condição a condição.
  and (d->'fila'->>'precisa_acao')::int = (select count(*) from public.orders o where o.material_status = 'aguardando_material'
        or (o.status = 'paid' and (o.material_status is null or o.material_status in ('nao_aplicavel','material_recebido','em_producao')))
        or (o.status = 'shipped' and o.tracking_code is null)),
  'as quatro contagens, a idade e a união = as consultas do painel (fetchTiles e a visão)') from (select :'depois'::jsonb d) x;

\echo '— últimos pedidos'
select pg_temp.ok(
  (select string_agg(r->>'order_number', ',' order by ord) from jsonb_array_elements(j->'recentes') with ordinality as e(r, ord))
  = 'PRB-Q6,PRB-Q5,PRB-Q4,PRB-Q3',
  'os 4 mais recentes por created_at, de qualquer estado (Pix pendente incluso)') from (select :'depois'::jsonb j) x;
select pg_temp.ok(
  (select array_agg(k order by k) from jsonb_object_keys(j->'recentes'->0) k)::text
    = '{created_at,customer_name,delivery_estimate_max,id,material_status,order_number,payment_status,shipping_service_id,status,total}',
  'chaves do pedido recente') from (select :'depois'::jsonb j) x;

\echo '— a recusa'
do $$
begin
  set local role anon;
  begin
    perform public.store_overview();
    raise exception 'FALHOU — anon executou';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;
select 'ok — anon: 42501 (sem execute)';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-000000000001","role":"authenticated"}', true) \gset
do $$
declare v_estado text;
begin
  begin
    perform public.store_overview();
    raise exception 'FALHOU — cliente executou';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate;
    if v_estado <> '42501' then raise exception 'FALHOU — cliente recebeu %', v_estado; end if;
  end;
end $$;
reset role;
select 'ok — cliente (sem papel admin): 42501 do has_role';

rollback;

\echo '— restaurado'
select 'ok — nenhum pedido PRB- sobrou: ' || (select count(*) from public.orders where order_number like 'PRB-%');
