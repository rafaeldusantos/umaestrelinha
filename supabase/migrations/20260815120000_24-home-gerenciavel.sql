-- =====================================================================
-- Feature 24 — Home gerenciável
-- HOME-01, HOME-08, HOME-23, HOME-30
-- =====================================================================
--
-- A Home já era dinâmica: as fileiras saem de `categories` por `sort_order`, a grade de banners de
-- quem tem `banner_url`, e os números da faixa de vantagens de `store_settings`. O que ainda estava
-- cravado no `.tsx` era a **composição** — quais seções existem, em que ordem, com que texto e com
-- que limite. Esta migration a move para o banco, em duas tabelas.
--
-- Três decisões deste arquivo não são óbvias e estão escritas onde valem:
--   1. A FK de DESTINO é `on delete set null`, não `cascade` — apagar a coleção não pode apagar a
--      arte que a dona subiu. Só `section_id` é `cascade`.
--   2. O CHECK de destino é `num_nonnulls(...) <= 1`, e nunca `= 1` — porque o próprio `set null`
--      produz a linha com zero destinos.
--   3. O hero não é desligável nem removível, e quem garante isso é um TRIGGER, não a tela.

-- ---------------------------------------------------------------------
-- 1 · home_sections — o quê, onde, ligado
-- ---------------------------------------------------------------------

create table if not exists public.home_sections (
	id         uuid primary key default gen_random_uuid(),
	type       text not null,
	position   integer not null default 0,
	-- HOME-10: seção nova nasce DESLIGADA. A dona monta o bloco inteiro antes de a cliente ver, e
	-- "publicar" é um clique explícito — não o efeito colateral de criar.
	active     boolean not null default false,
	config     jsonb   not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.home_sections is
	'A composição da Home (feature 24): quais seções existem, em que ordem e ligadas ou não. A regra que decide o que renderiza — e por que NÃO renderiza — é função pura em @estrelinha/core/home, consumida pela loja e pelo painel.';

-- A lista fechada existe também aqui, e não só em TypeScript.
--
-- ⚠️ Este `check` é o PAR de `HOME_SECTION_TYPES` (`@estrelinha/core/home`), e as duas cópias são
-- presas uma à outra por `homeSections.test.ts`, que LÊ ESTE ARQUIVO DO DISCO e compara conjunto a
-- conjunto, com âncora de contagem (HOME-06). Acrescentar tipo aqui sem acrescentar no core (ou o
-- contrário) derruba a suíte — que é o ponto.
--
-- E a ausência é regra tanto quanto a presença: **não há tipo de contagem regressiva nem de prova
-- social**. `DropCountdown` e `SocialProof` saíram na feature 20 por decisão ética — depoimento
-- inventado sobre a morte de alguém tem peso diferente de depoimento inventado sobre um acessório.
-- Um catálogo genérico de blocos os traria de volta pela porta do painel.
alter table public.home_sections drop constraint if exists home_sections_type_check;
alter table public.home_sections
	add constraint home_sections_type_check
	check (type in (
		'hero',
		'trust_bar',
		'banner_grid',
		'collection_rows',
		'brand_statement',
		'trending_tags',
		'newsletter',
		'collection_feature',
		'product_carousel',
		'category_grid'
	));

comment on column public.home_sections.config is
	'Texto, número e URL de imagem — NUNCA referência. Toda referência a categoria ou produto mora em home_section_items, onde tem FK de verdade; essa é a linha divisória que impede o defeito do menu_promo (AD-014) de reentrar por outra porta. Chave não óbvia: `interlude_after` (brand_statement) — null renderiza a faixa no lugar dela mesma, como irmã; 0 renderiza DENTRO da seção de fileiras imediatamente anterior, depois da fileira de índice 0, que é onde a Home de hoje a põe. O campo mora na PRÓPRIA faixa e não em collection_rows para haver um dono só: se as fileiras dissessem "minha interlude é a seção X", desligar a X deixaria a fileira apontando para um fantasma.';

comment on column public.home_sections.position is
	'NÃO é único de propósito: empate é estado possível (duas admins reordenando ao mesmo tempo) e o desempate é de LEITURA, não de escrita — orderSections desempata por id (HOME-12).';

-- No máximo UMA de cada tipo único, garantido pelo BANCO e não pela bandeja do painel.
--
-- Esconder o bloco na tela é UX; o índice é o que faz a regra valer também contra escrita direta.
-- Os quatro que ficam de fora são repetíveis por natureza: grade de banners, destaque em coleção,
-- carrossel de produtos e grade de coleções são blocos de campanha, e a dona pode querer dois.
create unique index if not exists home_sections_unique_types_idx
	on public.home_sections (type)
	where type in (
		'hero', 'trust_bar', 'collection_rows', 'brand_statement', 'trending_tags', 'newsletter'
	);

-- ---------------------------------------------------------------------
-- 2 · home_section_items — a curadoria da dona, com FK de verdade
-- ---------------------------------------------------------------------
--
-- **Curadoria é a PRESENÇA de itens, não uma flag.** Ter itens é o override; não ter é a derivação
-- de hoje. Uma coluna `curation_mode: 'auto' | 'manual'` seria dois donos do mesmo dado — o
-- "defeito 01" do projeto — e teria um estado inalcançável: `manual` com zero itens é
-- indistinguível de `auto` na loja e diferente no banco. "Voltar ao automático" (HOME-33) vira um
-- `delete`, que é uma operação, e não uma sincronização de dois campos.

create table if not exists public.home_section_items (
	id          uuid primary key default gen_random_uuid(),
	-- A ÚNICA FK em cascade: a linha não tem sentido sem a seção (HOME-30).
	section_id  uuid not null references public.home_sections (id) on delete cascade,
	position    integer not null default 0,
	-- Destino: no máximo um dos três. Ver o CHECK e os comentários abaixo.
	category_id uuid references public.categories (id) on delete set null,
	product_id  uuid references public.products (id)   on delete set null,
	href        text,
	-- Arte própria (banner livre). Sem imagem, a seção deriva a arte do destino.
	image_url   text,
	alt         text,
	label_snapshot text,
	created_at  timestamptz not null default now(),
	constraint home_section_items_one_destination
		check (num_nonnulls(category_id, product_id, href) <= 1)
);

comment on table public.home_section_items is
	'Os itens que a dona escolheu a dedo para uma seção da Home (feature 24). Tabela vazia para uma seção = derivação automática de hoje.';

comment on column public.home_section_items.category_id is
	'ON DELETE SET NULL, e NUNCA cascade: com cascade, apagar uma coleção apagaria a linha do banner e a ARTE QUE A DONA SUBIU iria junto — ela perderia o upload por ter apagado uma coleção. HOME-24/HOME-34 pedem o contrário: o painel tem de DIZER qual destino se perdeu, o que exige a linha continuar existindo. A loja pula o item órfão; o painel o nomeia via label_snapshot.';

comment on column public.home_section_items.product_id is
	'ON DELETE SET NULL pelo mesmo motivo de category_id: a arte sobrevive ao destino, o painel explica, a loja pula.';

comment on column public.home_section_items.label_snapshot is
	'O rótulo congelado no momento da escolha. Não é desnormalização preguiçosa: depois do SET NULL não há de onde ler o nome da coleção apagada, e HOME-24 pede que o painel DIGA o que se perdeu. Sem ele a mensagem seria "este banner perdeu o destino"; com ele é "a coleção Prata 925 foi apagada". A loja nunca o lê — só o painel, e só no caso órfão.';

comment on constraint home_section_items_one_destination on public.home_section_items is
	'`<= 1`, e JAMAIS `= 1`. O próprio `on delete set null` das FKs acima produz a linha com ZERO destinos: um CHECK de igualdade recusaria o UPDATE que o Postgres emite ali e faria A EXCLUSÃO DA CATEGORIA FALHAR. Zero destinos é o estado órfão, e é legítimo. "Exatamente um para salvar" (HOME-22, HOME-23) é regra de FORMULÁRIO — destinationRefusal, em @estrelinha/core/home —, a única camada onde "ainda não escolhi" e "perdi o que tinha" se distinguem.';

-- A leitura é sempre "os itens desta seção, na ordem dela".
create index if not exists home_section_items_section_position_idx
	on public.home_section_items (section_id, position);

-- ---------------------------------------------------------------------
-- 3 · O hero é indelével (HOME-08)
-- ---------------------------------------------------------------------
--
-- A AC diz que "Home com zero seções ativas" tem de ser IMPOSSÍVEL. Esconder o controle de desligar
-- na tela é UX — e UX não sobrevive a um `PATCH` direto nem a uma segunda tela escrita distraída.
-- O trigger é o que torna a afirmação verdadeira.
create or replace function public.guard_hero_home_section()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if tg_op = 'DELETE' then
		if old.type = 'hero' then
			-- errcode 23514 (check_violation) para o PostgREST reportar como violação de constraint,
			-- igual aos `check` vizinhos, em vez de erro genérico de plpgsql.
			raise exception 'A chamada principal da Home nao pode ser removida.'
				using errcode = '23514';
		end if;
		return old;
	end if;

	if old.type = 'hero' and new.active = false then
		raise exception 'A chamada principal da Home nao pode ser desligada.'
			using errcode = '23514';
	end if;

	return new;
end;
$$;

drop trigger if exists trg_home_sections_hero_guard on public.home_sections;
create trigger trg_home_sections_hero_guard
	before update or delete on public.home_sections
	for each row execute function public.guard_hero_home_section();

-- `updated_at` que não se move é `updated_at` que mente. Reusa a função que a migration inicial já
-- criou para `products` e `orders`.
drop trigger if exists trg_home_sections_updated_at on public.home_sections;
create trigger trg_home_sections_updated_at
	before update on public.home_sections
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4 · RLS (HOME-05)
-- ---------------------------------------------------------------------
--
-- **Habilitar RLS aqui é obrigatório, e não zelo.** `20260801130000_public_schema_grants.sql`
-- concede `all on all tables` a `anon`/`authenticated` e repete o mesmo default privilege para toda
-- tabela nova — a postura padrão do Supabase, em que o gate é o RLS e não o grant. Tabela nova que
-- nascesse sem RLS estaria escancarada, com escrita anônima inclusive.
--
-- Sem RPC, de propósito: estas são tabelas de CONTEÚDO, não de dinheiro nem de estado de pedido. O
-- argumento que obrigou `set_material_status` a existir (`orders` não pode ter policy de UPDATE para
-- não expor `payment_status` e os valores — PAY-10) não se aplica. Policy com
-- `has_role(auth.uid(), 'admin')` é a superfície certa, e é a que /admin/categorias já usa.

alter table public.home_sections      enable row level security;
alter table public.home_section_items enable row level security;

-- A loja vê SÓ o que está ligado. É isto que faz "desligar uma seção" ser uma decisão de verdade e
-- não um `display: none` — a linha inativa nem sequer trafega para o navegador da cliente.
drop policy if exists "public read active home sections" on public.home_sections;
create policy "public read active home sections" on public.home_sections
	for select to public
	using (active = true);

-- O item segue o estado da seção-mãe. Sem este `exists`, a curadoria de uma seção desligada ficaria
-- legível — que é o mesmo vazamento, uma tabela ao lado.
drop policy if exists "public read items of active home sections" on public.home_section_items;
create policy "public read items of active home sections" on public.home_section_items
	for select to public
	using (exists (
		select 1 from public.home_sections s
		where s.id = home_section_items.section_id
		  and s.active = true
	));

-- `to authenticated` + `has_role` no `using` **e** no `with check`.
--
-- Os dois lados são necessários e testam coisas diferentes: o `using` decide quais linhas a pessoa
-- ALCANÇA (update/delete), o `with check` decide o que ela pode DEIXAR GRAVADO (insert/update). Só o
-- `using` deixaria um não-admin inserir livremente, porque `insert` não tem linha antiga para o
-- `using` filtrar.
drop policy if exists "admin full home sections" on public.home_sections;
create policy "admin full home sections" on public.home_sections
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full home section items" on public.home_section_items;
create policy "admin full home section items" on public.home_section_items
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Nenhum `grant` a `anon` é emitido por esta migration, e nenhuma policy de escrita alcança `anon`:
-- as duas de escrita são `to authenticated`, e `anon` não é `authenticated`. `homeSections.test.ts`
-- assere as duas coisas lendo este arquivo do disco.

-- ---------------------------------------------------------------------
-- 5 · Bucket `home-images` (HOME-05)
-- ---------------------------------------------------------------------
--
-- **Bucket PRÓPRIO, e não uma pasta dentro de `product-images`.** A spec declara como dívida a
-- limpeza de imagem órfã (apagar a seção apaga as linhas, não os arquivos). Quando essa varredura
-- existir, ela precisa poder passar sobre a arte da Home sem chegar perto de imagem de produto —
-- com uma pasta compartilhada, um prefixo errado apagaria a foto de 689 produtos.
--
-- Molde de `mockup-templates`, e não do `product-images` legado: aquele libera escrita a qualquer
-- `authenticated`. Aqui a escrita exige `has_role(auth.uid(), 'admin')`.
insert into storage.buckets (id, name, public)
values ('home-images', 'home-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to home images" on storage.objects;
create policy "Public read access to home images"
on storage.objects for select to public
using (bucket_id = 'home-images');

drop policy if exists "Admins can upload home images" on storage.objects;
create policy "Admins can upload home images"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'home-images'
	and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can update home images" on storage.objects;
create policy "Admins can update home images"
on storage.objects for update to authenticated
using (
	bucket_id = 'home-images'
	and public.has_role(auth.uid(), 'admin')
)
with check (
	bucket_id = 'home-images'
	and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can delete home images" on storage.objects;
create policy "Admins can delete home images"
on storage.objects for delete to authenticated
using (
	bucket_id = 'home-images'
	and public.has_role(auth.uid(), 'admin')
);
