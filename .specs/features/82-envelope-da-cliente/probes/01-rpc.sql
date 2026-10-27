-- Feature 82 · ENV-22 — a autoria do código do envelope, gravada DENTRO de `set_material_tracking`.
--
-- Contra o banco LOCAL, tudo numa transação desfeita no fim (nenhum dado muda):
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--     -f .specs/features/82-envelope-da-cliente/probes/01-rpc.sql
--
-- Exit 0 com só `ok —` é a prova. Cada caso escolhe os pedidos e as contas do próprio banco (nada de id
-- cravado): a cliente é a dona de um pedido aguardando material e NÃO tem papel de admin; a admin é
-- qualquer conta com o papel. A chamada roda como `authenticated` com o `sub` da conta no JWT — é o que
-- `auth.uid()` lê —, e a conferência roda como `postgres`, sem RLS.

begin;

create function pg_temp.como(p_uid uuid, p_order uuid, p_code text) returns jsonb
language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  r := public.set_material_tracking(p_order, p_code);
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  return r;
end $$;

create function pg_temp.falha(msg text) returns void language plpgsql as $$
begin raise exception 'FALHOU — %', msg; end $$;

do $$
declare
  v_cliente uuid; v_pedido uuid; v_admin uuid; v_alheio uuid; v_naoaplic uuid; v_recebido uuid;
  r jsonb; pd record;
begin
  select c.user_id, o.id into v_cliente, v_pedido
  from public.orders o join public.customers c on c.id = o.customer_id
  where o.material_status = 'aguardando_material' and o.status <> 'cancelled'
    and c.user_id is not null and not public.has_role(c.user_id, 'admin')
  order by o.created_at limit 1;
  if v_pedido is null then perform pg_temp.falha('nenhum pedido de cliente aguardando material no banco'); end if;

  select ur.user_id into v_admin from public.user_roles ur where ur.role = 'admin' limit 1;
  if v_admin is null then perform pg_temp.falha('nenhuma conta admin no banco'); end if;

  -- Um pedido com material que NÃO é da cliente (outra dona, ou sem dona).
  select o.id into v_alheio from public.orders o
  where o.material_status = 'aguardando_material' and o.id <> v_pedido
    and (o.customer_id is null or o.customer_id not in (select c.id from public.customers c where c.user_id = v_cliente))
  limit 1;

  -- Um pedido da mesma cliente sem material.
  select o.id into v_naoaplic from public.orders o join public.customers c on c.id = o.customer_id
  where o.material_status = 'nao_aplicavel' and c.user_id = v_cliente limit 1;

  -- 1 · cliente grava o próprio pedido ⇒ customer, set_at = now(), aguardando → enviado.
  r := pg_temp.como(v_cliente, v_pedido, '  an123456789br  ');
  select * into pd from public.orders where id = v_pedido;
  if (r->>'ok')::boolean is not true or r->>'status' <> 'material_enviado' then perform pg_temp.falha('caso 1 resposta ' || r::text); end if;
  if pd.material_tracking_set_by is distinct from 'customer' then perform pg_temp.falha('caso 1 set_by=' || coalesce(pd.material_tracking_set_by, 'null')); end if;
  if pd.material_tracking_set_at is distinct from now() then perform pg_temp.falha('caso 1 set_at não é now()'); end if;
  if pd.material_status <> 'material_enviado' or pd.material_tracking_code <> 'an123456789br' then
    perform pg_temp.falha('caso 1 código/estado ' || pd.material_status || ' ' || pd.material_tracking_code); end if;
  raise notice 'ok — cliente grava: set_by = customer, set_at = now(), aguardando_material → material_enviado, código aparado';

  -- 1b · (M37, conserto da rodada 1) a admin regrava o MESMO código que a cliente informou ⇒ a
  -- autoria passa a admin e set_at volta a now(). `now()` é o instante da transação, então o set_at
  -- da cliente é empurrado para o passado antes, para a régua discriminar "atualizou" de "ficou".
  update public.orders set material_tracking_set_at = now() - interval '1 hour' where id = v_pedido;
  r := pg_temp.como(v_admin, v_pedido, 'an123456789br');
  select * into pd from public.orders where id = v_pedido;
  if (r->>'ok')::boolean is not true then perform pg_temp.falha('caso 1b resposta ' || r::text); end if;
  if pd.material_tracking_set_by is distinct from 'admin' then
    perform pg_temp.falha('caso 1b set_by=' || coalesce(pd.material_tracking_set_by, 'null')); end if;
  if pd.material_tracking_set_at is distinct from now() then
    perform pg_temp.falha('caso 1b set_at não voltou a now(): ' || coalesce(pd.material_tracking_set_at::text, 'null')); end if;
  if pd.material_tracking_code <> 'an123456789br' or pd.material_status <> 'material_enviado' then
    perform pg_temp.falha('caso 1b código/estado ' || pd.material_status || ' ' || pd.material_tracking_code); end if;
  raise notice 'ok — admin regrava o MESMO código da cliente: set_by = admin, set_at = now() (era 1 hora antes)';

  -- 2 · admin grava o mesmo pedido ⇒ admin; enviado fica enviado.
  r := pg_temp.como(v_admin, v_pedido, 'BR987654321XX');
  select * into pd from public.orders where id = v_pedido;
  if pd.material_tracking_set_by is distinct from 'admin' or pd.material_tracking_code <> 'BR987654321XX'
    or pd.material_status <> 'material_enviado' then perform pg_temp.falha('caso 2 ' || row_to_json(pd)::text); end if;
  raise notice 'ok — admin grava: set_by = admin; material_enviado continua material_enviado';

  -- 3 · empty_code não toca nas colunas.
  update public.orders set material_tracking_set_by = null, material_tracking_set_at = null where id = v_pedido;
  r := pg_temp.como(v_admin, v_pedido, '   ');
  select * into pd from public.orders where id = v_pedido;
  if r->>'reason' <> 'empty_code' or pd.material_tracking_set_by is not null or pd.material_tracking_set_at is not null
    or pd.material_tracking_code <> 'BR987654321XX' then perform pg_temp.falha('caso 3 ' || r::text); end if;
  raise notice 'ok — empty_code: nenhuma coluna tocada';

  -- 4 · not_allowed (pedido alheio) não toca nas colunas.
  if v_alheio is null then
    raise notice 'ok — not_allowed: sem pedido alheio no banco, caso pulado (declarado)';
  else
    update public.orders set material_tracking_set_by = null, material_tracking_set_at = null where id = v_alheio;
    r := pg_temp.como(v_cliente, v_alheio, 'AN111111111BR');
    select * into pd from public.orders where id = v_alheio;
    if r->>'reason' <> 'not_allowed' or pd.material_tracking_set_by is not null or pd.material_tracking_set_at is not null
      or pd.material_tracking_code is not distinct from 'AN111111111BR' then perform pg_temp.falha('caso 4 ' || r::text); end if;
    raise notice 'ok — not_allowed (pedido de outra dona): nenhuma coluna tocada';
  end if;

  -- 5 · material_not_applicable não toca nas colunas.
  if v_naoaplic is null then
    select o.id into v_naoaplic from public.orders o where o.material_status = 'nao_aplicavel' limit 1;
    r := pg_temp.como(v_admin, v_naoaplic, 'AN222222222BR');
  else
    r := pg_temp.como(v_cliente, v_naoaplic, 'AN222222222BR');
  end if;
  select * into pd from public.orders where id = v_naoaplic;
  if r->>'reason' <> 'material_not_applicable' or pd.material_tracking_set_by is not null or pd.material_tracking_set_at is not null
    or pd.material_tracking_code is not distinct from 'AN222222222BR' then perform pg_temp.falha('caso 5 ' || r::text); end if;
  raise notice 'ok — material_not_applicable: nenhuma coluna tocada';

  -- 6 · material_recebido fica recebido (o estado só avança a partir de aguardando), e a autoria grava.
  update public.orders set material_status = 'material_recebido', material_received_at = now() - interval '2 days'
  where id = v_pedido;
  r := pg_temp.como(v_cliente, v_pedido, 'AN333333333BR');
  select * into pd from public.orders where id = v_pedido;
  if r->>'status' <> 'material_recebido' or pd.material_status <> 'material_recebido'
    or pd.material_tracking_set_by is distinct from 'customer' or pd.material_tracking_code <> 'AN333333333BR'
    then perform pg_temp.falha('caso 6 ' || r::text); end if;
  raise notice 'ok — material_recebido fica recebido; o código e a autoria (customer) gravam';

  -- 7 · o check recusa um terceiro valor.
  begin
    update public.orders set material_tracking_set_by = 'sistema' where id = v_pedido;
    perform pg_temp.falha('caso 7: o check aceitou "sistema"');
  exception when check_violation then
    raise notice 'ok — o check recusa set_by fora de customer/admin';
  end;
end $$;

-- 8 · order_list expõe as duas colunas, nas duas últimas posições.
do $$
declare v_cols text[];
begin
  select array_agg(attname order by attnum) into v_cols
  from pg_attribute where attrelid = 'public.order_list'::regclass and attnum > 0 and not attisdropped;
  if v_cols[array_length(v_cols, 1) - 1] <> 'material_tracking_set_at' or v_cols[array_length(v_cols, 1)] <> 'material_tracking_set_by' then
    raise exception 'FALHOU — order_list termina em %', v_cols[array_length(v_cols, 1) - 1 : array_length(v_cols, 1)];
  end if;
  raise notice 'ok — order_list termina em material_tracking_set_at, material_tracking_set_by';
end $$;

rollback;
