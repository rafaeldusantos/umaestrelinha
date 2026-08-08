-- RFN-09 / T52 — o schema alcançando o que o código inteiro já acredita.
--
-- `DbCategory` declara `parent_id`, `banner_url` e `color_accent`; `CategoryFormDialog` grava as
-- três, `useAdminCategories` monta a árvore por `parent_id`, `CategoryMultiSelect` sobe a cadeia de
-- pais para montar o caminho, e a loja (`useCategories`) lê `parent_id` e `color_accent`. Nenhuma
-- migration jamais criou essas colunas.
--
-- O sintoma não é sutil: TODA criação e TODA edição de categoria falha, porque o PostgREST recusa o
-- payload inteiro quando uma coluna não existe.
--
--   POST /rest/v1/categories
--   {"code":"PGRST204","message":"Could not find the 'banner_url' column of 'categories' in the
--    schema cache"}
--
-- E como `parent_id` não existe, `useAdminCategories.tree` sempre devolveu tudo como raiz — a
-- hierarquia era código morto que ninguém viu morrer, porque a tela nunca conseguiu gravar um pai.
--
-- Isto aqui não inventa modelo novo. Só cria o que já é lido e escrito em cinco lugares.

alter table public.categories
	add column if not exists parent_id    uuid references public.categories(id) on delete set null,
	add column if not exists banner_url   text,
	add column if not exists color_accent text,
	add column if not exists updated_at   timestamptz not null default now();

-- CHECK em statement próprio e nomeado, pelo mesmo motivo da `04`: inline num
-- `ADD COLUMN IF NOT EXISTS` ele é ignorado em silêncio se a coluna já existir.
--
-- `is distinct from` e não `<>`: com `parent_id` nulo, `null <> id` é NULL — e um CHECK que
-- devolve NULL passa. Funcionaria por acidente, não por desenho.
do $$
begin
	if not exists (
		select 1 from pg_constraint where conname = 'categories_parent_not_self'
	) then
		alter table public.categories
			add constraint categories_parent_not_self check (parent_id is distinct from id);
	end if;
end $$;

-- A árvore é lida por pai em toda montagem da tela.
create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- `updated_at` não existia, então nenhuma linha antiga sabe quando mudou: o default `now()` as
-- carimba com o momento da migration. É a única resposta honesta disponível — não há histórico de
-- onde derivar a verdadeira. Quem depender disso para "o que mudou esta semana" precisa saber que a
-- primeira semana mente.
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
	before update on public.categories
	for each row execute function public.update_updated_at_column();

-- Contagem de produtos por categoria NO SERVIDOR.
--
-- A tela lia `categories.select('*, products(count)')`, que conta pelo FK legado
-- `products.category_id`. A fonte real desde a `04` é `product_categories` (N:N) — e o formulário
-- de produto só escreve lá. Hoje os dois números coincidem (32 e 32) porque o dado é anterior à
-- virada; qualquer produto novo faz a contagem antiga divergir **em silêncio**.
--
-- `security_invoker = true` (PG 15+): sem isso a view roda com os direitos do dono e vira um furo
-- de RLS. Com isso, ela obedece às policies de `product_categories` — leitura pública, escrita de
-- admin — exatamente como a tabela por baixo.
--
-- Categoria sem produto simplesmente não tem linha aqui; quem lê trata a ausência como zero.
create or replace view public.category_product_counts
	with (security_invoker = true) as
select
	category_id,
	count(*)::int as product_count
from public.product_categories
group by category_id;

comment on view public.category_product_counts is
	'Produtos por categoria a partir de product_categories (RFN-09). Substitui a contagem pelo FK legado products.category_id.';

-- O `alter default privileges` da `20260801130000` já cobre objetos novos criados pelo `postgres`.
-- Explícito aqui porque uma view que ninguém pode ler é um bug caro de diagnosticar.
grant select on public.category_product_counts to anon, authenticated, service_role;
