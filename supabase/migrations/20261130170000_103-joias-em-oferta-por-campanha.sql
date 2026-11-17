-- O bloco "Joias em oferta" por campanha
--
-- Três movimentos, os três sobre `home_sections`:
--
--   1 · A coluna `campaign_id`: a campanha do bloco. Apagar a campanha ZERA a coluna (`set null`), e o
--       bloco fica sem campanha — não aparece na loja, e o painel pede a escolha.
--   2 · O tipo `campaign_offers` deixa de ser único na Home: o índice único parcial dos tipos é
--       recriado sem ele.
--   3 · Um bloco por campanha: índice único parcial por `campaign_id`, só nas linhas
--       `campaign_offers` com campanha. Dois blocos sem campanha convivem.
--
-- Idempotente e **sem uma única escrita de dado**: o bloco que já existe fica sem campanha até a dona
-- escolher uma. Gravar a vigente nele seria decidir por ela.
--
-- Nenhum `grant`: a coluna nova segue as policies da tabela (leitura pública só de seção ativa,
-- escrita só com `has_role`).

-- ---------------------------------------------------------------------
-- 1 · A campanha do bloco
-- ---------------------------------------------------------------------
--
-- Par de `HomeSection.campaign_id` (`@estrelinha/core/home`) e de `DbHomeSection.campaign_id`
-- (`@estrelinha/supabase`). `homeSections.test.ts` lê este arquivo do disco e recusa a FK em
-- `cascade` (apagaria o bloco junto com a campanha) ou em `restrict` (impediria apagar a campanha).

alter table public.home_sections
	add column if not exists campaign_id uuid
		constraint home_sections_campaign_id_fkey references public.campaigns (id) on delete set null;

comment on column public.home_sections.campaign_id is
	'campaign_offers: a campanha do bloco. O bloco aparece na loja só quando ela é a vigente (live_campaigns). Apagar a campanha zera a coluna.';

-- ---------------------------------------------------------------------
-- 2 · Os tipos únicos, sem `campaign_offers`
-- ---------------------------------------------------------------------
--
-- ⚠️ Este índice SUBSTITUI o da migration `20261130140000_102-joias-em-oferta-na-home.sql`, e continua
-- sendo o PAR de `UNIQUE_SECTION_TYPES` (`@estrelinha/core/home`). `homeSections.test.ts` lê este
-- arquivo e compara conjunto a conjunto. Derruba antes de criar: `if not exists` sobre o índice
-- anterior não mudaria nada.

drop index if exists public.home_sections_unique_types_idx;
create unique index if not exists home_sections_unique_types_idx
	on public.home_sections (type)
	where type in (
		'hero', 'trust_bar', 'collection_rows', 'brand_statement', 'trending_tags', 'newsletter'
	);

-- ---------------------------------------------------------------------
-- 3 · Um bloco por campanha
-- ---------------------------------------------------------------------
--
-- O nome é estável e é exportado por `core` (`CAMPAIGN_OFFERS_CAMPAIGN_INDEX`): o painel reconhece a
-- colisão (`23505`) pelo nome do índice na mensagem e mostra a frase de `core`. O seletor do painel
-- já desabilita a campanha usada; o índice faz a regra valer contra duas gravações simultâneas.

create unique index if not exists home_sections_campaign_offers_campaign_idx
	on public.home_sections (campaign_id)
	where type = 'campaign_offers' and campaign_id is not null;
