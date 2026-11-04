-- WI 95 · C-01, C-02 — a observação da proposta (tarefa 02).
--
-- Contra o banco LOCAL, tudo numa transação desfeita no fim (nenhum dado muda):
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/95-observacao-do-pedido/probes/02-observacao-da-proposta.sql
--
-- Exit 0 com só `ok —` é a prova. A migration é reaplicada do DISCO dentro da transação (as duas
-- funções são `create or replace` e a coluna é `if not exists`), para o probe medir o arquivo. A peça e
-- a conta vêm do próprio banco (nada de id cravado). O que se prova:
--   1. a observação gravada ao criar;
--   2. só a observação mudando: não sobe a versão nem gera `edited`;
--   3. o corpo SEM a chave (o `renew`, que não a manda) não a apaga — nem no save de conteúdo;
--   4. o save de conteúdo sobe a versão e mantém a nota;
--   5. a conversão copia a nota para `order_admin_notes` na mesma transação, com o autor da proposta,
--      e a coluna da proposta fica congelada; proposta sem nota não cria linha.

begin;

\ir ../../../../supabase/migrations/20261109120000_95-observacao-da-proposta.sql

create function pg_temp.falha(msg text) returns void language plpgsql as $$
begin raise exception 'FALHOU — %', msg; end $$;

create function pg_temp.ok(msg text) returns void language plpgsql as $$
begin raise notice 'ok — %', msg; end $$;

do $$
declare
  v_prod public.products;
  v_admin uuid;
  v_base jsonb;
  v_r jsonb;
  v_id uuid;
  v_sem uuid;
  v_row public.order_proposals;
  v_n int;
  v_order uuid;
  v_nota public.order_admin_notes;
  v_pedido jsonb := jsonb_build_object(
    'customer_phone', '51999990000', 'customer_document', '12345678909', 'payment_method', 'pix',
    'address_zip', '90010000', 'address_street', 'Rua A', 'address_number', '1',
    'address_neighborhood', 'Centro', 'address_city', 'Porto Alegre', 'address_state', 'RS',
    'shipping_service_id', '1', 'shipping_carrier', 'Correios', 'shipping_method', 'PAC',
    'shipping_cost', 0, 'total', 100, 'material_status', 'nao_aplicavel', 'client_request_id', gen_random_uuid()::text);
begin
  select * into v_prod from public.products where is_active order by created_at limit 1;
  if v_prod.id is null then perform pg_temp.falha('nenhuma peça ativa no banco local'); end if;
  select ur.user_id into v_admin from public.user_roles ur where ur.role = 'admin' limit 1;
  if v_admin is null then perform pg_temp.falha('nenhuma conta admin no banco local'); end if;

  v_base := jsonb_build_object(
    'customer_name', 'Probe Observação', 'customer_email', 'probe-observacao-95@exemplo.invalid',
    'subtotal', 100, 'items_total', 100, 'promotion_discount', 0, 'actor', v_admin,
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'variant_id', null, 'product_name', v_prod.name, 'quantity', 1,
      'list_price', 100, 'unit_price', 100, 'requires_material', false, 'material_kinds', '[]'::jsonb)));

  -- 1. criar com a observação
  v_r := public.save_order_proposal(v_base || jsonb_build_object(
    'idempotency_key', 'probe-95-a', 'token_hash', 'hash-probe-95-a', 'expires_at', now() + interval '7 days',
    'admin_note', '  Nota A  '));
  if v_r ? 'error' then perform pg_temp.falha('criar: ' || (v_r->>'error')); end if;
  v_id := (v_r->>'id')::uuid;
  select * into v_row from public.order_proposals where id = v_id;
  if v_row.admin_note is distinct from 'Nota A' or v_row.version <> 1 then
    perform pg_temp.falha(format('criar gravou nota=%s versao=%s', v_row.admin_note, v_row.version));
  end if;
  perform pg_temp.ok('criar grava a observação aparada, versão 1');

  -- 2. só a observação muda
  v_r := public.save_order_proposal(v_base || jsonb_build_object('id', v_id, 'version', 1, 'admin_note', 'Nota B'));
  select * into v_row from public.order_proposals where id = v_id;
  select count(*) into v_n from public.order_proposal_events where proposal_id = v_id and kind = 'edited';
  if v_r->>'changed' <> 'false' or v_row.version <> 1 or v_n <> 0 or v_row.admin_note is distinct from 'Nota B' then
    perform pg_temp.falha(format('só a nota: changed=%s versao=%s edited=%s nota=%s', v_r->>'changed', v_row.version, v_n, v_row.admin_note));
  end if;
  perform pg_temp.ok('só a observação mudando: grava, não sobe a versão, nenhum edited');

  -- 3a. corpo sem a chave, sem mudança de conteúdo
  v_r := public.save_order_proposal(v_base || jsonb_build_object('id', v_id, 'version', 1));
  select * into v_row from public.order_proposals where id = v_id;
  if v_row.admin_note is distinct from 'Nota B' or v_row.version <> 1 then
    perform pg_temp.falha('corpo sem a chave apagou a nota ou subiu a versão');
  end if;
  perform pg_temp.ok('corpo sem a chave não apaga a observação');

  -- 3b. o renew: a troca direta do link (sobe a versão) e o save dos preços novos, SEM a nota
  update public.order_proposals set token_hash = 'hash-probe-95-renovado', version = version + 1 where id = v_id;
  v_r := public.save_order_proposal(
    jsonb_set(jsonb_set(v_base, '{items,0,unit_price}', '90'), '{items_total}', '90')
      || jsonb_build_object('id', v_id, 'version', 2));
  select * into v_row from public.order_proposals where id = v_id;
  if v_r ? 'error' or v_r->>'changed' <> 'true' or v_row.version <> 3 or v_row.admin_note is distinct from 'Nota B' then
    perform pg_temp.falha(format('renew: r=%s versao=%s nota=%s', v_r, v_row.version, v_row.admin_note));
  end if;
  perform pg_temp.ok('renew (troca do link + save de conteúdo sem a chave) não apaga a observação');

  -- 4. save de conteúdo com a nota: sobe a versão, um edited, nota trocada
  v_r := public.save_order_proposal(
    jsonb_set(v_base, '{items,0,quantity}', '2') || jsonb_build_object('id', v_id, 'version', 3, 'admin_note', 'Nota C'));
  select * into v_row from public.order_proposals where id = v_id;
  select count(*) into v_n from public.order_proposal_events where proposal_id = v_id and kind = 'edited';
  if v_row.version <> 4 or v_n <> 2 or v_row.admin_note is distinct from 'Nota C' then
    perform pg_temp.falha(format('conteúdo: versao=%s edited=%s nota=%s', v_row.version, v_n, v_row.admin_note));
  end if;
  perform pg_temp.ok('save de conteúdo sobe a versão e grava a observação junto');

  -- vazia apaga
  v_r := public.save_order_proposal(
    jsonb_set(v_base, '{items,0,quantity}', '2') || jsonb_build_object('id', v_id, 'version', 4, 'admin_note', '   '));
  select * into v_row from public.order_proposals where id = v_id;
  if v_row.admin_note is not null or v_row.version <> 4 then perform pg_temp.falha('vazia não apagou'); end if;
  update public.order_proposals set admin_note = 'Nota final' where id = v_id;
  perform pg_temp.ok('vazia apaga (null), sem subir a versão');

  -- check do teto
  begin
    update public.order_proposals set admin_note = repeat('a', 1001) where id = v_id;
    perform pg_temp.falha('o check aceitou 1001');
  exception when check_violation then
    perform pg_temp.ok('o check recusa 1001 caracteres');
  end;

  -- 5. a conversão copia
  v_r := public.create_order_from_proposal(v_id, 4, v_pedido);
  if v_r ? 'error' then perform pg_temp.falha('converter: ' || (v_r->>'error')); end if;
  v_order := (v_r->>'order_id')::uuid;
  select * into v_nota from public.order_admin_notes where order_id = v_order;
  if v_nota.note is distinct from 'Nota final' or v_nota.updated_by is distinct from v_admin then
    perform pg_temp.falha(format('cópia: nota=%s autor=%s', v_nota.note, v_nota.updated_by));
  end if;
  select * into v_row from public.order_proposals where id = v_id;
  if v_row.admin_note is distinct from 'Nota final' or v_row.status <> 'completed' then
    perform pg_temp.falha('a coluna da proposta não ficou congelada');
  end if;
  perform pg_temp.ok('a conversão copia a observação para order_admin_notes, com o autor da proposta; a coluna fica');

  -- proposta sem nota não cria linha
  v_r := public.save_order_proposal(v_base || jsonb_build_object(
    'idempotency_key', 'probe-95-b', 'token_hash', 'hash-probe-95-b', 'expires_at', now() + interval '7 days'));
  v_sem := (v_r->>'id')::uuid;
  v_r := public.create_order_from_proposal(v_sem, 1, v_pedido || jsonb_build_object('client_request_id', gen_random_uuid()::text));
  if v_r ? 'error' then perform pg_temp.falha('converter sem nota: ' || (v_r->>'error')); end if;
  select count(*) into v_n from public.order_admin_notes where order_id = (v_r->>'order_id')::uuid;
  if v_n <> 0 then perform pg_temp.falha('proposta sem nota criou linha'); end if;
  perform pg_temp.ok('proposta sem observação não cria linha em order_admin_notes');
end $$;

rollback;
