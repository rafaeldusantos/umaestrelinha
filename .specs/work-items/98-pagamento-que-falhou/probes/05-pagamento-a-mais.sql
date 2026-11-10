-- Probe do pagamento a mais (WI 98, tarefa 03): `apply_payment_approval` em pedido cancelado não grava
-- `paid_at`, estoque nem cupom, e marca "pago depois de cancelado"; em pedido já pago (registrado à
-- mão ou pela loja) nada se repete, e marca "pago duas vezes" — mas a reentrega do MESMO pagamento não
-- marca. Só admin lê o marcador. Roda em begin … rollback e REAPLICA os arquivos das migrations, então
-- mede o .sql e não o banco. Gate: exit 0 e só linhas "ok —".
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -q -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/98-pagamento-que-falhou/probes/05-pagamento-a-mais.sql
\set ON_ERROR_STOP 1
begin;
\ir ../../../../supabase/migrations/20261112120000_98-registrar-pagamento.sql
\ir ../../../../supabase/migrations/20261112130000_98-aprovacao-com-data-e-autor.sql
\ir ../../../../supabase/migrations/20261114120000_98-pagamento-a-mais.sql

create temp table quem as
select
  (select user_id from public.user_roles where role = 'admin' order by user_id limit 1) as admin,
  (select u.id from auth.users u
    where not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
    order by u.id limit 1) as cliente;
grant select on quem to authenticated, anon;

-- Fixturas: uma peça (track, 10 em estoque) e um cupom; quatro pedidos.
--   c1 cancelado, pagamento pendente (a cobrança aberta que alguém pagou depois)
--   c2 pendente, que a admin registra à mão; depois a loja aprova o PIX antigo
--   c3 pago pela loja (pagamento A); depois chega o pagamento B
--   c4 pendente, aprovado normalmente (o contraste)
insert into public.products (id, name, slug, base_price, stock_policy, stock_total, is_active)
values ('00000000-0000-0000-0000-00000000c001', 'Peça probe 98c', 'peca-probe-98c', 100, 'track', 10, true);
insert into public.coupons (id, code, used_count) values ('00000000-0000-0000-0000-00000000c003', 'PROBE98C', 5);

insert into public.orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, coupon_id, mp_payment_id, created_at)
values
 ('00000000-0000-0000-0000-0000000098c1', 100, 100, 'pix', 'A', 'a@exemplo.invalid', 'cancelled', 'pending', '00000000-0000-0000-0000-00000000c003', 'PAYc1', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098c2', 100, 100, 'pix', 'B', 'b@exemplo.invalid', 'pending', 'pending', '00000000-0000-0000-0000-00000000c003', 'PAYc2', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098c3', 100, 100, 'pix', 'C', 'c@exemplo.invalid', 'pending', 'pending', '00000000-0000-0000-0000-00000000c003', 'PAYc3a', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098c4', 100, 100, 'pix', 'D', 'd@exemplo.invalid', 'pending', 'pending', null, null, now() - interval '2 days');

insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, variant_id)
select o, '00000000-0000-0000-0000-00000000c001', 'Peça', 1, 100, null
from unnest(array[
  '00000000-0000-0000-0000-0000000098c1', '00000000-0000-0000-0000-0000000098c2',
  '00000000-0000-0000-0000-0000000098c3', '00000000-0000-0000-0000-0000000098c4'
]::uuid[]) o;

do $$
declare r boolean; n int; s text; p timestamptz; ps text; est int; cup int;
begin
  -- 1 · Aprovação num pedido cancelado
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c1', 'PAYc1', 'accredited');
  select status, paid_at, payment_status into s, p, ps from public.orders where id = '00000000-0000-0000-0000-0000000098c1';
  select stock_total into est from public.products where id = '00000000-0000-0000-0000-00000000c001';
  select used_count into cup from public.coupons where id = '00000000-0000-0000-0000-00000000c003';
  if r is not false then raise exception 'falhou 1: devolveu %', r; end if;
  raise notice 'ok — aprovação em cancelado devolve false (nenhum e-mail nem compra no GA4)';
  if s <> 'cancelled' or p is not null or ps <> 'pending' then raise exception 'falhou 1b: % % %', s, p, ps; end if;
  raise notice 'ok — o pedido cancelado continua cancelado, sem paid_at nem payment_status aprovado';
  if est <> 10 or cup <> 5 then raise exception 'falhou 1c: estoque % cupom %', est, cup; end if;
  raise notice 'ok — nada baixado do estoque nem do cupom';
  select count(*) into n from public.order_status_history where order_id = '00000000-0000-0000-0000-0000000098c1';
  if n <> 0 then raise exception 'falhou 1d: % linhas de histórico', n; end if;
  raise notice 'ok — nenhum histórico de "Pagamento aprovado"';
  select count(*) into n from public.order_payment_alerts
   where order_id = '00000000-0000-0000-0000-0000000098c1' and kind = 'paid_after_cancel' and mp_payment_id = 'PAYc1' and mp_status_detail = 'accredited';
  if n <> 1 then raise exception 'falhou 1e: % marcadores', n; end if;
  raise notice 'ok — marca "pago depois de cancelado", com o id do pagamento';

  -- 1f · a mesma notificação de novo não grava outro marcador
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c1', 'PAYc1', 'accredited');
  select count(*) into n from public.order_payment_alerts where order_id = '00000000-0000-0000-0000-0000000098c1';
  if r is not false or n <> 1 then raise exception 'falhou 1f: % %', r, n; end if;
  raise notice 'ok — a reentrega da mesma aprovação não duplica o marcador';

  -- 4 · O contraste: pedido pendente aprova normalmente, sem marcador
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c4', 'PAYc4', 'accredited');
  select status, paid_at into s, p from public.orders where id = '00000000-0000-0000-0000-0000000098c4';
  select stock_total into est from public.products where id = '00000000-0000-0000-0000-00000000c001';
  select count(*) into n from public.order_payment_alerts where order_id = '00000000-0000-0000-0000-0000000098c4';
  if r is not true or s <> 'paid' or p is null or est <> 9 or n <> 0 then raise exception 'falhou 4: % % % % %', r, s, p, est, n; end if;
  raise notice 'ok — pedido pendente aprova como antes (paid, paid_at, estoque baixado), sem marcador';

  -- 3 · Pago pela loja (A); a mesma A de novo é reentrega; B é pagamento a mais
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c3', 'PAYc3a', 'accredited');
  if r is not true then raise exception 'falhou 3a'; end if;
  select stock_total into est from public.products where id = '00000000-0000-0000-0000-00000000c001';
  select used_count into cup from public.coupons where id = '00000000-0000-0000-0000-00000000c003';
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c3', 'PAYc3a', 'accredited');
  select count(*) into n from public.order_payment_alerts where order_id = '00000000-0000-0000-0000-0000000098c3';
  if r is not false or n <> 0 then raise exception 'falhou 3b: % %', r, n; end if;
  raise notice 'ok — a reentrega do mesmo pagamento num pedido pago não marca nada';
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c3', 'PAYc3b', 'accredited');
  select count(*) into n from public.order_payment_alerts
   where order_id = '00000000-0000-0000-0000-0000000098c3' and kind = 'paid_twice' and mp_payment_id = 'PAYc3b';
  if r is not false or n <> 1 then raise exception 'falhou 3c: % %', r, n; end if;
  raise notice 'ok — outro pagamento aprovado num pedido pago pela loja marca "pago duas vezes"';
  if (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000c001') <> est
     or (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000c003') <> cup
     or (select mp_payment_id from public.orders where id = '00000000-0000-0000-0000-0000000098c3') <> 'PAYc3a'
     or (select count(*) from public.order_status_history where order_id = '00000000-0000-0000-0000-0000000098c3') <> 1
  then raise exception 'falhou 3d'; end if;
  raise notice 'ok — o pagamento a mais não repete estoque, cupom, histórico nem troca o pagamento gravado';
end $$;

-- 2 · Registrado à mão pela admin; depois a loja aprova o PIX que tinha ficado aberto (o mesmo id que
-- o pedido guardava).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r2 as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098c2', 'pix_direto', now(), null, '[]'::jsonb, 'Probe') as resposta;
reset role;

do $$
declare r boolean; n int; est int; cup int;
begin
  if (select resposta ->> 'result' from r2) <> 'ok' then raise exception 'falhou 2a: %', (select resposta from r2); end if;
  select stock_total into est from public.products where id = '00000000-0000-0000-0000-00000000c001';
  select used_count into cup from public.coupons where id = '00000000-0000-0000-0000-00000000c003';
  r := public.apply_payment_approval('00000000-0000-0000-0000-0000000098c2', 'PAYc2', 'accredited');
  select count(*) into n from public.order_payment_alerts
   where order_id = '00000000-0000-0000-0000-0000000098c2' and kind = 'paid_twice' and mp_payment_id = 'PAYc2';
  if r is not false or n <> 1 then raise exception 'falhou 2b: % %', r, n; end if;
  raise notice 'ok — a loja aprovando um pedido registrado à mão marca "pago duas vezes", mesmo com o id que o pedido guardava';
  if (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000c001') <> est
     or (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000c003') <> cup
  then raise exception 'falhou 2c'; end if;
  raise notice 'ok — e não baixa o estoque nem o cupom de novo';
end $$;

-- 5 · Só admin lê o marcador; a cliente e o anon não leem nem gravam.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select cliente from quem), 'role', 'authenticated')::text, true);
do $$
begin
  if (select count(*) from public.order_payment_alerts) <> 0 then raise exception 'falhou 5a: a cliente lê'; end if;
  raise notice 'ok — a cliente logada não lê o marcador';
  begin
    insert into public.order_payment_alerts (order_id, kind) values ('00000000-0000-0000-0000-0000000098c4', 'paid_twice');
    raise exception 'falhou 5b: a cliente gravou';
  exception when insufficient_privilege then
    raise notice 'ok — a cliente logada não grava o marcador';
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
do $$
begin
  if (select count(*) from public.order_payment_alerts where order_id::text like '00000000-0000-0000-0000-0000000098c%') <> 3 then
    raise exception 'falhou 5c';
  end if;
  raise notice 'ok — a admin lê os três marcadores';
end $$;
reset role;

set local role anon;
do $$
begin
  perform 1 from public.order_payment_alerts;
  raise exception 'falhou 5d: o anon leu';
exception when insufficient_privilege then
  raise notice 'ok — o anon não alcança a tabela';
end $$;
reset role;

-- 6 · O privilégio da função continua só com a service role
select case when has_function_privilege('anon','public.apply_payment_approval(uuid,text,text)','execute')
  or has_function_privilege('authenticated','public.apply_payment_approval(uuid,text,text)','execute')
  then 'FALHOU 6' else 'ok — só a service role executa a porta do webhook' end;
rollback;
