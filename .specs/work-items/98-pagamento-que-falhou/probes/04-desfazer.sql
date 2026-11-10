-- Probe do desfazer do registro manual de pagamento (WI 98, tarefa 02): devolve o pedido a Pendente
-- com o payment_status de antes, sem paid_at, o estoque efetivamente baixado e o uso do cupom; o
-- pedido sai da venda do Dashboard e da Início; o registro, a observação e o comprovante ficam, com
-- quem desfez, quando e o motivo; recusa fora de Pago, sem registro (aprovado pela loja), sem motivo e
-- para quem não é admin. Roda em begin … rollback e REAPLICA as três migrations do WI, então mede o
-- .sql e não o banco. Gate: exit 0 e só linhas "ok —".
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -q -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/98-pagamento-que-falhou/probes/04-desfazer.sql
\set ON_ERROR_STOP 1
begin;
\ir ../../../../supabase/migrations/20261112120000_98-registrar-pagamento.sql
\ir ../../../../supabase/migrations/20261112130000_98-aprovacao-com-data-e-autor.sql
\ir ../../../../supabase/migrations/20261113120000_98-desfazer-registro.sql

create temp table quem as
select
  (select user_id from public.user_roles where role = 'admin' order by user_id limit 1) as admin,
  (select u.id from auth.users u
    where not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')
    order by u.id limit 1) as cliente;
grant select on quem to authenticated, anon;

-- Fixturas: peça sem variação (track, 10), variação (track, 1 — a baixa de 2 só tira 1), um cupom
-- (5 usos), e quatro pedidos de hoje: A (expired, com cupom e itens), B (pending, vai a Separando),
-- C (aprovado pela loja, em Pago), D (para a cliente e o anon tentarem).
insert into public.products (id, name, slug, base_price, stock_policy, stock_total, is_active)
values ('00000000-0000-0000-0000-00000000c001', 'Peça probe 98d', 'peca-probe-98d', 100, 'track', 10, true);
insert into public.product_variants (id, product_id, stock)
values ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000c001', 1);
insert into public.coupons (id, code, used_count) values ('00000000-0000-0000-0000-00000000c003', 'PROBE98D', 5);

insert into public.orders (id, subtotal, total, payment_method, customer_name, customer_email, status, payment_status, coupon_id, created_at)
values
 ('00000000-0000-0000-0000-0000000098d1', 300, 300, 'pix', 'A', 'a@exemplo.invalid', 'pending', 'expired', '00000000-0000-0000-0000-00000000c003', now() - interval '1 hour'),
 ('00000000-0000-0000-0000-0000000098d2', 10, 10, 'pix', 'B', 'b@exemplo.invalid', 'pending', 'pending', null, now() - interval '1 hour'),
 ('00000000-0000-0000-0000-0000000098d3', 10, 10, 'pix', 'C', 'c@exemplo.invalid', 'paid', 'approved', null, now() - interval '1 hour'),
 ('00000000-0000-0000-0000-0000000098d4', 10, 10, 'pix', 'D', 'd@exemplo.invalid', 'pending', 'rejected', null, now() - interval '1 hour');
update public.orders set paid_at = now() - interval '30 minutes' where id = '00000000-0000-0000-0000-0000000098d3';

insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, variant_id)
values
 ('00000000-0000-0000-0000-0000000098d1', '00000000-0000-0000-0000-00000000c001', 'Peça', 3, 50, null),
 ('00000000-0000-0000-0000-0000000098d1', '00000000-0000-0000-0000-00000000c001', 'Peça', 2, 75, '00000000-0000-0000-0000-00000000c002');

insert into storage.objects (bucket_id, name)
values ('order-payment-receipts', '00000000-0000-0000-0000-0000000098d1/comprovante.pdf');

-- A venda de hoje antes de registrar.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table vendas_antes as
select (public.store_movement(now()) -> 'periodos' -> 'hoje' ->> 'vendas')::int as hoje,
       (select (d ->> 'vendas')::int from jsonb_array_elements(public.store_overview(now()) -> 'semana') d
         where d ->> 'dia' = (now() at time zone 'America/Sao_Paulo')::date::text) as semana_hoje;

-- Registrar A (agora, com observação e comprovante) e B (que vai a Separando à mão).
create temp table reg as
select public.record_manual_payment(
  '00000000-0000-0000-0000-0000000098d1', 'pix_direto', null, 'Pagou direto',
  '[{"path":"00000000-0000-0000-0000-0000000098d1/comprovante.pdf","content_type":"application/pdf","size_bytes":2048}]'::jsonb,
  'Adri Muniz') ->> 'result' as a,
  public.record_manual_payment('00000000-0000-0000-0000-0000000098d2', null, null, null, null, 'Adri Muniz') ->> 'result' as b;
create temp table vendas_registro as
select (public.store_movement(now()) -> 'periodos' -> 'hoje' ->> 'vendas')::int as hoje;
reset role;

do $$
begin
  if (select a from reg) <> 'ok' or (select b from reg) <> 'ok' then raise exception 'falhou 0: %', (select row_to_json(r) from reg r); end if;
  if (select hoje from vendas_registro) <> (select hoje from vendas_antes) + 2 then raise exception 'falhou 0b'; end if;
  if (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000c001') <> 7
     or (select stock from public.product_variants where id = '00000000-0000-0000-0000-00000000c002') <> 0
     or (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000c003') <> 6 then
    raise exception 'falhou 0c';
  end if;
  raise notice 'ok — (preparo) dois registros gravados: venda +2, estoque 10 → 7 e 1 → 0, cupom 5 → 6';
end $$;
update public.orders set status = 'separating' where id = '00000000-0000-0000-0000-0000000098d2';

-- As recusas, antes do desfazer que vale.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table recusas as
select public.undo_manual_payment('00000000-0000-0000-0000-0000000098d2', 'Engano', 'Adri') ->> 'result' as separando,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098d3', 'Engano', 'Adri') ->> 'result' as loja,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098d4', 'Engano', 'Adri') ->> 'result' as sem_registro,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', '   ', 'Adri') ->> 'result' as sem_motivo,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', repeat('x', 501), 'Adri') ->> 'result' as longo,
       public.undo_manual_payment('00000000-0000-0000-0000-0000000098ff', 'Engano', 'Adri') ->> 'result' as inexistente;
reset role;

do $$
declare o record;
begin
  if (select separando from recusas) <> 'fora_de_pago' then raise exception 'falhou 1: %', (select row_to_json(r) from recusas r); end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098d2';
  if o.status <> 'separating' or o.payment_status <> 'approved' or o.paid_at is null
     or exists (select 1 from public.order_manual_payments where order_id = o.id and undone_at is not null) then
    raise exception 'falhou 1b';
  end if;
  raise notice 'ok — com o pedido em Separando, desfazer é recusado (fora_de_pago) e nada muda';

  if (select loja from recusas) <> 'sem_registro' then raise exception 'falhou 2: %', (select loja from recusas); end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098d3';
  if o.status <> 'paid' or o.payment_status <> 'approved' or o.paid_at is null then raise exception 'falhou 2b'; end if;
  raise notice 'ok — pagamento aprovado pela loja (sem registro manual) não se desfaz, e nada muda';

  if (select sem_registro from recusas) <> 'sem_registro' or (select sem_motivo from recusas) <> 'motivo_vazio'
     or (select longo from recusas) <> 'motivo_longo' or (select inexistente from recusas) <> 'nao_encontrado' then
    raise exception 'falhou 3: %', (select row_to_json(r) from recusas r);
  end if;
  if (select payment_status from public.orders where id = '00000000-0000-0000-0000-0000000098d1') <> 'approved' then
    raise exception 'falhou 3b';
  end if;
  raise notice 'ok — sem registro, motivo vazio, motivo acima de 500 e pedido inexistente são recusados sem efeito';
end $$;

-- A cliente logada e o anon.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select cliente from quem), 'role', 'authenticated')::text, true);
create temp table r_cliente as
select public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', 'Engano', 'X') ->> 'result' as r;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', 'Engano', 'X');
    raise exception 'falhou 4b: anon executou';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if (select r from r_cliente) <> 'sem_papel'
     or (select payment_status from public.orders where id = '00000000-0000-0000-0000-0000000098d1') <> 'approved' then
    raise exception 'falhou 4: %', (select r from r_cliente);
  end if;
  raise notice 'ok — a cliente logada recebe sem_papel e o anon não executa a RPC';
end $$;

-- O desfazer que vale: A, em Pago, registrado à mão.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table antes_do_desfazer as select now() as t;
create temp table r_ok as
select public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', '  Comprovante era de outro pedido  ', 'Adri Muniz') as r;
create temp table vendas_depois as
select (public.store_movement(now()) -> 'periodos' -> 'hoje' ->> 'vendas')::int as hoje,
       (select (d ->> 'vendas')::int from jsonb_array_elements(public.store_overview(now()) -> 'semana') d
         where d ->> 'dia' = (now() at time zone 'America/Sao_Paulo')::date::text) as semana_hoje;
reset role;

do $$
declare o record; m record; n int;
begin
  if (select r ->> 'result' from r_ok) <> 'ok' or (select r ->> 'status' from r_ok) <> 'pending' then
    raise exception 'falhou 5: %', (select r from r_ok);
  end if;
  select * into o from public.orders where id = '00000000-0000-0000-0000-0000000098d1';
  if o.payment_status <> 'expired' or o.paid_at is not null or o.status <> 'pending' or o.payment_method <> 'pix' then
    raise exception 'falhou 5a: % % %', o.payment_status, o.paid_at, o.status;
  end if;
  raise notice 'ok — o pedido volta a Pendente, com o payment_status de antes (expired) e sem paid_at';

  if (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000c001') <> 10
     or (select stock from public.product_variants where id = '00000000-0000-0000-0000-00000000c002') <> 1 then
    raise exception 'falhou 5b';
  end if;
  raise notice 'ok — o estoque volta pelo que foi baixado de fato (7 → 10, a variação 0 → 1, não 0 → 2)';

  if (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000c003') <> 5 then
    raise exception 'falhou 5c';
  end if;
  raise notice 'ok — o uso do cupom é devolvido (6 → 5)';

  select * into m from public.order_manual_payments where order_id = o.id;
  if m.note <> 'Pagou direto' or m.method <> 'pix_direto' or m.undone_at is null
     or m.undone_at < (select t from antes_do_desfazer) or m.undone_by <> (select admin from quem)
     or m.undone_by_name <> 'Adri Muniz' or m.undone_reason <> 'Comprovante era de outro pedido' then
    raise exception 'falhou 5d: %', row_to_json(m);
  end if;
  if (select count(*) from public.order_manual_payment_receipts where manual_payment_id = m.id) <> 1 then
    raise exception 'falhou 5e';
  end if;
  raise notice 'ok — o registro fica, com observação e comprovante, e ganha quando, quem (id e nome) e o motivo aparado';

  select count(*) into n from public.order_status_history
   where order_id = o.id and from_status = 'paid' and to_status = 'pending' and created_by = (select admin from quem)
     and note = 'Registro de pagamento desfeito. Motivo: Comprovante era de outro pedido';
  if n <> 1 then raise exception 'falhou 5f: %', n; end if;
  raise notice 'ok — o histórico ganha "Registro de pagamento desfeito" com o motivo e o autor';

  if (select hoje from vendas_depois) <> (select hoje from vendas_registro) - 1 then
    raise exception 'falhou 5g: % %', (select hoje from vendas_registro), (select hoje from vendas_depois);
  end if;
  if (select semana_hoje from vendas_depois) <> (select semana_hoje from vendas_antes) + 1 then
    raise exception 'falhou 5h';
  end if;
  raise notice 'ok — o pedido sai da venda do Dashboard (store_movement) e da Início (store_overview)';

  if exists (select 1 from public.order_notifications where order_id = o.id) then
    raise exception 'falhou 5i';
  end if;
  raise notice 'ok — nenhum aviso gravado para o pedido';
end $$;

-- Desfazer de novo não repete; registrar de novo volta a valer.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select admin from quem), 'role', 'authenticated')::text, true);
create temp table r_de_novo as
select public.undo_manual_payment('00000000-0000-0000-0000-0000000098d1', 'De novo', 'Adri') ->> 'result' as desfazer,
       public.record_manual_payment('00000000-0000-0000-0000-0000000098d1', 'dinheiro', null, null, null, 'Adri') ->> 'result' as registrar;
reset role;
do $$
begin
  if (select desfazer from r_de_novo) <> 'sem_registro' or (select registrar from r_de_novo) <> 'ok' then
    raise exception 'falhou 6: %', (select row_to_json(r) from r_de_novo r);
  end if;
  if (select count(*) from public.order_manual_payments where order_id = '00000000-0000-0000-0000-0000000098d1') <> 2
     or (select count(*) from public.order_manual_payments where order_id = '00000000-0000-0000-0000-0000000098d1' and undone_at is null) <> 1
     or (select stock_total from public.products where id = '00000000-0000-0000-0000-00000000c001') <> 7
     or (select used_count from public.coupons where id = '00000000-0000-0000-0000-00000000c003') <> 6 then
    raise exception 'falhou 6b';
  end if;
  raise notice 'ok — desfazer de novo responde sem_registro; registrar de novo grava um segundo registro vivo e baixa de novo';
end $$;

rollback;
