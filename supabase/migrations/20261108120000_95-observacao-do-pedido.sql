-- A observação do pedido — o texto que só quem administra lê e escreve.
--
-- Uma tabela própria, e não coluna de `orders`, POR SIGILO: a cliente lê a linha inteira do pedido
-- dela (a policy de leitura da dona do pedido não recorta coluna, a loja pede todas as colunas, a
-- function `get-order` devolve a linha, o Realtime publica a linha e a view `order_list` é
-- `security_invoker`). Qualquer coluna nova em `orders` chegaria ao navegador dela.
--
-- Não é o Recado da cliente (`orders.notes`) nem a Nota interna (`order_notes`, histórico só de
-- acréscimo): é UM texto por pedido, editável, com quem editou por último e quando. O teto é o
-- `ORDER_ADMIN_NOTE_MAX` de `@estrelinha/core/orders` (o guarda da migration o importa), contado como
-- o TypeScript conta: o texto aparado, em pontos de código. Vazio não existe aqui — gravar vazio
-- apaga a linha.
--
-- O nome de quem editou é gravado no momento (`updated_by_name`): o painel não lê `auth.users`.
-- Apagar a conta de quem editou anula `updated_by` e preserva o nome e o texto.
--
-- A tabela não entra na publicação do Realtime. Sem escrita de dado: nenhum pedido nasce com
-- observação.

create table if not exists public.order_admin_notes (
	order_id        uuid primary key references public.orders (id) on delete cascade,
	note            text not null check (char_length(btrim(note)) between 1 and 1000),
	updated_by      uuid references auth.users (id) on delete set null,
	updated_by_name text,
	updated_at      timestamptz not null default now()
);

-- O instante da edição é do BANCO. O `default now()` só vale no `insert`; a edição (o upsert em
-- conflito) é um `update`, e sem este trigger o instante viria do relógio de quem grava — o celular,
-- no app do ateliê. Quem grava não manda `updated_at`.
drop trigger if exists set_order_admin_notes_updated_at on public.order_admin_notes;
create trigger set_order_admin_notes_updated_at
	before update on public.order_admin_notes
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- RLS — só o admin lê e grava
-- ---------------------------------------------------------------------
--
-- O schema público concede tudo a anon e authenticated por default privilege; o `revoke` tira o
-- anon do caminho antes mesmo do RLS, e a policy única exige `has_role` no `using` E no `with check`
-- (só o `using` deixaria uma cliente logada inserir, porque `insert` não tem linha antiga para
-- filtrar). `to authenticated` sozinho não basta: toda cliente logada é `authenticated`.

alter table public.order_admin_notes enable row level security;

revoke all on table public.order_admin_notes from anon;

drop policy if exists "admin full order admin notes" on public.order_admin_notes;
create policy "admin full order admin notes" on public.order_admin_notes
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

comment on table public.order_admin_notes is
	'Observacao do pedido, so para quem administra a loja. Legivel e gravavel SO por admin (has_role no using E no with check). A cliente nunca a recebe: por isso nao e coluna de orders.';
