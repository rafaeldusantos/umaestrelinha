-- Probe de apply_payment_approval (2026-10-27): o pagamento aprovado muda pending para paid, grava o
-- histórico, não mexe em quem já andou e corrige os pagos que ficaram pending sem duplicar nada.
-- Roda em begin … rollback e reaplica o ARQUIVO da migration, então mede o .sql e não o banco.
-- Gate de quem recriar a função: exit 0 e só linhas "ok —".
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -q -f supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql
\set ON_ERROR_STOP 1
begin;
\ir ../migrations/20261030120000_pagamento-aprovado-marca-pago.sql

-- fixturas: três pedidos não pagos e um "já pago e pendente" para a correção
insert into orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status)
values
 ('00000000-0000-0000-0000-0000000000a1', 10, 10, 'pix', 'A', 'a@exemplo.invalid', 'pending', 'pending'),
 ('00000000-0000-0000-0000-0000000000a2', 10, 10, 'pix', 'B', 'b@exemplo.invalid', 'separating', 'pending'),
 ('00000000-0000-0000-0000-0000000000a3', 10, 10, 'pix', 'C', 'c@exemplo.invalid', 'cancelled', 'pending');

do $$
declare r boolean; s text; n int;
begin
  -- 1. pending + aprovação ⇒ paid, uma linha de histórico, devolve true
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000000a1', 'mp1', 'accredited');
  select status into s from orders where id = '00000000-0000-0000-0000-0000000000a1';
  select count(*) into n from order_status_history where order_id = '00000000-0000-0000-0000-0000000000a1';
  if r is not true or s <> 'paid' or n <> 1 then raise exception 'falhou 1: % % %', r, s, n; end if;
  raise notice 'ok — pending vira paid, com uma linha de histórico';

  select count(*) into n from order_status_history
   where order_id = '00000000-0000-0000-0000-0000000000a1' and from_status='pending' and to_status='paid' and created_by is null and note = 'Pagamento aprovado';
  if n <> 1 then raise exception 'falhou 1b'; end if;
  raise notice 'ok — o histórico diz pending → paid, sem autor';

  -- 2. segundo webhook: false, nada muda, nenhum histórico a mais
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000000a1', 'mp1', 'accredited');
  select count(*) into n from order_status_history where order_id = '00000000-0000-0000-0000-0000000000a1';
  if r is not false or n <> 1 then raise exception 'falhou 2: % %', r, n; end if;
  raise notice 'ok — o segundo webhook não grava nada';

  -- 3. status já avançado à mão não volta para paid
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000000a2', null, null);
  select status into s from orders where id = '00000000-0000-0000-0000-0000000000a2';
  select count(*) into n from order_status_history where order_id = '00000000-0000-0000-0000-0000000000a2';
  if r is not true or s <> 'separating' or n <> 0 then raise exception 'falhou 3: % % %', r, s, n; end if;
  raise notice 'ok — separating continua separating, sem histórico';

  -- 4. cancelado continua cancelado
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000000a3', null, null);
  select status into s from orders where id = '00000000-0000-0000-0000-0000000000a3';
  if s <> 'cancelled' then raise exception 'falhou 4: %', s; end if;
  raise notice 'ok — cancelled continua cancelled';

  -- 5. o pagamento continua sendo gravado como antes
  select count(*) into n from orders where id = '00000000-0000-0000-0000-0000000000a1'
    and payment_status = 'approved' and paid_at is not null and mp_payment_id = 'mp1';
  if n <> 1 then raise exception 'falhou 5'; end if;
  raise notice 'ok — payment_status, paid_at e mp_payment_id gravados como antes';
end $$;

-- 6. a correção dos já pagos: reaplica o trecho final do arquivo sobre uma linha montada
insert into orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, paid_at)
values ('00000000-0000-0000-0000-0000000000a4', 10, 10, 'pix', 'D', 'd@exemplo.invalid', 'pending', 'approved', now()),
       ('00000000-0000-0000-0000-0000000000a5', 10, 10, 'pix', 'E', 'e@exemplo.invalid', 'pending', 'expired', null);
\ir ../migrations/20261030120000_pagamento-aprovado-marca-pago.sql
do $$
declare s text; n int;
begin
  select status into s from orders where id = '00000000-0000-0000-0000-0000000000a4';
  select count(*) into n from order_status_history where order_id = '00000000-0000-0000-0000-0000000000a4';
  if s <> 'paid' or n <> 1 then raise exception 'falhou 6: % %', s, n; end if;
  raise notice 'ok — o pago que ficou pending é corrigido, com histórico';
  select status into s from orders where id = '00000000-0000-0000-0000-0000000000a5';
  if s <> 'pending' then raise exception 'falhou 6b'; end if;
  raise notice 'ok — o Pix expirado continua pending';
  -- rodar de novo não duplica nada
  select count(*) into n from order_status_history where order_id = '00000000-0000-0000-0000-0000000000a1';
  if n <> 1 then raise exception 'falhou 6c: %', n; end if;
  raise notice 'ok — reaplicar a migration não duplica histórico';
end $$;

-- 7. o privilégio continua só com a service role
select case when has_function_privilege('anon','public.apply_payment_approval(uuid,text,text)','execute')
  or has_function_privilege('authenticated','public.apply_payment_approval(uuid,text,text)','execute')
  then 'FALHOU 7' else 'ok — só a service role executa' end;
rollback;
