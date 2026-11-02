-- Compre Junto — as listas de peças e os adicionais de cada joia.
--
-- Três tabelas e uma view. A lista NÃO é coleção: não tem rota, menu nem sitemap (ela só existe
-- dentro do Compre Junto). Esta migration só cria o schema; a tela de adicionais no produto e a
-- conversão do que já existe são de outra entrega. Sem escrita de dado.

-- ---------------------------------------------------------------------
-- 1 · As listas — nome reutilizável, "Correntes", "Embalagens"
-- ---------------------------------------------------------------------

create table if not exists public.buy_together_lists (
	id         uuid primary key default gen_random_uuid(),
	name       text not null check (char_length(btrim(name)) between 1 and 40),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

drop trigger if exists set_buy_together_lists_updated_at on public.buy_together_lists;
create trigger set_buy_together_lists_updated_at
	before update on public.buy_together_lists
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2 · As peças da lista — ordem e variações liberadas
-- ---------------------------------------------------------------------
--
-- `variant_ids` é uma lista de ids SEM chave estrangeira, de propósito: vazia significa "vale todas
-- as ativas". Com `on delete cascade` numa tabela filha, apagar a última variação liberada deixaria
-- zero linhas e a peça passaria a valer todas em silêncio. Sem FK, o id apagado continua na lista,
-- e a loja pula a peça cujas variações liberadas deixaram de existir.
--
-- O teto de 12 peças é a posição (0..11) numa chave única: a 13ª não tem onde caber. A chave é
-- adiada até o fim da transação para a dona poder reordenar trocando posições numa gravação só.

create table if not exists public.buy_together_list_items (
	list_id     uuid not null references public.buy_together_lists (id) on delete cascade,
	product_id  uuid not null references public.products (id) on delete cascade,
	position    integer not null check (position between 0 and 11),
	variant_ids uuid[] not null default '{}',
	created_at  timestamptz not null default now(),
	primary key (list_id, product_id),
	constraint buy_together_list_items_position_key
		unique (list_id, position) deferrable initially deferred
);

-- O `on delete cascade` do produto consulta esta coluna a cada apagada.
create index if not exists buy_together_list_items_product_id_idx
	on public.buy_together_list_items (product_id);

-- ---------------------------------------------------------------------
-- 3 · Os adicionais de cada joia — até três, cada um uma peça ou uma lista
-- ---------------------------------------------------------------------
--
-- Duas chaves para `products` (a joia principal e a peça-alvo): as duas têm nome, senão o embed do
-- PostgREST responde `300 PGRST201` por não saber qual seguir.
--
-- ⚠️ **`restrict`, e não `cascade`, no vínculo com a lista.** Apagar uma lista em uso tiraria o
-- adicional de todas as joias que a usam em silêncio. O painel lê o uso antes e explica; o banco é a
-- segunda linha, para o caso de a escrita não vir da tela.
--
-- A peça-alvo apagada leva o adicional junto: um adicional sem alvo não significa nada.

create table if not exists public.product_buy_together (
	id                    uuid primary key default gen_random_uuid(),
	product_id            uuid not null,
	position              integer not null check (position between 0 and 2),
	kind                  text not null check (kind in ('product', 'list')),
	target_product_id     uuid,
	list_id               uuid,
	target_variant_ids    uuid[] not null default '{}',
	hidden_on_variant_ids uuid[] not null default '{}',
	created_at            timestamptz not null default now(),
	constraint product_buy_together_product_id_fkey
		foreign key (product_id) references public.products (id) on delete cascade,
	constraint product_buy_together_target_product_id_fkey
		foreign key (target_product_id) references public.products (id) on delete cascade,
	constraint product_buy_together_list_id_fkey
		foreign key (list_id) references public.buy_together_lists (id) on delete restrict,
	constraint product_buy_together_position_key
		unique (product_id, position) deferrable initially deferred,
	constraint product_buy_together_target_check check (
		(kind = 'product' and target_product_id is not null and list_id is null)
		or (kind = 'list' and list_id is not null and target_product_id is null)
	)
);

create index if not exists product_buy_together_list_id_idx
	on public.product_buy_together (list_id);
create index if not exists product_buy_together_target_product_id_idx
	on public.product_buy_together (target_product_id);

-- ---------------------------------------------------------------------
-- 4 · O uso — View, e não coluna
-- ---------------------------------------------------------------------
--
-- Uma linha por (lista, joia que a usa), com o nome e o endereço da joia: o painel mostra "em N
-- joias", nomeia as primeiras e recusa apagar. Uma coluna `usage_count` seria um segundo dono do
-- número. `security_invoker` faz a view respeitar a RLS de quem consulta — a joia inativa não
-- aparece para o visitante.

create or replace view public.buy_together_list_usage with (security_invoker = true) as
	select a.list_id, p.id as product_id, p.name as product_name, p.slug as product_slug
	from public.product_buy_together a
	join public.products p on p.id = a.product_id
	where a.kind = 'list';

-- ---------------------------------------------------------------------
-- 5 · RLS — a loja lê, só o admin grava
-- ---------------------------------------------------------------------
--
-- Leitura pública SEM condição de ativo, no precedente de `product_faqs`: o vínculo a uma peça fora
-- do ar chega ao navegador com o produto ausente (a RLS de `products` filtra), e o ramo "pular a
-- peça" roda em produção. O que fica legível é um uuid, uma posição e a lista de ids liberados.
--
-- A policy de escrita é `to authenticated` e exige `has_role` no `using` E no `with check` (só o
-- `using` deixaria um não-admin inserir, porque `insert` não tem linha antiga para filtrar).

alter table public.buy_together_lists      enable row level security;
alter table public.buy_together_list_items enable row level security;
alter table public.product_buy_together    enable row level security;

drop policy if exists "public read buy together lists" on public.buy_together_lists;
create policy "public read buy together lists" on public.buy_together_lists
	for select to anon, authenticated
	using (true);

drop policy if exists "public read buy together list items" on public.buy_together_list_items;
create policy "public read buy together list items" on public.buy_together_list_items
	for select to anon, authenticated
	using (true);

drop policy if exists "public read product buy together" on public.product_buy_together;
create policy "public read product buy together" on public.product_buy_together
	for select to anon, authenticated
	using (true);

drop policy if exists "admin write buy together lists" on public.buy_together_lists;
create policy "admin write buy together lists" on public.buy_together_lists
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin write buy together list items" on public.buy_together_list_items;
create policy "admin write buy together list items" on public.buy_together_list_items
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin write product buy together" on public.product_buy_together;
create policy "admin write product buy together" on public.product_buy_together
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Nenhum `grant` a `anon` é emitido por esta migration: o `select` do anon vem do privilégio padrão
-- do schema público, e nenhuma policy de escrita o alcança (as de escrita são `to authenticated`).
-- `compreJuntoSchema.test.ts` assere as duas coisas lendo este arquivo do disco.
