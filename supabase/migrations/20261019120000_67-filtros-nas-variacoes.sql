-- Feature 67 — Os filtros enxergam as variações
--
-- Duas tabelas novas e uma coluna, e nada mais: a marcação de um valor de filtro numa OPÇÃO da peça
-- (eixo + texto, como em `products.options`), as recusas de sugestão, e os termos extras que cada
-- valor usa para sugerir.
--
-- Aditiva, idempotente de ponta a ponta e sem uma única escrita de dado. A migration da 66 já está
-- aplicada em produção (`AD-017`): o que muda nas tabelas dela muda aqui, por `if not exists`.
--
-- ⚠️ Os números desta migration têm PAR em TypeScript (`@estrelinha/core/filters`, `rules.ts`): o 120
-- do texto da opção é `FILTER_OPTION_TEXT_MAX`, o 10 dos termos é `FILTER_SUGGEST_TERMS_MAX` e o 40 de
-- cada termo é `FILTER_SUGGEST_TERM_MAX`. `variantFiltersSchema.test.ts` (suíte da loja) LÊ ESTE
-- ARQUIVO DO DISCO e compara — mudar um sem o outro derruba a suíte.
--
-- ⚠️ Ordem de publicação (a do `AD-050`): a vitrine passa a pedir a tabela 1 por embed. Esta migration
-- vai SOZINHA, antes do bundle — com o bundle primeiro, o embed responde erro e a vitrine esvazia.

-- ---------------------------------------------------------------------
-- 1 · A marcação por opção da peça (VFL-01..08)
-- ---------------------------------------------------------------------
--
-- A identidade é (peça, eixo, texto, valor), com o eixo e o texto EXATOS: `options` é jsonb sem id, e
-- o texto é o que `product_variants.option_values` usa para casar a linha. Vale para toda variação
-- ativa daquela peça com aquele texto naquele eixo — e só daquela peça: não há dicionário global.
--
-- O teto de 120 é sanidade, não regra de negócio. Medido em 2026-10-18 no banco local: o maior eixo
-- tem 20 caracteres e o maior texto, 40.

create table if not exists public.product_option_filter_values (
	product_id uuid not null references public.products(id) on delete cascade,
	option_name text not null
		constraint pofv_option_name_len check (char_length(option_name) between 1 and 120),
	option_value text not null
		constraint pofv_option_value_len check (char_length(option_value) between 1 and 120),
	value_id uuid not null references public.filter_values(id) on delete cascade,
	primary key (product_id, option_name, option_value, value_id)
);

-- A chave primária começa por `product_id`; a fila de sugestões e a contagem por valor perguntam por
-- `value_id`.
create index if not exists pofv_value_idx on public.product_option_filter_values (value_id);

-- ---------------------------------------------------------------------
-- 2 · As recusas de sugestão (VFL-21, VFL-30)
-- ---------------------------------------------------------------------
--
-- A recusa é por ALVO, não por fonte: o alvo "peça toda" é o par vazio, e recusar a sugestão vinda
-- de uma tag cala também a vinda do nome, porque as duas afirmam a mesma coisa. Os dois campos são
-- vazios juntos ou preenchidos juntos — meio alvo não é alvo nenhum.
--
-- Sem leitura pública: a recusa é curadoria do painel, e a loja não tem o que fazer com ela.

create table if not exists public.filter_suggestion_dismissals (
	product_id uuid not null references public.products(id) on delete cascade,
	value_id uuid not null references public.filter_values(id) on delete cascade,
	option_name text not null default ''
		constraint fsd_option_name_len check (char_length(option_name) <= 120),
	option_value text not null default ''
		constraint fsd_option_value_len check (char_length(option_value) <= 120),
	created_at timestamptz not null default now(),
	constraint fsd_target_whole check ((option_name = '') = (option_value = '')),
	primary key (product_id, value_id, option_name, option_value)
);

create index if not exists fsd_value_idx on public.filter_suggestion_dismissals (value_id);

-- ---------------------------------------------------------------------
-- 3 · Os termos de sugestão de cada valor (VFL-35..37)
-- ---------------------------------------------------------------------
--
-- Até 10 termos, cada um de 1 a 40 caracteres. O `check` de coluna não alcança os elementos de um
-- array, então a regra mora numa função imutável — e o `check` a chama.

create or replace function public.filter_suggest_terms_valid(t text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
	select cardinality(t) <= 10
	   and coalesce((select bool_and(char_length(x) between 1 and 40) from unnest(t) as x), true)
$$;

alter table public.filter_values
	add column if not exists suggest_terms text[] not null default '{}';

-- `add constraint` não tem `if not exists`: a reaplicação passa pelo catálogo.
do $$
begin
	if not exists (
		select 1 from pg_constraint
		where conname = 'filter_values_suggest_terms_valid'
		  and conrelid = 'public.filter_values'::regclass
	) then
		alter table public.filter_values
			add constraint filter_values_suggest_terms_valid
			check (public.filter_suggest_terms_valid(suggest_terms));
	end if;
end
$$;

-- ---------------------------------------------------------------------
-- 4 · RLS — o molde da 66
-- ---------------------------------------------------------------------
--
-- Habilitar RLS é obrigatório: o schema público concede tudo a anon e authenticated por default
-- privilege, e o gate é o RLS, não o grant.

alter table public.product_option_filter_values enable row level security;
alter table public.filter_suggestion_dismissals enable row level security;

-- A marcação por opção segue o grupo do valor E a peça, como a da peça toda: de grupo desligado ou de
-- peça inativa, a linha nem trafega.
drop policy if exists "public read option marks of active groups and products" on public.product_option_filter_values;
create policy "public read option marks of active groups and products" on public.product_option_filter_values
	for select to anon, authenticated
	using (
		exists (
			select 1 from public.filter_values v
			join public.filter_groups g on g.id = v.group_id
			where v.id = product_option_filter_values.value_id
			  and g.is_active = true
		)
		and exists (
			select 1 from public.products p
			where p.id = product_option_filter_values.product_id
			  and p.is_active = true
		)
	);

-- Escrita: `to authenticated` + `has_role` no `using` E no `with check`. Só o `using` deixaria um
-- não-admin inserir livremente, porque `insert` não tem linha antiga para ele filtrar.
drop policy if exists "admin full product option filter values" on public.product_option_filter_values;
create policy "admin full product option filter values" on public.product_option_filter_values
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- As recusas: só o painel lê e só o painel escreve, pela mesma policy.
drop policy if exists "admin full filter suggestion dismissals" on public.filter_suggestion_dismissals;
create policy "admin full filter suggestion dismissals" on public.filter_suggestion_dismissals
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Nenhuma permissão nova é concedida a anon, e nenhuma policy de escrita o alcança.
