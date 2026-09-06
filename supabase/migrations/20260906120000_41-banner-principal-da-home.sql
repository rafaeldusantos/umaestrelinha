-- Feature 41 — Banner principal da Home
--
-- Três movimentos, e o terceiro é o que tem consequência de projeto:
--
--   1 · `home_section_items` ganha a arte de CELULAR. A coluna que já existia (`image_url`) passa a
--       ser a arte de computador; a nova é o recorte do celular do MESMO anúncio.
--   2 · `home_sections` aceita o tipo `hero_carousel`.
--   3 · O hero deixa de ser indelével, e a invariante que o protegia é GENERALIZADA (AD-029).
--
-- Idempotente de ponta a ponta, e **sem uma única escrita de dado**: nenhuma linha semeada em 2026-08
-- é tocada, então a Home de quem já a tem continua idêntica ao que estava no ar (BNR-46).

-- ---------------------------------------------------------------------
-- 1 · A arte de celular do item curado (BNR-07, BNR-21)
-- ---------------------------------------------------------------------
--
-- Duas colunas e não um jsonb com as duas artes: quem lê "existe arte para este dispositivo?" são
-- quatro superfícies, e a resposta precisa ser indexável e legível em SQL. E o par
-- `image_url`/`image_mobile_url` é o MESMO anúncio — dois itens fariam a dona escolher o destino
-- duas vezes e divergir na terceira edição.

alter table public.home_section_items
	add column if not exists image_mobile_url text;

comment on column public.home_section_items.image_url is
	'A arte de COMPUTADOR do item (nome herdado da feature 24, quando havia uma arte só). Falta a de celular ⇒ a loja usa esta e DECLARA que reaproveitou; quem decide isso é surfaceArt, em packages/core/src/media/surfaceArt.ts, e a régua tem um dono só (AD-030).';

comment on column public.home_section_items.image_mobile_url is
	'A arte de CELULAR do MESMO item — o outro recorte do anúncio, não outro anúncio. ~90% dos acessos vêm de celular, e uma arte 8:3 de topo vira uma tira ilegível em 390px. NULL ⇒ a loja usa a de computador e o painel avisa que está reaproveitando (BNR-47). Espaço em branco NÃO é arte: quem apara é surfaceArt, nunca a tela.';

-- ---------------------------------------------------------------------
-- 2 · O tipo `hero_carousel` (BNR-06)
-- ---------------------------------------------------------------------
--
-- ⚠️ Este `check` SUBSTITUI o da migration 24, e continua sendo o PAR de `HOME_SECTION_TYPES`
-- (`@estrelinha/core/home`). `homeSections.test.ts` LÊ ESTE ARQUIVO DO DISCO e compara conjunto a
-- conjunto, com âncora de contagem — acrescentar tipo aqui sem acrescentar no core (ou o contrário)
-- derruba a suíte, que é o ponto.
--
-- A ausência continua sendo regra tanto quanto a presença: **não há tipo de contagem regressiva nem
-- de prova social**, e não é esquecimento (feature 20, decisão ética). Um catálogo genérico de blocos
-- os traria de volta pela porta do painel.
--
-- `hero_carousel` fica de FORA do índice único parcial de propósito: é bloco de campanha e a dona
-- pode querer dois, em posições diferentes da página (BNR-03).

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
		'hero_carousel'
	));

-- ---------------------------------------------------------------------
-- 3 · A Home não tem bloco indelével — tem uma última seção ativa (AD-029)
-- ---------------------------------------------------------------------
--
-- `guard_hero_home_section` (HOME-08) nunca existiu para proteger o hero: existiu para tornar
-- IMPOSSÍVEL uma Home com zero seções ativas. Esconder o controle na tela é UX, e UX não sobrevive a
-- um `PATCH` direto nem a uma segunda tela escrita distraída — o trigger é o que tornava a afirmação
-- verdadeira.
--
-- Com o carrossel de banner, a dona precisa poder pôr o anúncio no TOPO, e o hero indelével impedia
-- isso por construção: o carrossel entraria sempre abaixo de um bloco que ela não pode desligar.
--
-- Então a invariante não é apagada, é generalizada: **a última seção ativa não desliga e não some**,
-- qualquer que seja o tipo dela. O hero vira opção; a Home continua não podendo ficar em branco.
--
-- Limitação declarada e aceita (AD-029): o guarda CONTA linhas ativas, então duas transações
-- simultâneas desligando seções diferentes podem passar as duas. A loja tem uma administradora, e
-- blindar exigiria `serializable` ou lock de tabela.

drop trigger if exists trg_home_sections_hero_guard on public.home_sections;
drop function if exists public.guard_hero_home_section();

create or replace function public.guard_last_active_home_section()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	restantes integer;
begin
	-- Só dois caminhos podem esvaziar a Home: apagar linha ATIVA, ou DESLIGAR uma. Todo o resto
	-- passa direto — inclusive apagar linha já desligada e religar uma seção.
	if tg_op = 'DELETE' then
		if old.active is not true then
			return old;
		end if;
	elsif not (old.active is true and new.active is not true) then
		return new;
	end if;

	-- UMA contagem e UMA recusa para os dois caminhos. Duas cópias divergiriam na primeira vez que
	-- alguém ajustasse a frase de um lado só.
	select count(*) into restantes
		from public.home_sections
		where active and id <> old.id;

	if restantes = 0 then
		-- errcode 23514 (check_violation) para o PostgREST reportar como violação de constraint,
		-- igual aos `check` vizinhos, em vez de erro genérico de plpgsql. É esta mensagem que o
		-- painel exibe — ela tem um dono só, e o painel NÃO a reescreve (BNR-44).
		raise exception 'A Home precisa de pelo menos uma secao ativa, e esta e a ultima.'
			using errcode = '23514';
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;

	return new;
end;
$$;

comment on function public.guard_last_active_home_section() is
	'AD-029: a Home nao tem bloco indelevel, tem uma ultima secao ativa. Substitui guard_hero_home_section (HOME-08), que travava o hero — a invariante protegida sempre foi "a Home nunca fica sem secao ativa", e ela continua valendo para qualquer tipo. CONTA linhas ativas, entao duas transacoes simultaneas podem passar; limitacao declarada e aceita.';

drop trigger if exists trg_home_sections_last_active_guard on public.home_sections;
create trigger trg_home_sections_last_active_guard
	before update or delete on public.home_sections
	for each row execute function public.guard_last_active_home_section();
