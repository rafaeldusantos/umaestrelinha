-- Probe do registro manual de pagamento (WI 98, tarefa 01): grava, não repete, recusa a data, e só
-- admin lê e grava. Roda em begin … rollback e REAPLICA os dois arquivos da migration, então mede o
-- .sql e não o banco. Gate: exit 0 e só linhas "ok —".
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -q -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/98-pagamento-que-falhou/probes/01-registrar.sql
\set ON_ERROR_STOP 1
begin;
\ir ../../../../supabase/migrations/20261112120000_98-registrar-pagamento.sql
\ir ../../../../supabase/migrations/20261112130000_98-aprovacao-com-data-e-autor.sql

-- Quem: o primeiro admin do banco local e uma conta que não é admin.
create temp table quem as
select
  (select user_id from public.user_roles where role = 'admin' order by user_id limit 1) as admin,
  (select u.id from auth.users u
    where not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
    order by u.id limit 1) as cliente;
grant select on quem to authenticated, anon;

-- Fixturas: uma peça sem variação (track, 10 em estoque), uma variação (track, 1 em estoque — a baixa
-- de 2 só tira 1), um cupom, e quatro pedidos criados há dois dias.
insert into public.products (id, name, slug, base_price, stock_policy, stock_total, is_active)
values ('00000000-0000-0000-0000-00000000b001', 'Peça probe 98', 'peca-probe-98', 100, 'track', 10, true);
insert into public.product_variants (id, product_id, stock)
values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000b001', 1);
insert into public.coupons (id, code, used_count) values ('00000000-0000-0000-0000-00000000b003', 'PROBE98', 5);

insert into public.orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, coupon_id, created_at)
values
 ('00000000-0000-0000-0000-0000000098a1', 300, 300, 'pix', 'A', 'a@exemplo.invalid', 'pending', 'expired', '00000000-0000-0000-0000-00000000b003', now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098a2', 10, 10, 'pix', 'B', 'b@exemplo.invalid', 'separating', 'rejected', null, now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098a3', 10, 10, 'pix', 'C', 'c@exemplo.invalid', 'pending', 'pending', null, now() - interval '2 days'),
 ('00000000-0000-0000-0000-0000000098a4', 10, 10, 'pix', 'D', 'd@exemplo.invalid', 'cancelled', 'pending', null, now() - interval '2 days');

insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, variant_id)
values
 ('00000000-0000-0000-0000-0000000098a1', '00000000-0000-0000-0000-00000000b001', 'Peça', 3, 50, null),
 ('00000000-0000-0000-0000-0000000098a1', '00000000-0000-0000-0000-00000000b001', 'Peça', 2, 75, '00000000-0000-0000-0000-00000000b002');

-- O comprovante: o objeto no bucket (como o envio do painel o deixaria).
insert into storage.objects (bucket_id, name)
values ('order-payment-receipts', '00000000-0000-0000-0000-0000000098a1/comprovante.pdf');

-- As vendas de ontem e de hoje antes do registro, para a comparação.
create temp table antes as select 0 as nada;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table vendas_antes as
select (public.store_movement(now()) -> 'periodos' -> 'ontem' ->> 'vendas')::int as ontem,
       (public.store_movement(now()) -> 'periodos' -> 'hoje' ->> 'vendas')::int as hoje;
reset role;

-- 1 · Registrar: ontem ao meio-dia de Brasília, por transferência, com observação e comprovante.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r1 as
select public.record_manual_payment(
  '00000000-0000-0000-0000-0000000098a1', 'transferencia',
  ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '12:00') at time zone 'America/Sao_Paulo',
  '  Pagou no Itaú  ',
  '[{"path":"00000000-0000-0000-0000-0000000098a1/comprovante.pdf","content_type":"application/pdf","size_bytes":2048}]'::jsonb,
  'Adri Muniz') as r;
create temp table vendas_depois as
select (public.store_movement(now()) -> 'periodos' -> 'ontem' ->> 'vendas')::int as ontem,
       (public.store_movement(now()) -> 'periodos' -> 'hoje' ->> 'vendas')::int as hoje,
       (select (d ->> 'vendas')::int from jsonb_array_elements(public.store_overview(now()) -> 'semana') d
         where d ->> 'dia' = ((now() at time zone 'America/Sao_Paulo')::date - 1)::text) as semana_ontem;
reset role;

do $$
declare o record; n int; v int; s int; c int; m record; q record;
begin
  if (select r ->> 'result' from r1) <> 'ok' then raise exception 'falhou 1: %', (select r from r1); end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098a1';
  if o.payment_status <> 'approved' or o.status <> 'paid'
     or o.paid_at <> ((now() at time zone 'America/Sao_Paulo')::date - 1 + time '12:00') at time zone 'America/Sao_Paulo'
     or o.payment_method <> 'pix' then
    raise exception 'falhou 1a: % % % %', o.payment_status, o.status, o.paid_at, o.payment_method;
  end if;
  raise notice 'ok — approved, pending → paid, paid_at = a data informada, payment_method intocado';

  select count(*) into n from public.order_status_history
   where order_id = o.id and from_status = 'pending' and to_status = 'paid'
     and note = 'Pagamento registrado manualmente' and created_by = (select admin from quem);
  if n <> 1 or (select count(*) from public.order_status_history where order_id = o.id) <> 1 then
    raise exception 'falhou 1b: %', n;
  end if;
  raise notice 'ok — uma linha de histórico "Pagamento registrado manualmente", com o autor';

  select stock_total into s from public.products where id = '00000000-0000-0000-0000-00000000b001';
  select stock into v from public.product_variants where id = '00000000-0000-0000-0000-00000000b002';
  select used_count into c from public.coupons where id = '00000000-0000-0000-0000-00000000b003';
  if s <> 7 or v <> 0 or c <> 6 then raise exception 'falhou 1c: % % %', s, v, c; end if;
  raise notice 'ok — o estoque baixa uma vez (10 → 7, a variação 1 → 0) e o cupom conta +1';

  select * into m from public.order_manual_payments where order_id = o.id;
  if m.method <> 'transferencia' or m.note <> 'Pagou no Itaú' or m.created_by <> (select admin from quem)
     or m.created_by_name <> 'Adri Muniz' or m.previous_payment_status <> 'expired' or m.paid_at <> o.paid_at
     or m.undone_at is not null then
    raise exception 'falhou 1d: %', row_to_json(m);
  end if;
  raise notice 'ok — o registro guarda meio, data, observação aparada, autor, nome e o payment_status de antes';

  if m.stock_deducted <> jsonb_build_array(
       jsonb_build_object('variant_id', '00000000-0000-0000-0000-00000000b002', 'quantidade', 1),
       jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000b001', 'quantidade', 3)) then
    raise exception 'falhou 1e: %', m.stock_deducted;
  end if;
  raise notice 'ok — as quantidades EFETIVAMENTE baixadas (a variação só tinha 1) ficam no registro';

  select * into q from public.order_manual_payment_receipts where manual_payment_id = m.id;
  if q.path <> '00000000-0000-0000-0000-0000000098a1/comprovante.pdf' or q.content_type <> 'application/pdf' or q.size_bytes <> 2048 then
    raise exception 'falhou 1f';
  end if;
  raise notice 'ok — o comprovante: caminho, tipo e tamanho';

  if (select ontem from vendas_depois) <> (select ontem from vendas_antes) + 1
     or (select hoje from vendas_depois) <> (select hoje from vendas_antes) then
    raise exception 'falhou 1g: % %', (select row_to_json(a) from vendas_antes a), (select row_to_json(d) from vendas_depois d);
  end if;
  if (select semana_ontem from vendas_depois) < 1 then raise exception 'falhou 1h'; end if;
  raise notice 'ok — a venda entra no Dashboard (store_movement) e na Início (store_overview) pela data informada';

  -- O evento de compra do GA4 sai só pelo webhook do Mercado Pago, que reivindica o envio em
  -- orders.ga_purchase_status; o registro manual não pode reivindicá-lo nem dá-lo por enviado.
  if o.ga_purchase_status is not null or o.ga_purchase_at is not null then
    raise exception 'falhou 1i: % %', o.ga_purchase_status, o.ga_purchase_at;
  end if;
  raise notice 'ok — o registro manual não reivindica nem marca o evento de compra do GA4';
end $$;

-- 2 · Registrar de novo, em sequência: nada se repete. (Duas sessões concorrentes disputando a
-- trava do pedido: `03-duas-sessoes.sh`.)
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r2 as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098a1', 'dinheiro', now(), null, '[]', 'Outra') as r;
reset role;
do $$
begin
  if (select r ->> 'result' from r2) <> 'ja_pago' then raise exception 'falhou 2: %', (select r from r2); end if;
  if (select count(*) from public.order_manual_payments where order_id = '00000000-0000-0000-0000-0000000098a1') <> 1
     or (select count(*) from public.order_status_history where order_id = '00000000-0000-0000-0000-0000000098a1') <> 1
     or (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000b001') <> 7
     or (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000b003') <> 6 then
    raise exception 'falhou 2b';
  end if;
  raise notice 'ok — registrar de novo responde ja_pago e não repete registro, histórico, estoque nem cupom';
  -- O webhook chegando depois do registro: a porta de sempre devolve false e não baixa nada.
  if public.apply_payment_approval('00000000-0000-0000-0000-0000000098a1', 'mp9', 'accredited') is not false
     or (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000b001') <> 7 then
    raise exception 'falhou 2c';
  end if;
  raise notice 'ok — o webhook depois do registro devolve false e não repete efeito';
end $$;

-- 3 · Pedido já avançado à mão (Em Separação, pagamento recusado): sem mudança de status, uma linha
-- de histórico com o autor assim mesmo.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r3 as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098a2', null, null, null, null, null) as r;
reset role;
do $$
declare o record;
begin
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098a2';
  if (select r ->> 'result' from r3) <> 'ok' or o.status <> 'separating' or o.payment_status <> 'approved' or o.paid_at is null then
    raise exception 'falhou 3: % %', (select r from r3), o.status;
  end if;
  if (select count(*) from public.order_status_history where order_id = o.id and from_status = 'separating'
       and to_status = 'separating' and note = 'Pagamento registrado manualmente' and created_by is not null) <> 1 then
    raise exception 'falhou 3b';
  end if;
  raise notice 'ok — todos os campos vazios: grava com agora; status avançado fica, e o histórico registra assim mesmo';
end $$;

-- 4 · As datas recusadas, com o motivo, sem gravar nada.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r4 as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', null, now() + interval '2 minutes', null, null, null) ->> 'result' as futura,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', null, now() - interval '3 days', null, null, null) ->> 'result' as antes,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098a4', null, null, null, null, null) ->> 'result' as cancelado,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', 'boleto', null, null, null, null) ->> 'result' as meio,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', null, null, null,
         '[{"path":"00000000-0000-0000-0000-0000000098a3/nao-existe.png","content_type":"image/png","size_bytes":10}]', null) ->> 'result' as fantasma;
reset role;
do $$
begin
  if (select futura from r4) <> 'data_futura' or (select antes from r4) <> 'data_antes_do_pedido' then
    raise exception 'falhou 4: %', (select row_to_json(x) from r4 x);
  end if;
  raise notice 'ok — data no futuro e anterior à criação do pedido são recusadas com o motivo';
  if (select cancelado from r4) <> 'pedido_cancelado' or (select meio from r4) <> 'meio_invalido'
     or (select fantasma from r4) <> 'comprovantes_invalidos' then
    raise exception 'falhou 4b: %', (select row_to_json(x) from r4 x);
  end if;
  raise notice 'ok — pedido cancelado, meio fora da lista e comprovante que não está no bucket são recusados';
  if (select payment_status from public.orders where id = '00000000-0000-0000-0000-0000000098a3') <> 'pending'
     or exists (select 1 from public.order_manual_payments where order_id = '00000000-0000-0000-0000-0000000098a3') then
    raise exception 'falhou 4c';
  end if;
  raise notice 'ok — nenhuma recusa grava nada';
end $$;

-- 5 · Quem não é admin: nem a RPC, nem as tabelas, nem o bucket.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select cliente from quem), 'role', 'authenticated')::text, true);
create temp table r5 as
select public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', null, null, null, null, null) ->> 'result' as rpc,
       (select count(*) from public.order_manual_payments) as registros,
       (select count(*) from public.order_manual_payment_receipts) as comprovantes,
       (select count(*) from storage.objects where bucket_id = 'order-payment-receipts') as objetos;
reset role;
do $$
begin
  if (select rpc from r5) <> 'sem_papel' or (select registros from r5) <> 0 or (select comprovantes from r5) <> 0
     or (select objetos from r5) <> 0 then
    raise exception 'falhou 5: %', (select row_to_json(x) from r5 x);
  end if;
  raise notice 'ok — a cliente logada: a RPC responde sem_papel e ela não lê registro, comprovante nem objeto do bucket';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select cliente from quem), 'role', 'authenticated')::text, true);
do $$
begin
  begin
    insert into public.order_manual_payments (order_id, paid_at, previous_payment_status)
    values ('00000000-0000-0000-0000-0000000098a3', now(), 'pending');
    raise exception 'falhou 5b: a cliente gravou';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('order-payment-receipts', '00000000-0000-0000-0000-0000000098a3/x.png');
    raise exception 'falhou 5c: a cliente enviou ao bucket';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok — a cliente logada não grava registro nem envia ao bucket';
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform count(*) from public.order_manual_payments;
    raise exception 'falhou 6: anon leu';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.record_manual_payment('00000000-0000-0000-0000-0000000098a3', null, null, null, null, null);
    raise exception 'falhou 6b: anon executou';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from storage.objects where bucket_id = 'order-payment-receipts') <> 0 then
    raise exception 'falhou 6c';
  end if;
  raise notice 'ok — anon não lê as tabelas, não executa a RPC e não vê o bucket';
end $$;
reset role;

-- 7 · O bucket é privado, e a leitura da cliente não ganhou coluna nenhuma.
do $$
begin
  if (select public from storage.buckets where id = 'order-payment-receipts') is not false then
    raise exception 'falhou 7';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public'
              and table_name in ('orders', 'order_list')
              and column_name in ('note_manual', 'method', 'receipts', 'stock_deducted')) then
    raise exception 'falhou 7b';
  end if;
  raise notice 'ok — o bucket é privado, e orders/order_list não ganharam meio, observação nem comprovante';
  if has_function_privilege('authenticated', 'public.apply_payment_approval(uuid,text,text,timestamptz,uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.apply_payment_approval(uuid,text,text)', 'execute')
     or not has_function_privilege('service_role', 'public.apply_payment_approval(uuid,text,text)', 'execute') then
    raise exception 'falhou 7c';
  end if;
  raise notice 'ok — só a service role executa a porta do webhook, e ninguém de fora o corpo';
end $$;

rollback;
