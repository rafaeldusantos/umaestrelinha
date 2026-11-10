-- Probe do desfazer no pedido pago duas vezes (WI 98, tarefa 11, BUG-004): o pedido registrado à mão
-- que o Mercado Pago também aprovou (marcador `paid_twice`) NÃO se desfaz — a RPC recusa com
-- `pago_duas_vezes` e nada muda (o pedido continua Pago, o registro continua vivo, nenhuma linha de
-- histórico). O par sem marcador, registrado à mão do mesmo jeito, se desfaz. Roda em begin … rollback
-- e REAPLICA a migration da tarefa, então mede o .sql e não o banco. Gate: exit 0 e só linhas "ok —".
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -q -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/98-pagamento-que-falhou/probes/11-desfazer-pago-duas-vezes.sql
\set ON_ERROR_STOP 1
begin;
\ir ../../../../supabase/migrations/20261119120000_98-desfazer-no-pago-duas-vezes.sql

create temp table quem as
select (select user_id from public.user_roles where role = 'admin' order by user_id limit 1) as admin;
grant select on quem to authenticated;

-- E (vai receber a aprovação do Mercado Pago depois do registro) e F (o par, sem aprovação).
insert into public.orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, created_at)
values
 ('00000000-0000-0000-0000-0000000098e1', 10, 10, 'pix', 'E', 'e@exemplo.invalid', 'pending', 'rejected', now() - interval '1 hour'),
 ('00000000-0000-0000-0000-0000000098e2', 10, 10, 'pix', 'F', 'f@exemplo.invalid', 'pending', 'expired', now() - interval '1 hour');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table reg as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098e1', 'dinheiro', null, 'Pagou em dinheiro', null, 'Adri Muniz') ->> 'result' as e,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098e2', 'dinheiro', null, 'Pagou em dinheiro', null, 'Adri Muniz') ->> 'result' as f;
reset role;

-- A aprovação do Mercado Pago chega em E depois do registro: a porta do webhook marca "pago duas vezes".
set local role service_role;
select public.apply_payment_approval('00000000-0000-0000-0000-0000000098e1', 'mp-probe-98-11', 'accredited');
reset role;

do $$
begin
  if (select e from reg) <> 'ok' or (select f from reg) <> 'ok' then raise exception 'falhou 0: %', (select row_to_json(r) from reg r); end if;
  if not exists (select 1 from public.order_payment_alerts where order_id = '00000000-0000-0000-0000-0000000098e1' and kind = 'paid_twice')
     or exists (select 1 from public.order_payment_alerts where order_id = '00000000-0000-0000-0000-0000000098e2') then
    raise exception 'falhou 0b: o marcador não está só em E';
  end if;
  raise notice 'ok — (preparo) E e F registrados à mão; E também aprovado pelo Mercado Pago, com o marcador paid_twice';
end $$;

create temp table hist_antes as
select count(*) as n from public.order_status_history where order_id = '00000000-0000-0000-0000-0000000098e1';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r as
select public.undo_manual_payment('00000000-0000-0000-0000-0000000098e1', 'Engano', 'Adri Muniz') ->> 'result' as pago_duas_vezes,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098e2', 'Engano', 'Adri Muniz') ->> 'result' as par;
reset role;

do $$
declare o record;
begin
  if (select pago_duas_vezes from r) <> 'pago_duas_vezes' then
    raise exception 'falhou 1: E respondeu %', (select pago_duas_vezes from r);
  end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098e1';
  if o.status <> 'paid' or o.payment_status <> 'approved' or o.paid_at is null then
    raise exception 'falhou 1b: E mudou (% / % / %)', o.status, o.payment_status, o.paid_at;
  end if;
  if not exists (select 1 from public.order_manual_payments where order_id = o.id and undone_at is null) then
    raise exception 'falhou 1c: o registro de E foi desfeito';
  end if;
  if (select count(*) from public.order_status_history where order_id = o.id) <> (select n from hist_antes) then
    raise exception 'falhou 1d: histórico de E ganhou linha';
  end if;
  raise notice 'ok — pedido pago duas vezes: desfazer é recusado (pago_duas_vezes), continua Pago e o registro continua vivo';

  if (select par from r) <> 'ok' then raise exception 'falhou 2: F respondeu %', (select par from r); end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098e2';
  if o.status <> 'pending' or o.payment_status <> 'expired' or o.paid_at is not null then
    raise exception 'falhou 2b: F (% / % / %)', o.status, o.payment_status, o.paid_at;
  end if;
  raise notice 'ok — o par sem marcador se desfaz: volta a Pendente com o pagamento de antes';
end $$;

rollback;
