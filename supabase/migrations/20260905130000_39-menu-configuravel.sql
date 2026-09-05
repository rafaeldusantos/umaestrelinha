-- =====================================================================
-- 39 · o menu deixa de ser código e passa a ser curadoria (NAV-08)
--
-- O QUE ESTAVA ERRADO ANTES DESTA MIGRATION
--
-- A feature 16 deu à categoria uma vaga na barra (`show_in_menu`) e um card
-- promocional (`menu_promo`), e as duas nasceram com o menu da loja anterior em
-- mente: UMA barra, QUATRO vagas, o mesmo recorte no computador e no celular.
-- A Uma Estrelinha tem ~90% dos acessos no celular, onde a barra do topo nem
-- existe — o que cabe lá é uma lista dentro da gaveta, e ela não tem por que
-- mostrar as mesmas entradas. Com uma coluna só, "tirar do celular" era "tirar
-- de tudo", e o único jeito de divergir era não divergir.
--
-- Esta migration troca a coluna única por DUAS booleanas explícitas — uma por
-- superfície — e é `AD-027` aplicado: funcionalidade que liga e desliga tem
-- booleano próprio, nunca "a lista vazia" nem campo dentro de blob.
--
-- O QUE ESTA MIGRATION **NÃO** FAZ, E POR QUÊ
--
-- `menu_promo` NÃO é apagada. Ela vira legado não lido, no molde de
-- `shipping.origin_zip`: o `db push` e o deploy da Vercel rodam em PARALELO, e
-- apagar a coluna faria o painel publicado morrer com `PGRST204` em toda
-- gravação de categoria durante a janela entre os dois. O que impede uma tela
-- de voltar a lê-la é guarda de teste, não o banco.
--
-- `show_in_menu` também não some — ela deixa de ser ESCRITA e passa a ser
-- DERIVADA (`menu_desktop or menu_mobile`). É o que protege a LOJA publicada na
-- mesma janela: o JS antigo continua lendo a coluna e continua vendo a verdade,
-- porque ela passa a responder "esta categoria está em alguma superfície?".
-- O custo declarado e aceito é a outra ponta: durante a janela, o
-- `/admin/menu` **antigo** falha ao gravar `show_in_menu` (coluna gerada não
-- aceita escrita). É tela de admin, é momentâneo, e é preferível a uma loja
-- pública com a barra vazia.
--
-- POR QUE `categories.icon` É REUSADA, E NÃO UMA COLUNA NOVA
--
-- `icon` existe desde a migration inicial, guarda emoji do catálogo anterior e
-- **não é lida por nenhuma tela** (varredura em `apps/**`). Uma coluna
-- `menu_icon` ao lado dela seria um segundo dono de "o ícone desta categoria" —
-- o "defeito 01" do projeto, que não quebra nada e diverge no primeiro dia.
-- A limpeza abaixo tira dela o significado velho: o que não casa com a régua
-- das chaves vira `null`, e `menuIconKey` degrada para "sem ícone".
--
-- POR QUE NÃO HÁ `check` NA COLUNA `icon`
--
-- Copiar `MENU_ICON_KEYS` para dentro do banco daria duas listas do mesmo
-- catálogo, e a de SQL ficaria para trás na primeira chave nova. Ícone não é
-- dinheiro nem segurança: a resposta certa para "não reconheço este valor" é o
-- item sem ícone, não a barra quebrada.
--
-- IDEMPOTENTE POR CONSTRUÇÃO
--
-- Segunda execução afeta ZERO linhas, e aqui isso vale mais que de costume: os
-- backfills leem `show_in_menu`, que depois desta migration é DERIVADA das duas
-- booleanas. Reexecutá-los depois da conversão ligaria de volta, em ambas as
-- superfícies, tudo que estivesse ligado em UMA — apagando em silêncio a
-- curadoria da Adri. Por isso os backfills e a conversão vivem dentro de um
-- bloco guardado pelo estado da própria coluna: enquanto `show_in_menu` for
-- coluna comum, converte; depois de gerada, o bloco inteiro é no-op.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada é imutável, correção vem em
-- migration nova. Por isso nada aqui edita a `20260803120000_16-store-menu.sql`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. As colunas da curadoria por superfície
-- ---------------------------------------------------------------------
alter table public.categories
	add column if not exists menu_desktop boolean not null default false,
	add column if not exists menu_mobile  boolean not null default false,
	add column if not exists menu_banners jsonb;

comment on column public.categories.menu_desktop is
	'A categoria aparece no menu do COMPUTADOR (feature 39). Vale em qualquer profundidade: marcada com o pai também marcado, ela é item do painel do pai — o papel é derivado da árvore por menuItems, nunca gravado.';

comment on column public.categories.menu_mobile is
	'A categoria aparece no menu do CELULAR (feature 39). Independente de menu_desktop de propósito: ~90% dos acessos vêm daqui e o que cabe na gaveta não é o que cabe na barra.';

comment on column public.categories.menu_banners is
	'Os banners do painel do menu: { desktop: MenuBanner[], mobile: MenuBanner[] }, até 2 por superfície. Cada banner tem { target: {kind, id|href}, badge?, title?, subtitle?, image_desktop?, image_mobile? }. O destino mora em jsonb, onde NÃO cabe FK — quem lê valida em runtime (resolveMenuBanners, em @estrelinha/core/menu). Substitui menu_promo.';

-- ---------------------------------------------------------------------
-- 2. Os três backfills e a conversão de `show_in_menu`
--
-- Tudo num bloco só, e guardado: `attgenerated = ''` é "ainda é coluna comum".
-- Depois da conversão o bloco não roda mais, e é isso que impede a segunda
-- execução de reescrever curadoria (ver o cabeçalho).
--
-- A ORDEM importa e não é estética: os três backfills leem `show_in_menu` com o
-- valor gravado pela feature 16. Rodá-los depois do `drop` leria a coluna
-- derivada — que nesse momento é `false` para todo mundo — e o menu da loja no
-- ar sumiria inteiro, sem nada em tela dizendo por quê.
-- ---------------------------------------------------------------------
do $$
begin
	if not exists (
		select 1
		  from pg_attribute
		 where attrelid = 'public.categories'::regclass
		   and attname = 'show_in_menu'
		   and not attisdropped
		   and attgenerated = ''
	) then
		return;
	end if;

	-- Backfill 1 — quem estava na barra entra nas DUAS superfícies.
	--
	-- Preservar o comportamento de hoje é o padrão certo aqui, e é o oposto do
	-- que a `37` fez com o frete grátis: lá o interruptor nascia desligado por
	-- decisão da dona sobre um benefício em dinheiro; aqui desligar seria a loja
	-- acordar sem menu depois do deploy.
	update public.categories
	   set menu_desktop = true,
	       menu_mobile  = true
	 where show_in_menu
	   and not (menu_desktop and menu_mobile);

	-- Backfill 2 — as filhas ATIVAS de quem estava na barra viram itens de painel.
	--
	-- O `MegaMenu` da 16 mostrava TODAS as filhas da entrada aberta, sem curadoria
	-- nenhuma. Como o papel agora é derivado (`marcada && pai marcado ⇒ painel`),
	-- não marcar as filhas esvaziaria todo painel da loja no deploy — a feature
	-- entregaria menos do que havia antes dela.
	update public.categories c
	   set menu_desktop = true,
	       menu_mobile  = true
	  from public.categories p
	 where c.parent_id = p.id
	   and p.show_in_menu
	   and c.active
	   and not (c.menu_desktop and c.menu_mobile);

	-- Backfill 3 — o card da 16 vira banner, nos dois dispositivos.
	--
	-- `jsonb_strip_nulls` porque `badge`/`title`/`subtitle` são opcionais no
	-- banner e ausente ≠ nulo para quem lê: `resolveMenuBanners` herda o nome do
	-- destino quando o título FALTA, e um `"title": null` gravado passaria pela
	-- mesma porta só por acaso. O mesmo objeto vai para as duas superfícies: o
	-- anúncio é um, o que muda entre elas é a arte — e arte o card não tinha.
	update public.categories
	   set menu_banners = jsonb_build_object(
	         'desktop', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
	                      'target', jsonb_build_object('kind', 'category', 'id', menu_promo->>'category_id'),
	                      'badge', menu_promo->>'badge',
	                      'title', menu_promo->>'title',
	                      'subtitle', menu_promo->>'subtitle'))),
	         'mobile', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
	                      'target', jsonb_build_object('kind', 'category', 'id', menu_promo->>'category_id'),
	                      'badge', menu_promo->>'badge',
	                      'title', menu_promo->>'title',
	                      'subtitle', menu_promo->>'subtitle'))))
	 where menu_banners is null
	   and menu_promo is not null
	   and nullif(trim(menu_promo->>'category_id'), '') is not null;

	-- A conversão. O índice parcial cai junto com a coluna (ele depende dela) e
	-- é recriado logo abaixo, fora do bloco.
	alter table public.categories drop column show_in_menu;

	-- `not null` porque as duas fontes são `not null`: a derivada nunca é nula, e
	-- declará-lo mantém a coluna com a mesma nulidade que tinha na feature 16 —
	-- `DbCategory.show_in_menu` continua sendo `boolean`, e não `boolean | null`.
	alter table public.categories
		add column show_in_menu boolean not null
		generated always as (menu_desktop or menu_mobile) stored;
end
$$;

comment on column public.categories.show_in_menu is
	'DERIVADA (menu_desktop or menu_mobile) desde a feature 39 — não aceita escrita. Existe para o JS publicado da loja continuar respondendo à pergunta certa durante a janela entre o db push e o deploy da Vercel. Nenhuma tela nova deve lê-la: quem decide o menu é menuItems, em @estrelinha/core/menu.';

comment on column public.categories.menu_promo is
	'LEGADO — o card da feature 16, substituído por menu_banners na 39. Preservada de propósito (o painel publicado grava categoria durante a janela de deploy). Nenhuma tela pode voltar a lê-la.';

-- Índice parcial: a loja pergunta "quem está no menu?" em toda montagem de
-- header. Ele existia desde a 16 e foi derrubado junto com a coluna — recriá-lo
-- não é zelo, é devolver o que a conversão levou.
create index if not exists categories_show_in_menu_idx
	on public.categories (sort_order)
	where show_in_menu;

-- ---------------------------------------------------------------------
-- 3. A coluna `icon` perde o significado velho
--
-- Régua idêntica à de `MENU_ICON_KEYS` (`packages/core/src/menu/icons.ts`):
-- chave que não casa com ela não existe no catálogo e degradaria para "sem
-- ícone" na leitura seguinte. Deixá-la gravada só criaria dado que a tela do
-- painel não sabe desenhar nem apagar.
--
-- Idempotente por construção: depois desta linha, todo `icon` não nulo casa com
-- a régua, e a segunda execução afeta 0 linhas.
-- ---------------------------------------------------------------------
update public.categories
   set icon = null
 where icon is not null
   and icon !~ '^[a-z][a-z0-9-]*$';

comment on column public.categories.icon is
	'Chave do catálogo de ícones do menu (MENU_ICON_KEYS, em @estrelinha/core/menu), no formato ^[a-z][a-z0-9-]*$. Guardava emoji do catálogo anterior até a feature 39, que a limpou. Sem check de propósito: copiar o catálogo para o SQL daria duas listas, e a de SQL ficaria para trás.';

-- ---------------------------------------------------------------------
-- 4. Os itens de link, e a semeadura do "Sobre" (NAV-08)
--
-- Link não é conjunto de produtos: não tem página de categoria, não tem filha e
-- não tem produto. Pela `AD-014` ele não pode entrar em `categories`, e uma
-- tabela própria para 1–3 linhas custaria RLS, policies e um CRUD inteiro. Vai
-- para `store_settings`, ao lado das outras chaves de configuração da loja.
--
-- O "Sobre" é semeado porque HOJE ele está escrito no JSX do `Header`. Sem esta
-- linha, a tarefa que tira o link do código o faria sumir da loja — e a dona só
-- descobriria abrindo o site.
--
-- `on conflict (key) do nothing` faz a segunda execução afetar 0 linhas: ela não
-- pode desfazer link que a Adri tenha apagado, nem devolver um "Sobre" removido
-- de propósito. Mesmo princípio do `NOT value ?` da migration da 37.
-- ---------------------------------------------------------------------
insert into public.store_settings (key, value)
values (
	'menu',
	jsonb_build_object(
		'links',
		jsonb_build_array(
			jsonb_build_object(
				'id', 'sobre',
				'label', 'Sobre',
				'href', '/sobre',
				'icon', null,
				'desktop', true,
				'mobile', true,
				'sort_order', 100
			)
		)
	)
)
on conflict (key) do nothing;

-- RLS não muda, e registrar isso é informação: `public read categories using
-- (active = true)` e `admin full categories` (da migration inicial) já alcançam
-- colunas novas da MESMA tabela, e `store_settings` já tem leitura pública e
-- escrita por `has_role`. Nenhum `grant` novo, e nada alcança `anon`.
