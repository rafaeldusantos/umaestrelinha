-- Feature 80 — o fornecedor da peça (FOR-01..04).
--
-- Duas tabelas próprias, e não colunas de `products`, POR SEGURANÇA: a policy de leitura pública de
-- `products` (`using (is_active = true)`) não recorta coluna, então qualquer visitante lê toda coluna
-- de todo produto ativo com a chave pública. O fornecedor é informação só do painel.
--
-- Sem escrita de dado: nenhum produto nasce com fornecedor.

-- ---------------------------------------------------------------------
-- 1 · Os fornecedores — o nome é reutilizado entre produtos
-- ---------------------------------------------------------------------

create table if not exists public.suppliers (
	id         uuid primary key default gen_random_uuid(),
	name       text not null check (char_length(btrim(name)) between 1 and 120),
	created_at timestamptz not null default now()
);

-- Único sem diferença de maiúsculas e de espaço nas pontas: "Ateliê Prata" e " ateliê prata " são o
-- mesmo fornecedor. O acento é decidido na tela (a sugestão casa sem acento e reaproveita o que já
-- existe); o banco segura a duplicata exata.
create unique index if not exists suppliers_name_key on public.suppliers (lower(btrim(name)));

-- ---------------------------------------------------------------------
-- 2 · O vínculo — um fornecedor por produto, com o link da peça
-- ---------------------------------------------------------------------

create table if not exists public.product_suppliers (
	product_id  uuid primary key references public.products (id) on delete cascade,
	supplier_id uuid not null references public.suppliers (id) on delete restrict,
	url         text check (url is null or (url ~* '^https?://' and char_length(url) <= 2000)),
	updated_at  timestamptz not null default now()
);

-- O filtro da listagem pergunta "quais produtos são deste fornecedor?".
create index if not exists product_suppliers_supplier_id_idx on public.product_suppliers (supplier_id);

-- ---------------------------------------------------------------------
-- 3 · RLS — só o admin lê e grava
-- ---------------------------------------------------------------------
--
-- O schema público concede tudo a anon e authenticated por default privilege; o `revoke` tira o
-- anon do caminho antes mesmo do RLS, e a policy única exige `has_role` no `using` E no `with check`
-- (só o `using` deixaria um não-admin inserir, porque `insert` não tem linha antiga para filtrar).

alter table public.suppliers         enable row level security;
alter table public.product_suppliers enable row level security;

revoke all on table public.suppliers         from anon;
revoke all on table public.product_suppliers from anon;

drop policy if exists "admin full suppliers" on public.suppliers;
create policy "admin full suppliers" on public.suppliers
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full product suppliers" on public.product_suppliers;
create policy "admin full product suppliers" on public.product_suppliers
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));
