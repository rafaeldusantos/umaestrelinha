-- =====================================================================
-- order_emails: auditoria + reivindicação ATÔMICA de envio de e-mail
-- IDM-01..IDM-06 (feature 10-emails-transacionais)
-- =====================================================================
--
-- Por que uma RPC e não um upsert no client:
--
-- O caminho ingênuo — "checa se já enviou → insere pending → chama o Resend → marca sent" — com
-- índice único PARCIAL `where status = 'sent'` NÃO previne envio duplo. Dois chamadores concorrentes
-- passam a checagem, os dois inserem `pending` (nenhuma constraint violada, porque nenhum está
-- `sent`), os dois enviam, e o segundo `update` falha DEPOIS da entrega: e-mail duplicado mais linha
-- de auditoria perdida. Não é hipotético — duplo toque no CTA do PIX dispara dois `create-payment`
-- (idempotency_key é UUID novo por tentativa) e o webhook do MP retenta em qualquer não-2xx.
--
-- A reivindicação tem de ser atômica ANTES do envio. E `supabase-js` não sabe expressar o
-- `on conflict … do update … where` que faz isso (`.upsert()` não tem `where`), então a RPC não é
-- preferência de estilo: é a única forma correta. Molde copiado de
-- 20260718235214_payment_approval_rpc.sql — mesma estrutura security definer + revoke/grant.

create table if not exists public.order_emails (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	type text not null check (type in ('order_received', 'order_paid', 'order_shipped')),
	status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
	attempts int not null default 1,
	provider_message_id text,
	error text,
	created_at timestamptz not null default now(),
	sent_at timestamptz
);

-- NÃO parcial, de propósito: é o índice que serve de ponto de serialização do `on conflict` abaixo.
-- Um índice `where status = 'sent'` só detectaria a colisão depois da entrega.
create unique index if not exists order_emails_order_type
	on public.order_emails (order_id, type);

create index if not exists idx_order_emails_order_id
	on public.order_emails (order_id);

-- RLS: nenhuma política de ESCRITA. Quem escreve é a edge function com a service role, que passa por
-- cima da RLS; anon e authenticated não têm caminho de escrita nenhum. Leitura só para admin, para o
-- backoffice poder auditar "avisamos este cliente?" no futuro.
alter table public.order_emails enable row level security;

drop policy if exists "admin read order_emails" on public.order_emails;
create policy "admin read order_emails" on public.order_emails
	for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- claim_order_email — devolve o id quando a reivindicação é MINHA; NULL quando já foi enviado.
-- ---------------------------------------------------------------------
-- Uma statement, sem corrida. O Postgres devolve ZERO LINHAS quando o `where` do DO UPDATE é falso,
-- então "já enviado" e "reivindicado agora" se distinguem por ter ou não recebido um id — e uma
-- função SQL escalar cujo corpo não retorna linha devolve NULL.
--
-- Uma linha em `failed` é reivindicável de novo (retentativa manual do admin), e `attempts` registra
-- quantas vezes. Só `sent` é terminal.
create or replace function public.claim_order_email(
	p_order_id uuid,
	p_type text
)
returns uuid
language sql
security definer
set search_path = public
as $$
	insert into public.order_emails as oe (order_id, type, status)
	values (p_order_id, p_type, 'pending')
	on conflict (order_id, type) do update
		set status = 'pending',
			attempts = oe.attempts + 1,
			error = null,
			sent_at = null
	where oe.status <> 'sent'
	returning oe.id;
$$;

-- ---------------------------------------------------------------------
-- finish_order_email — fecha a linha reivindicada. `p_error` null ⇒ sent; preenchido ⇒ failed.
-- ---------------------------------------------------------------------
create or replace function public.finish_order_email(
	p_id uuid,
	p_provider_message_id text,
	p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
	update public.order_emails
	set status = case when p_error is null then 'sent' else 'failed' end,
		sent_at = case when p_error is null then now() else null end,
		provider_message_id = coalesce(p_provider_message_id, provider_message_id),
		error = p_error
	where id = p_id;
$$;

revoke all on function public.claim_order_email(uuid, text) from public;
revoke all on function public.claim_order_email(uuid, text) from anon;
revoke all on function public.claim_order_email(uuid, text) from authenticated;
grant execute on function public.claim_order_email(uuid, text) to service_role;

revoke all on function public.finish_order_email(uuid, text, text) from public;
revoke all on function public.finish_order_email(uuid, text, text) from anon;
revoke all on function public.finish_order_email(uuid, text, text) from authenticated;
grant execute on function public.finish_order_email(uuid, text, text) to service_role;
