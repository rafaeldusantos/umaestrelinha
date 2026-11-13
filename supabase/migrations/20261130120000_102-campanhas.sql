-- Campanhas de desconto — o cadastro da campanha, os percentuais que ela oferece e a
-- marcação de cada peça.
--
-- Três tabelas, uma view, uma função de gravação e a coluna da campanha na linha do pedido. Sem
-- escrita de dado: nenhuma campanha nasce semeada — quem quiser uma a cria em `/admin/campanhas`.
--
-- O preço cadastrado (`products.base_price`/`original_price`, `product_variants.price`/
-- `compare_price`) NUNCA é alterado pela campanha: o preço de campanha é calculado na hora,
-- por `@estrelinha/core/campaigns` (`price.ts`).
--
-- O guarda desta migration é `campanhasSchema.test.ts`, e o da vigência é
-- `campanhaVigenciaParidade.test.ts` (os dois na suíte da loja). O comportamento é provado pelo
-- probe `01-campanhas.sql`, da pasta de probes do cadastro de campanhas.

-- ---------------------------------------------------------------------
-- 1 · A campanha
-- ---------------------------------------------------------------------
--
-- `ends_at` é EXCLUSIVO: a vigência é o intervalo meio-aberto `[starts_at, ends_at)`. O painel
-- digita e mostra o último minuto que vale (30/11 23:59) e grava o minuto seguinte (01/12 00:00) —
-- a conversão tem dono em `core/campaigns/end.ts`.
--
-- Uma campanha LIGADA em vigência por vez: a constraint de exclusão recusa duas ligadas cujos
-- intervalos se cruzam (`23P01`). Desligada não entra na comparação (`where (active)`), e uma que
-- termina às 00:00 não cruza com outra que começa às 00:00 — é o que o `[)` garante.
--
-- As cores só têm o `check` de formato. O contraste entre elas (≥ 4,5:1) é `core/color`, chamado pelo
-- painel: no banco seria um segundo dono da fórmula.

create table if not exists public.campaigns (
	id           uuid primary key default gen_random_uuid(),
	name         text not null check (char_length(btrim(name)) between 1 and 40),
	badge_text   text not null check (char_length(btrim(badge_text)) between 1 and 14),
	band_color   text not null default '#161514' check (band_color ~ '^#[0-9A-Fa-f]{6}$'),
	accent_color text not null default '#C2A063' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
	starts_at    timestamptz not null,
	ends_at      timestamptz not null,
	active       boolean not null default true,
	created_at   timestamptz not null default now(),
	updated_at   timestamptz not null default now(),
	constraint campaigns_ends_after_starts check (ends_at > starts_at),
	constraint campaigns_one_live_at_a_time
		exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (active)
);

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
	before update on public.campaigns
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2 · Os percentuais que a campanha oferece — de 1 a 70, até cinco
-- ---------------------------------------------------------------------

create table if not exists public.campaign_percents (
	campaign_id uuid not null references public.campaigns (id) on delete cascade,
	percent     integer not null check (percent between 1 and 70),
	primary key (campaign_id, percent)
);

-- O teto de cinco percentuais por campanha. A linha da campanha é travada antes da contagem, para
-- duas gravações simultâneas não passarem as duas com quatro.
create or replace function public.validate_campaign_percent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	v_count integer;
begin
	perform 1 from public.campaigns where id = new.campaign_id for update;

	select count(*) into v_count
	  from public.campaign_percents
	 where campaign_id = new.campaign_id;

	if v_count >= 5 then
		raise exception 'Até 5 percentuais por campanha.'
			using errcode = '23514';
	end if;

	return new;
end;
$$;

revoke all on function public.validate_campaign_percent() from public;
revoke all on function public.validate_campaign_percent() from anon;
revoke all on function public.validate_campaign_percent() from authenticated;

drop trigger if exists campaign_percents_validate on public.campaign_percents;
create trigger campaign_percents_validate
	before insert on public.campaign_percents
	for each row execute function public.validate_campaign_percent();

-- ---------------------------------------------------------------------
-- 3 · A marcação da peça — uma por peça e campanha
-- ---------------------------------------------------------------------
--
-- O percentual marcado tem de ser um dos da campanha, e é o BANCO que confere: a chave composta
-- `(campaign_id, percent)` aponta para `campaign_percents`. É `restrict`: tirar da campanha um
-- percentual que peças usam é recusado (`23503`), e o painel traduz com a contagem da view abaixo.
--
-- Apagar a campanha leva as marcações junto (`cascade` em `campaign_id`); apagar a peça também.

create table if not exists public.product_campaigns (
	product_id  uuid not null references public.products (id) on delete cascade,
	campaign_id uuid not null references public.campaigns (id) on delete cascade,
	percent     integer not null,
	created_at  timestamptz not null default now(),
	primary key (product_id, campaign_id),
	constraint product_campaigns_percent_fkey
		foreign key (campaign_id, percent) references public.campaign_percents (campaign_id, percent)
		on delete restrict
);

-- A chave composta consulta esta combinação a cada percentual tirado, e o filtro da lista de
-- produtos do painel recorta por ela.
create index if not exists product_campaigns_campaign_percent_idx
	on public.product_campaigns (campaign_id, percent);

-- ---------------------------------------------------------------------
-- 4 · A campanha na linha do pedido
-- ---------------------------------------------------------------------
--
-- Só a coluna e a chave. Campanha usada em pedido não se apaga (`restrict`). Quem grava a coluna é a
-- function `checkout`, e as outras colunas do pedido são de outra entrega.

alter table public.order_items
	add column if not exists campaign_id uuid
		constraint order_items_campaign_id_fkey references public.campaigns (id) on delete restrict;

create index if not exists order_items_campaign_id_idx
	on public.order_items (campaign_id)
	where campaign_id is not null;

-- ---------------------------------------------------------------------
-- 5 · Quantas peças usam cada percentual
-- ---------------------------------------------------------------------
--
-- Contagem é VIEW, não coluna: materializar daria um segundo dono do número. `security_invoker` faz a
-- view respeitar a RLS de quem consulta.

create or replace view public.campaign_percent_usage with (security_invoker = true) as
select
	cp.campaign_id,
	cp.percent,
	count(pc.product_id)::integer as products
from public.campaign_percents cp
left join public.product_campaigns pc
	on pc.campaign_id = cp.campaign_id
	and pc.percent = cp.percent
group by cp.campaign_id, cp.percent;

-- ---------------------------------------------------------------------
-- 6 · A gravação da campanha — o cadastro e os percentuais numa transação
-- ---------------------------------------------------------------------
--
-- `security invoker`: a RLS das tabelas vale para quem chama, e a recusa explícita abaixo só diz o
-- motivo antes. Os percentuais tirados saem ANTES dos acrescentados, para trocar um pelo outro numa
-- campanha com cinco não esbarrar no teto. Tirar percentual em uso esbarra na chave composta
-- (`23503`); cruzar outra ligada, na exclusão (`23P01`). As duas desfazem a gravação inteira.

create or replace function public.save_campaign(
	p_id           uuid,
	p_name         text,
	p_badge_text   text,
	p_band_color   text,
	p_accent_color text,
	p_starts_at    timestamptz,
	p_ends_at      timestamptz,
	p_active       boolean,
	p_percents     integer[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_id uuid;
begin
	if not public.has_role(auth.uid(), 'admin') then
		raise exception 'Só quem administra a loja grava campanha.'
			using errcode = '42501';
	end if;

	if p_id is null then
		insert into public.campaigns (name, badge_text, band_color, accent_color, starts_at, ends_at, active)
		values (btrim(p_name), btrim(p_badge_text), p_band_color, p_accent_color, p_starts_at, p_ends_at, p_active)
		returning id into v_id;
	else
		update public.campaigns
		   set name = btrim(p_name),
		       badge_text = btrim(p_badge_text),
		       band_color = p_band_color,
		       accent_color = p_accent_color,
		       starts_at = p_starts_at,
		       ends_at = p_ends_at,
		       active = p_active
		 where id = p_id
		returning id into v_id;

		if v_id is null then
			raise exception 'Campanha não encontrada.'
				using errcode = 'P0002';
		end if;
	end if;

	delete from public.campaign_percents
	 where campaign_id = v_id
	   and percent <> all (coalesce(p_percents, '{}'::integer[]));

	insert into public.campaign_percents (campaign_id, percent)
	select v_id, p
	  from unnest(coalesce(p_percents, '{}'::integer[])) as p
	on conflict do nothing;

	return v_id;
end;
$$;

revoke all on function public.save_campaign(uuid, text, text, text, text, timestamptz, timestamptz, boolean, integer[]) from public;
revoke all on function public.save_campaign(uuid, text, text, text, text, timestamptz, timestamptz, boolean, integer[]) from anon;
grant execute on function public.save_campaign(uuid, text, text, text, text, timestamptz, timestamptz, boolean, integer[]) to authenticated;

-- ---------------------------------------------------------------------
-- 7 · RLS — a loja vê só a campanha em vigência; só o admin vê e grava tudo
-- ---------------------------------------------------------------------
--
-- A leitura pública é por `now()`, no molde de `promotions_public_read`: ligada, início
-- INCLUSIVO e fim EXCLUSIVO — o mesmo predicado de `core/campaigns/live.ts`, conferido por
-- `campanhaVigenciaParidade.test.ts`. A agendada e a desligada não chegam ao navegador.
--
-- As filhas NÃO repetem a vigência: perguntam `exists` sobre `campaigns`, que passa pela RLS do papel
-- corrente. A marcação pública exige também a peça ativa.
--
-- Nenhum `grant` a `anon` é emitido: o `select` do anon vem do privilégio padrão do schema público, e
-- nenhuma policy de escrita o alcança (as de escrita são `to authenticated` com `has_role`).

alter table public.campaigns         enable row level security;
alter table public.campaign_percents enable row level security;
alter table public.product_campaigns enable row level security;

drop policy if exists "campaigns_public_read" on public.campaigns;
create policy "campaigns_public_read" on public.campaigns
	for select
	to anon, authenticated
	using (active and starts_at <= now() and now() < ends_at);

drop policy if exists "campaigns_admin_write" on public.campaigns;
create policy "campaigns_admin_write" on public.campaigns
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));

drop policy if exists "campaign_percents_public_read" on public.campaign_percents;
create policy "campaign_percents_public_read" on public.campaign_percents
	for select
	to anon, authenticated
	using (exists (select 1 from public.campaigns c where c.id = campaign_id));

drop policy if exists "campaign_percents_admin_write" on public.campaign_percents;
create policy "campaign_percents_admin_write" on public.campaign_percents
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));

drop policy if exists "product_campaigns_public_read" on public.product_campaigns;
create policy "product_campaigns_public_read" on public.product_campaigns
	for select
	to anon, authenticated
	using (
		exists (select 1 from public.campaigns c where c.id = campaign_id)
		and exists (select 1 from public.products p where p.id = product_id and p.is_active)
	);

drop policy if exists "product_campaigns_admin_write" on public.product_campaigns;
create policy "product_campaigns_admin_write" on public.product_campaigns
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));
