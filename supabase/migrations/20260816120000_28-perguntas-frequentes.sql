-- =====================================================================
-- Feature 28 — Perguntas frequentes
-- FAQ-10, FAQ-12, FAQ-13, FAQ-29
-- =====================================================================
--
-- As perguntas frequentes JÁ EXISTEM no catálogo — 3.476 pares, em 687 dos 691 produtos (99,4%) —,
-- só que presas dentro de `products.description`, em HTML, sem campo e sem reuso. Trocar uma resposta
-- que vale para 443 produtos era editar 443 descrições à mão.
--
-- Esta migration cria as duas tabelas que tiram a pergunta de dentro do texto, e as duas views que
-- respondem "em quantos produtos esta pergunta está?" e "que perguntas fazem sentido nesta
-- categoria?".
--
-- Três decisões deste arquivo não são óbvias e estão escritas onde valem:
--   1. As duas FKs de `product_faqs` são DIFERENTES de propósito — `cascade` no produto, `restrict`
--      na entrada da biblioteca.
--   2. `product_faqs` é lido publicamente SEM CONDIÇÃO, e é isso que faz o vínculo órfão chegar ao
--      navegador com a entrada `null` (o comportamento que a feature 24 mediu).
--   3. `question_key` é escrita pela aplicação, e não é coluna gerada.

-- ---------------------------------------------------------------------
-- 1 · faqs — a biblioteca
-- ---------------------------------------------------------------------

create table if not exists public.faqs (
	id         uuid primary key default gen_random_uuid(),
	question   text not null,
	answer     text not null,
	-- A chave de deduplicação. Medido: as 3.476 perguntas do catálogo colapsam em **67** distintas,
	-- e duas delas só diferem pela codificação (`As joias s&atilde;o…` e `As joias são…`).
	--
	-- ⚠️ **Escrita pela APLICAÇÃO, sempre por `faqQuestionKey` (`@estrelinha/core/faq`).** Uma coluna
	-- gerada exigiria `unaccent` marcado como `immutable` e criaria uma SEGUNDA normalização — que
	-- divergiria da do painel e da do importador no primeiro ajuste. Aqui o banco guarda e garante a
	-- unicidade; quem decide o que é "a mesma pergunta" é o TypeScript, num lugar só.
	question_key text not null,
	-- Desativar é o caminho de remoção: tira a pergunta de TODAS as páginas de uma vez, e volta com
	-- um clique. Ver o `on delete restrict` abaixo.
	is_active  boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- Os limites têm par em TypeScript (`FAQ_QUESTION_MAX` / `FAQ_ANSWER_MAX`), e `faqSchema.test.ts`
	-- lê ESTE ARQUIVO DO DISCO e compara os números. Máximos medidos no catálogo: 94 e 370.
	constraint faqs_question_len check (char_length(btrim(question)) between 1 and 160),
	constraint faqs_answer_len   check (char_length(btrim(answer))   between 1 and 600)
);

create unique index if not exists faqs_question_key_uidx on public.faqs (question_key);

comment on table public.faqs is
	'A biblioteca de perguntas frequentes (feature 28). Uma entrada por pergunta, com a resposta padrão; a resposta específica de um produto vive em product_faqs.answer_override. Quem resolve as duas é resolveProductFaqs, em @estrelinha/core/faq.';

comment on column public.faqs.question_key is
	'Chave de deduplicação produzida por faqQuestionKey (@estrelinha/core/faq): entidades decodificadas, sem acento, minúsculas, espaço colapsado, pontuação final cortada. NÃO é coluna gerada de propósito — ver o comentário na migration.';

-- ---------------------------------------------------------------------
-- 2 · product_faqs — o vínculo, ordenado
-- ---------------------------------------------------------------------

create table if not exists public.product_faqs (
	-- Apagar o produto leva os vínculos dele: um vínculo sem produto não significa nada.
	product_id uuid not null references public.products(id) on delete cascade,
	-- ⚠️ **`restrict`, e não `cascade`.** Apagar uma entrada usada removeria a pergunta de até 453
	-- páginas de produto EM SILÊNCIO. O caminho reversível é `faqs.is_active = false`, que tira de
	-- todas de uma vez e volta com um clique. O painel lê a contagem antes e explica (`FAQ-15`); o
	-- banco é a segunda linha, para o caso de a escrita não vir da tela.
	faq_id     uuid not null references public.faqs(id) on delete restrict,
	position   integer not null default 0,
	-- `null` = usa a resposta da biblioteca. Mesmo molde de `engraving_max_chars`: ninguém compara a
	-- coluna crua, todo consumidor passa por `resolveProductFaqs`. Medido: 2.432 vínculos (70%) usam
	-- o padrão e 1.044 (30%) precisam de resposta própria — quase toda a segunda fatia é a pergunta
	-- "Quais materiais posso usar nessa joia?", que tem 98 respostas distintas no catálogo.
	answer_override text,
	created_at timestamptz not null default now(),
	primary key (product_id, faq_id),
	constraint product_faqs_override_len
		check (answer_override is null or char_length(btrim(answer_override)) between 1 and 600)
);

-- A PK já indexa `product_id` pelo prefixo. `faq_id` precisa do próprio: é por ele que as duas views
-- agregam e é ele que o `on delete restrict` consulta a cada tentativa de apagar uma entrada.
create index if not exists product_faqs_faq_id_idx on public.product_faqs (faq_id);

comment on table public.product_faqs is
	'Quais perguntas cada produto mostra, em que ordem, e com que resposta quando ela difere do padrão da biblioteca (feature 28).';

-- ---------------------------------------------------------------------
-- 3 · updated_at
-- ---------------------------------------------------------------------

drop trigger if exists set_faqs_updated_at on public.faqs;
create trigger set_faqs_updated_at
	before update on public.faqs
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4 · Views (FAQ-29)
-- ---------------------------------------------------------------------
--
-- `security_invoker = true` nas duas, no mesmo molde de `category_product_counts`: a view respeita a
-- RLS de quem consulta, em vez de emprestar o privilégio de quem a criou.
--
-- **View, e não coluna materializada em `faqs`.** Uma coluna `usage_count` seria um segundo dono do
-- mesmo número, e desatualizaria em toda escrita que não passasse pelo painel — a começar pelo
-- importador, que grava 3.476 vínculos de uma vez.

create or replace view public.faq_usage with (security_invoker = true) as
	select f.id as faq_id, count(pf.product_id)::int as products
	from public.faqs f
	left join public.product_faqs pf on pf.faq_id = f.id
	group by f.id;

comment on view public.faq_usage is
	'Em quantos produtos cada pergunta está. Três consumidores: a coluna "em N produtos" de /admin/perguntas, a recusa de apagar (FAQ-15) e o recuo global da sugestão (FAQ-32).';

-- A estatística que a sugestão por categoria consome.
--
-- `sample` é o número de produtos DAQUELA CATEGORIA que têm ao menos uma pergunta — o denominador da
-- proporção. Ele precisa ser o mesmo para todas as linhas da categoria, senão o ranking compararia
-- frações de bases diferentes.
create or replace view public.faq_category_usage with (security_invoker = true) as
	with sizes as (
		select pc.category_id, count(distinct pc.product_id)::int as sample
		from public.product_categories pc
		where exists (select 1 from public.product_faqs pf where pf.product_id = pc.product_id)
		group by pc.category_id
	)
	select
		pc.category_id,
		pf.faq_id,
		count(distinct pf.product_id)::int as uses,
		s.sample
	from public.product_categories pc
	join public.product_faqs pf on pf.product_id = pc.product_id
	join sizes s on s.category_id = pc.category_id
	group by pc.category_id, pf.faq_id, s.sample;

comment on view public.faq_category_usage is
	'Quantos produtos de cada categoria usam cada pergunta (uses), sobre quantos produtos daquela categoria têm alguma pergunta (sample). O ranking é uses/sample — PROPORÇÃO, nunca contagem bruta: medido no catálogo real, proporção acerta 84,0% no top-5 e contagem bruta 61,1%, porque a categoria guarda-chuva de 634 produtos domina a contagem.';

-- ---------------------------------------------------------------------
-- 5 · RLS (FAQ-13)
-- ---------------------------------------------------------------------
--
-- **Habilitar RLS aqui é obrigatório, e não zelo.** `20260801130000_public_schema_grants.sql` concede
-- `all on all tables` a `anon`/`authenticated` e repete o mesmo default privilege para toda tabela
-- nova — a postura padrão do Supabase, em que o gate é o RLS e não o `grant`. Tabela nova que
-- nascesse sem RLS estaria escancarada, com escrita anônima inclusive.
--
-- Sem RPC, de propósito, pelo mesmo argumento da feature 24: estas são tabelas de CONTEÚDO. O que
-- obrigou `set_material_status` a existir (`orders` não pode ter policy de UPDATE, senão expõe
-- `payment_status` e os valores — PAY-10) não se aplica aqui.

alter table public.faqs         enable row level security;
alter table public.product_faqs enable row level security;

-- A loja vê só a entrada ativa. É isto que faz "desativar" ser uma decisão de verdade e não um
-- `display: none`: a linha inativa nem sequer trafega para o navegador da cliente.
drop policy if exists "public read active faqs" on public.faqs;
create policy "public read active faqs" on public.faqs
	for select to public
	using (is_active = true);

-- ⚠️ **O vínculo é lido SEM CONDIÇÃO, e é deliberado.**
--
-- A alternativa óbvia seria condicionar à entrada ativa. Ela é pior por um motivo concreto: o vínculo
-- para uma entrada desativada não chegaria ao navegador, e o ramo "pular a vaga" de
-- `resolveProductFaqs` NUNCA rodaria em produção — o código existiria sem nada exercitá-lo. Com a
-- leitura aberta, o embed do PostgREST devolve `faq: null` com o `faq_id` intacto, que é exatamente o
-- que a feature 24 mediu com produto despublicado ("saiu do ar é resposta da RLS").
--
-- Não há vazamento: o conteúdo da pergunta e da resposta mora em `faqs`, que continua fechado. O que
-- fica legível é um uuid e uma posição.
drop policy if exists "public read product faqs" on public.product_faqs;
create policy "public read product faqs" on public.product_faqs
	for select to public
	using (true);

-- `to authenticated` + `has_role` no `using` **e** no `with check`.
--
-- Os dois lados testam coisas diferentes: o `using` decide quais linhas a pessoa ALCANÇA
-- (update/delete), o `with check` decide o que ela pode DEIXAR GRAVADO (insert/update). Só o `using`
-- deixaria um não-admin inserir livremente, porque `insert` não tem linha antiga para filtrar.
drop policy if exists "admin full faqs" on public.faqs;
create policy "admin full faqs" on public.faqs
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full product faqs" on public.product_faqs;
create policy "admin full product faqs" on public.product_faqs
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Nenhum `grant` a `anon` é emitido por esta migration, e nenhuma policy de escrita alcança `anon`:
-- as duas de escrita são `to authenticated`, e `anon` não é `authenticated`. `faqSchema.test.ts`
-- assere as duas coisas lendo este arquivo do disco.

-- ---------------------------------------------------------------------
-- 6 · O que o probe mediu (AD-012), em 2026-08-16
-- ---------------------------------------------------------------------
--
-- Contra o PostgREST local (`127.0.0.1:54341`), não por inspeção de tipo:
--
--   · admin insere com acento e lê de volta idêntico ..................... 201
--   · `question_key` duplicada ........................................... 23505
--   · pergunta com 161 caracteres ........................................ 23514
--   · anon lê entrada ATIVA e o vínculo com embed ........................ 200
--   · anon POST em `faqs` e em `product_faqs` ............................ 401
--   · admin apaga entrada EM USO ......................................... 23503 (o `restrict`)
--   · `faq_usage` e `faq_category_usage` devolvem linha .................. 200
--   · anon não vê entrada inativa; o vínculo vem com `faq: null` ......... confirmado
--
-- ⚠️ **`DELETE` e `PATCH` anônimos devolvem 204, e isso NÃO é falha de segurança.** Sem policy de
-- escrita para `anon`, o `using` casa **zero linhas** — e "zero linhas afetadas" é 204 no PostgREST,
-- não 401 (o 401 vem do `with check`, que só o `insert` exercita). Foi conferido que a linha
-- sobrevive com o conteúdo original depois das duas tentativas. Está escrito aqui porque o 204
-- parece alarmante numa auditoria futura e o "conserto" instintivo — abrir uma policy de `anon` para
-- forçar 401 — seria abrir escrita anônima de verdade.
