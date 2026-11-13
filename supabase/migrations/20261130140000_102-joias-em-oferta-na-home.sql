-- Desconto de campanha · o bloco "Joias em oferta" da Home
--
-- Dois movimentos, os dois sobre `home_sections`:
--
--   1 · `home_sections` aceita o tipo `campaign_offers`.
--   2 · O tipo é ÚNICO na Home: o índice único parcial é recriado com ele.
--
-- Idempotente e **sem uma única escrita de dado**: o bloco não é semeado — ele nasce desligado quando
-- a dona o acrescenta pela bandeja de `/admin/home` (HOME-10), e a Home de quem já a tem continua
-- idêntica.
--
-- O bloco não tem configuração nenhuma: o rótulo, o título e os percentuais vêm da campanha de
-- desconto em vigência (`campaigns`, lida pela policy pública), e sem campanha a loja não o desenha.

-- ---------------------------------------------------------------------
-- 1 · O tipo `campaign_offers`
-- ---------------------------------------------------------------------
--
-- ⚠️ Este `check` SUBSTITUI o da migration 41, e continua sendo o PAR de `HOME_SECTION_TYPES`
-- (`@estrelinha/core/home`). `homeSections.test.ts` LÊ ESTE ARQUIVO DO DISCO e compara conjunto a
-- conjunto, com âncora de contagem — acrescentar tipo aqui sem acrescentar no core (ou o contrário)
-- derruba a suíte.
--
-- A ausência continua sendo regra tanto quanto a presença: não há tipo de contagem regressiva nem de
-- prova social (feature 20, decisão ética), e o bloco de campanha não abre essa porta.

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
		'category_grid',
		'hero_carousel',
		'campaign_offers'
	));

-- ---------------------------------------------------------------------
-- 2 · Um bloco de ofertas por Home
-- ---------------------------------------------------------------------
--
-- Par de `UNIQUE_SECTION_TYPES`. A campanha em vigência é uma só, e um segundo bloco seria a mesma
-- vitrine repetida na mesma página. A bandeja já não oferece o segundo; o índice faz a regra valer
-- contra escrita direta.

drop index if exists public.home_sections_unique_types_idx;
create unique index if not exists home_sections_unique_types_idx
	on public.home_sections (type)
	where type in (
		'hero', 'trust_bar', 'collection_rows', 'brand_statement', 'trending_tags', 'newsletter',
		'campaign_offers'
	);
