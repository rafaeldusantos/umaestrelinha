-- Probe SQL contra o banco LOCAL (porta 54442): as regras do cadastro de campanhas que só o banco
-- prova (WI 102, tarefa 01). Tudo numa transação desfeita no fim — nada fica no banco.
--
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54442 -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -f .specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql
--
-- Cada verificação imprime `ok — …`; a primeira que não bate lança e o psql sai com código 3.
-- Nunca aponte para ambiente remoto.

begin;

create temp table probe_ids (k text primary key, v uuid);
grant all on probe_ids to anon, authenticated;

-- Duas peças ativas e uma que vai ficar inativa (dentro da transação).
insert into probe_ids select 'p1', id from public.products where is_active order by id limit 1;
insert into probe_ids select 'p2', id from public.products where is_active and id <> (select v from probe_ids where k = 'p1') order by id limit 1;
insert into probe_ids select 'p3', id from public.products where is_active and id not in (select v from probe_ids) order by id limit 1;
update public.products set is_active = false where id = (select v from probe_ids where k = 'p3');

do $$
declare
	agora timestamptz := now();
	v_live uuid; v_sched uuid; v_off uuid; v_ended uuid; v_x uuid;
	p1 uuid := (select v from probe_ids where k = 'p1');
	p2 uuid := (select v from probe_ids where k = 'p2');
	p3 uuid := (select v from probe_ids where k = 'p3');
	n integer;
begin
	-- A em vigência (agora dentro), uma agendada (depois dela, sem cruzar), uma desligada que
	-- cruza a em vigência, e uma encerrada (antes).
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe vigente', 'PROBE', agora - interval '1 day', agora + interval '10 days', true) returning id into v_live;
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe agendada', 'PROBE', agora + interval '10 days', agora + interval '20 days', true) returning id into v_sched;
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe desligada', 'PROBE', agora, agora + interval '5 days', false) returning id into v_off;
	insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
	values ('Probe encerrada', 'PROBE', agora - interval '30 days', agora - interval '1 day', true) returning id into v_ended;
	raise notice 'ok — a encerrada e a agendada convivem com a em vigência; terminar no instante em que a outra começa não cruza ([) )';
	insert into probe_ids values ('live', v_live), ('sched', v_sched), ('off', v_off);

	-- 1. Duas ligadas que se cruzam: 23P01.
	begin
		insert into public.campaigns (name, badge_text, starts_at, ends_at, active)
		values ('Probe cruzando', 'PROBE', agora + interval '5 days', agora + interval '15 days', true);
		raise exception 'FALHA — duas ligadas que se cruzam foram aceitas';
	exception when exclusion_violation then
		raise notice 'ok — duas campanhas ligadas que se cruzam são recusadas (23P01)';
	end;

	-- 1b. Religar a desligada que cruza a em vigência: 23P01.
	begin
		update public.campaigns set active = true where id = v_off;
		raise exception 'FALHA — religar a desligada que cruza foi aceito';
	exception when exclusion_violation then
		raise notice 'ok — ligar uma desligada que cruza a em vigência é recusado (23P01)';
	end;

	-- 2. Fim antes do início, hex e tetos: 23514.
	begin
		insert into public.campaigns (name, badge_text, starts_at, ends_at, active) values ('x', 'X', agora, agora, false);
		raise exception 'FALHA — fim igual ao início aceito';
	exception when check_violation then raise notice 'ok — fim que não vem depois do início é recusado';
	end;
	begin
		insert into public.campaigns (name, badge_text, band_color, starts_at, ends_at, active) values ('x', 'X', 'preto', agora, agora + interval '1 day', false);
		raise exception 'FALHA — cor fora do formato aceita';
	exception when check_violation then raise notice 'ok — cor fora de #RRGGBB é recusada';
	end;
	begin
		insert into public.campaigns (name, badge_text, starts_at, ends_at, active) values ('x', 'BLACK FRIDAY 26', agora, agora + interval '1 day', false);
		raise exception 'FALHA — selo de 15 aceito';
	exception when check_violation then raise notice 'ok — texto do selo acima de 14 é recusado';
	end;
	begin
		insert into public.campaigns (name, badge_text, starts_at, ends_at, active) values (repeat('a', 41), 'X', agora, agora + interval '1 day', false);
		raise exception 'FALHA — nome de 41 aceito';
	exception when check_violation then raise notice 'ok — nome acima de 40 é recusado';
	end;

	-- 3. Percentuais: 1–70, e o teto de 5 pelo gatilho.
	insert into public.campaign_percents (campaign_id, percent) values (v_live, 10), (v_live, 15), (v_live, 20);
	begin
		insert into public.campaign_percents (campaign_id, percent) values (v_live, 80);
		raise exception 'FALHA — percentual 80 aceito';
	exception when check_violation then raise notice 'ok — percentual 80 é recusado';
	end;
	begin
		insert into public.campaign_percents (campaign_id, percent) values (v_live, 0);
		raise exception 'FALHA — percentual 0 aceito';
	exception when check_violation then raise notice 'ok — percentual 0 é recusado';
	end;
	insert into public.campaign_percents (campaign_id, percent) values (v_live, 25), (v_live, 30);
	begin
		insert into public.campaign_percents (campaign_id, percent) values (v_live, 35);
		raise exception 'FALHA — sexto percentual aceito';
	exception when check_violation then raise notice 'ok — o sexto percentual é recusado pelo gatilho (23514)';
	end;
	begin
		insert into public.campaign_percents (campaign_id, percent) values (v_sched, 5), (v_sched, 10), (v_sched, 15), (v_sched, 20), (v_sched, 25), (v_sched, 30);
		raise exception 'FALHA — seis percentuais num comando só aceitos';
	exception when check_violation then raise notice 'ok — seis percentuais num comando só também são recusados';
	end;
	insert into public.campaign_percents (campaign_id, percent) values (v_sched, 10);

	-- 4. A marcação: percentual fora da campanha é recusado.
	insert into public.product_campaigns (product_id, campaign_id, percent) values (p1, v_live, 15), (p2, v_live, 15), (p3, v_live, 20);
	begin
		insert into public.product_campaigns (product_id, campaign_id, percent) values (p1, v_sched, 40);
		raise exception 'FALHA — percentual fora da campanha aceito';
	exception when foreign_key_violation then raise notice 'ok — marcar com um percentual que não é da campanha é recusado (23503)';
	end;

	-- 5. Tirar percentual em uso: 23503; sem uso, sai.
	begin
		delete from public.campaign_percents where campaign_id = v_live and percent = 15;
		raise exception 'FALHA — tirar percentual em uso aceito';
	exception when foreign_key_violation then raise notice 'ok — tirar o 15%% com peças marcadas é recusado (23503)';
	end;
	delete from public.campaign_percents where campaign_id = v_live and percent = 30;
	raise notice 'ok — tirar o 30%% sem peça sai';

	-- 6. A view conta as peças por percentual.
	select products into n from public.campaign_percent_usage where campaign_id = v_live and percent = 15;
	if n <> 2 then raise exception 'FALHA — a view contou % peças em 15%%', n; end if;
	select products into n from public.campaign_percent_usage where campaign_id = v_live and percent = 10;
	if n <> 0 then raise exception 'FALHA — a view contou % peças em 10%%', n; end if;
	raise notice 'ok — a view de uso conta 2 peças em 15%% e nenhuma em 10%%';

	-- 7. A campanha usada em pedido não se apaga (restrict); sem pedido, sai com as marcações.
	insert into public.product_campaigns (product_id, campaign_id, percent) values (p1, v_sched, 10);
	delete from public.campaigns where id = v_sched;
	select count(*) into n from public.product_campaigns where campaign_id = v_sched;
	if n <> 0 then raise exception 'FALHA — marcações órfãs da campanha apagada'; end if;
	raise notice 'ok — apagar a campanha sem pedido leva os percentuais e as marcações junto';

	update public.order_items set campaign_id = v_ended
	 where id = (select id from public.order_items order by id limit 1);
	if not found then raise exception 'FALHA — sem linha de pedido no banco local para o probe'; end if;
	begin
		delete from public.campaigns where id = v_ended;
		raise exception 'FALHA — apagar campanha usada em pedido aceito';
	exception when foreign_key_violation then raise notice 'ok — apagar a campanha usada em pedido é recusado (restrict)';
	end;

	-- 8. Apagar a peça leva a marcação.
	delete from public.product_campaigns where product_id = p2 and campaign_id = v_live;
	raise notice 'ok — tirar a peça da campanha sai';
end;
$$;

-- 9. O que o anônimo vê: só a em vigência, e as marcações dela de peça ativa.
set local role anon;
do $$
declare n integer;
begin
	select count(*) into n from public.campaigns where id = (select v from probe_ids where k = 'live');
	if n <> 1 then raise exception 'FALHA — anon não vê a em vigência'; end if;
	select count(*) into n from public.campaigns where id = (select v from probe_ids where k = 'off');
	if n <> 0 then raise exception 'FALHA — anon vê a desligada'; end if;
	select count(*) into n from public.campaigns where name in ('Probe agendada', 'Probe encerrada');
	if n <> 0 then raise exception 'FALHA — anon vê a agendada ou a encerrada'; end if;
	raise notice 'ok — anon vê a em vigência, e não vê a agendada, a desligada nem a encerrada';

	select count(*) into n from public.campaign_percents where campaign_id = (select v from probe_ids where k = 'live');
	if n <> 4 then raise exception 'FALHA — anon vê % percentuais da em vigência', n; end if;
	raise notice 'ok — anon vê os percentuais da em vigência';

	select count(*) into n from public.product_campaigns where product_id = (select v from probe_ids where k = 'p1');
	if n <> 1 then raise exception 'FALHA — anon não vê a marcação da peça ativa'; end if;
	select count(*) into n from public.product_campaigns where product_id = (select v from probe_ids where k = 'p3');
	if n <> 0 then raise exception 'FALHA — anon vê a marcação da peça inativa'; end if;
	raise notice 'ok — anon vê a marcação da peça ativa, e não a da peça inativa';

	begin
		insert into public.campaigns (name, badge_text, starts_at, ends_at, active) values ('anon', 'ANON', now() + interval '100 days', now() + interval '101 days', false);
		raise exception 'FALHA — anon inseriu campanha';
	exception when insufficient_privilege then raise notice 'ok — anon não grava campanha';
	end;
	begin
		perform public.save_campaign(null, 'anon', 'ANON', '#161514', '#C2A063', now() + interval '100 days', now() + interval '101 days', false, array[10]);
		raise exception 'FALHA — anon chamou save_campaign';
	exception when insufficient_privilege then raise notice 'ok — anon não chama save_campaign';
	end;
end;
$$;
reset role;

rollback;
