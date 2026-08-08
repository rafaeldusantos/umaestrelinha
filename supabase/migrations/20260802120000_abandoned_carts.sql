-- =====================================================================
-- abandoned_carts: a tabela que o código sempre supôs e o banco nunca teve
-- =====================================================================
--
-- Sintoma: entrar no /checkout com e-mail preenchido dispara dois 404 do PostgREST —
-- `GET /rest/v1/abandoned_carts?...` e `POST /rest/v1/abandoned_carts` com
-- `PGRST205: Could not find the table 'public.abandoned_carts' in the schema cache`.
--
-- Causa: a feature nasceu no Lovable e o DDL ficou em `.lovable/sql/003_abandoned_carts.sql`,
-- um script para colar no SQL Editor do dashboard. Nunca virou migration. As irmãs dele
-- (`001_store_settings`, `002_coupons`) foram migradas; esta ficou para trás. Banco novo —
-- ou `supabase db reset` — nasce sem a tabela, e o tracker do carrinho 404 em silêncio.
-- Mesma armadilha do AD-012: `DbAbandonedCart` existe em `packages/supabase` há meses e
-- descreve colunas que o Postgres nunca teve. Tipo escrito à mão é afirmação, não verificação.
--
-- O que muda em relação ao script do Lovable, e por quê:
--
-- 1. A escrita do cliente sai das políticas e vira RPC. O script original tinha
--    `INSERT ... WITH CHECK (true)` para anon + `UPDATE USING (status = 'active')`, mas
--    NENHUMA política de SELECT para anon — só admin lê. O tracker faz
--    "select id where email = ... and status = 'active'" para decidir entre update e insert;
--    esse select volta vazio para todo cliente não-admin, então ele sempre cai no INSERT e
--    sempre bate no índice único parcial a partir do segundo write. O `catch {}` do hook engole
--    o 23505 e o carrinho congela no primeiro snapshot: `last_activity_at` nunca avança, e o
--    corte por `threshold_hours` passa a medir a hora errada. Um upsert atômico resolve, mas
--    `supabase-js` não expressa `on conflict (col) where <predicado>` — de novo o motivo do
--    AD-006. Daí `track_abandoned_cart`.
-- 2. `customer_id` vem de `auth.uid()` dentro da função, não do corpo da requisição. O cliente
--    mandava o próprio id no payload; nada impedia mandar o de outra pessoa.
-- 3. `mark_cart_recovered` exige que o pedido citado seja mesmo daquele e-mail, senão qualquer
--    um esconderia o carrinho de qualquer outro da lista do backoffice.
--
-- Idempotente de ponta a ponta: o banco hospedado pode já ter recebido o script do Lovable.

create table if not exists public.abandoned_carts (
	id uuid primary key default gen_random_uuid(),
	customer_email text not null,
	customer_name text,
	customer_id uuid references auth.users(id) on delete set null,
	items jsonb not null default '[]'::jsonb,
	subtotal numeric(10, 2) not null default 0,
	coupon_code text,
	marketing_consent boolean not null default false,
	status text not null default 'active' check (status in ('active', 'abandoned', 'recovered', 'lost')),
	reminder_sent_at timestamptz,
	reminder_sent_count int not null default 0,
	recovered_order_id uuid references public.orders(id) on delete set null,
	last_activity_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_abandoned_carts_email on public.abandoned_carts (customer_email);
create index if not exists idx_abandoned_carts_status on public.abandoned_carts (status);
create index if not exists idx_abandoned_carts_last_activity on public.abandoned_carts (last_activity_at desc);
create index if not exists idx_abandoned_carts_customer on public.abandoned_carts (customer_id);

-- Um carrinho ativo por e-mail. É também o ponto de serialização do `on conflict` da RPC —
-- por ser parcial, o `on conflict` precisa repetir o predicado para inferir este índice.
create unique index if not exists uniq_abandoned_carts_active_email
	on public.abandoned_carts (customer_email)
	where status = 'active';

-- RLS obrigatória: `20260801130000_public_schema_grants.sql` dá GRANT ALL a anon/authenticated
-- em toda tabela nova do public. Sem RLS aqui, a tabela ficaria aberta.
alter table public.abandoned_carts enable row level security;

-- Sem política de INSERT/UPDATE para anon: quem escreve é a RPC (security definer).
drop policy if exists "abandoned_carts_public_insert" on public.abandoned_carts;
drop policy if exists "abandoned_carts_self_update" on public.abandoned_carts;

drop policy if exists "abandoned_carts_admin_read" on public.abandoned_carts;
create policy "abandoned_carts_admin_read" on public.abandoned_carts
	for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "abandoned_carts_admin_update" on public.abandoned_carts;
create policy "abandoned_carts_admin_update" on public.abandoned_carts
	for update to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "abandoned_carts_admin_delete" on public.abandoned_carts;
create policy "abandoned_carts_admin_delete" on public.abandoned_carts
	for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_abandoned_carts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_abandoned_carts_updated_at on public.abandoned_carts;
create trigger trg_abandoned_carts_updated_at
	before update on public.abandoned_carts
	for each row
	execute function public.touch_abandoned_carts_updated_at();

-- ---------------------------------------------------------------------
-- track_abandoned_cart — upsert atômico do carrinho ativo do e-mail. Devolve o id da linha.
-- ---------------------------------------------------------------------
-- Uma statement. O visitante não precisa (e não tem) permissão de leitura na tabela para
-- decidir entre inserir e atualizar; o `on conflict` decide. `recovered`/`abandoned`/`lost`
-- ficam fora do índice parcial, então um carrinho já finalizado não é sobrescrito: o próximo
-- snapshot do mesmo e-mail abre uma linha nova, que é o comportamento correto.
create or replace function public.track_abandoned_cart(
	p_email text,
	p_name text,
	p_items jsonb,
	p_subtotal numeric,
	p_coupon_code text,
	p_marketing_consent boolean
)
returns uuid
language sql
security definer
set search_path = public
as $$
	insert into public.abandoned_carts as ac (
		customer_email, customer_name, customer_id, items, subtotal,
		coupon_code, marketing_consent, status, last_activity_at
	)
	values (
		lower(trim(p_email)), p_name, auth.uid(), coalesce(p_items, '[]'::jsonb),
		coalesce(p_subtotal, 0), nullif(p_coupon_code, ''), coalesce(p_marketing_consent, false),
		'active', now()
	)
	on conflict (customer_email) where status = 'active' do update
		set customer_name = coalesce(excluded.customer_name, ac.customer_name),
			customer_id = coalesce(excluded.customer_id, ac.customer_id),
			items = excluded.items,
			subtotal = excluded.subtotal,
			coupon_code = excluded.coupon_code,
			marketing_consent = excluded.marketing_consent,
			last_activity_at = now()
	returning ac.id;
$$;

-- ---------------------------------------------------------------------
-- mark_cart_recovered — fecha o carrinho ativo quando o pedido daquele e-mail nasce.
-- ---------------------------------------------------------------------
-- O `exists` é o que impede um terceiro de sumir com o carrinho alheio da lista do backoffice:
-- só fecha se o pedido citado for mesmo daquele e-mail.
create or replace function public.mark_cart_recovered(
	p_email text,
	p_order_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
	update public.abandoned_carts
	set status = 'recovered',
		recovered_order_id = p_order_id,
		last_activity_at = now()
	where customer_email = lower(trim(p_email))
		and status = 'active'
		and exists (
			select 1 from public.orders o
			where o.id = p_order_id
				and lower(o.customer_email) = lower(trim(p_email))
		);
$$;

-- ---------------------------------------------------------------------
-- get_abandoned_cart — leitura por id, para o link `/carrinho?recover=<id>`.
-- ---------------------------------------------------------------------
-- A leitura da tabela é só de admin, então o cliente que clica no lembrete não conseguiria ler
-- o próprio carrinho — `useRecoverCart` voltaria vazio e o link morreria em "carrinho não
-- encontrado". A porta é por id, e o id é um uuid v4 não enumerável: mesma postura do link de
-- confirmação de pedido. Devolve só o que a recuperação usa — nada de `marketing_consent`,
-- `reminder_*` ou `customer_id`.
create or replace function public.get_abandoned_cart(p_id uuid)
returns table (
	id uuid,
	customer_email text,
	items jsonb,
	coupon_code text,
	status text
)
language sql
stable
security definer
set search_path = public
as $$
	select ac.id, ac.customer_email, ac.items, ac.coupon_code, ac.status
	from public.abandoned_carts ac
	where ac.id = p_id;
$$;

revoke all on function public.get_abandoned_cart(uuid) from public;
grant execute on function public.get_abandoned_cart(uuid) to anon, authenticated, service_role;

revoke all on function public.track_abandoned_cart(text, text, jsonb, numeric, text, boolean) from public;
grant execute on function public.track_abandoned_cart(text, text, jsonb, numeric, text, boolean)
	to anon, authenticated, service_role;

revoke all on function public.mark_cart_recovered(text, uuid) from public;
grant execute on function public.mark_cart_recovered(text, uuid) to anon, authenticated, service_role;

-- Defaults de `store_settings.abandoned_cart` (espelha DEFAULT_ABANDONED_CART em
-- packages/supabase/src/types/settings.ts).
insert into public.store_settings (key, value) values (
	'abandoned_cart',
	jsonb_build_object(
		'threshold_hours', 4,
		'auto_email_enabled', false,
		'auto_email_hours', 24,
		'reminder_coupon_code', ''
	)
)
on conflict (key) do nothing;
