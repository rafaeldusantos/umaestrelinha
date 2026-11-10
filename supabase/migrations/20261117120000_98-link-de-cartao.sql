-- O link de pagamento por cartão de um pedido — a credencial que a Adri gera no painel.
--
-- Um pedido feito com cartão cujo pagamento ficou pendente, foi recusado ou venceu pode ganhar um
-- link (`/pagar-com-cartao#<token>`) que a cliente abre sem login para pagar o MESMO pedido, pelo
-- valor travado. A credencial é PRÓPRIA: não é a conta da cliente nem o acesso de 7 dias da
-- convidada (`orders.guest_access_hash`).
--
-- Uma tabela própria, e não coluna de `orders`, POR SIGILO: a cliente lê a linha inteira do pedido
-- dela (`select('*')` na loja, a function `get-order`), e qualquer coluna nova em `orders` chegaria
-- ao navegador dela.
--
-- O banco guarda só o HASH do token (SHA-256 em hex, como o acesso da convidada). O token existe uma
-- vez, na resposta de quem gerou o link.
--
-- Um link VIVO por pedido: o índice único parcial (`revoked_at is null`) recusa o segundo, e a RPC
-- `issue_order_card_link` revoga o vivo e grava o novo na MESMA transação — gerar outro invalida o
-- anterior. "Vale até o pedido ser pago ou cancelado" não é gravado aqui: quem lê o link olha o
-- pedido (`cardLinkSituation`, `core/checkout/cardLink.ts`), e o `create-payment` recusa pedido pago
-- ou cancelado antes de qualquer cobrança.
--
-- Gerar o link NÃO toca `orders`: o cancelamento automático do pedido não é adiado por ele.
--
-- RLS ligada, `revoke all` dos papéis de cliente e NENHUMA policy (molde da `89`): só as functions,
-- com a service role, leem e gravam. Sem escrita de dado.

create table if not exists public.order_card_links (
	id          uuid primary key default gen_random_uuid(),
	order_id    uuid not null references public.orders (id) on delete cascade,
	token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
	created_by  uuid references auth.users (id) on delete set null,
	created_at  timestamptz not null default now(),
	revoked_at  timestamptz
);

create unique index if not exists order_card_links_one_alive
	on public.order_card_links (order_id)
	where revoked_at is null;

alter table public.order_card_links enable row level security;

revoke all on table public.order_card_links from public;
revoke all on table public.order_card_links from anon;
revoke all on table public.order_card_links from authenticated;

grant all on table public.order_card_links to service_role;

comment on table public.order_card_links is
	'Link de pagamento por cartao de um pedido: so o hash do token, um vivo por pedido (revoked_at nulo). RLS ligada e nenhuma policy: so a service role (functions mercado-pago e checkout) le e grava.';

-- ---------------------------------------------------------------------
-- A emissão: revoga o vivo e grava o novo, numa transação
-- ---------------------------------------------------------------------
create or replace function public.issue_order_card_link(
	p_order_id uuid,
	p_token_hash text,
	p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_id uuid;
begin
	-- Duas gerações ao mesmo tempo para o mesmo pedido se enfileiram aqui: a segunda revoga o link
	-- da primeira, e nunca sobram dois vivos.
	perform 1 from public.orders where id = p_order_id for update;
	if not found then
		raise exception 'pedido inexistente' using errcode = 'P0002';
	end if;

	update public.order_card_links
		set revoked_at = now()
		where order_id = p_order_id and revoked_at is null;

	insert into public.order_card_links (order_id, token_hash, created_by)
		values (p_order_id, p_token_hash, p_created_by)
		returning id into v_id;

	return v_id;
end;
$$;

revoke all on function public.issue_order_card_link(uuid, text, uuid) from public;
revoke all on function public.issue_order_card_link(uuid, text, uuid) from anon;
revoke all on function public.issue_order_card_link(uuid, text, uuid) from authenticated;
grant execute on function public.issue_order_card_link(uuid, text, uuid) to service_role;

comment on function public.issue_order_card_link(uuid, text, uuid) is
	'Gera o link de cartao de um pedido: revoga o vivo e grava o novo (so o hash) na mesma transacao. Execute so da service role.';
