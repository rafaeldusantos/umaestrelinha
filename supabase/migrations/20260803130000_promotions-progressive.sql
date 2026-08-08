-- Feature 17 / T1 — a promoção de desconto progressivo por quantidade ganha dono no banco.
--
-- PRM-03, PRM-06, PRM-07 (+ a base de PRM-05).
--
-- O que estava errado ANTES desta migration, porque explica cada coluna:
--
-- A loja anuncia kit de bottons com preço fechado (R$ 15 / 23 / 42 para 3 / 5 / 10) em CONSTANTES
-- dentro de um componente da home. Não havia forma de mudar isso sem deploy — e, pior, como
-- `supabase/functions/mercado-pago` recalcula `unit_price` a partir de `products.base_price` e
-- descarta o valor enviado pelo cliente, qualquer desconto por quantidade calculado no front seria
-- **exibido e não cobrado**. É o mesmo motivo pelo qual o "Compre Junto" do board nunca existiu.
--
-- Daqui para frente a regra é dado: `promotions` (identidade e vigência) + `promotion_tiers` (as
-- faixas) + `promotion_categories` (o escopo). A interpretação é função pura em
-- `@nanapin/core/payment/pricing`, chamada pelos dois lados.

-- ---------------------------------------------------------------------
-- promotions — identidade, tipo de desconto, vigência
-- ---------------------------------------------------------------------
--
-- `type` nasce com `check (type = 'progressive_qty')` de propósito: abrir o enum para compre-junto,
-- brinde ou frete progressivo sem uma única AC seria a armadilha da `AD-011`. Quando o segundo tipo
-- tiver spec, o `check` é uma linha de migration.
--
-- `scope` tem só dois valores porque escopo por produto avulso não é exposto nesta feature (A8): o
-- editor renderiza o segmento `Produtos` desabilitado. Modelar `products` aqui sem AC arrastaria
-- seletor com busca e paginação.
create table if not exists public.promotions (
	id                 uuid primary key default gen_random_uuid(),
	name               text not null,
	type               text not null default 'progressive_qty'
	                     check (type = 'progressive_qty'),
	scope              text not null default 'categories'
	                     check (scope in ('all', 'categories')),
	discount_kind      text not null
	                     check (discount_kind in ('unit_price', 'percent')),
	stacks_with_coupon boolean not null default false,
	is_kit_showcase    boolean not null default false,
	active             boolean not null default true,
	valid_from         timestamptz,
	valid_until        timestamptz,
	created_at         timestamptz not null default now(),
	updated_at         timestamptz not null default now()
);

comment on table public.promotions is
	'Promoção de desconto progressivo por quantidade (feature 17). A regra que a interpreta é função pura em @nanapin/core/payment/pricing — nada de desconto é calculado inline em tela nem em edge function.';

comment on column public.promotions.stacks_with_coupon is
	'Opt-in por promoção (AD-015). Desligado (default) ⇒ vale o MELHOR dos dois, promoção ou cupom, comparado pelo total final. Ligado ⇒ o cupom incide sobre o subtotal já descontado.';

comment on column public.promotions.is_kit_showcase is
	'Qual regra a tela "Monte seu kit" (feature 18) exibe. No máximo uma linha marcada, garantido pelo índice único parcial abaixo.';

-- No máximo UMA vitrine de kit, garantido pelo BANCO e não pela tela (PRM-05).
--
-- `((true))` com `where is_kit_showcase` é o idioma de "no máximo uma linha satisfaz o predicado":
-- todas as linhas marcadas colidem na mesma chave. Sem este índice, duas abas do admin abertas ao
-- mesmo tempo criam duas vitrines e a tela de kit passa a depender de qual `select` chegou primeiro.
create unique index if not exists promotions_single_kit_showcase
	on public.promotions ((true)) where is_kit_showcase;

-- A leitura pública é sempre "ativa e vigente agora". Índice parcial pela mesma razão do
-- `categories_show_in_menu_idx`: o predicado é seletivo e a consulta roda em toda montagem de
-- carrinho e de checkout — os dois caminhos mais quentes que tocam dinheiro.
create index if not exists promotions_active_idx
	on public.promotions (valid_from, valid_until) where active;

-- ---------------------------------------------------------------------
-- promotion_tiers — as faixas
-- ---------------------------------------------------------------------
--
-- `min_qty >= 2`: faixa que começa em 1 unidade não é promoção, é mudança de preço — e mudança de
-- preço tem dono, que é `products.base_price`. Duas fontes para o mesmo dado é o "defeito 01" do
-- projeto.
--
-- `unique (promotion_id, min_qty)`: duas faixas na mesma quantidade não têm resposta determinística.
-- A ordem de INSERÇÃO não é contrato — a leitura ordena por `min_qty` (`resolveProgressiveTier`).
create table if not exists public.promotion_tiers (
	id           uuid primary key default gen_random_uuid(),
	promotion_id uuid not null references public.promotions (id) on delete cascade,
	min_qty      integer not null check (min_qty >= 2),
	value        numeric(10,2) not null check (value > 0),
	unique (promotion_id, min_qty)
);

comment on column public.promotion_tiers.value is
	'Preço unitário quando discount_kind = unit_price; percentual de desconto quando discount_kind = percent. A faixa NUNCA aumenta preço: quem lê aplica min(cheio, valor) — ver tierUnitPrice (A10).';

create index if not exists promotion_tiers_promotion_id_idx
	on public.promotion_tiers (promotion_id);

-- ---------------------------------------------------------------------
-- promotion_categories — o escopo (D5 / AD-014)
-- ---------------------------------------------------------------------
--
-- Tabela de vínculo com FK real, e não `category_ids uuid[]` nem jsonb. Motivo pago em lição:
-- `menu_promo.category_id` mora dentro de jsonb, **onde não cabe FK** — apagar a categoria de
-- destino não dispara `on delete`, e validar o destino na leitura virou critério de aceite
-- (`AD-014`). Aqui o banco resolve: apagar a categoria remove o vínculo, e promoção que ficou sem
-- NENHUM vínculo passa a não descontar de ninguém. Nunca vira "toda a loja".
create table if not exists public.promotion_categories (
	promotion_id uuid not null references public.promotions (id) on delete cascade,
	category_id  uuid not null references public.categories (id) on delete cascade,
	primary key (promotion_id, category_id)
);

-- ---------------------------------------------------------------------
-- validate_promotion_tier — a faixa percentual em 1–90
-- ---------------------------------------------------------------------
--
-- POR QUE TRIGGER E NÃO `check`: o intervalo válido de `promotion_tiers.value` depende de
-- `promotions.discount_kind`, que está na tabela-MÃE. Um `check` só vê colunas da própria linha —
-- não há como escrever `check (value between 1 and 90)` condicionado a um valor que vive noutra
-- tabela. As alternativas seriam desnormalizar `discount_kind` para dentro de `promotion_tiers`
-- (dois donos do mesmo dado, e nada garantindo que continuem iguais) ou aceitar `percent = 4000` no
-- banco quando a tela for contornada. Trigger é menos visível que `check`, e é exatamente por isso
-- que este parágrafo existe.
--
-- `security definer`: sem isso o `select` abaixo passa pela RLS de `promotions` do usuário corrente,
-- e uma promoção invisível devolveria `v_kind = null` — a validação passaria em SILÊNCIO. Falhar
-- aberto numa guarda de valor de dinheiro não é opção.
--
-- `errcode = 23514` (check_violation) para o PostgREST reportar como violação de constraint, igual
-- aos `check` vizinhos, em vez de erro genérico de plpgsql.
--
-- Buraco conhecido e fechado por construção: trocar `discount_kind` de `unit_price` para `percent`
-- numa promoção com faixas já gravadas não dispara este trigger. Na prática não acontece porque a
-- única escrita é `upsert_promotion`, que SUBSTITUI as faixas a cada gravação — então toda faixa
-- passa por aqui com o `discount_kind` novo já persistido.
create or replace function public.validate_promotion_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_kind text;
begin
	select discount_kind into v_kind
	  from public.promotions
	 where id = new.promotion_id;

	if v_kind = 'percent' and (new.value < 1 or new.value > 90) then
		raise exception 'Faixa percentual precisa estar entre 1 e 90: %', new.value
			using errcode = '23514';
	end if;

	return new;
end;
$$;

revoke all on function public.validate_promotion_tier() from public;
revoke all on function public.validate_promotion_tier() from anon;
revoke all on function public.validate_promotion_tier() from authenticated;

drop trigger if exists promotion_tiers_validate on public.promotion_tiers;
create trigger promotion_tiers_validate
	before insert or update on public.promotion_tiers
	for each row execute function public.validate_promotion_tier();

-- ---------------------------------------------------------------------
-- updated_at por trigger (PRM-07)
-- ---------------------------------------------------------------------
--
-- Duas abas do admin salvando a mesma promoção: a última escrita vence, sem lock — e `updated_at`
-- é a evidência de qual foi. Reusa `public.update_updated_at_column()`, que existe desde a migration
-- inicial.
drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at
	before update on public.promotions
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- RLS (PRM-06)
-- ---------------------------------------------------------------------
--
-- Leitura pública filtra `active = true` **e** vigência cobrindo `now()`. Sem o filtro de vigência,
-- um concorrente lê a campanha da Black Friday programada e não publicada — a tabela é exposta pelo
-- Data API como qualquer outra.
--
-- As policies das duas tabelas-filhas NÃO repetem a expressão de vigência: elas perguntam
-- `exists (select 1 from public.promotions ...)`, e esse select passa pela RLS de `promotions` do
-- papel corrente. Anon vê só faixa de promoção vigente; admin vê tudo. Uma definição de "é pública",
-- num lugar só — se a vigência mudar de regra, muda em uma policy e as três acompanham.
--
-- `has_role` direto, sem o `DO $$ IF EXISTS` da migration de cupons: aquele fallback existia porque
-- ela convergia um schema legado e podia rodar antes da função. Aqui a ordem das migrations garante
-- que `public.has_role` existe (criada na inicial), e o molde novo do repo — `order_emails` — já é
-- assim.
--
-- `(select public.has_role((select auth.uid()), 'admin'))` e não a chamada nua: dentro de uma policy,
-- uma função escrita direto é avaliada UMA VEZ POR LINHA. Envolvida em `(select …)` ela vira InitPlan
-- e roda uma vez por statement. É a recomendação de performance de RLS do próprio Supabase, e aqui ela
-- compõe: as policies das filhas fazem um `exists` sobre `promotions`, então a policy de `promotions`
-- é reavaliada a cada linha de faixa — sem o wrap, `has_role` seria chamada (faixas × promoções) vezes
-- no caminho do checkout. As policies antigas do repo usam a forma nua; não foram tocadas (fora de
-- escopo), mas as novas nascem certas.
--
-- O `exists` das filhas continua sendo subconsulta correlacionada de propósito. A alternativa —
-- um helper `security definer` "esta promoção é pública?" — passaria POR CIMA da RLS de `promotions` e
-- esconderia do ADMIN as faixas de promoção pausada, que é justamente o que ele precisa ver para
-- editá-la. O `exists` compõe com as duas policies (pública OR admin) e dá a resposta certa para cada
-- papel; o custo é sobre 3 faixas por promoção.
alter table public.promotions          enable row level security;
alter table public.promotion_tiers     enable row level security;
alter table public.promotion_categories enable row level security;

drop policy if exists "promotions_public_read"  on public.promotions;
drop policy if exists "promotions_admin_write"  on public.promotions;

create policy "promotions_public_read"
	on public.promotions
	for select
	using (
		active = true
		and (valid_from is null or valid_from <= now())
		and (valid_until is null or valid_until >= now())
	);

create policy "promotions_admin_write"
	on public.promotions
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));

drop policy if exists "promotion_tiers_public_read" on public.promotion_tiers;
drop policy if exists "promotion_tiers_admin_write" on public.promotion_tiers;

create policy "promotion_tiers_public_read"
	on public.promotion_tiers
	for select
	using (
		exists (select 1 from public.promotions p where p.id = promotion_id)
	);

create policy "promotion_tiers_admin_write"
	on public.promotion_tiers
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));

drop policy if exists "promotion_categories_public_read" on public.promotion_categories;
drop policy if exists "promotion_categories_admin_write" on public.promotion_categories;

-- A leitura pública desta tabela não é conveniência: a view `promotion_eligible_products` (T2) é
-- `security_invoker = true`, então ela lê `promotion_categories` com os direitos de quem chama. Sem
-- esta policy a view devolveria zero linhas para anon e a loja nunca acharia produto elegível.
create policy "promotion_categories_public_read"
	on public.promotion_categories
	for select
	using (
		exists (select 1 from public.promotions p where p.id = promotion_id)
	);

create policy "promotion_categories_admin_write"
	on public.promotion_categories
	for all
	to authenticated
	using ((select public.has_role((select auth.uid()), 'admin')))
	with check ((select public.has_role((select auth.uid()), 'admin')));

-- Os grants de tabela vêm do `alter default privileges` da `20260801130000_public_schema_grants.sql`,
-- que cobre toda tabela nova criada pelo `postgres` (quem roda as migrations). Explicitados aqui de
-- todo modo: uma tabela que ninguém pode ler é um bug caro de diagnosticar, e o RLS acima é o gate
-- de verdade.
grant select on public.promotions          to anon, authenticated, service_role;
grant select on public.promotion_tiers     to anon, authenticated, service_role;
grant select on public.promotion_categories to anon, authenticated, service_role;
grant insert, update, delete on public.promotions          to authenticated, service_role;
grant insert, update, delete on public.promotion_tiers     to authenticated, service_role;
grant insert, update, delete on public.promotion_categories to authenticated, service_role;
