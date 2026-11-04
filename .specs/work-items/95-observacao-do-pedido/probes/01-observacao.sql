-- WI 95 · C-03, C-04 — a observação do pedido, só para quem administra (tarefa 01).
--
-- Contra o banco LOCAL, tudo numa transação desfeita no fim (nenhum dado muda):
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/95-observacao-do-pedido/probes/01-observacao.sql
--
-- Exit 0 com só `ok —` é a prova. Os pedidos e as contas vêm do próprio banco (nada de id cravado):
-- a cliente é a dona de um pedido e NÃO tem papel de admin; a admin é qualquer conta com o papel.
-- Cada leitura e escrita "como" alguém roda com o papel e o `sub` no JWT — é o que `auth.uid()` lê —
-- e a conferência roda como `postgres`, sem RLS. A migration é reaplicada do DISCO dentro da
-- transação (a tabela é derrubada antes), para o probe medir o arquivo e não o banco.

begin;

drop table if exists public.order_admin_notes;
\ir ../../../../supabase/migrations/20261108120000_95-observacao-do-pedido.sql

create function pg_temp.entrar(p_role text, p_uid uuid) returns void language plpgsql as $$
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', json_build_object('role', p_role)::text, true);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  end if;
  perform set_config('role', p_role, true);
end $$;

create function pg_temp.sair() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.falha(msg text) returns void language plpgsql as $$
begin raise exception 'FALHOU — %', msg; end $$;

-- Lê `order_admin_notes` do pedido como alguém; devolve o número de linhas vistas ou o código do erro.
create function pg_temp.le(p_role text, p_uid uuid, p_order uuid) returns text language plpgsql as $$
declare n int;
begin
  perform pg_temp.entrar(p_role, p_uid);
  begin
    select count(*) into n from public.order_admin_notes where order_id = p_order;
  exception when others then
    perform pg_temp.sair();
    return 'erro ' || sqlstate;
  end;
  perform pg_temp.sair();
  return n::text;
end $$;

-- Grava (upsert) como alguém; devolve 'gravou', ou o código do erro.
create function pg_temp.grava(p_role text, p_uid uuid, p_order uuid, p_note text) returns text language plpgsql as $$
begin
  perform pg_temp.entrar(p_role, p_uid);
  begin
    -- Como o dono da escrita grava: sem `updated_at` (o instante é do banco).
    insert into public.order_admin_notes (order_id, note, updated_by, updated_by_name)
    values (p_order, p_note, p_uid, 'Probe')
    on conflict (order_id) do update set note = excluded.note, updated_by = excluded.updated_by,
      updated_by_name = excluded.updated_by_name;
  exception when others then
    perform pg_temp.sair();
    return 'erro ' || sqlstate;
  end;
  perform pg_temp.sair();
  return 'gravou';
end $$;

do $$
declare
  v_cliente uuid; v_pedido uuid; v_admin uuid; v_r text; v_n int; v_json text; v_editor uuid;
  v_marca constant text := 'OBSERVACAO-SIGILOSA-DO-PROBE';
begin
  select c.user_id, o.id into v_cliente, v_pedido
  from public.orders o join public.customers c on c.id = o.customer_id
  where c.user_id is not null and not public.has_role(c.user_id, 'admin')
  order by o.created_at limit 1;
  if v_pedido is null then perform pg_temp.falha('nenhum pedido de cliente com conta no banco'); end if;

  select ur.user_id into v_admin from public.user_roles ur where ur.role = 'admin' limit 1;
  if v_admin is null then perform pg_temp.falha('nenhuma conta admin no banco'); end if;

  -- 1 · admin grava e lê.
  v_r := pg_temp.grava('authenticated', v_admin, v_pedido, '  ' || v_marca || '  ');
  if v_r <> 'gravou' then perform pg_temp.falha('admin não gravou: ' || v_r); end if;
  v_r := pg_temp.le('authenticated', v_admin, v_pedido);
  if v_r <> '1' then perform pg_temp.falha('admin não lê: ' || v_r); end if;
  raise notice 'ok — admin grava (upsert) e lê a observação';

  -- 2 · admin regrava a mesma linha (upsert por pedido, uma linha só).
  v_r := pg_temp.grava('authenticated', v_admin, v_pedido, v_marca || ' editada');
  select count(*) into v_n from public.order_admin_notes where order_id = v_pedido;
  if v_r <> 'gravou' or v_n <> 1 then perform pg_temp.falha('upsert do admin: ' || v_r || ' linhas=' || v_n); end if;
  raise notice 'ok — admin edita: continua uma linha por pedido';

  -- 2b · o instante da edição é do banco: um `updated_at` mandado por quem grava (o relógio de um
  -- aparelho) é trocado por `now()` no `update`, e o upsert sem ele também o renova.
  update public.order_admin_notes set updated_at = '2000-01-01T00:00:00Z' where order_id = v_pedido;
  select count(*) into v_n from public.order_admin_notes where order_id = v_pedido and updated_at = now();
  if v_n <> 1 then perform pg_temp.falha('o update aceitou o instante de quem grava'); end if;
  v_r := pg_temp.grava('authenticated', v_admin, v_pedido, v_marca || ' de novo');
  select count(*) into v_n from public.order_admin_notes where order_id = v_pedido and updated_at = now();
  if v_r <> 'gravou' or v_n <> 1 then perform pg_temp.falha('o upsert em conflito não renovou updated_at'); end if;
  raise notice 'ok — o instante da edição é do banco (trigger before update), nunca o de quem grava';

  -- 3 · a cliente DONA do pedido não lê nem grava.
  v_r := pg_temp.le('authenticated', v_cliente, v_pedido);
  if v_r <> '0' then perform pg_temp.falha('cliente dona leu: ' || v_r); end if;
  v_r := pg_temp.grava('authenticated', v_cliente, v_pedido, 'da cliente');
  if v_r <> 'erro 42501' then perform pg_temp.falha('cliente dona gravou: ' || v_r); end if;
  raise notice 'ok — a cliente dona do pedido não lê (0 linhas) nem grava (42501)';

  -- 4 · anon não lê nem grava (o `revoke` tira o anon antes da RLS).
  v_r := pg_temp.le('anon', null, v_pedido);
  if v_r <> 'erro 42501' then perform pg_temp.falha('anon leu: ' || v_r); end if;
  v_r := pg_temp.grava('anon', null, v_pedido, 'do anon');
  if v_r <> 'erro 42501' then perform pg_temp.falha('anon gravou: ' || v_r); end if;
  raise notice 'ok — anon não lê nem grava (42501)';

  -- 5 · a cliente dona lê a linha inteira do pedido e da `order_list` — e a observação não está lá.
  perform pg_temp.entrar('authenticated', v_cliente);
  select row_to_json(o)::text into v_json from public.orders o where o.id = v_pedido;
  perform pg_temp.sair();
  if v_json is null then perform pg_temp.falha('a cliente não leu o próprio pedido (o probe não discriminaria)'); end if;
  if position(v_marca in v_json) > 0 or v_json like '%admin_note%' then perform pg_temp.falha('a observação vazou em orders'); end if;
  perform pg_temp.entrar('authenticated', v_cliente);
  select coalesce(string_agg(row_to_json(l)::text, ''), '') into v_json from public.order_list l where l.id = v_pedido;
  perform pg_temp.sair();
  if position(v_marca in v_json) > 0 or v_json like '%admin_note%' then perform pg_temp.falha('a observação vazou em order_list'); end if;
  raise notice 'ok — a cliente dona faz select * em orders e em order_list e não vê a observação';

  -- 6 · o check: vazio recusado; 1000 aparado aceito; 1001 recusado.
  begin
    insert into public.order_admin_notes (order_id, note) values (v_pedido, '   ')
    on conflict (order_id) do update set note = excluded.note;
    perform pg_temp.falha('o banco aceitou observação vazia');
  exception when check_violation then null;
  end;
  update public.order_admin_notes set note = '  ' || repeat('𝒜', 1000) || '  ' where order_id = v_pedido;
  begin
    update public.order_admin_notes set note = repeat('a', 1001) where order_id = v_pedido;
    perform pg_temp.falha('o banco aceitou 1001 caracteres');
  exception when check_violation then null;
  end;
  raise notice 'ok — o check recusa vazio e 1001, e aceita 1000 pontos de código aparados';

  -- 7 · apagar a conta de quem editou anula `updated_by` e preserva a observação.
  v_editor := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (v_editor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'probe-95-' || v_editor || '@exemplo.invalid', '', now(), now());
  update public.order_admin_notes set updated_by = v_editor, note = v_marca where order_id = v_pedido;
  delete from auth.users where id = v_editor;
  select count(*) into v_n from public.order_admin_notes where order_id = v_pedido and updated_by is null and note = v_marca;
  if v_n <> 1 then perform pg_temp.falha('apagar quem editou não anulou updated_by'); end if;
  raise notice 'ok — apagar a conta de quem editou anula updated_by e preserva a observação';

  -- 8 · apagar o pedido apaga a observação.
  delete from public.orders where id = v_pedido;
  select count(*) into v_n from public.order_admin_notes where order_id = v_pedido;
  if v_n <> 0 then perform pg_temp.falha('apagar o pedido não apagou a observação'); end if;
  raise notice 'ok — apagar o pedido apaga a observação';
end $$;

rollback;
