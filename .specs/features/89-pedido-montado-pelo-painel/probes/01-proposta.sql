-- Feature 89 · probe T02 (lado banco) — as tabelas da proposta, as três RPCs e a adoção da ficha.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/features/89-pedido-montado-pelo-painel/probes/01-proposta.sql
--
-- `begin … rollback`: derruba os objetos da 89, reaplica a migration DO DISCO dentro da transação
-- (assim o probe mede o arquivo, não o banco), grava fixturas e desfaz tudo. Exit 0 e só `ok —`.
\set ON_ERROR_STOP 1
\set QUIET on
\pset tuples_only on
\pset format unaligned
begin;

create function pg_temp.confere(ok boolean, o_que text) returns void
language plpgsql as $f$
begin
  if ok is not true then
    raise exception 'PROBE FALHOU: %', o_que;
  end if;
  raise notice 'ok — %', o_que;
end;
$f$;

-- Derruba a 89 e reaplica o arquivo.
alter table public.orders drop column if exists proposal_id;
alter table public.orders drop column if exists manual_discount;
drop function if exists public.save_order_proposal(jsonb);
drop function if exists public.create_order_from_proposal(uuid, integer, jsonb);
drop function if exists public.mark_order_proposal_viewed(uuid);
drop table if exists public.order_proposal_events;
drop table if exists public.order_proposal_items;
drop table if exists public.order_proposals;
drop sequence if exists public.order_proposal_seq;
\ir ../../../../supabase/migrations/20261103120000_89-pedido-montado.sql

-- O corpo de uma proposta, reaproveitado pelos casos. Duas linhas, uma com variação e gravação.
create function pg_temp.corpo(extra jsonb) returns jsonb language sql as $f$
  select jsonb_build_object(
    'customer_name', 'Cliente Probe',
    'customer_email', '  Probe.Nova@Exemplo.Invalid ',
    'customer_phone', '51999990000',
    'subtotal', 200, 'promotion_discount', 0, 'coupon_discount', 20, 'manual_discount', 20,
    'manual_discount_kind', 'amount', 'manual_discount_value', 20,
    'manual_discount_reason', 'combinado no WhatsApp',
    'items_total', 160,
    'items', jsonb_build_array(
      jsonb_build_object('product_id', '11111111-1111-1111-1111-111111111111',
        'product_name', 'Pingente Probe', 'quantity', 1, 'list_price', 120, 'unit_price', 120,
        'variant_id', null, 'requires_material', true, 'material_kinds', jsonb_build_array('cinzas')),
      jsonb_build_object('product_id', '22222222-2222-2222-2222-222222222222',
        'product_name', 'Anel Probe', 'quantity', 2, 'list_price', 40, 'unit_price', 40,
        'variant_label', 'Prata', 'engraving_text', 'Ana'))
  ) || extra
$f$;

-- =============================================================================================
-- Forma e permissões (SEG-05)
-- =============================================================================================
select pg_temp.confere(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.order_proposals'::regclass, 'public.order_proposal_items'::regclass,
                  'public.order_proposal_events'::regclass)),
  'RLS ligada nas três tabelas');
select pg_temp.confere(
  (select count(*) from pg_policies
    where tablename in ('order_proposals', 'order_proposal_items', 'order_proposal_events')) = 0,
  'nenhuma policy nas três tabelas');
select pg_temp.confere(
  not has_table_privilege('anon', 'public.order_proposals', 'select')
  and not has_table_privilege('authenticated', 'public.order_proposals', 'select')
  and not has_table_privilege('authenticated', 'public.order_proposal_items', 'insert')
  and not has_table_privilege('anon', 'public.order_proposal_events', 'select'),
  'anon e authenticated sem privilégio nas tabelas');
select pg_temp.confere(has_table_privilege('service_role', 'public.order_proposals', 'insert'),
  'service_role grava em order_proposals');
select pg_temp.confere(
  (select bool_and(prosecdef and proconfig = array['search_path=""']) from pg_proc
    where oid in ('public.save_order_proposal(jsonb)'::regprocedure,
                  'public.create_order_from_proposal(uuid,integer,jsonb)'::regprocedure,
                  'public.mark_order_proposal_viewed(uuid)'::regprocedure,
                  'public.handle_new_customer()'::regprocedure)),
  'as três RPCs e handle_new_customer são security definer com search_path vazio');
select pg_temp.confere(
  not has_function_privilege('anon', 'public.save_order_proposal(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.save_order_proposal(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.create_order_from_proposal(uuid,integer,jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.create_order_from_proposal(uuid,integer,jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.mark_order_proposal_viewed(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.mark_order_proposal_viewed(uuid)', 'execute'),
  'anon e authenticated NÃO executam nenhuma das três RPCs');
select pg_temp.confere(
  has_function_privilege('service_role', 'public.save_order_proposal(jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.create_order_from_proposal(uuid,integer,jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.mark_order_proposal_viewed(uuid)', 'execute'),
  'service_role executa as três RPCs');

-- =============================================================================================
-- save — criar
-- =============================================================================================
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'idempotency_key', 'probe-idem-1', 'token_hash', 'probe-hash-1',
  'expires_at', (now() + interval '7 days')::text))) as r1 \gset
select (:'r1'::jsonb->>'id') as prop \gset
select pg_temp.confere((:'r1'::jsonb->>'created')::boolean and (:'r1'::jsonb->>'version')::int = 1,
  'save cria a proposta na versão 1');
select pg_temp.confere((:'r1'::jsonb->>'number') ~ '^P-[0-9]{4,}$', 'o número tem a forma P-0000');
select pg_temp.confere(
  (select count(*) from public.order_proposal_items where proposal_id = :'prop') = 2
  and (select string_agg(product_name, ',' order by position) from public.order_proposal_items where proposal_id = :'prop')
      = 'Pingente Probe,Anel Probe',
  'as duas linhas gravadas na ordem do array');
select pg_temp.confere(
  (select customer_email from public.order_proposals where id = :'prop') = 'probe.nova@exemplo.invalid',
  'o e-mail é gravado normalizado (minúsculo e aparado)');
select pg_temp.confere(
  (select count(*) from public.customers where lower(btrim(email)) = 'probe.nova@exemplo.invalid' and user_id is null) = 1
  and (select customer_id from public.order_proposals where id = :'prop')
      = (select id from public.customers where lower(btrim(email)) = 'probe.nova@exemplo.invalid'),
  'cliente nova: a ficha nasce SEM conta e a proposta aponta para ela (A-09)');
select pg_temp.confere(
  (select array_agg(kind) from public.order_proposal_events where proposal_id = :'prop') = array['created'],
  'o histórico registra created');

-- Duplo clique: mesma chave, mesma proposta, nada novo.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'idempotency_key', 'probe-idem-1', 'token_hash', 'probe-hash-outro',
  'expires_at', (now() + interval '7 days')::text))) as r1b \gset
select pg_temp.confere((:'r1b'::jsonb->>'id') = :'prop' and (:'r1b'::jsonb->>'reused')::boolean
  and (select count(*) from public.order_proposals where idempotency_key = 'probe-idem-1') = 1,
  'mesma idempotency_key devolve a MESMA proposta (reused)');

-- Dedupe de e-mail: outra proposta para o mesmo e-mail, em outra grafia, não cria segunda ficha.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'customer_email', 'PROBE.NOVA@exemplo.invalid',
  'idempotency_key', 'probe-idem-2', 'token_hash', 'probe-hash-2',
  'expires_at', (now() + interval '7 days')::text))) as r2 \gset
select pg_temp.confere(
  (select count(*) from public.customers where lower(btrim(email)) = 'probe.nova@exemplo.invalid') = 1
  and (:'r2'::jsonb->>'customer_id') = (:'r1'::jsonb->>'customer_id'),
  'mesmo e-mail em outra grafia reusa a ficha — nunca duas (MON-03)');

-- Ficha antiga com o e-mail em CAIXA ALTA e espaço (como as importadas): é achada, não duplicada.
insert into public.customers (user_id, name, email) values (null, 'Ficha Antiga', ' Probe.Antiga@Exemplo.Invalid');
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'customer_email', 'probe.antiga@exemplo.invalid',
  'idempotency_key', 'probe-idem-a', 'token_hash', 'probe-hash-a',
  'expires_at', (now() + interval '7 days')::text))) as ra \gset
select pg_temp.confere(
  (select count(*) from public.customers where lower(btrim(email)) = 'probe.antiga@exemplo.invalid') = 1
  and (:'ra'::jsonb->>'customer_id') = (select id::text from public.customers where name = 'Ficha Antiga'),
  'ficha antiga em outra grafia é reusada pela comparação lower(btrim) — nunca duas');

-- Ficha escolhida com e-mail de outra pessoa é recusada.
select (select id from public.customers where user_id is not null order by created_at limit 1) as ficha_conta \gset
select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
    'customer_id', :'ficha_conta', 'idempotency_key', 'probe-idem-x', 'token_hash', 'probe-hash-x',
    'expires_at', (now() + interval '7 days')::text)))->>'error' = 'customer_email_mismatch',
  'customer_id cujo e-mail não é o da proposta é recusado');

select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object('items', '[]'::jsonb,
    'idempotency_key', 'probe-idem-v', 'token_hash', 'probe-hash-v',
    'expires_at', (now() + interval '7 days')::text)))->>'error' = 'no_items',
  'sem itens recusa no_items');
select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
    'items', (select jsonb_agg(jsonb_build_object('product_id', gen_random_uuid(), 'product_name', 'x',
              'quantity', 1, 'list_price', 1, 'unit_price', 1)) from generate_series(1, 31)),
    'idempotency_key', 'probe-idem-31', 'token_hash', 'probe-hash-31',
    'expires_at', (now() + interval '7 days')::text)))->>'error' = 'too_many_lines',
  '31 linhas recusa too_many_lines');

savepoint itens_abaixo;
do $$
begin
  perform public.save_order_proposal(pg_temp.corpo(jsonb_build_object('items_total', 0.99,
    'idempotency_key', 'probe-idem-z', 'token_hash', 'probe-hash-z',
    'expires_at', (now() + interval '7 days')::text)));
  raise exception 'PROBE FALHOU: itens abaixo de R$ 1,00 foram aceitos';
exception when check_violation then
  raise notice 'ok — itens abaixo de R$ 1,00 são recusados pelo check (A-12)';
end;
$$;
rollback to savepoint itens_abaixo;

savepoint qtd;
do $$
begin
  perform public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'product_name', 'x',
      'quantity', 100, 'list_price', 1, 'unit_price', 1)),
    'idempotency_key', 'probe-idem-q', 'token_hash', 'probe-hash-q',
    'expires_at', (now() + interval '7 days')::text)));
  raise exception 'PROBE FALHOU: quantidade 100 foi aceita';
exception when check_violation then
  raise notice 'ok — quantidade 100 é recusada pelo check';
end;
$$;
rollback to savepoint qtd;

savepoint motivo;
do $$
begin
  perform public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
    'manual_discount_reason', repeat('a', 121),
    'idempotency_key', 'probe-idem-m', 'token_hash', 'probe-hash-m',
    'expires_at', (now() + interval '7 days')::text)));
  raise exception 'PROBE FALHOU: motivo de 121 caracteres foi aceito';
exception when check_violation then
  raise notice 'ok — motivo de 121 caracteres é recusado pelo check';
end;
$$;
rollback to savepoint motivo;

-- =============================================================================================
-- save — editar e versionar (CON-10, edge case "sem mudança")
-- =============================================================================================
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'prop', 'version', 1))) as e0 \gset
select pg_temp.confere(not (:'e0'::jsonb->>'changed')::boolean and (:'e0'::jsonb->>'version')::int = 1
  and (select version from public.order_proposals where id = :'prop') = 1
  and (select count(*) from public.order_proposal_events where proposal_id = :'prop') = 1,
  'editar sem mudar nada não sobe a versão nem grava evento');

-- O mesmo conteúdo com números em outra grafia (10 × 10.00) continua "sem mudança".
select pg_temp.confere(
  not (public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'prop', 'version', 1,
    'subtotal', '200.00', 'items_total', 160.0)))->>'changed')::boolean,
  '200 e 200.00 são o mesmo conteúdo');

select public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'prop', 'version', 1,
  'address_number', '42'))) as e1 \gset
select pg_temp.confere((:'e1'::jsonb->>'changed')::boolean and (:'e1'::jsonb->>'version')::int = 2
  and (select address_number from public.order_proposals where id = :'prop') = '42'
  and (select array_agg(kind order by created_at, kind) from public.order_proposal_events where proposal_id = :'prop')
      @> array['created', 'edited'],
  'editar com mudança sobe para a versão 2 e grava edited');

select pg_temp.confere(
  (select count(*) from public.order_proposal_items where proposal_id = :'prop') = 2,
  'as linhas foram regravadas, não duplicadas');

select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'prop', 'version', 1,
    'address_number', '43')))->>'error' = 'version_conflict'
  and (select address_number from public.order_proposals where id = :'prop') = '42',
  'versão velha recusa version_conflict e não grava (duas abas)');

select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', gen_random_uuid(), 'version', 1)))->>'error' = 'not_found',
  'editar proposta inexistente recusa not_found');

-- =============================================================================================
-- mark_order_proposal_viewed (CON-11)
-- =============================================================================================
select pg_temp.confere(public.mark_order_proposal_viewed(:'prop'), 'a primeira visita marca vista');
select pg_temp.confere(not public.mark_order_proposal_viewed(:'prop')
  and (select count(*) from public.order_proposal_events where proposal_id = :'prop' and kind = 'viewed') = 1,
  'a segunda visita não marca de novo — um evento só');

-- =============================================================================================
-- create_order_from_proposal (CON-06, CON-10, PRC-03)
-- =============================================================================================
create function pg_temp.pedido() returns jsonb language sql as $f$
  select jsonb_build_object(
    'customer_name', 'Cliente Probe Editado', 'customer_phone', '51988887777',
    'customer_document', '12345678909', 'payment_method', 'pix',
    'address_zip', '90000000', 'address_street', 'Rua Probe', 'address_number', '42',
    'address_neighborhood', 'Centro', 'address_city', 'Porto Alegre', 'address_state', 'RS',
    'shipping_service_id', '1', 'shipping_carrier', 'Correios', 'shipping_method', 'PAC',
    'shipping_cost', 25.5, 'total', 185.5, 'material_status', 'aguardando_material',
    'client_request_id', 'probe-crid-1',
    -- o corpo tentando mandar itens e preço: tem de ser ignorado
    'subtotal', 1, 'items', '[]'::jsonb, 'customer_email', 'outra@exemplo.invalid')
$f$;

select pg_temp.confere(
  public.create_order_from_proposal(:'prop', 1, pg_temp.pedido())->>'error' = 'proposal_changed'
  and not exists (select 1 from public.orders where proposal_id = :'prop'),
  'versão velha recusa proposal_changed sem criar pedido');

select public.create_order_from_proposal(:'prop', 2, pg_temp.pedido()) as c1 \gset
select (:'c1'::jsonb->>'order_id') as pedido \gset
select pg_temp.confere(not (:'c1'::jsonb->>'reused')::boolean and :'pedido' <> '',
  'create_order_from_proposal cria o pedido');
select pg_temp.confere(
  (select proposal_id from public.orders where id = :'pedido') = :'prop'::uuid
  and (select customer_email from public.orders where id = :'pedido') = 'probe.nova@exemplo.invalid'
  and (select subtotal from public.orders where id = :'pedido') = 200
  and (select discount from public.orders where id = :'pedido') = 20
  and (select manual_discount from public.orders where id = :'pedido') = 20
  and (select customer_name from public.orders where id = :'pedido') = 'Cliente Probe Editado'
  and (select customer_id from public.orders where id = :'pedido')
      = (select customer_id from public.order_proposals where id = :'prop'),
  'o pedido leva proposal_id, o e-mail e os valores DA PROPOSTA (o corpo é ignorado) e o contato editado');
select pg_temp.confere(
  (select count(*) from public.order_items where order_id = :'pedido') = 2
  and (select sum(quantity * unit_price) from public.order_items where order_id = :'pedido') = 200
  and (select engraving_text from public.order_items where order_id = :'pedido' and product_name = 'Anel Probe') = 'Ana'
  and (select requires_material from public.order_items where order_id = :'pedido' and product_name = 'Pingente Probe'),
  'os itens do pedido vêm das linhas travadas da proposta');
select pg_temp.confere(
  (select status from public.order_proposals where id = :'prop') = 'completed'
  and (select order_id from public.order_proposals where id = :'prop') = :'pedido'::uuid
  and exists (select 1 from public.order_proposal_events where proposal_id = :'prop' and kind = 'completed'),
  'a proposta vira concluída com o order_id, na mesma transação');

select public.create_order_from_proposal(:'prop', 2, pg_temp.pedido() || '{"client_request_id":"probe-crid-2"}') as c2 \gset
select pg_temp.confere((:'c2'::jsonb->>'order_id') = :'pedido' and (:'c2'::jsonb->>'reused')::boolean
  and (select count(*) from public.orders where proposal_id = :'prop') = 1,
  'a segunda chamada devolve O MESMO pedido');
select pg_temp.confere(
  (public.create_order_from_proposal(:'prop', 1, pg_temp.pedido())->>'order_id') = :'pedido',
  'concluída devolve o pedido mesmo com versão velha (segundo aparelho)');

select pg_temp.confere(
  public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'prop', 'version', 2)))->>'error' = 'not_open',
  'editar proposta concluída recusa not_open');

-- Expirada e cancelada.
update public.order_proposals set expires_at = now() - interval '1 second' where id = (:'r2'::jsonb->>'id')::uuid;
select pg_temp.confere(
  public.create_order_from_proposal((:'r2'::jsonb->>'id')::uuid, 1, pg_temp.pedido() || '{"client_request_id":"probe-crid-3"}')->>'error' = 'unavailable'
  and public.save_order_proposal(pg_temp.corpo(jsonb_build_object('id', :'r2'::jsonb->>'id', 'version', 1)))->>'error' = 'expired',
  'expirada recusa a conclusão (unavailable) e a edição (expired)');

select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'idempotency_key', 'probe-idem-c', 'token_hash', 'probe-hash-c',
  'expires_at', (now() + interval '7 days')::text))) as r3 \gset
update public.order_proposals set status = 'cancelled' where id = (:'r3'::jsonb->>'id')::uuid;
select pg_temp.confere(
  public.create_order_from_proposal((:'r3'::jsonb->>'id')::uuid, 1, pg_temp.pedido() || '{"client_request_id":"probe-crid-4"}')->>'error' = 'unavailable'
  and not exists (select 1 from public.orders where proposal_id = (:'r3'::jsonb->>'id')::uuid),
  'cancelada recusa a conclusão sem criar pedido');
select pg_temp.confere(not public.mark_order_proposal_viewed((:'r3'::jsonb->>'id')::uuid),
  'cancelada não é marcada como vista');

-- =============================================================================================
-- A adoção da ficha quando a conta nasce (A-09, CON-12). O insert em auth.users roda como o
-- dono do banco local; quem decide a passagem pelo gatilho da 59 é o `current_user` DENTRO da
-- função `security definer` (o dono dela), o mesmo que vale quando o GoTrue insere.
-- =============================================================================================
select (select customer_id from public.order_proposals where id = :'prop') as ficha \gset
select gen_random_uuid() as novo_user \gset
insert into auth.users (id, email, raw_user_meta_data)
values (:'novo_user', 'probe.nova@exemplo.invalid', '{"full_name": "Nome da Conta"}');
select pg_temp.confere(
  (select user_id from public.customers where id = :'ficha') = :'novo_user'::uuid
  and (select count(*) from public.customers where lower(btrim(email)) = 'probe.nova@exemplo.invalid') = 1,
  'a conta nova ADOTA a ficha sem conta do mesmo e-mail — nenhuma segunda ficha');
select pg_temp.confere((select name from public.customers where id = :'ficha') = 'Cliente Probe',
  'a adoção mantém o nome que a ficha já tinha');
select pg_temp.confere(
  (select customer_id from public.orders where id = :'pedido') = :'ficha'::uuid,
  'o pedido da proposta continua ligado à ficha, agora com conta');

-- E o caminho de sempre: e-mail sem ficha cria a ficha da conta, e adota pedido órfão.
select gen_random_uuid() as user_sem_ficha \gset
insert into public.orders (customer_email, customer_name, subtotal, total, payment_method)
values ('Probe.Orfa@Exemplo.Invalid', 'Órfã', 10, 10, 'pix');
insert into auth.users (id, email, raw_user_meta_data)
values (:'user_sem_ficha', 'probe.orfa@exemplo.invalid', '{"full_name": "Órfã"}');
select pg_temp.confere(
  (select count(*) from public.customers where user_id = :'user_sem_ficha') = 1
  and (select customer_id from public.orders where customer_email = 'Probe.Orfa@Exemplo.Invalid')
      = (select id from public.customers where user_id = :'user_sem_ficha'),
  'sem ficha: a conta cria a dela e adota o pedido órfão (ESP-22 intacto)');

-- Fecho da rodada 1 do Verifier (P03): a adoção só pega ficha SEM conta. Uma ficha que já é de
-- outra conta, com o mesmo e-mail, não pode ser roubada pela conta nova — ela ganha a dela.
select gen_random_uuid() as user_a \gset
select gen_random_uuid() as user_b \gset
insert into auth.users (id, email, raw_user_meta_data)
values (:'user_a', 'probe.conta-a@exemplo.invalid', '{"full_name": "Conta A"}');
update public.customers set email = 'probe.compartilhado@exemplo.invalid' where user_id = :'user_a';
insert into auth.users (id, email, raw_user_meta_data)
values (:'user_b', 'Probe.Compartilhado@Exemplo.Invalid', '{"full_name": "Conta B"}');
select pg_temp.confere(
  (select count(*) from public.customers where user_id = :'user_a') = 1
  and (select count(*) from public.customers where user_id = :'user_b') = 1
  and (select id from public.customers where user_id = :'user_a') <> (select id from public.customers where user_id = :'user_b'),
  'a ficha que já tem conta não é adotada por outra conta do mesmo e-mail (A-09)');

-- A cliente logada não troca o user_id da própria ficha (o gatilho da 59 segue de pé).
savepoint guarda59;
-- A ficha recém-adotada é de uma conta SEM papel de admin (o admin do seed passaria pela saída
-- do `has_role` e o caso mediria nada).
select set_config('probe.ficha', :'ficha', true), set_config('probe.user', :'novo_user', true) \gset
do $$
declare v_user uuid := current_setting('probe.user')::uuid; v_ficha uuid := current_setting('probe.ficha')::uuid;
        v_n integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.customers set user_id = null where id = v_ficha;
  get diagnostics v_n = row_count;
  raise exception 'PROBE FALHOU: a cliente trocou o próprio user_id (% linha)', v_n;
exception when insufficient_privilege then
  if sqlerrm not like '%dono deste cadastro%' then
    raise exception 'PROBE FALHOU: a recusa veio de outro lugar: %', sqlerrm;
  end if;
  raise notice 'ok — a cliente logada continua sem poder trocar o user_id (guard_customer_identity)';
end;
$$;
rollback to savepoint guarda59;

-- Fecho da rodada 2 do Verifier (R39, CON-12/A-08): para o mesmo e-mail, sem `customer_id` no
-- corpo, a ficha COM conta vence a ficha sem conta. A sem conta é a MAIS ANTIGA, para o
-- `created_at` do desempate não decidir por acaso. Invertida a ordem, o pedido montado iria para a
-- ficha órfã e não apareceria em /conta.
select gen_random_uuid() as user_c \gset
insert into auth.users (id, email, raw_user_meta_data)
values (:'user_c', 'probe.conta-c@exemplo.invalid', '{"full_name": "Conta C"}');
update public.customers set email = 'probe.duas-fichas@exemplo.invalid', created_at = now()
 where user_id = :'user_c';
insert into public.customers (user_id, name, email, created_at)
values (null, 'Ficha Sem Conta', 'Probe.Duas-Fichas@Exemplo.Invalid', now() - interval '30 days');
select pg_temp.confere(
  (select count(*) from public.customers where lower(btrim(email)) = 'probe.duas-fichas@exemplo.invalid') = 2
  and (select count(*) from public.customers where lower(btrim(email)) = 'probe.duas-fichas@exemplo.invalid' and user_id is null) = 1
  and (select created_at from public.customers where name = 'Ficha Sem Conta')
      < (select created_at from public.customers where user_id = :'user_c'),
  'fixtura: o mesmo e-mail com uma ficha com conta e uma sem conta, a sem conta mais antiga');
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'customer_email', 'probe.duas-fichas@exemplo.invalid',
  'idempotency_key', 'probe-idem-duas', 'token_hash', 'probe-hash-duas',
  'expires_at', (now() + interval '7 days')::text))) as rd \gset
select pg_temp.confere(
  (:'rd'::jsonb->>'customer_id') = (select id::text from public.customers where user_id = :'user_c')
  and (select customer_id::text from public.order_proposals where id = (:'rd'::jsonb->>'id')::uuid)
      = (select id::text from public.customers where user_id = :'user_c'),
  'sem customer_id no corpo, a ficha COM conta vence a sem conta do mesmo e-mail (CON-12, A-08)');

-- Fecho da rodada 3 do Verifier (P07, PRC-03): o pedido copia o preço TRAVADO da linha
-- (`unit_price`), nunca o de tabela (`list_price`). Toda fixtura acima tinha as duas colunas
-- iguais, e trocar uma pela outra no `insert into order_items` passava. Aqui uma linha tem
-- promoção travada (150 de tabela, 120 travado): trocadas as colunas, o pedido nasceria a preço
-- cheio e o `create-payment` recusaria o pagamento por divergência de linha.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'idempotency_key', 'probe-idem-promo', 'token_hash', 'probe-hash-promo',
  'expires_at', (now() + interval '7 days')::text,
  'subtotal', 230, 'promotion_discount', 30,
  'items', jsonb_build_array(
    jsonb_build_object('product_id', '11111111-1111-1111-1111-111111111111',
      'product_name', 'Pingente Promo', 'quantity', 1, 'list_price', 150, 'unit_price', 120),
    jsonb_build_object('product_id', '22222222-2222-2222-2222-222222222222',
      'product_name', 'Anel Sem Promo', 'quantity', 2, 'list_price', 40, 'unit_price', 40))))) as rp \gset
select pg_temp.confere(
  (select list_price from public.order_proposal_items
    where proposal_id = (:'rp'::jsonb->>'id')::uuid and product_name = 'Pingente Promo') = 150
  and (select unit_price from public.order_proposal_items
    where proposal_id = (:'rp'::jsonb->>'id')::uuid and product_name = 'Pingente Promo') = 120,
  'fixtura: a linha da proposta tem preço de tabela 150 e travado 120');
select public.create_order_from_proposal((:'rp'::jsonb->>'id')::uuid, 1,
  pg_temp.pedido() || '{"client_request_id":"probe-crid-promo"}') as cp \gset
select pg_temp.confere(
  (select unit_price from public.order_items
    where order_id = (:'cp'::jsonb->>'order_id')::uuid and product_name = 'Pingente Promo') = 120
  and (select sum(quantity * unit_price) from public.order_items
    where order_id = (:'cp'::jsonb->>'order_id')::uuid) = 200,
  'o item do pedido leva o preço TRAVADO da linha (120), não o de tabela (150) (PRC-03, P07)');

rollback;
