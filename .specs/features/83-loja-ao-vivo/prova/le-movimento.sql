-- Lê store_movement COMO o admin do seed (authenticated + sub), para comparar com a tela.
\set ON_ERROR_STOP 1
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = 'admin@umaestrelinha.dev'), 'role', 'authenticated')::text, true) \g /dev/null
set local role authenticated;
select jsonb_build_object('periodos', m->'periodos', 'acessos', m->'acessos', 'contagem_desde', m->'contagem_desde', 'lido_em', m->'lido_em')
  from public.store_movement(now()) m;
rollback;
