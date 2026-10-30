-- Feature 88 · probe AVS-10, AVS-11, AVS-24 (lado banco) — o status `skipped` e a RPC que o grava.
--
-- psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--   -f .specs/features/88-aviso-opcional-nas-acoes-do-pedido/probes/01-aviso-pulado.sql
--
-- `begin … rollback`: derruba a RPC da 88, reaplica a migration DO DISCO dentro da transação (assim o
-- probe mede o arquivo, não o banco — um `grant` apagado do arquivo sobreviveria num banco onde a
-- migration já rodou), grava fixturas num pedido existente e desfaz tudo. Exit 0 e só linhas `ok —`.
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

drop function if exists public.skip_order_notification(uuid, text, text);
\ir ../../../../supabase/migrations/20261102120000_88-aviso-pulado.sql

-- Um pedido qualquer do banco local, sem nenhuma linha de aviso (apagadas dentro da transação).
select id as pedido from public.orders order by created_at limit 1 \gset
delete from public.order_notifications where order_id = :'pedido';
select pg_temp.confere(:'pedido' is not null, 'há um pedido de fixtura no banco local');

-- =============================================================================================
-- A forma da RPC e as permissões
-- =============================================================================================
select pg_temp.confere(
  (select prosecdef from pg_proc where oid = 'public.skip_order_notification(uuid,text,text)'::regprocedure),
  'skip_order_notification é security definer');
select pg_temp.confere(
  (select proconfig from pg_proc where oid = 'public.skip_order_notification(uuid,text,text)'::regprocedure)
    = array['search_path=""'],
  'skip_order_notification tem search_path vazio');
select pg_temp.confere(
  not has_function_privilege('anon', 'public.skip_order_notification(uuid,text,text)', 'execute'),
  'anon NÃO executa skip_order_notification');
select pg_temp.confere(
  not has_function_privilege('authenticated', 'public.skip_order_notification(uuid,text,text)', 'execute'),
  'authenticated NÃO executa skip_order_notification');
select pg_temp.confere(
  has_function_privilege('service_role', 'public.skip_order_notification(uuid,text,text)', 'execute'),
  'service_role executa skip_order_notification');

-- =============================================================================================
-- O `check` de status: aceita `skipped`, recusa o que não conhece
-- =============================================================================================
select pg_temp.confere(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'order_notifications_status_check')
    like '%skipped%',
  'o check vigente de status conhece skipped');
savepoint fora_do_check;
do $$
begin
  insert into public.order_notifications (order_id, event, channel, status)
  values ((select id from public.orders order by created_at limit 1), 'order_delivered', 'email', 'ignorado');
  raise exception 'PROBE FALHOU: o check aceitou um status desconhecido';
exception when check_violation then
  raise notice 'ok — o check recusa um status desconhecido (ignorado)';
end;
$$;
rollback to savepoint fora_do_check;

-- =============================================================================================
-- AVS-10 — sem linha ⇒ insere `skipped` e devolve o id
-- =============================================================================================
select public.skip_order_notification(:'pedido', 'order_shipped', 'email') as id_novo \gset
select pg_temp.confere(:'id_novo' <> '', 'sem linha: skip devolve um id');
select pg_temp.confere(
  (select status from public.order_notifications where id = :'id_novo') = 'skipped',
  'sem linha: a linha nasce skipped');

-- AVS-11 — `skipped` ⇒ `skipped` (devolve o mesmo id)
select public.skip_order_notification(:'pedido', 'order_shipped', 'email') as id_de_novo \gset
select pg_temp.confere(:'id_de_novo' = :'id_novo', 'skipped ⇒ skipped: devolve o mesmo id, sem linha nova');
select pg_temp.confere(
  (select count(*) from public.order_notifications where order_id = :'pedido' and event = 'order_shipped') = 1,
  'skipped ⇒ skipped: continua UMA linha para (pedido, evento, canal)');

-- AVS-11 — `failed` ⇒ `skipped`, e o erro é limpo
-- A linha `failed` nasce dois dias antes: dentro da transação `now()` é fixo, e sem a data antiga a
-- renovação de `created_at` (AVS-12, Verifier r1) seria verdadeira nos dois mundos.
insert into public.order_notifications (order_id, event, channel, status, error, created_at)
values (:'pedido', 'order_delivered', 'email', 'failed', 'resend 500', now() - interval '2 days');
select public.skip_order_notification(:'pedido', 'order_delivered', 'email') as id_falhou \gset
select pg_temp.confere(:'id_falhou' <> '', 'failed: skip devolve o id');
select pg_temp.confere(
  (select status || '|' || coalesce(error, '<null>') from public.order_notifications
    where order_id = :'pedido' and event = 'order_delivered' and channel = 'email') = 'skipped|<null>',
  'failed ⇒ skipped, com o erro limpo');
select pg_temp.confere(
  (select created_at = now() from public.order_notifications
    where order_id = :'pedido' and event = 'order_delivered' and channel = 'email'),
  'failed ⇒ skipped renova created_at: a linha fica na hora DA ESCOLHA (AVS-12)');

-- AVS-11 — `sent` intocado: devolve null
insert into public.order_notifications (order_id, event, channel, status, sent_at, provider_message_id)
values (:'pedido', 'material_received', 'email', 'sent', now(), 'resend-1');
select coalesce(public.skip_order_notification(:'pedido', 'material_received', 'email')::text, '<null>') as r_sent \gset
select pg_temp.confere(:'r_sent' = '<null>', 'sent: skip devolve null');
select pg_temp.confere(
  (select status || '|' || provider_message_id from public.order_notifications
    where order_id = :'pedido' and event = 'material_received' and channel = 'email') = 'sent|resend-1',
  'sent: a linha fica sent, intocada');

-- AVS-11 — `pending` intocado: devolve null
insert into public.order_notifications (order_id, event, channel, status)
values (:'pedido', 'in_production', 'email', 'pending');
select coalesce(public.skip_order_notification(:'pedido', 'in_production', 'email')::text, '<null>') as r_pending \gset
select pg_temp.confere(:'r_pending' = '<null>', 'pending: skip devolve null');
select pg_temp.confere(
  (select status from public.order_notifications
    where order_id = :'pedido' and event = 'in_production' and channel = 'email') = 'pending',
  'pending: a linha fica pending (o envio em curso vence)');

-- =============================================================================================
-- AVS-24 / AVS-13 — o claim de sempre reivindica a linha `skipped` (o avião e o gatilho futuro)
-- =============================================================================================
select public.claim_order_notification(:'pedido', 'order_shipped', 'email') as id_claim \gset
select pg_temp.confere(:'id_claim' = :'id_novo', 'claim_order_notification reivindica a linha skipped (mesmo id)');
select pg_temp.confere(
  (select status from public.order_notifications where id = :'id_novo') = 'pending',
  'skipped ⇒ pending pelo claim');
select public.finish_order_notification(:'id_claim', 'resend-2', null);
select pg_temp.confere(
  (select status from public.order_notifications where id = :'id_novo') = 'sent',
  'o finish converte a linha que era skipped em sent');
select coalesce(public.skip_order_notification(:'pedido', 'order_shipped', 'email')::text, '<null>') as r_depois \gset
select pg_temp.confere(:'r_depois' = '<null>', 'depois de enviada, um novo skip não a toca (null)');

rollback;
