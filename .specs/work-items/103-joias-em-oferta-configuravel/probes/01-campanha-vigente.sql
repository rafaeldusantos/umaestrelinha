-- Probe SQL contra o banco LOCAL (porta 54442): a campanha que a loja vê, com e sem sessão de admin
-- (WI 103, tarefa 01, UC-06 / CA-06.1). Tudo numa transação desfeita no fim — nada fica no banco.
--
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54442 -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente.sql
--
-- Cada verificação imprime `ok — …`; a primeira que não bate lança e o psql sai com código 3.
-- A metade HTTP (o embed pelo PostgREST local, com o token de admin) é `01-campanha-vigente-http.mjs`.
-- Nunca aponte para ambiente remoto.
--
-- O que prova:
--   1. o defeito (a prova "antes"): com a sessão de admin, `campaigns` e `product_campaigns` crus
--      entregam as campanhas fora da vigência e as marcações delas;
--   2. o conserto: pelas views, admin e visitante recebem só a campanha em vigência e só as marcações
--      dela — para o visitante, as mesmas linhas que a leitura pública crua entregava (nada muda);
--   3. as views não aceitam escrita de `anon` nem de `authenticated`.
--
-- Para a prova não depender do catálogo do dia, a transação acrescenta uma campanha DESLIGADA com
-- marcação numa peça ativa: há sempre ao menos uma campanha fora da vigência com marcação.

begin;

create temp table probe_ref (k text primary key, n integer, ids uuid[]);
grant all on probe_ref to anon, authenticated;

do $$
declare
	v_off uuid;
	v_peca uuid;
begin
	if not exists (select 1 from auth.users where email = 'admin@umaestrelinha.dev') then
		raise exception 'FALHA — sem a conta de admin no banco local';
	end if;
	if not exists (select 1 from public.campaigns where active and starts_at <= now() and now() < ends_at) then
		raise exception 'FALHA — sem campanha em vigência no banco local: a prova seria vazia';
	end if;

	select id into v_peca from public.products where is_active order by id limit 1;
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe desligada', 'PROBE', now() - interval '1 day', now() + interval '1 day', false)
	returning id into v_off;
	insert into public.campaign_percents (campaign_id, percent) values (v_off, 10);
	insert into public.product_campaigns (product_id, campaign_id, percent) values (v_peca, v_off, 10);

	-- A referência, lida como `postgres` (sem RLS): o que existe e o que está em vigência.
	insert into probe_ref values
		('todas', (select count(*) from public.campaigns), null),
		('vigentes', null, (select array_agg(id order by id) from public.campaigns where active and starts_at <= now() and now() < ends_at)),
		('marcas', (select count(*) from public.product_campaigns), null),
		('marcas_vigentes', (select count(*) from public.product_campaigns pc join public.campaigns c on c.id = pc.campaign_id
			where c.active and c.starts_at <= now() and now() < c.ends_at), null),
		('marcas_vigentes_peca_ativa', (select count(*) from public.product_campaigns pc join public.campaigns c on c.id = pc.campaign_id
			join public.products p on p.id = pc.product_id
			where c.active and c.starts_at <= now() and now() < c.ends_at and p.is_active), null);
	raise notice 'ok — referência: % campanhas, % em vigência; % marcações, % da vigente',
		(select n from probe_ref where k = 'todas'),
		(select cardinality(ids) from probe_ref where k = 'vigentes'),
		(select n from probe_ref where k = 'marcas'),
		(select n from probe_ref where k = 'marcas_vigentes');
end;
$$;

-- A sessão de admin, como o PostgREST a monta: papel `authenticated` e o `sub` da conta.
select set_config(
	'request.jwt.claims',
	json_build_object('sub', (select id from auth.users where email = 'admin@umaestrelinha.dev'), 'role', 'authenticated')::text,
	true
);
set local role authenticated;

do $$
declare
	n integer;
	ids uuid[];
begin
	-- 1. O defeito, refeito: a leitura crua com sessão de admin.
	select count(*) into n from public.campaigns;
	if n <> (select r.n from probe_ref r where k = 'todas') then
		raise exception 'FALHA — admin vê % campanhas cruas, esperado todas', n;
	end if;
	if n <= (select cardinality(r.ids) from probe_ref r where k = 'vigentes') then
		raise exception 'FALHA — a leitura crua não mostrou campanha fora da vigência: o defeito não foi reproduzido';
	end if;
	select count(*) into n from public.product_campaigns;
	if n <> (select r.n from probe_ref r where k = 'marcas') then
		raise exception 'FALHA — admin vê % marcações cruas, esperado todas', n;
	end if;
	raise notice 'ok — antes: com sessão de admin, `campaigns` cru entrega as % campanhas e `product_campaigns` as % marcações (o defeito)',
		(select r.n from probe_ref r where k = 'todas'), n;

	-- 2. O conserto: as views.
	select array_agg(id order by id) into ids from public.live_campaigns;
	if ids is distinct from (select r.ids from probe_ref r where k = 'vigentes') then
		raise exception 'FALHA — admin vê pela view % , esperado só a vigente', ids;
	end if;
	raise notice 'ok — depois: com sessão de admin, `live_campaigns` entrega só a campanha em vigência';

	select count(*) into n from public.live_product_campaigns;
	if n <> (select r.n from probe_ref r where k = 'marcas_vigentes') then
		raise exception 'FALHA — admin vê % marcações pela view, esperado %', n, (select r.n from probe_ref r where k = 'marcas_vigentes');
	end if;
	if exists (select 1 from public.live_product_campaigns where not (campaign_id = any ((select r.ids from probe_ref r where k = 'vigentes')::uuid[]))) then
		raise exception 'FALHA — admin vê pela view marcação de campanha fora da vigência';
	end if;
	raise notice 'ok — depois: com sessão de admin, `live_product_campaigns` entrega só as % marcações da vigente', n;

	select count(*) into n from public.campaign_percents cp join public.live_campaigns lc on lc.id = cp.campaign_id;
	if n = 0 then raise exception 'FALHA — os percentuais da vigente não chegam ao admin pela view'; end if;
	raise notice 'ok — os percentuais da vigente chegam junto (% linhas)', n;

	-- 3. Escrita pela view: recusada.
	begin
		update public.live_campaigns set name = 'x';
		raise exception 'FALHA — authenticated gravou pela view';
	exception when insufficient_privilege then raise notice 'ok — authenticated não grava pela view `live_campaigns`';
	end;
	begin
		delete from public.live_product_campaigns;
		raise exception 'FALHA — authenticated apagou pela view';
	exception when insufficient_privilege then raise notice 'ok — authenticated não apaga pela view `live_product_campaigns`';
	end;
end;
$$;

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
declare
	n integer;
	ids uuid[];
begin
	select array_agg(id order by id) into ids from public.live_campaigns;
	if ids is distinct from (select r.ids from probe_ref r where k = 'vigentes') then
		raise exception 'FALHA — anon vê pela view %, esperado só a vigente', ids;
	end if;
	select array_agg(id order by id) into ids from public.campaigns;
	if ids is distinct from (select r.ids from probe_ref r where k = 'vigentes') then
		raise exception 'FALHA — a leitura pública crua do anon mudou: %', ids;
	end if;
	raise notice 'ok — anon vê pela view a mesma campanha que a leitura pública crua: só a vigente';

	select count(*) into n from public.live_product_campaigns;
	if n <> (select r.n from probe_ref r where k = 'marcas_vigentes_peca_ativa') then
		raise exception 'FALHA — anon vê % marcações pela view, esperado %', n, (select r.n from probe_ref r where k = 'marcas_vigentes_peca_ativa');
	end if;
	if n <> (select count(*) from public.product_campaigns) then
		raise exception 'FALHA — anon vê pela view outra quantidade de marcações que pela leitura pública crua';
	end if;
	raise notice 'ok — anon vê pela view as mesmas % marcações que a leitura pública crua (vigente, peça ativa)', n;

	begin
		insert into public.live_campaigns (id) values (gen_random_uuid());
		raise exception 'FALHA — anon gravou pela view';
	exception when insufficient_privilege then raise notice 'ok — anon não grava pela view `live_campaigns`';
	end;
end;
$$;

reset role;

rollback;
