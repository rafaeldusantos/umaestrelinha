-- Feature 82 — quem informou o código do envelope, e quando (ENV-22, A1).
--
-- Aditiva e idempotente. Nenhuma escrita de dado: as linhas antigas ficam com as duas colunas nulas,
-- e a tela diz "Código informado há…" — nunca inventa a autoria (A2).
--
-- Por que dentro da RPC, e não num gatilho ou numa segunda chamada do cliente: `set_material_tracking`
-- é a ÚNICA escrita do código (loja, painel e app chamam a mesma), e ela já sabe quem chama — a mesma
-- leitura de papel que autoriza decide a autoria. Um parâmetro "quem sou eu" seria forjável.
--
-- Ordem de publicação: migration → bundles. O detalhe do app passa a pedir as duas colunas no
-- `select`; sem elas a leitura inteira falha.

alter table public.orders
	add column if not exists material_tracking_set_at timestamptz,
	add column if not exists material_tracking_set_by text;

alter table public.orders drop constraint if exists orders_material_tracking_set_by_check;
alter table public.orders
	add constraint orders_material_tracking_set_by_check
	check (material_tracking_set_by is null or material_tracking_set_by in ('customer', 'admin'));

-- A mesma RPC da `22`, com as duas colunas a mais. O corpo é idêntico até o `update`; o `where` da
-- autorização não muda (autorização e leitura na MESMA consulta — "não é seu" e "não existe" seguem
-- respondendo igual). O papel é lido UMA vez e serve às duas perguntas.
create or replace function public.set_material_tracking(
	p_order_id uuid,
	p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_code text;
	v_current text;
	v_next text;
	v_admin boolean;
begin
	v_code := nullif(btrim(coalesce(p_code, '')), '');
	if v_code is null then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'empty_code');
	end if;

	v_admin := public.has_role(auth.uid(), 'admin');

	select o.material_status into v_current
	from public.orders o
	where o.id = p_order_id
		and (
			v_admin
			or o.customer_id in (select c.id from public.customers c where c.user_id = auth.uid())
		);

	if not found then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'not_allowed');
	end if;

	if v_current = 'nao_aplicavel' then
		return jsonb_build_object('ok', false, 'status', v_current, 'reason', 'material_not_applicable');
	end if;

	-- O estado só AVANÇA, e só a partir de `aguardando_material` (MAT-11 AC 12, da `22`).
	v_next := case when v_current = 'aguardando_material' then 'material_enviado' else v_current end;

	update public.orders
	set material_tracking_code = v_code,
		material_status = v_next,
		material_tracking_set_at = now(),
		-- Quem tem papel de admin é "você" para o ateliê, mesmo se for também a dona do pedido.
		material_tracking_set_by = case when v_admin then 'admin' else 'customer' end
	where id = p_order_id;

	return jsonb_build_object('ok', true, 'status', v_next, 'reason', null);
end;
$$;

revoke all on function public.set_material_tracking(uuid, text) from public;
revoke all on function public.set_material_tracking(uuid, text) from anon;
grant execute on function public.set_material_tracking(uuid, text) to authenticated;

-- `order_list`: `create or replace view` só aceita coluna ACRESCENTADA AO FIM. A lista abaixo é a da
-- migration da `35`, copiada sem reordenar nada; as duas da `82` entram depois de `customer_document`.
create or replace view public.order_list
with (security_invoker = true) as
select
	id, order_number, customer_id, status, subtotal, shipping_cost, discount, total,
	payment_method, shipping_method, tracking_code, notes, created_at, updated_at,
	customer_name, customer_email, address_street, address_number, address_neighborhood,
	address_city, address_state, shipping_carrier, cancel_reason, address_zip,
	address_complement, melhor_envio_id, melhor_envio_label_url, melhor_envio_protocol,
	coupon_code, coupon_id, payment_status, mp_payment_id, mp_status_detail, paid_at,
	pix_discount, shipping_service_id, delivery_estimate_min, delivery_estimate_max,
	mp_order_id, promotion_id, promotion_discount, material_status, material_tracking_code,
	material_received_at,
	row_number() over (
		partition by (coalesce(customer_id::text, lower(customer_email))) order by created_at
	)::integer as purchase_ordinal,
	customer_phone,
	customer_document,
	-- Feature 82, no fim.
	material_tracking_set_at,
	material_tracking_set_by
from public.orders o;
