-- Probe SQL contra o banco LOCAL (porta 54442): o bloco "Joias em oferta" por campanha
-- (WI 103, tarefa 02, CA-02.5 / CA-02.6). Tudo numa transação desfeita no fim — nada fica no banco.
--
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54442 -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/103-joias-em-oferta-configuravel/probes/02-secao-por-campanha.sql
--
-- Cada verificação imprime `ok — …`; a primeira que não bate lança e o psql sai com código 3.
-- Nunca aponte para ambiente remoto.
--
-- O que prova (migration `20261130170000_103-joias-em-oferta-por-campanha.sql`):
--   1. dois blocos `campaign_offers` com campanhas diferentes convivem;
--   2. um segundo bloco com a MESMA campanha é recusado com `23505`, nomeando o índice por campanha;
--   3. dois blocos sem campanha convivem;
--   4. apagar a campanha zera `campaign_id` e NÃO apaga a seção;
--   5. o visitante lê `campaign_id` da seção ativa (a loja decide por ele) e não grava `home_sections`.
--
-- As campanhas da prova nascem DESLIGADAS: a exclusão "uma ligada por vez" não entra no caminho.

begin;

do $$
declare
	v_a uuid;
	v_b uuid;
	v_s1 uuid;
	v_s2 uuid;
	v_s3 uuid;
	v_s4 uuid;
	v_n integer;
	v_campanha uuid;
	v_msg text;
begin
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe A', 'PROBE', now() - interval '1 day', now() + interval '1 day', false)
	returning id into v_a;
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe B', 'PROBE', now() + interval '10 days', now() + interval '20 days', false)
	returning id into v_b;

	-- 1 · campanhas diferentes convivem
	insert into public.home_sections (type, position, active, config, campaign_id)
	values ('campaign_offers', 901, true, '{"title":"Probe um"}'::jsonb, v_a)
	returning id into v_s1;
	insert into public.home_sections (type, position, active, config, campaign_id)
	values ('campaign_offers', 902, false, '{}'::jsonb, v_b)
	returning id into v_s2;
	raise notice 'ok — dois blocos com campanhas diferentes convivem';

	-- 2 · a mesma campanha recusa com 23505, nomeando o índice
	begin
		insert into public.home_sections (type, position, active, config, campaign_id)
		values ('campaign_offers', 903, false, '{}'::jsonb, v_a);
		raise exception 'FALHA — o segundo bloco com a mesma campanha foi aceito';
	exception when unique_violation then
		get stacked diagnostics v_msg = message_text;
		if position('home_sections_campaign_offers_campaign_idx' in v_msg) = 0 then
			raise exception 'FALHA — o 23505 não nomeia o índice por campanha: %', v_msg;
		end if;
		raise notice 'ok — mesma campanha recusa com 23505: %', v_msg;
	end;

	-- 3 · dois sem campanha convivem
	insert into public.home_sections (type, position, active, config)
	values ('campaign_offers', 904, false, '{}'::jsonb)
	returning id into v_s3;
	insert into public.home_sections (type, position, active, config, campaign_id)
	values ('campaign_offers', 905, false, '{}'::jsonb, null)
	returning id into v_s4;
	raise notice 'ok — dois blocos sem campanha convivem';

	-- 4 · apagar a campanha zera a coluna e mantém a seção
	delete from public.campaigns where id = v_b;
	select count(*), max(campaign_id::text)::uuid into v_n, v_campanha
		from public.home_sections where id = v_s2;
	if v_n <> 1 then
		raise exception 'FALHA — apagar a campanha apagou a seção';
	end if;
	if v_campanha is not null then
		raise exception 'FALHA — apagar a campanha não zerou campaign_id';
	end if;
	raise notice 'ok — apagar a campanha zera campaign_id e a seção fica';

	create temp table probe_ref (k text primary key, id uuid, campanha uuid);
	insert into probe_ref values ('ativa', v_s1, v_a), ('desligada', v_s2, null);
	grant all on probe_ref to anon;
end $$;

-- 5 · o visitante
set local role anon;

do $$
declare
	v_ativa uuid;
	v_campanha uuid;
	v_lida uuid;
	v_n integer;
begin
	select id, campanha into v_ativa, v_campanha from probe_ref where k = 'ativa';
	select campaign_id into v_lida from public.home_sections where id = v_ativa;
	if v_lida is distinct from v_campanha then
		raise exception 'FALHA — o visitante não lê campaign_id da seção ativa (leu %)', v_lida;
	end if;
	raise notice 'ok — o visitante lê campaign_id da seção ativa';

	select count(*) into v_n from public.home_sections where id = (select id from probe_ref where k = 'desligada');
	if v_n <> 0 then
		raise exception 'FALHA — o visitante leu a seção desligada';
	end if;
	raise notice 'ok — o visitante não lê a seção desligada';

	begin
		insert into public.home_sections (type, position, active, config)
		values ('campaign_offers', 906, true, '{}'::jsonb);
		raise exception 'FALHA — o visitante gravou uma seção';
	exception when insufficient_privilege then
		raise notice 'ok — o visitante não grava home_sections (insert: 42501)';
	end;

	begin
		update public.home_sections set campaign_id = null where id = v_ativa;
		get diagnostics v_n = row_count;
		if v_n <> 0 then
			raise exception 'FALHA — o visitante alterou a campanha de uma seção';
		end if;
		raise notice 'ok — o visitante não grava home_sections (update: nenhuma linha)';
	exception when insufficient_privilege then
		raise notice 'ok — o visitante não grava home_sections (update: 42501)';
	end;
end $$;

reset role;

rollback;
