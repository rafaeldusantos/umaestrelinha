-- Feature 16 / T2 — a categoria ganha vaga no menu e card promocional.
--
-- Contexto do que estava errado ANTES desta migration, porque explica as duas colunas:
--
-- A `14` deu ao backoffice uma árvore de categorias completa (`parent_id`, `sort_order`, mover,
-- reordenar, ocultar) e a loja nunca aprendeu a lê-la. O `Header` fazia `.slice(0, 4)` de uma lista
-- chapada ordenada por `sort_order`, sem distinguir raiz de filha. Com a árvore real do banco —
-- `Bottons › {Academia, Anime, K-Pop, Filmes, Bandas, Games, Séries, Mangá, Kawaii}` — a barra do
-- topo da loja dizia:
--
--     Bottons · Academia · Anime · K-Pop
--
-- o contêiner de tudo, mais uma filha que só chegou ali por empatar em `sort_order = 0` com ele.
--
-- `show_in_menu` — a vaga no topo
-- --------------------------------
-- Separa "existe na loja" de "tem lugar na barra". Sem ela, o único jeito de tirar uma categoria do
-- menu era marcá-la inativa — e a policy `public read categories using (active = true)` a faria
-- desaparecer junto do rodapé, da grade da home e das sugestões de busca. Uma coisa não deveria
-- custar as outras três.
--
-- **Vale em qualquer profundidade, não só na raiz.** Não é generalidade gratuita: no banco real a
-- única raiz é "Bottons", e os universos que precisam de vaga são todos filhas dela. Restringir a
-- `parent_id is null` tornaria o menu impossível de montar sem antes reorganizar a árvore.
--
-- `menu_promo` — o card promocional
-- ---------------------------------
-- Forma: `{ category_id, badge?, title?, subtitle? }`. Nulo = sem card, e o painel encolhe.
--
-- `jsonb` e não quatro colunas de texto: é blob de **exibição**, nunca filtrado nem ordenado, e o
-- card ainda vai crescer (cor, imagem). Quatro colunas exigiriam uma migration por campo novo.
--
-- O `category_id` é obrigatório na aplicação porque o card **aponta para uma coleção de verdade** —
-- não para uma URL digitada. Isso elimina link com typo e deixa a contagem ("12 pins") sair da view
-- `category_product_counts`, que já existe desde a `14`. O preço disso é que a referência mora
-- dentro de jsonb, onde **não cabe FK**: apagar a categoria de destino não pode disparar
-- `on delete set null`. Por isso a resolução é validada em runtime (`resolvePromo`, em
-- `@nanapin/core/menu`) e virou critério de aceite (`MENU-26`), não boa vontade.

alter table public.categories
	add column if not exists show_in_menu boolean not null default false,
	add column if not exists menu_promo   jsonb;

comment on column public.categories.show_in_menu is
	'Ocupa uma das 4 vagas da barra do topo da loja (feature 16). Vale em qualquer profundidade da árvore — a curadoria é a tela /admin/menu.';

comment on column public.categories.menu_promo is
	'Card promocional do menu: { category_id, badge?, title?, subtitle? }. Nulo = sem card. category_id não tem FK (mora em jsonb) — quem lê valida o destino em runtime.';

-- Backfill: o menu não pode nascer vazio.
--
-- Com `default false` puro, a loja no ar ficaria **sem nenhuma categoria na barra** até alguém abrir
-- o backoffice. Isso é pior que o bug que esta migration conserta.
--
-- Os quatro slugs são os universos dos boards `1QB-0` / `1SF-0`, e a condição por slug faz disto um
-- no-op em qualquer banco que não os tenha. É seed-shaped de propósito: é um empurrão inicial de
-- **uma vez**, não uma regra. Depois desta linha a fonte de verdade é a tela /admin/menu.
--
-- `and show_in_menu = false` deixa a migration reexecutável sem desfazer curadoria já feita à mão.
update public.categories
	set show_in_menu = true
	where slug in ('anime', 'kpop', 'games', 'filmes')
	  and active = true
	  and show_in_menu = false;

-- Índice parcial: a loja pergunta "quem está no menu?" em toda montagem de header, e o predicado é
-- seletivo (4 linhas de N). Com uma tabela de 10 categorias isto não paga nada hoje — entra porque o
-- custo é zero e a consulta é a mais quente da loja.
create index if not exists categories_show_in_menu_idx
	on public.categories (sort_order)
	where show_in_menu;

-- RLS não muda de propósito: `public read categories using (active = true)` e
-- `admin full categories` (da migration inicial) já valem para colunas novas da mesma tabela.
-- Registrado aqui porque "não mudou nada" é informação — evita a próxima pessoa procurar a policy
-- que faltou.
