-- Feature 66 — Filtros de produto, curados no painel e aplicados na loja
--
-- Quatro tabelas novas e nada mais: os grupos de filtro, os valores de cada grupo, as marcações
-- (produto × valor) e o "esconder este grupo nesta categoria".
--
-- Idempotente de ponta a ponta, e sem uma única escrita de dado: a feature nasce sem grupo nenhum,
-- e montar os grupos é passo de operação da dona em /admin/filtros. A coluna de etiquetas do
-- produto não muda.
--
-- ⚠️ Os números desta migration têm PAR em TypeScript (`@estrelinha/core/filters`, `rules.ts`): o
-- 40 dos nomes é `FILTER_NAME_MAX`, e a lista de chaves reservadas do slug do grupo é
-- `RESERVED_FILTER_KEYS` mais o prefixo de campanha. `productFiltersSchema.test.ts` (suíte da loja)
-- LÊ ESTE ARQUIVO DO DISCO e compara — mudar um sem o outro derruba a suíte. Os tetos de CONTAGEM
-- (12 grupos, 60 valores por grupo) moram só em `core` e no painel, de propósito: o `check` de linha
-- não conta, e um trigger de contagem para um painel de uma pessoa é peso sem ganho.

-- ---------------------------------------------------------------------
-- 1 · Os grupos (FLT-01..05, FLT-09)
-- ---------------------------------------------------------------------
--
-- O slug é a chave do grupo na URL da loja. Por isso ele é único, tem o formato kebab-case e não
-- pode ser uma chave que a loja já usa: colidir com ela faria um filtro sequestrar a busca, a ordem
-- ou a faixa de preço.

create table if not exists public.filter_groups (
	id uuid primary key default gen_random_uuid(),
	name text not null
		constraint filter_groups_name_len check (char_length(name) between 1 and 40),
	slug text not null
		constraint filter_groups_slug_key unique
		constraint filter_groups_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
		constraint filter_groups_slug_reserved check (
			slug not in ('q', 'ordem', 'preco', 'estoque', 'desconto', 'novidades', 'pagina', 'gclid', 'fbclid')
			and slug not like 'utm\_%'
		),
	is_active boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2 · Os valores (FLT-06..08)
-- ---------------------------------------------------------------------
--
-- Apagar o grupo apaga os valores; o slug é único DENTRO do grupo ("Ouro" pode existir em dois).

create table if not exists public.filter_values (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.filter_groups(id) on delete cascade,
	name text not null
		constraint filter_values_name_len check (char_length(name) between 1 and 40),
	slug text not null
		constraint filter_values_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	sort_order integer not null default 0,
	constraint filter_values_group_slug_key unique (group_id, slug)
);

-- ---------------------------------------------------------------------
-- 3 · As marcações (FLT-11..20)
-- ---------------------------------------------------------------------
--
-- A chave composta é o que faz "marcar de novo" ser no-op (`on conflict do nothing`), e as duas
-- cascatas são o ciclo de vida: produto apagado ou valor apagado levam a marcação junto.

create table if not exists public.product_filter_values (
	product_id uuid not null references public.products(id) on delete cascade,
	value_id uuid not null references public.filter_values(id) on delete cascade,
	primary key (product_id, value_id)
);

-- A chave primária começa por `product_id`; a marcação em massa e a contagem por valor perguntam
-- por `value_id`.
create index if not exists product_filter_values_value_idx on public.product_filter_values (value_id);

-- ---------------------------------------------------------------------
-- 4 · Esconder um grupo numa categoria (FLT-35..38)
-- ---------------------------------------------------------------------
--
-- Curadoria é PRESENÇA de linha: sem linha, o grupo aparece. É o que faz um grupo novo nascer
-- visível em toda categoria sem migração, e o que torna uma flag `shown` um segundo dono.

create table if not exists public.category_hidden_filter_groups (
	category_id uuid not null references public.categories(id) on delete cascade,
	group_id uuid not null references public.filter_groups(id) on delete cascade,
	primary key (category_id, group_id)
);

-- ---------------------------------------------------------------------
-- 5 · RLS — o molde da feature 24
-- ---------------------------------------------------------------------
--
-- Habilitar RLS é obrigatório: o schema público concede tudo a anon e authenticated por default
-- privilege, e o gate é o RLS, não o grant. Tabela nova sem RLS estaria aberta à escrita anônima.

alter table public.filter_groups                 enable row level security;
alter table public.filter_values                 enable row level security;
alter table public.product_filter_values         enable row level security;
alter table public.category_hidden_filter_groups enable row level security;

-- A loja vê SÓ o que está ligado: desligar um grupo é decisão de verdade, e a linha nem trafega.
drop policy if exists "public read active filter groups" on public.filter_groups;
create policy "public read active filter groups" on public.filter_groups
	for select to anon, authenticated
	using (is_active = true);

-- O valor segue o estado do grupo.
drop policy if exists "public read values of active filter groups" on public.filter_values;
create policy "public read values of active filter groups" on public.filter_values
	for select to anon, authenticated
	using (exists (
		select 1 from public.filter_groups g
		where g.id = filter_values.group_id
		  and g.is_active = true
	));

-- A marcação segue o grupo do valor E o produto: marcação de grupo desligado ou de produto inativo
-- não chega ao navegador, e o produto vem com a lista vazia — que é o comportamento certo.
drop policy if exists "public read marks of active groups and products" on public.product_filter_values;
create policy "public read marks of active groups and products" on public.product_filter_values
	for select to anon, authenticated
	using (
		exists (
			select 1 from public.filter_values v
			join public.filter_groups g on g.id = v.group_id
			where v.id = product_filter_values.value_id
			  and g.is_active = true
		)
		and exists (
			select 1 from public.products p
			where p.id = product_filter_values.product_id
			  and p.is_active = true
		)
	);

-- O "escondido" é lido inteiro: ele só diz o que NÃO mostrar.
drop policy if exists "public read hidden filter groups" on public.category_hidden_filter_groups;
create policy "public read hidden filter groups" on public.category_hidden_filter_groups
	for select to anon, authenticated
	using (true);

-- Escrita: `to authenticated` + `has_role` no `using` E no `with check`. Só o `using` deixaria um
-- não-admin inserir livremente, porque `insert` não tem linha antiga para ele filtrar.
drop policy if exists "admin full filter groups" on public.filter_groups;
create policy "admin full filter groups" on public.filter_groups
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full filter values" on public.filter_values;
create policy "admin full filter values" on public.filter_values
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full product filter values" on public.product_filter_values;
create policy "admin full product filter values" on public.product_filter_values
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full category hidden filter groups" on public.category_hidden_filter_groups;
create policy "admin full category hidden filter groups" on public.category_hidden_filter_groups
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Nenhuma permissão nova é concedida a anon por esta migration, e nenhuma policy de escrita o
-- alcança: as quatro de escrita são `to authenticated`.
