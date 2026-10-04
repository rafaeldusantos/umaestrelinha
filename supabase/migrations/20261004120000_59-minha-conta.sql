-- Feature 59 — Minha Conta V2: o que a area da cliente precisa do banco.
--
-- Quatro comandos independentes, cada um com regua propria no guarda
-- `minhaContaSchema.test.ts` (suite da loja), que le ESTE arquivo do disco:
--
--   1. `customer_order_events` — as datas reais da linha do tempo do pedido,
--      lidas de `order_status_history`, que e fechada a nao-admin desde a `52`.
--   2. `guard_customer_identity` — a cliente deixa de poder trocar o proprio
--      e-mail e o CPF ja preenchido pelo PostgREST.
--   3. `addresses_one_default` — no maximo UM endereco padrao por cliente.
--   4. A renumeracao dos 2 pedidos com numero antigo da marca anterior.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada e imutavel, e nenhuma e
-- reescrita aqui. As da `58` continuam como estao; o comando 4 e o que a
-- decisao `AD-044` (2026-10-04) pediu, e e ele que revoga em parte o
-- *Out of Scope* da `58`.

-- ---------------------------------------------------------------------
-- 1. customer_order_events — o historico do PROPRIO pedido
--
-- `order_status_history` e lida so por admin desde a `52`, e assim continua.
-- A cliente nao ganha policy nenhuma: ganha esta funcao, que devolve SO
-- `status` (o `to_status`) e `created_at`, e SO quando o pedido e dela. `note`
-- (texto interno da Adri) e `created_by` (quem mexeu) NAO saem daqui.
--
-- Pedido alheio e pedido inexistente devolvem a MESMA coisa — zero linhas —,
-- para a funcao nao virar oraculo de quais ids existem.
--
-- `security definer` porque quem a chama nao le a tabela; `search_path` vazio
-- porque uma funcao com o poder do dono nao pode resolver nome pelo caminho de
-- quem a chama. Tudo qualificado, inclusive `auth.uid()`.
-- ---------------------------------------------------------------------
create or replace function public.customer_order_events(p_order_id uuid)
returns table (status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
	select h.to_status, h.created_at
	from public.order_status_history h
	join public.orders o on o.id = h.order_id
	join public.customers c on c.id = o.customer_id
	where h.order_id = p_order_id
		and c.user_id = auth.uid()
	order by h.created_at;
$$;

revoke all on function public.customer_order_events(uuid) from public;
revoke all on function public.customer_order_events(uuid) from anon;
grant execute on function public.customer_order_events(uuid) to authenticated;

comment on function public.customer_order_events(uuid) is
	'Feature 59 (LIN-01..03). Datas da linha do tempo do pedido da PROPRIA cliente: so status e created_at de order_status_history, nunca note nem created_by. Pedido alheio ou inexistente devolve zero linhas. Fechada a anon.';

-- ---------------------------------------------------------------------
-- 2. guard_customer_identity — e-mail e CPF preenchido nao mudam pela cliente
--
-- A policy de UPDATE em `customers` (2026-07-27) libera a LINHA inteira da
-- propria cliente, porque nome e telefone precisam ser editaveis. RLS nao tem
-- granularidade de coluna; quem faz o recorte e este gatilho:
--
--   email    nunca muda pela cliente — e o login (GoTrue) e o snapshot dos
--            pedidos; trocar so aqui faria os dois divergirem.
--   user_id  nunca muda pela cliente — e o dono da linha.
--   cpf      pode ir de vazio para preenchido UMA vez; depois, trava. Ele
--            identifica quem pagou (`buildPayer` le daqui).
--
-- Tres saidas, e so tres, deixam passar:
--
--   `auth.role() = 'service_role'`  a edge function `checkout` e o importador.
--   `has_role(auth.uid(), 'admin')` o painel.
--   `current_user` fora de `authenticated`/`anon`  manutencao direta no banco
--            (migration, `db query`) e funcao `security definer` do dono — a
--            unica que existe sobre esta tabela e `anonymize_customer`, ja
--            guardada por `has_role`.
--
-- Por isso esta funcao NAO e `security definer`: se fosse, `current_user`
-- seria sempre o dono, e a terceira saida liberaria todo mundo.
--
-- SPEC_DEVIATION: o design lista DUAS saidas (service role e admin); a
-- terceira (`current_user` fora de authenticated/anon) foi acrescentada.
-- Reason: sem ela, toda manutencao direta no banco (SQL Editor, `db query`,
-- migration futura) seria recusada ao corrigir e-mail ou CPF, porque ali nao
-- ha JWT e `has_role(null)` e falso. A cliente continua sem saida: pelo
-- PostgREST ela e sempre `authenticated`.
-- ---------------------------------------------------------------------
create or replace function public.guard_customer_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_user not in ('authenticated', 'anon')
		or auth.role() = 'service_role'
		or public.has_role(auth.uid(), 'admin') then
		return new;
	end if;

	if new.email is distinct from old.email then
		raise exception 'O e-mail de acesso nao pode ser alterado por aqui.'
			using errcode = '42501';
	end if;

	if new.user_id is distinct from old.user_id then
		raise exception 'O dono deste cadastro nao pode ser alterado.'
			using errcode = '42501';
	end if;

	if coalesce(btrim(old.cpf), '') <> '' and new.cpf is distinct from old.cpf then
		raise exception 'O CPF ja informado nao pode ser alterado por aqui.'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

drop trigger if exists guard_customer_identity on public.customers;
create trigger guard_customer_identity
	before update on public.customers
	for each row
	execute function public.guard_customer_identity();

-- ---------------------------------------------------------------------
-- 3. addresses_one_default — no maximo um endereco padrao por cliente
--
-- O caixa pre-preenche com o endereco `is_default` (`useDefaultAddress`), e a
-- conta passa a editar exatamente esse. Dois padroes fariam cada tela escolher
-- um diferente. "No maximo um" se garante por indice unico PARCIAL, nao por
-- transacao na aplicacao: duas abas salvando ao mesmo tempo passariam as duas
-- por qualquer checagem feita antes da escrita (`L-018`).
--
-- Antes do indice, o desempate: num banco que ja tenha dois padroes para a
-- mesma cliente, fica o mais recente. No banco de hoje deve ser zero linhas —
-- o comando existe para o indice nao falhar onde houver.
-- ---------------------------------------------------------------------
update public.addresses a
set is_default = false
where a.is_default
	and exists (
		select 1
		from public.addresses b
		where b.customer_id = a.customer_id
			and b.is_default
			and (coalesce(b.created_at, '-infinity'::timestamptz), b.id)
				> (coalesce(a.created_at, '-infinity'::timestamptz), a.id)
	);

create unique index if not exists addresses_one_default
	on public.addresses (customer_id)
	where is_default;

-- ---------------------------------------------------------------------
-- 4. A renumeracao dos pedidos com numero antigo
--
-- Os 2 pedidos anteriores a sequence da `58` tem numero que nao se le nem se
-- dita (prefixo da marca anterior + relogio em base36). Decisao do usuario
-- (`AD-044`): eles ganham numero da sequencia, em ordem de criacao. Os 35
-- importados da Nuvemshop NAO sao tocados — ja sao curtos e as clientes os
-- citam no WhatsApp.
--
-- Idempotente pelo proprio recorte: depois da primeira passada nenhum pedido
-- casa mais com o prefixo antigo, e a segunda nao faz nada. `nextval` e o
-- mesmo dono do numero que o `default` da coluna usa — nenhum segundo gerador.
-- ---------------------------------------------------------------------
do $$
declare
	r record;
begin
	for r in
		select id
		from public.orders
		where order_number like 'NP-%'
		order by created_at, id
	loop
		update public.orders
		set order_number = lpad(nextval('public.orders_number_seq'::regclass)::text, 4, '0')
		where id = r.id;
	end loop;
end
$$;
