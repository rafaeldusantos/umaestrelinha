-- WI 94 · tarefa 02 (lado banco) — a cifra do token e o endereço salvo pela gravação da proposta.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql
--
-- `begin … rollback`: reaplica a migration DO DISCO dentro da transação (ela é idempotente: `add
-- column if not exists` e `create or replace`), grava fixturas e desfaz tudo. Exit 0 e só `ok —`.
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

\ir ../../../../supabase/migrations/20261111120000_94-link-sempre-e-endereco.sql

create function pg_temp.corpo(extra jsonb) returns jsonb language sql as $f$
  select jsonb_build_object(
    'customer_name', 'Cliente Probe 94',
    'customer_email', 'probe94.nova@exemplo.invalid',
    'customer_phone', '51999990000',
    'address_zip', '91240-010', 'address_street', ' Rua das Flores ', 'address_number', '10',
    'address_complement', null, 'address_neighborhood', 'Centro', 'address_city', 'Porto Alegre',
    'address_state', 'rs',
    'subtotal', 120, 'promotion_discount', 0, 'coupon_discount', 0, 'manual_discount', 0,
    'items_total', 120,
    'items', jsonb_build_array(
      jsonb_build_object('product_id', '11111111-1111-1111-1111-111111111111',
        'product_name', 'Pingente Probe', 'quantity', 1, 'list_price', 120, 'unit_price', 120))
  ) || extra
$f$;

-- =============================================================================================
-- Forma
-- =============================================================================================
select pg_temp.confere(
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'order_proposals' and column_name = 'token_cipher'
             and data_type = 'text'),
  'order_proposals.token_cipher existe (text)');
select pg_temp.confere(
  not exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'order_proposals' and column_name = 'token'),
  'nenhuma coluna guarda o token em claro');
select pg_temp.confere(
  (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'public.save_order_proposal(jsonb)'::regprocedure)
  and not has_function_privilege('anon', 'public.save_order_proposal(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.save_order_proposal(jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.save_order_proposal(jsonb)', 'execute'),
  'save_order_proposal segue security definer, search_path vazio, execute só da service_role');

-- =============================================================================================
-- Criar com save_address: proposta, ficha nova, endereço e cifra NA MESMA gravação
-- =============================================================================================
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'save_address', true, 'idempotency_key', 'probe94-1', 'token_hash', 'probe94-hash-1',
  'token_cipher', 'v1.cifra-probe', 'expires_at', (now() + interval '7 days')::text))) as r1 \gset
select (:'r1'::jsonb->>'id') as prop, (:'r1'::jsonb->>'customer_id') as ficha \gset
select pg_temp.confere((:'r1'::jsonb->>'created')::boolean, 'a proposta nasce');
select pg_temp.confere(
  (select token_cipher from public.order_proposals where id = :'prop') = 'v1.cifra-probe'
  and (select token_hash from public.order_proposals where id = :'prop') = 'probe94-hash-1',
  'hash e cifra gravados juntos ao criar');
select pg_temp.confere(
  (select count(*) from public.order_proposals where token_hash = 'probe94-hash-1') = 1,
  'a proposta continua achável pelo hash (é por ele que a checkout abre o link)');
select pg_temp.confere(
  (select count(*) from public.customers where lower(btrim(email)) = 'probe94.nova@exemplo.invalid') = 1,
  'uma ficha só para o e-mail');
select pg_temp.confere(
  (select count(*) from public.addresses where customer_id = :'ficha') = 1
  and (select cep || '|' || street || '|' || number || '|' || coalesce(complement, '∅') || '|' || state || '|' || label
         from public.addresses where customer_id = :'ficha') = '91240010|Rua das Flores|10|∅|RS|Casa',
  'o endereço vai à ficha recém-criada: CEP só com dígitos, rua aparada, UF maiúscula');
select pg_temp.confere(
  (select is_default from public.addresses where customer_id = :'ficha') = true,
  'o primeiro endereço da ficha vira o padrão');

-- Editar só a observação e mandar uma cifra diferente: nada disso é conteúdo, a versão não sobe.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'id', :'prop', 'version', 1, 'save_address', true, 'admin_note', 'só para o ateliê',
  'token_cipher', 'v1.outra-cifra'))) as r1b \gset
select pg_temp.confere(
  (:'r1b'::jsonb->>'changed')::boolean = false and (:'r1b'::jsonb->>'version')::int = 1
  and (select version from public.order_proposals where id = :'prop') = 1,
  'a observação e a cifra no corpo não sobem a versão');
select pg_temp.confere(
  (select token_cipher from public.order_proposals where id = :'prop') = 'v1.cifra-probe',
  'editar não troca a cifra (o link continua o mesmo)');
select pg_temp.confere(
  (select count(*) from public.addresses where customer_id = :'ficha') = 1,
  'o mesmo endereço com a caixa marcada de novo não duplica');

-- Endereço novo na mesma ficha: entra, mas NÃO como padrão (`addresses_one_default`).
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'id', :'prop', 'version', 1, 'save_address', true, 'address_street', 'Av. Ipiranga',
  'address_number', '200'))) as r1c \gset
select pg_temp.confere((:'r1c'::jsonb->>'version')::int = 2, 'o endereço mudou: é conteúdo, a versão sobe');
select pg_temp.confere(
  (select count(*) from public.addresses where customer_id = :'ficha') = 2
  and (select count(*) from public.addresses where customer_id = :'ficha' and is_default) = 1
  and (select is_default from public.addresses where customer_id = :'ficha' and street = 'Av. Ipiranga') = false,
  'o segundo endereço entra sem ser padrão — um padrão só por ficha');

-- Sem save_address: a proposta grava e o cadastro não muda.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'idempotency_key', 'probe94-2', 'token_hash', 'probe94-hash-2', 'address_street', 'Rua Sem Cadastro',
  'expires_at', (now() + interval '7 days')::text))) as r2 \gset
select pg_temp.confere(
  (:'r2'::jsonb->>'customer_id') = :'ficha'
  and (select count(*) from public.addresses where customer_id = :'ficha') = 2
  and (select token_cipher from public.order_proposals where id = (:'r2'::jsonb->>'id')::uuid) is null,
  'sem save_address o cadastro não muda; sem cifra no corpo, só o hash (D-28)');

-- save_address como texto ("true" entre aspas) não é a escolha da Adri: não grava.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'save_address', 'true', 'idempotency_key', 'probe94-3', 'token_hash', 'probe94-hash-3',
  'address_street', 'Rua Texto', 'expires_at', (now() + interval '7 days')::text))) as r3 \gset
select pg_temp.confere(
  (select count(*) from public.addresses where customer_id = :'ficha' and street = 'Rua Texto') = 0,
  'só o booleano true grava o endereço');

-- Ficha escolhida (customer_id): o endereço vai para ELA, sem segunda ficha.
insert into public.customers (user_id, name, email) values (null, 'Ficha Escolhida 94', 'probe94.escolhida@exemplo.invalid');
select id as escolhida from public.customers where email = 'probe94.escolhida@exemplo.invalid' \gset
insert into public.addresses (customer_id, cep, street, number, neighborhood, city, state, is_default)
values (:'escolhida', '90000000', 'Rua Antiga', '1', 'B', 'C', 'RS', true);
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'customer_id', :'escolhida', 'customer_email', 'probe94.escolhida@exemplo.invalid',
  'save_address', true, 'idempotency_key', 'probe94-4', 'token_hash', 'probe94-hash-4',
  'expires_at', (now() + interval '7 days')::text))) as r4 \gset
select pg_temp.confere(
  (:'r4'::jsonb->>'customer_id') = :'escolhida'
  and (select count(*) from public.customers where lower(btrim(email)) = 'probe94.escolhida@exemplo.invalid') = 1
  and (select count(*) from public.addresses where customer_id = :'escolhida') = 2
  and (select count(*) from public.addresses where customer_id = :'escolhida' and is_default) = 1
  and (select is_default from public.addresses where customer_id = :'escolhida' and street = 'Rua das Flores') = false,
  'a ficha escolhida recebe o endereço, sem roubar o padrão e sem segunda ficha');

-- Sem CEP ou sem rua, não há endereço para salvar.
select public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
  'customer_email', 'probe94.semcep@exemplo.invalid', 'address_zip', '', 'save_address', true,
  'idempotency_key', 'probe94-5', 'token_hash', 'probe94-hash-5',
  'expires_at', (now() + interval '7 days')::text))) as r5 \gset
select pg_temp.confere(
  (select count(*) from public.addresses where customer_id = (:'r5'::jsonb->>'customer_id')::uuid) = 0,
  'sem CEP, nada vai ao cadastro');

-- =============================================================================================
-- Falha no endereço ⇒ NADA gravado (nem a proposta, nem a ficha)
-- =============================================================================================
alter table public.addresses add constraint probe94_falha check (street <> 'FALHA');
savepoint falha;
do $$
begin
  perform public.save_order_proposal(pg_temp.corpo(jsonb_build_object(
    'customer_email', 'probe94.falha@exemplo.invalid', 'save_address', true, 'address_street', 'FALHA',
    'idempotency_key', 'probe94-f', 'token_hash', 'probe94-hash-f',
    'expires_at', (now() + interval '7 days')::text)));
  raise exception 'PROBE FALHOU: a gravação com o endereço recusado passou';
exception when check_violation then
  if exists (select 1 from public.order_proposals where idempotency_key = 'probe94-f')
     or exists (select 1 from public.customers where email = 'probe94.falha@exemplo.invalid') then
    raise exception 'PROBE FALHOU: sobrou proposta ou ficha da gravação que falhou';
  end if;
  raise notice 'ok — o endereço recusado desfaz a gravação inteira: nem proposta, nem ficha';
end;
$$;
rollback to savepoint falha;
select pg_temp.confere(
  (select count(*) from public.order_proposals where idempotency_key = 'probe94-f') = 0
  and (select count(*) from public.customers where email = 'probe94.falha@exemplo.invalid') = 0,
  'depois da falha, a proposta e a ficha não existem');

rollback;
